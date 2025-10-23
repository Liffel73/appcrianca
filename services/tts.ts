import { Audio } from 'expo-av';

class TTSService {
  private sound: Audio.Sound | null = null;

  constructor() {
    // Inicializar o serviço de áudio
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }

  async speak(text: string, language: 'en' | 'pt') {
    try {
      // Parar qualquer áudio em reprodução
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // Fazer requisição para o servidor local
      const response = await fetch('http://localhost:3001/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar áudio');
      }

      // Obter o blob de áudio
      const audioBlob = await response.blob();
      
      // Converter blob para base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(audioBlob);
      });

      // Criar URI temporário para o áudio
      const uri = `data:audio/mp3;base64,${base64Audio}`;
      
      // Reproduzir o áudio
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      this.sound = sound;

      // Limpar após reprodução
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          await sound.unloadAsync();
          this.sound = null;
        }
      });

    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
    }
  }

  async stop() {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      } catch (error) {
        console.error('Erro ao parar áudio:', error);
      }
    }
  }
}

export const tts = new TTSService();
