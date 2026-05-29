# ABSA Movie Insights

Sistema de análisis de sentimientos basado en aspectos (ABSA) para reseñas de IMDb en español.
Arquitectura desacoplada: **Pipeline ETL** → **Base de Datos SQLite** → **API FastAPI** → **Dashboard React**.

---

## Arquitectura

```
┌────────────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Dataset CSV   │────▶│  Pipeline ETL   │────▶│  SQLite (BD)     │────▶│  FastAPI     │
│  IMDb Spanish│     │  SpaCy + BERT   │     │  Reviews +       │     │  Async +     │
│                │     │  Inserción      │     │  Aspects         │     │  CORS        │
└────────────────┘     │  Masiva         │     └──────────────────┘     └──────┬───────┘
                       └─────────────────┘                                     │
                                                                                │ HTTP
                                                                                ▼
                                                                       ┌────────────────┐
                                                                       │  React +       │
                                                                       │  Tailwind CSS  │
                                                                       │  Recharts      │
                                                                       └────────────────┘
```

---

## Estructura del Proyecto

```text
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app, endpoints, CORS
│   │   ├── config.py        # Variables de entorno y rutas
│   │   ├── database.py      # Conexión async/sync a SQLite (SQLAlchemy)
│   │   ├── models.py        # ORM: Review, Aspect + índices
│   │   ├── schemas.py       # Pydantic v2
│   │   ├── crud.py          # Consultas optimizadas (agregaciones, filtros)
│   │   └── analyzer.py      # Análisis ABSA en vivo (SpaCy + BERT)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── KPIBar.jsx
│   │   │   ├── AspectBarChart.jsx
│   │   │   ├── SentimentDonut.jsx
│   │   │   ├── ReviewList.jsx
│   │   │   ├── ReviewFilters.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   ├── WordCloud.jsx
│   │   │   ├── TopWordsList.jsx
│   │   │   ├── ConfidenceChart.jsx
│   │   │   ├── PolarizedAspects.jsx
│   │   │   └── LiveAnalysis.jsx
│   │   ├── hooks/
│   │   │   └── useApi.js
│   │   ├── App.jsx          # Dashboard principal (3 vistas)
│   │   ├── main.jsx
│   │   └── index.css        # Tailwind v3 + tema cinematográfico
│   ├── tailwind.config.js
│   ├── vite.config.js       # Proxy /api → localhost:8000
│   └── package.json
│
├── pipeline/
│   ├── __init__.py
│   ├── run_pipeline.py      # ETL completo: CSV → SQLite
│   ├── text_processing.py   # SpaCy: extracción de pares (aspecto, adjetivo)
│   └── sentiment_analysis.py # BERT/RoBERTa: clasificación de sentimiento
│
├── data/
│   ├── raw/
│   │   └── IMDB Dataset SPANISH.csv   # Dataset original (no en git)
│   ├── output/
│   │   └── robertuito-imdb-finetuned/ # Modelo fine-tuneado (pesos no en git)
│   └── models/
│       └── .gitkeep
│
├── notebooks/
│   └── ABSA_Pipeline_Train_Inference.ipynb
│
├── logs/                    # Logs de ejecución (no en git)
├── src/                     # Código legado (reutilizado por pipeline/)
└── dashboard/               # Dashboard legado Streamlit
```

---

## Requisitos Previos

- Python 3.10+
- Node.js 18+
- pnpm
- Modelo SpaCy español: `es_core_news_md`

---

## Instalación

### 1. Entorno Python (Backend + Pipeline)

```bash
python -m venv .venv
source .venv/bin/activate

# Dependencias del pipeline (ya existentes en requirements.txt raíz)
pip install pandas pyarrow spacy transformers torch tqdm datasets accelerate evaluate

# Dependencias del backend
pip install -r backend/requirements.txt

# Descargar modelo SpaCy
python -m spacy download es_core_news_md
```

### 2. Frontend (React + Vite)

```bash
cd frontend
pnpm install
```

---

## Uso

### Paso 1 – Pipeline ETL

Coloca el dataset en `data/raw/IMDB Dataset SPANISH.csv`.

Ejecuta el pipeline (ajusta variables de entorno según necesidad):

```bash
# Desde la raíz del proyecto
PYTHONPATH=$(pwd) python pipeline/run_pipeline.py
```

Variables configurables (ver `backend/app/config.py`):

| Variable | Default | Descripción |
|---|---|---|
| `CSV_PATH` | `data/raw/IMDB Dataset SPANISH.csv` | Ruta al CSV |
| `SAMPLE_SIZE` | 50000 | Número de reseñas a procesar |
| `BATCH_SIZE_SPACY` | 256 | Batch para `nlp.pipe()` |
| `BATCH_SIZE_BERT` | 64 | Batch para inferencia BERT |
| `DEVICE` | 0 | `-1` para CPU, `0` para GPU |
| `MIN_FRECUENCIA` | 1 | Frecuencia mínima de aspectos a conservar |

### Paso 2 – Backend API

