import sqlite3
from pathlib import Path


def get_db_path() -> Path:
    """获取数据库文件路径"""
    db_dir = Path.home() / ".wordbook"
    db_dir.mkdir(exist_ok=True)
    return db_dir / "wordbook.db"


def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """初始化数据库"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 创建词本表
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS notebooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """
    )

    # 创建单词表
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL UNIQUE,
        definition TEXT,
        note TEXT
    )
    """
    )

    # 创建单词条目表（关联表）
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS word_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word_id INTEGER,
        notebook_id INTEGER,
        add_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (word_id) REFERENCES words (id),
        FOREIGN KEY (notebook_id) REFERENCES notebooks (id)
    )
    """
    )

    conn.commit()
    conn.close()


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

        # 1. 检查单词是否已存在于 words 表
        cursor.execute(
            """
            SELECT w.id, w.definition, w.note, we.id as entry_id 
            FROM words w 
            LEFT JOIN word_entries we ON w.id = we.word_id AND we.notebook_id = ?
            WHERE w.word = ?
            """,
            (notebook_id, word),
        )
        result = cursor.fetchone()

        if result:
            # 单词已存在，更新 words 表
            word_id = result["id"]
            cursor.execute(
                "UPDATE words SET definition = ?, note = ? WHERE id = ?",
                (definition, note, word_id),
            )
            print(f"更新单词: {word}, 新定义: {definition}, 新笔记: {note}")

            # 如果还没有添加到当前词本，则添加关联
            if not result["entry_id"]:
                cursor.execute(
                    "INSERT INTO word_entries (word_id, notebook_id) VALUES (?, ?)",
                    (word_id, notebook_id),
                )
                print(f"添加词本关联: word_id={word_id}, notebook_id={notebook_id}")
        else:
            # 单词不存在，插入新记录
            cursor.execute(
                "INSERT INTO words (word, definition, note) VALUES (?, ?, ?)",
                (word, definition, note),
            )
            word_id = cursor.lastrowid
            print(f"插入新单词: {word}")

            # 添加词本关联
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


def create_notebook(name: str) -> int:
    """创建新词本"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO notebooks (name) VALUES (?)",
        (name,),
    )
    notebook_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return notebook_id


def get_notebook_words(notebook_id: int, limit: int = None, offset: int = None):
    """获取词本中的单词"""
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


def search_words(keyword: str):
    """搜索单词"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT word, definition, note FROM words WHERE word LIKE ?",
        (f"%{keyword}%",),
    )
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results
