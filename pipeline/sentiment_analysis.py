"""
Módulo de análisis de sentimiento con Transformers (BERT/RoBERTa).
Inferencia optimizada en GPU usando procesamiento por lotes.
"""

import logging
from typing import List, Dict, Optional
from pathlib import Path
import json
import torch
from transformers import pipeline, AutoTokenizer

logger = logging.getLogger(__name__)


def configurar_pipeline_sentimiento(
    modelo: str = "pysentimiento/robertuito-sentiment-analysis",
    device: int = 0,
    batch_size: int = 64,
    max_length: int = 128,
) -> pipeline:
    """
    Configura el pipeline de Hugging Face para análisis de sentimiento.
    """
    if device >= 0 and not torch.cuda.is_available():
        logger.warning("CUDA no disponible. Forzando CPU.")
        device = -1

    logger.info(
        f"Cargando modelo: {modelo} | Dispositivo: {'GPU' if device >= 0 else 'CPU'}"
    )

    # Si el modelo es un path local (fine-tuneado), usar tokenizer base para evitar
    # incompatibilidades de version entre el entorno de entrenamiento (Colab) y local.
    tokenizer = modelo
    if Path(modelo).exists() and Path(modelo).is_dir():
        tokenizer = "pysentimiento/robertuito-sentiment-analysis"
        logger.info(f"Modelo fine-tuneado detectado. Usando tokenizer base: {tokenizer}")

    classifier = pipeline(
        "sentiment-analysis",
        model=modelo,
        tokenizer=tokenizer,
        device=device,
        truncation=True,
        max_length=max_length,
        batch_size=batch_size,
    )
    return classifier


def cargar_configuracion_modelo_finetuneado(ruta_modelo: str) -> Optional[Dict]:
    """
    Carga la configuración de labels de un modelo fine-tuneado.
    """
    config_path = Path(ruta_modelo) / "label_config.json"
    if not config_path.exists():
        return None
    with open(config_path, "r") as f:
        return json.load(f)


def obtener_mapeo_sentimientos(ruta_modelo: Optional[str] = None) -> Dict[str, str]:
    """
    Obtiene el mapeo de labels según el tipo de modelo.
    """
    if ruta_modelo:
        config = cargar_configuracion_modelo_finetuneado(ruta_modelo)
        if config and "id2label" in config:
            return {f"LABEL_{k}": v for k, v in config["id2label"].items()}
    return {"POS": "positivo", "NEG": "negativo", "NEU": "neutral"}


def analizar_sentimiento_lote(
    fragmentos: List[str],
    classifier: pipeline,
    batch_size: int = 64,
) -> List[Dict]:
    """
    Clasifica el sentimiento de una lista de fragmentos de texto.
    """
    resultados = []
    total = len(fragmentos)
    logger.info(f"Inferencia: {total} fragmentos, batch={batch_size}")

    for i in range(0, total, batch_size):
        lote = fragmentos[i : i + batch_size]
        try:
            predicciones = classifier(lote)
            for pred in predicciones:
                resultados.append(
                    {
                        "sentimiento": pred["label"],
                        "confianza": round(pred["score"], 4),
                        "label_original": pred["label"],
                    }
                )
        except Exception as e:
            logger.error(f"Error en batch {i // batch_size}: {e}")
            for _ in lote:
                resultados.append(
                    {"sentimiento": "ERROR", "confianza": 0.0, "label_original": "ERROR"}
                )

        if i % (batch_size * 10) == 0 and torch.cuda.is_available():
            torch.cuda.empty_cache()

    logger.info(f"Inferencia completada: {len(resultados)} resultados")
    return resultados


def mapear_sentimientos(
    resultados_bert: List[Dict], mapping: Dict[str, str] = None
) -> List[str]:
    """
    Normaliza las etiquetas de sentimiento a un formato estándar en español.
    """
    if mapping is None:
        mapping = {"POS": "positivo", "NEG": "negativo", "NEU": "neutral"}
    return [
        mapping.get(r["label_original"], r["label_original"].lower())
        for r in resultados_bert
    ]
