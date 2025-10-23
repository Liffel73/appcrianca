import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getEnvironmentById } from '../data/gameData';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function EnvironmentMenuScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const { environmentId, environmentName } = params as {
    environmentId: string;
    environmentName: string;
  };

  const [learnedWords, setLearnedWords] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);

  const environment = getEnvironmentById(environmentId);

  useEffect(() => {
    loadProgress();
  }, [profile]);

  const loadProgress = async () => {
    if (!profile) return;

    try {
      // For now, use empty progress
      setLearnedWords(new Set());
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoomProgress = (roomId: string): number => {
    const room = environment?.rooms.find(r => r.id === roomId);
    if (!room) return 0;

    const totalObjects = room.objects.length;
    const learnedCount = room.objects.filter(obj => learnedWords.has(obj.word)).length;

    return totalObjects > 0 ? (learnedCount / totalObjects) * 100 : 0;
  };

  const getRoomLearnedCount = (roomId: string): number => {
    const room = environment?.rooms.find(r => r.id === roomId);
    if (!room) return 0;

    return room.objects.filter(obj => learnedWords.has(obj.word)).length;
  };

  if (!environment) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Ambiente não encontrado</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>‹ Voltar</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerEmoji}>{environment.emoji}</Text>
          <Text style={styles.headerText}>{environment.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Escolha uma Sala</Text>

        {environment.rooms.map((room) => {
          const progress = getRoomProgress(room.id);
          const learnedCount = getRoomLearnedCount(room.id);
          const totalObjects = room.objects.length;
          const isCompleted = progress === 100;

          return (
            <TouchableOpacity
              key={room.id}
              style={[
                styles.roomCard,
                isCompleted && styles.roomCardCompleted,
              ]}
              onPress={() => {
                router.push({
                  pathname: '/room',
                  params: {
                    environmentId,
                    roomId: room.id,
                    roomName: room.name,
                  },
                });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.roomHeader}>
                <Text style={styles.roomName}>{room.name}</Text>
                {isCompleted && <Text style={styles.completedBadge}>✓ Completo</Text>}
              </View>

              <View style={styles.roomStats}>
                <Text style={styles.roomObjectCount}>
                  📦 {totalObjects} objetos
                </Text>
                <Text style={styles.roomLearnedCount}>
                  {learnedCount}/{totalObjects} aprendidos
                </Text>
              </View>

              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>

              <Text style={styles.progressText}>{progress.toFixed(0)}% completo</Text>

              <View style={styles.roomFooter}>
                <Text style={styles.playButton}>Explorar ›</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Como jogar</Text>
          <Text style={styles.tipsText}>
            • Explore a sala clicando nos objetos{'\n'}
            • Ouça a pronúncia em inglês{'\n'}
            • Aprenda novas palavras{'\n'}
            • Complete 100% para ganhar o distintivo!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4A90E2',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  roomCardCompleted: {
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  roomStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  roomObjectCount: {
    fontSize: 14,
    color: '#666',
  },
  roomLearnedCount: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#E6F2FF',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 12,
  },
  roomFooter: {
    alignItems: 'flex-end',
  },
  playButton: {
    fontSize: 18,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  tipsSection: {
    backgroundColor: '#FFE082',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 40,
  },
});
