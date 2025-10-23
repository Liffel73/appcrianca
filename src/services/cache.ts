/**
 * Cache Service (Simplificado)
 * Sistema de cache temporariamente simplificado para compatibilidade
 */

import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurações de cache
const CACHE_CONFIG = {
  audio: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    prefix: 'audio_cache_',
  },
  ai: {
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    prefix: 'ai_cache_',
  },
};

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class CacheService {
  // Cache em memória como fallback
  private memoryCache: Map<string, CacheEntry> = new Map();
  private useMemoryOnly: boolean = true; // INICIAR EM MODO MEMÓRIA APENAS

  constructor() {
    console.log('[Cache] ✅ Serviço inicializado (MODO APENAS MEMÓRIA - AsyncStorage desabilitado temporariamente)');
  }

  /**
   * Alternar para modo apenas memória (desabilita AsyncStorage)
   */
  enableMemoryOnlyMode() {
    console.warn('[Cache] ⚠️ Ativando modo APENAS MEMÓRIA (AsyncStorage desabilitado)');
    this.useMemoryOnly = true;
  }

  /**
   * Cache de Áudio
   */
  async getAudio(word: string, voice: string): Promise<string | null> {
    try {
      const key = `${CACHE_CONFIG.audio.prefix}${word}_${voice}`;

      // Modo apenas memória
      if (this.useMemoryOnly) {
        const entry = this.memoryCache.get(key);
        if (entry && Date.now() < entry.expiresAt) {
          console.log(`[Cache] ✅ Audio hit (memória): ${word}`);
          return entry.data;
        }
        return null;
      }

      // Buscar com timeout para evitar freeze
      const getItemPromise = AsyncStorage.getItem(key);
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn('[Cache] ⏰ AsyncStorage.getItem (audio) timeout');
          resolve(null);
        }, 1000)
      );

      const cached = await Promise.race([getItemPromise, timeoutPromise]);

      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        if (Date.now() < entry.expiresAt) {
          console.log(`[Cache] ✅ Audio hit: ${word}`);
          return entry.data;
        }
      }
    } catch (error) {
      console.error('[Cache] Erro ao buscar áudio:', error);
    }
    return null;
  }

  async saveAudio(word: string, voice: string, audioUri: string): Promise<void> {
    try {
      const key = `${CACHE_CONFIG.audio.prefix}${word}_${voice}`;
      const entry: CacheEntry = {
        data: audioUri,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_CONFIG.audio.maxAge,
      };

      // Modo apenas memória
      if (this.useMemoryOnly) {
        this.memoryCache.set(key, entry);
        console.log(`[Cache] 💾 Audio salvo (memória): ${word}`);
        return;
      }

      await AsyncStorage.setItem(key, JSON.stringify(entry));
      console.log(`[Cache] 💾 Audio salvo: ${word}`);
    } catch (error) {
      console.error('[Cache] Erro ao salvar áudio:', error);
    }
  }

  /**
   * Cache de respostas IA
   */
  async getAIResponse(prompt: string): Promise<any | null> {
    try {
      const key = `${CACHE_CONFIG.ai.prefix}${this.hashString(prompt)}`;
      console.log('[Cache] 🔍 Buscando chave:', key.substring(0, 50) + '...');

      // Modo apenas memória
      if (this.useMemoryOnly) {
        const entry = this.memoryCache.get(key);
        if (entry && Date.now() < entry.expiresAt) {
          console.log('[Cache] ✅ AI response hit (memória - válido)');
          return entry.data;
        }
        console.log('[Cache] ❌ AI response MISS (memória)');
        return null;
      }

      // Buscar com timeout extremamente curto para evitar freeze
      const getItemPromise = AsyncStorage.getItem(key);
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn('[Cache] ⏰ AsyncStorage.getItem timeout - retornando null');
          resolve(null);
        }, 1000) // 1 segundo de timeout
      );

      const cached = await Promise.race([getItemPromise, timeoutPromise]);
      console.log('[Cache] 📦 Item do AsyncStorage:', cached ? 'encontrado' : 'não encontrado');

      if (cached) {
        try {
          const entry: CacheEntry = JSON.parse(cached);
          console.log('[Cache] 📝 Entry parsed com sucesso');

          if (Date.now() < entry.expiresAt) {
            console.log('[Cache] ✅ AI response hit (válido)');
            return entry.data;
          } else {
            console.log('[Cache] ⏰ Cache expirado');
          }
        } catch (parseError) {
          console.error('[Cache] ❌ Erro ao fazer parse do JSON:', parseError);
          // Remover entrada corrompida (não bloqueante)
          Promise.resolve().then(() => {
            AsyncStorage.removeItem(key).catch(e =>
              console.warn('[Cache] ⚠️ Erro ao remover item corrompido:', e)
            );
          });
        }
      }
    } catch (error) {
      console.error('[Cache] ❌ Erro ao buscar resposta IA:', error);
      console.error('[Cache] ❌ Stack:', (error as any)?.stack);
    }
    return null;
  }

  async saveAIResponse(prompt: string, response: any): Promise<void> {
    try {
      const key = `${CACHE_CONFIG.ai.prefix}${this.hashString(prompt)}`;
      const entry: CacheEntry = {
        data: response,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_CONFIG.ai.maxAge,
      };

      // Modo apenas memória
      if (this.useMemoryOnly) {
        this.memoryCache.set(key, entry);
        console.log('[Cache] 💾 AI response salvo (memória)');
        return;
      }

      await AsyncStorage.setItem(key, JSON.stringify(entry));
      console.log('[Cache] 💾 AI response salvo');
    } catch (error) {
      console.error('[Cache] Erro ao salvar resposta IA:', error);
    }
  }

  /**
   * Limpar todo o cache
   */
  async clearAll(): Promise<void> {
    try {
      // Limpar cache em memória
      if (this.useMemoryOnly) {
        const count = this.memoryCache.size;
        this.memoryCache.clear();
        console.log(`[Cache] 🗑️ ${count} itens removidos (memória)`);
        return;
      }

      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key =>
        key.startsWith(CACHE_CONFIG.audio.prefix) ||
        key.startsWith(CACHE_CONFIG.ai.prefix)
      );

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`[Cache] 🗑️ ${cacheKeys.length} itens removidos`);
      }
    } catch (error) {
      console.error('[Cache] Erro ao limpar:', error);
    }
  }

  /**
   * Hash simples para chaves
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Estatísticas do cache
   */
  async getStats(): Promise<{
    audioCount: number;
    aiCount: number;
    totalSize: number;
  }> {
    try {
      // Modo apenas memória
      if (this.useMemoryOnly) {
        const allKeys = Array.from(this.memoryCache.keys());
        const audioCount = allKeys.filter(k => k.startsWith(CACHE_CONFIG.audio.prefix)).length;
        const aiCount = allKeys.filter(k => k.startsWith(CACHE_CONFIG.ai.prefix)).length;

        return {
          audioCount,
          aiCount,
          totalSize: 0, // Não calculamos tamanho para cache em memória
        };
      }

      const keys = await AsyncStorage.getAllKeys();
      const audioCount = keys.filter(k => k.startsWith(CACHE_CONFIG.audio.prefix)).length;
      const aiCount = keys.filter(k => k.startsWith(CACHE_CONFIG.ai.prefix)).length;

      return {
        audioCount,
        aiCount,
        totalSize: 0, // Simplificado por enquanto
      };
    } catch (error) {
      console.error('[Cache] Erro ao obter stats:', error);
      return { audioCount: 0, aiCount: 0, totalSize: 0 };
    }
  }
}

