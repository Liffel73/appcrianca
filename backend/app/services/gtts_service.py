"""
Serviço de TTS Brasileiro usando gTTS (Google Text-to-Speech)
Solução confiável, simples e que funciona perfeitamente no Windows
"""
import os
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict
import time

logger = logging.getLogger(__name__)

# Tentar importar gTTS
try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False
    logger.warning("gTTS não disponível. Instale com: pip install gtts")


class GoogleTTSService:
    """Serviço de Text-to-Speech em Português Brasileiro usando Google TTS"""

    def __init__(self, cache_dir: str = "./audio_cache_pt"):
        """
        Inicializa o serviço de TTS brasileiro

        Args:
            cache_dir: Diretório para cache de áudios
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.model_name = "gTTS-pt-BR"

        if GTTS_AVAILABLE:
            logger.info("✅ Google TTS disponível")
        else:
            logger.error("❌ gTTS não está disponível!")

    def _get_cache_path(self, text: str, speed: str = "normal") -> Path:
        """
        Gera caminho de cache baseado no texto

        Args:
            text: Texto a ser falado
            speed: Velocidade da fala ("normal" ou "slow")

        Returns:
            Caminho do arquivo de áudio em cache
        """
        # Criar hash do texto para nome do arquivo
        text_hash = hashlib.md5(f"{text}_{speed}".encode()).hexdigest()
        return self.cache_dir / f"gtts_pt_{text_hash}.mp3"

    def _is_cached(self, cache_path: Path) -> bool:
        """Verifica se áudio está em cache"""
        return cache_path.exists() and cache_path.stat().st_size > 0

    def generate_speech(
        self,
        text: str,
        speed: str = "normal",
        use_cache: bool = True
    ) -> Optional[Dict]:
        """
        Gera áudio de fala em português brasileiro

        Args:
            text: Texto a ser convertido em fala
            speed: Velocidade da fala ("normal" ou "slow")
            use_cache: Se deve usar cache

        Returns:
            Dict com informações do áudio gerado:
            {
                "audio_path": str,
                "text": str,
                "cached": bool,
                "duration_ms": int,
                "generation_time_ms": int
            }
        """
        if not GTTS_AVAILABLE:
            logger.error("gTTS não disponível")
            return None

        start_time = time.time()

        # Verificar cache
        cache_path = self._get_cache_path(text, speed)

        if use_cache and self._is_cached(cache_path):
            logger.info(f"✅ Áudio encontrado em cache: {cache_path.name}")
            generation_time = int((time.time() - start_time) * 1000)

            return {
                "audio_path": str(cache_path),
                "audio_url": f"http://localhost:8000/audio_cache_pt/{cache_path.name}",
                "text": text,
                "cached": True,
                "generation_time_ms": generation_time,
                "model": self.model_name
            }

        # Gerar novo áudio
        try:
            logger.info(f"🎤 Gerando áudio com Google TTS: '{text}'")

            # Configurar velocidade
            slow = (speed == "slow")

            # Gerar áudio com gTTS
            tts = gTTS(text=text, lang='pt-br', slow=slow, tld='com.br')
            tts.save(str(cache_path))

            generation_time = int((time.time() - start_time) * 1000)

            logger.info(f"✅ Áudio gerado com sucesso em {generation_time}ms")

            return {
                "audio_path": str(cache_path),
                "audio_url": f"http://localhost:8000/audio_cache_pt/{cache_path.name}",
                "text": text,
                "cached": False,
                "generation_time_ms": generation_time,
                "model": self.model_name,
                "file_size": cache_path.stat().st_size
            }

        except Exception as e:
            logger.error(f"❌ Erro ao gerar áudio: {e}")
            return None

    def clear_cache(self) -> Dict:
        """
        Limpa cache de áudios

        Returns:
            Dict com estatísticas de limpeza
        """
        try:
            files = list(self.cache_dir.glob("*.mp3"))
            total_size = sum(f.stat().st_size for f in files)

            for file in files:
                file.unlink()

            return {
                "files_deleted": len(files),
                "space_freed_mb": total_size / (1024 * 1024)
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
            files = list(self.cache_dir.glob("*.mp3"))
            total_size = sum(f.stat().st_size for f in files)

            return {
                "cache_dir": str(self.cache_dir),
                "total_files": len(files),
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "model": self.model_name,
                "gtts_available": GTTS_AVAILABLE
            }
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas: {e}")
            return {"error": str(e)}


# Instância global (singleton)
_gtts_instance = None


def get_gtts() -> GoogleTTSService:
    """
    Obtém instância singleton do serviço de TTS brasileiro

    Returns:
        GoogleTTSService
    """
    global _gtts_instance

    if _gtts_instance is None:
        _gtts_instance = GoogleTTSService()

    return _gtts_instance


# Função de conveniência
def speak_portuguese(text: str, speed: str = "normal") -> Optional[Dict]:
    """
    Atalho para gerar fala em português

    Args:
        text: Texto em português
        speed: "normal" ou "slow"

    Returns:
        Dict com informações do áudio
    """
    tts = get_gtts()
    return tts.generate_speech(text, speed=speed)


if __name__ == "__main__":
    # Teste do serviço
    logging.basicConfig(level=logging.INFO)

    print("\n🇧🇷 Testando Serviço de TTS Brasileiro com Google TTS\n")

    # Inicializar serviço
    tts_service = GoogleTTSService()

    # Testar geração de áudio
    test_texts = [
        "Olá! Esta é uma televisão.",
        "Vamos aprender inglês juntos!",
        "Eu uso o sofá para descansar."
    ]

    print("\n🎤 Gerando áudios de teste:\n")

    for text in test_texts:
        result = tts_service.generate_speech(text)

        if result:
            print(f"✅ '{text}'")
            print(f"   Arquivo: {result['audio_path']}")
            print(f"   Tempo: {result['generation_time_ms']}ms")
            print(f"   Cached: {result['cached']}")
            print()
        else:
            print(f"❌ Erro ao gerar: '{text}'")

    # Estatísticas
    print("\n📊 Estatísticas do Cache:")
    stats = tts_service.get_cache_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
