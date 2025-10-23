/**
 * ConversationalPopup - Chat AI Interativo para React Native
 * ATUALIZADO com Speech-to-Text via Whisper
 *
 * Funcionalidades completas:
 * - Chat AI com histórico e sugestões
 * - Sistema de áudio com karaoke (word-by-word highlighting)
 * - Avatar com 6 expressões dinâmicas
 * - Reconhecimento de voz com Whisper
 * - Integração com ExerciseMode e GameMode
 * - Layout responsivo 60/40 (chat/sidebar)
 */

import React, { useState, useEffect, useRef } from 'react';
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
import * as Speech from 'expo-speech';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAudioManager } from '../contexts/AudioContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { RecordButton } from '../hooks/RecordButton';

const { width, height } = Dimensions.get('window');
const API_BASE = 'http://localhost:8000';

interface Message {
  id: number;
  type: 'user' | 'bot';
  content: string;
  buttons?: string[];
  examples?: Array<{ phrase_pt: string; phrase_en: string }>;
  suggestions?: string[];
  audio?: boolean;
  audioText?: string;
  autoPlay?: boolean;
  timestamp: number;
}

interface ConversationalPopupProps {
  object: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConversationalPopup({ object, isOpen, onClose }: ConversationalPopupProps) {
  const audioManager = useAudioManager();

  // Estados principais
  const [step, setStep] = useState<'intro' | 'chat'>('intro');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [introText, setIntroText] = useState('');
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [highlightedWords, setHighlightedWords] = useState<{ [key: string]: number }>({});
  const [avatarExpression, setAvatarExpression] = useState<'neutral' | 'happy' | 'thinking' | 'excited' | 'encouraging' | 'surprised' | 'speaking'>('neutral');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [wordsLearned, setWordsLearned] = useState(0);

