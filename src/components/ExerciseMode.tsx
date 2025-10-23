/**
 * ExerciseMode Component
 * Sistema completo de exercícios educacionais
 * 
 * 5 tipos de exercícios:
 * 1. Quiz - Múltipla escolha
 * 2. Fill Blank - Completar frase
 * 3. Listening - Compreensão auditiva
 * 4. Word Match - Relacionar palavras
 * 5. Sentence Builder - Montar frases
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { useCache } from '../services/cache';

const { width: screenWidth } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface Exercise {
  type: 'quiz' | 'fill_blank' | 'listening' | 'word_match' | 'sentence_builder';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  hint?: string;
  explanation?: string;
  audioUrl?: string;
  points: number;
}

interface ExerciseModeProps {
  object: {
    word: string;
    translation: string;
  };
  onClose: () => void;
  onComplete: (score: number) => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ExerciseMode({ object, onClose, onComplete }: ExerciseModeProps) {
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState<string | string[]>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [exercisesCompleted, setExercisesCompleted] = useState(0);
  const [maxExercises] = useState(5);
  
  // Cache
  const { getCachedAIResponse } = useCache();
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Tipos de exercícios disponíveis
  const exerciseTypes: Exercise['type'][] = [
    'quiz',
    'fill_blank',
    'listening',
    'word_match',
    'sentence_builder',
  ];

  /**
   * Gera um novo exercício
   */
  const generateExercise = useCallback(async () => {
    setLoading(true);
    setShowFeedback(false);
    setUserAnswer('');

    try {
      // Escolher tipo aleatório
      const type = exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)];
      
      // Buscar exercício do backend (com cache)
      const exercise = await getCachedAIResponse(
        `exercise_${type}_${object.word}`,
        object.translation,
        async () => {
          const response = await axios.post(`${API_BASE}/exercises/generate`, {
            object_word: object.word,
            object_translation: object.translation,
            exercise_type: type,
            difficulty: exercisesCompleted < 2 ? 'easy' : 'medium',
          });
          return response.data;
        }
      );

      setCurrentExercise(exercise);
      
      // Animar entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('[ExerciseMode] Erro ao gerar exercício:', error);
      
      // Gerar exercício local como fallback
      setCurrentExercise(generateLocalExercise(object));
    } finally {
      setLoading(false);
    }
  }, [object, exercisesCompleted, getCachedAIResponse]);

  /**
   * Gera exercício localmente (fallback)
   */
  const generateLocalExercise = (obj: typeof object): Exercise => {
    const types = exerciseTypes;
    const type = types[Math.floor(Math.random() * types.length)];

    switch (type) {
      case 'quiz':
        return {
          type: 'quiz',
          question: `Como se diz "${obj.translation}" em inglês?`,
          options: [obj.word, 'cat', 'dog', 'house'],
          correctAnswer: obj.word,
          points: 10,
        };

      case 'fill_blank':
        return {
          type: 'fill_blank',
          question: `Complete: The ___ is comfortable. (${obj.translation})`,
          correctAnswer: obj.word.toLowerCase(),
          hint: `Primeira letra: ${obj.word[0]}`,
          points: 15,
        };

      case 'listening':
        return {
          type: 'listening',
          question: 'Que palavra você ouviu?',
          options: [obj.word, 'table', 'chair', 'book'],
          correctAnswer: obj.word,
          audioUrl: `${API_BASE}/speak-word?word=${obj.word}`,
          points: 20,
        };

      case 'word_match':
        return {
          type: 'word_match',
          question: 'Relacione as palavras',
          options: [obj.word, 'mesa', obj.translation, 'table'],
          correctAnswer: [obj.word, obj.translation],
          points: 15,
        };

      case 'sentence_builder':
        return {
          type: 'sentence_builder',
          question: `Monte a frase: "O ${obj.translation} é bonito"`,
          options: ['The', obj.word, 'is', 'beautiful'],
          correctAnswer: ['The', obj.word, 'is', 'beautiful'],
          points: 25,
        };

      default:
        return generateLocalExercise(obj); // Recursão
    }
  };

  /**
   * Verifica resposta do usuário
   */
  const checkAnswer = useCallback(() => {
    if (!currentExercise) return;

    let correct = false;

    // Verificar resposta baseado no tipo
    switch (currentExercise.type) {
      case 'quiz':
      case 'listening':
        correct = userAnswer === currentExercise.correctAnswer;
        break;

      case 'fill_blank':
        correct = (userAnswer as string).toLowerCase().trim() === 
                  (currentExercise.correctAnswer as string).toLowerCase();
        break;

      case 'word_match':
      case 'sentence_builder':
        const userArr = userAnswer as string[];
        const correctArr = currentExercise.correctAnswer as string[];
        correct = JSON.stringify(userArr) === JSON.stringify(correctArr);
        break;
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    // Haptic feedback
    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(score + currentExercise.points);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeAnimation();
    }

    // Próximo exercício após 2 segundos
    setTimeout(() => {
      const newCount = exercisesCompleted + 1;
      setExercisesCompleted(newCount);

      if (newCount >= maxExercises) {
        onComplete(score);
      } else {
        generateExercise();
      }
    }, 2000);
  }, [currentExercise, userAnswer, score, exercisesCompleted, maxExercises, onComplete, generateExercise]);

  /**
   * Animação de shake para resposta errada
   */
  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /**
   * Toca áudio do exercício
   */
  const playAudio = async () => {
    if (!currentExercise?.audioUrl) return;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: currentExercise.audioUrl },
        { shouldPlay: true }
      );
      
      await sound.playAsync();
    } catch (error) {
      console.error('[ExerciseMode] Erro ao tocar áudio:', error);
    }
  };

  // Gerar primeiro exercício ao montar
  useEffect(() => {
    generateExercise();
  }, []);

  // ============================================================================
  // RENDERIZAÇÃO POR TIPO DE EXERCÍCIO
  // ============================================================================

  const renderExercise = () => {
    if (!currentExercise) return null;

    switch (currentExercise.type) {
      case 'quiz':
        return renderQuizExercise();
      case 'fill_blank':
        return renderFillBlankExercise();
      case 'listening':
        return renderListeningExercise();
      case 'word_match':
        return renderWordMatchExercise();
      case 'sentence_builder':
        return renderSentenceBuilderExercise();
      default:
        return null;
    }
  };

  /**
   * Quiz - Múltipla escolha
   */
  const renderQuizExercise = () => {
    if (!currentExercise || currentExercise.type !== 'quiz') return null;

    return (
      <View style={styles.exerciseContainer}>
        <Text style={styles.question}>{currentExercise.question}</Text>
        
        <View style={styles.optionsContainer}>
          {currentExercise.options?.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                userAnswer === option && styles.selectedOption,
                showFeedback && option === currentExercise.correctAnswer && styles.correctOption,
                showFeedback && userAnswer === option && !isCorrect && styles.wrongOption,
              ]}
              onPress={() => !showFeedback && setUserAnswer(option)}
              disabled={showFeedback}
            >
              <Text style={[
                styles.optionText,
                userAnswer === option && styles.selectedOptionText,
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  /**
   * Fill Blank - Completar frase
   */
  const renderFillBlankExercise = () => {
    if (!currentExercise || currentExercise.type !== 'fill_blank') return null;

    return (
      <View style={styles.exerciseContainer}>
        <Text style={styles.question}>{currentExercise.question}</Text>
        
        {currentExercise.hint && (
          <Text style={styles.hint}>💡 {currentExercise.hint}</Text>
        )}
        
        <TextInput
          style={[
            styles.textInput,
            showFeedback && isCorrect && styles.correctInput,
            showFeedback && !isCorrect && styles.wrongInput,
          ]}
          value={userAnswer as string}
          onChangeText={setUserAnswer}
          placeholder="Digite sua resposta"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!showFeedback}
        />
        
        {showFeedback && !isCorrect && (
          <Text style={styles.correctAnswer}>
            Resposta correta: {currentExercise.correctAnswer}
          </Text>
        )}
      </View>
    );
  };

  /**
   * Listening - Compreensão auditiva
   */
  const renderListeningExercise = () => {
    if (!currentExercise || currentExercise.type !== 'listening') return null;

    return (
      <View style={styles.exerciseContainer}>
        <Text style={styles.question}>{currentExercise.question}</Text>
        
        <TouchableOpacity style={styles.playButton} onPress={playAudio}>
          <Text style={styles.playButtonText}>🔊 Tocar Áudio</Text>
        </TouchableOpacity>
        
        <View style={styles.optionsContainer}>
          {currentExercise.options?.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                userAnswer === option && styles.selectedOption,
                showFeedback && option === currentExercise.correctAnswer && styles.correctOption,
                showFeedback && userAnswer === option && !isCorrect && styles.wrongOption,
              ]}
              onPress={() => !showFeedback && setUserAnswer(option)}
              disabled={showFeedback}
            >
              <Text style={[
                styles.optionText,
                userAnswer === option && styles.selectedOptionText,
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  /**
   * Word Match - Relacionar palavras
   */
  const renderWordMatchExercise = () => {
    if (!currentExercise || currentExercise.type !== 'word_match') return null;

    const [selectedPairs, setSelectedPairs] = useState<string[]>([]);

    const togglePair = (word: string) => {
      if (showFeedback) return;

      const newPairs = selectedPairs.includes(word)
        ? selectedPairs.filter(w => w !== word)
        : [...selectedPairs, word];

      setSelectedPairs(newPairs);
      setUserAnswer(newPairs);
    };

    return (
      <View style={styles.exerciseContainer}>
        <Text style={styles.question}>{currentExercise.question}</Text>
        <Text style={styles.subtitle}>Selecione os pares corretos</Text>
        
        <View style={styles.matchGrid}>
          {currentExercise.options?.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.matchCard,
                selectedPairs.includes(option) && styles.selectedMatchCard,
                showFeedback && currentExercise.correctAnswer.includes(option) && styles.correctMatchCard,
                showFeedback && selectedPairs.includes(option) && 
                  !currentExercise.correctAnswer.includes(option) && styles.wrongMatchCard,
              ]}
              onPress={() => togglePair(option)}
              disabled={showFeedback}
            >
              <Text style={styles.matchCardText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  /**
   * Sentence Builder - Montar frases
   */
  const renderSentenceBuilderExercise = () => {
    if (!currentExercise || currentExercise.type !== 'sentence_builder') return null;

    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [availableWords, setAvailableWords] = useState<string[]>(
      currentExercise.options || []
    );

    const addWord = (word: string, index: number) => {
      if (showFeedback) return;

      const newSelected = [...selectedWords, word];
      const newAvailable = availableWords.filter((_, i) => i !== index);

      setSelectedWords(newSelected);
      setAvailableWords(newAvailable);
      setUserAnswer(newSelected);
    };

    const removeWord = (index: number) => {
      if (showFeedback) return;

      const word = selectedWords[index];
      const newSelected = selectedWords.filter((_, i) => i !== index);
      const newAvailable = [...availableWords, word];

      setSelectedWords(newSelected);
      setAvailableWords(newAvailable);
      setUserAnswer(newSelected);
    };

    return (
      <View style={styles.exerciseContainer}>
        <Text style={styles.question}>{currentExercise.question}</Text>
        
        {/* Frase construída */}
        <View style={[
          styles.sentenceBox,
          showFeedback && isCorrect && styles.correctSentenceBox,
          showFeedback && !isCorrect && styles.wrongSentenceBox,
        ]}>
          {selectedWords.length > 0 ? (
            <View style={styles.sentenceWords}>
              {selectedWords.map((word, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => removeWord(index)}
                  disabled={showFeedback}
                >
                  <Text style={styles.sentenceWord}>{word}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.placeholder}>Toque nas palavras abaixo</Text>
          )}
        </View>
        
        {/* Palavras disponíveis */}
        <View style={styles.wordsPool}>
          {availableWords.map((word, index) => (
            <TouchableOpacity
              key={`${word}-${index}`}
              style={styles.wordChip}
              onPress={() => addWord(word, index)}
              disabled={showFeedback}
            >
              <Text style={styles.wordChipText}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {showFeedback && !isCorrect && (
          <Text style={styles.correctAnswer}>
            Resposta: {(currentExercise.correctAnswer as string[]).join(' ')}
          </Text>
        )}
      </View>
    );
  };

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>⭐ {score}</Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(exercisesCompleted / maxExercises) * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {exercisesCompleted}/{maxExercises}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Preparando exercício...</Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.exerciseWrapper,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateX: shakeAnim }
                ],
              },
            ]}
          >
            {renderExercise()}
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      {!loading && !showFeedback && userAnswer && (
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={styles.checkButton}
            onPress={checkAnswer}
          >
            <Text style={styles.checkButtonText}>Verificar Resposta</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feedback */}
      {showFeedback && (
        <Animated.View 
          style={[
            styles.feedback,
            isCorrect ? styles.correctFeedback : styles.wrongFeedback,
          ]}
        >
          <Text style={styles.feedbackEmoji}>
            {isCorrect ? '🎉' : '😔'}
          </Text>
          <Text style={styles.feedbackText}>
            {isCorrect ? 'Muito bem!' : 'Tente novamente!'}
          </Text>
          {currentExercise?.explanation && (
            <Text style={styles.explanation}>{currentExercise.explanation}</Text>
          )}
        </Animated.View>
      )}
    </View>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    backgroundColor: '#fff',
    elevation: 2,
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
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  progressContainer: {
    flex: 1,
    marginLeft: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  exerciseWrapper: {
    flex: 1,
  },
  exerciseContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  question: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#8BC34A',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  optionsContainer: {
    marginTop: 20,
  },
  optionButton: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  correctOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  wrongOption: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectedOptionText: {
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  correctInput: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  wrongInput: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  correctAnswer: {
    marginTop: 10,
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  playButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  matchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  matchCard: {
    width: '45%',
    padding: 15,
    margin: 5,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMatchCard: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  correctMatchCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  wrongMatchCard: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  matchCardText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  sentenceBox: {
    minHeight: 80,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    marginVertical: 20,
    backgroundColor: '#fff',
  },
  correctSentenceBox: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  wrongSentenceBox: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  sentenceWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sentenceWord: {
    backgroundColor: '#2196F3',
    color: '#fff',
    padding: 8,
    margin: 4,
    borderRadius: 5,
    fontSize: 16,
  },
  placeholder: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  wordsPool: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
  },
  wordChip: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    margin: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  wordChipText: {
    fontSize: 16,
    color: '#333',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  checkButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  feedback: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 10,
  },
  correctFeedback: {
    backgroundColor: '#4CAF50',
  },
  wrongFeedback: {
    backgroundColor: '#F44336',
  },
  feedbackEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  explanation: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
});