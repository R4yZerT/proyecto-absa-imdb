# ABSA Pipeline: Aspect-Based Sentiment Analysis para IMDb en Español

Pipeline de NLP híbrido que combina **SpaCy** (extracción gramatical de aspectos) con **BERT** (análisis de sentimiento) para procesar 50,000 reseñas de IMDb en español. El output es un archivo estructurado en Parquet, listo para ser consumido por un dashboard de Streamlit.

---

## Arquitectura del Pipeline

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Dataset CSV    │────▶│  SpaCy (es_core_    │────▶│  BERT/RoBERTa   │
│  50k reseñas    │     │  news_md)            │     │  (pysentimiento)│
│  en español     │     │  Extracción: NOUN + │     │  Clasificación  │
│                 │     │  amod (ADJ)          │     │  POS/NEG/NEU    │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
         │                         │                         │
         ▼                         ▼                         ▼
   Ingesta con               Aspectos               Sentimiento por
   tipos optimizados         lematizados            fragmento + confianza
   y muestreo                                              │
                                                            ▼
                                                 ┌────────────────────┐
                                                 │  Parquet Final     │
                                                 │  Listo para        │
                                                 │  Streamlit         │
                                                 └────────────────────┘
```

---

## Estructura del Proyecto

```text
proyecto-absa-imdb/
│
├── data/
│   ├── raw/                          # Dataset original
│   │   └── IMDB Dataset SPANISH.csv  # 50,000 reseñas (inglés/español)
│   ├── processed/                    # Output del pipeline
│   │   ├── aspectos_sentimientos_final.parquet
│   │   ├── metricas_por_aspecto.parquet
│   │   ├── checkpoint_aspectos_spacy.parquet
│   │   └── checkpoint_aspectos_sentimientos.parquet
│   └── models/                       # Modelos fine-tuneados (~500MB, no en git)
│       └── robertuito-imdb-finetuned/
│           ├── config.json
│           ├── model.safetensors
│           ├── tokenizer.json
│           └── label_config.json
│
├── notebooks/
│   └── ABSA_Pipeline_Train_Inference.ipynb   # Notebook principal (Google Colab)
│
├── src/                              # Módulos Python reutilizables
│   ├── __init__.py
│   ├── text_processing.py            # Funciones de SpaCy (extracción de aspectos)
│   └── sentiment_analysis.py         # Funciones de inferencia con BERT
│
├── logs/                             # Logs de ejecución del pipeline
├── requirements.txt                  # Dependencias del proyecto
└── README.md                         # Este archivo
```

---

## Dataset Utilizado

El proyecto consume el dataset público de Kaggle: **"IMDb Reviews in Spanish"**.

| Atributo              | Detalle                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| **Archivo**           | `data/raw/IMDB Dataset SPANISH.csv`                                     |
| **Tamaño**            | ~130.9 MB (137,279,948 bytes)                                           |
| **Filas**             | 50,000 reseñas                                                          |
| **Columnas**          | `review_en`, `review_es`, `sentiment`, `sentimiento`                    |
| **Idioma origen**     | Inglés (`review_en`)                                                    |
| **Idioma procesado**  | Español (`review_es`) — traducciones automáticas                        |
| **Etiquetas**         | `positive` / `negative` (inglés) → `positivo` / `negativo` (español)    |
| **Balance**           | Aproximadamente 50% positivo / 50% negativo                           |
| **Fuente**            | [Kaggle: lucamla/imdb-reviews-in-spanish](https://www.kaggle.com/datasets/lucamla/imdb-reviews-in-spanish) |

> **Nota:** El archivo ya se encuentra descargado en `data/raw/`. En Google Colab, el notebook configura automáticamente la API de Kaggle para descargarlo si no está presente.

---

## Dependencias

```bash
# Instalar dependencias (recomendado: en un entorno virtual)
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

pip install -r requirements.txt

