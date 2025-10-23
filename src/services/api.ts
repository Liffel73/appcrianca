/**
 * API Service
 * Serviço centralizado para todas as chamadas à API
 * 
 * Funcionalidades:
 * - Endpoints organizados
 * - Tratamento de erros
 * - Retry automático
 * - Cache integrado
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração base
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.15.12:8000';

// Usar URL do .env diretamente (já configurado com IP da rede)
const getBaseURL = () => {
  console.log('[API] 🌐 Base URL:', API_BASE);
  return API_BASE;
};

// Criar instância do axios
// SIMPLIFICADO - Como o web faz (SEM timeout global)
const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  // timeout: REMOVIDO - deixar o axios decidir
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para logs
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    
    // Retry automático para erros de rede
    if (error.code === 'ECONNABORTED' && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('[API] Retrying request...');
      return api(originalRequest);
    }
    
    // Tratamento de erros específicos
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error('[API] Não autorizado');
          break;
        case 404:
          console.error('[API] Endpoint não encontrado');
          break;
        case 500:
          console.error('[API] Erro interno do servidor');
          break;
        default:
          console.error(`[API] Erro ${error.response.status}`);
      }
    } else if (error.request) {
      console.error('[API] Sem resposta do servidor');
    } else {
      console.error('[API] Erro ao configurar requisição');
    }
    
    return Promise.reject(error);
  }
);

// ============================================================================
// SERVIÇOS DA API
// ============================================================================

export const apiService = {
  // ========================================
  // Autenticação e Usuário
  // ========================================
  
  auth: {
    login: async (email: string, password: string) => {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    },
    
    register: async (data: any) => {
      const response = await api.post('/auth/register', data);
      return response.data;
    },
    
    logout: async () => {
      const response = await api.post('/auth/logout');
      return response.data;
    },
  },

  // ========================================
  // Objetos e Ambientes
  // ========================================
  
  environments: {
    list: async () => {
      const response = await api.get('/environments');
      return response.data;
    },
    
    getById: async (id: string) => {
      const response = await api.get(`/environments/${id}`);
      return response.data;
    },
  },
  
  rooms: {
    list: async (environmentId: string) => {
      const response = await api.get(`/environments/${environmentId}/rooms`);
      return response.data;
    },
    
    getById: async (environmentId: string, roomId: string) => {
      const response = await api.get(`/environments/${environmentId}/rooms/${roomId}`);
      return response.data;
    },
  },
  
  objects: {
    list: async (roomId: string) => {
      const response = await api.get(`/objects?room_id=${roomId}`);
      return response.data;
    },
    
    getById: async (id: string) => {
      const response = await api.get(`/objects/${id}`);
      return response.data;
    },
  },

  // ========================================
  // IA e Conteúdo
  // ========================================
  
  ai: {
    generateIntro: async (data: {
      object_word: string;
      object_translation: string;
      room?: string;
      environment?: string;
      user_age?: number;
    }) => {
      console.log('[API.ai] Chamando /ai/generate-intro');

      // Criar payload manualmente (sem JSON.stringify complexo)
      const payload = {
        object_word: String(data.object_word || ''),
        object_translation: String(data.object_translation || ''),
        room: String(data.room || 'Living Room'),
        environment: String(data.environment || 'Casa'),
        user_age: Number(data.user_age || 10),
      };

      console.log('[API.ai] Payload preparado:', payload);

      // USAR XMLHttpRequest COM PROTEÇÃO MÁXIMA
      return new Promise((resolve, reject) => {
        let xhr: XMLHttpRequest | null = null;
        let timeoutId: any = null;
        let resolved = false;

        const cleanup = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (xhr) {
            xhr.onreadystatechange = null;
            xhr.onerror = null;
            xhr.ontimeout = null;
            xhr = null;
          }
        };

        const safeResolve = (value: any) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(value);
          }
        };

        const safeReject = (error: any) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            reject(error);
          }
        };

        try {
          console.log('[API.ai] Criando XHR...');
          xhr = new XMLHttpRequest();
          const url = `${getBaseURL()}/ai/generate-intro`;

          console.log('[API.ai] URL:', url);

          // Timeout de 15 segundos
          timeoutId = setTimeout(() => {
            console.error('[API.ai] TIMEOUT');
            if (xhr) xhr.abort();
            safeReject(new Error('Timeout'));
          }, 15000);

          xhr.onreadystatechange = () => {
            try {
              console.log('[API.ai] readyState:', xhr?.readyState);

              if (xhr && xhr.readyState === 4) {
                console.log('[API.ai] Status:', xhr.status);

                if (xhr.status === 200) {
                  try {
                    const text = xhr.responseText;
                    console.log('[API.ai] Response length:', text.length);

                    const json = JSON.parse(text);
                    console.log('[API.ai] Parsed OK');

                    safeResolve(json);
                  } catch (e: any) {
                    console.error('[API.ai] Parse error:', e.message);
                    safeReject(e);
                  }
                } else {
                  console.error('[API.ai] HTTP error:', xhr.status);
                  safeReject(new Error(`HTTP ${xhr.status}`));
                }
              }
            } catch (e: any) {
              console.error('[API.ai] Callback error:', e.message);
              safeReject(e);
            }
          };

          xhr.onerror = (e: any) => {
            console.error('[API.ai] Network error:', e);
            safeReject(new Error('Network error'));
          };

          xhr.ontimeout = () => {
            console.error('[API.ai] XHR timeout');
            safeReject(new Error('XHR timeout'));
          };

          console.log('[API.ai] Opening connection...');
          xhr.open('POST', url, true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.timeout = 15000;

          console.log('[API.ai] Stringifying payload...');
          let body: string;
          try {
            body = JSON.stringify(payload);
            console.log('[API.ai] Body length:', body.length);
          } catch (e: any) {
            console.error('[API.ai] Stringify error:', e.message);
            throw e;
          }

          console.log('[API.ai] Sending...');
          xhr.send(body);
          console.log('[API.ai] Send called');

        } catch (error: any) {
          console.error('[API.ai] Setup error:', error?.message);
          console.error('[API.ai] Stack:', error?.stack);
          safeReject(error);
        }
      });
    },
    
    generatePhrases: async (data: {
      object_word: string;
      object_translation: string;
      user_age?: number;
      difficulty?: string;
      count?: number;
    }) => {
      const response = await api.post('/ai/generate-phrases', data);
      return response.data;
    },
    
    wordBreakdown: async (word: string, translation: string) => {
      const response = await api.post('/ai/word-breakdown', {
        word,
        translation,
      });
      return response.data;
    },
    
    funFacts: async (word: string, translation: string) => {
      const response = await api.post('/ai/fun-facts', {
        word,
        translation,
      });
      return response.data;
    },
    
    generateQuiz: async (data: {
      object_word: string;
      object_translation: string;
      difficulty?: string;
      question_count?: number;
    }) => {
      const response = await api.post('/ai/generate-quiz', data);
      return response.data;
    },
    
    chatWithObject: async (data: {
      object_word: string;
      object_translation: string;
      user_message: string;
      conversation_history?: any[];
      user_age?: number;
    }) => {
      const response = await api.post('/ai/chat-with-object', data);
      return response.data;
    },
    
    conversationalResponse: async (data: {
      user_input: string;
      object_name: string;
      conversation_history?: any[];
    }) => {
      const response = await api.post('/ai/conversational-response', data);
      return response.data;
    },
  },

  // ========================================
  // Áudio e Voz
  // ========================================
  
  audio: {
    textToSpeech: async (text: string, voice?: string, speed?: string) => {
      const endpoint = voice?.includes('pt-BR') ? '/speak-word-pt' : '/speak-word';
      const response = await api.post(endpoint, {
        word: text,
        voice: voice || 'en-US-AvaNeural',
        speed: speed || 'normal',
      });

      // Garantir que a URL seja absoluta
      let audioUrl = response.data.audio_url;
      if (audioUrl && !audioUrl.startsWith('http')) {
        // Se for URL relativa, adicionar base URL
        audioUrl = `${getBaseURL()}${audioUrl}`;
        console.log('[API] 🔗 URL absoluta do áudio:', audioUrl);
      }

      return audioUrl;
    },
    
    speechToText: async (audioBase64: string, language: string = 'pt-BR') => {
      const endpoint = language === 'pt-BR' ? '/speech-to-text-pt' : '/speech-to-text';
      const response = await api.post(endpoint, {
        audio: audioBase64,
      });
      return response.data.transcript;
    },
  },

  // ========================================
  // Exercícios
  // ========================================
  
  exercises: {
    generate: async (data: {
      object_word: string;
      object_translation: string;
      exercise_type: string;
      difficulty?: string;
    }) => {
      const response = await api.post('/exercises/generate', data);
      return response.data;
    },
    
    submit: async (data: {
      exercise_id: string;
      user_answer: any;
      time_spent: number;
    }) => {
      const response = await api.post('/exercises/submit', data);
      return response.data;
    },
  },

  // ========================================
  // Progresso e Estatísticas
  // ========================================
  
  progress: {
    get: async (userId: string) => {
      const response = await api.get(`/progress/${userId}`);
      return response.data;
    },
    
    update: async (userId: string, data: any) => {
      const response = await api.put(`/progress/${userId}`, data);
      return response.data;
    },
    
    markWordLearned: async (userId: string, wordId: string) => {
      const response = await api.post(`/progress/${userId}/words/${wordId}`);
      return response.data;
    },
  },
};

// ============================================================================
// HOOKS CUSTOMIZADOS
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

/**
 * Hook para fazer requisições com loading e erro
 */
