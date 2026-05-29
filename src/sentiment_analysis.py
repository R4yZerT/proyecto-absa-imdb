"""
Módulo de análisis de sentimiento con Transformers (BERT/RoBERTa).
Inferencia optimizada en GPU usando procesamiento por lotes.
Soporta modelos pre-entrenados y modelos fine-tuneados localmente.
"""

import logging
from typing import List, Dict, Optional
from pathlib import Path
import json
import torch
from transformers import pipeline

logger = logging.getLogger(__name__)


def configurar_pipeline_sentimiento(
    modelo: str = "pysentimiento/robertuito-sentiment-analysis",
    device: int = 0,
    batch_size: int = 64,
    max_length: int = 128
) -> pipeline:
    """
    Configura el pipeline de Hugging Face para análisis de sentimiento.
    
    Acepta tanto modelos del Hugging Face Hub como rutas locales
    a modelos fine-tuneados.
    
    Args:
        modelo: Ruta local o nombre del modelo en Hugging Face Hub.
        device: 0 para GPU, -1 para CPU.
        batch_size: Tamaño de lote para inferencia.
        max_length: Longitud máxima de tokens (truncamiento).
    
    Returns:
        Pipeline de Hugging Face listo para inferencia.
    """
    if device >= 0 and not torch.cuda.is_available():
        logger.warning("CUDA no disponible. Forzando CPU.")
        device = -1
    
    logger.info(f"Cargando modelo: {modelo} | Dispositivo: {'GPU' if device >= 0 else 'CPU'}")
    
    classifier = pipeline(
        "sentiment-analysis",
        model=modelo,
        tokenizer=modelo,
        device=device,
        truncation=True,
        max_length=max_length,
        batch_size=batch_size
    )
    
    return classifier


def cargar_configuracion_modelo_finetuneado(
    ruta_modelo: str
) -> Optional[Dict]:
    """
    Carga la configuración de labels de un modelo fine-tuneado.
    
    Args:
        ruta_modelo: Ruta al directorio del modelo fine-tuneado.
    
    Returns:
        Diccionario con configuración de labels o None si no existe.
    """
    config_path = Path(ruta_modelo) / "label_config.json"
    
    if not config_path.exists():
        logger.warning(f"No se encontró label_config.json en {ruta_modelo}")
        return None
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    logger.info(f"Configuración cargada: {config.get('base_model', 'unknown')}")
    return config


def obtener_mapeo_sentimientos(
    ruta_modelo: Optional[str] = None
) -> Dict[str, str]:
    """
    Obtiene el mapeo de labels según el tipo de modelo.
    
    Para modelos fine-tuneados, lee label_config.json.
    Para modelos base (robertuito), usa mapeo por defecto.
    
    Args:
        ruta_modelo: Ruta al modelo fine-tuneado (opcional).
    
    Returns:
        Diccionario de mapeo de labels.
    """
    if ruta_modelo:
        config = cargar_configuracion_modelo_finetuneado(ruta_modelo)
        if config and 'id2label' in config:
            return {f"LABEL_{k}": v for k, v in config['id2label'].items()}
    
    return {
        "POS": "positive",
        "NEG": "negative",
        "NEU": "neutral"
    }


def analizar_sentimiento_lote(
    fragmentos: List[str],
    classifier: pipeline,
    batch_size: int = 64
) -> List[Dict]:
    """
    Clasifica el sentimiento de una lista de fragmentos de texto.
    
    Args:
        fragmentos: Lista de strings (fragmentos extraídos por SpaCy).
        classifier: Pipeline de Hugging Face configurado.
        batch_size: Tamaño de lote para enviar a la GPU.
    
    Returns:
        Lista de diccionarios con sentimiento, label y score de confianza.
    """
    resultados = []
    total_fragmentos = len(fragmentos)
    logger.info(f"Iniciando inferencia: {total_fragmentos} fragmentos, batch={batch_size}")
    
    for i in range(0, total_fragmentos, batch_size):
        lote = fragmentos[i:i + batch_size]
        
        try:
            predicciones = classifier(lote)
            
            for pred in predicciones:
                resultados.append({
                    "sentimiento": pred["label"],
                    "confianza": round(pred["score"], 4),
                    "label_original": pred["label"]
                })
        
        except Exception as e:
            logger.error(f"Error en batch {i//batch_size}: {str(e)}")
            # Agregar valores nulos para mantener alineación
            for _ in lote:
                resultados.append({
                    "sentimiento": "ERROR",
                    "confianza": 0.0,
                    "label_original": "ERROR"
                })
        
        # Liberar memoria GPU periódicamente
        if i % (batch_size * 10) == 0 and torch.cuda.is_available():
            torch.cuda.empty_cache()
    
    logger.info(f"Inferencia completada: {len(resultados)} resultados")
    return resultados


def mapear_sentimientos(
    resultados_bert: List[Dict],
    mapping: Dict[str, str] = None
) -> List[str]:
    """
    Normaliza las etiquetas de sentimiento a un formato estándar.
    
    Args:
        resultados_bert: Output del pipeline de Hugging Face.
        mapping: Diccionario de mapeo de labels.
    
    Returns:
        Lista de etiquetas normalizadas.
    """
    if mapping is None:
        # Mapeo por defecto para robertuito
        mapping = {
            "POS": "positivo",
            "NEG": "negativo",
            "NEU": "neutral"
        }
    
    return [mapping.get(r["label_original"], r["label_original"].lower()) for r in resultados_bert]