# Descargar modelo de SpaCy
python -m spacy download es_core_news_md
```

### Librerías principales

| Librería      | Versión mínima | Propósito                                    |
|---------------|----------------|----------------------------------------------|
| `pandas`      | 1.5+           | Manipulación de datos y exportación Parquet  |
| `pyarrow`     | 10.0+          | Backend para archivos Parquet eficientes     |
| `spacy`       | 3.6+           | Pipeline lingüístico y extracción de aspectos|
| `transformers`| 4.30+          | Pipeline de Hugging Face para BERT          |
| `torch`       | 2.0+           | Backend de PyTorch con soporte CUDA          |
| `datasets`    | 2.14+          | Manejo eficiente de datasets para fine-tuning|
| `accelerate`  | 0.21+          | Optimización de entrenamiento en GPU         |
| `evaluate`    | 0.4+           | Métricas de evaluación (accuracy, f1)        |
| `tqdm`        | 4.65+          | Barras de progreso en bucles pesados         |
| `kaggle`      | 1.5+           | CLI para descargar datasets de Kaggle        |

---

## Uso en Google Colab

1. Abrir `notebooks/ABSA_Pipeline_Train_Inference.ipynb` en [Google Colab](https://colab.research.google.com/)
2. Cambiar runtime a **GPU** (`Entorno de ejecución` → `Cambiar tipo de entorno de ejecución` → `GPU T4/A100`)
3. Ejecutar las celdas en orden:
   - **Celda 1:** Instalación de librerías e importaciones (incluye `src/` en `sys.path`)
   - **Celda 2:** Montar Google Drive, descargar dataset y configurar logging
   - **Celda 3:** Extracción de aspectos con SpaCy usando `nlp.pipe(batch_size=256)`
   - **Celda 4a:** Fine-tuning del modelo BERT con IMDb Spanish (~30-60 min)
   - **Celda 4b:** Inferencia de sentimiento con modelo fine-tuneado en GPU
   - **Celda 5:** Consolidación final, métricas agregadas y exportación a Parquet

### Parámetros configurables

En el notebook puedes ajustar:

```python
SAMPLE_SIZE = 5000          # 1000 para pruebas, 50000 para producción
BATCH_SIZE_SPACY = 256      # Tamaño de lote para nlp.pipe()
BATCH_SIZE_BERT = 64        # 64 para T4, 128 para A100
MAX_LENGTH = 128            # Truncamiento de tokens BERT
MIN_FRECUENCIA = 5          # Filtrar aspectos con menos de 5 apariciones

