/**
 * AuthContext - Gerencia autenticação e estado do usuário
 *
 * Funcionalidades:
 * - Login/Registro/Logout
 * - Persistência de sessão
 * - Gerenciamento de perfil do usuário
 * - Sincronização com Supabase
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase, signIn, signUp, signOut, getCurrentProfile, type Profile } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar sessão ao inicializar
  useEffect(() => {
    loadSession();
  }, []);

  // Listener de mudanças de autenticação
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔐 Auth event:', event, 'User:', currentSession?.user?.email);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          console.log('📊 Loading user profile...');
          // Carregar profile do usuário
          await loadProfile();
          console.log('✅ Profile loaded');
        } else {
          console.log('❌ No user session');
          setProfile(null);
        }

        console.log('🏁 Setting loading to false');
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function loadSession() {
    try {
      console.log('🔄 Loading session...');

      // Timeout de 8 segundos para carregar sessão
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Session load timeout')), 8000)
      );

      const sessionPromise = supabase.auth.getSession();

      const { data: { session: currentSession }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]).catch((err) => {
        console.warn('⏰ Session load timeout or error:', err.message);
        return { data: { session: null }, error: null };
      });

      if (error) {
        console.error('❌ Erro ao carregar sessão:', error.message);
        setLoading(false);
        return;
      }

      console.log('📦 Session loaded:', currentSession?.user?.email || 'none');
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        console.log('👤 User found, loading profile...');
        await loadProfile();
      } else {
        console.log('⚠️ No active session');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar sessão:', error);
    } finally {
      console.log('🏁 loadSession finished, setting loading=false');
      setLoading(false);
    }
  }

  async function loadProfile() {
    try {
      console.log('📊 Fetching profile from database...');

      // Timeout de 5 segundos para evitar travamento
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn('⏰ Profile loading timeout - using fallback');
          resolve(null);
        }, 5000)
      );

      const userProfile = await Promise.race([
        getCurrentProfile(),
        timeoutPromise
      ]);

      console.log('✅ Profile carregado:', userProfile?.username || 'null');
      setProfile(userProfile);
    } catch (error) {
      console.error('❌ Erro ao carregar profile:', error);
      setProfile(null);
    }
  }

  async function handleSignIn(email: string, password: string) {
    try {
      setLoading(true);
      const data = await signIn(email, password);
      console.log('✅ Login bem-sucedido:', data.user?.email);
      await loadProfile();
    } catch (error: any) {
      console.error('❌ Erro no login:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(email: string, password: string, username: string) {
    try {
      setLoading(true);
      const data = await signUp(email, password, username);
      console.log('✅ Registro bem-sucedido:', data.user?.email);
      // Profile será criado automaticamente pelo trigger do Supabase
      await loadProfile();
    } catch (error: any) {
      console.error('❌ Erro no registro:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      setLoading(true);
      await signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      console.log('✅ Logout bem-sucedido');
    } catch (error: any) {
      console.error('❌ Erro no logout:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    refreshProfile: loadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
