"""
Modelos para ambientes, cômodos e objetos
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, Float, Boolean
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Environment(Base):
    """Ambiente (Casa, Escola, Parque)"""
    __tablename__ = "environments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    name_pt = Column(String(100), nullable=False)
    emoji = Column(String(10))
    description = Column(Text)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    # Relationships
    rooms = relationship("Room", back_populates="environment", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Environment {self.name}>"


class Room(Base):
    """Cômodo dentro de um ambiente"""
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    environment_id = Column(Integer, ForeignKey("environments.id"), nullable=False)
    name = Column(String(100), nullable=False, index=True)
    name_pt = Column(String(100), nullable=False)
    description = Column(Text)
    background_color = Column(String(20), default="#F5F5DC")
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    # Relationships
    environment = relationship("Environment", back_populates="rooms")
    objects = relationship("GameObject", back_populates="room", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Room {self.name} in {self.environment.name if self.environment else 'N/A'}>"


class GameObject(Base):
    """Objeto interativo dentro de um cômodo"""
    __tablename__ = "game_objects"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)

    # Identificação
    unique_id = Column(String(100), unique=True, nullable=False, index=True)  # ex: "tv-living-room"
    word = Column(String(100), nullable=False, index=True)  # Palavra em inglês
    short_word = Column(String(50))  # Versão curta (ex: "TV")
    translation = Column(String(100), nullable=False)  # Tradução em português

    # Categoria e dificuldade
    category = Column(String(50), index=True)  # electronics, furniture, etc
    difficulty = Column(Integer, default=1)  # 1=básico, 2=intermediário, 3=avançado

    # Modelo 3D
    model_type = Column(String(20), default="primitive")  # primitive, gltf, glb
    model_path = Column(String(255))  # Caminho para o modelo 3D
    model_scale = Column(JSON)  # [x, y, z]
    model_rotation = Column(JSON)  # [x, y, z]

    # Posição na cena
    position_x = Column(Float, default=0)
    position_y = Column(Float, default=0)
    position_z = Column(Float, default=0)
    scale_x = Column(Float, default=1)
    scale_y = Column(Float, default=1)
    scale_z = Column(Float, default=1)

    # Visual
    shape = Column(String(20), default="box")  # box, cylinder, sphere
    color = Column(String(20), default="#87CEEB")

    # Pronúncia
    ipa = Column(String(100))  # Transcrição fonética
    syllables = Column(JSON)  # Lista de sílabas

    # Conteúdo educativo
    definition_pt = Column(Text)
    definition_en = Column(Text)
    common_uses = Column(JSON)  # Lista de usos comuns
    fun_facts = Column(JSON)  # Curiosidades

    # Configurações de interação
    clickable = Column(Boolean, default=True)
    hoverable = Column(Boolean, default=True)
    has_animation = Column(Boolean, default=False)
    animations = Column(JSON)  # Lista de animações disponíveis

    # Metadata
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)

    # Relationships
    room = relationship("Room", back_populates="objects")
    phrases = relationship("Phrase", back_populates="game_object", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<GameObject {self.word} ({self.translation})>"

    @property
    def position(self):
        return [self.position_x, self.position_y, self.position_z]

    @property
    def scale(self):
        return [self.scale_x, self.scale_y, self.scale_z]
