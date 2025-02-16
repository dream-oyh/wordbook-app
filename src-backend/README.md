# 单词本后端 API 文档

## 数据库初始化

系统会自动在用户主目录下创建 `.wordbook` 文件夹和 `wordbook.db` 数据库文件。数据库包含以下表：

- notebooks: 词书表
- words: 单词表
- word_entries: 词书-单词关联表

## API 端点

### 词书操作

#### 1. 获取所有词书

- **路由**: `GET /api/notebooks`
- **响应**:
  ```json
  {
    "notebooks": [
      {
        "id": 1,
        "name": "词书1",
        "created_at": "2024-01-01 12:00:00"
      }
    ]
  }
  ```

#### 2. 创建词书

- **路由**: `POST /api/notebooks`
- **请求体**:
  ```json
  {
    "name": "新词书",
    "cover": "https://example.com/image.jpg"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "notebook": {
      "id": 1,
      "name": "新词书",
      "cover": "https://example.com/image.jpg"
    }
  }
  ```

#### 3. 重命名词书

- **路由**: `PUT /api/notebooks/{notebook_id}`
- **请求体**:
  ```json
  {
    "name": "新名称"
  }
  ```
- **响应**:
  ```json
  {
    "success": true
  }
  ```

#### 4. 删除词书

- **路由**: `DELETE /api/notebooks/{notebook_id}`
- **响应**:
  ```json
  {
    "success": true
  }
  ```

#### 5. 复制词书

- **路由**: `POST /api/notebooks/{notebook_id}/copy`
- **响应**:
  ```json
  {
    "success": true
  }
  ```

#### 6. 更新词书封面

- **路由**: `PUT /api/notebooks/{notebook_id}/cover`
- **请求体**:
  ```json
  {
    "cover": "https://example.com/new-image.jpg"
  }
  ```
- **响应**:
  ```json
  {
    "success": true
  }
  ```

#### 7. 导出词书

- **路由**: `GET /api/notebooks/{notebook_id}/export`
- **响应**: Excel 文件
- **错误响应**:
  ```json
  {
    "detail": {
      "code": "EMPTY_NOTEBOOK",
      "message": "词书中没有单词"
    }
  }
  ```
  或
  ```json
  {
    "detail": {
      "code": "EXPORT_ERROR",
      "message": "导出失败原因"
    }
  }
  ```

### 单词操作

#### 1. 获取词书中的所有单词

- **路由**: `GET /api/notebooks/{notebook_id}/words`
- **响应**:
  ```json
  {
    "words": [
      {
        "word": "hello",
        "definition": "你好",
        "note": "笔记",
        "add_time": "2024-01-01 12:00:00"
      }
    ]
  }
  ```

#### 2. 添加单词到词书

- **路由**: `POST /api/notebooks/{notebook_id}/words`
- **请求体**:
  ```json
  {
    "word": "hello",
    "definition": "你好",
    "note": "笔记"
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
      "code": "WORD_EXISTS",
      "message": "该单词已在词书中"
    }
  }
  ```

#### 3. 从词书中删除单词

- **路由**: `DELETE /api/notebooks/{notebook_id}/words/{word}`
- **响应**:
  ```json
  {
    "success": true
  }
  ```

#### 4. 移动单词到其他词书

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

#### 5. 复制单词到其他词书

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

### 翻译服务

#### 1. 获取单词翻译

- **路由**: `GET /api/translate`
- **参数**:
  - word: 要翻译的单词
  - platform: 翻译平台 (youdao/bing)
- **响应**:
  ```json
  {
    "translation": "翻译结果"
  }
  ```

### 文件上传

#### 1. 上传词书封面

- **路由**: `POST /api/upload/cover`
- **请求体**: multipart/form-data 格式
  - file: 图片文件
- **响应**:
  ```json
  {
    "success": true,
    "url": "/covers/20240315123456.jpg"
  }
  ```
- **错误响应**:
  ```json
  {
    "detail": {
      "code": "UPLOAD_ERROR",
      "message": "上传失败原因"
    }
  }
  ```

### 错误码

- `INVALID_PARAMS`: 缺少必要参数
- `WORD_EXISTS`: 单词已存在
- `WORD_NOT_FOUND`: 单词不存在
- `NOTEBOOK_NOT_FOUND`: 词书不存在
- `DATABASE_ERROR`: 数据库操作错误
