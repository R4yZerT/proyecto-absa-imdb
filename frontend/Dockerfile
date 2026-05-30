# =============================================================================
# frontend/Dockerfile — Imagen de producción (multi-stage: build + nginx)
# =============================================================================
# Uso:
#   docker build -f frontend/Dockerfile -t absa-frontend .
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Activar corepack para pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar archivos de dependencias
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copiar fuentes y compilar
COPY frontend/ ./
RUN pnpm build

# ---------------------------------------------------------------------------
# Stage 2: Serve (Nginx)
# ---------------------------------------------------------------------------
FROM nginx:alpine

# Configuración Nginx con proxy al backend
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Archivos estáticos compilados
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
