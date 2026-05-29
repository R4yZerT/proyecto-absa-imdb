"""
Gestión de la conexión a la base de datos y sesiones de SQLAlchemy.
Soporta motores síncrono (pipeline) y asíncrono (FastAPI).
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from backend.app.config import DATABASE_URL, SYNC_DATABASE_URL

# Motor asíncrono para FastAPI
async_engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# Motor síncrono para el pipeline ETL
sync_engine = create_engine(SYNC_DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

Base = declarative_base()


async def get_async_db():
    """
    Dependency de FastAPI que provee una sesión async de BD.
    Maneja cierre automático incluso si ocurre una excepción.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
