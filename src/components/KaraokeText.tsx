/**
 * KaraokeText Component
 * Sistema de karaoke sincronizado com destaque palavra por palavra
 * 
 * Funcionalidades:
 * - Sincronização com delay negativo (-150ms)
 * - Fade in/out suave (0.7 → 1.0)
 * - Destaque com cor roxa (#667eea)
 * - Animação fluida
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';

interface KaraokeTextProps {
  text: string;
  audioUrl?: string;
  isPlaying: boolean;
  audioDuration?: number;
  onWordHighlight?: (word: string, index: number) => void;
  style?: any;
  highlightColor?: string;
  normalOpacity?: number;
  highlightOpacity?: number;
  delay?: number; // Delay em ms (padrão: -150)
}

export default function KaraokeText({
  text,
  audioUrl,
  isPlaying,
  audioDuration,
  onWordHighlight,
  style,
  highlightColor = '#667eea',
  normalOpacity = 0.7,
  highlightOpacity = 1.0,
  delay = -150, // Delay negativo para compensar latência
}: KaraokeTextProps) {
  const [words, setWords] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  
  // Refs para animações
  const fadeAnims = useRef<Animated.Value[]>([]);
  const scaleAnims = useRef<Animated.Value[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  /**
   * Divide o texto em palavras
   */
  useEffect(() => {
    const splitWords = text
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    setWords(splitWords);
    
    // Criar animações para cada palavra
    fadeAnims.current = splitWords.map(() => 
      new Animated.Value(normalOpacity)
    );
    scaleAnims.current = splitWords.map(() => 
      new Animated.Value(1)
    );
  }, [text, normalOpacity]);

  /**
   * Inicia o karaoke quando o áudio começa
   */
  useEffect(() => {
    if (isPlaying && audioDuration && words.length > 0) {
      startKaraoke();
    } else if (!isPlaying) {
      stopKaraoke();
    }

    return () => {
      clearAllTimeouts();
    };
  }, [isPlaying, audioDuration, words]);

  /**
   * Inicia a sincronização do karaoke
   */
  const startKaraoke = () => {
    if (!audioDuration || words.length === 0) return;

    // Limpar timeouts anteriores
    clearAllTimeouts();
    
    // Calcular duração por palavra
    const wordDuration = audioDuration / words.length;
    
    // Destacar primeira palavra imediatamente se delay negativo
    if (delay < 0) {
      highlightWord(0);
    }

    // Programar destaque de cada palavra
    words.forEach((word, index) => {
      const wordDelay = delay + (index * wordDuration);
      
      const timeout = setTimeout(() => {
        highlightWord(index);
        
        // Callback opcional
        if (onWordHighlight) {
          onWordHighlight(word, index);
        }
      }, Math.max(0, wordDelay));

      timeoutsRef.current.push(timeout);
    });

    // Timeout para limpar destaque no final
    const endTimeout = setTimeout(() => {
      resetHighlight();
    }, audioDuration + 500);
    
    timeoutsRef.current.push(endTimeout);
  };

  /**
   * Para o karaoke
   */
  const stopKaraoke = () => {
    clearAllTimeouts();
    resetHighlight();
  };

  /**
   * Limpa todos os timeouts
   */
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current = [];
  };

  /**
   * Destaca uma palavra específica
   */
  const highlightWord = (index: number) => {
    // Atualizar índice destacado
    setHighlightedIndex(index);

    // Animar palavra atual (fade in + scale)
    Animated.parallel([
      Animated.timing(fadeAnims.current[index], {
        toValue: highlightOpacity,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims.current[index], {
        toValue: 1.1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Desfazer destaque da palavra anterior
    if (index > 0) {
      Animated.parallel([
        Animated.timing(fadeAnims.current[index - 1], {
          toValue: normalOpacity,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnims.current[index - 1], {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  /**
   * Reseta todos os destaques
   */
  const resetHighlight = () => {
    setHighlightedIndex(-1);
    
    // Resetar todas as animações
    fadeAnims.current.forEach(anim => {
      Animated.timing(anim, {
        toValue: normalOpacity,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    
    scaleAnims.current.forEach(anim => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  /**
   * Renderiza palavra com animação
   */
  const renderWord = (word: string, index: number) => {
    const isHighlighted = index === highlightedIndex;
    
    return (
      <Animated.Text
        key={`${word}-${index}`}
        style={[
          styles.word,
          style,
          {
            opacity: fadeAnims.current[index] || normalOpacity,
            transform: [
              { scale: scaleAnims.current[index] || 1 }
            ],
            color: isHighlighted ? highlightColor : (style?.color || '#333'),
            marginRight: 8, // Espaçamento entre palavras
          },
        ]}
      >
        {word}
      </Animated.Text>
    );
  };

  return (
    <View style={styles.container}>
      {words.map((word, index) => renderWord(word, index))}
    </View>
  );
}

/**
 * Componente para uso simplificado
 */
export function SimpleKaraokeText({ 
  text, 
  isPlaying,
  duration = 3000,
  style,
}: { 
  text: string; 
  isPlaying: boolean;
  duration?: number;
  style?: any;
}) {
  return (
    <KaraokeText
      text={text}
      isPlaying={isPlaying}
      audioDuration={duration}
      style={style}
    />
  );
}

/**
 * Hook para controlar karaoke programaticamente
 */
export function useKaraoke() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  const start = (audioDuration: number) => {
    setDuration(audioDuration);
    setIsPlaying(true);
    setCurrentWordIndex(0);
  };

  const stop = () => {
    setIsPlaying(false);
    setCurrentWordIndex(-1);
  };

  const pause = () => {
    setIsPlaying(false);
  };

  const resume = () => {
    setIsPlaying(true);
  };

  return {
    isPlaying,
    duration,
    currentWordIndex,
    start,
    stop,
    pause,
    resume,
  };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  word: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 4,
  },
});