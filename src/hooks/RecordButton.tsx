/**
 * Botão de Gravação Reutilizável
 * Com animação, feedback visual e contador de tempo
 */

import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface RecordButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  recordingDuration: number;
  onPress: () => void;
  onLongPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  disabled?: boolean;
}

export function RecordButton({
  isRecording,
  isProcessing,
  recordingDuration,
  onPress,
  onLongPress,
  size = 'medium',
  style,
  disabled = false,
}: RecordButtonProps) {
  // Animações
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Tamanhos baseados no prop size
  const sizes = {
    small: { button: 50, icon: 24, fontSize: 10 },
    medium: { button: 70, icon: 32, fontSize: 12 },
    large: { button: 90, icon: 40, fontSize: 14 },
  };

  const currentSize = sizes[size];

  // Animação de pulso quando gravando
  useEffect(() => {
    if (isRecording) {
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
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Animação de rotação quando processando
  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isProcessing]);

  // Formatar tempo de gravação
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handler de clique com haptic feedback
  const handlePress = () => {
    if (disabled || isProcessing) return;
    
    Haptics.impactAsync(
      isRecording 
        ? Haptics.ImpactFeedbackStyle.Medium 
        : Haptics.ImpactFeedbackStyle.Light
    );
    
    onPress();
  };

  // Handler de long press com haptic feedback
  const handleLongPress = () => {
    if (disabled || isProcessing) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onLongPress?.();
  };

  // Determinar ícone e cor
  const getIconName = () => {
    if (isProcessing) return 'sync';
    if (isRecording) return 'stop-circle';
    return 'mic';
  };

  const getButtonColor = () => {
    if (disabled) return '#CCCCCC';
    if (isProcessing) return '#9C27B0';
    if (isRecording) return '#F44336';
    return '#4CAF50';
  };

  const spinValue = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        disabled={disabled || isProcessing}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.button,
            {
              width: currentSize.button,
              height: currentSize.button,
              backgroundColor: getButtonColor(),
              transform: [
                { scale: pulseAnim },
                { rotate: isProcessing ? spinValue : '0deg' },
              ],
            },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons
              name={getIconName()}
              size={currentSize.icon}
              color="white"
            />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Contador de tempo */}
      {isRecording && recordingDuration > 0 && (
        <View style={styles.durationContainer}>
          <Text style={[styles.durationText, { fontSize: currentSize.fontSize }]}>
            {formatDuration(recordingDuration)}
          </Text>
        </View>
      )}

      {/* Label de status */}
      <Text style={[styles.statusText, { fontSize: currentSize.fontSize }]}>
        {isProcessing
          ? 'Processando...'
          : isRecording
          ? 'Gravando'
          : onLongPress
          ? 'Segure para gravar'
          : 'Toque para gravar'}
      </Text>

      {/* Indicador de limite de tempo */}
      {isRecording && recordingDuration >= 5 && (
        <Text style={[styles.warningText, { fontSize: currentSize.fontSize - 2 }]}>
          Máx: 6 segundos
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  durationContainer: {
    position: 'absolute',
    top: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  durationText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statusText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  warningText: {
    marginTop: 4,
    color: '#FF9800',
    fontWeight: 'bold',
  },
});
