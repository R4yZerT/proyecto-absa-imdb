"""
Página: Aspectos
Muestra top aspectos, sentimiento por aspecto y nube de palabras de adjetivos.
"""

import streamlit as st

st.set_page_config(page_title="Aspectos", page_icon="🎭", layout="wide")

st.title("🎭 Aspectos")
st.markdown("Análisis detallado de los aspectos extraídos y sus sentimientos asociados.")
st.markdown("---")

# Cargar datos
from utils.data_loader import cargar_datos_aspectos, obtener_rutas_datos
from utils.visualizations import (
    plot_top_aspectos,
    plot_sentimiento_por_aspecto,
    plot_nube_adjetivos,
)

rutas = obtener_rutas_datos()

try:
    df = cargar_datos_aspectos(rutas["aspectos"])
except Exception as e:
    st.error(f"❌ Error cargando datos: {e}")
    st.stop()

# ───────────────────────────────────────────────
# Filtros
# ───────────────────────────────────────────────

with st.sidebar:
    st.subheader("🎛️ Filtros")

    top_n = st.slider("Top N aspectos", min_value=5, max_value=50, value=20, step=5)

    sentimiento_filtro = st.multiselect(
        "Filtrar por sentimiento",
        options=df["sentimiento_bert"].unique().tolist(),
        default=df["sentimiento_bert"].unique().tolist(),
    )

    aspecto_seleccionado = st.selectbox(
        "Seleccionar aspecto específico",
        options=["Todos"] + sorted(df["aspecto"].unique().tolist()),
        index=0,
    )

# Aplicar filtros
df_filtrado = df[df["sentimiento_bert"].isin(sentimiento_filtro)]

if aspecto_seleccionado != "Todos":
    df_filtrado = df_filtrado[df_filtrado["aspecto"] == aspecto_seleccionado]

# ───────────────────────────────────────────────
# Top aspectos
# ───────────────────────────────────────────────

st.subheader(f"Top {top_n} Aspectos Más Mencionados")
fig_top = plot_top_aspectos(df_filtrado, top_n=top_n)
st.plotly_chart(fig_top, use_container_width=True)

st.markdown("---")

# ───────────────────────────────────────────────
# Sentimiento por aspecto
# ───────────────────────────────────────────────

st.subheader("Sentimiento por Aspecto")
fig_stack = plot_sentimiento_por_aspecto(df_filtrado, top_n=top_n)
st.plotly_chart(fig_stack, use_container_width=True)

st.markdown("---")

# ───────────────────────────────────────────────
# Nube de palabras
# ───────────────────────────────────────────────

st.subheader("Nube de Palabras - Adjetivos")
fig_wc = plot_nube_adjetivos(df_filtrado)
st.pyplot(fig_wc, use_container_width=True)

# ───────────────────────────────────────────────
# Detalle por aspecto seleccionado
# ───────────────────────────────────────────────

if aspecto_seleccionado != "Todos":
    st.markdown("---")
    st.subheader(f"Detalle del aspecto: '{aspecto_seleccionado}'")

    df_aspecto = df_filtrado[df_filtrado["aspecto"] == aspecto_seleccionado]

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Menciones totales", len(df_aspecto))
    with col2:
        st.metric("Confianza promedio", f"{df_aspecto['confianza'].mean():.3f}")
    with col3:
        sent_dominante = df_aspecto["sentimiento_bert"].mode().iloc[0]
        st.metric("Sentimiento dominante", sent_dominante)

    st.subheader("Ejemplos de fragmentos")
    cols_mostrar = ["adjetivo", "fragmento", "sentimiento_bert", "confianza"]
    st.dataframe(df_aspecto[cols_mostrar].head(20), use_container_width=True, hide_index=True)
