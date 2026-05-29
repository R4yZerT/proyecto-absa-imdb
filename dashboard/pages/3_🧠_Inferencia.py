"""
Página: Inferencia
Permite escribir una reseña y obtener predicción de aspectos + sentimientos en tiempo real.
"""

import streamlit as st
import pandas as pd

st.set_page_config(page_title="Inferencia", page_icon="🧠", layout="wide")

st.title("🧠 Inferencia en Tiempo Real")
st.markdown(
    "Escribe una reseña de película en español y obtén la extracción de aspectos "
    "y predicción de sentimientos usando el modelo fine-tuneado."
)
st.markdown("---")

# Cargar modelo y pipeline (lazy loading)
from utils.model_loader import (
    cargar_pipeline_sentimiento,
    cargar_modelo_spacy,
    extraer_aspectos_adjetivos,
    obtener_mapeo_sentimientos,
)
from utils.data_loader import obtener_rutas_datos

rutas = obtener_rutas_datos()

# ───────────────────────────────────────────────
# Estado de carga del modelo
# ───────────────────────────────────────────────

with st.spinner("🔄 Cargando modelo fine-tuneado (puede tardar ~30 segundos)..."):
    try:
        nlp = cargar_modelo_spacy()
        classifier = cargar_pipeline_sentimiento(rutas["modelo"])
        sentiment_map = obtener_mapeo_sentimientos(rutas["modelo"])
        modelo_cargado = True
        st.success("✅ Modelo cargado correctamente.")
    except Exception as e:
        st.error(f"❌ Error cargando el modelo: {e}")
        st.info(
            "💡 Asegúrate de haber ejecutado el pipeline de fine-tuning "
            "y de que el modelo existe en data/output/robertuito-imdb-finetuned/"
        )
        modelo_cargado = False

if not modelo_cargado:
    st.stop()

# ───────────────────────────────────────────────
# Input de texto
# ───────────────────────────────────────────────

st.subheader("📝 Escribe tu reseña")

texto_reseña = st.text_area(
    "Reseña de película en español",
    placeholder="Ejemplo: La actuación del protagonista es impresionante, aunque el guion deja mucho que desear...",
    height=150,
    max_chars=2000,
)

col1, col2 = st.columns([1, 5])
with col1:
    analizar = st.button("🔍 Analizar", type="primary", use_container_width=True)

st.markdown("---")

# ───────────────────────────────────────────────
# Análisis
# ───────────────────────────────────────────────

if analizar and texto_reseña:
    if len(texto_reseña.strip()) < 10:
        st.warning("⚠️ El texto es muy corto. Escribe al menos 10 caracteres.")
    else:
        with st.spinner("🔄 Analizando reseña..."):
            # Paso 1: Extracción de aspectos con SpaCy
            doc = nlp(texto_reseña)
            aspectos = extraer_aspectos_adjetivos(doc)

            if not aspectos:
                st.info("🔍 No se encontraron pares aspecto-adjetivo en el texto.")
                st.stop()

            # Paso 2: Inferencia BERT
            fragmentos = [a["fragmento"] for a in aspectos]
            predicciones = classifier(fragmentos)

            # Mapear labels
            for i, pred in enumerate(predicciones):
                aspectos[i]["sentimiento"] = sentiment_map.get(pred["label"], pred["label"])
                aspectos[i]["confianza"] = round(pred["score"], 4)

            # Crear DataFrame de resultados
            df_resultados = pd.DataFrame(aspectos)

        # Mostrar resultados
        st.subheader("📊 Resultados del Análisis")

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Aspectos encontrados", len(df_resultados))
        with col2:
            conf_promedio = df_resultados["confianza"].mean()
            st.metric("Confianza promedio", f"{conf_promedio:.3f}")
        with col3:
            sent_dominante = df_resultados["sentimiento"].mode().iloc[0]
            emoji = {"positive": "😊", "negative": "😞", "neutral": "😐"}
            st.metric("Sentimiento dominante", f"{emoji.get(sent_dominante, '')} {sent_dominante}")

        st.markdown("---")

        # Tabla de resultados
        st.subheader("📋 Detalle de Aspectos")
        st.dataframe(
            df_resultados[["aspecto", "adjetivo", "fragmento", "sentimiento", "confianza"]],
            use_container_width=True,
            hide_index=True,
        )

        # Visualización de sentimientos
        st.markdown("---")
        st.subheader("🎨 Visualización de Sentimientos por Aspecto")

        import plotly.express as px

        colors = {"positive": "#2ecc71", "negative": "#e74c3c", "neutral": "#f39c12"}
        fig = px.bar(
            df_resultados,
            x="aspecto",
            y="confianza",
            color="sentimiento",
            color_discrete_map=colors,
            title="Confianza del modelo por aspecto",
            labels={"confianza": "Score de Confianza", "aspecto": "Aspecto"},
            text="adjetivo",
        )
        fig.update_layout(showlegend=True)
        st.plotly_chart(fig, use_container_width=True)

        # Texto completo con highlight
        st.markdown("---")
        st.subheader("🔍 Texto Analizado")
        st.info(texto_reseña)

elif analizar and not texto_reseña:
    st.warning("⚠️ Escribe una reseña antes de analizar.")
