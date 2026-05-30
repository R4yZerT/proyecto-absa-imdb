#!/bin/sh
# =============================================================================
# entrypoint.sh — Copia la BD montada a una ruta local antes de iniciar
# =============================================================================
# Docker Desktop en macOS tiene problemas con SQLite file locks en mounts.
# Copiamos la BD a una ruta local del contenedor para evitarlo.
# =============================================================================

set -e

# Ruta fuente (puede ser un mount o ya existir en la imagen)
DB_SOURCE="${DB_SOURCE:-/app/backend/absa_movies.db}"
DB_DEST="${DB_DEST:-/app/backend/absa_movies.db}"

# Si existe un archivo montado, copiarlo a una ruta local
if [ -f "$DB_SOURCE" ]; then
    echo "[entrypoint] Copiando base de datos a ruta local..."
    cp "$DB_SOURCE" /tmp/absa_movies.db
    DB_DEST=/tmp/absa_movies.db
    # Actualizar variables de entorno para que la app use la copia local
    export DATABASE_URL="sqlite+aiosqlite:////$DB_DEST"
    export SYNC_DATABASE_URL="sqlite:////$DB_DEST"
    echo "[entrypoint] Base de datos lista en: $DB_DEST"
else
    echo "[entrypoint] No se encontró BD montada en $DB_SOURCE"
    echo "[entrypoint] Usando ruta por defecto: $DB_DEST"
fi

# Ejecutar el comando principal
exec "$@"
