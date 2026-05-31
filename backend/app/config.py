"""
Configuración centralizada del backend.
Lee variables de entorno con valores por defecto sensibles para desarrollo local.
"""

import os
from pathlib import Path

# Rutas base del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
DB_DIR = BASE_DIR / "backend"
DB_PATH = DB_DIR / "absa_movies.db"

# Configuración de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{DB_PATH}")
SYNC_DATABASE_URL = os.getenv("SYNC_DATABASE_URL", f"sqlite:///{DB_PATH}")

# Configuración del pipeline
CSV_PATH = os.getenv("CSV_PATH", str(RAW_DATA_DIR / "IMDB Dataset SPANISH.csv"))
# Nota: el modelo fine-tuneado local fue descartado porque el fine-tuning
# con labels de reseña completa corrompió las predicciones. Se usa el
# modelo base pre-entrenado que funciona correctamente.
MODEL_PATH = os.getenv("MODEL_PATH", "edumunozsala/beto_sentiment_analysis_es")
SPACY_MODEL = os.getenv("SPACY_MODEL", "es_core_news_md")
SAMPLE_SIZE = int(os.getenv("SAMPLE_SIZE", "50000"))
BATCH_SIZE_SPACY = int(os.getenv("BATCH_SIZE_SPACY", "256"))
BATCH_SIZE_BERT = int(os.getenv("BATCH_SIZE_BERT", "64"))
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "256"))
MIN_FRECUENCIA = int(os.getenv("MIN_FRECUENCIA", "1"))
DEVICE = int(os.getenv("DEVICE", "0"))  # -1 para CPU

# Configuración de CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
