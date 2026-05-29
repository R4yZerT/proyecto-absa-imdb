"""
Módulo para cargar y cachear los datasets del pipeline ABSA.
Usa st.cache_data para evitar recargar los parquets en cada interacción.
"""

from pathlib import Path
import streamlit as st
import pandas as pd


@st.cache_data
def cargar_datos_aspectos(ruta_parquet: str) -> pd.DataFrame:
    """
    Carga el dataset final de aspectos y sentimientos desde Parquet.

    Args:
        ruta_parquet: Ruta al archivo aspectos_sentimientos_final.parquet.

    Returns:
        DataFrame con columnas: review_id, aspecto, adjetivo, fragmento,
        sentimiento_bert, confianza, sentiment_sentiment, etc.
    """
    df = pd.read_parquet(ruta_parquet)

    # Asegurar tipos de datos óptimos para visualización
    if "sentimiento_bert" in df.columns:
        df["sentimiento_bert"] = df["sentimiento_bert"].astype("category")
    if "aspecto" in df.columns:
        df["aspecto"] = df["aspecto"].astype("category")
    if "confianza" in df.columns:
        df["confianza"] = df["confianza"].astype("float32")

    return df


@st.cache_data
def cargar_metricas_aspecto(ruta_parquet: str) -> pd.DataFrame:
    """
    Carga las métricas agregadas por aspecto.

    Args:
        ruta_parquet: Ruta al archivo metricas_por_aspecto.parquet.

    Returns:
        DataFrame con métricas agregadas por aspecto.
    """
    df = pd.read_parquet(ruta_parquet)
    return df


def obtener_rutas_datos() -> dict:
    """
    Devuelve las rutas a los archivos de datos del pipeline.

    Asume que el dashboard se ejecuta desde la raíz del proyecto.

    Returns:
        Diccionario con rutas a los archivos de datos.
    """
    base = Path(__file__).parent.parent.parent / "data" / "output"

    return {
        "aspectos": str(base / "aspectos_sentimientos_final.parquet"),
        "metricas": str(base / "metricas_por_aspecto.parquet"),
        "modelo": str(base / "robertuito-imdb-finetuned"),
    }
