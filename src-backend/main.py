import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from db import (
    add_word_to_notebook,
    create_notebook,
    get_db_connection,
    get_notebook_words,
    search_words,
)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from search import search_word

app = FastAPI()
dist = Path("dist")
if not dist.exists():
    dist = Path(__file__).parent.parent / "dist"

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
app.mount(
    "/assets",
    StaticFiles(directory=dist / "assets"),
    name="assets",
)


@app.get("/")
async def read_root():
    return FileResponse(dist / "index.html")


@app.get("/{xxx}")
async def read_static(xxx: str):
    return FileResponse(dist / xxx)


def init_database():
    """初始化数据库和表"""
    # 确保 .wordbook 目录存在
    db_dir = Path.home() / ".wordbook"
    db_dir.mkdir(exist_ok=True)

    db_path = db_dir / "wordbook.db"

    # 如果数据库文件不存在，创建数据库和表
    if not db_path.exists():
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # 创建表
        cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS notebooks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL UNIQUE,
                definition TEXT,
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS word_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word_id INTEGER,
                notebook_id INTEGER,
                add_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (word_id) REFERENCES words(id),
                FOREIGN KEY (notebook_id) REFERENCES notebooks(id),
                UNIQUE(word_id, notebook_id)
            );
        """
        )

        conn.commit()
        conn.close()


def get_db_connection():
    """获取数据库连接"""
    db_path = Path.home() / ".wordbook" / "wordbook.db"
    # 确保数据库和表已初始化
    init_database()

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


# 在应用启动时初始化数据库
@app.on_event("startup")
async def startup_event():
    init_database()


# 定义请求和响应模型
class NotebookCreate(BaseModel):
    name: str


class WordCreate(BaseModel):
    word: str
    definition: Optional[str] = None
    note: Optional[str] = None


class NotebookResponse(BaseModel):
    id: int
    name: str
    created_at: datetime


class WordResponse(BaseModel):
    word: str
    definition: Optional[str]
    note: Optional[str]
    add_time: datetime


# API 路由实现
@app.post("/api/notebooks")
def create_notebook(notebook: NotebookCreate):
    """创建词书"""
    print(f"Received request data: {notebook}")  # 添加调试日志
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("INSERT INTO notebooks (name) VALUES (?)", (notebook.name,))

        notebook_id = cursor.lastrowid

        conn.commit()
        conn.close()

        return {"success": True, "notebook": {"id": notebook_id, "name": notebook.name}}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail={"code": "DATABASE_ERROR", "message": str(e)}
        )


@app.get("/api/notebooks")
def get_notebooks():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notebooks ORDER BY created_at DESC")
        notebooks = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {"notebooks": notebooks}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail={"code": "DATABASE_ERROR", "message": str(e)}
        )


@app.post("/api/notebooks/{notebook_id}/words")
def add_word_to_notebook(notebook_id: int, word_data: dict):
    """添加单词到词书"""
    try:
        word = word_data.get("word")
        definition = word_data.get("definition", "")
        note = word_data.get("note", "")

        if not word:
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_PARAMS", "message": "缺少必要参数"},
            )

        conn = get_db_connection()
        cursor = conn.cursor()

        # 获取词书名称
        cursor.execute("SELECT name FROM notebooks WHERE id = ?", (notebook_id,))
        notebook = cursor.fetchone()
        if not notebook:
            raise HTTPException(
                status_code=404,
                detail={"code": "NOTEBOOK_NOT_FOUND", "message": "词书不存在"},
            )

        notebook_name = notebook["name"]
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 添加时间戳到笔记
        note_with_timestamp = note.strip()
        if note_with_timestamp:
            note_with_timestamp += "\n"  # 只有在笔记不为空时才添加换行
        note_with_timestamp += f"Added in {notebook_name} at {current_time}\n"

        # 检查单词是否已存在于 words 表
        cursor.execute("SELECT id FROM words WHERE word = ?", (word,))
        result = cursor.fetchone()

        if result:
            word_id = result["id"]
            # 更新已存在的单词定义和笔记
            cursor.execute(
                "UPDATE words SET definition = ?, note = ? WHERE id = ?",
                (definition, note_with_timestamp, word_id),
            )

            # 检查并添加词书关联（如果不存在）
            cursor.execute(
                "INSERT OR IGNORE INTO word_entries (word_id, notebook_id) VALUES (?, ?)",
                (word_id, notebook_id),
            )
        else:
            # 插入新单词
            cursor.execute(
                "INSERT INTO words (word, definition, note) VALUES (?, ?, ?)",
                (word, definition, note_with_timestamp),
            )
            word_id = cursor.lastrowid

            # 添加词书关联
            cursor.execute(
                "INSERT INTO word_entries (word_id, notebook_id) VALUES (?, ?)",
                (word_id, notebook_id),
            )

        conn.commit()
        conn.close()

        return {"success": True}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500, detail={"code": "DATABASE_ERROR", "message": str(e)}
        )


@app.get("/api/notebooks/{notebook_id}/words")
def get_words(
    notebook_id: int, limit: Optional[int] = None, offset: Optional[int] = None
):
    # 检查笔记本是否存在
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM notebooks WHERE id = ?", (notebook_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=404,
            detail={"code": "NOTEBOOK_NOT_FOUND", "message": "笔记本不存在"},
        )

    # 获取总数
    cursor.execute(
        """
        SELECT COUNT(*) as total
        FROM word_entries
        WHERE notebook_id = ?
    """,
        (notebook_id,),
    )
    total = cursor.fetchone()["total"]
    conn.close()

    # 获取单词列表
    words = get_notebook_words(notebook_id, limit, offset)

    return {"words": words, "total": total}


@app.get("/api/words/search")
def search(keyword: str):
    if not keyword:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_PARAMS", "message": "搜索关键词不能为空"},
        )

    results = search_words(keyword)
    return {"words": results}


@app.get("/api/translate")
def translate(word: str, platform: str = "youdao"):
    """翻译接口

    Args:
        word: 要翻译的单词
        platform: 翻译平台 (youdao 或 bing)
    """
    try:
        if not word:
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_PARAMS", "message": "单词不能为空"},
            )

        if platform not in ["youdao", "bing"]:
            platform = "youdao"

        result = search_word(word, platform)
        return {
            "word": result["word"],
            "translation": result["mean_zh"],
            "uk_pronoun": result["uk_pronoun"],
            "us_pronoun": result["us_pronoun"],
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail={"code": "SEARCH_ERROR", "message": str(e)}
        )


@app.get("/api/words/{word}")
def get_word(word: str):
    """获取单词信息

    如果单词存在于数据库中，返回其定义和笔记
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT definition, note FROM words WHERE word = ?", (word,))
        result = cursor.fetchone()
        conn.close()

        if result:
            return {
                "exists": True,
                "definition": result["definition"],
                "note": result["note"],
            }
        return {"exists": False}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail={"code": "DATABASE_ERROR", "message": str(e)}
        )


