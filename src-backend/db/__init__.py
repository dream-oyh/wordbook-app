import os
import sqlite3
from pathlib import Path
from typing import Dict, List, Optional

# 在用户目录下创建应用数据文件夹
APP_DATA_DIR = os.path.join(Path.home(), ".wordbook")
DB_PATH = os.path.join(APP_DATA_DIR, "wordbook.db")


def init_db():
    """初始化数据库"""
    # 确保应用数据目录存在
    if not os.path.exists(APP_DATA_DIR):
        os.makedirs(APP_DATA_DIR)

    # 连接数据库并创建表
    conn = get_db_connection()
    with open(Path(__file__).parent.parent / "schema.sql", encoding="utf-8") as f:
        s = f.read()
        conn.executescript(s)
    conn.close()


def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def create_notebook(name: str) -> int:
    """创建新的单词本

    Args:
        name: 单词本名称

    Returns:
        新创建的单词本ID
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO notebooks (name) VALUES (?)", (name,))
    notebook_id = cursor.lastrowid
    assert notebook_id is not None
    conn.commit()
    conn.close()
    return notebook_id


def add_word_to_notebook(
    notebook_id: int, word: str, definition: str = None, note: str = None
) -> bool:
    """添加或更新单词到词本

    Args:
        notebook_id: 词本ID
        word: 单词
        definition: 翻译内容
        note: 笔记内容

    Returns:
        bool: 是否成功
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 使用 INSERT OR REPLACE 来插入或更新单词
        cursor.execute(
            """
            INSERT OR REPLACE INTO words (word, definition, note)
            VALUES (?, ?, ?)
            """,
            (word, definition, note),
        )
        word_id = (
            cursor.lastrowid
            or cursor.execute(
                "SELECT id FROM words WHERE word = ?", (word,)
            ).fetchone()["id"]
        )

        # 检查是否已经在词本中
        cursor.execute(
            "SELECT id FROM word_entries WHERE word_id = ? AND notebook_id = ?",
            (word_id, notebook_id),
        )
        if not cursor.fetchone():
            # 如果不在词本中，添加关联
            cursor.execute(
                "INSERT INTO word_entries (word_id, notebook_id) VALUES (?, ?)",
                (word_id, notebook_id),
            )
            print(f"添加词本关联: word_id={word_id}, notebook_id={notebook_id}")

        conn.commit()
        conn.close()
        return True

    except Exception as e:
        print(f"添加单词失败：{e}")
        return False


def get_notebook_words(
    notebook_id: int, limit: Optional[int] = None, offset: Optional[int] = None
) -> List[Dict]:
    """获取指定单词本中的单词

    Args:
        notebook_id: 单词本ID
        limit: 限制返回数量
        offset: 偏移量（用于分页）

    Returns:
        单词列表，每个单词包含其释义和笔记
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT w.word, w.definition, w.note, we.add_time
        FROM words w
        JOIN word_entries we ON w.id = we.word_id
        WHERE we.notebook_id = ?
        ORDER BY we.add_time DESC
    """

    if limit is not None:
        query += f" LIMIT {limit}"
        if offset is not None:
            query += f" OFFSET {offset}"

    cursor.execute(query, (notebook_id,))
    words = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return words


def search_words(keyword: str) -> List[Dict]:
    """搜索单词（不限词本）

    Args:
        keyword: 搜索关键词

    Returns:
        匹配的单词列表
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT word, definition, note
        FROM words
        WHERE word LIKE ?
        ORDER BY word
    """,
        (f"%{keyword}%",),
    )

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results