  // Hook de Speech-to-Text com Whisper
  const {
    isRecording,
    isProcessing,
    transcript,
    error: speechError,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    resetTranscript,
  } = useSpeechRecognition({
    language: 'pt',
    maxDuration: 6000,
    onTranscript: (text) => {
      console.log('[ConversationalPopup] Transcrição recebida:', text);
      // Enviar mensagem automaticamente quando receber a transcrição
      if (text && text.trim()) {
        sendMessage(text);
      }
    },
    onError: (error) => {
      console.error('[ConversationalPopup] Erro no reconhecimento:', error);
      Alert.alert('Erro', 'Não foi possível processar o áudio. Tente novamente.');
    },
  });

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Helper: Remove emojis do texto para áudio
  const cleanTextForAudio = (text: string): string => {
    return text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper: Escolher expressão do avatar
  const getAvatarExpression = (messageType: string, content = ''): typeof avatarExpression => {
    if (isAudioPlaying) return 'speaking';

    const contentLower = content.toLowerCase();

    if (messageType === 'intro' || contentLower.includes('olá') || contentLower.includes('oi')) {
      return 'happy';
    }

    if (isAIThinking || contentLower.includes('pronúncia') || contentLower.includes('significa')) {
      return 'thinking';
    }

    if (contentLower.includes('ótima') || contentLower.includes('perfeito') || contentLower.includes('muito bem')) {
      return 'excited';
    }

    if (contentLower.includes('exemplo') || contentLower.includes('vamos ver') || contentLower.includes('você consegue')) {
      return 'encouraging';
    }

    if (contentLower.includes('curiosidade') || contentLower.includes('sabia que') || contentLower.includes('incrível')) {
      return 'surprised';
    }

    return 'happy';
  };

  // Scroll automático
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar introdução
  useEffect(() => {
    if (isOpen && object) {
      loadIntroduction();
    }
  }, [isOpen, object]);

  const loadIntroduction = async () => {
    try {
      const response = await axios.post(`${API_BASE}/ai/generate-intro`, {
        object_word: object.word,
        object_translation: object.translation,
        room: 'Sala',
        environment: 'Casa',
        user_age: 10,
      });

      setIntroText(response.data.intro_text);
      const introMessage: Message = {
        id: Date.now(),
        type: 'bot',
        content: response.data.intro_text,
        buttons: ['Sim, vamos!', 'Talvez depois'],
        audio: true,
        timestamp: Date.now(),
      };

      setMessages([introMessage]);
      setAvatarExpression('happy');

      // Auto-play introdução
      const cleanText = cleanTextForAudio(response.data.intro_text);
      playBotMessage(cleanText, introMessage.id);
    } catch (error) {
      console.error('Error loading intro:', error);
    }
  };

  const handleButtonClick = (button: string) => {
    if (button === 'Sim, vamos!') {
      setStep('chat');
      startLearning();
    } else {
      onClose();
    }
  };

  const startLearning = async () => {
    const learningMessage: Message = {
      id: Date.now(),
      type: 'bot',
      content: `Em inglês, ${object.translation} é: **${object.word.toUpperCase()}**!\n\nAgora você pode:\n• Me fazer perguntas sobre esta palavra\n• Pedir exemplos de uso\n• Praticar a pronúncia\n\nComo posso te ajudar? 😊`,
      audio: true,
      suggestions: [
        'Como uso em uma frase?',
        'Qual a pronúncia correta?',
        'Me dê exemplos práticos',
      ],
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, learningMessage]);
    setCurrentSuggestions(learningMessage.suggestions || []);
    setAvatarExpression('encouraging');
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');
    resetTranscript();
    setIsAIThinking(true);
    setAvatarExpression('thinking');

    try {
      // Construir histórico para o backend
      const history = conversationHistory.map((msg) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      // Chamar API de resposta conversacional
      const response = await axios.post(`${API_BASE}/ai/conversational-response`, {
        user_input: text,
        object_word: object.word,
        object_translation: object.translation,
        conversation_history: history,
      });

      const { bot_response, examples, suggestions } = response.data;

      // Adicionar resposta da IA
      const botMessage: Message = {
        id: Date.now(),
        type: 'bot',
        content: bot_response,
        examples: examples,
        suggestions: suggestions,
        audio: true,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setConversationHistory((prev) => [...prev, userMessage, botMessage]);
      setCurrentSuggestions(suggestions || []);
      
      // Determinar expressão baseada na resposta
      setAvatarExpression(getAvatarExpression('response', bot_response));

      // Auto-play resposta
      const cleanText = cleanTextForAudio(bot_response);
      playBotMessage(cleanText, botMessage.id);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Erro', 'Não foi possível processar sua mensagem.');
    } finally {
      setIsAIThinking(false);
    }
  };

  const playBotMessage = async (text: string, messageId: number) => {
    try {
      setIsAudioPlaying(true);
      setAvatarExpression('speaking');

      await audioManager.speak(text, {
        voice: 'pt-BR-FranciscaNeural',
        speed: 'normal',
        useBackend: true,
        onWordHighlight: (word, index) => {
          setHighlightedWords((prev) => ({ ...prev, [messageId]: index }));
        },
        onComplete: () => {
          setIsAudioPlaying(false);
          setAvatarExpression('neutral');
          setHighlightedWords((prev) => {
            const updated = { ...prev };
            delete updated[messageId];
            return updated;
          });
        },
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsAudioPlaying(false);
      setAvatarExpression('neutral');
    }
  };

  // Handler do botão de gravação
  const handleRecordPress = async () => {
    if (isRecording) {
      // Parar gravação e processar
      await stopRecording();
    } else {
      // Iniciar gravação
      await startRecording();
    }
  };

  // Renderizar texto com karaoke
  const renderKaraokeText = (text: string, messageId: number) => {
    const words = text.split(' ');
    const currentHighlight = highlightedWords[messageId];

    return (
      <Text style={styles.messageText}>
        {words.map((word, index) => (
          <Text
            key={index}
            style={[
              styles.karaokeWord,
              currentHighlight === index && styles.karaokeHighlight,
            ]}
          >
            {word}{' '}
          </Text>
        ))}
      </Text>
    );
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>
                {object?.translation} - {object?.word}
              </Text>
              <View style={styles.statsRow}>
                <Text style={styles.statsText}>⭐ {wordsLearned} palavras</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Avatar e Chat */}
          <View style={styles.mainContent}>
            {/* Avatar Sidebar */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <Image
                  source={require('../../assets/avatar-neutral.png')}
                  style={styles.avatar}
                  resizeMode="contain"
                />
                <Text style={styles.avatarExpression}>{avatarExpression}</Text>
              </View>
            </View>

            {/* Chat Section */}
            <View style={styles.chatSection}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
              >
                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageWrapper,
                      message.type === 'user' ? styles.userMessage : styles.botMessage,
                    ]}
                  >
                    {message.type === 'bot' && isAudioPlaying && highlightedWords[message.id] !== undefined
                      ? renderKaraokeText(message.content, message.id)
                      : <Text style={styles.messageText}>{message.content}</Text>
                    }

                    {/* Botões */}
                    {message.buttons && (
                      <View style={styles.buttonsRow}>
                        {message.buttons.map((btn, i) => (
                          <TouchableOpacity
                            key={i}
                            style={styles.actionButton}
                            onPress={() => handleButtonClick(btn)}
                          >
                            <Text style={styles.actionButtonText}>{btn}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Exemplos */}
                    {message.examples && message.examples.length > 0 && (
                      <View style={styles.examplesContainer}>
                        {message.examples.map((ex, i) => (
                          <View key={i} style={styles.exampleCard}>
                            <Text style={styles.exampleText}>🇧🇷 {ex.phrase_pt}</Text>
                            <Text style={styles.exampleText}>🇺🇸 {ex.phrase_en}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Sugestões */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        {message.suggestions.map((sug, i) => (
                          <TouchableOpacity
                            key={i}
                            style={styles.suggestionChip}
                            onPress={() => sendMessage(sug)}
                          >
                            <Text style={styles.suggestionText}>{sug}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))}

                {/* AI Thinking */}
                {isAIThinking && (
                  <View style={[styles.messageWrapper, styles.botMessage]}>
                    <View style={styles.thinkingDots}>
                      <ActivityIndicator size="small" color="#667eea" />
                      <Text style={styles.thinkingText}>Pensando...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Input Area */}
              {step === 'chat' && (
                <View style={styles.inputArea}>
                  <TextInput
                    style={styles.textInput}
                    value={userInput}
                    onChangeText={setUserInput}
                    placeholder="Digite ou use o microfone..."
                    onSubmitEditing={() => sendMessage(userInput)}
                    editable={!isRecording && !isProcessing}
                  />
                  
                  {/* Botão de enviar texto */}
                  {userInput.trim() && (
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={() => sendMessage(userInput)}
                      disabled={isRecording || isProcessing}
                    >
                      <Ionicons name="send" size={24} color="white" />
                    </TouchableOpacity>
                  )}

                  {/* Botão de gravação */}
                  <View style={styles.recordButtonWrapper}>
                    <RecordButton
                      isRecording={isRecording}
                      isProcessing={isProcessing}
                      recordingDuration={recordingDuration}
                      onPress={handleRecordPress}
                      size="medium"
                      disabled={isAIThinking}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    height: height * 0.9,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  closeButton: {
    padding: 5,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  avatarSection: {
    width: width * 0.3,
    padding: 10,
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
  },
  avatarExpression: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },
  chatSection: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 10,
  },
  messageWrapper: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#667eea',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  karaokeWord: {
    fontSize: 14,
    color: '#333',
    opacity: 0.7,
  },
  karaokeHighlight: {
    color: '#667eea',
    opacity: 1,
    fontWeight: 'bold',
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  examplesContainer: {
    marginTop: 10,
  },
  exampleCard: {
    backgroundColor: '#F9F9F9',
    padding: 8,
    borderRadius: 5,
    marginVertical: 3,
  },
  exampleText: {
    fontSize: 12,
    marginVertical: 2,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 5,
  },
  suggestionChip: {
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  suggestionText: {
    fontSize: 11,
    color: '#667eea',
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thinkingText: {
    fontSize: 12,
    color: '#666',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#667eea',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonWrapper: {
    marginLeft: 5,
  },
});
