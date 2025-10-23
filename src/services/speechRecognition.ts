/**
 * Speech Recognition Service
 * Sistema de reconhecimento de voz usando Whisper via backend
 * 
 * Funcionalidades:
 * - Gravação de áudio até 6 segundos
 * - Conversão para base64
 * - Transcrição via Whisper
 * - Fallback para reconhecimento nativo
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export interface SpeechRecognitionOptions {
  language?: 'pt-BR' | 'en-US';
  maxDuration?: number; // em segundos
  useWhisper?: boolean; // usar Whisper ou nativo
}

export class SpeechRecognitionService {
  private recording: Audio.Recording | null = null;
  private recordingTimeout: NodeJS.Timeout | null = null;
  private isRecording = false;

  /**
   * Solicita permissões de áudio
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[STT] Erro ao solicitar permissões:', error);
      return false;
    }
  }

  /**
   * Inicia gravação de áudio
   */
  async startRecording(options: SpeechRecognitionOptions = {}): Promise<void> {
    const {
      language = 'pt-BR',
      maxDuration = 6000, // 6 segundos padrão
      useWhisper = true
    } = options;

    try {
      // Verificar permissões
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Permissão de microfone negada');
      }

      // Parar gravação anterior se houver
      if (this.isRecording) {
        await this.stopRecording();
      }

      console.log('[STT] 🎤 Iniciando gravação...');

      // Configurar modo de áudio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Criar e preparar gravação
      const recording = new Audio.Recording();
      
      // Configurações otimizadas para Whisper
      const recordingOptions = {
        android: {
          extension: '.webm',
          outputFormat: Audio.AndroidOutputFormat.WEBM,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      this.recording = recording;
      this.isRecording = true;

      // Auto-stop após maxDuration
      this.recordingTimeout = setTimeout(async () => {
        console.log(`[STT] ⏱️ Tempo máximo de ${maxDuration}ms atingido`);
        await this.stopRecording();
      }, maxDuration);

      console.log('[STT] 🔴 Gravação iniciada');
    } catch (error) {
      console.error('[STT] ❌ Erro ao iniciar gravação:', error);
      this.isRecording = false;
      throw error;
    }
  }

  /**
   * Para gravação e retorna transcrição
   */
  async stopRecording(): Promise<string | null> {
    if (!this.recording || !this.isRecording) {
      console.log('[STT] Nenhuma gravação ativa');
      return null;
    }

    try {
      console.log('[STT] 🛑 Parando gravação...');

      // Limpar timeout
      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
        this.recordingTimeout = null;
      }

      // Parar gravação
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.isRecording = false;

      if (!uri) {
        throw new Error('URI do áudio não disponível');
      }

      console.log('[STT] 📁 Áudio salvo em:', uri);

      // Converter para base64
      const base64Audio = await this.convertToBase64(uri);
      
      // Enviar para transcrição
      const transcript = await this.transcribeWithWhisper(base64Audio);

      // Limpar arquivo temporário
      await FileSystem.deleteAsync(uri, { idempotent: true });

      this.recording = null;
      
      return transcript;
    } catch (error) {
      console.error('[STT] ❌ Erro ao parar gravação:', error);
      this.recording = null;
      this.isRecording = false;
      throw error;
    }
  }

  /**
   * Cancela gravação sem processar
   */
  async cancelRecording(): Promise<void> {
    if (!this.recording) return;

    try {
      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
        this.recordingTimeout = null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }

      this.recording = null;
      this.isRecording = false;
      
      console.log('[STT] 🚫 Gravação cancelada');
    } catch (error) {
      console.error('[STT] Erro ao cancelar gravação:', error);
      this.recording = null;
      this.isRecording = false;
    }
  }

  /**
   * Converte arquivo de áudio para base64
   */
  private async convertToBase64(uri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Adicionar prefixo do tipo MIME baseado na plataforma
      const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/webm';
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('[STT] Erro ao converter para base64:', error);
      throw error;
    }
  }

  /**
   * Envia áudio para transcrição com Whisper
   */
  private async transcribeWithWhisper(base64Audio: string): Promise<string> {
    try {
      console.log('[STT] 📤 Enviando para Whisper...');

      const response = await axios.post(
        `${API_BASE}/speech-to-text-pt`,
        { audio: base64Audio },
        {
          timeout: 30000, // 30 segundos de timeout
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const transcript = response.data.transcript;
      console.log('[STT] ✅ Transcrição:', transcript);
      
      return transcript;
    } catch (error) {
      console.error('[STT] ❌ Erro na transcrição:', error);
      
      // Fallback: retornar mensagem de erro amigável
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Servidor de transcrição offline. Verifique se o backend está rodando.');
        }
        if (error.response?.status === 500) {
          throw new Error('Erro no servidor de transcrição. Tente novamente.');
        }
      }
      
      throw new Error('Não foi possível transcrever o áudio');
    }
  }

  /**
   * Verifica se está gravando
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Status da gravação para debug
   */
  getStatus(): {
    isRecording: boolean;
    hasRecording: boolean;
    recordingDuration?: number;
  } {
    return {
      isRecording: this.isRecording,
      hasRecording: this.recording !== null,
      recordingDuration: this.recording ? this.recording._finalDurationMillis : undefined,
    };
  }
}

// Singleton para uso global
export const speechRecognition = new SpeechRecognitionService();

// Hook para React
import { useState, useCallback, useEffect } from 'react';

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Solicitar permissões ao montar
    speechRecognition.requestPermissions();
  }, []);

  const startRecording = useCallback(async (options?: SpeechRecognitionOptions) => {
    try {
      setError(null);
      setTranscript('');
      setIsRecording(true);
      
      await speechRecognition.startRecording(options);
    } catch (err) {
      setIsRecording(false);
      setError(err instanceof Error ? err.message : 'Erro ao iniciar gravação');
      console.error('[Hook] Erro ao iniciar:', err);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return null;

    try {
      setIsProcessing(true);
      const result = await speechRecognition.stopRecording();
      
      if (result) {
        setTranscript(result);
      }
      
      setIsRecording(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao parar gravação');
      console.error('[Hook] Erro ao parar:', err);
      return null;
    } finally {
      setIsProcessing(false);
      setIsRecording(false);
    }
  }, [isRecording]);

  const cancelRecording = useCallback(async () => {
    try {
      await speechRecognition.cancelRecording();
      setIsRecording(false);
      setTranscript('');
      setError(null);
    } catch (err) {
      console.error('[Hook] Erro ao cancelar:', err);
    }
  }, []);

  return {
    // Estados
    isRecording,
    isProcessing,
    transcript,
    error,
    
    // Ações
    startRecording,
    stopRecording,
    cancelRecording,
    
    // Utils
    clearTranscript: () => setTranscript(''),
    clearError: () => setError(null),
  };
}

export default speechRecognition;