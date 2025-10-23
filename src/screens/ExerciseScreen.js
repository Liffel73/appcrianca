import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Audio } from 'expo-av';

export default function ExerciseScreen({ route, navigation }) {
  const { lesson } = route.params;
  const [currentExercise, setCurrentExercise] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const exercise = lesson.exercises[currentExercise];

  const playSound = async (sound) => {
    try {
      const { sound: audioSound } = await Audio.Sound.createAsync(
        require('../assets/sounds/correct.mp3')
      );
      await audioSound.playAsync();
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  const handleAnswer = (answer) => {
    const correct = answer.toLowerCase() === exercise.correct.toLowerCase();
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      playSound('correct');
    }

    setTimeout(() => {
      setShowFeedback(false);
      if (correct && currentExercise < lesson.exercises.length - 1) {
        setCurrentExercise(currentExercise + 1);
      } else if (correct) {
        navigation.navigate('Home');
      }
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{exercise.question}</Text>

      {exercise.image && (
        <Image source={exercise.image} style={styles.image} />
      )}

      <View style={styles.optionsContainer}>
        {exercise.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              showFeedback && option === exercise.correct && styles.correctOption,
              showFeedback && option !== exercise.correct && styles.incorrectOption,
            ]}
            onPress={() => handleAnswer(option)}
            disabled={showFeedback}
          >
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showFeedback && (
        <View style={[styles.feedback, isCorrect ? styles.correctFeedback : styles.incorrectFeedback]}>
          <Text style={styles.feedbackText}>
            {isCorrect ? '🎉 Muito bem!' : '😢 Tente novamente!'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#2196F3',
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 30,
    borderRadius: 15,
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginVertical: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  optionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  correctOption: {
    backgroundColor: '#4CAF50',
  },
  incorrectOption: {
    backgroundColor: '#f44336',
  },
  feedback: {
    position: 'absolute',
    bottom: 40,
    padding: 20,
    borderRadius: 15,
    width: '90%',
  },
  correctFeedback: {
    backgroundColor: '#4CAF50',
  },
  incorrectFeedback: {
    backgroundColor: '#f44336',
  },
  feedbackText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
