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
│   ├── Dockerfile           # Imagen optimizada para aarch64 (multi-capa)
│   ├── entrypoint.sh        # Script de inicio en contenedor (maneja BD montada)
│   ├── requirements.txt
│   └── absa_movies.db       # Base de datos SQLite (no en git)
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
│   │   └── index.css        # Tailwind v4 + tema cinematográfico
│   ├── Dockerfile             # Imagen de producción (multi-stage: build + nginx)
│   ├── Dockerfile.dev         # Imagen de desarrollo (hot-reload con Vite)
│   ├── nginx.conf             # Configuración Nginx con proxy /api
│   ├── tailwind.config.js
│   ├── vite.config.js         # Proxy /api configurable via VITE_API_TARGET
│   ├── postcss.config.js
│   ├── eslint.config.js
│   └── package.json
│
├── pipeline/
│   ├── __init__.py
│   ├── run_pipeline.py      # ETL completo: CSV → SQLite
│   ├── text_processing.py   # SpaCy: extracción de pares (aspecto, adjetivo)
│   └── sentiment_analysis.py # BERT/RoBERTa: clasificación de sentimiento
│
├── jenkins/
│   ├── Dockerfile             # Imagen Jenkins con plugins + Docker CLI
│   ├── jenkins.yaml           # Configuración JCasC (usuarios, credenciales, Git)
│   └── plugins.txt            # Plugins Jenkins pre-instalados
│
├── data/
│   ├── raw/
│   │   └── IMDB Dataset SPANISH.csv   # Dataset original (no en git)
│   ├── output/
│   │   └── beto-imdb-finetuned/       # Modelo fine-tuneado (pesos no en git)
│   └── models/
│       └── .gitkeep
│
├── notebooks/
│   └── ABSA_Pipeline_Train_Inference.ipynb
│
├── docker-compose.yml         # Orquestación backend + frontend (desarrollo)
├── docker-compose.jenkins.yml # Orquestación Jenkins local
├── Jenkinsfile                # Pipeline CI/CD declarativo
├── start.sh                   # Script unificado: levanta backend + frontend en paralelo
├── logs/                      # Logs de ejecución (no en git)
├── src/                       # Código legado (reutilizado por pipeline/)
└── dashboard/                 # Dashboard legado Streamlit
```

---

## Requisitos Previos

- Python 3.10+
- Node.js 18+
- pnpm
- Modelo SpaCy español: `es_core_news_md`
- Docker & Docker Compose (opcional, para despliegue en contenedores)

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

### Opción A — Script Unificado `start.sh` (Recomendado para desarrollo local)

```bash
# Modo desarrollo (hot-reload en backend y frontend)
./start.sh

# Modo producción local (build estático + serve)
./start.sh --prod
```

El script detecta automáticamente `pnpm` y `uvicorn`, levanta ambos servicios en paralelo y gestiona la señal `Ctrl+C` para detenerlos limpiamente.

### Opción B — Docker Compose (Recomendado para aislamiento de entornos)

```bash
# Levantar backend + frontend en desarrollo
docker compose up --build

# Solo backend
docker compose up backend --build

# Variables de entorno soportadas:
#   BACKEND_PORT=8000   (mapea el puerto del host)
#   FRONTEND_PORT=5173  (mapea el puerto del host)
```

El `docker-compose.yml` orquesta:
- **Backend:** FastAPI con hot-reload (volumen `./backend/app`), BD SQLite persistente y caché de HuggingFace.
- **Frontend:** Vite con hot-reload (volumen `./frontend/src`), proxy a `http://backend:8000`.

### Opción C — Manual (Backend y Frontend por separado)

#### Paso 1 – Pipeline ETL

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

#### Paso 2 – Backend API

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

#### Paso 3 – Frontend Dashboard

```bash
cd frontend
pnpm dev
```

