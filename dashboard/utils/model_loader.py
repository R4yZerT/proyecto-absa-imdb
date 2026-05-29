"""
Módulo para cargar el modelo fine-tuneado de forma lazy.
Usa st.cache_resource para evitar recargar el modelo en cada interacción.
"""

from pathlib import Path
from typing import Dict, Optional
import json
import streamlit as st
import torch
from transformers import pipeline


@st.cache_resource
def cargar_pipeline_sentimiento(ruta_modelo: str):
    """
    Carga el pipeline de Hugging Face para análisis de sentimiento.

    Args:
        ruta_modelo: Ruta al directorio del modelo fine-tuneado.

    Returns:
        Pipeline de Hugging Face listo para inferencia.
    """
    # Determinar dispositivo
    if torch.cuda.is_available():
        device = 0
    elif torch.backends.mps.is_available():
        device = -1  # MPS aún no es estable con transformers pipeline
    else:
        device = -1

    classifier = pipeline(
        "sentiment-analysis",
        model=ruta_modelo,
        tokenizer=ruta_modelo,
        device=device,
        truncation=True,
        max_length=128,
        batch_size=32,
    )

    return classifier


@st.cache_resource
def cargar_modelo_spacy(modelo: str = "es_core_news_md"):
    """
    Carga el modelo de SpaCy para extracción de aspectos.

    Args:
        modelo: Nombre del modelo de SpaCy.

    Returns:
        Objeto nlp de SpaCy.
    """
    import spacy

    nlp = spacy.load(modelo, disable=["ner", "textcat", "entity_linker"])

    if "sentencizer" not in nlp.pipe_names:
        nlp.add_pipe("sentencizer")

    return nlp


def obtener_mapeo_sentimientos(ruta_modelo: str) -> Dict[str, str]:
    """
    Lee el mapeo de labels desde label_config.json del modelo fine-tuneado.

    Args:
        ruta_modelo: Ruta al directorio del modelo.

    Returns:
        Diccionario de mapeo de labels (e.g., LABEL_1 -> positive).
    """
    config_path = Path(ruta_modelo) / "label_config.json"

    if config_path.exists():
        with open(config_path, "r") as f:
            config = json.load(f)
        if "id2label" in config:
            return {f"LABEL_{k}": v for k, v in config["id2label"].items()}

    # Fallback a mapeo por defecto de robertuito
    return {
        "POS": "positive",
        "NEG": "negative",
        "NEU": "neutral",
    }


def extraer_aspectos_adjetivos(doc) -> list:
    """
    Extrae pares (sustantivo aspecto, adjetivo modificador) de un Doc de SpaCy.
    Versión inline para uso en el dashboard.

    Args:
        doc: Documento procesado por SpaCy.

    Returns:
        Lista de diccionarios con aspecto, adjetivo y fragmento.
    """
    resultados = []

    for sent in doc.sents:
        for token in sent:
            if token.pos_ in ("NOUN", "PROPN"):
                adjetivos = [
                    child
                    for child in token.children
                    if child.dep_ == "amod" and child.pos_ == "ADJ"
                ]

                for adj in adjetivos:
                    fragmento = doc[token.i : adj.i + 1].text
                    resultados.append(
                        {
                            "aspecto": token.lemma_.lower(),
                            "adjetivo": adj.text.lower(),
                            "fragmento": fragmento,
                        }
                    )

    return resultados