@app.delete("/api/notebooks/{notebook_id}/words/{word}")
def delete_word_from_notebook(notebook_id: int, word: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 获取单词ID
        cursor.execute("SELECT id FROM words WHERE word = ?", (word,))
        word_result = cursor.fetchone()

        if not word_result:
            raise HTTPException(
                status_code=404,
                detail={"code": "WORD_NOT_FOUND", "message": "单词不存在"},
            )

        word_id = word_result["id"]

        # 从词书中删除单词
        cursor.execute(
            "DELETE FROM word_entries WHERE word_id = ? AND notebook_id = ?",
            (word_id, notebook_id),
        )

        conn.commit()
        conn.close()

        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail={"code": "DATABASE_ERROR", "message": str(e)}
        )


@app.post("/api/notebooks/{target_notebook_id}/words/move")
def move_word(target_notebook_id: int, move_data: dict):
    """将单词从一个词书移动到另一个词书"""
    try:
        source_notebook_id = move_data.get("sourceNotebookId")
        word = move_data.get("word")

        if not all([source_notebook_id, word]):
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_PARAMS", "message": "缺少必要参数"},
            )

        conn = get_db_connection()
        cursor = conn.cursor()

        # 获取单词ID
        cursor.execute("SELECT id FROM words WHERE word = ?", (word,))
        word_result = cursor.fetchone()

        if not word_result:
            raise HTTPException(
                status_code=404,
                detail={"code": "WORD_NOT_FOUND", "message": "单词不存在"},
            )

        word_id = word_result["id"]

        # 更新词书关联
        cursor.execute(
            """
            UPDATE word_entries 
            SET notebook_id = ? 
            WHERE word_id = ? AND notebook_id = ?
            """,
            (target_notebook_id, word_id, source_notebook_id),
        )

        conn.commit()
        conn.close()

        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail={"code": "DATABASE_ERROR", "message": str(e)}
        )


