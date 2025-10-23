# 📱 Como Testar o App no Celular

## 🎯 Opção 1: Expo Go (Desenvolvimento Rápido)

### Passo 1: Instalar Expo Go no seu celular
- **Android**: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)

### Passo 2: No seu computador
```bash
# Clonar o repositório
git clone https://github.com/Liffel73/appcrianca.git
cd appcrianca

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm start
```

### Passo 3: Conectar o celular
- **Android**: Escaneie o QR code com o app Expo Go
- **iOS**: Escaneie o QR code com a câmera do iPhone

⚠️ **Importante**: Seu celular e computador devem estar na mesma rede Wi-Fi!

---

## 🚀 Opção 2: EAS Build (Build Completo via GitHub)

Esta é a melhor opção para testar o app com todas as funcionalidades nativas.

### Passo 1: Criar conta no Expo
1. Acesse: https://expo.dev/signup
2. Crie sua conta gratuita

### Passo 2: Obter Token do Expo
1. Acesse: https://expo.dev/accounts/[seu-usuario]/settings/access-tokens
2. Clique em "Create Token"
3. Dê um nome (ex: "GitHub Actions")
4. Copie o token

### Passo 3: Configurar GitHub Secrets
1. Vá para: https://github.com/Liffel73/appcrianca/settings/secrets/actions
2. Clique em "New repository secret"
3. Nome: `EXPO_TOKEN`
4. Valor: Cole o token do Expo
5. Clique em "Add secret"

### Passo 4: Iniciar Build via GitHub Actions
1. Vá para: https://github.com/Liffel73/appcrianca/actions
2. Clique em "EAS Build" no menu lateral
3. Clique em "Run workflow"
4. Escolha a plataforma (android/ios/all)
5. Clique em "Run workflow"

### Passo 5: Baixar o APK/IPA
1. Após o build terminar (5-15 minutos):
2. Acesse: https://expo.dev/accounts/[seu-usuario]/projects/kids-english-app/builds
3. Clique no build mais recente
4. Clique em "Download" para baixar o APK (Android) ou IPA (iOS)

### Passo 6: Instalar no celular

#### Android:
- Transfira o APK para o celular
- Abra o arquivo e instale
- Pode ser necessário permitir "Instalar apps de fontes desconhecidas"

#### iOS:
- Baixe o app "TestFlight" da App Store
- Ou use ferramentas como "AltStore" ou "Sideloadly"

---

## 🛠️ Opção 3: Build Local (Mais Controle)

### Android (APK local):
```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login no Expo
eas login

# Build Android
eas build --platform android --profile preview --local
```

### iOS (IPA local - requer Mac):
```bash
# Build iOS
eas build --platform ios --profile preview --local
```

O arquivo será salvo na pasta do projeto após o build.

---

## 📦 Alternativa: Publicar no Expo Go (Sem Build)

Se quiser que outras pessoas testem sem precisar clonar o repo:

```bash
# Login no Expo
npx expo login

# Publicar o app
npx expo publish
```

Isso gera um link QR code que pode ser compartilhado. Qualquer pessoa com Expo Go pode escanear e testar.

---

## 🔍 Verificar Status do Build

- **Via GitHub**: https://github.com/Liffel73/appcrianca/actions
- **Via Expo**: https://expo.dev/accounts/[seu-usuario]/projects/kids-english-app/builds

---

## ❓ Problemas Comuns

### "Unable to resolve module"
```bash
npm install
npm start -- --clear
```

### "Network response timed out"
- Verifique se está na mesma rede Wi-Fi
- Tente usar `npm start -- --tunnel`

### Build falhou no GitHub Actions
- Verifique se o `EXPO_TOKEN` está configurado corretamente
- Verifique os logs em: https://github.com/Liffel73/appcrianca/actions

### App não abre no Expo Go
Este app usa bibliotecas nativas customizadas (Three.js, PIXI, etc) que não funcionam no Expo Go.
**Solução**: Use EAS Build (Opção 2) para criar um APK/IPA completo.

---

## 📞 Suporte

- Documentação Expo: https://docs.expo.dev
- Fórum Expo: https://forums.expo.dev
- Discord Expo: https://chat.expo.dev
