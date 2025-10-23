"""
Serviço de IA para geração de conteúdo educativo
"""
import sys
import os
import time
import json
import logging
from typing import List, Dict, Optional

# Adicionar path do Assistente
sys.path.append('./Assistente')
from gemini_client import GeminiClient

logger = logging.getLogger(__name__)


class AIService:
    """Serviço centralizado para geração de conteúdo com IA"""

    def __init__(self):
        self.gemini_client = GeminiClient()
        logger.info("AIService initialized with Gemini")

    def generate_intro(
        self,
        word: str,
        translation: str,
        room: str,
        environment: str,
        user_age: Optional[int] = None
    ) -> Dict:
        """
        Gera introdução conversacional em português

        Returns:
            {
                "intro_text": str,
                "generation_time_ms": int
            }
        """
        start_time = time.time()

        # Adaptar linguagem baseado na idade
        tone = "amigável e simples"
        if user_age:
            if user_age < 10:
                tone = "muito simples e divertido, como para crianças pequenas"
            elif user_age < 14:
                tone = "amigável e educativo, como para pré-adolescentes"
            else:
                tone = "claro e direto, como para adolescentes"

        prompt = f"""
Você é um professor de inglês {tone} para estudantes brasileiros.

OBJETO: {translation} ({word} em inglês)
LOCALIZAÇÃO: {room} na {environment}
{'IDADE DO ALUNO: ' + str(user_age) + ' anos' if user_age else ''}

Crie uma introdução conversacional curta em português que:
1. Cumprimente de forma amigável (use 1 emoji apropriado)
2. Apresente o objeto de forma clara e simples
3. Explique para que serve em 1-2 frases
4. Termine perguntando se quer aprender em inglês com emoji 🇺🇸

FORMATO EXATO:
Olá! [emoji] [Esse/Essa] é [ARTIGO CORRETO] [OBJETO EM MAIÚSCULO], [descrição breve]...
[1-2 frases sobre o que é e para que serve]

Quer aprender como falar isso em inglês? 🇺🇸

REGRAS IMPORTANTES:
- USE O ARTIGO CORRETO: "Esse é o sofá" (masculino) ou "Essa é a mesa" (feminino)
- Concordância de gênero correta em português
- Máximo 4 linhas
- Linguagem {tone}
- Português brasileiro natural e gramaticalmente correto
- SEM explicações extras, apenas a introdução
"""

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um professor de inglês criativo e motivador. Responda APENAS com a introdução, sem textos adicionais.",
                temperature=0.7
            )

            # PÓS-PROCESSAR: Corrigir gramática portuguesa automaticamente
            intro_text = response.strip()
            intro_text = self._fix_portuguese_grammar(intro_text, translation)

            generation_time = int((time.time() - start_time) * 1000)

            return {
                "intro_text": intro_text,
                "generation_time_ms": generation_time
            }

        except Exception as e:
            logger.error(f"Error generating intro: {e}")
            # Fallback genérico com artigo correto
            # Usar "o" para palavras terminadas em consoante/o, "a" para terminadas em a
            article = "a" if translation.lower().endswith('a') else "o"
            demonstrative = "Essa é" if article == "a" else "Esse é"

            return {
                "intro_text": f"Olá! 📚 {demonstrative} {article} {translation.upper()}! "
                             f"Usamos no nosso dia a dia aqui na {room}. "
                             f"Quer aprender como falar isso em inglês? 🇺🇸",
                "generation_time_ms": int((time.time() - start_time) * 1000)
            }

    def _fix_portuguese_grammar(self, text: str, word: str) -> str:
        """
        Corrige gramática portuguesa automaticamente
        Garante concordância correta de artigos e demonstrativos
        """
        import re

        # Detectar gênero da palavra
        word_lower = word.lower()
        is_feminine = word_lower.endswith('a')

        # Definir artigo e demonstrativo corretos
        if is_feminine:
            correct_article = "a"
            correct_demonstrative = "Essa é"
            wrong_demonstrative = "Esse é"
        else:
            correct_article = "o"
            correct_demonstrative = "Esse é"
            wrong_demonstrative = "Essa é"

        # Padrões comuns de erro
        patterns_to_fix = [
            # "Essa é o" -> "Esse é o" (masculino) / "Esse é a" -> "Essa é a" (feminino)
            (rf"{wrong_demonstrative}\s+{correct_article}\s+{re.escape(word.upper())}",
             f"{correct_demonstrative} {correct_article} {word.upper()}"),

            # "Essa é um" -> "Esse é o" (masculino) / "Esse é uma" -> "Essa é a" (feminino)
            (rf"{wrong_demonstrative}\s+uma?\s+{re.escape(word.upper())}",
             f"{correct_demonstrative} {correct_article} {word.upper()}"),

            # "Esse/Essa é uma/um" com artigo errado
            (rf"(Essa|Esse)\s+é\s+uma?\s+{re.escape(word.upper())}",
             f"{correct_demonstrative} {correct_article} {word.upper()}"),

            # "Essa é SOFÁ" (sem artigo) -> "Esse é o SOFÁ"
            (rf"{wrong_demonstrative}\s+{re.escape(word.upper())}",
             f"{correct_demonstrative} {correct_article} {word.upper()}"),

            # "Esse/Essa é PALAVRA" (sem artigo) -> "Esse/Essa é o/a PALAVRA"
            (rf"(Essa|Esse)\s+é\s+{re.escape(word.upper())}",
             f"{correct_demonstrative} {correct_article} {word.upper()}"),
        ]

        corrected_text = text
        for pattern, replacement in patterns_to_fix:
            corrected_text = re.sub(pattern, replacement, corrected_text, flags=re.IGNORECASE)

        # Log se houve correção
        if corrected_text != text:
            logger.info(f"Gramática corrigida: '{word}' ({correct_article})")
            logger.debug(f"  ANTES: {text[:100]}")
            logger.debug(f"  DEPOIS: {corrected_text[:100]}")

        return corrected_text

    def generate_contextual_phrases(
        self,
        word: str,
        translation: str,
        difficulty: int = 1,
        num_phrases: int = 3,
        situations: Optional[List[str]] = None
    ) -> Dict:
        """
        Gera frases contextuais em diferentes situações

        Returns:
            {
                "phrases": [
                    {
                        "situation": str,
                        "situation_pt": str,
                        "phrase_pt": str,
                        "phrase_en": str,
                        "difficulty": int
                    }
                ],
                "generation_time_ms": int
            }
        """
        start_time = time.time()

        # Definir situações padrão se não fornecidas
        if not situations:
            situations = [
                "pedindo permissão (asking permission)",
                "descrevendo ação (describing action)",
                "falando sobre rotina (talking about routine)"
            ]

        # Ajustar complexidade baseado na dificuldade
        complexity_guide = {
            1: "Frases simples e curtas (5-7 palavras). Use: 'I', 'you', present simple",
            2: "Frases médias (8-12 palavras). Use: present continuous, 'can', 'have to'",
            3: "Frases completas (13-18 palavras). Use: present perfect, conditionals, relative clauses"
        }

        prompt = f"""
Crie {num_phrases} exemplos de frases usando a palavra "{word}" em inglês.

PALAVRA: {word}
TRADUÇÃO: {translation}
NÍVEL: {difficulty}/3
COMPLEXIDADE: {complexity_guide[difficulty]}

SITUAÇÕES DESEJADAS:
{chr(10).join([f"- {s}" for s in situations[:num_phrases]])}

Para cada frase, forneça:
1. Código da situação (snake_case em inglês)
2. Nome da situação em português
3. Frase em português (natural, brasileiro)
4. Frase em inglês (nível apropriado)

FORMATO JSON (responda APENAS com o JSON):
[
  {{
    "situation": "asking_permission",
    "situation_pt": "Pedindo Permissão",
    "phrase_pt": "frase natural em português",
    "phrase_en": "natural English phrase",
    "difficulty": {difficulty}
  }},
  ...
]

REGRAS:
- Frases devem usar "{word}" naturalmente
- Português brasileiro coloquial
- Inglês correto e natural
- Adequado para estudantes brasileiros
"""

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um especialista em ensino de inglês. Responda APENAS com o JSON válido, sem explicações.",
                temperature=0.5
            )

            # Tentar parsear JSON
            phrases = json.loads(response.strip())

            generation_time = int((time.time() - start_time) * 1000)

            return {
                "phrases": phrases,
                "generation_time_ms": generation_time
            }

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            # Fallback com frases genéricas
            return self._get_fallback_phrases(word, translation, difficulty, num_phrases)
        except Exception as e:
            logger.error(f"Error generating phrases: {e}")
            return self._get_fallback_phrases(word, translation, difficulty, num_phrases)

    def _get_fallback_phrases(self, word: str, translation: str, difficulty: int, num: int) -> Dict:
        """Frases de fallback quando a IA falha"""
        fallback_phrases = [
            {
                "situation": "asking_permission",
                "situation_pt": "Pedindo Permissão",
                "phrase_pt": f"Posso usar o {translation}?",
                "phrase_en": f"Can I use the {word}?",
                "difficulty": difficulty
            },
            {
                "situation": "describing_action",
                "situation_pt": "Descrevendo Ação",
                "phrase_pt": f"Eu estou usando o {translation}",
                "phrase_en": f"I am using the {word}",
                "difficulty": difficulty
            },
            {
                "situation": "talking_routine",
                "situation_pt": "Falando sobre Rotina",
                "phrase_pt": f"Eu uso o {translation} todo dia",
                "phrase_en": f"I use the {word} every day",
                "difficulty": difficulty
            }
        ]

        return {
            "phrases": fallback_phrases[:num],
            "generation_time_ms": 0
        }

    def generate_word_breakdown(self, word: str, include_ipa: bool = True) -> Dict:
        """
        Quebra palavra em sílabas com pronúncia

        Returns:
            {
                "word": str,
                "ipa": str,
                "syllables": [
                    {
                        "text": str,
                        "ipa": str,
                        "explanation_pt": str
                    }
                ]
            }
        """
        start_time = time.time()

        prompt = f"""
Analise a palavra em inglês "{word}" e forneça:

1. Transcrição fonética IPA completa
2. Divisão silábica
3. Pronúncia de cada sílaba em IPA
4. Explicação simples de cada sílaba para brasileiros

FORMATO JSON (responda APENAS com o JSON):
{{
  "word": "{word}",
  "ipa": "/transcrição completa/",
  "syllables": [
    {{
      "text": "sí-la-ba",
      "ipa": "/IPA/",
      "explanation_pt": "som parecido com 'X' em português"
    }}
  ]
}}

REGRAS:
- Use IPA correto
- Explicações simples comparando com sons do português
- Seja educativo e claro
"""

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um linguista especializado em fonética. Responda APENAS com JSON válido.",
                temperature=0.3
            )

            result = json.loads(response.strip())
            return result

        except Exception as e:
            logger.error(f"Error generating word breakdown: {e}")
            # Fallback simples
            return {
                "word": word,
                "ipa": f"/{word}/",
                "syllables": [
                    {
                        "text": word,
                        "ipa": f"/{word}/",
                        "explanation_pt": f"Pronuncie como está escrito: {word}"
                    }
                ]
            }

    def generate_fun_facts(
        self,
        word: str,
        translation: str,
        num_facts: int = 3
    ) -> Dict:
        """
        Gera curiosidades sobre a palavra

        Returns:
            {
                "fun_facts": [str, str, ...],
                "generation_time_ms": int
            }
        """
        start_time = time.time()

        prompt = f"""
Crie {num_facts} curiosidades interessantes sobre "{word}" ({translation} em português).

TIPOS DE CURIOSIDADES:
1. Etimologia (origem da palavra)
2. História ou evolução do objeto
3. Uso cultural (diferenças entre países)
4. Expressões idiomáticas relacionadas
5. Fatos surpreendentes

FORMATO:
Liste {num_facts} curiosidades, uma por linha, começando com emoji apropriado.

REGRAS:
- Informações verdadeiras e educativas
- Linguagem simples para crianças/adolescentes
- Uma frase por curiosidade (máximo 2 linhas)
- Em português brasileiro
- Educativo e interessante
"""

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um educador criativo. Forneça curiosidades verdadeiras e verificáveis.",
                temperature=0.7
            )

            # Dividir por linhas e filtrar vazias
            facts = [
                line.strip()
                for line in response.strip().split('\n')
                if line.strip() and not line.strip().startswith('#')
            ]

            generation_time = int((time.time() - start_time) * 1000)

            return {
                "fun_facts": facts[:num_facts],
                "generation_time_ms": generation_time
            }

        except Exception as e:
            logger.error(f"Error generating fun facts: {e}")
            return {
                "fun_facts": [
                    f"📚 '{word}' é uma palavra comum em inglês.",
                    f"🌍 Pessoas em todo mundo usam '{translation}'.",
                    f"🎓 Aprender '{word}' ajuda no seu inglês!"
                ],
                "generation_time_ms": 0
            }

    def generate_quiz(
        self,
        word: str,
        translation: str,
        difficulty: int = 1,
        num_questions: int = 3
    ) -> Dict:
        """
        Gera quiz sobre o objeto

        Returns:
            {
                "title": str,
                "description": str,
                "difficulty": int,
                "questions": [...]
            }
        """
        start_time = time.time()

        prompt = f"""
Crie um quiz de {num_questions} perguntas sobre "{word}" ({translation}).

NÍVEL: {difficulty}/3
TIPOS DE PERGUNTAS:
- Múltipla escolha (4 opções)
- Completar frase

FORMATO JSON:
{{
  "title": "Quiz sobre {translation}",
  "description": "descrição motivadora",
  "difficulty": {difficulty},
  "questions": [
    {{
      "question_type": "multiple_choice",
      "question_text_pt": "pergunta em português",
      "options": ["opção1", "opção2", "opção3", "opção4"],
      "correct_answer": "opção correta",
      "explanation": "explicação da resposta",
      "points": 10
    }}
  ]
}}

REGRAS:
- Perguntas variadas e educativas
- Opções plausíveis (não óbvias demais)
- Explicações claras
- Em português brasileiro
"""

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um criador de conteúdo educativo. Responda APENAS com JSON válido.",
                temperature=0.6
            )

            quiz = json.loads(response.strip())
            return quiz

        except Exception as e:
            logger.error(f"Error generating quiz: {e}")
            # Fallback simples
            return {
                "title": f"Quiz sobre {translation}",
                "description": f"Teste seus conhecimentos sobre '{word}'!",
                "difficulty": difficulty,
                "questions": [
                    {
                        "question_type": "multiple_choice",
                        "question_text_pt": f"Como se diz '{translation}' em inglês?",
                        "options": [word, "outro1", "outro2", "outro3"],
                        "correct_answer": word,
                        "explanation": f"A resposta correta é '{word}'!",
                        "points": 10
                    }
                ]
            }

    def _clean_json_response(self, response: str) -> str:
        """
        Remove markdown code block wrapper do JSON se existir
        Exemplo: ```json\n{...}\n``` -> {...}
        """
        response = response.strip()

        # Remover ```json ou ``` no início
        if response.startswith('```json'):
            response = response[7:]  # Remove '```json'
        elif response.startswith('```'):
            response = response[3:]   # Remove '```'

        # Remover ``` no final
        if response.endswith('```'):
            response = response[:-3]

        return response.strip()

    def chat_with_object(
        self,
        word: str,
        translation: str,
        user_message: str,
        conversation_history: List[Dict] = None,
        user_age: Optional[int] = None
    ) -> Dict:
        """
        Chat conversacional sobre um objeto específico

        Args:
            word: Palavra em inglês
            translation: Tradução em português
            user_message: Mensagem/pergunta do usuário
            conversation_history: Histórico de mensagens anteriores
            user_age: Idade do usuário (para adaptar linguagem)

        Returns:
            {
                "bot_response": str,
                "examples": [{"phrase_pt": str, "phrase_en": str}],
                "suggestions": [str],
                "generation_time_ms": int
            }
        """
        start_time = time.time()

        if conversation_history is None:
            conversation_history = []

        # Adaptar tom baseado na idade
        tone = "amigável e educativo"
        if user_age:
            if user_age < 10:
                tone = "muito simples, divertido e encorajador"
            elif user_age < 14:
                tone = "amigável, claro e motivador"
            else:
                tone = "direto, informativo e respeitoso"

        # Construir contexto da conversa
        history_text = ""
        if conversation_history:
            history_text = "\n\nHISTÓRICO DA CONVERSA:\n"
            for msg in conversation_history[-5:]:  # Últimas 5 mensagens
                role_label = "Aluno" if msg.get("role") == "user" else "Professor"
                history_text += f"{role_label}: {msg.get('content')}\n"

        prompt = f"""
Você é um professor de inglês {tone}, especializado em ensinar para brasileiros.

CONTEXTO:
- Objeto em discussão: {translation} ({word} em inglês)
- Idade do aluno: {user_age or 'não especificada'}
{history_text}

PERGUNTA DO ALUNO:
"{user_message}"

INSTRUÇÕES:
1. Responda a pergunta de forma clara e educativa
2. Use linguagem {tone}
3. IMPORTANTE: Se o aluno perguntar como dizer/falar algo em inglês, SEMPRE forneça exemplos completos
4. Seja encorajador e positivo
5. Mantenha o foco no objeto "{translation}"

DETECÇÃO DE PERGUNTAS SOBRE TRADUÇÃO:
- "como digo/falo/dizer..." → Usuário quer aprender a traduzir uma frase
- "como se diz..." → Usuário quer aprender a traduzir
- "eu vou/quero..." → Usuário quer saber como expressar uma ação em inglês
- NESSES CASOS: Sempre forneça 2-3 exemplos de frases em português e inglês

FORMATO DA RESPOSTA (JSON):
{{
  "bot_response": "sua resposta conversacional em português (2-4 frases, max 100 palavras)",
  "examples": [
    {{"phrase_pt": "frase exemplo em português", "phrase_en": "example phrase in English"}},
    ...
  ],
  "suggestions": [
    "sugestão de próxima pergunta 1",
    "sugestão de próxima pergunta 2",
    "sugestão de próxima pergunta 3"
  ]
}}

REGRAS:
- bot_response: Sempre em português brasileiro, conversacional e motivador
- examples: SEMPRE forneça exemplos quando a pergunta for sobre como dizer/usar/falar algo
- suggestions: 3 sugestões de perguntas relacionadas ao tema
- Se for pergunta sobre tradução/uso, examples NUNCA deve estar vazio
- Responda APENAS com o JSON, sem texto extra ou markdown
"""

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um professor de inglês interativo e motivador. Responda APENAS com JSON válido, sem explicações adicionais.",
                temperature=0.7
            )

            # Limpar resposta (remover markdown wrapper se existir)
            clean_response = self._clean_json_response(response)

            # Parse JSON
            result = json.loads(clean_response)

            generation_time = int((time.time() - start_time) * 1000)
            result["generation_time_ms"] = generation_time

            return result

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error in chat: {e}")
            logger.error(f"Raw response: {response}")
            return self._get_fallback_chat_response(user_message, word, translation)
        except Exception as e:
            logger.error(f"Error in chat_with_object: {e}")
            return self._get_fallback_chat_response(user_message, word, translation)

    def _get_fallback_chat_response(self, user_message: str, word: str, translation: str) -> Dict:
        """Resposta de fallback quando a IA falha"""

        # Detectar tipo de pergunta
        msg_lower = user_message.lower()

        if any(keyword in msg_lower for keyword in ["frase", "exemplo", "usar"]):
            return {
                "bot_response": f"Ótima pergunta! Aqui estão alguns exemplos de como usar '{translation}' em frases:",
                "examples": [
                    {"phrase_pt": f"Eu uso o {translation}", "phrase_en": f"I use the {word}"},
                    {"phrase_pt": f"O {translation} é útil", "phrase_en": f"The {word} is useful"}
                ],
                "suggestions": [
                    "Como pronunciar essa palavra?",
                    "Me conte uma curiosidade!",
                    "Tem outras palavras parecidas?"
                ],
                "generation_time_ms": 0
            }
        elif any(keyword in msg_lower for keyword in ["pronuncia", "como fala", "pronúncia"]):
            return {
                "bot_response": f"'{word}' se pronuncia de forma bem parecida com está escrito! Clique no botão de áudio para ouvir a pronúncia correta. 🔊",
                "examples": [],
                "suggestions": [
                    "Como usar em uma frase?",
                    "Qual a diferença entre palavras similares?",
                    "Me conte uma curiosidade!"
                ],
                "generation_time_ms": 0
            }
        else:
            return {
                "bot_response": f"Interessante! '{word}' ({translation}) é uma palavra muito útil em inglês. O que mais você gostaria de saber sobre ela?",
                "examples": [],
                "suggestions": [
                    "Como usar em uma frase?",
                    "Como se pronuncia?",
                    "Me conte uma curiosidade!"
                ],
                "generation_time_ms": 0
            }

    def generate_game(
        self,
        game_type: str,
        word: str,
        translation: str,
        difficulty: str = "easy"
    ) -> Dict:
        """
        Gera jogos interativos com vocabulário relacionado ao objeto

        IMPORTANTE: Usa vocabulário RELACIONADO ao objeto, não apenas o objeto em si!
        Exemplos:
        - sofa → cushion/almofada, fabric/tecido, armrest/braço, sit/sentar
        - table → chair/cadeira, tablecloth/toalha de mesa, legs/pernas
        - TV → remote/controle, screen/tela, button/botão, watch/assistir

        Args:
            game_type: 'guess_word', 'anagram', 'quick_quiz', 'missing_letters'
            word: Palavra principal em inglês
            translation: Tradução em português
            difficulty: 'easy', 'medium', 'hard'

        Returns:
            Dict com dados específicos do tipo de jogo
        """
        start_time = time.time()

        # Prompts específicos por tipo de jogo
        if game_type == "guess_word":
            prompt = f"""
Crie um jogo estilo TERMO/WORDLE com palavra RELACIONADA a "{translation}" ({word}).

IMPORTANTE: A palavra DEVE ter EXATAMENTE 5 LETRAS e ser relacionada ao objeto!
Exemplos de palavras de 5 letras:
- Para "sofa": chair, cover, relax, couch
- Para "table": plate, cloth, chair, spoon
- Para "TV": watch, sound, cable, pixel, video

FORMATO JSON (responda APENAS com o JSON):
{{
  "word_to_guess": "chair",
  "translation": "cadeira",
  "hint": "Objeto usado junto com uma mesa",
  "max_attempts": 6,
  "category": "Relacionado a {translation}"
}}

REGRAS CRÍTICAS:
1. A palavra DEVE ter EXATAMENTE 5 LETRAS (não mais, não menos!)
2. Use vocabulário RELACIONADO a {translation} (não a palavra principal)
3. Escolha palavras comuns e conhecidas
4. Dê UMA dica clara mas não óbvia
5. Responda APENAS com o JSON, sem markdown
"""

        elif game_type == "anagram":
            prompt = f"""
Crie um jogo de anagrama com palavra RELACIONADA a "{translation}" ({word}).

IMPORTANTE: Use vocabulário RELACIONADO ao objeto!
Exemplos: cushion, remote, fabric, screen, chair, tablecloth

FORMATO JSON (responda APENAS com o JSON):
{{
  "word": "cushion",
  "translation": "almofada",
  "scrambled": "iucohsn",
  "hint": "Objeto macio que deixa o sofá mais confortável",
  "category": "Relacionado a {translation}"
}}

REGRAS:
1. Palavra de 5-8 letras relacionada a {translation}
2. Embaralhe bem as letras
3. Dica clara mas não óbvia
4. Responda APENAS com o JSON, sem markdown
"""

        elif game_type == "quick_quiz":
            prompt = f"""
Crie 5 perguntas rápidas sobre vocabulário RELACIONADO a "{translation}" ({word}).

IMPORTANTE: Perguntas sobre acessórios, partes, ações relacionadas!
Exemplos:
- "O que você usa para mudar de canal na TV?"
- "Como se chama a parte macia do sofá onde você apoia a cabeça?"
- "Qual objeto você coloca sobre a mesa para protegê-la?"

FORMATO JSON (responda APENAS com o JSON):
{{
  "questions": [
    {{
      "question": "O que você usa para controlar a TV de longe?",
      "options": ["remote", "screen", "cable", "button"],
      "correct_answer": "remote",
      "translation": "controle"
    }},
    ... (5 perguntas no total)
  ],
  "time_per_question": 10,
  "category": "Vocabulário relacionado a {translation}"
}}

REGRAS:
1. 5 perguntas sobre vocabulário relacionado
2. 4 opções cada (todas relacionadas ao contexto)
3. Perguntas em português, respostas em inglês
4. Responda APENAS com o JSON, sem markdown
"""

        elif game_type == "missing_letters":
            prompt = f"""
Crie um jogo de completar letras com palavra RELACIONADA a "{translation}" ({word}).

IMPORTANTE: Use vocabulário RELACIONADO!
Exemplos: c_sh_on (cushion), r_m_t_ (remote), f_br_c (fabric)

FORMATO JSON (responda APENAS com o JSON):
{{
  "word": "cushion",
  "translation": "almofada",
  "pattern": "c_sh__n",
  "hint": "Objeto macio usado no sofá para conforto",
  "missing_letters": ["u", "i", "o"],
  "category": "Relacionado a {translation}"
}}

REGRAS:
1. Palavra de 5-9 letras relacionada a {translation}
2. Remova 3-4 letras (use _ no lugar)
3. Dica clara sobre a palavra
4. Liste as letras que faltam
5. Responda APENAS com o JSON, sem markdown
"""

        else:
            # Fallback para tipo desconhecido
            return self._get_fallback_game(game_type, word, translation)

        try:
            response = self.gemini_client.generate_response(
                prompt,
                system_instruction="Você é um criador de jogos educativos. Responda APENAS com JSON válido. Use vocabulário RELACIONADO ao objeto, não apenas o objeto em si!",
                temperature=0.8
            )

            # Limpar resposta
            clean_response = self._clean_json_response(response)
            result = json.loads(clean_response)

            # Adicionar metadados
            result["game_type"] = game_type
            result["difficulty"] = difficulty
            result["generation_time_ms"] = int((time.time() - start_time) * 1000)

            logger.info(f"Game generated: {game_type} for {word}")
            return result

        except Exception as e:
            logger.error(f"Error generating game {game_type}: {e}")
            return self._get_fallback_game(game_type, word, translation)

    def _get_fallback_game(self, game_type: str, word: str, translation: str) -> Dict:
        """Jogos de fallback quando a IA falha"""

        # Vocabulário relacionado padrão por categoria
        related_vocab = {
            "sofa": [
                {"en": "cushion", "pt": "almofada"},
                {"en": "armrest", "pt": "braço"},
                {"en": "fabric", "pt": "tecido"}
            ],
            "table": [
                {"en": "chair", "pt": "cadeira"},
                {"en": "tablecloth", "pt": "toalha de mesa"},
                {"en": "surface", "pt": "superfície"}
            ],
            "tv": [
                {"en": "remote", "pt": "controle"},
                {"en": "screen", "pt": "tela"},
                {"en": "button", "pt": "botão"}
            ]
        }

        # Usar palavras relacionadas padrão ou genéricas
        related_words = related_vocab.get(word.lower(), [
            {"en": "part", "pt": "parte"},
            {"en": "use", "pt": "usar"},
            {"en": "object", "pt": "objeto"}
        ])

        related_word = related_words[0]

        if game_type == "guess_word":
            return {
                "game_type": "guess_word",
                "word_to_guess": related_word["en"],
                "translation": related_word["pt"],
                "hints": [
                    f"É algo relacionado ao {translation}",
                    f"Você encontra perto ou em um {translation}",
                    f"Em português chamamos de {related_word['pt']}"
                ],
                "max_attempts": 3,
                "category": f"Relacionado a {translation}",
                "difficulty": "easy",
                "generation_time_ms": 0
            }

        elif game_type == "anagram":
            return {
                "game_type": "anagram",
                "word": related_word["en"],
                "translation": related_word["pt"],
                "scrambled": related_word["en"][::-1],  # Simplesmente inverter
                "hint": f"Relacionado ao {translation}",
                "category": f"Relacionado a {translation}",
                "difficulty": "easy",
                "generation_time_ms": 0
            }

        elif game_type == "quick_quiz":
            return {
                "game_type": "quick_quiz",
                "questions": [
                    {
                        "question": f"Como se diz {translation} em inglês?",
                        "options": [word, "other1", "other2", "other3"],
                        "correct_answer": word,
                        "translation": translation
                    }
                ],
                "time_per_question": 10,
                "category": f"Vocabulário de {translation}",
                "difficulty": "easy",
                "generation_time_ms": 0
            }

        elif game_type == "missing_letters":
            return {
                "game_type": "missing_letters",
                "word": related_word["en"],
                "translation": related_word["pt"],
                "pattern": related_word["en"][0] + "_" * (len(related_word["en"]) - 2) + related_word["en"][-1],
                "hint": f"Relacionado ao {translation}",
                "missing_letters": list(related_word["en"][1:-1]),
                "category": f"Relacionado a {translation}",
                "difficulty": "easy",
                "generation_time_ms": 0
            }

        return {
            "game_type": game_type,
            "error": "Game type not supported",
            "generation_time_ms": 0
        }
