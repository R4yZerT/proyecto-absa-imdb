"""
Pipeline ETL completo para ABSA.
Procesa el dataset IMDb en español, extrae aspectos con SpaCy,
clasifica sentimiento con BERT y persiste todo en SQLite de forma masiva.

Uso:
    python pipeline/run_pipeline.py
Variables de entorno (ver backend/app/config.py):
    CSV_PATH, SAMPLE_SIZE, BATCH_SIZE_SPACY, BATCH_SIZE_BERT, DEVICE, etc.
"""

import os
import sys
import logging
import gc
from pathlib import Path
from datetime import datetime

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from tqdm import tqdm

# Asegurar que el proyecto raíz esté en sys.path para importar backend.*
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.config import (
    CSV_PATH,
    SAMPLE_SIZE,
    BATCH_SIZE_SPACY,
    BATCH_SIZE_BERT,
    MAX_LENGTH,
    MIN_FRECUENCIA,
    DEVICE,
    SPACY_MODEL,
    MODEL_PATH,
    SYNC_DATABASE_URL,
    DB_DIR,
)
from backend.app.database import Base
from backend.app.models import Review, Aspect
from pipeline.text_processing import cargar_modelo_spacy, procesar_textos_spacy
from pipeline.sentiment_analysis import (
    configurar_pipeline_sentimiento,
    analizar_sentimiento_lote,
    obtener_mapeo_sentimientos,
    mapear_sentimientos,
)

