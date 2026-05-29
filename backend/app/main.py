"""
API principal de FastAPI para el dashboard ABSA.
Expone endpoints agregados y filtrados con paginación.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from backend.app.database import async_engine, Base, get_async_db
from backend.app.config import CORS_ORIGINS
from backend.app.schemas import (
    SummaryResponse,
    TopAspectsResponse,
    AspectDistributionResponse,
    ReviewListResponse,
    WordCloudResponse,
    AspectListResponse,
    ReviewAspectsResponse,
    ConfidenceDistributionResponse,
    PolarizedAspectsResponse,
    AnalyzeRequest,
    AnalyzeResponse,
)
from backend.app import crud
from backend.app.analyzer import analyze_text


# ---------------------------------------------------------------------------
# Lifespan: crear tablas al iniciar (si no existen)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await async_engine.dispose()


app = FastAPI(
    title="ABSA Movie Insights API",
    description="API para análisis de sentimientos basado en aspectos de reseñas IMDb en español.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/v1/summary", response_model=SummaryResponse)
async def api_summary(db: AsyncSession = Depends(get_async_db)):
    """
    Retorna métricas globales: total de reseñas, aspectos,
    distribución porcentual de sentimientos y confianza promedio.
    """
    try:
        return await crud.get_summary(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener resumen: {exc}")


@app.get("/api/v1/aspects/top", response_model=TopAspectsResponse)
async def api_top_aspects(
    sentiment: Optional[str] = Query(None, description="Filtrar por sentimiento: positivo, negativo"),
    limit: int = Query(10, ge=1, le=100, description="Número máximo de aspectos a retornar"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Retorna los aspectos más frecuentes, con desglose de sentimientos por aspecto.
    Permite filtrar y ordenar por un sentimiento específico.
    """
    if sentiment and sentiment not in ("positivo", "negativo"):
        raise HTTPException(status_code=422, detail="sentiment debe ser positivo o negativo")
    try:
        return await crud.get_top_aspects(db, sentiment=sentiment, limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener top aspectos: {exc}")


@app.get("/api/v1/aspects/list", response_model=AspectListResponse)
async def api_aspect_list(
    db: AsyncSession = Depends(get_async_db),
):
    """
    Retorna la lista de todos los aspectos únicos disponibles para filtros.
    """
    try:
        return await crud.get_aspect_list(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener lista de aspectos: {exc}")


@app.get("/api/v1/aspects/{aspect}/distribution", response_model=AspectDistributionResponse)
async def api_aspect_distribution(
    aspect: str,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Retorna la distribución de sentimientos (positivo/negativo)
    para un aspecto específico identificado por su lema.
    """
    try:
        return await crud.get_aspect_distribution(db, aspect_lemma=aspect)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener distribución: {exc}")


@app.get("/api/v1/aspects/polarized", response_model=PolarizedAspectsResponse)
async def api_polarized_aspects(
    limit: int = Query(5, ge=1, le=20, description="Número de aspectos polarizados a retornar"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Retorna los aspectos con mayor polarización (mayor diferencia
    positivo vs negativo), útiles para identificar temas controversiales.
    """
    try:
        return await crud.get_polarized_aspects(db, limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener aspectos polarizados: {exc}")


@app.get("/api/v1/words/top", response_model=WordCloudResponse)
async def api_top_words(
    limit: int = Query(50, ge=1, le=200, description="Número máximo de palabras a retornar"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Retorna los adjetivos descriptivos más frecuentes con su sentimiento dominante.
    Utilizado para la visualización de nube de palabras del dashboard.
    """
    try:
        return await crud.get_top_words(db, limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener palabras: {exc}")


@app.get("/api/v1/confidence/distribution", response_model=ConfidenceDistributionResponse)
async def api_confidence_distribution(
    db: AsyncSession = Depends(get_async_db),
):
    """
    Retorna la distribución de confianza del modelo en bins predefinidos.
    """
    try:
        return await crud.get_confidence_distribution(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener distribución de confianza: {exc}")


@app.get("/api/v1/reviews", response_model=ReviewListResponse)
async def api_reviews(
    aspect: Optional[str] = Query(None, description="Filtrar por aspecto (lemma)"),
    sentiment: Optional[str] = Query(None, description="Filtrar por sentimiento"),
    skip: int = Query(0, ge=0, description="Offset para paginación"),
    limit: int = Query(20, ge=1, le=100, description="Límite de resultados por página"),
    min_confidence: Optional[float] = Query(None, ge=0.0, le=1.0, description="Confianza mínima del modelo (0-1)"),
    date_from: Optional[str] = Query(None, description="Fecha mínima (YYYY-MM-DD) — requiere columna review_date"),
    date_to: Optional[str] = Query(None, description="Fecha máxima (YYYY-MM-DD) — requiere columna review_date"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Retorna reseñas paginadas, filtrables por aspecto, sentimiento y confianza mínima.
    """
    if sentiment and sentiment not in ("positivo", "negativo", "error"):
        raise HTTPException(status_code=422, detail="sentiment debe ser positivo o negativo")
    try:
        return await crud.get_reviews(
            db,
            aspect=aspect,
            sentiment=sentiment,
            skip=skip,
            limit=limit,
            min_confidence=min_confidence,
            date_from=date_from,
            date_to=date_to,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener reseñas: {exc}")


@app.get("/api/v1/reviews/{review_id}/aspects", response_model=ReviewAspectsResponse)
async def api_review_aspects(
    review_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Retorna los aspectos extraídos de una reseña específica,
    incluyendo adjetivo, sentimiento y confianza del modelo.
    """
    try:
        return await crud.get_review_aspects(db, review_id=review_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener aspectos de la reseña: {exc}")


@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def api_analyze(payload: AnalyzeRequest):
    """
    Analiza un texto en vivo extrayendo aspectos y clasificando sentimiento.
    No requiere base de datos; usa los modelos SpaCy y BERT cargados en memoria.
    """
    try:
        # El análisis con transformers/spacy es CPU-bound;
        # lo ejecutamos en un thread para no bloquear el event loop.
        import asyncio
        result = await asyncio.to_thread(analyze_text, payload.text)
        return AnalyzeResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al analizar texto: {exc}")
