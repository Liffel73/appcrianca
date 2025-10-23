import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { environments, getTotalObjects } from '../data/gameData';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

export default function MainMenuScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [learnedWords, setLearnedWords] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [profile]);

  const loadProgress = async () => {
    if (!profile) return;

    try {
      // For now, use empty progress since we're using object_id in database
      // In production, we'll need to join with game_objects table to get words
      setLearnedWords(new Set());
      console.log('📊 Progress loaded (empty for now)');
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalWords = getTotalObjects();
  const progress = totalWords > 0 ? (learnedWords.size / totalWords) * 100 : 0;

  const getEnvironmentProgress = (environmentId: string): number => {
    const environment = environments.find(env => env.id === environmentId);
    if (!environment) return 0;

    const envWords = environment.rooms.reduce((total, room) => {
      return total + room.objects.length;
    }, 0);

    const envLearned = environment.rooms.reduce((total, room) => {
      const roomLearned = room.objects.filter(obj => learnedWords.has(obj.word)).length;
      return total + roomLearned;
    }, 0);

    return envWords > 0 ? (envLearned / envWords) * 100 : 0;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎓 Kids English</Text>
          <Text style={styles.subtitle}>Aprenda inglês brincando!</Text>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Seu Progresso</Text>
            <Text style={styles.progressPercentage}>{progress.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>⭐ {profile?.total_stars || 0}</Text>
              <Text style={styles.statLabel}>Estrelas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>📚 {learnedWords.size}/{totalWords}</Text>
              <Text style={styles.statLabel}>Palavras</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>🎯 Level {profile?.level || 1}</Text>
              <Text style={styles.statLabel}>Nível</Text>
            </View>
          </View>
        </View>

        {/* Environments Grid */}
        <View style={styles.environmentsSection}>
          <Text style={styles.sectionTitle}>Escolha um Ambiente</Text>
          {environments.map((environment) => {
            const envProgress = getEnvironmentProgress(environment.id);
            const roomCount = environment.rooms.length;

            return (
              <TouchableOpacity
                key={environment.id}
                style={styles.environmentCard}
                onPress={() => {
                  router.push({
                    pathname: '/environment-menu',
                    params: {
                      environmentId: environment.id,
                      environmentName: environment.name,
                    },
                  });
                }}
                activeOpacity={0.8}
              >
                <View style={styles.environmentIcon}>
                  <Text style={styles.environmentEmoji}>{environment.emoji}</Text>
                </View>
                <View style={styles.environmentInfo}>
                  <Text style={styles.environmentName}>{environment.name}</Text>
                  <Text style={styles.environmentRooms}>
                    {roomCount} {roomCount === 1 ? 'sala' : 'salas'}
                  </Text>
                  <View style={styles.miniProgressBar}>
                    <View style={[styles.miniProgressFill, { width: `${envProgress}%` }]} />
                  </View>
                  <Text style={styles.miniProgressText}>{envProgress.toFixed(0)}% completo</Text>
                </View>
                <View style={styles.arrow}>
                  <Text style={styles.arrowText}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Dica</Text>
          <Text style={styles.tipsText}>
            Clique nos objetos para aprender novas palavras em inglês! Você ganha estrelas cada vez que aprende algo novo.
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E6F2FF',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E6F2FF',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  environmentsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  environmentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  environmentIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  environmentEmoji: {
    fontSize: 32,
  },
  environmentInfo: {
    flex: 1,
  },
  environmentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  environmentRooms: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  miniProgressBar: {
    height: 6,
    backgroundColor: '#E6F2FF',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  miniProgressText: {
    fontSize: 12,
    color: '#4A90E2',
  },
  arrow: {
    marginLeft: 8,
  },
  arrowText: {
    fontSize: 32,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  tipsSection: {
    backgroundColor: '#FFE082',
    borderRadius: 16,
    padding: 20,
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
    lineHeight: 20,
  },
});
