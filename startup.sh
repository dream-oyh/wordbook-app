#/usr/bin/env bash
pnpm build
cd src-backend
poetry run fastapi dev main.py