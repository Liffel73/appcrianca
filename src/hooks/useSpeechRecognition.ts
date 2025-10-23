/**
 * Hook de Reconhecimento de Voz para React Native
 * Grava áudio e envia para Whisper no backend
 * 
 * Features:
 * - Gravação de até 6 segundos
 * - Conversão para base64
 * - Integração com Whisper
 * - Feedback visual e sonoro
 * - Tratamento de erros robusto
 */

import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { Alert, Platform } from 'react-native';

const API_BASE = 'http://localhost:8000';

interface UseSpeechRecognitionOptions {
  language?: 'pt' | 'en';
  maxDuration?: number; // em milissegundos
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
}

interface UseSpeechRecognitionReturn {
  // Estados
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string | null;
  error: string | null;
  recordingDuration: number;
  
  // Funções
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
  resetTranscript: () => void;
}

/**
 * Hook principal para reconhecimento de voz
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    language = 'pt',
    maxDuration = 6000, // 6 segundos padrão
    onTranscript,
    onError
  } = options;

  // Estados
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  /**
   * Configurar permissões de áudio
   */
  const setupAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });
    } catch (err) {
      console.error('[SpeechRecognition] Erro ao configurar áudio:', err);
    }
  };

  /**
   * Converter arquivo para base64
   */
  const fileToBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (err) {
      console.error('[SpeechRecognition] Erro ao converter para base64:', err);
      throw new Error('Falha ao processar áudio');
    }
  };

  /**
   * Iniciar gravação
   */
  const startRecording = useCallback(async () => {
    try {
      console.log('[SpeechRecognition] 🎤 Iniciando gravação...');
      
      // Reset estados
      setError(null);
      setTranscript(null);
      setRecordingDuration(0);
      
      // Verificar permissões
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        const errorMsg = 'Permissão de microfone negada';
        setError(errorMsg);
        onError?.(new Error(errorMsg));
        Alert.alert(
          'Permissão Necessária',
          'Por favor, permita o acesso ao microfone nas configurações do app.'
        );
        return;
      }

      // Configurar modo de áudio
      await setupAudioMode();

      // Parar gravação anterior se houver
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (err) {
          console.warn('[SpeechRecognition] Aviso ao parar gravação anterior:', err);
        }
      }

      // Criar nova gravação com qualidade alta
      const recording = new Audio.Recording();
      
      // Opções de gravação otimizadas para Whisper
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        }
      };

      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();
      
      recordingRef.current = recording;
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      console.log('[SpeechRecognition] ✅ Gravação iniciada');

      // Timer para atualizar duração
      durationTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setRecordingDuration(Math.floor(elapsed / 1000));
      }, 100);

      // Auto-stop após maxDuration
      recordingTimerRef.current = setTimeout(async () => {
        console.log('[SpeechRecognition] ⏱️ Tempo máximo atingido, parando...');
        await stopRecording();
      }, maxDuration);

    } catch (err) {
      console.error('[SpeechRecognition] ❌ Erro ao iniciar gravação:', err);
      const errorMsg = 'Falha ao iniciar gravação';
      setError(errorMsg);
      setIsRecording(false);
      onError?.(err as Error);
      Alert.alert('Erro', errorMsg);
    }
  }, [maxDuration, onError]);

  /**
   * Parar gravação e processar
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recordingRef.current || !isRecording) {
        console.warn('[SpeechRecognition] Nenhuma gravação ativa para parar');
        return null;
      }

      console.log('[SpeechRecognition] 🛑 Parando gravação...');
      setIsRecording(false);
      setIsProcessing(true);

      // Limpar timers
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      // Parar gravação
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('Nenhum arquivo de áudio foi gerado');
      }

      console.log('[SpeechRecognition] 📁 Arquivo salvo em:', uri);

      // Converter para base64
      console.log('[SpeechRecognition] 🔄 Convertendo para base64...');
      const base64Audio = await fileToBase64(uri);
      
      // Criar formato compatível com o backend (WebM base64)
      const audioData = `data:audio/webm;base64,${base64Audio}`;

      // Enviar para o backend
      console.log('[SpeechRecognition] 📡 Enviando para Whisper...');
      const endpoint = language === 'pt' ? '/speech-to-text-pt' : '/speech-to-text';
      
      const response = await axios.post(
        `${API_BASE}${endpoint}`,
        { audio: audioData },
        { 
          timeout: 30000, // 30 segundos de timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const { transcript: text } = response.data;
      
      console.log('[SpeechRecognition] ✅ Transcrição recebida:', text);
      setTranscript(text);
      setIsProcessing(false);
      onTranscript?.(text);

      // Limpar arquivo temporário
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (err) {
        console.warn('[SpeechRecognition] Aviso ao deletar arquivo temporário:', err);
      }

      return text;

    } catch (err) {
      console.error('[SpeechRecognition] ❌ Erro ao processar gravação:', err);
      const errorMsg = axios.isAxiosError(err) 
        ? err.response?.data?.detail || 'Erro ao transcrever áudio'
        : 'Falha no processamento do áudio';
      
      setError(errorMsg);
      setIsProcessing(false);
      onError?.(err as Error);
      
      Alert.alert('Erro', errorMsg);
      return null;
    }
  }, [isRecording, language, onTranscript, onError]);

  /**
   * Cancelar gravação sem processar
   */
  const cancelRecording = useCallback(() => {
    console.log('[SpeechRecognition] ❌ Cancelando gravação...');
    
    // Limpar timers
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    // Parar gravação se estiver ativa
    if (recordingRef.current && isRecording) {
      recordingRef.current.stopAndUnloadAsync().catch(err => {
        console.warn('[SpeechRecognition] Aviso ao cancelar gravação:', err);
      });
      recordingRef.current = null;
    }

    setIsRecording(false);
    setIsProcessing(false);
    setRecordingDuration(0);
    setError(null);
  }, [isRecording]);

  /**
   * Resetar transcrição
   */
  const resetTranscript = useCallback(() => {
    setTranscript(null);
    setError(null);
    setRecordingDuration(0);
  }, []);

  return {
    // Estados
    isRecording,
    isProcessing,
    transcript,
    error,
    recordingDuration,
    
    // Funções
    startRecording,
    stopRecording,
    cancelRecording,
    resetTranscript,
  };
}

/**
 * Componente de botão de gravação reutilizável
 */
export { RecordButton } from './RecordButton';

// Exportar tipos
export type { 
  UseSpeechRecognitionOptions, 
  UseSpeechRecognitionReturn 
};