export function useApi<T = any>(
  apiCall: (...args: any[]) => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: any[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, dependencies);

  return {
    data,
    loading,
    error,
    execute,
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    },
  };
}

/**
 * Hook para buscar dados ao montar
 */
export function useFetch<T = any>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
) {
  const api = useApi(apiCall, dependencies);

  useEffect(() => {
    api.execute();
  }, dependencies);

  return api;
}

/**
 * Hook para polling de dados
 */
export function usePolling<T = any>(
  apiCall: () => Promise<T>,
  interval: number = 5000,
  enabled: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      try {
        const result = await apiCall();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro');
      }
    };

    // Buscar imediatamente
    fetchData();

    // Configurar polling
    const timer = setInterval(fetchData, interval);

    return () => clearInterval(timer);
  }, [enabled, interval]);

  return { data, loading, error };
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Salva token de autenticação
 */
export async function saveAuthToken(token: string) {
  await AsyncStorage.setItem('auth_token', token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

/**
 * Remove token de autenticação
 */
export async function removeAuthToken() {
  await AsyncStorage.removeItem('auth_token');
  delete api.defaults.headers.common['Authorization'];
}

/**
 * Carrega token de autenticação
 */
export async function loadAuthToken() {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  return token;
}

/**
 * Verifica conectividade com o backend
 */
export async function checkBackendConnection(): Promise<boolean> {
  try {
    const response = await api.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

export default apiService;