@app.post("/api/notebooks/{target_notebook_id}/words/copy")
def copy_word(target_notebook_id: int, copy_data: dict):
    """将单词从一个词书复制到另一个词书"""
    try:
        word = copy_data.get("word")

        if not word:
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_PARAMS", "message": "缺少必要参数"},
            )

        conn = get_db_connection()
        cursor = conn.cursor()

        # 获取单词ID
        cursor.execute("SELECT id FROM words WHERE word = ?", (word,))
        word_result = cursor.fetchone()

        if not word_result:
            raise HTTPException(
                status_code=404,
                detail={"code": "WORD_NOT_FOUND", "message": "单词不存在"},
            )

        word_id = word_result["id"]

        # 检查是否已存在于目标词书
        cursor.execute(
            "SELECT id FROM word_entries WHERE word_id = ? AND notebook_id = ?",
            (word_id, target_notebook_id),
        )
        if not cursor.fetchone():
            # 添加新的词书关联
            cursor.execute(
                "INSERT INTO word_entries (word_id, notebook_id) VALUES (?, ?)",
                (word_id, target_notebook_id),
            )

        conn.commit()
        conn.close()

        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail={"code": "DATABASE_ERROR", "message": str(e)}
        )


@app.delete("/api/notebooks/{notebook_id}")
def delete_notebook(notebook_id: int):
    """删除词书"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 先删除词书中的单词关联
        cursor.execute("DELETE FROM word_entries WHERE notebook_id = ?", (notebook_id,))

        # 再删除词书
        cursor.execute("DELETE FROM notebooks WHERE id = ?", (notebook_id,))

        conn.commit()
        conn.close()

        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail={"code": "DATABASE_ERROR", "message": str(e)}
        )


@app.post("/api/notebooks/{notebook_id}/copy")
def copy_notebook(notebook_id: int):
    """创建词书副本"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 获取原词书信息
        cursor.execute("SELECT name FROM notebooks WHERE id = ?", (notebook_id,))
        notebook = cursor.fetchone()
        if not notebook:
            raise HTTPException(
                status_code=404,
                detail={"code": "NOTEBOOK_NOT_FOUND", "message": "词书不存在"},
            )

        # 创建新词书
        new_name = f"{notebook['name']} (副本)"
        cursor.execute("INSERT INTO notebooks (name) VALUES (?)", (new_name,))
        new_notebook_id = cursor.lastrowid

        # 复制单词关联
        cursor.execute(
            """
            INSERT INTO word_entries (word_id, notebook_id)
            SELECT word_id, ? FROM word_entries WHERE notebook_id = ?
        """,
            (new_notebook_id, notebook_id),
        )

        conn.commit()
        conn.close()

        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail={"code": "DATABASE_ERROR", "message": str(e)}
        )


@app.put("/api/notebooks/{notebook_id}")
def rename_notebook(notebook_id: int, notebook_data: dict):
    """重命名词书"""
    try:
        new_name = notebook_data.get("name")
        if not new_name:
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_PARAMS", "message": "缺少必要参数"},
            )

        conn = get_db_connection()
        cursor = conn.cursor()

        # 检查词书是否存在
        cursor.execute("SELECT id FROM notebooks WHERE id = ?", (notebook_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail={"code": "NOTEBOOK_NOT_FOUND", "message": "词书不存在"},
            )

        # 更新词书名称
        cursor.execute(
            "UPDATE notebooks SET name = ? WHERE id = ?",
            (new_name, notebook_id),
        )

        conn.commit()
        conn.close()

        return {"success": True}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"code": "DATABASE_ERROR", "message": str(e)},
        )
