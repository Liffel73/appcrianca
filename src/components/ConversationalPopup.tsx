/**
 * ConversationalPopup - VERSÃO COMPLETA
 * Chat AI Interativo com todos os recursos migrados do web
 *
 * Funcionalidades completas:
 * ✅ Speech-to-Text com Whisper
 * ✅ Sistema de karaoke sincronizado
 * ✅ Cache inteligente
 * ✅ ExerciseMode integrado
 * ✅ GameMode integrado
 * ✅ API service centralizada
 * ✅ Avatar com animações
 * ✅ Histórico de conversas
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useAudioManager } from '../contexts/AudioContext';
import { useCache } from '../contexts/CacheContext';
import { useSpeechRecognition } from '../services/speechRecognition';
import apiService from '../services/api';
import KaraokeText from './KaraokeText';
import ExerciseMode from './ExerciseMode';
import GameMode from './GameMode';

const { width, height } = Dimensions.get('window');

interface Message {
  id: number;
  type: 'user' | 'bot';
  content: string;
  buttons?: string[];
  examples?: Array<{ phrase_pt: string; phrase_en: string }>;
  suggestions?: string[];
  audio?: boolean;
  audioUrl?: string;
  audioDuration?: number;
  isPlayingAudio?: boolean;
  timestamp: number;
}

interface ConversationalPopupProps {
  object: {
    word: string;
    translation: string;
    id?: string;
    room?: string;
    environment?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  relatedWords?: Array<{ word: string; translation: string }>;
}

export default function ConversationalPopup({
  object,
  isOpen,
  onClose,
  relatedWords = []
}: ConversationalPopupProps) {
  // Contexts
  const audioManager = useAudioManager();
  const cache = useCache();

  // Verificar se os contextos estão disponíveis
  useEffect(() => {
    console.log('[ConversationalPopup] 🔍 Verificando contextos...');
    console.log('[ConversationalPopup] audioManager:', !!audioManager);
    console.log('[ConversationalPopup] cache:', !!cache);
    console.log('[ConversationalPopup] cache.getCachedAIResponse:', typeof cache?.getCachedAIResponse);
  }, []);
  
  // Speech Recognition
  const {
    isRecording,
    isProcessing,
    transcript,
    error: sttError,
    startRecording,
    stopRecording,
    cancelRecording,
    clearTranscript,
  } = useSpeechRecognition();

  // Estados principais
  const [step, setStep] = useState<'intro' | 'chat'>('intro');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  
  // Estados de áudio e karaoke
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [audioDurations, setAudioDurations] = useState<Map<number, number>>(new Map());
  
  // Estados de modos especiais
  const [showExerciseMode, setShowExerciseMode] = useState(false);
  const [showGameMode, setShowGameMode] = useState(false);
  
  // Avatar
  const [avatarExpression, setAvatarExpression] = useState<
    'neutral' | 'happy' | 'thinking' | 'excited' | 'encouraging' | 'surprised' | 'speaking'
  >('neutral');
  
  // Estatísticas
  const [wordsLearned, setWordsLearned] = useState(0);
  const [userScore, setUserScore] = useState(0);
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const messageIdCounter = useRef(0);

  // ============================================================================
  // INICIALIZAÇÃO E LIMPEZA
  // ============================================================================

  useEffect(() => {
    // PROTEÇÃO MÁXIMA NO USEEFFECT
    try {
      console.log('[ConversationalPopup] useEffect triggered:', {
        isOpen,
        hasObject: !!object,
        objectWord: object?.word,
      });

      if (!isOpen || !object || !object.word || !object.translation) {
        console.log('[ConversationalPopup] ⏭️ Pulando loadIntroduction (condições não atendidas)', {
          isOpen,
          hasObject: !!object,
          hasWord: !!object?.word,
          hasTranslation: !!object?.translation
        });
        return;
      }

      console.log('[ConversationalPopup] ✅ Condições OK, iniciando loadIntroduction para:', object.word);

      // Chamar IMEDIATAMENTE, sem setTimeout
      console.log('[ConversationalPopup] 🔜 Chamando loadIntroduction...');

      loadIntroduction().catch((err) => {
        console.error('[ConversationalPopup] ❌ PROMISE REJECTED:', err);
        console.error('[ConversationalPopup] ❌ Stack:', err?.stack);
      });

      console.log('[ConversationalPopup] ✅ loadIntroduction() chamado (aguardando execução)');

    } catch (effectError) {
      console.error('[ConversationalPopup] ❌ Erro no useEffect:', effectError);
      console.error('[ConversationalPopup] ❌ Stack:', effectError?.stack);
    }

    return () => {
      try {
        console.log('[ConversationalPopup] 🧹 Cleanup iniciado');
        // Limpar ao fechar
        audioManager?.stopAll();
        if (isRecording) {
          cancelRecording();
        }
        console.log('[ConversationalPopup] ✅ Cleanup concluído');
      } catch (cleanupError) {
        console.error('[ConversationalPopup] ❌ Erro no cleanup:', cleanupError);
      }
    };
  }, [isOpen, object?.word]); // Mudei dependência para object?.word ao invés de object inteiro

  // ============================================================================
  // CARREGAR INTRODUÇÃO
  // ============================================================================

  const loadIntroduction = async () => {
    // Proteção contra múltiplas chamadas
    if (isAIThinking) {
      console.log('[ConversationalPopup] ⚠️ loadIntroduction já está em execução, ignorando...');
      return;
    }

    // TRY-CATCH SUPER ROBUSTO
    let executionStep = 'inicio';
    try {
      console.log('[ConversationalPopup] 🔍 PASSO 1: Iniciando loadIntroduction para:', object.word);
      executionStep = 'setStates';

      setMessages([]);
      setStep('intro');
      setIsAIThinking(true);
      setAvatarExpression('thinking');
      console.log('[ConversationalPopup] ✅ PASSO 2: Estados definidos');

      executionStep = 'chamadaAPI';
      console.log('[ConversationalPopup] 📡 PASSO 3: Chamando API...');

      // Verificar se cache está disponível
      if (!cache || !cache.getCachedAIResponse) {
        console.error('[ConversationalPopup] ❌ Cache não está disponível');
        throw new Error('Cache context não inicializado');
      }

      // Chamar API com cache E TIMEOUT AGRESSIVO
      const apiCallPromise = cache.getCachedAIResponse(
        `intro_${object.word}`,
        JSON.stringify({ word: object.word, translation: object.translation }),
        async () => {
          console.log('[ConversationalPopup] 📡 PASSO 4: Chamando apiService.ai.generateIntro...');
          const result = await apiService.ai.generateIntro({
            object_word: object.word,
            object_translation: object.translation,
            room: object?.room || 'Living Room',
            environment: object?.environment || 'Casa',
            user_age: 10,
          });
          console.log('[ConversationalPopup] ✅ PASSO 5: API respondeu!', result);
          return result;
        }
      );

      // TIMEOUT DE 10 SEGUNDOS MÁXIMO
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          console.error('[ConversationalPopup] ⏱️ TIMEOUT: API demorou mais de 10s');
          reject(new Error('API timeout after 10 seconds'));
        }, 10000)
      );

      const intro = await Promise.race([apiCallPromise, timeoutPromise]);

      console.log('[ConversationalPopup] ✅ PASSO 8: Resposta recebida da API');

      executionStep = 'validacao';
      console.log('[ConversationalPopup] ✅ PASSO 9: Validando resposta...');
      console.log('[ConversationalPopup] 📦 Tipo da intro:', typeof intro);
      console.log('[ConversationalPopup] 📦 Keys da intro:', intro ? Object.keys(intro) : 'null');

      // Validar se intro_text existe
      if (!intro || typeof intro !== 'object') {
        console.error('[ConversationalPopup] ❌ Resposta não é um objeto:', intro);
        throw new Error('Resposta da API inválida: não é um objeto');
      }

      if (!intro.intro_text || typeof intro.intro_text !== 'string') {
        console.error('[ConversationalPopup] ❌ intro_text não encontrado ou inválido');
        console.error('[ConversationalPopup] 📦 Resposta completa:', JSON.stringify(intro, null, 2));
        throw new Error('Resposta da API inválida: intro_text não encontrado');
      }

      executionStep = 'criacaoMensagem';
      console.log('[ConversationalPopup] ✅ PASSO 10: Criando mensagem...');

      setAvatarExpression('happy');

      const introText = intro.intro_text.replace(/🇺🇸\s*$/g, '').trim();

      if (!introText || introText.length === 0) {
        console.error('[ConversationalPopup] ❌ intro_text está vazio após limpeza');
        throw new Error('Texto da introdução está vazio');
      }

      const introMessage: Message = {
        id: generateMessageId(),
        type: 'bot',
        content: introText,
        buttons: ['Vamos aprender! 🎯', 'Exercícios 📝', 'Jogos 🎮'],
        audio: true,
        timestamp: Date.now(),
      };

      setMessages([introMessage]);
      console.log('[ConversationalPopup] ✅ PASSO 11: Mensagem de introdução criada');

      executionStep = 'audio';
      // Tocar áudio da introdução (sem bloquear se falhar)
      // NÃO ESPERAR - Deixar tocar em background
      console.log('[ConversationalPopup] 🎵 Iniciando reprodução de áudio em background...');
      playMessageAudio(introMessage).catch(audioError => {
        console.warn('[ConversationalPopup] ⚠️ Erro ao tocar áudio (ignorado):', audioError);
      });

      console.log('[ConversationalPopup] ✅ PASSO 12: Tudo concluído com sucesso!');

    } catch (error: any) {
      console.error('[Popup] ❌ ERRO ao carregar introdução (passo:', executionStep, ')');
      console.error('[Popup] ❌ Error:', error);
      console.error('[Popup] ❌ Stack:', error?.stack);
      console.error('[Popup] ❌ Message:', error?.message);

      // Fallback: Criar mensagem simples SEMPRE
      try {
        console.log('[Popup] 🔄 PASSO 10: Criando fallback...');
        setAvatarExpression('happy');

        const fallbackText = `Olá! 👋\n\nEsse é um ${object.translation}!\n\nEm inglês, dizemos: **${object.word.toUpperCase()}**\n\n💬 Vamos aprender juntos!`;

        const fallbackMessage: Message = {
          id: generateMessageId(),
          type: 'bot',
          content: fallbackText,
          buttons: ['Vamos aprender! 🎯', 'Exercícios 📝', 'Jogos 🎮'],
          audio: false,
          timestamp: Date.now(),
        };

        setMessages([fallbackMessage]);
        console.log('[ConversationalPopup] ✅ PASSO 11: Mensagem fallback criada');
      } catch (fallbackError) {
        console.error('[Popup] ❌ ERRO CRÍTICO ao criar fallback:', fallbackError);
        // Última tentativa: mensagem super simples
        try {
          setMessages([{
            id: 1,
            type: 'bot',
            content: `Vamos aprender sobre ${object.word}!`,
            buttons: ['Ok! 🎯'],
            audio: false,
            timestamp: Date.now(),
          }]);
          console.log('[Popup] ⚠️ PASSO 12: Fallback ultra-simples criado');
        } catch (lastError) {
          console.error('[Popup] ❌ FALHA TOTAL:', lastError);
        }
      }

    } finally {
      try {
        setIsAIThinking(false);
        console.log('[ConversationalPopup] 🏁 PASSO 13: loadIntroduction finalizado');
      } catch (finallyError) {
        console.error('[Popup] ❌ Erro no finally:', finallyError);
      }
    }
  };

  // ============================================================================
  // MANIPULAR CLIQUE EM BOTÕES
  // ============================================================================

  const handleButtonClick = (button: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (button.includes('aprender')) {
      startLearning();
    } else if (button.includes('Exercícios')) {
      setShowExerciseMode(true);
    } else if (button.includes('Jogos')) {
      setShowGameMode(true);
    } else if (button === 'Não') {
      onClose();
    } else {
      // Enviar como mensagem normal
      sendMessage(button);
    }
  };

  // ============================================================================
  // INICIAR MODO DE APRENDIZADO
  // ============================================================================

  const startLearning = async () => {
    setStep('chat');
    setAvatarExpression('excited');
    
    const learningMessage: Message = {
      id: generateMessageId(),
      type: 'bot',
      content: `🎉 Vamos aprender sobre ${object.translation}!\n\n📚 Em inglês, dizemos: **${object.word.toUpperCase()}**\n\n💬 Me pergunte qualquer coisa! Por exemplo:\n- "Como pronuncio isso?"\n- "Me dê exemplos com essa palavra"\n- "Como uso em uma frase?"`,
      audio: true,
      suggestions: [
        'Como pronuncio isso? 🗣️',
        'Me dê exemplos 📝',
        'Curiosidades sobre isso 🤔',
        'Palavras parecidas 🔤',
      ],
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, learningMessage]);
    setCurrentSuggestions(learningMessage.suggestions || []);
    
    // Tocar áudio
    playMessageAudio(learningMessage);
    
    // Scroll para baixo
    setTimeout(() => scrollToBottom(), 100);
  };

  // ============================================================================
  // ENVIAR MENSAGEM (TEXTO OU VOZ)
  // ============================================================================

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: generateMessageId(),
      type: 'user',
      content: text,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    clearTranscript();
    setIsAIThinking(true);
    setAvatarExpression('thinking');
    
    // Scroll para baixo
    setTimeout(() => scrollToBottom(), 100);

    try {
      // Construir histórico para contexto
      const history = conversationHistory.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      // Chamar API de chat (com cache)
      const response = await cache.getCachedAIResponse(
        `chat_${object.word}_${text}`,
        JSON.stringify(history),
        async () => {
          const result = await apiService.ai.conversationalResponse({
            user_input: text,
            object_name: object.word,
            conversation_history: history,
          });
          return result;
        }
      );

      setAvatarExpression('happy');
      
      // Criar mensagem da IA
      const botMessage: Message = {
        id: generateMessageId(),
        type: 'bot',
        content: response.bot_response,
        examples: response.examples,
        suggestions: response.suggestions,
        audio: true,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, botMessage]);
      setConversationHistory(prev => [...prev, userMessage, botMessage]);
      
      if (response.suggestions) {
        setCurrentSuggestions(response.suggestions);
      }
      
      // Tocar áudio da resposta
      playMessageAudio(botMessage);
      
      // Scroll para baixo
      setTimeout(() => scrollToBottom(), 100);
      
    } catch (error) {
      console.error('[Popup] Erro ao enviar mensagem:', error);
      
      setAvatarExpression('surprised');
      
      const errorMessage: Message = {
        id: generateMessageId(),
        type: 'bot',
        content: 'Ops! Tive um problema ao processar sua mensagem. Pode tentar novamente? 😅',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAIThinking(false);
    }
  };

  // ============================================================================
  // GRAVAÇÃO DE ÁUDIO
  // ============================================================================

  const handleRecordPress = async () => {
    if (isRecording) {
      // Parar gravação e enviar
      const result = await stopRecording();
      if (result) {
        sendMessage(result);
      }
    } else {
      // Iniciar gravação
      await startRecording({ language: 'pt-BR', maxDuration: 6000 });
      
      // Animação do botão
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  };

  // ============================================================================
  // REPRODUÇÃO DE ÁUDIO
  // ============================================================================

  const playMessageAudio = async (message: Message) => {
    if (!message.audio) {
      console.log('[Popup] 🔇 Mensagem não tem áudio');
      return;
    }

    try {
      console.log('[Popup] 🔊 Iniciando reprodução de áudio...');

      // Verificar se contextos estão disponíveis
      if (!cache || !cache.getCachedAudio) {
        console.warn('[Popup] ⚠️ Cache não disponível, pulando áudio');
        return;
      }

      // Parar áudios anteriores (com proteção)
      try {
        audioManager?.stopAll();
      } catch (stopError) {
        console.warn('[Popup] ⚠️ Erro ao parar áudios anteriores:', stopError);
      }

      const cleanText = cleanTextForAudio(message.content);
      console.log('[Popup] 📝 Texto limpo para áudio:', cleanText.substring(0, 50) + '...');

      if (!cleanText || cleanText.trim().length === 0) {
        console.warn('[Popup] ⚠️ Texto vazio após limpeza, pulando áudio');
        return;
      }

      // Buscar áudio (com cache) COM TIMEOUT
      console.log('[Popup] 📡 Buscando áudio do cache/API...');
      let audioUrl: string | null = null;

      try {
        const audioPromise = cache.getCachedAudio(
          cleanText,
          'pt-BR-FranciscaNeural',
          async () => {
            console.log('[Popup] 🎤 Gerando TTS...');
            return await apiService.audio.textToSpeech(
              cleanText,
              'pt-BR-FranciscaNeural',
              'normal'
            );
          }
        );

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout ao buscar áudio')), 12000)
        );

        audioUrl = await Promise.race([audioPromise, timeoutPromise]);

        console.log('[Popup] ✅ URL do áudio:', audioUrl);

        if (!audioUrl) {
          throw new Error('URL do áudio não foi retornada');
        }
      } catch (fetchError: any) {
        console.error('[Popup] ❌ Erro ao buscar áudio:', fetchError?.message);
        // Continuar sem áudio, não quebrar a experiência
        setAvatarExpression('happy');
        return;
      }

      // Criar e tocar áudio COM PROTEÇÃO MÁXIMA
      console.log('[Popup] 🎵 Criando e reproduzindo áudio...');

      try {
        // Inicializar módulo de áudio se necessário
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
        } catch (modeError) {
          console.warn('[Popup] ⚠️ Erro ao configurar modo de áudio (continuando):', modeError);
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true }
        );

        console.log('[Popup] ✅ Sound criado com sucesso!');

        // Obter duração para karaoke
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            console.log('[Popup] ⏱️ Duração do áudio:', status.durationMillis, 'ms');
            setAudioDurations(prev => new Map(prev).set(message.id, status.durationMillis));
            setPlayingMessageId(message.id);
            setAvatarExpression('speaking');
          }
        } catch (statusError) {
          console.warn('[Popup] ⚠️ Erro ao obter status do áudio:', statusError);
        }

        // Quando terminar de tocar
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            console.log('[Popup] ✅ Áudio finalizado');
            setPlayingMessageId(null);
            setAvatarExpression('happy');
            sound.unloadAsync().catch(e => console.warn('[Popup] Erro ao descarregar áudio:', e));
          }
        });

      } catch (soundError: any) {
        console.error('[Popup] ❌ Erro ao criar/reproduzir som:', soundError);
        console.error('[Popup] ❌ Stack:', soundError?.stack);
        console.error('[Popup] ❌ Message:', soundError?.message);
        // Resetar estado e continuar
        setPlayingMessageId(null);
        setAvatarExpression('happy');
      }

    } catch (error: any) {
      console.error('[Popup] ❌ Erro geral ao tocar áudio:', error);
      console.error('[Popup] ❌ Stack:', error?.stack);
      console.error('[Popup] ❌ Message:', error?.message);

      // Não mostrar alerta para não interromper a experiência
      // Apenas logar o erro e resetar estado
      setPlayingMessageId(null);
      setAvatarExpression('happy');
    }
  };

  const playExampleAudio = async (text: string, language: 'pt' | 'en') => {
    try {
      audioManager?.stopAll();

      const voice = language === 'pt'
        ? 'pt-BR-FranciscaNeural'
        : 'en-US-AvaNeural';

      const audioUrl = await cache.getCachedAudio(
        text,
        voice,
        async () => {
          return await apiService.audio.textToSpeech(text, voice, 'normal');
        }
      );

      if (!audioUrl) {
        console.warn('[Popup] ⚠️ URL de áudio não retornada para exemplo');
        return;
      }

      // Inicializar módulo de áudio se necessário
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (modeError) {
        console.warn('[Popup] ⚠️ Erro ao configurar modo de áudio:', modeError);
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setAvatarExpression('speaking');

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setAvatarExpression('happy');
          sound.unloadAsync().catch(e => console.warn('[Popup] Erro ao descarregar áudio:', e));
        }
      });

    } catch (error: any) {
      console.error('[Popup] ❌ Erro ao tocar exemplo:', error);
      console.error('[Popup] ❌ Stack:', error?.stack);
      setAvatarExpression('happy');
    }
  };

  // ============================================================================
  // UTILITÁRIOS
  // ============================================================================

  const generateMessageId = (): number => {
    return ++messageIdCounter.current;
  };

  const cleanTextForAudio = (text: string): string => {
    return text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  // ============================================================================
  // CALLBACKS DOS MODOS
  // ============================================================================

  const handleExerciseComplete = (score: number) => {
    setShowExerciseMode(false);
    setUserScore(prev => prev + score);
    
    Alert.alert(
      '🎉 Parabéns!',
      `Você ganhou ${score} pontos!\nTotal: ${userScore + score} pontos`,
      [{ text: 'Continuar' }]
    );
  };

  const handleGameComplete = (score: number, gameType: string) => {
    setShowGameMode(false);
    setUserScore(prev => prev + score);
    
    Alert.alert(
      '🎮 Fim de Jogo!',
      `Você fez ${score} pontos no ${gameType}!\nTotal: ${userScore + score} pontos`,
      [{ text: 'Legal!' }]
    );
  };

  // ============================================================================
  // RENDERIZAÇÃO DOS AVATARES
  // ============================================================================

  const renderAvatar = () => {
    const avatarEmojis = {
      neutral: '😊',
      happy: '😄',
      thinking: '🤔',
      excited: '🤩',
      encouraging: '💪',
      surprised: '😮',
      speaking: '🗣️',
    };

    return (
      <Animated.View 
        style={[
          styles.avatarContainer,
          {
            transform: [
              { scale: avatarExpression === 'speaking' ? pulseAnim : 1 }
            ]
          }
        ]}
      >
        <Text style={styles.avatarEmoji}>{avatarEmojis[avatarExpression]}</Text>
      </Animated.View>
    );
  };

  // ============================================================================
  // RENDERIZAÇÃO DAS MENSAGENS
  // ============================================================================

  const renderMessage = (message: Message) => {
    const isBot = message.type === 'bot';
    const isPlaying = playingMessageId === message.id;
    const duration = audioDurations.get(message.id);

    return (
      <View key={message.id} style={[styles.messageContainer, !isBot && styles.userMessageContainer]}>
        <View style={[styles.messageBubble, !isBot && styles.userMessageBubble]}>
          {/* Texto com Karaoke (apenas para bot) */}
          {isBot ? (
            <KaraokeText
              text={message.content}
              isPlaying={isPlaying}
              audioDuration={duration}
              style={styles.messageText}
            />
          ) : (
            <Text style={[styles.messageText, styles.userMessageText]}>
              {message.content}
            </Text>
          )}
          
          {/* Botões */}
          {message.buttons && message.buttons.length > 0 && (
            <View style={styles.buttonsContainer}>
              {message.buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.messageButton}
                  onPress={() => handleButtonClick(button)}
                >
                  <Text style={styles.messageButtonText}>{button}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Exemplos */}
          {message.examples && message.examples.length > 0 && (
            <View style={styles.examplesContainer}>
              <Text style={styles.examplesTitle}>📚 Exemplos:</Text>
              {message.examples.map((example, index) => (
                <View key={index} style={styles.exampleCard}>
                  <TouchableOpacity
                    onPress={() => playExampleAudio(example.phrase_pt, 'pt')}
                    style={styles.exampleRow}
                  >
                    <Text style={styles.exampleFlag}>🇧🇷</Text>
                    <Text style={styles.exampleText}>{example.phrase_pt}</Text>
                    <Text style={styles.playIcon}>🔊</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => playExampleAudio(example.phrase_en, 'en')}
                    style={styles.exampleRow}
                  >
                    <Text style={styles.exampleFlag}>🇺🇸</Text>
                    <Text style={[styles.exampleText, styles.exampleEnglish]}>
                      {example.phrase_en}
                    </Text>
                    <Text style={styles.playIcon}>🔊</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          {/* Botão de áudio */}
          {message.audio && isBot && (
            <TouchableOpacity
              style={styles.audioButton}
              onPress={() => playMessageAudio(message)}
            >
              <Text style={styles.audioButtonText}>
                {isPlaying ? '⏸️' : '🔊'} Ouvir
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.objectWord}>{object.word}</Text>
            <Text style={styles.objectTranslation}>{object.translation}</Text>
          </View>
          
          {renderAvatar()}
          
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>⭐ {userScore}</Text>
          </View>
        </View>

        {/* Chat Area */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
        >
          {messages.map(renderMessage)}
          
          {isAIThinking && (
            <View style={styles.thinkingContainer}>
              <ActivityIndicator size="small" color="#667eea" />
              <Text style={styles.thinkingText}>Pensando...</Text>
            </View>
          )}
        </ScrollView>

        {/* Suggestions */}
        {currentSuggestions.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsContainer}
          >
            {currentSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => sendMessage(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input Area */}
        {step === 'chat' && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={userInput || transcript}
              onChangeText={setUserInput}
              onSubmitEditing={() => sendMessage(userInput || transcript)}
              placeholder="Digite sua pergunta..."
              placeholderTextColor="#999"
              multiline
              maxHeight={100}
            />
            
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => sendMessage(userInput || transcript)}
              disabled={!userInput && !transcript}
            >
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
            
            <Animated.View
              style={{
                transform: [{ scale: isRecording ? pulseAnim : 1 }]
              }}
            >
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordingButton,
                  isProcessing && styles.processingButton,
                ]}
                onPress={handleRecordPress}
                disabled={isProcessing}
              >
                <Text style={styles.recordButtonText}>
                  {isProcessing ? '⏳' : isRecording ? '⏹️' : '🎤'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* Error Message */}
        {sttError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {sttError}</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Exercise Mode Modal */}
      {showExerciseMode && (
        <Modal
          visible={showExerciseMode}
          animationType="slide"
          transparent={false}
        >
          <ExerciseMode
            object={object}
            onClose={() => setShowExerciseMode(false)}
            onComplete={handleExerciseComplete}
          />
        </Modal>
      )}

      {/* Game Mode Modal */}
      {showGameMode && (
        <Modal
          visible={showGameMode}
          animationType="slide"
          transparent={false}
        >
          <GameMode
            object={object}
            relatedWords={relatedWords}
            onClose={() => setShowGameMode(false)}
            onComplete={handleGameComplete}
          />
        </Modal>
      )}
    </Modal>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#666',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  objectWord: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  objectTranslation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  avatarContainer: {
    marginHorizontal: 10,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  scoreContainer: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  chatContent: {
    padding: 15,
    paddingBottom: 80,
  },
  messageContainer: {
    marginVertical: 5,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  userMessageBubble: {
    backgroundColor: '#667eea',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginHorizontal: -5,
  },
  messageButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 5,
  },
  messageButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  examplesContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  exampleCard: {
    marginVertical: 5,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  exampleFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  exampleText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
  },
  exampleEnglish: {
    fontWeight: '500',
    color: '#4CAF50',
  },
  playIcon: {
    fontSize: 16,
    marginLeft: 8,
    opacity: 0.7,
  },
  audioButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  audioButtonText: {
    fontSize: 12,
    color: '#666',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    marginHorizontal: 5,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginVertical: 5,
  },
  thinkingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#667eea',
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    maxHeight: 50,
  },
  suggestionChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  suggestionText: {
    fontSize: 14,
    color: '#667eea',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonText: {
    fontSize: 24,
    color: '#667eea',
  },
  recordButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
    borderRadius: 20,
    marginLeft: 8,
  },
  recordingButton: {
    backgroundColor: '#FF6B6B',
  },
  processingButton: {
    backgroundColor: '#FFD700',
  },
  recordButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#C62828',
  },
});