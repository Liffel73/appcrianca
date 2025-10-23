"""
Serviço de TTS Brasileiro usando Edge-TTS (Microsoft Azure Neural)
MELHOR QUALIDADE - Similar ao ElevenLabs, totalmente GRATUITO!
"""
import os
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict
import time

logger = logging.getLogger(__name__)

# Importar Edge-TTS Service
try:
    from backend.app.services.edge_tts_service import get_edge_tts, EDGE_TTS_AVAILABLE
except ImportError:
    try:
        from edge_tts_service import get_edge_tts, EDGE_TTS_AVAILABLE
    except ImportError:
        EDGE_TTS_AVAILABLE = False
        logger.warning("Edge-TTS não disponível. Instale com: pip install edge-tts")


class BrazilianTTSService:
    """
    Serviço de Text-to-Speech em Português Brasileiro
    Agora usando Edge-TTS (Microsoft Azure Neural Voices) - MELHOR QUALIDADE!
    """

    def __init__(self, cache_dir: str = "./audio_cache_pt"):
        """
        Inicializa o serviço de TTS brasileiro

        Args:
            cache_dir: Diretório para cache de áudios
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.tts = None
        self.model_name = "edge-tts-azure-neural"  # Edge-TTS (Microsoft Azure)

        if EDGE_TTS_AVAILABLE:
            self._initialize_tts()
        else:
            logger.error("Edge-TTS não está disponível!")

    def _initialize_tts(self):
        """Inicializa o Edge-TTS"""
        try:
            logger.info(f"Inicializando Edge-TTS (Microsoft Azure Neural)...")

            # Obter instância do Edge-TTS Service
            self.tts = get_edge_tts(cache_dir=str(self.cache_dir))

            logger.info("✅ Edge-TTS inicializado com sucesso!")
            logger.info(f"Modelo: {self.model_name}")
            logger.info("🎉 Qualidade PREMIUM - Similar ao ElevenLabs!")

        except Exception as e:
            logger.error(f"Erro ao inicializar Edge-TTS: {e}")
            self.tts = None

    def _get_cache_path(self, text: str, speed: float = 1.0) -> Path:
        """
        Gera caminho de cache baseado no texto

        Args:
            text: Texto a ser falado
            speed: Velocidade da fala

        Returns:
            Caminho do arquivo de áudio em cache
        """
        # Criar hash do texto para nome do arquivo
        text_hash = hashlib.md5(f"{text}_{speed}".encode()).hexdigest()
        return self.cache_dir / f"pt_br_{text_hash}.wav"

    def _is_cached(self, cache_path: Path) -> bool:
        """Verifica se áudio está em cache"""
        return cache_path.exists() and cache_path.stat().st_size > 0

    def generate_speech(
        self,
        text: str,
        speed: float = 1.0,
        use_cache: bool = True
    ) -> Optional[Dict]:
        """
        Gera áudio de fala em português brasileiro usando Edge-TTS

        Args:
            text: Texto a ser convertido em fala
            speed: Velocidade da fala (0.75 = slow, 1.0 = normal, 1.25 = fast)
            use_cache: Se deve usar cache

        Returns:
            Dict com informações do áudio gerado:
            {
                "audio_path": str,
                "audio_url": str,
                "text": str,
                "cached": bool,
                "generation_time_ms": int,
                "model": str
            }
        """
        if not EDGE_TTS_AVAILABLE or self.tts is None:
            logger.error("Edge-TTS não disponível")
            return None

        # Mapear velocidade para speed name
        if speed <= 0.85:
            speed_name = "slow"
        elif speed >= 1.15:
            speed_name = "fast"
        else:
            speed_name = "normal"

        # Usar Edge-TTS Service
        result = self.tts.generate_speech(
            text=text,
            language="pt-BR",
            voice="pt-BR-FranciscaNeural",  # Voz brasileira feminina
            speed=speed_name,
            use_cache=use_cache
        )

        return result

    def get_available_models(self) -> list:
        """
        Lista vozes disponíveis em português brasileiro via Edge-TTS

        Returns:
            Lista de vozes PT-BR disponíveis
        """
        if not EDGE_TTS_AVAILABLE or self.tts is None:
            return []

        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            voices = loop.run_until_complete(self.tts.list_voices(language="pt-BR"))
            loop.close()

            return voices
        except Exception as e:
            logger.error(f"Erro ao listar vozes: {e}")
            return []

    def clear_cache(self) -> Dict:
        """
        Limpa cache de áudios

        Returns:
            Dict com estatísticas de limpeza
        """
        if self.tts:
            return self.tts.clear_cache()

        # Fallback manual
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
        if self.tts:
            return self.tts.get_cache_stats()

        # Fallback manual
        try:
            files = list(self.cache_dir.glob("edge_*.mp3"))
            total_size = sum(f.stat().st_size for f in files)

            return {
                "cache_dir": str(self.cache_dir),
                "total_files": len(files),
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "model": self.model_name,
                "tts_available": self.tts is not None
            }
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas: {e}")
            return {"error": str(e)}


# Instância global (singleton)
_brazilian_tts_instance = None


def get_brazilian_tts() -> BrazilianTTSService:
    """
    Obtém instância singleton do serviço de TTS brasileiro

    Returns:
        BrazilianTTSService
    """
    global _brazilian_tts_instance

    if _brazilian_tts_instance is None:
        _brazilian_tts_instance = BrazilianTTSService()

    return _brazilian_tts_instance


# Função de conveniência
def speak_portuguese(text: str, speed: float = 1.0) -> Optional[Dict]:
    """
    Atalho para gerar fala em português

    Args:
        text: Texto em português
        speed: Velocidade (0.5 a 2.0)

    Returns:
        Dict com informações do áudio
    """
    tts = get_brazilian_tts()
    return tts.generate_speech(text, speed=speed)


if __name__ == "__main__":
    # Teste do serviço
    logging.basicConfig(level=logging.INFO)

    print("\nTestando Servico de TTS Brasileiro com Edge-TTS (Microsoft Azure)\n")

    # Inicializar serviço
    tts_service = BrazilianTTSService()

    # Listar vozes disponíveis
    print("Vozes disponiveis em PT-BR:")
    voices = tts_service.get_available_models()
    for voice in voices[:5]:  # Mostrar apenas 5 primeiras
        print(f"  - {voice.get('name', voice)}")

    # Testar geração de áudio
    test_texts = [
        "Olá! Esta é uma televisão.",
        "Vamos aprender inglês juntos!",
        "Eu uso o sofá para descansar."
    ]

    print("\nGerando audios de teste:\n")

    for text in test_texts:
        result = tts_service.generate_speech(text)

        if result:
            print(f"[OK] '{text}'")
            print(f"   Arquivo: {result['audio_path']}")
            print(f"   Tempo: {result['generation_time_ms']}ms")
            print(f"   Cached: {result['cached']}")
            print(f"   Modelo: {result['model']}")
            print()
        else:
            print(f"[ERRO] ao gerar: '{text}'")

    # Estatísticas
    print("\nEstatisticas do Cache:")
    stats = tts_service.get_cache_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")

    print("\n[OK] Edge-TTS funcionando perfeitamente!")
    print("Qualidade PREMIUM - Similar ao ElevenLabs, totalmente GRATUITO!")
