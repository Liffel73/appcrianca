"""
Schemas para exercícios dinâmicos
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class ExerciseGenerationRequest(BaseModel):
    """Request para gerar um exercício"""
    exercise_type: str  # quiz, fill_blank, listening, word_match, sentence_builder
    object_word: str
    object_translation: str
    difficulty: str = "easy"  # easy, medium, hard


class QuizExerciseData(BaseModel):
    """Dados de um exercício de quiz"""
    question: str
    question_pt: str
    options: List[str]
    correct_index: int
    explanation: str


class FillBlankExerciseData(BaseModel):
    """Dados de um exercício de preencher lacuna"""
    sentence_en: str
    sentence_pt: str
    correct_answer: str
    hints: List[str]
    difficulty: str


class ListeningExerciseData(BaseModel):
    """Dados de um exercício de listening"""
    audio_text: str
    question: str
    question_pt: str
    options: List[str]
    correct_index: int


class WordPair(BaseModel):
    """Par de palavras para exercício de relacionar"""
    en: str
    pt: str


class WordMatchExerciseData(BaseModel):
    """Dados de um exercício de relacionar palavras"""
    word_pairs: List[WordPair]
    instructions: str
    instructions_pt: str


class SentenceBuilderExerciseData(BaseModel):
    """Dados de um exercício de construir frase"""
    words: List[str]
    correct_order: List[str]
    sentence_pt: str
    difficulty: str


class ExerciseGenerationResponse(BaseModel):
    """Response com dados do exercício gerado"""
    exercise_type: str
    exercise_data: Dict[str, Any]
    generation_time_ms: int
    from_cache: bool = False


class ExerciseSubmissionRequest(BaseModel):
    """Request para enviar resposta de um exercício"""
    exercise_type: str
    user_answer: Any  # Pode ser string, int, list, etc
    correct_answer: Any
    object_word: str


class ExerciseSubmissionResponse(BaseModel):
    """Response com resultado da submissão"""
    is_correct: bool
    feedback: str
    explanation: Optional[str] = None
    score: int  # 0-100
