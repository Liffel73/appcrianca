"""
Serviço de TTS Brasileiro usando Piper TTS
Alternativa leve e rápida ao Coqui TTS, funciona perfeitamente no Windows
"""
import os
import hashlib
import logging
import subprocess
import platform
from pathlib import Path
from typing import Optional, Dict
import time

logger = logging.getLogger(__name__)


class PiperTTSService:
    """Serviço de Text-to-Speech em Português Brasileiro usando Piper"""

    def __init__(self, cache_dir: str = "./audio_cache_pt"):
        """
        Inicializa o serviço de TTS brasileiro com Piper

        Args:
            cache_dir: Diretório para cache de áudios
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Configurar caminho do Piper baseado no sistema operacional
        self.piper_executable = self._find_piper_executable()
        self.model_path = None
        self.config_path = None

        # Modelo recomendado para PT-BR
        self.model_name = "pt_BR-faber-medium"

        if self.piper_executable:
            logger.info(f"✅ Piper TTS encontrado: {self.piper_executable}")
        else:
            logger.warning("⚠️  Piper TTS não encontrado. Instale primeiro.")

    def _find_piper_executable(self) -> Optional[Path]:
        """
        Procura pelo executável do Piper no sistema

        Returns:
            Caminho do executável ou None
        """
        # Possíveis locais do Piper
        possible_paths = [
            Path("./piper/piper.exe"),  # Windows local
            Path("./piper/piper"),  # Linux/Mac local
            Path("C:/piper/piper.exe"),  # Windows global
            Path("/usr/local/bin/piper"),  # Linux/Mac global
        ]

        for path in possible_paths:
            if path.exists():
                return path

        # Verificar se está no PATH
        try:
            result = subprocess.run(
                ["piper", "--version"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                return Path("piper")  # Está no PATH
        except FileNotFoundError:
            pass

        return None

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
        return self.cache_dir / f"piper_pt_{text_hash}.wav"

    def _is_cached(self, cache_path: Path) -> bool:
        """Verifica se áudio está em cache"""
        return cache_path.exists() and cache_path.stat().st_size > 0

    def download_model(self) -> bool:
        """
        Baixa modelo PT-BR do Piper (se necessário)

        Returns:
            True se modelo está disponível
        """
        # Modelos Piper são baixados separadamente
        # Você pode baixar de: https://github.com/rhasspy/piper/releases

        models_dir = Path("./piper_models")
        models_dir.mkdir(exist_ok=True)

        # Procurar modelo PT-BR
        possible_models = list(models_dir.glob("pt_BR-*.onnx"))

        if possible_models:
            self.model_path = possible_models[0]
            # Procurar arquivo de config
            config_name = self.model_path.stem + ".onnx.json"
            self.config_path = models_dir / config_name

            logger.info(f"✅ Modelo encontrado: {self.model_path.name}")
            return True

        logger.warning("⚠️  Modelo PT-BR não encontrado em ./piper_models/")
        logger.info("Baixe de: https://github.com/rhasspy/piper/releases")
        return False

    def generate_speech(
        self,
        text: str,
        speed: float = 1.0,
        use_cache: bool = True
    ) -> Optional[Dict]:
        """
        Gera áudio de fala em português brasileiro

        Args:
            text: Texto a ser convertido em fala
            speed: Velocidade da fala (0.5 a 2.0)
            use_cache: Se deve usar cache

        Returns:
            Dict com informações do áudio gerado
        """
        if not self.piper_executable:
            logger.error("❌ Piper TTS não está instalado")
            return None

        # Baixar modelo se necessário
        if not self.model_path:
            if not self.download_model():
                logger.error("❌ Modelo PT-BR não disponível")
                return None

        start_time = time.time()

        # Verificar cache
        cache_path = self._get_cache_path(text, speed)

        if use_cache and self._is_cached(cache_path):
            logger.info(f"✅ Áudio encontrado em cache: {cache_path.name}")
            generation_time = int((time.time() - start_time) * 1000)

            return {
                "audio_path": str(cache_path),
                "audio_url": f"/audio_cache_pt/{cache_path.name}",
                "text": text,
                "cached": True,
                "generation_time_ms": generation_time,
                "model": self.model_name
            }

        # Gerar novo áudio com Piper
        try:
            logger.info(f"🎤 Gerando áudio com Piper: '{text}'")

            # Comando Piper
            # echo "texto" | piper --model modelo.onnx --output_file saida.wav
            cmd = [
                str(self.piper_executable),
                "--model", str(self.model_path),
                "--output_file", str(cache_path)
            ]

            # Adicionar velocidade se suportado
            if speed != 1.0:
                cmd.extend(["--length_scale", str(1.0 / speed)])

            # Executar Piper
            result = subprocess.run(
                cmd,
                input=text,
                text=True,
                capture_output=True,
                timeout=30
            )

            if result.returncode != 0:
                logger.error(f"❌ Erro do Piper: {result.stderr}")
                return None

            generation_time = int((time.time() - start_time) * 1000)

            logger.info(f"✅ Áudio gerado com sucesso em {generation_time}ms")

            return {
                "audio_path": str(cache_path),
                "audio_url": f"/audio_cache_pt/{cache_path.name}",
                "text": text,
                "cached": False,
                "generation_time_ms": generation_time,
                "model": self.model_name,
                "file_size": cache_path.stat().st_size
            }

        except subprocess.TimeoutExpired:
            logger.error("❌ Timeout ao gerar áudio")
            return None
        except Exception as e:
            logger.error(f"❌ Erro ao gerar áudio: {e}")
            return None

    def clear_cache(self) -> Dict:
        """Limpa cache de áudios"""
        try:
            files = list(self.cache_dir.glob("*.wav"))
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
        """Obtém estatísticas do cache"""
        try:
            files = list(self.cache_dir.glob("*.wav"))
            total_size = sum(f.stat().st_size for f in files)

            return {
                "cache_dir": str(self.cache_dir),
                "total_files": len(files),
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "model": self.model_name,
                "piper_available": self.piper_executable is not None,
                "model_available": self.model_path is not None
            }
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas: {e}")
            return {"error": str(e)}


# Instância global (singleton)
_piper_tts_instance = None


def get_piper_tts() -> PiperTTSService:
    """
    Obtém instância singleton do serviço de TTS brasileiro

    Returns:
        PiperTTSService
    """
    global _piper_tts_instance

    if _piper_tts_instance is None:
        _piper_tts_instance = PiperTTSService()

    return _piper_tts_instance


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
    tts = get_piper_tts()
    return tts.generate_speech(text, speed=speed)


if __name__ == "__main__":
    # Teste do serviço
    logging.basicConfig(level=logging.INFO)

    print("\n🇧🇷 Testando Serviço de TTS Brasileiro com Piper\n")

    # Inicializar serviço
    tts_service = PiperTTSService()

    # Verificar instalação
    if not tts_service.piper_executable:
        print("❌ Piper não encontrado!")
        print("\n📥 Como instalar:")
        print("1. Baixe o Piper de: https://github.com/rhasspy/piper/releases")
        print("2. Extraia para ./piper/")
        print("3. Baixe um modelo PT-BR de: https://huggingface.co/rhasspy/piper-voices")
        print("4. Coloque em ./piper_models/")
        exit(1)

    # Baixar modelo
    if not tts_service.download_model():
        print("❌ Modelo PT-BR não disponível")
        exit(1)

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
