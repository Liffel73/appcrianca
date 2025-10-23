"""
Modelos para sistema de quiz
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.core.database import Base


class Quiz(Base):
    """Quiz sobre um objeto específico"""
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    object_id = Column(Integer, ForeignKey("game_objects.id"), nullable=False)

    # Informações do quiz
    title = Column(String(255), nullable=False)
    description = Column(Text)
    difficulty = Column(Integer, default=1)  # 1-3
    estimated_time_seconds = Column(Integer, default=60)

    # Pontuação
    max_score = Column(Integer, default=100)
    stars_reward = Column(Integer, default=15)  # Estrelas por completar

    # Metadata
    is_active = Column(Boolean, default=True)
    is_ai_generated = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Quiz '{self.title}' for object={self.object_id}>"


class QuizQuestion(Base):
    """Pergunta dentro de um quiz"""
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)

    # Tipo de pergunta
    question_type = Column(String(50), nullable=False, index=True)  # multiple_choice, fill_blank, audio_recognition
    question_text_pt = Column(Text, nullable=False)  # Pergunta em português
    question_text_en = Column(Text)  # Pergunta em inglês (opcional)

    # Opções (para múltipla escolha)
    options = Column(JSON)  # Lista de opções ["option1", "option2", ...]
    correct_answer = Column(String(500), nullable=False)  # Resposta correta

    # Feedback
    explanation = Column(Text)  # Explicação da resposta
    hint = Column(Text)  # Dica (se o usuário errar)

    # Pontuação e ordem
    points = Column(Integer, default=10)
    display_order = Column(Integer, default=0)

    # Metadata
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    quiz = relationship("Quiz", back_populates="questions")

    def __repr__(self):
        return f"<QuizQuestion {self.question_type} in quiz={self.quiz_id}>"


class QuizAttempt(Base):
    """Tentativa de quiz por usuário"""
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)

    # Respostas do usuário
    answers = Column(JSON, nullable=False)  # {"question_id": "user_answer"}
    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)

    # Pontuação
    score = Column(Integer, default=0)
    max_possible_score = Column(Integer)
    percentage = Column(Integer, default=0)  # 0-100

    # Estrelas ganhas
    stars_earned = Column(Integer, default=0)

    # Tempo
    time_taken_seconds = Column(Integer)
    completed = Column(Boolean, default=False)

    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

    # Relationships
    user = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")

    def __repr__(self):
        return f"<QuizAttempt user={self.user_id} quiz={self.quiz_id} score={self.score}>"
