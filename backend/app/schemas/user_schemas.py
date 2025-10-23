"""
Schemas Pydantic para usuários e progresso
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ===== User Schemas =====

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    age: Optional[int] = Field(None, ge=1, le=120)


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    age: Optional[int] = None


class UserResponse(UserBase):
    id: int
    level: int
    total_stars: int
    streak_days: int
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


# ===== Progress Schemas =====

class UserProgressBase(BaseModel):
    object_id: int


class UserProgressCreate(UserProgressBase):
    user_id: int


class UserProgressResponse(UserProgressBase):
    id: int
    user_id: int
    times_heard: int
    times_practiced: int
    is_learned: bool
    stars_earned: int
    first_interaction: datetime
    last_interaction: Optional[datetime]
    learned_at: Optional[datetime]

    class Config:
        from_attributes = True


class UserProgressUpdate(BaseModel):
    """Atualizar progresso de usuário"""
    increment_heard: bool = False
    increment_practiced: bool = False
    mark_learned: bool = False
    add_stars: int = Field(default=0, ge=0)


# ===== Achievement Schemas =====

class AchievementUnlock(BaseModel):
    """Desbloquear conquista"""
    user_id: int
    achievement_code: str
    achievement_name: str
    achievement_description: Optional[str]
    badge_emoji: Optional[str]
    reward_stars: int = 0


class AchievementResponse(BaseModel):
    id: int
    user_id: int
    achievement_code: str
    achievement_name: str
    achievement_description: Optional[str]
    badge_emoji: Optional[str]
    reward_stars: int
    unlocked_at: datetime

    class Config:
        from_attributes = True


# ===== Stats Schemas =====

class UserStatsResponse(BaseModel):
    """Estatísticas do usuário"""
    total_words_learned: int
    total_objects_interacted: int
    total_quizzes_completed: int
    total_stars: int
    current_streak: int
    level: int
    achievements_count: int
    progress_percentage: float  # 0-100
