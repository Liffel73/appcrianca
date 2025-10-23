import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { AudioProvider } from '../src/contexts/AudioContext';
import { CacheProvider } from '../src/contexts/CacheContext';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const inAuthScreen = pathname === '/login' || pathname === '/register';

    console.log('🔍 Navigation check:', { user: !!user, pathname, inAuthScreen });

    if (!user && !inAuthScreen) {
      // Redirect to login if not authenticated
      console.log('➡️ Redirecting to login...');
      router.replace('/login');
    } else if (user && inAuthScreen) {
      // Redirect to main menu if authenticated and in auth screen
      console.log('➡️ Redirecting to main menu...');
      router.replace('/');
    }
  }, [user, loading, pathname]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return <Slot />;
}

export default function Layout() {
  return (
    <AuthProvider>
      <CacheProvider>
        <AudioProvider>
          <RootLayoutNav />
        </AudioProvider>
      </CacheProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});
