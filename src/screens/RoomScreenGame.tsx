/**
 * RoomScreenGame - Tela de sala em modo jogo (Landscape 16:9)
 * Experiência completa estilo jogo 3D
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import Room3DGame from '../components/Room3DGame';
import ConversationalPopup from '../components/ConversationalPopup';
import * as ScreenOrientation from 'expo-screen-orientation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function RoomScreenGame() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const { roomName, theme } = params as { roomName: string; theme?: string };

  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [showObjectModal, setShowObjectModal] = useState(false);
  const [score, setScore] = useState(0);
  const [learnedWords, setLearnedWords] = useState<string[]>([]);

  // Forçar landscape ao montar
  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    };
    lockOrientation();

    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Debug: Monitorar mudanças de estado
  useEffect(() => {
    console.log('[RoomScreenGame] Estado atualizado:');
    console.log('  - selectedObject:', selectedObject?.word || 'null');
    console.log('  - showObjectModal:', showObjectModal);
  }, [selectedObject, showObjectModal]);

  // Objetos 3D da sala
  const roomObjects = [
    {
      id: '1',
      word: 'Table',
      translation: 'Mesa',
      position: [-3, 0, -2] as [number, number, number],
      scale: [2, 0.8, 1] as [number, number, number],
      color: '#8B4513',
    },
    {
      id: '2',
      word: 'Chair',
      translation: 'Cadeira',
      position: [3, 0, -1] as [number, number, number],
      scale: [0.8, 1.5, 0.8] as [number, number, number],
      color: '#654321',
    },
    {
      id: '3',
      word: 'Sofa',
      translation: 'Sofá',
      position: [0, 0, -3] as [number, number, number],
      scale: [3, 1, 1.5] as [number, number, number],
      color: '#A0522D',
    },
    {
      id: '4',
      word: 'TV',
      translation: 'Televisão',
      position: [-4, 1.5, -4] as [number, number, number],
      scale: [2, 1.5, 0.3] as [number, number, number],
      color: '#333333',
    },
    {
      id: '5',
      word: 'Lamp',
      translation: 'Lâmpada',
      position: [4, 2.5, -2] as [number, number, number],
      scale: [0.5, 1.5, 0.5] as [number, number, number],
      color: '#FFD700',
    },
    {
      id: '6',
      word: 'Rug',
      translation: 'Tapete',
      position: [0, -0.45, 0] as [number, number, number],
      scale: [4, 0.05, 3] as [number, number, number],
      color: '#8B0000',
    },
  ];

  const handleObjectClick = (object: any) => {
    console.log('[RoomScreenGame] Object clicked:', object.word);
    console.log('[RoomScreenGame] Setting selectedObject to:', object);
    console.log('[RoomScreenGame] Setting showObjectModal to: true');

    setSelectedObject(object);
    setShowObjectModal(true);

    // Adicionar palavra aprendida
    if (!learnedWords.includes(object.word)) {
      setLearnedWords([...learnedWords, object.word]);
      setScore(score + 10);
    }
  };

  const handleCloseModal = () => {
    console.log('[RoomScreenGame] Closing modal');
    setShowObjectModal(false);
    // Não limpar selectedObject imediatamente para evitar fechamento prematuro
    setTimeout(() => {
      setSelectedObject(null);
    }, 500);
  };

  const handleBack = () => {
    router.back();
  };

  const progress = (learnedWords.length / roomObjects.length) * 100;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* HUD Top - Informações do jogo */}
      <View style={styles.hudTop}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={styles.centerInfo}>
          <Text style={styles.roomTitle}>{roomName || 'Sala'}</Text>
          <Text style={styles.progressText}>
            {learnedWords.length}/{roomObjects.length} objetos
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Pontos</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      {/* Cena 3D */}
      <Room3DGame
        objects={roomObjects}
        onObjectClick={handleObjectClick}
        roomTheme={(theme as any) || 'living-room'}
      />

      {/* Barra de progresso */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Conversational Popup - Chat AI */}
      <ConversationalPopup
        object={selectedObject || { word: '', translation: '', id: '' }}
        isOpen={showObjectModal && selectedObject !== null}
        onClose={handleCloseModal}
        relatedWords={roomObjects.map(obj => ({
          word: obj.word,
          translation: obj.translation,
        }))}
      />

      {/* Mini mapa (opcional) */}
      <View style={styles.miniMap}>
        <Text style={styles.miniMapTitle}>Mapa</Text>
        <View style={styles.miniMapGrid}>
          {roomObjects.map((obj, index) => (
            <View
              key={obj.id}
              style={[
                styles.miniMapDot,
                learnedWords.includes(obj.word) && styles.miniMapDotLearned,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  hudTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
    paddingHorizontal: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  backButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerInfo: {
    alignItems: 'center',
    flex: 1,
  },
  roomTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 2,
  },
  scoreContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    minWidth: 100,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 100,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  miniMap: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
    zIndex: 100,
  },
  miniMapTitle: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  miniMapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 60,
  },
  miniMapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    margin: 2,
  },
  miniMapDotLearned: {
    backgroundColor: '#4CAF50',
  },
});
