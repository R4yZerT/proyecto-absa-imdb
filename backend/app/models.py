"""
Modelos ORM de SQLAlchemy para la base de datos relacional.
Tablas: reviews, aspects.
Índices optimizados en aspectos y sentimientos para agregaciones rápidas.
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Review(Base):
    """
    Representa una reseña de película del dataset original.
    """
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    review_text = Column(Text, nullable=False)
    original_sentiment = Column(String(20), nullable=False, index=True)

    # Relación uno-a-muchos con aspectos
    aspects = relationship("Aspect", back_populates="review", cascade="all, delete-orphan")


class Aspect(Base):
    """
    Representa un par aspecto-adjetivo extraído de una reseña,
    junto con el análisis de sentimiento del modelo BERT.
    """
    __tablename__ = "aspects"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=False, index=True)
    aspect_lemma = Column(String(100), nullable=False, index=True)
    adjetivo = Column(String(100), nullable=False)
    adjetivo_lemma = Column(String(100), nullable=False)
    fragmento = Column(Text, nullable=False)
    sentiment_label = Column(String(20), nullable=False, index=True)
    confidence = Column(Float, nullable=False)

    # Relación inversa
    review = relationship("Review", back_populates="aspects")

    # Índices compuestos para consultas agregadas frecuentes
    __table_args__ = (
        Index("idx_aspect_sentiment", "aspect_lemma", "sentiment_label"),
        Index("idx_aspect_confidence", "aspect_lemma", "confidence"),
    )