# ---------------------------------------------------------------------------
# Logging estructurado
# ---------------------------------------------------------------------------
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
log_file = LOG_DIR / f"pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[
        logging.FileHandler(log_file, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers de persistencia masiva
# ---------------------------------------------------------------------------
def crear_tablas_si_no_existen(engine):
    """Crea el esquema de BD usando metadata de SQLAlchemy."""
    logger.info("Creando esquema de base de datos si no existe...")
    Base.metadata.create_all(bind=engine)
    logger.info("Esquema listo.")


def insertar_reviews_masivo(engine, df_reviews: pd.DataFrame, batch_size: int = 1000):
    """
    Inserta reseñas usando pandas to_sql con método multi para velocidad.
    Retorna el mapping de review_id externo -> interno (DB id).
    """
    logger.info(f"Insertando {len(df_reviews)} reseñas en la BD...")

    # Reordenar columnas para que coincidan con el modelo
    df = df_reviews.rename(
        columns={"review_es": "review_text", "sentimiento": "original_sentiment"}
    )[["review_text", "original_sentiment"]]

    df.to_sql(
        "reviews",
        con=engine,
        if_exists="append",
        index=False,
        method="multi",
        chunksize=batch_size,
    )

    # Recuperar IDs asignados por SQLite (autoincrement)
    with engine.connect() as conn:
        ids = pd.read_sql("SELECT id, review_text FROM reviews ORDER BY id", conn)

    # Hacemos merge por review_text para mapear id interno
    # Usamos el índice original del DataFrame como clave externa temporal
    df["orig_index"] = df.index
    ids = ids.merge(df, on="review_text", how="inner")
    mapping = dict(zip(ids["orig_index"], ids["id"]))
    logger.info(f"Mapping de {len(mapping)} reseñas recuperado.")
    return mapping


def filtrar_aspectos_frecuentes(aspect_records: list, min_freq: int) -> list:
    """Filtra aspectos cuyo lema aparezca menos de min_freq veces."""
    from collections import Counter

    conteo = Counter(r["aspecto_lematizado"] for r in aspect_records)
    validos = {k for k, v in conteo.items() if v >= min_freq}
    return [r for r in aspect_records if r["aspecto_lematizado"] in validos]


def insertar_aspectos_masivo(engine, aspect_records: list, batch_size: int = 2000):
    """Inserta registros de aspectos usando inserciones masivas por batches."""
    logger.info(f"Insertando {len(aspect_records)} aspectos en la BD...")

    df = pd.DataFrame(aspect_records)
    df.to_sql(
        "aspects",
        con=engine,
        if_exists="append",
        index=False,
        method="multi",
        chunksize=batch_size,
    )
    logger.info("Aspectos insertados correctamente.")


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------
def main():
    logger.info("=" * 60)
    logger.info("INICIANDO PIPELINE ABSA – IMDb Spanish")
    logger.info("=" * 60)
    logger.info(
        f"Config: CSV={CSV_PATH}, SAMPLE={SAMPLE_SIZE}, "
        f"SPACY_BATCH={BATCH_SIZE_SPACY}, BERT_BATCH={BATCH_SIZE_BERT}, "
        f"DEVICE={DEVICE}"
    )

    # 1. Ingesta CSV
    # -----------------------------------------------------------------------
    if not Path(CSV_PATH).exists():
        logger.error(f"Archivo CSV no encontrado: {CSV_PATH}")
        sys.exit(1)

    logger.info(f"Leyendo CSV: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    total_raw = len(df)
    logger.info(f"Filas leídas: {total_raw}")

    # Normalizar nombres de columnas (por si vienen con espacios o mayúsculas)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Identificar columna de texto y sentimiento
    col_texto = "review_es" if "review_es" in df.columns else "review_en"
    col_sent = "sentimiento" if "sentimiento" in df.columns else "sentiment"

    df = df[[col_texto, col_sent]].copy()
    df.rename(columns={col_texto: "review_es", col_sent: "sentimiento"}, inplace=True)

    # Muestreo configurable
    if SAMPLE_SIZE < total_raw:
        df = df.sample(n=SAMPLE_SIZE, random_state=42).reset_index(drop=True)
        logger.info(f"Muestreo aplicado: {SAMPLE_SIZE} reseñas.")
    else:
        df = df.reset_index(drop=True)

    # Limpiar nulos
    df["review_es"] = df["review_es"].fillna("").astype(str)
    df["sentimiento"] = df["sentimiento"].fillna("unknown").astype(str)

    # 2. Configurar BD
    # -----------------------------------------------------------------------
    engine = create_engine(SYNC_DATABASE_URL, echo=False, future=True)
    crear_tablas_si_no_existen(engine)

    # 3. Persistir reseñas y obtener IDs internos
    # -----------------------------------------------------------------------
    review_id_map = insertar_reviews_masivo(engine, df, batch_size=2000)

    # 4. Extracción de aspectos con SpaCy
    # -----------------------------------------------------------------------
    nlp = cargar_modelo_spacy(SPACY_MODEL)
    textos = df["review_es"].tolist()
    ids_externos = list(range(len(textos)))

    logger.info("Extrayendo aspectos con SpaCy...")
    aspectos_por_review = list(procesar_textos_spacy(textos, nlp, batch_size=BATCH_SIZE_SPACY))

    # Aplanar registros de aspectos con mapeo de ID interno
    registros_aspectos = []
    for ext_id, aspectos in tqdm(
        zip(ids_externos, aspectos_por_review),
        total=len(ids_externos),
        desc="Aplanando aspectos",
    ):
        review_db_id = review_id_map.get(ext_id)
        if review_db_id is None:
            continue
        for asp in aspectos:
            registros_aspectos.append(
                {
                    "review_id": review_db_id,
                    "aspect_lemma": asp["aspecto_lematizado"],
                    "adjetivo": asp["adjetivo"],
                    "adjetivo_lemma": asp["adjetivo_lematizado"],
                    "fragmento": asp["fragmento"],
                    # placeholders para sentimiento
                    "sentiment_label": "pendiente",
                    "confidence": 0.0,
                }
            )

    logger.info(f"Total pares aspecto-adjetivo extraídos: {len(registros_aspectos)}")

    # Filtrar por frecuencia mínima
    if MIN_FRECUENCIA > 1:
        n_antes = len(registros_aspectos)
        registros_aspectos = filtrar_aspectos_frecuentes(registros_aspectos, MIN_FRECUENCIA)
        logger.info(
            f"Filtrado por frecuencia >= {MIN_FRECUENCIA}: "
            f"{n_antes} -> {len(registros_aspectos)}"
        )
        if not registros_aspectos:
            logger.warning(
                "No quedaron aspectos tras el filtrado. Considera reducir MIN_FRECUENCIA. Abortando."
            )
            sys.exit(0)

    # 5. Inferencia de sentimiento con BERT
    # -----------------------------------------------------------------------
    # Usar modelo base BETO pre-entrenado. El fine-tuneado local fue descartado
    # porque el entrenamiento con labels de reseña completa corrompió el modelo.
    ruta_modelo = "edumunozsala/beto_sentiment_analysis_es"
    logger.info(f"Usando modelo base BETO: {ruta_modelo}")

    classifier = configurar_pipeline_sentimiento(
        modelo=ruta_modelo,
        device=DEVICE,
        batch_size=BATCH_SIZE_BERT,
        max_length=MAX_LENGTH,
    )

    mapping_labels = obtener_mapeo_sentimientos(None)

    fragmentos = [r["fragmento"] for r in registros_aspectos]
    logger.info(f"Iniciando inferencia BERT sobre {len(fragmentos)} fragmentos...")
    resultados_bert = analizar_sentimiento_lote(fragmentos, classifier, batch_size=BATCH_SIZE_BERT)
    sentimientos_normalizados = mapear_sentimientos(resultados_bert, mapping=mapping_labels)

    # Asignar resultados a registros
    for reg, res, sent_norm in zip(registros_aspectos, resultados_bert, sentimientos_normalizados):
        reg["sentiment_label"] = sent_norm if res["sentimiento"] != "ERROR" else "error"
        reg["confidence"] = res["confianza"]

    # Liberar memoria GPU
    del classifier
    gc.collect()
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass

    # 6. Persistir aspectos en BD
    # -----------------------------------------------------------------------
    insertar_aspectos_masivo(engine, registros_aspectos, batch_size=2000)

    # 7. Validación final
    # -----------------------------------------------------------------------
    with engine.connect() as conn:
        n_reviews = conn.execute(text("SELECT COUNT(*) FROM reviews")).scalar()
        n_aspects = conn.execute(text("SELECT COUNT(*) FROM aspects")).scalar()

    logger.info("=" * 60)
    logger.info("PIPELINE COMPLETADO")
    logger.info(f"Reseñas en BD : {n_reviews}")
    logger.info(f"Aspectos en BD: {n_aspects}")
    logger.info(f"Log guardado en: {log_file}")
    logger.info("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        logger.critical(f"Pipeline abortado por excepción no manejada: {exc}", exc_info=True)
        sys.exit(1)
