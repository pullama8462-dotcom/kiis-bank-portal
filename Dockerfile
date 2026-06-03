# Production image: Vite frontend + FastAPI (used by Render / any container host)
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY --from=frontend-builder /build/frontend/dist /app/frontend/dist
COPY index.html dashboard.html app.js styles.css /app/

ENV PYTHONUNBUFFERED=1
WORKDIR /app/backend

EXPOSE 8000

CMD ["sh", "-c", "python seed.py && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
