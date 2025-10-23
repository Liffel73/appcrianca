"""
Modelos para usuários e progresso
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.core.database import Base


class User(Base):
    """Usuário do aplicativo"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, index=True)
    full_name = Column(String(255))
    age = Column(Integer)  # Idade para adaptar conteúdo
    level = Column(Integer, default=1)  # Nível do usuário
    total_stars = Column(Integer, default=0)  # Estrelas totais
    streak_days = Column(Integer, default=0)  # Dias consecutivos
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), onupdate=func.now())
    last_activity = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    progress = relationship("UserProgress", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"


class UserProgress(Base):
    """Progresso do usuário em objetos/palavras"""
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    object_id = Column(Integer, ForeignKey("game_objects.id"), nullable=False)

    # Progresso
    times_heard = Column(Integer, default=0)  # Quantas vezes ouviu a palavra
    times_practiced = Column(Integer, default=0)  # Quantas vezes praticou
    is_learned = Column(Boolean, default=False)  # Marcado como aprendido
    stars_earned = Column(Integer, default=0)  # Estrelas ganhas com este objeto

    # Timestamps
    first_interaction = Column(DateTime(timezone=True), server_default=func.now())
    last_interaction = Column(DateTime(timezone=True), onupdate=func.now())
    learned_at = Column(DateTime(timezone=True))  # Quando marcou como aprendido

    # Relationships
    user = relationship("User", back_populates="progress")

    def __repr__(self):
        return f"<UserProgress user={self.user_id} object={self.object_id}>"


class UserAchievement(Base):
    """Conquistas desbloqueadas pelo usuário"""
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Conquista
    achievement_code = Column(String(100), nullable=False, index=True)  # ex: "explorer_beginner"
    achievement_name = Column(String(255), nullable=False)
    achievement_description = Column(String(500))
    badge_emoji = Column(String(10))
    reward_stars = Column(Integer, default=0)

    # Timestamps
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="achievements")

    def __repr__(self):
        return f"<Achievement {self.achievement_code} for user={self.user_id}>"
