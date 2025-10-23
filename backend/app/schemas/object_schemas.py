"""
Schemas Pydantic para objetos e ambientes
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ===== Phrase Schemas ===== (Defined first for forward references)

class PhraseBase(BaseModel):
    situation: str
    situation_pt: str
    phrase_pt: str
    phrase_en: str
    difficulty: int = Field(default=1, ge=1, le=3)


class PhraseCreate(PhraseBase):
    object_id: int
    is_ai_generated: bool = False


class PhraseResponse(PhraseBase):
    id: int
    object_id: int
    audio_pt_url: Optional[str]
    audio_en_url: Optional[str]
    is_ai_generated: bool
    usage_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===== GameObject Schemas =====

class GameObjectBase(BaseModel):
    word: str = Field(..., description="Palavra em inglês")
    translation: str = Field(..., description="Tradução em português")
    short_word: Optional[str] = None
    category: Optional[str] = None
    difficulty: int = Field(default=1, ge=1, le=3)


class GameObjectCreate(GameObjectBase):
    room_id: int
    unique_id: str
    shape: str = "box"
    color: str = "#87CEEB"
    position_x: float = 0
    position_y: float = 0
    position_z: float = 0
    scale_x: float = 1
    scale_y: float = 1
    scale_z: float = 1


class GameObjectResponse(GameObjectBase):
    id: int
    unique_id: str
    room_id: int
    shape: str
    color: str
    position: List[float]
    scale: List[float]
    ipa: Optional[str]
    syllables: Optional[List[str]]
    model_type: str
    model_path: Optional[str]
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GameObjectDetail(GameObjectResponse):
    """Versão completa com conteúdo educativo"""
    definition_pt: Optional[str]
    definition_en: Optional[str]
    common_uses: Optional[List[str]]
    fun_facts: Optional[List[str]]
    phrases: Optional[List[PhraseResponse]] = []

    class Config:
        from_attributes = True


# ===== Room Schemas =====

class RoomBase(BaseModel):
    name: str
    name_pt: str
    description: Optional[str] = None
    background_color: str = "#F5F5DC"


class RoomCreate(RoomBase):
    environment_id: int


class RoomResponse(RoomBase):
    id: int
    environment_id: int
    display_order: int
    is_active: bool
    objects: List[GameObjectResponse] = []

    class Config:
        from_attributes = True


# ===== Environment Schemas =====

class EnvironmentBase(BaseModel):
    name: str
    name_pt: str
    emoji: Optional[str] = None
    description: Optional[str] = None


class EnvironmentCreate(EnvironmentBase):
    pass


class EnvironmentResponse(EnvironmentBase):
    id: int
    display_order: int
    is_active: bool
    rooms: List[RoomResponse] = []

    class Config:
        from_attributes = True