```bash
# Desde la raíz
PYTHONPATH=$(pwd) uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Endpoints disponibles:

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/summary` | KPIs globales |
| `GET` | `/api/v1/aspects/top` | Top aspectos (opcional: `?sentiment=negativo&limit=10`) |
| `GET` | `/api/v1/aspects/list` | Lista completa de aspectos para filtros |
| `GET` | `/api/v1/aspects/{aspect}/distribution` | Distribución de sentimiento de un aspecto |
| `GET` | `/api/v1/aspects/polarized` | Aspectos más polarizados (controversiales) |
| `GET` | `/api/v1/words/top` | Adjetivos más frecuentes para nube de palabras |
| `GET` | `/api/v1/confidence/distribution` | Distribución de confianza del modelo en bins |
| `GET` | `/api/v1/reviews` | Reseñas paginadas (`?aspect=X&sentiment=Y&skip=0&limit=20`) |
| `GET` | `/api/v1/reviews/{review_id}/aspects` | Aspectos extraídos de una reseña específica |
| `POST` | `/api/v1/analyze` | Análisis ABSA en vivo de un texto |

### Paso 3 – Frontend Dashboard

```bash
cd frontend
pnpm dev
```

Abre [http://localhost:5173](http://localhost:5173).

El proxy de Vite redirige `/api/*` al backend en `localhost:8000`.

---

## Características del Frontend

- **Tema Cinematográfico "Golden Reel":** Paleta oscura con acentos dorados, tipografía display y transiciones fluidas.
- **Layout SaaS:** Sidebar navegable + header + grid de widgets.
- **3 Vistas:**
  - **Dashboard:** KPIs, gráficos de aspectos, nube de palabras, confianza y polarización.
  - **Reseñas:** Lista paginada con filtros avanzados (sentimiento, aspecto, confianza mínima, rango de fechas).
  - **Analizar en Vivo:** Textarea para analizar texto en tiempo real con extracción de aspectos y sentimiento.
- **KPIBar:** Métricas globales con skeleton loaders.
- **AspectBarChart:** Barras horizontales interactivas; clic en una barra filtra el dashboard por aspecto.
- **WordCloud:** Nube de palabras con adjetivos más frecuentes y su sentimiento dominante.
- **TopWordsList:** Lista de adjetivos descriptivos más comunes.
- **ConfidenceChart:** Distribución de confianza del modelo en bins predefinidos.
- **PolarizedAspects:** Aspectos con mayor polarización (diferencia positivo vs negativo).
- **SentimentDonut:** Distribución de sentimientos (global o por aspecto seleccionado).
- **ReviewList:** Lista paginada de reseñas con manejo de errores y estados vacíos.
- **ReviewFilters:** Filtros avanzados con dropdown de aspectos, rango de fechas y confianza mínima.
- **LiveAnalysis:** Análisis ABSA en vivo con shortcut `Ctrl/Cmd + Enter`.
- **ThemeToggle:** Alternancia Dark/Light con persistencia en `localStorage`.
- **Responsive:** Grid adaptable a móvil, tablet y escritorio.

---

## Buenas Prácticas Aplicadas

| Área | Implementación |
|---|---|
| **Backend async** | FastAPI + SQLAlchemy 2.0 + `aiosqlite` |
| **Índices BD** | `idx_aspect_sentiment`, `idx_aspect_confidence` en `aspects` |
| **Carga masiva** | `pandas.to_sql(..., method='multi', chunksize=2000)` |
| **Manejo de errores** | Try-except por batch en pipeline; HTTPException en API; UI states en React |
| **Logging** | Logging estructurado en pipeline con archivo y stdout |
| **CORS** | Permitido explícitamente para `localhost:5173` y `localhost:3000` vía variable de entorno |
| **Dark Mode** | Tailwind `dark:` + clase `.dark` toggled vía JS |
| **Análisis en vivo** | Ejecutado en thread separado (`asyncio.to_thread`) para no bloquear el event loop |

---

## Seguridad y Git

- **No se versionan archivos sensibles ni generados:** El `.gitignore` excluye bases de datos SQLite (`.db`), logs (`.log`), archivos PID (`.pid`), archivos de sistema (`.DS_Store`), entornos virtuales y pesos de modelos.
- **Variables de entorno:** Las configuraciones sensibles se leen desde variables de entorno con valores por defecto seguros para desarrollo local (ver `backend/app/config.py`).
- **Dataset IMDb Spanish (~130MB)** está en `.gitignore`; descárgalo de [Kaggle](https://www.kaggle.com/datasets/lucamla/imdb-reviews-in-spanish) y colócalo en `data/raw/`.

---

## Notas

- El modelo fine-tuneado `robertuito-imdb-finetuned` es opcional. Si no existe, el pipeline usa el modelo base `pysentimiento/robertuito-sentiment-analysis`.
- Los archivos de configuración del modelo (`config.json`, `tokenizer_config.json`, etc.) sí se versionan para documentar la arquitectura, pero los **pesos** (`.safetensors`, `.bin`, `.pt`) están excluidos por su tamaño.

---

## Licencia y Créditos

- **Dataset:** [IMDb Reviews in Spanish](https://www.kaggle.com/datasets/lucamla/imdb-reviews-in-spanish) por lucamla.
- **Modelo SpaCy:** Explosion AI — [es_core_news_md](https://spacy.io/models/es).
- **Modelo BERT:** [pysentimiento/robertuito-sentiment-analysis](https://huggingface.co/pysentimiento/robertuito-sentiment-analysis).
