import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext.tsx';
import { CacheProvider } from './src/contexts/CacheContext.tsx';
import { AudioProvider } from './src/contexts/AudioContext.tsx';
import LoginScreen from './src/screens/LoginScreen.tsx';
import RegisterScreen from './src/screens/RegisterScreen.tsx';
import MainMenuScreen from './src/screens/MainMenuScreen.tsx';
import EnvironmentMenuScreen from './src/screens/EnvironmentMenuScreen.tsx';
import RoomScreen from './src/screens/RoomScreen.tsx';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!user ? (
        // Telas de autenticação (usuário não logado)
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
          />
        </>
      ) : (
        // Telas do app (usuário logado)
        <>
          <Stack.Screen
            name="MainMenu"
            component={MainMenuScreen}
          />
          <Stack.Screen
            name="EnvironmentMenu"
            component={EnvironmentMenuScreen}
          />
          <Stack.Screen
            name="Room"
            component={RoomScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <CacheProvider>
      <AudioProvider>
        <AuthProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </AudioProvider>
    </CacheProvider>
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
