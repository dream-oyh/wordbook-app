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

## 部署

可以使用 docker 进行项目本地部署。

```sh
mkdir ~/.wordbook    # 确保配置文件夹的映射存在
docker run -d \
  --name wordbook \
  -p 80:80 \
  -v ~/.wordbook:/root/.wordbook \
  ghcr.io/dream-oyh/wordbook-app:latest
```

## 开发环境配置

### 要求

- Node.js >= 18
- Python >= 3.11
- pnpm >= 8.0
- poetry >= 1.7

```bash
# 1. 克隆项目
git clone https://github.com/your-username/wordbook.git
cd wordbook
# 2. 安装前端依赖
pnpm install
# 3. 安装后端依赖
cd src-backend
pip install poetry
poetry config virtualenvs.in-project true
poetry config virtualenvs.create true
poetry install
cd ..
# 4. 运行项目
bash startup.sh
```

## 项目结构

```
wordbook/
├── src/                  # 前端源码
│   ├── api/              # API 请求
│   ├── components/       # 组件
│   └── main.tsx          # 主入口
├── src-backend/          # 后端源码
│   ├── main.py           # 后端主程序
│   ├── README.md         # 接口文档
│   └── schema.sql        # 数据库结构
└── public/               # 静态资源
```

## 数据存储

项目使用 SQLite 数据库，数据文件存储在用户目录下的 `~/.wordbook/wordbook.db`。
