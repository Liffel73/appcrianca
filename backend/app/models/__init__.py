"""
Modelos do banco de dados
"""
from .environment import Environment, Room, GameObject
from .user import User, UserProgress, UserAchievement
from .content import AIContentCache, AudioCache, Phrase
from .quiz import Quiz, QuizQuestion, QuizAttempt

__all__ = [
    "Environment",
    "Room",
    "GameObject",
    "User",
    "UserProgress",
    "UserAchievement",
    "AIContentCache",
    "AudioCache",
    "Phrase",
    "Quiz",
    "QuizQuestion",
    "QuizAttempt",
]
