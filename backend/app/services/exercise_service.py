"""
Serviço de Geração de Exercícios Dinâmicos com IA
Sistema escalável que funciona com qualquer objeto
"""
import sys
import time
import json
import logging
from typing import Dict, List, Optional

sys.path.append('./Assistente')
from gemini_client import GeminiClient

logger = logging.getLogger(__name__)


class ExerciseService:
    """Serviço para gerar exercícios dinâmicos usando IA"""

    def __init__(self):
        self.gemini_client = GeminiClient()
        logger.info("ExerciseService initialized")

    def generate_quiz_exercise(
        self,
        word: str,
        translation: str,
        difficulty: str = "easy"
    ) -> Dict:
        """
        Gera exercício de múltipla escolha

        Returns:
            {
                "exercise_type": "quiz",
                "question": str,
                "question_pt": str,
                "options": [str, str, str, str],
                "correct_index": int,
                "explanation": str
            }
        """
        start_time = time.time()

        prompt = f"""
Crie UMA questão de múltipla escolha sobre o objeto "{translation}" ({word} em inglês).

DIFICULDADE: {difficulty}

FORMATO JSON (responda APENAS com o JSON):
{{
  "question": "What is this object called in English?",
  "question_pt": "Como se chama este objeto em inglês?",
  "options": ["{word}", "option2", "option3", "option4"],
  "correct_index": 0,
  "explanation": "'{word}' significa {translation} em português."
}}

REGRAS IMPORTANTES:
1. A pergunta pode ser:
   - "What is this called in English?" (o que é isto em inglês)
   - "Which word means '{translation}'?" (qual palavra significa...)
   - Outras variações criativas mas simples

2. Inclua 3 distratores plausíveis (objetos similares ou da mesma categoria):
   - Para "sofa": chair, table, lamp
   - Para "table": desk, chair, shelf
   - Use objetos relacionados ao contexto

3. Dificuldade:
   - easy: Objetos muito diferentes
   - medium: Objetos da mesma categoria
   - hard: Objetos com funções similares

4. Explicação deve ser educativa e encorajadora
5. Responda APENAS com o JSON, sem markdown
"""

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um criador de exercícios educativos. Responda APENAS com JSON válido. Seja criativo e gere exercícios DIFERENTES a cada vez!",
                temperature=0.9
            )

            result = json.loads(self._clean_json(response))
            result["exercise_type"] = "quiz"
            result["generation_time_ms"] = int((time.time() - start_time) * 1000)

            return result

        except Exception as e:
            logger.error(f"Error generating quiz: {e}")
            return self._get_fallback_quiz(word, translation)

    def generate_fill_blank_exercise(
        self,
        word: str,
        translation: str,
        difficulty: str = "easy"
    ) -> Dict:
        """
        Gera exercício de preencher lacuna

        Returns:
            {
                "exercise_type": "fill_blank",
                "sentence_en": str,
                "sentence_pt": str,
                "correct_answer": str,
                "hints": [str, str],
                "difficulty": str
            }
        """
        start_time = time.time()

        context_guide = {
            "easy": "Frase simples, contexto óbvio (ex: 'The ___ is in the living room')",
            "medium": "Frase com ação, requer compreensão (ex: 'I sit on the ___ to watch TV')",
            "hard": "Frase complexa, contexto sutil (ex: 'The comfortable ___ in our lounge...')"
        }

        prompt = f"""
Crie UMA frase em inglês com lacuna (_____) usando "{word}" ({translation}).

DIFICULDADE: {difficulty}
CONTEXTO: {context_guide.get(difficulty, context_guide["easy"])}

FORMATO JSON (responda APENAS com o JSON):
{{
  "sentence_en": "The _____ is in the living room.",
  "sentence_pt": "O {translation} está na sala de estar.",
  "correct_answer": "{word}",
  "hints": [
    "É um móvel usado para sentar",
    "Geralmente fica na sala de estar"
  ],
  "difficulty": "{difficulty}"
}}

REGRAS IMPORTANTES:
1. sentence_en: Frase em INGLÊS com lacuna (_____) onde vai a palavra "{word}"
2. sentence_pt: Tradução COMPLETA em português (SEM lacuna, com a palavra "{translation}")
3. A tradução ajuda o aluno a entender o contexto
4. Dê 2 dicas progressivas (primeira mais vaga, segunda mais específica)
5. Responda APENAS com o JSON, sem markdown
"""

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um criador de exercícios educativos. Responda APENAS com JSON válido. Seja criativo e gere exercícios DIFERENTES a cada vez!",
                temperature=0.9
            )

            result = json.loads(self._clean_json(response))
            result["exercise_type"] = "fill_blank"
            result["generation_time_ms"] = int((time.time() - start_time) * 1000)

            return result

        except Exception as e:
            logger.error(f"Error generating fill_blank: {e}")
            return self._get_fallback_fill_blank(word, translation, difficulty)

    def generate_listening_exercise(
        self,
        word: str,
        translation: str,
        difficulty: str = "easy"
    ) -> Dict:
        """
        Gera exercício de listening

        Returns:
            {
                "exercise_type": "listening",
                "audio_text": str,
                "question": str,
                "question_pt": str,
                "options": [str, str, str, str],
                "correct_index": int
            }
        """
        start_time = time.time()

        prompt = f"""
Crie um exercício de listening para "{translation}" ({word}).

DIFICULDADE: {difficulty}

O aluno ouvirá um texto descrevendo o objeto e deve identificá-lo.

FORMATO JSON (responda APENAS com o JSON):
{{
  "audio_text": "This is a {word}. We use it to sit and relax. You can find it in the living room.",
  "question": "What object is being described?",
  "question_pt": "Que objeto está sendo descrito?",
  "options": ["{word}", "option2", "option3", "option4"],
  "correct_index": 0
}}

REGRAS:
1. Texto deve descrever o objeto sem dizer o nome diretamente
2. Mencione: onde está, para que serve, características
3. 2-3 frases curtas e claras
4. Opções devem ser objetos similares
5. Responda APENAS com o JSON, sem markdown
"""

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um criador de exercícios educativos. Responda APENAS com JSON válido. Seja criativo e gere exercícios DIFERENTES a cada vez!",
                temperature=0.9
            )

            result = json.loads(self._clean_json(response))
            result["exercise_type"] = "listening"
            result["generation_time_ms"] = int((time.time() - start_time) * 1000)

            return result

        except Exception as e:
            logger.error(f"Error generating listening: {e}")
            return self._get_fallback_listening(word, translation)

    def generate_word_match_exercise(
        self,
        word: str,
        translation: str,
        difficulty: str = "easy"
    ) -> Dict:
        """
        Gera exercício de relacionar palavras

        Returns:
            {
                "exercise_type": "word_match",
                "word_pairs": [
                    {"en": str, "pt": str},
                    ...
                ],
                "instructions": str
            }
        """
        start_time = time.time()

        prompt = f"""
Crie um exercício de relacionar palavras incluindo "{word}" ({translation}).

DIFICULDADE: {difficulty}

O aluno deve relacionar 4 palavras em inglês com suas traduções em português.

FORMATO JSON (responda APENAS com o JSON):
{{
  "word_pairs": [
    {{"en": "{word}", "pt": "{translation}"}},
    {{"en": "chair", "pt": "cadeira"}},
    {{"en": "table", "pt": "mesa"}},
    {{"en": "lamp", "pt": "lâmpada"}}
  ],
  "instructions": "Match the English words with their Portuguese translations",
  "instructions_pt": "Relacione as palavras em inglês com suas traduções em português"
}}

REGRAS:
1. Escolha objetos da mesma categoria/ambiente
2. Para "sofa": use móveis da sala
3. Para "table": use móveis gerais
4. Palavras devem ser do vocabulário básico
5. Responda APENAS com o JSON, sem markdown
"""

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um criador de exercícios educativos. Responda APENAS com JSON válido. Seja criativo e gere exercícios DIFERENTES a cada vez!",
                temperature=0.9
            )

            result = json.loads(self._clean_json(response))
            result["exercise_type"] = "word_match"
            result["generation_time_ms"] = int((time.time() - start_time) * 1000)

            return result

        except Exception as e:
            logger.error(f"Error generating word_match: {e}")
            return self._get_fallback_word_match(word, translation)

    def generate_sentence_builder_exercise(
        self,
        word: str,
        translation: str,
        difficulty: str = "easy"
    ) -> Dict:
        """
        Gera exercício de construir frase

        Returns:
            {
                "exercise_type": "sentence_builder",
                "words": [str, str, ...],
                "correct_order": [str, str, ...],
                "sentence_pt": str
            }
        """
        start_time = time.time()

        prompt = f"""
Crie um exercício de construir frase usando "{word}" ({translation}).

DIFICULDADE: {difficulty}

O aluno recebe palavras embaralhadas e deve ordená-las corretamente.

FORMATO JSON (responda APENAS com o JSON):
{{
  "words": ["The", "{word}", "is", "comfortable", "very"],
  "correct_order": ["The", "{word}", "is", "very", "comfortable"],
  "sentence_pt": "O {translation} é muito confortável",
  "difficulty": "{difficulty}"
}}

REGRAS:
1. Frase deve ser gramaticalmente correta
2. 5-8 palavras dependendo da dificuldade
3. easy: presente simples
4. medium: presente contínuo ou modal verbs
5. hard: perfect tense ou relative clauses
6. Responda APENAS com o JSON, sem markdown
"""

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um criador de exercícios educativos. Responda APENAS com JSON válido. Seja criativo e gere exercícios DIFERENTES a cada vez!",
                temperature=0.9
            )

            result = json.loads(self._clean_json(response))
            result["exercise_type"] = "sentence_builder"
            result["generation_time_ms"] = int((time.time() - start_time) * 1000)

            return result

        except Exception as e:
            logger.error(f"Error generating sentence_builder: {e}")
            return self._get_fallback_sentence_builder(word, translation, difficulty)

    def _clean_json(self, response: str) -> str:
        """Remove markdown wrapper do JSON"""
        response = response.strip()
        if response.startswith('```json'):
            response = response[7:]
        elif response.startswith('```'):
            response = response[3:]
        if response.endswith('```'):
            response = response[:-3]
        return response.strip()

    # Fallbacks
    def _get_fallback_quiz(self, word: str, translation: str) -> Dict:
        return {
            "exercise_type": "quiz",
            "question": "What is this object called in English?",
            "question_pt": "Como se chama este objeto em inglês?",
            "options": [word, "chair", "table", "lamp"],
            "correct_index": 0,
            "explanation": f"A resposta correta é '{word}', que significa {translation} em português.",
            "generation_time_ms": 0
        }

    def _get_fallback_fill_blank(self, word: str, translation: str, difficulty: str) -> Dict:
        return {
            "exercise_type": "fill_blank",
            "sentence_en": f"The _____ is in the living room.",
            "sentence_pt": f"O {translation} está na sala de estar.",
            "correct_answer": word,
            "hints": [
                f"É um objeto que você encontra em casa",
                f"Em português chamamos de {translation}"
            ],
            "difficulty": difficulty,
            "generation_time_ms": 0
        }

    def _get_fallback_listening(self, word: str, translation: str) -> Dict:
        return {
            "exercise_type": "listening",
            "audio_text": f"This is a {word}. We use it every day. You can find it in many homes.",
            "question": "What object is being described?",
            "question_pt": "Que objeto está sendo descrito?",
            "options": [word, "chair", "table", "bed"],
            "correct_index": 0,
            "generation_time_ms": 0
        }

    def _get_fallback_word_match(self, word: str, translation: str) -> Dict:
        return {
            "exercise_type": "word_match",
            "word_pairs": [
                {"en": word, "pt": translation},
                {"en": "chair", "pt": "cadeira"},
                {"en": "table", "pt": "mesa"},
                {"en": "lamp", "pt": "lâmpada"}
            ],
            "instructions": "Match the English words with their Portuguese translations",
            "instructions_pt": "Relacione as palavras em inglês com suas traduções em português",
            "generation_time_ms": 0
        }

    def _get_fallback_sentence_builder(self, word: str, translation: str, difficulty: str) -> Dict:
        return {
            "exercise_type": "sentence_builder",
            "words": ["The", word, "is", "comfortable", "very"],
            "correct_order": ["The", word, "is", "very", "comfortable"],
            "sentence_pt": f"O {translation} é muito confortável",
            "difficulty": difficulty,
            "generation_time_ms": 0
        }
