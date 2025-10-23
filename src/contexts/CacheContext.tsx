/**
 * CacheContext
 * Contexto global para gerenciamento de cache
 * 
 * Funcionalidades:
 * - Provedor global de cache
 * - Estatísticas em tempo real
 * - Limpeza automática
 * - Sincronização entre componentes
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { cacheService, useCache as useCacheHook } from '../services/cache';
import { Alert } from 'react-native';

interface CacheStats {
  audioCount: number;
  aiCount: number;
  totalSize: number;
  oldestEntry: number;
  hitRate: number;
}

interface CacheContextType {
  // Estados
  stats: CacheStats;
  isLoading: boolean;
  
  // Métodos
  getCachedAudio: (word: string, voice: string, fetchFn: () => Promise<string>) => Promise<string>;
  getCachedAIResponse: (prompt: string, context: string, fetchFn: () => Promise<any>) => Promise<any>;
  clearCache: () => Promise<void>;
  updateStats: () => Promise<void>;
  getCacheSize: () => string;
  getCacheAge: () => string;
}

const CacheContext = createContext<CacheContextType | null>(null);

/**
 * Provider do Cache
 */
export function CacheProvider({ children }: { children: ReactNode }) {
  const cache = useCacheHook();
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(true);

  /**
   * Configurar limpeza automática
   */
  useEffect(() => {
    if (autoCleanupEnabled) {
      // Verificar cache a cada hora
      const interval = setInterval(() => {
        // cacheService.performCleanup() - método não existe, desabilitado
        cache.updateStats();
      }, 60 * 60 * 1000); // 1 hora

      return () => clearInterval(interval);
    }
  }, [autoCleanupEnabled, cache]);

  /**
   * Atualizar estatísticas ao montar
   */
  useEffect(() => {
    cache.updateStats();
  }, []);

  /**
   * Formatar tamanho do cache
   */
  const getCacheSize = (): string => {
    const sizeInMB = cache.stats.totalSize / (1024 * 1024);
    
    if (sizeInMB < 1) {
      return `${(cache.stats.totalSize / 1024).toFixed(2)} KB`;
    }
    
    return `${sizeInMB.toFixed(2)} MB`;
  };

  /**
   * Formatar idade do cache
   */
  const getCacheAge = (): string => {
    const ageInMs = Date.now() - cache.stats.oldestEntry;
    const ageInHours = ageInMs / (1000 * 60 * 60);
    
    if (ageInHours < 1) {
      return 'Menos de 1 hora';
    }
    
    if (ageInHours < 24) {
      return `${Math.floor(ageInHours)} hora${Math.floor(ageInHours) > 1 ? 's' : ''}`;
    }
    
    const ageInDays = ageInHours / 24;
    return `${Math.floor(ageInDays)} dia${Math.floor(ageInDays) > 1 ? 's' : ''}`;
  };

  /**
   * Limpar cache com confirmação
   */
  const clearCacheWithConfirmation = async () => {
    Alert.alert(
      'Limpar Cache',
      `Isso vai remover ${cache.stats.audioCount + cache.stats.aiCount} itens (${getCacheSize()}).\nDeseja continuar?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await cache.clearCache();
            Alert.alert('Cache Limpo', 'Todo o cache foi removido com sucesso.');
          },
        },
      ]
    );
  };

  const value: CacheContextType = {
    stats: cache.stats,
    isLoading: cache.isLoading,
    getCachedAudio: cache.getCachedAudio,
    getCachedAIResponse: cache.getCachedAIResponse,
    clearCache: clearCacheWithConfirmation,
    updateStats: cache.updateStats,
    getCacheSize,
    getCacheAge,
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
}

/**
 * Hook para usar o cache
 */
export function useCache() {
  const context = useContext(CacheContext);
  
  if (!context) {
    throw new Error('useCache deve ser usado dentro de CacheProvider');
  }
  
  return context;
}

/**
 * Componente de debug para mostrar estatísticas
 */
export function CacheDebugInfo() {
  const { stats, getCacheSize, getCacheAge } = useCache();
  
  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugTitle}>📊 Cache Stats</Text>
      <Text style={styles.debugText}>Áudios: {stats.audioCount}</Text>
      <Text style={styles.debugText}>Respostas IA: {stats.aiCount}</Text>
      <Text style={styles.debugText}>Tamanho: {getCacheSize()}</Text>
      <Text style={styles.debugText}>Idade: {getCacheAge()}</Text>
      <Text style={styles.debugText}>Hit Rate: {(stats.hitRate * 100).toFixed(1)}%</Text>
    </View>
  );
}

// Estilos para o componente de debug
import { View, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  debugContainer: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 5,
    zIndex: 9999,
  },
  debugTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugText: {
    color: '#fff',
    fontSize: 10,
    marginBottom: 2,
  },
});

export default CacheContext;