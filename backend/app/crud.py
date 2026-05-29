"""
Operaciones CRUD y agregaciones optimizadas sobre la base de datos.
Todas las funciones son asíncronas para no bloquear el event loop de FastAPI.
"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload

from backend.app.models import Review, Aspect
from backend.app.schemas import (
    SummaryResponse,
    TopAspectItem,
    TopAspectsResponse,
    AspectDistributionItem,
    AspectDistributionResponse,
    ReviewListResponse,
    ReviewResponse,
    WordCloudItem,
    WordCloudResponse,
    AspectListResponse,
)


# ---------------------------------------------------------------------------
# Summary / KPIs
# ---------------------------------------------------------------------------
async def get_summary(db: AsyncSession) -> SummaryResponse:
    """
    Retorna métricas globales del dataset procesado.
    """
    # Conteos totales
    total_reviews = await db.scalar(select(func.count(Review.id)))
    total_aspects = await db.scalar(select(func.count(Aspect.id)))

    # Distribución de sentimientos
    stmt = (
        select(Aspect.sentiment_label, func.count(Aspect.id))
        .group_by(Aspect.sentiment_label)
    )
    rows = await db.execute(stmt)
    sent_counts = {row[0]: row[1] for row in rows.all()}

    total = sum(sent_counts.values()) or 1
    positive = sent_counts.get("positivo", 0)
    negative = sent_counts.get("negativo", 0)
    neutral = sent_counts.get("neutral", 0)

    # Confianza promedio
    avg_conf = await db.scalar(select(func.avg(Aspect.confidence)))

    return SummaryResponse(
        total_reviews=total_reviews or 0,
        total_aspects=total_aspects or 0,
        positive_pct=round(positive / total * 100, 2),
        negative_pct=round(negative / total * 100, 2),
        neutral_pct=round(neutral / total * 100, 2),
        avg_confidence=round(avg_conf or 0.0, 4),
    )


# ---------------------------------------------------------------------------
# Top Aspectos
# ---------------------------------------------------------------------------
async def get_top_aspects(
    db: AsyncSession,
    sentiment: Optional[str] = None,
    limit: int = 10,
) -> TopAspectsResponse:
    """
    Retorna los aspectos más frecuentes, opcionalmente filtrados por sentimiento.
    Cada item incluye desglose de sentimientos.
    """
    # Subconsulta: conteo por aspecto y sentimiento
    subq = (
        select(
            Aspect.aspect_lemma,
            Aspect.sentiment_label,
            func.count(Aspect.id).label("cnt"),
        )
        .group_by(Aspect.aspect_lemma, Aspect.sentiment_label)
        .subquery()
    )

    # Conteo total por aspecto
    total_sub = (
        select(subq.c.aspect_lemma, func.sum(subq.c.cnt).label("total"))
        .group_by(subq.c.aspect_lemma)
        .order_by(desc("total"))
        .limit(limit)
        .subquery()
    )

    # Unir con desglose por sentimiento
    stmt = (
        select(
            total_sub.c.aspect_lemma,
            total_sub.c.total,
            subq.c.sentiment_label,
            subq.c.cnt,
        )
        .select_from(total_sub)
        .join(
            subq,
            total_sub.c.aspect_lemma == subq.c.aspect_lemma,
        )
        .order_by(desc(total_sub.c.total), subq.c.sentiment_label)
    )

    rows = await db.execute(stmt)
    data = rows.all()

    # Agrupar en diccionario
    grouped = {}
    for aspect, total, sent, cnt in data:
        if aspect not in grouped:
            grouped[aspect] = {
                "aspect_lemma": aspect,
                "count": total,
                "positive_count": 0,
                "negative_count": 0,
                "neutral_count": 0,
            }
        if sent == "positivo":
            grouped[aspect]["positive_count"] = cnt
        elif sent == "negativo":
            grouped[aspect]["negative_count"] = cnt
        elif sent == "neutral":
            grouped[aspect]["neutral_count"] = cnt

    items = list(grouped.values())

    # Si se pidió filtro por sentimiento, reordenar según conteo de ese sentimiento
    if sentiment in ("positivo", "negativo", "neutral"):
        key = f"{sentiment}_count"
        items.sort(key=lambda x: x[key], reverse=True)
        items = items[:limit]
    else:
        # Ya vienen ordenados por total descendente
        items = items[:limit]

    return TopAspectsResponse(items=[TopAspectItem(**item) for item in items])


# ---------------------------------------------------------------------------
# Distribución de sentimiento por aspecto
# ---------------------------------------------------------------------------
async def get_aspect_distribution(
    db: AsyncSession, aspect_lemma: str
) -> AspectDistributionResponse:
    """
    Retorna la distribución de sentimientos para un aspecto específico.
    """
    stmt = (
        select(Aspect.sentiment_label, func.count(Aspect.id))
        .where(Aspect.aspect_lemma == aspect_lemma)
        .group_by(Aspect.sentiment_label)
    )
    rows = await db.execute(stmt)
    counts = {row[0]: row[1] for row in rows.all()}

    total = sum(counts.values()) or 1
    distribution = []
    for label in ("positivo", "negativo", "neutral"):
        cnt = counts.get(label, 0)
        distribution.append(
            AspectDistributionItem(
                sentiment_label=label,
                count=cnt,
                pct=round(cnt / total * 100, 2),
            )
        )

    return AspectDistributionResponse(
        aspect_lemma=aspect_lemma,
        total=total,
        distribution=distribution,
    )


# ---------------------------------------------------------------------------
# Lista de aspectos únicos (para dropdown de filtros)
# ---------------------------------------------------------------------------
async def get_aspect_list(db: AsyncSession) -> AspectListResponse:
    """
    Retorna todos los lemmas de aspecto únicos ordenados alfabéticamente.
    """
    stmt = (
        select(Aspect.aspect_lemma)
        .distinct()
        .order_by(Aspect.aspect_lemma)
    )
    rows = await db.execute(stmt)
    items = [row[0] for row in rows.all()]
    return AspectListResponse(items=items)


# ---------------------------------------------------------------------------
# Reviews filtradas y paginadas
# ---------------------------------------------------------------------------
async def get_reviews(
    db: AsyncSession,
    aspect: Optional[str] = None,
    sentiment: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    min_confidence: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> ReviewListResponse:
    """
    Retorna reseñas filtradas por aspecto y/o sentimiento, con paginación.
    Opcionalmente filtra por confianza mínima del aspecto.
    """
    # Construir filtros dinámicos sobre Aspect
    aspect_filters = []
    if aspect:
        aspect_filters.append(Aspect.aspect_lemma == aspect)
    if sentiment:
        aspect_filters.append(Aspect.sentiment_label == sentiment)
    if min_confidence is not None:
        aspect_filters.append(Aspect.confidence >= min_confidence)

    # Si hay filtros de aspecto, usamos subconsulta sobre la tabla Aspect
    if aspect or sentiment or min_confidence is not None:
        count_stmt = (
            select(func.count(func.distinct(Aspect.review_id)))
            .where(and_(*aspect_filters))
        )
        total = await db.scalar(count_stmt) or 0

        # Obtener review_ids paginados
        id_stmt = (
            select(Aspect.review_id)
            .where(and_(*aspect_filters))
            .distinct()
            .order_by(Aspect.review_id)
            .offset(skip)
            .limit(limit)
        )
        id_rows = await db.execute(id_stmt)
        review_ids = [row[0] for row in id_rows.all()]

        # Cargar reseñas
        stmt = (
            select(Review)
            .where(Review.id.in_(review_ids))
            .order_by(Review.id)
        )
    else:
        count_stmt = select(func.count(Review.id))
        total = await db.scalar(count_stmt) or 0

        stmt = (
            select(Review)
            .order_by(Review.id)
            .offset(skip)
            .limit(limit)
        )

    result = await db.execute(stmt)
    reviews = result.scalars().all()

    return ReviewListResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[ReviewResponse.model_validate(r) for r in reviews],
    )


# ---------------------------------------------------------------------------
# Top palabras descriptivas (adjetivos) para la nube de palabras
# ---------------------------------------------------------------------------
async def get_top_words(
    db: AsyncSession,
    limit: int = 50,
) -> WordCloudResponse:
    """
    Retorna los adjetivos más frecuentes con su sentimiento dominante
    para la visualización de nube de palabras.
    """
    # Obtener frecuencia y sentimiento dominante por adjetivo
    subq = (
        select(
            Aspect.adjetivo.label("word"),
            Aspect.sentiment_label,
            func.count(Aspect.id).label("cnt"),
        )
        .group_by(Aspect.adjetivo, Aspect.sentiment_label)
        .subquery()
    )

    # Encontrar el sentimiento dominante por palabra
    rankq = (
        select(
            subq.c.word,
            subq.c.sentiment_label,
            subq.c.cnt,
            func.row_number()
            .over(
                partition_by=subq.c.word,
                order_by=desc(subq.c.cnt),
            )
            .label("rn"),
        )
        .subquery()
    )

    # Total por palabra (sumando todos los sentimientos)
    totalq = (
        select(
            rankq.c.word,
            func.sum(rankq.c.cnt).label("total"),
        )
        .group_by(rankq.c.word)
        .subquery()
    )

    # Seleccionar sentimiento dominante y total
    stmt = (
        select(
            totalq.c.word,
            totalq.c.total.label("frequency"),
            rankq.c.sentiment_label.label("sentiment"),
        )
        .select_from(totalq)
        .join(rankq, totalq.c.word == rankq.c.word)
        .where(rankq.c.rn == 1)
        .order_by(desc(totalq.c.total))
        .limit(limit)
    )

    rows = await db.execute(stmt)
    items = [
        WordCloudItem(
            word=row.word,
            frequency=row.frequency,
            sentiment=row.sentiment,
        )
        for row in rows.all()
    ]

    return WordCloudResponse(items=items)
