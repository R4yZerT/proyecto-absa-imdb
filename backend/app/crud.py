"""
Operaciones CRUD y agregaciones optimizadas sobre la base de datos.
Todas las funciones son asíncronas para no bloquear el event loop de FastAPI.
"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case, Float, literal
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
    ReviewAspectItem,
    ReviewAspectsResponse,
    ConfidenceBinItem,
    ConfidenceDistributionResponse,
    PolarizedAspectItem,
    PolarizedAspectsResponse,
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

    # Confianza promedio
    avg_conf = await db.scalar(select(func.avg(Aspect.confidence)))

    return SummaryResponse(
        total_reviews=total_reviews or 0,
        total_aspects=total_aspects or 0,
        positive_pct=round(positive / total * 100, 2),
        negative_pct=round(negative / total * 100, 2),
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
            }
        if sent == "positivo":
            grouped[aspect]["positive_count"] = cnt
        elif sent == "negativo":
            grouped[aspect]["negative_count"] = cnt

    items = list(grouped.values())

    # Si se pidió filtro por sentimiento, reordenar según conteo de ese sentimiento
    if sentiment in ("positivo", "negativo"):
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
    for label in ("positivo", "negativo"):
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
    Retorna reseñas filtradas con sentimiento general calculado
    por mayoría de votos de aspectos (overall_sentiment).
    """
    # Filtros a nivel de aspecto
    aspect_filters = []
    if aspect:
        aspect_filters.append(Aspect.aspect_lemma == aspect)
    if min_confidence is not None:
        aspect_filters.append(Aspect.confidence >= min_confidence)

    # Subconsulta: overall_sentiment por reseña (mayoría de aspectos)
    pos_count = func.sum(case((Aspect.sentiment_label == 'positivo', 1), else_=0))
    neg_count = func.sum(case((Aspect.sentiment_label == 'negativo', 1), else_=0))

    overall_expr = case(
        (pos_count > neg_count, literal('positivo')),
        (neg_count > pos_count, literal('negativo')),
        else_=literal('positivo'),
    ).label('overall_sentiment')

    subq = select(
        Aspect.review_id,
        overall_expr,
    ).group_by(Aspect.review_id)

    if aspect_filters:
        subq = subq.where(and_(*aspect_filters))

    # Aplicar filtro de sentimiento general
    subq = subq.subquery()
    query_filters = []
    if sentiment:
        query_filters.append(subq.c.overall_sentiment == sentiment)

    # Total de reseñas que coinciden
    count_stmt = select(func.count()).select_from(subq).where(and_(*query_filters))
    total = (await db.execute(count_stmt)).scalar() or 0

    # Obtener review_ids paginados con su overall_sentiment
    id_stmt = (
        select(subq.c.review_id, subq.c.overall_sentiment)
        .where(and_(*query_filters))
        .order_by(subq.c.review_id)
        .offset(skip)
        .limit(limit)
    )
    rows = (await db.execute(id_stmt)).all()
    review_ids = [r.review_id for r in rows]
    overall_map = {r.review_id: r.overall_sentiment for r in rows}

    # Cargar reseñas
    if review_ids:
        stmt = (
            select(Review)
            .where(Review.id.in_(review_ids))
            .order_by(Review.id)
        )
        result = await db.execute(stmt)
        reviews = result.scalars().all()
    else:
        reviews = []

    # Armar respuesta con overall_sentiment
    items = []
    for r in reviews:
        resp = ReviewResponse.model_validate(r)
        resp.overall_sentiment = overall_map.get(r.id, '')
        items.append(resp)

    return ReviewListResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=items,
    )


