#!/usr/bin/env bash
# =============================================================================
# start.sh — Script unificado para levantar backend y frontend en paralelo.
# =============================================================================
# Uso:
#   ./start.sh              → Modo desarrollo (con hot-reload)
#   ./start.sh --prod       → Modo producción local (build + serve)
# =============================================================================

set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""
SERVER_PID=""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log_info() { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
log_ok()   { echo -e "\033[1;32m[OK]\033[0m    $*"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m  $*"; }

cleanup() {
    log_warn "Recibida señal de interrupción. Deteniendo servicios..."
    if [[ -n "$FRONTEND_PID" ]]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
    if [[ -n "$BACKEND_PID" ]]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
    if [[ -n "$SERVER_PID" ]]; then kill "$SERVER_PID" 2>/dev/null || true; fi
    wait 2>/dev/null || true
    log_ok "Servicios detenidos."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ---------------------------------------------------------------------------
# Modo producción local
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--prod" ]]; then
    log_info "Modo PRODUCCIÓN local seleccionado."

    # 1. Build del frontend
    log_info "Compilando frontend..."
    cd "$BASE_DIR/frontend"
    pnpm install --frozen-lockfile
    pnpm build
    log_ok "Frontend compilado en frontend/dist/"

    # 2. Servir frontend estático (y proxy /api al backend)
    log_info "Sirviendo frontend estático en http://localhost:5173"
    cd "$BASE_DIR"
    python3 -m http.server 5173 --directory frontend/dist &
    SERVER_PID=$!

    # 3. Backend
    log_info "Iniciando Backend (FastAPI) en http://localhost:8000"
    cd "$BASE_DIR"
    PYTHONPATH="$BASE_DIR" uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 1 &
    BACKEND_PID=$!

    log_ok "Servicios activos:"
    log_ok "  Frontend: http://localhost:5173"
    log_ok "  Backend:  http://localhost:8000"
    wait

# ---------------------------------------------------------------------------
# Modo desarrollo (por defecto)
# ---------------------------------------------------------------------------
else
    log_info "Modo DESARROLLO seleccionado (hot-reload activo)."

    # Verificar dependencias
    if ! command -v pnpm &>/dev/null; then
        log_warn "pnpm no está instalado. Instálalo: npm install -g pnpm"
        exit 1
    fi

    if ! command -v uvicorn &>/dev/null; then
        log_warn "uvicorn no está instalado. Activa el entorno virtual e instala dependencias."
        exit 1
    fi

    # 1. Backend
    log_info "Iniciando Backend (FastAPI) en http://localhost:8000"
    cd "$BASE_DIR"
    PYTHONPATH="$BASE_DIR" uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!

    # 2. Frontend
    log_info "Iniciando Frontend (Vite) en http://localhost:5173"
    cd "$BASE_DIR/frontend"
    pnpm dev &
    FRONTEND_PID=$!

    log_ok "Servicios activos:"
    log_ok "  Frontend: http://localhost:5173"
    log_ok "  Backend:  http://localhost:8000"
    log_info "Presiona Ctrl+C para detener ambos servicios."
    wait
fi
