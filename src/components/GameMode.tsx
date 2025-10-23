/**
 * GameMode Component
 * Sistema de jogos educativos
 * 
 * 3 tipos de jogos:
 * 1. Memory Game - Jogo da memória
 * 2. Word Hunt - Caça-palavras
 * 3. Speed Match - Combinar rápido
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

const { width: screenWidth } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface GameModeProps {
  object: {
    word: string;
    translation: string;
  };
  relatedWords?: Array<{
    word: string;
    translation: string;
  }>;
  onClose: () => void;
  onComplete: (score: number, gameType: string) => void;
}

type GameType = 'memory' | 'word_hunt' | 'speed_match';

interface MemoryCard {
  id: string;
  content: string;
  type: 'word' | 'translation';
  isFlipped: boolean;
  isMatched: boolean;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function GameMode({ 
  object, 
  relatedWords = [], 
  onClose, 
  onComplete 
}: GameModeProps) {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Palavras para os jogos
  const gameWords = [
    object,
    ...relatedWords.slice(0, 7), // Máximo 8 palavras
  ];

  /**
   * Inicia o jogo selecionado
   */
  const startGame = (type: GameType) => {
    setSelectedGame(type);
    setGameStarted(true);
    setScore(0);
    setTimeLeft(60);
    
    // Animar entrada
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Iniciar timer
    startTimer();
  };

  /**
   * Timer do jogo
   */
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * Termina o jogo
   */
  const endGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setGameEnded(true);
    setGameStarted(false);
    
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Chamar callback
    if (selectedGame) {
      onComplete(score, selectedGame);
    }
  }, [score, selectedGame, onComplete]);

  /**
   * Limpar timer ao desmontar
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  /**
   * Renderiza menu de seleção de jogos
   */
  const renderGameSelection = () => (
    <View style={styles.selectionContainer}>
      <Text style={styles.title}>Escolha um Jogo</Text>
      <Text style={styles.subtitle}>Pratique com "{object.word}"</Text>
      
      <TouchableOpacity 
        style={[styles.gameCard, styles.memoryCard]}
        onPress={() => startGame('memory')}
      >
        <Text style={styles.gameEmoji}>🧠</Text>
        <Text style={styles.gameTitle}>Jogo da Memória</Text>
        <Text style={styles.gameDescription}>
          Encontre os pares de palavras
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.gameCard, styles.wordHuntCard]}
        onPress={() => startGame('word_hunt')}
      >
        <Text style={styles.gameEmoji}>🔍</Text>
        <Text style={styles.gameTitle}>Caça-Palavras</Text>
        <Text style={styles.gameDescription}>
          Encontre as palavras escondidas
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.gameCard, styles.speedMatchCard]}
        onPress={() => startGame('speed_match')}
      >
        <Text style={styles.gameEmoji}>⚡</Text>
        <Text style={styles.gameTitle}>Speed Match</Text>
        <Text style={styles.gameDescription}>
          Combine palavras rapidamente
        </Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Renderiza o jogo selecionado
   */
  const renderGame = () => {
    if (!selectedGame) return null;
    
    switch (selectedGame) {
      case 'memory':
        return <MemoryGame />;
      case 'word_hunt':
        return <WordHuntGame />;
      case 'speed_match':
        return <SpeedMatchGame />;
      default:
        return null;
    }
  };

  // ============================================================================
  // JOGO DA MEMÓRIA
  // ============================================================================

  const MemoryGame = () => {
    const [cards, setCards] = useState<MemoryCard[]>([]);
    const [selectedCards, setSelectedCards] = useState<string[]>([]);
    const [moves, setMoves] = useState(0);
    const [matches, setMatches] = useState(0);
    
    // Inicializar cartas
    useEffect(() => {
      const newCards: MemoryCard[] = [];
      
      gameWords.forEach((word, index) => {
        // Carta com palavra em inglês
        newCards.push({
          id: `${index}-word`,
          content: word.word,
          type: 'word',
          isFlipped: false,
          isMatched: false,
        });
        
        // Carta com tradução
        newCards.push({
          id: `${index}-translation`,
          content: word.translation,
          type: 'translation',
          isFlipped: false,
          isMatched: false,
        });
      });
      
      // Embaralhar
      newCards.sort(() => Math.random() - 0.5);
      setCards(newCards);
    }, []);

    /**
     * Vira uma carta
     */
    const flipCard = (cardId: string) => {
      const card = cards.find(c => c.id === cardId);
      if (!card || card.isFlipped || card.isMatched) return;
      
      // Haptic
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Virar carta
      const newCards = cards.map(c => 
        c.id === cardId ? { ...c, isFlipped: true } : c
      );
      setCards(newCards);
      
      // Adicionar às cartas selecionadas
      const newSelected = [...selectedCards, cardId];
      setSelectedCards(newSelected);
      
      // Verificar par
      if (newSelected.length === 2) {
        setMoves(moves + 1);
        checkMatch(newSelected, newCards);
      }
    };

    /**
     * Verifica se as cartas formam um par
     */
    const checkMatch = (selected: string[], currentCards: MemoryCard[]) => {
      const [card1, card2] = selected.map(id => 
        currentCards.find(c => c.id === id)
      );
      
      if (!card1 || !card2) return;
      
      // Verificar se é um par (mesma palavra em inglês e português)
      const wordIndex1 = parseInt(card1.id.split('-')[0]);
      const wordIndex2 = parseInt(card2.id.split('-')[0]);
      
      if (wordIndex1 === wordIndex2 && card1.type !== card2.type) {
        // É um par!
        setTimeout(() => {
          const matchedCards = currentCards.map(c => 
            (c.id === card1.id || c.id === card2.id) 
              ? { ...c, isMatched: true }
              : c
          );
          setCards(matchedCards);
          setMatches(matches + 1);
          setScore(score + 10);
          
          // Haptic de sucesso
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Verificar se o jogo acabou
          if (matches + 1 === gameWords.length) {
            endGame();
          }
        }, 500);
      } else {
        // Não é um par
        setTimeout(() => {
          const flippedCards = currentCards.map(c => 
            selected.includes(c.id) 
              ? { ...c, isFlipped: false }
              : c
          );
          setCards(flippedCards);
          
          // Haptic de erro
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }, 1000);
      }
      
      // Limpar seleção
      setSelectedCards([]);
    };

    return (
      <View style={styles.gameContainer}>
        <View style={styles.gameHeader}>
          <Text style={styles.gameScore}>Pontos: {score}</Text>
          <Text style={styles.gameMoves}>Movimentos: {moves}</Text>
        </View>
        
        <View style={styles.memoryGrid}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.memoryCard,
                card.isFlipped && styles.flippedCard,
                card.isMatched && styles.matchedCard,
              ]}
              onPress={() => flipCard(card.id)}
              disabled={card.isFlipped || card.isMatched}
            >
              <Text style={[
                styles.memoryCardText,
                (!card.isFlipped && !card.isMatched) && styles.hiddenText,
              ]}>
                {(card.isFlipped || card.isMatched) ? card.content : '?'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // ============================================================================
  // CAÇA-PALAVRAS
  // ============================================================================

  const WordHuntGame = () => {
    const gridSize = 10;
    const [grid, setGrid] = useState<string[][]>([]);
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [selectedCells, setSelectedCells] = useState<string[]>([]);
    const [placedWords, setPlacedWords] = useState<Map<string, string[]>>(new Map());

    // Inicializar grid
    useEffect(() => {
      const newGrid: string[][] = [];
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      // Criar grid vazio
      for (let i = 0; i < gridSize; i++) {
        newGrid[i] = [];
        for (let j = 0; j < gridSize; j++) {
          newGrid[i][j] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
      
      // Colocar palavras
      const wordsMap = new Map<string, string[]>();
      
      gameWords.forEach((wordObj) => {
        const word = wordObj.word.toUpperCase();
        const placed = placeWord(newGrid, word);
        if (placed) {
          wordsMap.set(word, placed);
        }
      });
      
      setGrid(newGrid);
      setPlacedWords(wordsMap);
    }, []);

    /**
     * Coloca uma palavra no grid
     */
    const placeWord = (grid: string[][], word: string): string[] | null => {
      const directions = [
        [0, 1],   // horizontal
        [1, 0],   // vertical
        [1, 1],   // diagonal
        [-1, 1],  // diagonal inversa
      ];
      
      // Tentar várias vezes
      for (let attempts = 0; attempts < 50; attempts++) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * gridSize);
        const col = Math.floor(Math.random() * gridSize);
        
        if (canPlaceWord(grid, word, row, col, direction)) {
          const cells: string[] = [];
          
          for (let i = 0; i < word.length; i++) {
            const r = row + direction[0] * i;
            const c = col + direction[1] * i;
            grid[r][c] = word[i];
            cells.push(`${r}-${c}`);
          }
          
          return cells;
        }
      }
      
      return null;
    };

    /**
     * Verifica se pode colocar palavra
     */
    const canPlaceWord = (
      grid: string[][], 
      word: string, 
      row: number, 
      col: number, 
      direction: number[]
    ): boolean => {
      for (let i = 0; i < word.length; i++) {
        const r = row + direction[0] * i;
        const c = col + direction[1] * i;
        
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
          return false;
        }
      }
      
      return true;
    };

    /**
     * Seleciona uma célula
     */
    const selectCell = (row: number, col: number) => {
      const cellId = `${row}-${col}`;
      
      // Toggle seleção
      const newSelected = selectedCells.includes(cellId)
        ? selectedCells.filter(c => c !== cellId)
        : [...selectedCells, cellId];
      
      setSelectedCells(newSelected);
      
      // Verificar se formou uma palavra
      checkForWord(newSelected);
    };

    /**
     * Verifica se selecionou uma palavra
     */
    const checkForWord = (selected: string[]) => {
      placedWords.forEach((cells, word) => {
        if (cells.every(cell => selected.includes(cell))) {
          if (!foundWords.includes(word)) {
            setFoundWords([...foundWords, word]);
            setScore(score + 15);
            setSelectedCells([]);
            
            // Haptic de sucesso
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Verificar se encontrou todas
            if (foundWords.length + 1 === gameWords.length) {
              endGame();
            }
          }
        }
      });
    };

    return (
      <View style={styles.gameContainer}>
        <View style={styles.wordList}>
          <Text style={styles.wordListTitle}>Encontre:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {gameWords.map((wordObj) => (
              <Text
                key={wordObj.word}
                style={[
                  styles.wordToFind,
                  foundWords.includes(wordObj.word.toUpperCase()) && styles.foundWord,
                ]}
              >
                {wordObj.word}
              </Text>
            ))}
          </ScrollView>
        </View>
        
        <View style={styles.wordHuntGrid}>
          {grid.map((row, i) => (
            <View key={i} style={styles.wordHuntRow}>
              {row.map((letter, j) => {
                const cellId = `${i}-${j}`;
                const isSelected = selectedCells.includes(cellId);
                const isFound = Array.from(placedWords.values()).some(
                  cells => cells.includes(cellId) && 
                  foundWords.includes(
                    Array.from(placedWords.entries()).find(
                      ([_, c]) => c.includes(cellId)
                    )?.[0] || ''
                  )
                );
                
                return (
                  <TouchableOpacity
                    key={j}
                    style={[
                      styles.wordHuntCell,
                      isSelected && styles.selectedCell,
                      isFound && styles.foundCell,
                    ]}
                    onPress={() => selectCell(i, j)}
                  >
                    <Text style={styles.wordHuntLetter}>{letter}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ============================================================================
  // SPEED MATCH
  // ============================================================================

  const SpeedMatchGame = () => {
    const [currentWord, setCurrentWord] = useState<typeof gameWords[0] | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    
    // Gerar nova rodada
    const generateRound = useCallback(() => {
      const word = gameWords[Math.floor(Math.random() * gameWords.length)];
      setCurrentWord(word);
      
      // Criar opções (1 correta + 3 erradas)
      const correctOption = Math.random() > 0.5 ? word.word : word.translation;
      const isShowingEnglish = correctOption === word.word;
      
      const wrongOptions: string[] = [];
      const otherWords = gameWords.filter(w => w !== word);
      
      while (wrongOptions.length < 3 && otherWords.length > 0) {
        const randomWord = otherWords[Math.floor(Math.random() * otherWords.length)];
        const option = isShowingEnglish ? randomWord.word : randomWord.translation;
        
        if (!wrongOptions.includes(option)) {
          wrongOptions.push(option);
        }
      }
      
      // Embaralhar opções
      const allOptions = [correctOption, ...wrongOptions];
      allOptions.sort(() => Math.random() - 0.5);
      
      setOptions(allOptions);
    }, [gameWords]);

    // Inicializar primeira rodada
    useEffect(() => {
      generateRound();
    }, [generateRound]);

    /**
     * Verifica resposta
     */
    const checkAnswer = (selected: string) => {
      if (!currentWord) return;
      
      const isCorrect = selected === currentWord.word || 
                        selected === currentWord.translation;
      
      if (isCorrect) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setScore(score + 5);
        
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        
        // Haptic de sucesso
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        setStreak(0);
        
        // Haptic de erro
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      // Próxima rodada
      setTimeout(generateRound, 300);
    };

    if (!currentWord) return null;

    const showingEnglish = options.includes(currentWord.word);
    const targetWord = showingEnglish ? currentWord.translation : currentWord.word;

    return (
      <View style={styles.gameContainer}>
        <View style={styles.speedMatchHeader}>
          <Text style={styles.streakText}>🔥 {streak}</Text>
          <Text style={styles.bestStreakText}>Melhor: {bestStreak}</Text>
        </View>
        
        <View style={styles.targetWordContainer}>
          <Text style={styles.targetWordLabel}>
            {showingEnglish ? 'Qual é a tradução?' : 'Como se diz em inglês?'}
          </Text>
          <Text style={styles.targetWord}>{targetWord}</Text>
        </View>
        
        <View style={styles.speedMatchOptions}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={`${option}-${index}`}
              style={styles.speedMatchOption}
              onPress={() => checkAnswer(option)}
            >
              <Text style={styles.speedMatchOptionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
        
        {gameStarted && (
          <>
            <Text style={styles.timer}>⏱️ {timeLeft}s</Text>
            <Text style={styles.score}>⭐ {score}</Text>
          </>
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {!selectedGame && !gameEnded && renderGameSelection()}
        
        {selectedGame && !gameEnded && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderGame()}
          </Animated.View>
        )}
        
        {gameEnded && (
          <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverEmoji}>🎉</Text>
            <Text style={styles.gameOverTitle}>Fim de Jogo!</Text>
            <Text style={styles.gameOverScore}>Pontuação: {score}</Text>
            
            <TouchableOpacity 
              style={styles.playAgainButton}
              onPress={() => {
                setGameEnded(false);
                setSelectedGame(null);
                setScore(0);
                setTimeLeft(60);
              }}
            >
              <Text style={styles.playAgainText}>Jogar Novamente</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={onClose}
            >
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  content: {
    flex: 1,
  },
  selectionContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  gameCard: {
    width: '100%',
    padding: 20,
    borderRadius: 15,
    marginVertical: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  memoryCard: {
    backgroundColor: '#E3F2FD',
  },
  wordHuntCard: {
    backgroundColor: '#FFF3E0',
  },
  speedMatchCard: {
    backgroundColor: '#E8F5E9',
  },
  gameEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  gameDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  gameContainer: {
    padding: 20,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gameScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  gameMoves: {
    fontSize: 16,
    color: '#666',
  },
  
  // Memory Game
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  memoryCardStyle: {
    width: (screenWidth - 60) / 4,
    height: (screenWidth - 60) / 4,
    margin: 5,
    backgroundColor: '#2196F3',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  flippedCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  matchedCard: {
    backgroundColor: '#4CAF50',
    opacity: 0.7,
  },
  memoryCardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  hiddenText: {
    fontSize: 24,
  },
  
  // Word Hunt
  wordList: {
    marginBottom: 20,
  },
  wordListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  wordToFind: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginRight: 10,
    fontSize: 14,
    color: '#666',
  },
  foundWord: {
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  wordHuntGrid: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
  },
  wordHuntRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  wordHuntCell: {
    width: (screenWidth - 80) / 10,
    height: (screenWidth - 80) / 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedCell: {
    backgroundColor: '#FFE082',
  },
  foundCell: {
    backgroundColor: '#C8E6C9',
  },
  wordHuntLetter: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // Speed Match
  speedMatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  streakText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  bestStreakText: {
    fontSize: 16,
    color: '#666',
  },
  targetWordContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    marginBottom: 30,
    alignItems: 'center',
    elevation: 3,
  },
  targetWordLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  targetWord: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  speedMatchOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  speedMatchOption: {
    width: '45%',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 5,
    alignItems: 'center',
    elevation: 2,
  },
  speedMatchOptionText: {
    fontSize: 18,
    color: '#333',
  },
  
  // Game Over
  gameOverContainer: {
    padding: 40,
    alignItems: 'center',
  },
  gameOverEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  gameOverScore: {
    fontSize: 24,
    color: '#4CAF50',
    marginBottom: 30,
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  playAgainText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
});