Abre [http://localhost:5173](http://localhost:5173).

El proxy de Vite redirige `/api/*` al backend en `localhost:8000` (configurable vía `VITE_API_TARGET`).

---

## Docker en Producción

Para desplegar el frontend como imagen de producción (nginx estático):

```bash
# Build multi-stage del frontend
docker build -f frontend/Dockerfile -t absa-frontend .

# Ejecutar
docker run -p 80:80 absa-frontend
```

La imagen de producción incluye:
- **Stage 1:** Build con Node.js 22 + pnpm.
- **Stage 2:** Servidor Nginx Alpine con `nginx.conf` que sirve `/` desde `dist/` y redirige `/api` al backend.

La imagen del backend (`backend/Dockerfile`) usa una estrategia de capas separadas para reducir el pico de memoria en ARM64 (aarch64):
1. torch CPU-only
2. Dependencias livianas de FastAPI
3. Dependencias pesadas del pipeline (SpaCy, Transformers)
4. Código fuente (al final para cache-friendly)

---

## CI/CD con Jenkins

El proyecto incluye una configuración completa de Jenkins para integración y despliegue continuo.

### Levantar Jenkins localmente

```bash
docker compose -f docker-compose.jenkins.yml build
docker compose -f docker-compose.jenkins.yml up -d
```

Accede a [http://localhost:8080](http://localhost:8080) con las credenciales configuradas (`admin/admin` por defecto, cambiar en producción).

### Características del Jenkins configurado

- **Imagen personalizada** (`jenkins/Dockerfile`): Jenkins LTS con Docker CLI, plugins pre-instalados y JCasC.
- **JCasC** (`jenkins/jenkins.yaml`): Configuración declarativa de seguridad, usuarios, credenciales (GitHub, Docker Hub) y SCM.
- **Docker-in-Docker**: Jenkins puede ejecutar `docker build` y `docker compose` gracias al montaje de `/var/run/docker.sock`.

### Pipeline (`Jenkinsfile`)

El pipeline declarativo ejecuta los siguientes stages:

1. **Checkout** — Obtiene el código fuente.
2. **Lint & Validar** — Ejecuta linters de Python (`flake8`, `black`) y JavaScript (`ESLint`) en paralelo (comentados por defecto; descomentar al activar los linters).
3. **Build Docker Images** — Construye las imágenes del backend y frontend con `--no-cache`.
4. **Desplegar Stack** — Limpia el stack anterior y levanta los servicios con `docker compose up -d`.
5. **Smoke Tests** — Espera el healthcheck del backend y verifica que el frontend responde.

### Variables de entorno para Jenkins

| Variable | Descripción |
|---|---|
| `GITHUB_USER` | Usuario de GitHub para credenciales |
| `GITHUB_TOKEN` | Token de acceso personal de GitHub |
| `DOCKER_HUB_TOKEN` | Token de Docker Hub para push de imágenes |
| `JENKINS_ADMIN_USER` | Usuario admin de Jenkins (default: `admin`) |
| `JENKINS_ADMIN_PASSWORD` | Contraseña admin de Jenkins (default: `admin`) |

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
| **Docker multi-stage** | Imagen de producción del frontend: build + nginx; backend con capas separadas para reducir RAM en ARM64 |
| **Healthchecks** | Backend expone healthcheck en `/api/v1/summary`; Jenkins espera healthcheck antes de smoke tests |
| **Proxy configurable** | Vite proxy usa `VITE_API_TARGET` para adaptarse a entornos Docker y local |
| **Script unificado** | `start.sh` gestiona paralelismo, traps de señales y modos dev/prod |
| **JCasC** | Configuración de Jenkins como código: usuarios, credenciales y seguridad versionados |

---

## Seguridad y Git

- **No se versionan archivos sensibles ni generados:** El `.gitignore` excluye bases de datos SQLite (`.db`), logs (`.log`), archivos PID (`.pid`), archivos de sistema (`.DS_Store`), entornos virtuales y pesos de modelos.
- **Variables de entorno:** Las configuraciones sensibles se leen desde variables de entorno con valores por defecto seguros para desarrollo local (ver `backend/app/config.py` y `docker-compose.jenkins.yml`).
- **Dataset IMDb Spanish (~130MB)** está en `.gitignore`; descárgalo de [Kaggle](https://www.kaggle.com/datasets/lucamla/imdb-reviews-in-spanish) y colócalo en `data/raw/`.
- **Credenciales Jenkins:** El archivo `jenkins/jenkins.yaml` usa interpolación de variables de entorno (`${JENKINS_ADMIN_PASSWORD}`); nunca hardcodea secretos. En producción, inyecta las credenciales via `.env` o secretos de Docker.
- **Docker context limpio:** `.dockerignore` excluye datos pesados, entornos virtuales, logs, archivos de sistema y el propio `README.md` para minimizar el contexto de build.

---

## Notas

- El modelo fine-tuneado `beto-imdb-finetuned` es opcional. Si no existe, el pipeline usa el modelo base `edumunozsala/beto_sentiment_analysis_es`.
- Los archivos de configuración del modelo (`config.json`, `tokenizer_config.json`, etc.) sí se versionan para documentar la arquitectura, pero los **pesos** (`.safetensors`, `.bin`, `.pt`) están excluidos por su tamaño.
- El backend en Docker monta la BD SQLite como volumen para evitar file-lock issues en macOS y preservar los datos entre reinicios.

---

## Licencia y Créditos

- **Dataset:** [IMDb Reviews in Spanish](https://www.kaggle.com/datasets/lucamla/imdb-reviews-in-spanish) por lucamla.
- **Modelo SpaCy:** Explosion AI — [es_core_news_md](https://spacy.io/models/es).
- **Modelo BERT:** [edumunozsala/beto_sentiment_analysis_es](https://huggingface.co/edumunozsala/beto_sentiment_analysis_es).
