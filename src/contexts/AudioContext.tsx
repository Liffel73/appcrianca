/**
 * AudioContext - Gerenciamento global de áudio para React Native
 *
 * Funcionalidades:
 * - Text-to-Speech usando expo-speech e Edge TTS
 * - Reprodução de áudio usando expo-av
 * - Gerenciamento de múltiplos áudios
 * - Sistema de karaoke (highlight de palavras)
 * - Controle centralizado (parar tudo)
 */

import React, { createContext, useContext, useRef, useCallback, useState } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

interface AudioContextType {
  // Estado
  isSpeaking: boolean;
  currentWord: string | null;

  // Funções principais
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stopAll: () => void;

  // Karaoke
  registerKaraokeTimeout: (messageId: string, timeout: NodeJS.Timeout) => void;
  clearKaraokeTimeouts: (messageId: string) => void;
}

interface SpeakOptions {
  voice?: 'en-US-AvaNeural' | 'pt-BR-FranciscaNeural';
  speed?: 'slow' | 'normal' | 'fast';
  useBackend?: boolean; // Se true, usa Edge TTS; se false, usa expo-speech
  onWordHighlight?: (word: string, index: number) => void;
  onComplete?: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Refs para gerenciar áudios ativos
  const soundRef = useRef<Audio.Sound | null>(null);
  const karaokeTimeoutsRef = useRef<{ [key: string]: NodeJS.Timeout[] }>({});

  // Inicializar módulo de áudio ao montar
  React.useEffect(() => {
    const initAudio = async () => {
      try {
        console.log('[AudioManager] 🎵 Inicializando módulo de áudio...');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        setAudioInitialized(true);
        console.log('[AudioManager] ✅ Módulo de áudio inicializado!');
      } catch (error) {
        console.error('[AudioManager] ❌ Erro ao inicializar áudio:', error);
      }
    };

    initAudio();
  }, []);

  /**
   * Parar TUDO: áudios + speech + karaoke timeouts
   */
  const stopAll = useCallback(() => {
    console.log('[AudioManager] 🛑 Parando todos os áudios...');

    // 1. Parar áudio expo-av
    if (soundRef.current) {
      try {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      } catch (e) {
        console.warn('[AudioManager] ⚠️ Erro ao parar áudio:', e);
      }
    }

    // 2. Parar expo-speech
    try {
      Speech.stop();
    } catch (e) {
      console.warn('[AudioManager] ⚠️ Erro ao parar speech:', e);
    }

    // 3. Limpar todos os timeouts de karaoke
    const timeoutCount = Object.keys(karaokeTimeoutsRef.current).length;
    if (timeoutCount > 0) {
      console.log(`[AudioManager] Limpando ${timeoutCount} grupo(s) de karaoke`);
      Object.values(karaokeTimeoutsRef.current).forEach(timeouts => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      });
      karaokeTimeoutsRef.current = {};
    }

    setIsSpeaking(false);
    setCurrentWord(null);
    console.log('[AudioManager] ✅ Todos os áudios parados!');
  }, []);

  /**
   * Função principal de fala
   */
  const speak = useCallback(async (text: string, options: SpeakOptions = {}) => {
    const {
      voice = 'en-US-AvaNeural',
      speed = 'normal',
      useBackend = true,
      onWordHighlight,
      onComplete,
    } = options;

    // Parar qualquer áudio em andamento
    stopAll();

    setIsSpeaking(true);

    try {
      if (useBackend) {
        // Usar Edge TTS via backend
        console.log('[AudioManager] 🎤 Usando Edge TTS:', text);

        const response = await axios.post(
          `${API_BASE}/speak-word`,
          { word: text, voice, speed },
          { timeout: 10000 }
        );

        if (response.data?.audio_url) {
          // Carregar e tocar áudio
          const { sound } = await Audio.Sound.createAsync(
            { uri: response.data.audio_url },
            { shouldPlay: true }
          );

          soundRef.current = sound;

          // Configurar callback de fim
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsSpeaking(false);
              onComplete?.();
            }
          });

          // Sistema de karaoke (se houver callback)
          if (onWordHighlight && response.data.word_timings) {
            const messageId = Date.now().toString();
            response.data.word_timings.forEach((timing: any, index: number) => {
              const timeout = setTimeout(() => {
                onWordHighlight(timing.word, index);
                setCurrentWord(timing.word);
              }, timing.start * 1000);

              registerKaraokeTimeout(messageId, timeout);
            });
          }
        } else {
          throw new Error('Audio URL not returned from backend');
        }
      } else {
        // Fallback: usar expo-speech
        console.log('[AudioManager] 🔊 Usando expo-speech:', text);

        const rate = speed === 'slow' ? 0.6 : speed === 'fast' ? 1.2 : 0.85;
        const language = voice.startsWith('en-') ? 'en-US' : 'pt-BR';

        await Speech.speak(text, {
          language,
          rate,
          pitch: 1.0,
          onDone: () => {
            setIsSpeaking(false);
            onComplete?.();
          },
          onError: (error) => {
            console.error('[AudioManager] ❌ Erro no speech:', error);
            setIsSpeaking(false);
          },
        });
      }
    } catch (error) {
      console.error('[AudioManager] ❌ Erro ao falar:', error);

      // Fallback final: tentar expo-speech
      try {
        console.log('[AudioManager] 🔄 Tentando fallback com expo-speech...');
        const rate = speed === 'slow' ? 0.6 : speed === 'fast' ? 1.2 : 0.85;
        const language = voice.startsWith('en-') ? 'en-US' : 'pt-BR';

        await Speech.speak(text, {
          language,
          rate,
          pitch: 1.0,
          onDone: () => {
            setIsSpeaking(false);
            onComplete?.();
          },
        });
      } catch (fallbackError) {
        console.error('[AudioManager] ❌ Fallback falhou:', fallbackError);
        setIsSpeaking(false);
      }
    }
  }, [stopAll]);

  /**
   * Registrar timeout de karaoke
   */
  const registerKaraokeTimeout = useCallback((messageId: string, timeout: NodeJS.Timeout) => {
    if (!karaokeTimeoutsRef.current[messageId]) {
      karaokeTimeoutsRef.current[messageId] = [];
    }
    karaokeTimeoutsRef.current[messageId].push(timeout);
  }, []);

  /**
   * Limpar timeouts de uma mensagem específica
   */
  const clearKaraokeTimeouts = useCallback((messageId: string) => {
    if (karaokeTimeoutsRef.current[messageId]) {
      karaokeTimeoutsRef.current[messageId].forEach(timeout => clearTimeout(timeout));
      delete karaokeTimeoutsRef.current[messageId];
    }
  }, []);

  const value: AudioContextType = {
    isSpeaking,
    currentWord,
    speak,
    stopAll,
    registerKaraokeTimeout,
    clearKaraokeTimeouts,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

/**
 * Hook para usar o AudioManager
 */
export function useAudioManager() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioManager deve ser usado dentro de AudioProvider');
  }
  return context;
}
