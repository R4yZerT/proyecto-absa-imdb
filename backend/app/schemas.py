"""
Esquemas Pydantic para validación de datos de entrada y salida de la API.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


# ---------------------------------------------------------------------------
# Esquemas base de Review
# ---------------------------------------------------------------------------
class ReviewBase(BaseModel):
    review_text: str
    original_sentiment: str


class ReviewCreate(ReviewBase):
    pass


class ReviewResponse(ReviewBase):
    id: int
    overall_sentiment: str = ""

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Esquemas base de Aspect
# ---------------------------------------------------------------------------
class AspectBase(BaseModel):
    aspect_lemma: str
    adjetivo: str
    adjetivo_lemma: str
    fragmento: str
    sentiment_label: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class AspectCreate(AspectBase):
    review_id: int


class AspectResponse(AspectBase):
    id: int
    review_id: int

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Esquemas agregados para el Dashboard
# ---------------------------------------------------------------------------
class SummaryResponse(BaseModel):
    total_reviews: int
    total_aspects: int
    positive_pct: float
    negative_pct: float
    avg_confidence: float
class TopAspectItem(BaseModel):
    aspect_lemma: str
    count: int
    positive_count: int
    negative_count: int


class TopAspectsResponse(BaseModel):
    items: List[TopAspectItem]


class AspectDistributionItem(BaseModel):
    sentiment_label: str
    count: int
    pct: float


class AspectDistributionResponse(BaseModel):
    aspect_lemma: str
    total: int
    distribution: List[AspectDistributionItem]


class ReviewListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: List[ReviewResponse]


# ---------------------------------------------------------------------------
# Esquemas para la Nube de Palabras (Word Cloud)
# ---------------------------------------------------------------------------
class WordCloudItem(BaseModel):
    word: str
    frequency: int
    sentiment: str


class WordCloudResponse(BaseModel):
    items: List[WordCloudItem]


# ---------------------------------------------------------------------------
# Esquema para lista de aspectos (dropdown)
# ---------------------------------------------------------------------------
class AspectListResponse(BaseModel):
    items: List[str]


# ---------------------------------------------------------------------------
# Esquemas para aspectos de una reseña individual
# ---------------------------------------------------------------------------
class ReviewAspectItem(BaseModel):
    aspect_lemma: str
    adjetivo: str
    sentiment_label: str
    confidence: float


class ReviewAspectsResponse(BaseModel):
    review_id: int
    items: List[ReviewAspectItem]


# ---------------------------------------------------------------------------
# Esquemas para distribución de confianza
# ---------------------------------------------------------------------------
class ConfidenceBinItem(BaseModel):
    bin_label: str
    count: int


class ConfidenceDistributionResponse(BaseModel):
    items: List[ConfidenceBinItem]


# ---------------------------------------------------------------------------
# Esquemas para aspectos polarizados
# ---------------------------------------------------------------------------
class PolarizedAspectItem(BaseModel):
    aspect_lemma: str
    positive_count: int
    negative_count: int
    polarization_score: float


class PolarizedAspectsResponse(BaseModel):
    items: List[PolarizedAspectItem]


# ---------------------------------------------------------------------------
# Esquemas para análisis en vivo
# ---------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Texto a analizar")


class AnalyzedAspectItem(BaseModel):
    aspect_lemma: str
    adjetivo: str
    adjetivo_lemma: str
    fragmento: str
    sentiment_label: str
    confidence: float


class AnalyzeResponse(BaseModel):
    text: str
    overall_sentiment: str
    aspects: List[AnalyzedAspectItem]
