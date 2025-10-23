/**
 * Configuração do Supabase para React Native (Expo)
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração direta - Expo lê do .env automaticamente com prefixo EXPO_PUBLIC_
const supabaseUrl = 'https://sjhroilwziquzxftwahx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqaHJvaWx3emlxdXp4ZnR3YWh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjUyMjcsImV4cCI6MjA3NjU0MTIyN30.dEo1t1BpvZUcZfNs8o67qoVSGARERJBdey7uQ-Iag7Y';

/**
 * Cliente Supabase configurado para React Native
 *
 * Features:
 * - Auth persistente usando AsyncStorage
 * - Auto refresh de tokens
 * - Detecção automática de sessão
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Importante para mobile
  },
});

/**
 * Tipos customizados para o banco de dados
 */
export type Profile = {
  id: string;
  username: string;
  full_name?: string;
  age?: number;
  level: number;
  total_stars: number;
  streak_days: number;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
  last_activity?: string;
};

export type UserProgress = {
  id: number;
  user_id: string;
  object_id: number;
  times_heard: number;
  times_practiced: number;
  is_learned: boolean;
  stars_earned: number;
  first_interaction: string;
  last_interaction: string;
  learned_at?: string;
};

export type GameObject = {
  id: number;
  room_id: number;
  unique_id: string;
  word: string;
  short_word?: string;
  translation: string;
  category?: string;
  difficulty: number;
  ipa?: string;
  syllables?: string[];
  position_x: number;
  position_y: number;
  position_z: number;
  color: string;
};

/**
 * Funções auxiliares de autenticação
 */

/**
 * Registrar novo usuário
 */
export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username, // Será usado no trigger para criar o profile
      },
    },
  });

  if (error) {
    console.error('❌ Erro ao registrar:', error.message);
    throw error;
  }

  return data;
}

/**
 * Fazer login
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Erro ao fazer login:', error.message);
    throw error;
  }

  // Atualiza last_login no profile
  if (data.user) {
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id);
  }

  return data;
}

/**
 * Fazer logout
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('❌ Erro ao fazer logout:', error.message);
    throw error;
  }
}

/**
 * Obter sessão atual
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('❌ Erro ao obter sessão:', error.message);
    return null;
  }
  return data.session;
}

/**
 * Obter usuário atual
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('❌ Erro ao obter usuário:', error.message);
    return null;
  }
  return data.user;
}

/**
 * Helper: Timeout para promises
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Obter profile completo do usuário atual
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    console.log('🔍 getCurrentProfile: Starting...');

    // Tentar obter usuário com timeout de 3 segundos
    const user = await withTimeout(getCurrentUser(), 3000).catch((err) => {
      console.warn('⚠️ getCurrentUser timeout or error:', err.message);
      return null;
    });

    if (!user) {
      console.log('⚠️ No user found in getCurrentProfile');
      return null;
    }

    console.log('✅ User found:', user.email);

    // SOLUÇÃO TEMPORÁRIA: Retornar profile padrão
    // Para testes iniciais, usar perfil local
    const defaultProfile: Profile = {
      id: user.id,
      username: user.email?.split('@')[0] || 'user',
      level: 1,
      total_stars: 0,
      streak_days: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    console.log('✅ Returning default profile:', defaultProfile.username);
    return defaultProfile;

    // TODO: Quando o backend estiver funcionando, descomentar:
    /*
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('❌ Erro ao obter profile:', error.message);
      return defaultProfile;
    }

    return data;
    */
  } catch (err) {
    console.error('❌ Exception in getCurrentProfile:', err);
    return null;
  }
}

/**
 * Atualizar profile do usuário
 */
export async function updateProfile(updates: Partial<Profile>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao atualizar profile:', error.message);
    throw error;
  }

  return data;
}

/**
 * Funções de progresso
 */

/**
 * Obter progresso do usuário em um objeto
 */
export async function getUserProgress(objectId: number): Promise<UserProgress | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('object_id', objectId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found (ok)
    console.error('❌ Erro ao obter progresso:', error.message);
    return null;
  }

  return data;
}

/**
 * Obter todo o progresso do usuário
 */
export async function getAllUserProgress(): Promise<UserProgress[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('❌ Erro ao obter progresso:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Atualizar ou criar progresso
 */
export async function upsertUserProgress(objectId: number, updates: Partial<UserProgress>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: user.id,
      object_id: objectId,
      ...updates,
      last_interaction: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao atualizar progresso:', error.message);
    throw error;
  }

  return data;
}

/**
 * Marcar palavra como aprendida
 */
export async function markWordAsLearned(objectId: number) {
  return upsertUserProgress(objectId, {
    is_learned: true,
    learned_at: new Date().toISOString(),
  });
}

/**
 * Incrementar vezes que ouviu
 */
export async function incrementTimesHeard(objectId: number) {
  const current = await getUserProgress(objectId);
  const newCount = (current?.times_heard || 0) + 1;

  return upsertUserProgress(objectId, {
    times_heard: newCount,
  });
}

/**
 * Incrementar vezes que praticou
 */
export async function incrementTimesPracticed(objectId: number) {
  const current = await getUserProgress(objectId);
  const newCount = (current?.times_practiced || 0) + 1;

  return upsertUserProgress(objectId, {
    times_practiced: newCount,
  });
}

/**
 * Subscription para mudanças em tempo real no progresso
 */
export function subscribeToUserProgress(callback: (progress: UserProgress) => void) {
  return supabase
    .channel('user_progress_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_progress',
      },
      (payload) => {
        callback(payload.new as UserProgress);
      }
    )
    .subscribe();
}

/**
 * Logging de atividades
 */
export async function logActivity(activityType: string, activityData: any = {}) {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    activity_type: activityType,
    activity_data: activityData,
  });
}
