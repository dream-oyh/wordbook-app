from datetime import datetime
from typing import Optional

from db import (
    add_word_to_notebook,
    create_notebook,
    get_db_connection,
    get_notebook_words,
    init_db,
    search_words,
)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from search import search_word

app = FastAPI()

# 添加 CORS 中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 允许的前端源
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有 headers
)


# 初始化数据库
@app.on_event("startup")
async def startup_event():
    init_db()


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
@app.post("/api/notebooks", response_model=NotebookResponse)
def create_new_notebook(notebook: NotebookCreate):
    try:
        notebook_id = create_notebook(notebook.name)

        # 获取创建的笔记本信息
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notebooks WHERE id = ?", (notebook_id,))
        result = dict(cursor.fetchone())
        conn.close()

        return NotebookResponse(**result)
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
def add_word(notebook_id: int, word_data: WordCreate):
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
    conn.close()

    # 添加单词
    success = add_word_to_notebook(
        notebook_id, word_data.word, word_data.definition, word_data.note
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail={"code": "DATABASE_ERROR", "message": "添加单词失败"},
        )

    # 获取刚添加的单词信息
    words = get_notebook_words(notebook_id, limit=1)
    if not words:
        raise HTTPException(
            status_code=500,
            detail={"code": "DATABASE_ERROR", "message": "无法获取添加的单词信息"},
        )

    return {"success": True, "word": words[0]}


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
