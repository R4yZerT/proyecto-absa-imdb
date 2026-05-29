"""
Página: Overview
Muestra métricas clave, distribución de sentimientos y comparación BERT vs original.
"""

import streamlit as st
import plotly.graph_objects as go

st.set_page_config(page_title="Overview", page_icon="📊", layout="wide")

st.title("📊 Overview")
st.markdown("Métricas generales y distribución de sentimientos del pipeline ABSA.")
st.markdown("---")

# Cargar datos
from utils.data_loader import cargar_datos_aspectos, obtener_rutas_datos
from utils.visualizations import (
    plot_distribucion_sentimientos,
    plot_comparacion_bert_vs_original,
    plot_distribucion_confianza,
)

rutas = obtener_rutas_datos()

try:
    df = cargar_datos_aspectos(rutas["aspectos"])
except Exception as e:
    st.error(f"❌ Error cargando datos: {e}")
    st.stop()

# ───────────────────────────────────────────────
# Métricas clave en cards
# ───────────────────────────────────────────────

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        label="🎬 Reseñas procesadas",
        value=f"{df['review_id'].nunique():,}",
        help="Número total de reseñas únicas del dataset",
    )

with col2:
    st.metric(
        label="🎭 Pares extraídos",
        value=f"{len(df):,}",
        help="Total de pares aspecto-adjetivo encontrados",
    )

with col3:
    st.metric(
        label="🏷️ Aspectos únicos",
        value=f"{df['aspecto'].nunique():,}",
        help="Número de sustantivos distintos lematizados",
    )

with col4:
    confianza_promedio = df["confianza"].mean()
    st.metric(
        label="🎯 Confianza promedio",
        value=f"{confianza_promedio:.3f}",
        help="Score de confianza promedio del modelo BERT",
    )

st.markdown("---")

# ───────────────────────────────────────────────
# Distribución de sentimientos
# ───────────────────────────────────────────────

col_left, col_right = st.columns(2)

with col_left:
    st.subheader("Distribución de Sentimientos")
    fig_pie = plot_distribucion_sentimientos(df)
    st.plotly_chart(fig_pie, use_container_width=True)

with col_right:
    st.subheader("Comparación BERT vs Original")
    if "sentiment_sentiment" in df.columns:
        fig_comp = plot_comparacion_bert_vs_original(df)
        st.plotly_chart(fig_comp, use_container_width=True)
    else:
        st.info("⚠️ No se encontró la columna 'sentiment_sentiment' para comparación.")

st.markdown("---")

# ───────────────────────────────────────────────
# Distribución de confianza
# ───────────────────────────────────────────────

st.subheader("Distribución de Confianza del Modelo")
fig_hist = plot_distribucion_confianza(df)
st.plotly_chart(fig_hist, use_container_width=True)

# ───────────────────────────────────────────────
# Tabla resumen
# ───────────────────────────────────────────────

st.markdown("---")
st.subheader("📋 Resumen de Datos")

resumen = df.groupby("sentimiento_bert").agg(
    total=("sentimiento_bert", "size"),
    confianza_promedio=("confianza", "mean"),
    aspectos_unicos=("aspecto", "nunique"),
).reset_index()

resumen["confianza_promedio"] = resumen["confianza_promedio"].round(3)
resumen.columns = ["Sentimiento", "Total", "Confianza Promedio", "Aspectos Únicos"]

st.dataframe(resumen, use_container_width=True, hide_index=True)
