# WORDBOOK

本项目是为了在平常学习英语单词的过程中，帮助单词的记录与积累，并添加笔记进行复习。项目支持多词书，按照词书分类管理单词。

## 功能特点

- 📚 支持创建多个词书，灵活管理不同类别的单词
- 🔍 集成有道翻译和必应词典，快速查询单词释义
- 📝 支持为每个单词添加个人笔记
- 🔄 自动记录单词添加时间和所属词书
- ⚡ 批量操作功能：删除、移动、复制单词

## 技术栈

### 前端

- SolidJS - 响应式 UI 框架
- TailwindCSS - 样式框架
- TypeScript - 类型安全的 JavaScript
- Vite - 构建工具

### 后端

- FastAPI - Python Web 框架
- SQLite - 轻量级数据库
- Poetry - Python 依赖管理

## 环境要求

- Node.js >= 18
- Python >= 3.11
- pnpm >= 8.0
- poetry >= 1.7

## 环境配置

1. 克隆项目：

```bash
git clone https://github.com/your-username/wordbook.git
cd wordbook
```

2. 安装前端依赖：

```bash
pnpm install
```

3. 安装后端依赖：

```bash
cd src-backend
pip install poetry
poetry config virtualenvs.in-project true
poetry config virtualenvs.create true
poetry install
```

## 运行项目

1. 启动后端服务：

```bash
cd src-backend
poetry run uvicorn main:app --reload
```

2. 在另一个终端中启动前端服务：

```bash
pnpm dev
```

3. 在浏览器中访问：`http://localhost:5173`

## 项目结构

```
wordbook/
├── src/                    # 前端源码
│   ├── api/               # API 请求
│   ├── components/        # 组件
│   └── main.tsx          # 主入口
├── src-backend/           # 后端源码
│   ├── main.py           # 后端主程序
│   └── schema.sql        # 数据库模式
└── public/               # 静态资源
```

## 数据存储

项目使用 SQLite 数据库，数据文件存储在用户目录下的 `~/.wordbook/wordbook.db`。包含以下表：

- notebooks: 词书信息
- words: 单词信息
- word_entries: 词书-单词关联

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 开源协议

本项目采用 MIT 协议 - 详见 [LICENSE](LICENSE) 文件