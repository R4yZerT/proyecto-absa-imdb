# =============================================================================
# backend/Dockerfile — Optimizado para aarch64 con límite de memoria
# =============================================================================
# Estrategia:
#   1. Capas separadas por grupo de dependencias (reduce pico de RAM)
#   2. torch CPU-only primero (evita CUDA ~2GB)
#   3. --only-binary evita compilación Cython en ARM64
#   4. Código al final (cache-friendly)
# =============================================================================

FROM python:3.11-slim

WORKDIR /app

# ---------------------------------------------------------------------------
# Sistema: solo lo estrictamente necesario
# ---------------------------------------------------------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Python deps — Capa 1: torch CPU-only
# Separado del resto para no acumular torch + spacy + transformers en RAM
# ---------------------------------------------------------------------------
COPY requirements.txt ./requirements.txt

RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu

# ---------------------------------------------------------------------------
# Python deps — Capa 2: backend liviano (FastAPI, uvicorn, sqlalchemy)
# ---------------------------------------------------------------------------
COPY backend/requirements.txt ./backend/requirements.txt

RUN pip install --no-cache-dir --only-binary :all: -r backend/requirements.txt

# ---------------------------------------------------------------------------
# Python deps — Capa 3: pipeline pesado (spacy, transformers, pandas, etc.)
# --only-binary evita compilar extensiones Cython (preshed, cymem) en ARM64
# ---------------------------------------------------------------------------
RUN pip install --no-cache-dir --only-binary :all: -r requirements.txt

# ---------------------------------------------------------------------------
# Modelos SpaCy (bajan ~50MB; capa cacheable si no cambia spacy)
# ---------------------------------------------------------------------------
RUN python -m spacy download es_core_news_md

# ---------------------------------------------------------------------------
# Código fuente (se copia AL FINAL: cualquier cambio aquí no invalida caché de deps)
# ---------------------------------------------------------------------------
# Copiar __init__.py del paquete backend para evitar problemas con namespace packages
COPY backend/__init__.py ./backend/__init__.py
COPY backend/app ./backend/app
COPY pipeline ./pipeline

# Model configs (pesos grandes excluidos por .dockerignore)
COPY data/output data/output

# Entrypoint para copiar BD montada a ruta local (evita file-lock issues en macOS)
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
# Asegurar que /app esté en PYTHONPATH para que los imports absolutos tipo
# 'backend.app.main' funcionen sin depender del directorio de ejecución.
ENV PYTHONPATH=/app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/summary || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
