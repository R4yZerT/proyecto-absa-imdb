"""
Módulo de análisis ABSA en vivo.
Carga los modelos SpaCy y BERT de forma lazy (singleton) y expone
una función para analizar un texto arbitrario en tiempo real.
"""

import sys
import logging
from pathlib import Path
from typing import List, Dict

# Asegurar que el proyecto raíz esté en sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.config import (
    SPACY_MODEL,
    MODEL_PATH,
    DEVICE,
    MAX_LENGTH,
    BATCH_SIZE_BERT,
)
from pipeline.text_processing import extraer_aspectos_adjetivos, cargar_modelo_spacy

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Singletons de modelos (lazy loading)
# ---------------------------------------------------------------------------
_nlp = None
_classifier = None
_mapping_labels = None


def _load_spacy():
    global _nlp
    if _nlp is None:
        logger.info(f"Cargando modelo SpaCy: {SPACY_MODEL}")
        _nlp = cargar_modelo_spacy(SPACY_MODEL)
    return _nlp


def _load_bert():
    global _classifier, _mapping_labels
    if _classifier is None:
        from pipeline.sentiment_analysis import (
            configurar_pipeline_sentimiento,
            obtener_mapeo_sentimientos,
        )
        ruta_modelo = MODEL_PATH if Path(MODEL_PATH).exists() else "edumunozsala/beto_sentiment_analysis_es"
        if not Path(MODEL_PATH).exists():
            logger.warning(f"Modelo fine-tuneado no encontrado en {MODEL_PATH}. Usando modelo base.")
        _classifier = configurar_pipeline_sentimiento(
            modelo=ruta_modelo,
            device=DEVICE,
            batch_size=BATCH_SIZE_BERT,
            max_length=MAX_LENGTH,
        )
        _mapping_labels = obtener_mapeo_sentimientos(ruta_modelo if Path(MODEL_PATH).exists() else None)
    return _classifier, _mapping_labels


def analyze_text(text: str) -> Dict:
    """
    Analiza un texto en español extrayendo aspectos y clasificando
    el sentimiento de cada fragmento con BERT.

    Retorna un dict con:
        - text: texto original
        - overall_sentiment: sentimiento mayoritario
        - aspects: lista de aspectos detectados
    """
    if not text or not text.strip():
        return {"text": text, "overall_sentiment": "positivo", "aspects": []}

    nlp = _load_spacy()
    classifier, mapping = _load_bert()

    # 1. Extraer aspectos con SpaCy (usando extractor mejorado del pipeline)
    doc = nlp(text)
    aspectos = extraer_aspectos_adjetivos(doc)

    if not aspectos:
        return {"text": text, "overall_sentiment": "positivo", "aspects": []}

    # 2. Clasificar sentimiento de cada fragmento con BERT
    #    Usamos el modelo base BETO pre-entrenado que funciona correctamente.
    fragmentos = [a["fragmento"] for a in aspectos]
    try:
        predicciones = classifier(fragmentos)
    except Exception as exc:
        logger.error(f"Error en inferencia BERT: {exc}")
        predicciones = [{"label": "ERROR", "score": 0.0} for _ in fragmentos]

    # 3. Combinar resultados
    resultados = []
    sent_counts = {"positivo": 0, "negativo": 0, "error": 0}
    # Fallback para labels en ingles que puedan escapar del mapping
    fallback_translation = {"positive": "positivo", "negative": "negativo"}
    for asp, pred in zip(aspectos, predicciones):
        label_original = pred["label"]
        confidence = round(pred["score"], 4)
        sentiment = mapping.get(label_original, label_original.lower())
        sentiment = fallback_translation.get(sentiment, sentiment)
        if sentiment not in sent_counts:
            sentiment = "error"
        sent_counts[sentiment] += 1
        resultados.append({
            "aspect_lemma": asp["aspecto_lematizado"],
            "adjetivo": asp["adjetivo"],
            "adjetivo_lemma": asp["adjetivo_lematizado"],
            "fragmento": asp["fragmento"],
            "sentiment_label": sentiment,
            "confidence": confidence,
        })

    # Sentimiento global: el más frecuente
    overall = max(sent_counts, key=sent_counts.get)

    return {
        "text": text,
        "overall_sentiment": overall,
        "aspects": resultados,
    }
