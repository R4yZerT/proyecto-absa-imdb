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
│   │   └── crud.py          # Consultas optimizadas (agregaciones, filtros)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── KPIBar.jsx
│   │   │   ├── AspectBarChart.jsx
│   │   │   ├── SentimentDonut.jsx
│   │   │   ├── ReviewList.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── hooks/
│   │   │   └── useApi.js
│   │   ├── App.jsx          # Dashboard principal
│   │   ├── main.jsx
│   │   └── index.css        # Tailwind v3 directives
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
│   └── raw/
│       └── IMDB Dataset SPANISH.csv   # Dataset original (no en git)
│
├── notebooks/
│   └── ABSA_Pipeline_Train_Inference.ipynb
│
├── src/                     # Código legado (reutilizado por pipeline/)
├── dashboard/               # Dashboard legado Streamlit
└── logs/                    # Logs de ejecución
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
| `GET` | `/api/v1/aspects/{aspect}/distribution` | Distribución de sentimiento de un aspecto |
| `GET` | `/api/v1/reviews` | Reseñas paginadas (`?aspect=X&sentiment=Y&skip=0&limit=20`) |

### Paso 3 – Frontend Dashboard

```bash
cd frontend
pnpm dev
```

Abre [http://localhost:5173](http://localhost:5173).

El proxy de Vite redirige `/api/*` al backend en `localhost:8000`.

---

## Características del Frontend

- **Layout SaaS:** Sidebar + header + grid de widgets.
- **KPIBar:** Métricas globales con skeleton loaders.
- **AspectBarChart:** Barras horizontales interactivas; clic en una barra filtra el dashboard por aspecto.
- **SentimentDonut:** Distribución de sentimientos (global o por aspecto seleccionado).
- **ReviewList:** Lista paginada de reseñas con manejo de errores y estados vacíos.
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
| **CORS** | Permitido explícitamente para `localhost:5173` |
| **Dark Mode** | Tailwind `dark:` + clase `.dark` toggled vía JS |

---

## Notas

- El modelo fine-tuneado `robertuito-imdb-finetuned` es opcional. Si no existe, el pipeline usa el modelo base `pysentimiento/robertuito-sentiment-analysis`.
- El dataset IMDb Spanish (~130MB) está en `.gitignore`; descárgalo de [Kaggle](https://www.kaggle.com/datasets/lucamla/imdb-reviews-in-spanish) y colócalo en `data/raw/`.

---

## Licencia y Créditos

- **Dataset:** [IMDb Reviews in Spanish](https://www.kaggle.com/datasets/lucamla/imdb-reviews-in-spanish) por lucamla.
- **Modelo SpaCy:** Explosion AI — [es_core_news_md](https://spacy.io/models/es).
- **Modelo BERT:** [pysentimiento/robertuito-sentiment-analysis](https://huggingface.co/pysentimiento/robertuito-sentiment-analysis).
