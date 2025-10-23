"""
Configuração do banco de dados SQLAlchemy
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database URL - SQLite para desenvolvimento, fácil migrar para PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kids_english.db")

# Configuração do engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},  # Necessário para SQLite
        echo=False  # True para debug SQL
    )
else:
    # Para PostgreSQL ou outros
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

# Session local
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para os modelos
Base = declarative_base()


def get_db():
    """Dependency para injeção de sessão do BD"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Inicializa o banco de dados (cria tabelas)"""
    Base.metadata.create_all(bind=engine)
    print("Database initialized successfully")


def drop_db():
    """Apaga todas as tabelas (cuidado!)"""
    Base.metadata.drop_all(bind=engine)
    print("All tables dropped")
