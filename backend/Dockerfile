# =============================================================================
# backend/Dockerfile — Optimizado para builds rápidas
# =============================================================================
# Estrategia:
#   1. Instalar torch CPU-only primero (evita CUDA ~2GB)
#   2. Combinar pip installs en menos capas
#   3. Copiar código al final (cache-friendly)
# =============================================================================

FROM python:3.11-slim

WORKDIR /app

# ---------------------------------------------------------------------------
# Sistema: solo lo estrictamente necesario (curl para healthcheck)
# ---------------------------------------------------------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Python deps: orden optimizado para caché
#   Paso 1: torch CPU-only (instalar primero evita que transformers traiga CUDA)
#   Paso 2: requirements del backend (fastapi, uvicorn, sqlalchemy, etc.)
#   Paso 3: requirements del pipeline (spacy, transformers, pandas, etc.)
# ---------------------------------------------------------------------------
COPY backend/requirements.txt ./backend/requirements.txt
COPY requirements.txt ./requirements.txt

RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r backend/requirements.txt \
    && pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# Modelos SpaCy (bajan ~50MB; capa cacheable si no cambia spacy)
# ---------------------------------------------------------------------------
RUN python -m spacy download es_core_news_md

# ---------------------------------------------------------------------------
# Código fuente (se copia AL FINAL: cualquier cambio aquí no invalida caché de deps)
# ---------------------------------------------------------------------------
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
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/summary || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
