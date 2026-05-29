"""
Página: Explorador
Tabla interactiva con filtros avanzados para explorar todos los datos del pipeline.
"""

import streamlit as st

st.set_page_config(page_title="Explorador", page_icon="🔍", layout="wide")

st.title("🔍 Explorador de Datos")
st.markdown(
    "Explora todos los pares aspecto-adjetivo con filtros avanzados. "
    "Puedes filtrar por sentimiento, aspecto, confianza y buscar texto en los fragmentos."
)
st.markdown("---")

# Cargar datos
from utils.data_loader import cargar_datos_aspectos, obtener_rutas_datos

rutas = obtener_rutas_datos()

try:
    df = cargar_datos_aspectos(rutas["aspectos"])
except Exception as e:
    st.error(f"❌ Error cargando datos: {e}")
    st.stop()

# ───────────────────────────────────────────────
# Filtros en sidebar
# ───────────────────────────────────────────────

with st.sidebar:
    st.subheader("🎛️ Filtros Avanzados")

    # Filtro por sentimiento
    sentimiento_filtro = st.multiselect(
        "Sentimiento BERT",
        options=df["sentimiento_bert"].unique().tolist(),
        default=df["sentimiento_bert"].unique().tolist(),
    )

    # Filtro por aspecto
    aspecto_filtro = st.multiselect(
        "Aspecto",
        options=sorted(df["aspecto"].unique().tolist()),
        default=[],
        help="Deja vacío para mostrar todos los aspectos",
    )

    # Filtro por confianza mínima
    confianza_min = st.slider(
        "Confianza mínima",
        min_value=0.0,
        max_value=1.0,
        value=0.0,
        step=0.05,
        help="Filtrar predicciones con confianza menor al valor seleccionado",
    )

    # Búsqueda de texto
    busqueda = st.text_input(
        "🔎 Buscar en fragmentos",
        placeholder="Ejemplo: actuación, guion, efectos...",
    )

    st.markdown("---")

    # Botón de reset
    if st.button("🔄 Resetear filtros"):
        st.rerun()

# ───────────────────────────────────────────────
# Aplicar filtros
# ───────────────────────────────────────────────

df_filtrado = df.copy()

# Filtrar por sentimiento
if sentimiento_filtro:
    df_filtrado = df_filtrado[df_filtrado["sentimiento_bert"].isin(sentimiento_filtro)]

# Filtrar por aspecto
if aspecto_filtro:
    df_filtrado = df_filtrado[df_filtrado["aspecto"].isin(aspecto_filtro)]

# Filtrar por confianza mínima
if confianza_min > 0:
    df_filtrado = df_filtrado[df_filtrado["confianza"] >= confianza_min]

# Buscar en fragmentos
if busqueda:
    df_filtrado = df_filtrado[
        df_filtrado["fragmento"].str.contains(busqueda, case=False, na=False)
    ]

# ───────────────────────────────────────────────
# Métricas de los filtros
# ───────────────────────────────────────────────

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Resultados filtrados", f"{len(df_filtrado):,}")
with col2:
    st.metric("Aspectos únicos", df_filtrado["aspecto"].nunique())
with col3:
    st.metric(
        "Confianza promedio",
        f"{df_filtrado['confianza'].mean():.3f}" if len(df_filtrado) > 0 else "N/A",
    )

st.markdown("---")

# ───────────────────────────────────────────────
# Tabla interactiva
# ───────────────────────────────────────────────

st.subheader("📋 Datos Filtrados")

# Seleccionar columnas a mostrar
cols_mostrar = [
    "review_id",
    "aspecto",
    "adjetivo",
    "fragmento",
    "sentimiento_bert",
    "confianza",
]

if "sentiment_sentiment" in df_filtrado.columns:
    cols_mostrar.append("sentiment_sentiment")

st.dataframe(
    df_filtrado[cols_mostrar],
    use_container_width=True,
    hide_index=True,
    column_config={
        "review_id": st.column_config.NumberColumn("Review ID", format="%d"),
        "aspecto": st.column_config.TextColumn("Aspecto"),
        "adjetivo": st.column_config.TextColumn("Adjetivo"),
        "fragmento": st.column_config.TextColumn("Fragmento"),
        "sentimiento_bert": st.column_config.TextColumn("Sentimiento BERT"),
        "confianza": st.column_config.NumberColumn("Confianza", format="%.4f"),
        "sentiment_sentiment": st.column_config.TextColumn("Sentimiento Original"),
    },
)

# ───────────────────────────────────────────────
# Exportar a CSV
# ───────────────────────────────────────────────

st.markdown("---")
st.subheader("💾 Exportar Datos Filtrados")

csv = df_filtrado[cols_mostrar].to_csv(index=False).encode("utf-8")

st.download_button(
    label="📥 Descargar CSV",
    data=csv,
    file_name=f"absa_filtrado_{len(df_filtrado)}_filas.csv",
    mime="text/csv",
    use_container_width=True,
)
