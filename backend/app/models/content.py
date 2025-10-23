"""
Modelos para conteúdo gerado (cache, frases, áudio)
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.core.database import Base


class AIContentCache(Base):
    """Cache de conteúdo gerado pela IA (economiza chamadas de API)"""
    __tablename__ = "ai_content_cache"

    id = Column(Integer, primary_key=True, index=True)
    object_id = Column(Integer, ForeignKey("game_objects.id"), nullable=False)

    # Tipo de conteúdo
    content_type = Column(String(50), nullable=False, index=True)  # intro, phrases, fun_facts, quiz
    content_key = Column(String(255), index=True)  # Chave para lookup rápido

    # Conteúdo gerado
    content_data = Column(JSON, nullable=False)  # Conteúdo em JSON

    # Metadata
    prompt_used = Column(Text)  # Prompt que gerou este conteúdo (para debug)
    model_version = Column(String(50))  # ex: "gemini-2.0-flash"
    temperature = Column(String(10))  # Temperatura usada
    generation_time_ms = Column(Integer)  # Tempo de geração em ms

    # Cache control
    hits = Column(Integer, default=0)  # Quantas vezes foi usado
    is_valid = Column(Boolean, default=True)  # Pode invalidar se precisar regenerar
    expires_at = Column(DateTime(timezone=True))  # Opcional: expiração

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<AICache {self.content_type} for object={self.object_id}>"


class AudioCache(Base):
    """Cache de áudios gerados (TTS)"""
    __tablename__ = "audio_cache"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    text = Column(Text, nullable=False, index=True)  # Texto falado
    language = Column(String(10), nullable=False, index=True)  # pt-BR, en-US
    voice = Column(String(100), nullable=False)  # Nome da voz
    speed = Column(String(20), default="normal")  # normal, slow, fast

    # Arquivo de áudio
    file_path = Column(String(500), nullable=False)  # Caminho do arquivo
    file_size = Column(Integer)  # Tamanho em bytes
    duration_ms = Column(Integer)  # Duração em ms
    format = Column(String(10), default="mp3")  # mp3, wav

    # TTS Engine usado
    tts_engine = Column(String(50))  # edge-tts, pyttsx3

    # Estatísticas
    plays_count = Column(Integer, default=0)  # Quantas vezes foi tocado
    is_valid = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_played_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<AudioCache {self.language}: {self.text[:30]}...>"


class Phrase(Base):
    """Frases contextuais para objetos"""
    __tablename__ = "phrases"

    id = Column(Integer, primary_key=True, index=True)
    object_id = Column(Integer, ForeignKey("game_objects.id"), nullable=False)

    # Situação/Contexto
    situation = Column(String(100), nullable=False, index=True)  # asking_permission, describing_action
    situation_pt = Column(String(255))  # Nome da situação em português
    difficulty = Column(Integer, default=1)  # 1-3

    # Frases
    phrase_pt = Column(Text, nullable=False)  # Frase em português
    phrase_en = Column(Text, nullable=False)  # Frase em inglês

    # Áudio (opcional: pode referenciar AudioCache)
    audio_pt_url = Column(String(500))
    audio_en_url = Column(String(500))

    # Metadata
    is_ai_generated = Column(Boolean, default=False)  # Se foi gerada por IA
    usage_count = Column(Integer, default=0)  # Quantas vezes foi mostrada
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    game_object = relationship("GameObject", back_populates="phrases")

    def __repr__(self):
        return f"<Phrase {self.situation} for object={self.object_id}>"
