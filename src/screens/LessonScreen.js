import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Audio } from 'expo-av';

export default function LessonScreen({ route, navigation }) {
  const { lesson } = route.params;

  const playSound = async (word) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require(`../assets/sounds/${word}.mp3`)
      );
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Palavras Novas</Text>
          <View style={styles.wordsContainer}>
            {lesson.words.map((word, index) => (
              <TouchableOpacity
                key={index}
                style={styles.wordCard}
                onPress={() => playSound(word.english)}
              >
                <Image source={word.image} style={styles.wordImage} />
                <Text style={styles.englishWord}>{word.english}</Text>
                <Text style={styles.portugueseWord}>{word.portuguese}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.exerciseButton}
          onPress={() => navigation.navigate('Exercise', { lesson })}
        >
          <Text style={styles.exerciseButtonText}>
            Praticar! 🎯
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2196F3',
    textAlign: 'center',
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  wordCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    margin: 10,
    alignItems: 'center',
    width: 150,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  wordImage: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 10,
  },
  englishWord: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2196F3',
  },
  portugueseWord: {
    fontSize: 16,
    color: '#666',
  },
  exerciseButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  exerciseButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