# ---------------------------------------------------------------------------
# Aspectos de una reseña individual
# ---------------------------------------------------------------------------
async def get_review_aspects(
    db: AsyncSession, review_id: int
) -> ReviewAspectsResponse:
    """
    Retorna los aspectos extraídos de una reseña específica.
    """
    stmt = (
        select(Aspect)
        .where(Aspect.review_id == review_id)
        .order_by(Aspect.confidence.desc())
    )
    result = await db.execute(stmt)
    aspects = result.scalars().all()

    items = [
        ReviewAspectItem(
            aspect_lemma=a.aspect_lemma,
            adjetivo=a.adjetivo,
            sentiment_label=a.sentiment_label,
            confidence=round(a.confidence, 4),
        )
        for a in aspects
    ]

    return ReviewAspectsResponse(review_id=review_id, items=items)


# ---------------------------------------------------------------------------
# Distribución de confianza (histograma)
# ---------------------------------------------------------------------------
async def get_confidence_distribution(db: AsyncSession) -> ConfidenceDistributionResponse:
    """
    Retorna la distribución de confianza del modelo en bins predefinidos.
    """
    bins = [
        (0.50, 0.60, "50-60%"),
        (0.60, 0.70, "60-70%"),
        (0.70, 0.80, "70-80%"),
        (0.80, 0.90, "80-90%"),
        (0.90, 1.00, "90-100%"),
    ]

    items = []
    for low, high, label in bins:
        count_stmt = (
            select(func.count(Aspect.id))
            .where(Aspect.confidence >= low, Aspect.confidence < high)
        )
        cnt = await db.scalar(count_stmt) or 0
        items.append(ConfidenceBinItem(bin_label=label, count=cnt))

    return ConfidenceDistributionResponse(items=items)


# ---------------------------------------------------------------------------
# Aspectos más polarizados
# ---------------------------------------------------------------------------
async def get_polarized_aspects(
    db: AsyncSession, limit: int = 5
) -> PolarizedAspectsResponse:
    """
    Retorna los aspectos con mayor polarización (mayor diferencia
    entre sentimientos positivos y negativos), ordenados por score.
    """
    subq = (
        select(
            Aspect.aspect_lemma,
            Aspect.sentiment_label,
            func.count(Aspect.id).label("cnt"),
        )
        .group_by(Aspect.aspect_lemma, Aspect.sentiment_label)
        .subquery()
    )

    # Totales por aspecto
    total_sub = (
        select(
            subq.c.aspect_lemma,
            func.sum(subq.c.cnt).label("total"),
        )
        .group_by(subq.c.aspect_lemma)
        .having(func.sum(subq.c.cnt) >= 10)  # requiere al menos 10 menciones
        .subquery()
    )

    # Conteos por sentimiento
    pos_sub = (
        select(subq.c.aspect_lemma, subq.c.cnt.label("pos"))
        .where(subq.c.sentiment_label == "positivo")
        .subquery()
    )
    neg_sub = (
        select(subq.c.aspect_lemma, subq.c.cnt.label("neg"))
        .where(subq.c.sentiment_label == "negativo")
        .subquery()
    )

    stmt = (
        select(
            total_sub.c.aspect_lemma,
            func.coalesce(pos_sub.c.pos, 0).label("positive_count"),
            func.coalesce(neg_sub.c.neg, 0).label("negative_count"),
            (
                func.abs(func.coalesce(pos_sub.c.pos, 0) - func.coalesce(neg_sub.c.neg, 0))
                / func.cast(total_sub.c.total, Float)
            ).label("polarization_score"),
        )
        .select_from(total_sub)
        .join(pos_sub, total_sub.c.aspect_lemma == pos_sub.c.aspect_lemma, isouter=True)
        .join(neg_sub, total_sub.c.aspect_lemma == neg_sub.c.aspect_lemma, isouter=True)
        .order_by(desc("polarization_score"))
        .limit(limit)
    )

    rows = await db.execute(stmt)
    items = [
        PolarizedAspectItem(
            aspect_lemma=row.aspect_lemma,
            positive_count=row.positive_count,
            negative_count=row.negative_count,
            polarization_score=round(row.polarization_score, 4),
        )
        for row in rows.all()
    ]

    return PolarizedAspectsResponse(items=items)


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