# Fine-tuning
FINETUNING_EPOCHS = 3       # Número de épocas de entrenamiento
FINETUNING_BATCH_SIZE = 16  # Batch size para entrenamiento (menor por VRAM)
FINETUNING_LEARNING_RATE = 2e-5
```

---

## Pipeline Técnico

### 1. Extracción de Aspectos (SpaCy)

- **Modelo:** `es_core_news_md` (balance velocidad/precisión)
- **Optimizaciones:**
  - `disable=["ner", "textcat", "entity_linker"]` para ahorrar CPU/RAM
  - Procesamiento vectorizado con `nlp.pipe(batch_size=256)`
  - Lematización de sustantivos para estandarizar aspectos (ej: "actuaciones" → "actuación")
- **Regla de extracción:**
  - Identificar tokens `NOUN` / `PROPN` como aspectos
  - Buscar hijos con dependencia `amod` (adjetivo modificador) que sean `ADJ`
  - Extraer fragmento original para contexto del BERT

### 2. Fine-tuning del Modelo BERT

El pipeline incluye una etapa de **fine-tuning** para adaptar el modelo base al dominio específico de reseñas cinematográficas.

- **Modelo base:** `pysentimiento/robertuito-sentiment-analysis` (RoBERTa en español)
- **Datos de entrenamiento:** 50k reseñas IMDb en español con labels `positive`/`negative`
- **Framework:** `transformers.Trainer` con `accelerate` para GPU
- **Configuración:**
  - 2-3 épocas (~30-60 min en T4)
  - Batch size: 16 (por VRAM limitada)
  - Learning rate: 2e-5
  - Mixed precision (fp16) en GPU
- **Output:** Modelo fine-tuneado guardado en `data/models/robertuito-imdb-finetuned/`
- **Métricas:** Accuracy y F1 score evaluados en cada época

**¿Por qué fine-tuning?**
- robertuito se entrenó en TASS 2020 (tweets y redes sociales)
- IMDb tiene jerga cinematográfica distinta: "actuación", "guion", "banda sonora"
- Fine-tuning adapta el modelo al vocabulario y estilo de las reseñas

### 3. Análisis de Sentimiento (BERT Fine-tuneado)

- **Modelo:** `robertuito-imdb-finetuned` (fine-tuneado en Celda 4a)
- **Optimizaciones:**
  - `device=0` para forzar GPU (CUDA)
  - Procesamiento por lotes (`batch_size=64` o `128`) para saturar la GPU
  - `truncation=True, max_length=128` para evitar exceder límite de tokens
  - `torch.cuda.empty_cache()` cada 10 batches para evitar OOM
- **Labels:** `LABEL_1` → positive | `LABEL_0` → negative
- **Fallback:** Si el modelo fine-tuneado no existe, usa el modelo base

### 3. Output Final

El archivo `aspectos_sentimientos_final.parquet` contiene:

| Columna             | Tipo      | Descripción                                      |
|---------------------|-----------|--------------------------------------------------|
| `review_id`         | int       | ID original de la reseña                         |
| `aspecto`           | category  | Sustantivo lematizado (aspecto extraído)         |
| `adjetivo`          | string    | Adjetivo tal cual aparece en el texto            |
| `adjetivo_lematizado`| string   | Lemma del adjetivo                               |
| `fragmento`         | string    | Contexto del par aspecto-adjetivo                |
| `sentimiento_bert`  | category  | Etiqueta predicha (positivo/negativo/neutral)    |
| `confianza`         | float32   | Score de confianza del modelo BERT (0.0 - 1.0) |
| `label_original`    | string    | Label raw del modelo (POS/NEG/NEU)               |

Adicionalmente, `metricas_por_aspecto.parquet` agrega:
- `total_apariciones`
- `confianza_promedio`
- `sentimiento_dominante`
- `pct_positivo`, `pct_negativo`, `pct_neutral`

---

## Buenas Prácticas Aplicadas

| Práctica               | Implementación                                                        |
|------------------------|-----------------------------------------------------------------------|
| **Garbage Collection** | `gc.collect()` y `torch.cuda.empty_cache()` entre etapas críticas     |
| **Manejo de errores**  | Try-except por reseña/batch; logging sin detener el pipeline          |
| **Persistencia**       | Checkpoints incrementales en Parquet (SpaCy → BERT → final)          |
| **Tipos eficientes**   | `category`, `float32`, `int32` en Pandas para reducir memoria         |
| **Muestreo**           | `SAMPLE_SIZE` configurable para iteración rápida en desarrollo        |
| **DRY**                | Funciones reutilizables en `src/` importadas por el notebook          |
| **Memoria**            | No se almacena `texto_completo` por aspecto (solo fragmento)           |

---

## Licencia y Créditos

- **Dataset:** [IMDb Reviews in Spanish](https://www.kaggle.com/datasets/lucamla/imdb-reviews-in-spanish) por lucamla en Kaggle.
- **Modelo SpaCy:** Explosion AI — [es_core_news_md](https://spacy.io/models/es)
- **Modelo BERT:** [pysentimiento/robertuito-sentiment-analysis](https://huggingface.co/pysentimiento/robertuito-sentiment-analysis) por pysentimiento en Hugging Face.

---

## Dashboard de Streamlit

El proyecto incluye un dashboard interactivo multi-página para explorar los resultados del pipeline y realizar inferencia en tiempo real.

### Estructura del Dashboard

```text
dashboard/
├── app.py                    # Entry point principal
├── pages/
│   ├── 1_📊_Overview.py      # Métricas clave y distribución de sentimientos
│   ├── 2_🎭_Aspectos.py      # Top aspectos, sentimiento por aspecto, nube de adjetivos
│   ├── 3_🧠_Inferencia.py    # Input de texto + predicción en tiempo real
│   └── 4_🔍_Explorador.py    # Tabla interactiva con filtros avanzados
└── utils/
    ├── data_loader.py        # Cargar y cachear parquets
    ├── visualizations.py     # Funciones de Plotly y WordCloud
    └── model_loader.py       # Cargar modelo fine-tuneado (lazy loading)
```

### Ejecución

```bash
# Instalar dependencias del dashboard
pip install -r requirements.txt

# Ejecutar desde la raíz del proyecto
streamlit run dashboard/app.py

# O desde la carpeta dashboard
cd dashboard && streamlit run app.py
```

### Páginas del Dashboard

| Página | Descripción | Contenido |
|--------|-------------|-----------|
| **📊 Overview** | Métricas generales | Cards con KPIs, distribución de sentimientos, comparación BERT vs original, histograma de confianza |
| **🎭 Aspectos** | Análisis de aspectos | Top 20 aspectos, sentimiento por aspecto (stacked bar), nube de palabras, detalle por aspecto |
| **🧠 Inferencia** | Predicción en tiempo real | Input de texto, extracción de aspectos con SpaCy, predicción con modelo fine-tuneado, visualización de resultados |
| **🔍 Explorador** | Explorador de datos | Tabla interactiva con filtros (sentimiento, aspecto, confianza, búsqueda de texto), exportar a CSV |

### Performance

- **Parquets**: Cargados con `@st.cache_data` (solo se leen una vez)
- **Modelo fine-tuneado**: Cargado con `@st.cache_resource` solo en página de inferencia (lazy loading, ~435MB)
- **SpaCy**: Cargado con `@st.cache_resource` solo cuando se necesita

---

## Próximos Pasos

1. Ejecutar el notebook completo con `SAMPLE_SIZE = 50000` para procesar todo el dataset.
2. Ejecutar el dashboard de Streamlit para explorar los resultados.
3. Extender el dashboard con nuevas visualizaciones según necesidad.
