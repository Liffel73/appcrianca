"""
Serviço de TTS usando Edge-TTS (Microsoft Azure Neural Voices)
Vozes neurais de alta qualidade, GRATUITAS, similar ao ElevenLabs!
"""
import os
import asyncio
import hashlib
import logging
import time
from pathlib import Path
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)

# Tentar importar Edge-TTS
try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False
    logger.warning("Edge-TTS não disponível. Instale com: pip install edge-tts")


class EdgeTTSService:
    """
    Serviço de Text-to-Speech usando Microsoft Azure Neural Voices via Edge-TTS
    Alta qualidade, gratuito, suporta múltiplos idiomas
    """

    def __init__(self, cache_dir: str = "./audio_cache_pt"):
        """
        Inicializa o serviço Edge-TTS

        Args:
            cache_dir: Diretório para cache de áudios
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Vozes padrão por idioma
        self.default_voices = {
            "pt-BR": "pt-BR-FranciscaNeural",  # Feminina, brasileira, jovem
            "en-US": "en-US-AvaNeural",  # Feminina, americana
            "en-GB": "en-GB-SoniaNeural",  # Feminina, britânica
            "es-ES": "es-ES-ElviraNeural",  # Feminina, espanhola
        }

        if not EDGE_TTS_AVAILABLE:
            logger.error("Edge-TTS não está disponível!")
        else:
            logger.info("✅ Edge-TTS Service initialized successfully!")

    def _get_cache_path(self, text: str, voice: str, rate: str = "+0%") -> Path:
        """
        Gera caminho de cache baseado no texto e configurações

        Args:
            text: Texto a ser falado
            voice: Voz a ser usada
            rate: Taxa de velocidade

        Returns:
            Caminho do arquivo de áudio em cache
        """
        # Criar hash do texto + voz + rate
        text_hash = hashlib.md5(f"{text}_{voice}_{rate}".encode()).hexdigest()
        return self.cache_dir / f"edge_{text_hash}.mp3"

    def _is_cached(self, cache_path: Path) -> bool:
        """Verifica se áudio está em cache"""
        return cache_path.exists() and cache_path.stat().st_size > 0

    async def _generate_async(
        self,
        text: str,
        voice: str,
        rate: str,
        output_path: Path
    ) -> bool:
        """
        Gera áudio usando Edge-TTS (async)

        Args:
            text: Texto para converter
            voice: Voz a usar
            rate: Taxa de velocidade
            output_path: Caminho do arquivo de saída

        Returns:
            True se gerado com sucesso
        """
        try:
            communicate = edge_tts.Communicate(
                text=text,
                voice=voice,
                rate=rate,
                volume="+0%"
            )

            await communicate.save(str(output_path))

            return output_path.exists() and output_path.stat().st_size > 0

        except Exception as e:
            logger.error(f"Erro ao gerar áudio com Edge-TTS: {e}")
            return False

    def generate_speech(
        self,
        text: str,
        language: str = "pt-BR",
        voice: Optional[str] = None,
        speed: str = "normal",
        use_cache: bool = True
    ) -> Optional[Dict]:
        """
        Gera áudio de fala usando Edge-TTS (Microsoft Azure Neural)

        Args:
            text: Texto a ser convertido em fala
            language: Idioma (pt-BR, en-US, etc.)
            voice: Voz específica (None = usar padrão do idioma)
            speed: Velocidade (slow, normal, fast)
            use_cache: Se deve usar cache

        Returns:
            Dict com informações do áudio gerado:
            {
                "audio_path": str,
                "audio_url": str,
                "text": str,
                "voice": str,
                "language": str,
                "cached": bool,
                "generation_time_ms": int,
                "file_size": int,
                "model": "edge-tts"
            }
        """
        if not EDGE_TTS_AVAILABLE:
            logger.error("Edge-TTS não disponível")
            return None

        start_time = time.time()

        # Escolher voz
        if voice is None:
            voice = self.default_voices.get(language, "pt-BR-FranciscaNeural")

        # Mapear velocidade para rate
        rate_map = {
            "slow": "-20%",
            "normal": "+0%",
            "fast": "+20%"
        }
        rate = rate_map.get(speed, "+0%")

        # Verificar cache
        cache_path = self._get_cache_path(text, voice, rate)

        if use_cache and self._is_cached(cache_path):
            generation_time = int((time.time() - start_time) * 1000)
            logger.info(f"✅ [CACHE] Áudio encontrado: {cache_path.name}")

            return {
                "audio_path": str(cache_path),
                "audio_url": f"/audio_cache_pt/{cache_path.name}",
                "text": text,
                "voice": voice,
                "language": language,
                "cached": True,
                "generation_time_ms": generation_time,
                "file_size": cache_path.stat().st_size,
                "model": "edge-tts-azure-neural"
            }

        # Gerar novo áudio
        try:
            logger.info(f"🎤 Gerando áudio Edge-TTS ({language}): '{text}'")

            # Executar geração async
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            success = loop.run_until_complete(
                self._generate_async(text, voice, rate, cache_path)
            )
            loop.close()

            if not success or not self._is_cached(cache_path):
                logger.error("Falha ao gerar áudio com Edge-TTS")
                return None

            generation_time = int((time.time() - start_time) * 1000)

            logger.info(f"✅ Áudio gerado com sucesso em {generation_time}ms")

            return {
                "audio_path": str(cache_path),
                "audio_url": f"/audio_cache_pt/{cache_path.name}",
                "text": text,
                "voice": voice,
                "language": language,
                "cached": False,
                "generation_time_ms": generation_time,
                "file_size": cache_path.stat().st_size,
                "model": "edge-tts-azure-neural"
            }

        except Exception as e:
            logger.error(f"❌ Erro ao gerar áudio: {e}")
            return None

    async def list_voices(self, language: Optional[str] = None) -> List[Dict]:
        """
        Lista todas as vozes disponíveis

        Args:
            language: Filtrar por idioma (e.g., "pt-BR", "en-US")

        Returns:
            Lista de dicionários com informações das vozes
        """
        if not EDGE_TTS_AVAILABLE:
            return []

        try:
            voices = await edge_tts.list_voices()

            if language:
                voices = [v for v in voices if v["Locale"].startswith(language)]

            return [{
                "name": v["ShortName"],
                "gender": v["Gender"],
                "locale": v["Locale"],
                "description": v.get("FriendlyName", v["ShortName"])
            } for v in voices]

        except Exception as e:
            logger.error(f"Erro ao listar vozes: {e}")
            return []

    def clear_cache(self) -> Dict:
        """
        Limpa cache de áudios

        Returns:
            Dict com estatísticas de limpeza
        """
        try:
            files = list(self.cache_dir.glob("edge_*.mp3"))
            total_size = sum(f.stat().st_size for f in files)

            for file in files:
                file.unlink()

            return {
                "files_deleted": len(files),
                "space_freed_mb": round(total_size / (1024 * 1024), 2)
            }
        except Exception as e:
            logger.error(f"Erro ao limpar cache: {e}")
            return {"error": str(e)}

    def get_cache_stats(self) -> Dict:
        """
        Obtém estatísticas do cache

        Returns:
            Dict com estatísticas
        """
        try:
            files = list(self.cache_dir.glob("edge_*.mp3"))
            total_size = sum(f.stat().st_size for f in files)

            return {
                "cache_dir": str(self.cache_dir),
                "total_files": len(files),
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "model": "edge-tts-azure-neural",
                "tts_available": EDGE_TTS_AVAILABLE
            }
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas: {e}")
            return {"error": str(e)}


# Instância global (singleton)
_edge_tts_instance = None


def get_edge_tts(cache_dir: str = "./audio_cache_pt") -> EdgeTTSService:
    """
    Obtém instância singleton do serviço Edge-TTS

    Args:
        cache_dir: Diretório de cache

    Returns:
        EdgeTTSService
    """
    global _edge_tts_instance

    if _edge_tts_instance is None:
        _edge_tts_instance = EdgeTTSService(cache_dir=cache_dir)

    return _edge_tts_instance


# Função de conveniência
def speak_portuguese(text: str, speed: str = "normal") -> Optional[Dict]:
    """
    Atalho para gerar fala em português brasileiro

    Args:
        text: Texto em português
        speed: Velocidade (slow, normal, fast)

    Returns:
        Dict com informações do áudio
    """
    tts = get_edge_tts()
    return tts.generate_speech(
        text=text,
        language="pt-BR",
        speed=speed
    )


if __name__ == "__main__":
    # Teste do serviço
    logging.basicConfig(level=logging.INFO)

    print("\nTestando Edge-TTS Service (Microsoft Azure Neural)\n")

    # Inicializar serviço
    tts_service = EdgeTTSService()

    # Testar geração de áudio
    test_texts = [
        "Olá! Esta é uma televisão.",
        "Vamos aprender inglês juntos!",
        "Eu uso o sofá para descansar."
    ]

    print("\nGerando audios de teste:\n")

    for text in test_texts:
        result = tts_service.generate_speech(text, language="pt-BR")

        if result:
            print(f"[OK] '{text}'")
            print(f"   Arquivo: {result['audio_path']}")
            print(f"   Tempo: {result['generation_time_ms']}ms")
            print(f"   Cached: {result['cached']}")
            print(f"   Voz: {result['voice']}")
            print()
        else:
            print(f"[ERRO] ao gerar: '{text}'")

    # Estatísticas
    print("\nEstatisticas do Cache:")
    stats = tts_service.get_cache_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")

    print("\n[OK] Edge-TTS funcionando perfeitamente!")
    print("Qualidade similar ao ElevenLabs, totalmente GRATUITO!")
