"""
Serviço de TTS usando Coqui TTS (VITS) para Português Brasileiro
Alta qualidade, gratuito e funciona offline
"""
import os
import logging
import hashlib
import time
import re
from pathlib import Path
from typing import Optional, Dict

logger = logging.getLogger(__name__)


def remove_emojis(text: str) -> str:
    """Remove emojis do texto para compatibilidade com TTS"""
    # Remove emojis e outros caracteres especiais
    emoji_pattern = re.compile("["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
        u"\U00002702-\U000027B0"
        u"\U000024C2-\U0001F251"
        "]+", flags=re.UNICODE)
    return emoji_pattern.sub(r'', text)


class CoquiTTSService:
    """
    Serviço de Text-to-Speech usando Coqui TTS com modelo VITS
    Voz em português brasileiro de alta qualidade
    """

    def __init__(self, cache_dir: str = "./audio_cache_pt"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)

        self.tts = None
        self.model_loaded = False
        self.model_name = "tts_models/pt/cv/vits"

        logger.info("CoquiTTSService initialized (lazy loading)")

    def _load_model(self):
        """Lazy loading do modelo VITS PT-BR"""
        if self.model_loaded:
            return

        try:
            logger.info(f"Loading Coqui TTS model: {self.model_name}...")
            start_time = time.time()

            from TTS.api import TTS

            # Inicializar TTS com modelo PT-BR
            self.tts = TTS(
                model_name=self.model_name,
                gpu=False  # Usar CPU (mude para True se tiver GPU)
            )

            load_time = time.time() - start_time
            logger.info(f"✅ Model loaded successfully in {load_time:.2f}s")

            self.model_loaded = True

        except ImportError:
            logger.error("❌ TTS library not installed. Run: pip install TTS")
            raise Exception("Coqui TTS not installed. Install with: pip install TTS")
        except Exception as e:
            logger.error(f"❌ Error loading Coqui TTS model: {e}")
            raise

    def _get_cache_path(self, text: str, speed: str = "normal") -> Path:
        """Gera caminho do arquivo de cache baseado no texto"""
        # Criar hash único para o texto + velocidade
        text_hash = hashlib.md5(f"{text}_{speed}".encode()).hexdigest()
        return self.cache_dir / f"coqui_{text_hash}.wav"

    def generate_speech(
        self,
        text: str,
        speed: float = 1.0,
        use_cache: bool = True
    ) -> Optional[Dict]:
        """
        Gera áudio em português brasileiro usando Coqui TTS

        Args:
            text: Texto para sintetizar
            speed: Velocidade da fala (0.5 = lento, 1.0 = normal, 1.5 = rápido)
            use_cache: Se True, verifica cache antes de gerar

        Returns:
            Dict com informações do áudio gerado ou None se falhar
        """
        if not text or not text.strip():
            logger.warning("Empty text provided")
            return None

        # Remover emojis para compatibilidade com Windows/TTS
        text_clean = remove_emojis(text).strip()
        if not text_clean:
            logger.warning("Text contains only emojis, nothing to synthesize")
            return None

        start_time = time.time()

        # Normalizar velocidade
        speed_label = "normal"
        if speed < 0.9:
            speed_label = "slow"
        elif speed > 1.1:
            speed_label = "fast"

        # Verificar cache
        cache_path = self._get_cache_path(text_clean, speed_label)

        if use_cache and cache_path.exists():
            logger.info(f"Cache hit for: '{text_clean[:50]}...' (speed: {speed_label})")

            file_size = cache_path.stat().st_size

            return {
                "audio_path": str(cache_path),
                "audio_url": f"http://localhost:8000/audio_cache_pt/{cache_path.name}",
                "text": text_clean,
                "cached": True,
                "generation_time_ms": 0,
                "file_size": file_size,
                "model": self.model_name,
                "engine": "coqui-tts-vits"
            }

        # Gerar novo áudio
        try:
            # Carregar modelo (lazy loading)
            self._load_model()

            logger.info(f"Generating audio for text (speed: {speed})")

            # Gerar áudio com Coqui TTS
            self.tts.tts_to_file(
                text=text_clean,
                file_path=str(cache_path),
                speed=speed
            )

            generation_time = int((time.time() - start_time) * 1000)
            file_size = cache_path.stat().st_size if cache_path.exists() else 0

            logger.info(f"Audio generated in {generation_time}ms ({file_size} bytes)")

            return {
                "audio_path": str(cache_path),
                "audio_url": f"http://localhost:8000/audio_cache_pt/{cache_path.name}",
                "text": text_clean,
                "cached": False,
                "generation_time_ms": generation_time,
                "file_size": file_size,
                "model": self.model_name,
                "engine": "coqui-tts-vits"
            }

        except Exception as e:
            logger.error(f"Error generating audio with Coqui TTS: {str(e)[:100]}")
            return None

    def clear_cache(self) -> int:
        """
        Limpa cache de áudios gerados

        Returns:
            Número de arquivos removidos
        """
        count = 0
        for file in self.cache_dir.glob("coqui_*.wav"):
            try:
                file.unlink()
                count += 1
            except Exception as e:
                logger.error(f"Error removing {file}: {e}")

        logger.info(f"Removed {count} cached audio files")
        return count

    def get_cache_stats(self) -> Dict:
        """
        Retorna estatísticas do cache

        Returns:
            Dict com estatísticas
        """
        cache_files = list(self.cache_dir.glob("coqui_*.wav"))
        total_size = sum(f.stat().st_size for f in cache_files)

        return {
            "total_files": len(cache_files),
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "cache_dir": str(self.cache_dir),
            "model_loaded": self.model_loaded,
            "model_name": self.model_name
        }

    def pre_generate_common_words(self, words: list) -> Dict:
        """
        Pré-gera áudios para palavras comuns
        Útil para melhorar performance em produção

        Args:
            words: Lista de palavras para pré-gerar

        Returns:
            Dict com estatísticas de geração
        """
        logger.info(f"Pre-generating audio for {len(words)} words...")

        success = 0
        failed = 0
        cached = 0

        for word in words:
            result = self.generate_speech(word, use_cache=True)
            if result:
                if result["cached"]:
                    cached += 1
                else:
                    success += 1
            else:
                failed += 1

        stats = {
            "total_words": len(words),
            "newly_generated": success,
            "already_cached": cached,
            "failed": failed
        }

        logger.info(f"Pre-generation complete: {stats}")
        return stats


# Singleton global
_coqui_tts_instance = None


def get_coqui_tts(cache_dir: str = "./audio_cache_pt") -> CoquiTTSService:
    """
    Retorna instância singleton do CoquiTTSService
    """
    global _coqui_tts_instance

    if _coqui_tts_instance is None:
        _coqui_tts_instance = CoquiTTSService(cache_dir=cache_dir)

    return _coqui_tts_instance
