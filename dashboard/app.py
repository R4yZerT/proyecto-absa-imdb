"""
ABSA Dashboard - Entry point principal.

Ejecutar desde la raíz del proyecto:
    streamlit run dashboard/app.py

O desde la carpeta dashboard:
    cd dashboard && streamlit run app.py
"""

import streamlit as st

# Configuración de la página principal
st.set_page_config(
    page_title="ABSA Dashboard",
    page_icon="🎬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Sidebar navigation
with st.sidebar:
    st.title("🎬 ABSA Dashboard")
    st.markdown("---")
    st.markdown("### Navegación")
    st.page_link("pages/1_📊_Overview.py", label="📊 Overview")
    st.page_link("pages/2_🎭_Aspectos.py", label="🎭 Aspectos")
    st.page_link("pages/3_🧠_Inferencia.py", label="🧠 Inferencia")
    st.page_link("pages/4_🔍_Explorador.py", label="🔍 Explorador")
    st.markdown("---")
    st.markdown("**Dataset:** IMDb Reviews Spanish (50K)")
    st.markdown("**Modelo:** robertuito fine-tuneado")

# Contenido principal (landing page)
st.title("🎬 Aspect-Based Sentiment Analysis Dashboard")
st.markdown("---")

st.markdown(
    """
    Bienvenido al dashboard de análisis de sentimiento basado en aspectos (ABSA)
    para reseñas de IMDb en español.

    ### 📊 Secciones disponibles:

    - **Overview**: Métricas generales, distribución de sentimientos y comparación con el dataset original.
    - **Aspectos**: Top aspectos, sentimiento por aspecto y nube de palabras de adjetivos.
    - **Inferencia**: Escribe una reseña y obtén predicción de aspectos + sentimientos en tiempo real.
    - **Explorador**: Tabla interactiva con filtros avanzados para explorar todos los datos.

    ### 🚀 Datos del Pipeline

    - **Total de reseñas procesadas:** ~50,000
    - **Pares aspecto-adjetivo extraídos:** ~48,000
    - **Aspectos únicos:** ~1,500
    - **Modelo:** pysentimiento/robertuito-sentiment-analysis (fine-tuneado en IMDb)
    """
)

st.markdown("---")
st.info("👈 Usa el sidebar para navegar entre las secciones del dashboard.")