// Singleton
export const cacheService = new CacheService();

/**
 * Hook React para usar o cache
 */
export function useCache() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    audioCount: 0,
    aiCount: 0,
    totalSize: 0,
    oldestEntry: Date.now(),
    hitRate: 0,
  });

  /**
   * Atualizar estatísticas do cache
   */
  const updateStats = useCallback(async () => {
    try {
      const cacheStats = await cacheService.getStats();
      setStats({
        ...cacheStats,
        oldestEntry: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 dias atrás (aproximado)
        hitRate: 0.7, // Aproximado
      });
    } catch (error) {
      console.error('[useCache] Erro ao atualizar stats:', error);
    }
  }, []);

  /**
   * Get cached audio with fallback
   */
  const getCachedAudio = useCallback(async (
    word: string,
    voice: string,
    fetchFn: () => Promise<string>
  ): Promise<string> => {
    setIsLoading(true);
    try {
      // Tentar buscar do cache COM TIMEOUT
      let cached = null;
      try {
        const cachePromise = cacheService.getAudio(word, voice);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Cache audio lookup timeout')), 2000)
        );
        cached = await Promise.race([cachePromise, timeoutPromise]) as string | null;
      } catch (cacheError) {
        console.warn('[Cache] ⚠️ Erro ao buscar áudio do cache (continuando):', cacheError);
        cached = null;
      }

      if (cached) {
        return cached;
      }

      // Se não encontrou, buscar do servidor COM TIMEOUT
      const fetchPromise = fetchFn();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Audio fetch timeout')), 10000)
      );
      const audioUri = await Promise.race([fetchPromise, timeoutPromise]);

      // Salvar no cache (não bloqueante)
      cacheService.saveAudio(word, voice, audioUri).catch(err =>
        console.warn('[Cache] ⚠️ Erro ao salvar áudio no cache:', err)
      );

      // Atualizar stats (não bloqueante)
      updateStats().catch(err =>
        console.warn('[Cache] ⚠️ Erro ao atualizar stats:', err)
      );

      return audioUri;
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  /**
   * Get cached AI response with fallback
   */
  const getCachedAIResponse = useCallback(async (
    prompt: string,
    context: string,
    fetchFn: () => Promise<any>
  ): Promise<any> => {
    console.log('[Cache] 🔍 getCachedAIResponse iniciado');
    console.log('[Cache] 📝 Prompt:', prompt);
    console.log('[Cache] 📝 Context:', context.substring(0, 50));

    setIsLoading(true);
    try {
      // Criar chave combinando prompt e contexto
      const cacheKey = `${prompt}_${context}`;
      console.log('[Cache] 🔑 Cache key gerada');

      // Tentar buscar do cache COM TIMEOUT
      console.log('[Cache] 🔍 Buscando no cache...');
      let cached = null;
      try {
        const cachePromise = cacheService.getAIResponse(cacheKey);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Cache lookup timeout')), 3000)
        );
        cached = await Promise.race([cachePromise, timeoutPromise]) as any;
        console.log('[Cache] 🏁 Cache lookup concluído');
      } catch (cacheError: any) {
        console.warn('[Cache] ⚠️ Erro ao buscar cache (continuando):', cacheError?.message);
        cached = null;
      }

      if (cached) {
        console.log('[Cache] ✅ Cache HIT - retornando do cache');
        return cached;
      }

      console.log('[Cache] ❌ Cache MISS - buscando da API...');

      // Se não encontrou, buscar do servidor COM TIMEOUT
      console.log('[Cache] 📡 Chamando fetchFn...');
      const fetchPromise = fetchFn();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('API request timeout')), 15000)
      );
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      console.log('[Cache] ✅ Resposta recebida da API');

      // Salvar no cache (não bloqueante, com proteção adicional)
      console.log('[Cache] 💾 Salvando no cache...');
      Promise.resolve().then(async () => {
        try {
          await cacheService.saveAIResponse(cacheKey, response);
          console.log('[Cache] 💾 Salvo com sucesso');
        } catch (err) {
          console.warn('[Cache] ⚠️ Erro ao salvar no cache:', err);
        }
      });

      // Atualizar stats (não bloqueante, com proteção adicional)
      console.log('[Cache] 📊 Atualizando stats...');
      Promise.resolve().then(async () => {
        try {
          await updateStats();
        } catch (err) {
          console.warn('[Cache] ⚠️ Erro ao atualizar stats:', err);
        }
      });

      console.log('[Cache] ✅ getCachedAIResponse concluído com sucesso');
      return response;
    } catch (error: any) {
      console.error('[Cache] ❌ ERRO em getCachedAIResponse:', error);
      console.error('[Cache] ❌ Stack:', error?.stack);
      console.error('[Cache] ❌ Message:', error?.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  /**
   * Limpar todo o cache
   */
  const clearCache = useCallback(async () => {
    setIsLoading(true);
    try {
      await cacheService.clearAll();
      await updateStats();
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  return {
    isLoading,
    stats,
    getCachedAudio,
    getCachedAIResponse,
    clearCache,
    updateStats,
  };
}
