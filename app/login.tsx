import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signIn } from '../src/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      console.log('🔵 Tentando fazer login...', { email: email.trim().toLowerCase() });
      await signIn(email.trim().toLowerCase(), password);
      console.log('✅ Login realizado com sucesso!');
      // Navigation will be handled by _layout.tsx
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      Alert.alert('Erro no Login', error.message || 'Não foi possível fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTest = () => {
    Alert.alert(
      '⚠️ Modo de Teste',
      'Para testar o app rapidamente, você precisa:\n\n1. Desabilitar confirmação de email no Supabase\n2. Criar uma conta de teste\n\nVeja o arquivo SUPABASE_CONFIG.md para instruções completas.\n\nOu use:\nEmail: teste@exemplo.com\nSenha: 123456\n\n(se você já criou esta conta no dashboard)',
      [
        { text: 'OK' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🎓 Kids English</Text>
        <Text style={styles.subtitle}>Aprenda inglês brincando!</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/register')}
            disabled={loading}
          >
            <Text style={styles.registerText}>
              Não tem conta? <Text style={styles.registerTextBold}>Cadastre-se</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testLink}
            onPress={handleQuickTest}
            disabled={loading}
          >
            <Text style={styles.testText}>
              🧪 Como testar sem cadastro?
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4A90E2',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#E6F2FF',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerTextBold: {
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  testLink: {
    marginTop: 12,
    alignItems: 'center',
    padding: 8,
  },
  testText: {
    fontSize: 13,
    color: '#FF9800',
    textDecorationLine: 'underline',
  },
});
