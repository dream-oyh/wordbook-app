-- 1. 创建词本表：记录各个单词本的信息
CREATE TABLE IF NOT EXISTS notebooks (                          -- 创建词本表
    id INTEGER PRIMARY KEY AUTOINCREMENT,        -- 词本ID，主键，自动递增
    name TEXT NOT NULL,                          -- 词本名称，不允许为空
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 创建时间，默认为当前时间戳
);

-- 2. 创建单词表：记录单词及其释义和笔记
CREATE TABLE IF NOT EXISTS words (                             -- 创建单词表
    id INTEGER PRIMARY KEY AUTOINCREMENT,        -- 单词ID，主键，自动递增
    word TEXT NOT NULL UNIQUE,                   -- 单词内容，不允许为空且必须唯一
    definition TEXT,                             -- 单词释义
    note TEXT                                    -- 单词笔记
);

-- 3. 创建单词条目表：记录某单词在具体某个词本中的添加记录（包括添加时间）
CREATE TABLE IF NOT EXISTS word_entries (                      -- 创建单词条目表
    id INTEGER PRIMARY KEY AUTOINCREMENT,        -- 条目ID，主键，自动递增
    word_id INTEGER NOT NULL,                    -- 关联的单词ID，不允许为空
    notebook_id INTEGER NOT NULL,                -- 关联的词本ID，不允许为空
    add_time DATETIME DEFAULT CURRENT_TIMESTAMP, -- 添加时间，默认为当前时间戳
    FOREIGN KEY(word_id) REFERENCES words(id),   -- 外键约束：关联words表的id字段
    FOREIGN KEY(notebook_id) REFERENCES notebooks(id) -- 外键约束：关联notebooks表的id字段
);

-- 为 words 表的 word 字段添加索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_word ON words(word);

-- 为 word_entries 表的 word_id 字段添加索引
CREATE INDEX IF NOT EXISTS idx_word_id ON word_entries(word_id);

-- 为 word_entries 表的 notebook_id 字段添加索引
CREATE INDEX IF NOT EXISTS idx_notebook_id ON word_entries(notebook_id);
