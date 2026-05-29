"""
Funciones de visualización reutilizables para el dashboard ABSA.
Usa Plotly para gráficos interactivos.
"""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from wordcloud import WordCloud
import matplotlib.pyplot as plt
import streamlit as st


def plot_distribucion_sentimientos(df: pd.DataFrame, columna: str = "sentimiento_bert") -> go.Figure:
    """
    Gráfico de pastel con la distribución de sentimientos.

    Args:
        df: DataFrame con columna de sentimientos.
        columna: Nombre de la columna de sentimientos.

    Returns:
        Figura de Plotly.
    """
    counts = df[columna].value_counts().reset_index()
    counts.columns = ["sentimiento", "conteo"]

    colors = {"positive": "#2ecc71", "negative": "#e74c3c", "neutral": "#f39c12"}
    color_list = [colors.get(s, "#95a5a6") for s in counts["sentimiento"]]

    fig = px.pie(
        counts,
        values="conteo",
        names="sentimiento",
        title="Distribución de Sentimientos",
        color="sentimiento",
        color_discrete_map=colors,
        hole=0.4,
    )
    fig.update_traces(textinfo="percent+label")
    fig.update_layout(showlegend=True)
    return fig


def plot_top_aspectos(df: pd.DataFrame, top_n: int = 20) -> go.Figure:
    """
    Bar chart horizontal con los aspectos más frecuentes.

    Args:
        df: DataFrame con columna 'aspecto'.
        top_n: Número de aspectos a mostrar.

    Returns:
        Figura de Plotly.
    """
    top = df["aspecto"].value_counts().head(top_n).reset_index()
    top.columns = ["aspecto", "frecuencia"]

    fig = px.bar(
        top,
        x="frecuencia",
        y="aspecto",
        orientation="h",
        title=f"Top {top_n} Aspectos Más Mencionados",
        color="frecuencia",
        color_continuous_scale="Viridis",
    )
    fig.update_layout(yaxis={"categoryorder": "total ascending"})
    return fig


def plot_sentimiento_por_aspecto(df: pd.DataFrame, top_n: int = 15) -> go.Figure:
    """
    Stacked bar chart mostrando la distribución de sentimientos por aspecto.

    Args:
        df: DataFrame con columnas 'aspecto' y 'sentimiento_bert'.
        top_n: Número de aspectos a mostrar.

    Returns:
        Figura de Plotly.
    """
    # Top N aspectos
    top_aspectos = df["aspecto"].value_counts().head(top_n).index.tolist()
    df_top = df[df["aspecto"].isin(top_aspectos)]

    # Crosstab
    crosstab = pd.crosstab(df_top["aspecto"], df_top["sentimiento_bert"], normalize="index") * 100
    crosstab = crosstab.reindex(
        df_top["aspecto"].value_counts().head(top_n).index
    )

    fig = go.Figure()
    colors = {"positive": "#2ecc71", "negative": "#e74c3c", "neutral": "#f39c12"}

    for sentimiento in crosstab.columns:
        fig.add_trace(go.Bar(
            name=sentimiento,
            x=crosstab.index,
            y=crosstab[sentimiento],
            marker_color=colors.get(sentimiento, "#95a5a6"),
        ))

    fig.update_layout(
        barmode="stack",
        title=f"Sentimiento por Aspecto (Top {top_n})",
        xaxis_title="Aspecto",
        yaxis_title="Porcentaje (%)",
        yaxis=dict(range=[0, 100]),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    return fig


def plot_nube_adjetivos(df: pd.DataFrame) -> plt.Figure:
    """
    Nube de palabras con los adjetivos más frecuentes.

    Args:
        df: DataFrame con columna 'adjetivo'.

    Returns:
        Figura de Matplotlib con la nube de palabras.
    """
    texto = " ".join(df["adjetivo"].dropna().astype(str).tolist())

    wordcloud = WordCloud(
        width=800,
        height=400,
        background_color="white",
        colormap="viridis",
        max_words=100,
        relative_scaling=0.5,
    ).generate(texto)

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.imshow(wordcloud, interpolation="bilinear")
    ax.axis("off")
    ax.set_title("Nube de Palabras - Adjetivos", fontsize=16, pad=20)
    plt.tight_layout()
    return fig


def plot_comparacion_bert_vs_original(df: pd.DataFrame) -> go.Figure:
    """
    Heatmap de comparación entre sentimiento BERT y sentimiento original del dataset.

    Args:
        df: DataFrame con 'sentimiento_bert' y 'sentiment_sentiment'.

    Returns:
        Figura de Plotly.
    """
    crosstab = pd.crosstab(
        df["sentiment_sentiment"],
        df["sentimiento_bert"],
        normalize="index"
    ) * 100

    fig = px.imshow(
        crosstab,
        text_auto=".1f",
        aspect="auto",
        title="Comparación: BERT vs Sentimiento Original (%)",
        color_continuous_scale="RdYlGn",
        labels=dict(x="Sentimiento BERT", y="Sentimiento Original", color="%"),
    )
    fig.update_xaxes(side="top")
    return fig


def plot_distribucion_confianza(df: pd.DataFrame) -> go.Figure:
    """
    Histograma de la distribución de confianza del modelo.

    Args:
        df: DataFrame con columna 'confianza'.

    Returns:
        Figura de Plotly.
    """
    fig = px.histogram(
        df,
        x="confianza",
        nbins=50,
        title="Distribución de Confianza del Modelo BERT",
        labels={"confianza": "Score de Confianza", "count": "Frecuencia"},
        color="sentimiento_bert",
        color_discrete_map={"positive": "#2ecc71", "negative": "#e74c3c", "neutral": "#f39c12"},
        opacity=0.7,
    )
    fig.update_layout(barmode="overlay")
    return fig
