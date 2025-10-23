import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Dimensions } from 'react-native';
import * as Speech from 'expo-speech';
import { lessons } from '../data/lessons';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [showWelcome, setShowWelcome] = useState(true);
  const bounceAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Animação de bounce para o mascote
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in para o texto
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    // Fala de boas-vindas
    speakWelcome();
  }, []);

  const speakWelcome = async () => {
    const welcomeMessage = "Olá! Vamos aprender inglês juntos? Toque no botão para começar nossa aventura!";
    try {
      await Speech.speak(welcomeMessage, {
        language: 'pt-BR',
        pitch: 1.2,
        rate: 0.8,
      });
    } catch (error) {
      console.log('Erro ao reproduzir áudio:', error);
    }
  };

  const handleStart = () => {
    Speech.speak("Ótimo! Vamos começar nossa aventura!", {
      language: 'pt-BR',
      pitch: 1.2,
      rate: 0.8,
    });
    setShowWelcome(false);
  };

  if (showWelcome) {
    return (
      <View style={styles.welcomeContainer}>
        <Animated.Image
          source={require('../assets/images/mascot.png')}
          style={[
            styles.mascot,
            {
              transform: [
                {
                  translateY: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -20],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.Text
          style={[
            styles.welcomeTitle,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          Vamos Aprender Inglês! 🌟
        </Animated.Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
        >
          <Text style={styles.startButtonText}>Começar Aventura! 🚀</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/treasure-map.png')}
        style={styles.mapBackground}
      />
      <View style={styles.lessonsContainer}>
        {lessons.map((lesson, index) => (
          <TouchableOpacity
            key={lesson.id}
            style={[
              styles.lessonMarker,
              {
                top: `${20 + (index * 15)}%`,
                left: `${15 + (index * 20)}%`,
              },
            ]}
            onPress={() => {
              Speech.speak(lesson.title, { language: 'pt-BR' });
              navigation.navigate('Lesson', { lesson });
            }}
          >
            <View style={styles.markerContent}>
              <Text style={styles.lessonNumber}>{index + 1}</Text>
              <Text style={styles.lessonIcon}>{lesson.icon}</Text>
            </View>
            <Text style={styles.lessonTitle}>{lesson.title}</Text>
            <Text style={styles.lessonDifficulty}>
              {'⭐'.repeat(lesson.difficulty)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#f4e4bc',
  },
  mapBackground: {
    position: 'absolute',
    width: width,
    height: height,
    opacity: 0.5,
  },
  mascot: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
    marginBottom: 30,
    textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  lessonsContainer: {
    flex: 1,
    position: 'relative',
  },
  lessonMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerContent: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#4CAF50',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  lessonNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  lessonIcon: {
    fontSize: 24,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 5,
    borderRadius: 10,
  },
  lessonDifficulty: {
    fontSize: 12,
    color: '#FFC107',
    marginTop: 2,
  },
});
