"""
Schemas Pydantic para requisições de IA
"""
from pydantic import BaseModel, Field
from typing import Optional, List


# ===== Requisições de IA =====

class IntroRequest(BaseModel):
    """Requisição para gerar introdução conversacional"""
    object_word: str = Field(..., description="Palavra em inglês do objeto")
    object_translation: str = Field(..., description="Tradução em português")
    room: str = Field(..., description="Nome do cômodo")
    environment: str = Field(..., description="Nome do ambiente")
    user_age: Optional[int] = Field(None, description="Idade do usuário para adaptar linguagem")


class IntroResponse(BaseModel):
    """Resposta com introdução gerada"""
    intro_text: str = Field(..., description="Texto de introdução em português")
    from_cache: bool = Field(default=False, description="Se veio do cache")
    generation_time_ms: Optional[int] = None


class PhrasesContextualRequest(BaseModel):
    """Requisição para gerar frases contextuais"""
    word: str = Field(..., description="Palavra em inglês")
    translation: str = Field(..., description="Tradução em português")
    difficulty: int = Field(default=1, ge=1, le=3, description="Nível de dificuldade")
    num_phrases: int = Field(default=3, ge=1, le=10, description="Número de frases a gerar")
    situations: Optional[List[str]] = Field(None, description="Situações específicas desejadas")


class PhraseItem(BaseModel):
    """Uma frase contextual"""
    situation: str = Field(..., description="Código da situação (ex: asking_permission)")
    situation_pt: str = Field(..., description="Nome da situação em português")
    phrase_pt: str = Field(..., description="Frase em português")
    phrase_en: str = Field(..., description="Frase em inglês")
    difficulty: int = Field(..., description="Dificuldade da frase")


class PhrasesContextualResponse(BaseModel):
    """Resposta com frases geradas"""
    phrases: List[PhraseItem]
    from_cache: bool = Field(default=False)
    generation_time_ms: Optional[int] = None


class WordBreakdownRequest(BaseModel):
    """Requisição para quebrar palavra em sílabas"""
    word: str = Field(..., description="Palavra em inglês")
    include_ipa: bool = Field(default=True, description="Incluir transcrição fonética")


class SyllableItem(BaseModel):
    """Uma sílaba com sua pronúncia"""
    text: str = Field(..., description="Texto da sílaba")
    ipa: Optional[str] = Field(None, description="Transcrição fonética")
    explanation_pt: Optional[str] = Field(None, description="Explicação em português")


class WordBreakdownResponse(BaseModel):
    """Resposta com quebra de palavra"""
    word: str
    ipa: str = Field(..., description="Transcrição fonética completa")
    syllables: List[SyllableItem]
    from_cache: bool = Field(default=False)


class FunFactsRequest(BaseModel):
    """Requisição para gerar curiosidades"""
    word: str = Field(..., description="Palavra em inglês")
    translation: str = Field(..., description="Tradução")
    num_facts: int = Field(default=3, ge=1, le=5)


class FunFactsResponse(BaseModel):
    """Resposta com curiosidades"""
    fun_facts: List[str] = Field(..., description="Lista de curiosidades")
    from_cache: bool = Field(default=False)
    generation_time_ms: Optional[int] = None


# ===== TTS Requests =====

class TTSRequest(BaseModel):
    """Requisição para Text-to-Speech"""
    text: Optional[str] = Field(None, description="Texto a ser falado")
    word: Optional[str] = Field(None, description="Palavra ou texto a ser falado (alias)")
    language: str = Field(default="en-US", description="Idioma (en-US, pt-BR)")
    voice: Optional[str] = Field(None, description="Voz específica a usar")
    speed: str = Field(default="normal", description="Velocidade: normal, slow, fast")

    class Config:
        # Permitir valores extras durante a validação
        extra = 'allow'

    @property
    def get_text(self):
        """Retorna text ou word, priorizando word se ambos estiverem presentes"""
        return self.word or self.text


class TTSResponse(BaseModel):
    """Resposta do TTS"""
    audio_url: str = Field(..., description="URL do áudio gerado")
    text: str
    language: str
    voice: str
    duration_ms: Optional[int] = None
    from_cache: bool = Field(default=False)
    method: str = Field(..., description="Método usado: edge-tts ou pyttsx3")


# ===== Quiz Generation =====

class QuizGenerationRequest(BaseModel):
    """Requisição para gerar quiz"""
    object_word: str
    object_translation: str
    difficulty: int = Field(default=1, ge=1, le=3)
    num_questions: int = Field(default=3, ge=2, le=10)


class QuizQuestionItem(BaseModel):
    """Uma pergunta de quiz"""
    question_type: str  # multiple_choice, fill_blank
    question_text_pt: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 10


class QuizGenerationResponse(BaseModel):
    """Resposta com quiz gerado"""
    title: str
    description: Optional[str]
    difficulty: int
    questions: List[QuizQuestionItem]
    max_score: int
    from_cache: bool = Field(default=False)


# ===== Conversational Chat =====

class ChatMessage(BaseModel):
    """Uma mensagem no histórico de conversa"""
    role: str = Field(..., description="user ou assistant")
    content: str = Field(..., description="Conteúdo da mensagem")
    timestamp: Optional[int] = None


class ChatWithObjectRequest(BaseModel):
    """Requisição para chat conversacional sobre objeto"""
    object_word: str = Field(..., description="Palavra em inglês do objeto")
    object_translation: str = Field(..., description="Tradução em português")
    user_message: str = Field(..., description="Mensagem/pergunta do usuário")
    conversation_history: List[ChatMessage] = Field(default=[], description="Histórico da conversa")
    user_age: Optional[int] = Field(None, description="Idade do usuário")


class ExamplePhrase(BaseModel):
    """Exemplo de frase bilíngue"""
    phrase_pt: str
    phrase_en: str


class ChatWithObjectResponse(BaseModel):
    """Resposta do chat conversacional"""
    bot_response: str = Field(..., description="Resposta da IA em português")
    examples: Optional[List[ExamplePhrase]] = Field(None, description="Exemplos de frases, se aplicável")
    suggestions: Optional[List[str]] = Field(None, description="Sugestões de próximas perguntas")
    audio_available: bool = Field(default=True, description="Se a resposta tem áudio disponível")
    from_cache: bool = Field(default=False)
    generation_time_ms: Optional[int] = None
