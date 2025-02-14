# 单词本应用开发文档

## 数据库设计

### 数据库位置

数据库文件存储在用户目录下的 `.wordbook/wordbook.db` 中。

### 表结构

#### 1. notebooks (词本表)

| 字段       | 类型     | 说明                   |
| ---------- | -------- | ---------------------- |
| id         | INTEGER  | 主键，自动递增         |
| name       | TEXT     | 词本名称，非空         |
| created_at | DATETIME | 创建时间，默认当前时间 |

#### 2. words (单词表)

| 字段       | 类型    | 说明                 |
| ---------- | ------- | -------------------- |
| id         | INTEGER | 主键，自动递增       |
| word       | TEXT    | 单词内容，非空，唯一 |
| definition | TEXT    | 单词释义             |
| note       | TEXT    | 单词笔记             |

#### 3. word_entries (单词条目表)

| 字段        | 类型     | 说明                   |
| ----------- | -------- | ---------------------- |
| id          | INTEGER  | 主键，自动递增         |
| word_id     | INTEGER  | 关联的单词 ID，外键    |
| notebook_id | INTEGER  | 关联的词本 ID，外键    |
| add_time    | DATETIME | 添加时间，默认当前时间 |

## API 设计

### 词本相关接口

#### 1. 创建词本

- **路由**: `POST /api/notebooks`
- **请求体**:
  ```json
  {
    "name": "词本名称"
  }
  ```
- **响应**:
  ```json
  {
    "id": 1,
    "name": "词本名称",
    "created_at": "2024-03-20T10:00:00Z"
  }
  ```

#### 2. 获取所有词本

- **路由**: `GET /api/notebooks`
- **响应**:
  ```json
  {
    "notebooks": [
      {
        "id": 1,
        "name": "词本1",
        "created_at": "2024-03-20T10:00:00Z"
      }
      // ...
    ]
  }
  ```

### 单词相关接口

#### 1. 添加单词到词本

- **路由**: `POST /api/notebooks/{notebook_id}/words`
- **请求体**:
  ```json
  {
    "word": "hello",
    "definition": "你好",
    "note": "常用问候语"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "word": {
      "word": "hello",
      "definition": "你好",
      "note": "常用问候语",
      "add_time": "2024-03-20T10:00:00Z"
    }
  }
  ```

#### 2. 获取词本中的单词

- **路由**: `GET /api/notebooks/{notebook_id}/words`
- **查询参数**:
  - `limit`: 每页数量（可选）
  - `offset`: 偏移量（可选）
- **响应**:
  ```json
  {
    "words": [
      {
        "word": "hello",
        "definition": "你好",
        "note": "常用问候语",
        "add_time": "2024-03-20T10:00:00Z"
      }
      // ...
    ],
    "total": 100
  }
  ```

#### 3. 搜索单词

- **路由**: `GET /api/words/search`
- **查询参数**:
  - `keyword`: 搜索关键词
- **响应**:
  ```json
  {
    "words": [
      {
        "word": "hello",
        "definition": "你好",
        "note": "常用问候语"
      }
      // ...
    ]
  }
  ```

### 翻译接口

#### 1. 获取单词翻译

- **路由**: `GET /api/translate`
- **查询参数**:
  - `word`: 要翻译的单词（必需）
  - `platform`: 翻译平台（可选，默认为 "youdao"）
    - 可选值: "youdao"（有道翻译）, "bing"（必应词典）
- **响应**:
  ```json
  {
    "word": "hello",
    "translation": "int. 喂；哈罗\nn. 表示问候， 惊奇或唤起注意时的用语",
    "uk_pronoun": "həˈləʊ",
    "us_pronoun": "həˈloʊ"
  }
  ```
- **错误响应**:

  ```json
  {
    "detail": {
      "code": "ERROR_CODE",
      "message": "错误描述"
    }
  }
  ```

  常见错误码：

  - `INVALID_PARAMS`: 单词参数为空
  - `SEARCH_ERROR`: 搜索过程发生错误

### 单词操作接口

#### 1. 移动单词到其他词书

- **路由**: `POST /api/notebooks/{target_notebook_id}/words/move`
- **请求体**:
  ```json
  {
    "sourceNotebookId": 1,
    "word": "hello"
  }
  ```
- **响应**:
  ```json
  {
    "success": true
  }
  ```
- **错误响应**:
  ```json
  {
    "detail": {
      "code": "WORD_NOT_FOUND",
      "message": "单词不存在"
    }
  }
  ```

#### 2. 复制单词到其他词书

- **路由**: `POST /api/notebooks/{target_notebook_id}/words/copy`
- **请求体**:
  ```json
  {
    "word": "hello"
  }
  ```
- **响应**:
  ```json
  {
    "success": true
  }
  ```
- **错误响应**:
  ```json
  {
    "detail": {
      "code": "WORD_NOT_FOUND",
      "message": "单词不存在"
    }
  }
  ```

常见错误码：

- `INVALID_PARAMS`: 缺少必要参数
- `WORD_NOT_FOUND`: 单词不存在
- `DATABASE_ERROR`: 数据库操作错误

### 错误处理

所有 API 在发生错误时将返回统一格式的错误响应：

```json
{
  "detail": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

常见错误码：

- `NOTEBOOK_NOT_FOUND`: 词本不存在
- `INVALID_PARAMS`: 参数无效
- `DATABASE_ERROR`: 数据库操作错误
- `SEARCH_ERROR`: 搜索/翻译过程发生错误
