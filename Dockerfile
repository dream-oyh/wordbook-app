# 前端构建阶段
FROM node:20-slim AS frontend-builder
WORKDIR /app
ENV COREPACK_INTEGRITY_KEYS=0
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# 后端构建阶段
FROM python:3.13-slim AS backend

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY src-backend/pyproject.toml src-backend/poetry.lock ./
ENV PIP_ROOT_USER_ACTION=ignore
RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-root --no-interaction --no-ansi --no-cache

# 复制后端代码
COPY src-backend/ ./
# 复制前端构建文件
COPY --from=frontend-builder /app/dist ./dist

# 创建数据库目录
RUN mkdir -p /root/.wordbook

# 暴露端口
EXPOSE 80

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"] 