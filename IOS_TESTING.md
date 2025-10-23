# 📱 Como Testar no iPhone (Guia Completo)

## 🎯 Método 1: Expo Go (Mais Rápido - Pode não funcionar)

### Por que pode não funcionar?
Seu app usa Three.js, PIXI, e outras bibliotecas nativas que não são suportadas pelo Expo Go padrão.

### Como testar:
1. Baixe **Expo Go** na App Store
2. No computador:
   ```bash
   git clone https://github.com/Liffel73/appcrianca.git
   cd appcrianca
   npm install
   npm start
   ```
3. Escaneie o QR code com a câmera do iPhone
4. Se der erro "Unable to resolve module", use o Método 2

---

## ✅ Método 2: Development Build (RECOMENDADO - GRÁTIS)

Este método cria um app completo que funciona no iPhone por **7 dias** sem precisar pagar os 99 USD da Apple.

### Passo 1: Instalar ferramentas
```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login no Expo (criar conta em expo.dev)
eas login
```

### Passo 2: Criar build de desenvolvimento
```bash
cd appcrianca

# Build iOS de desenvolvimento
eas build --platform ios --profile development
```

**O que acontece:**
- EAS vai pedir seu Apple ID (pode usar ID Apple normal, grátis)
- Vai criar um certificado de desenvolvimento automático
- Build leva ~15 minutos

### Passo 3: Instalar no iPhone

Após o build terminar, você terá 3 opções:

#### Opção A: QR Code (Mais Fácil)
1. EAS mostrará um QR code no terminal
2. Escaneie com a câmera do iPhone
3. Instale o perfil quando solicitado (Configurações > Geral > Gerenciamento de Dispositivo)
4. Abra o app instalado

#### Opção B: Link direto
1. Acesse: https://expo.dev/accounts/[seu-usuario]/projects/kids-english-app/builds
2. Clique no build mais recente
3. Clique em "Install" no seu iPhone
4. Instale o perfil e abra o app

#### Opção C: Download manual
1. Baixe o arquivo .ipa do link acima
2. Use ferramentas como:
   - **Sideloadly** (https://sideloadly.io)
   - **AltStore** (https://altstore.io)
   - **Xcode** (se tiver Mac)

### Passo 4: Confiar no certificado
1. Configurações > Geral > Gerenciamento de Dispositivo
2. Toque no perfil do desenvolvedor
3. Toque em "Confiar"

⚠️ **Importante**: Build de desenvolvimento expira em 7 dias. Você precisará reinstalar após esse período.

---

## 🏆 Método 3: TestFlight (Build de Produção)

Este é o método profissional, mas requer Apple Developer Program (99 USD/ano).

### Requisitos:
- Apple Developer Account (https://developer.apple.com/programs)
- 99 USD/ano

### Passos:

#### 1. Criar App Store Connect App
1. Acesse: https://appstoreconnect.apple.com
2. My Apps > ➕ > New App
3. Preencha:
   - Platform: iOS
   - Name: Kids English App
   - Language: Portuguese (Brazil)
   - Bundle ID: Criar novo
   - SKU: kids-english-app

#### 2. Configurar EAS para TestFlight
```bash
# No diretório do projeto
eas build:configure
```

Edite `eas.json` para adicionar:
```json
{
  "build": {
    "production": {
      "ios": {
        "simulator": false,
        "enterpriseProvisioning": "universal"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "seu-email@example.com",
        "ascAppId": "ID-do-app-store-connect",
        "appleTeamId": "SEU_TEAM_ID"
      }
    }
  }
}
```

#### 3. Fazer build de produção
```bash
# Build para produção
eas build --platform ios --profile production

# Após build terminar, enviar para TestFlight
eas submit --platform ios --latest
```

#### 4. Adicionar testadores no TestFlight
1. App Store Connect > TestFlight
2. "Internal Testing" ou "External Testing"
3. Adicione testadores por email

#### 5. Instalar via TestFlight
1. Testadores recebem convite por email
2. Baixam TestFlight da App Store
3. Instalam o app pelo TestFlight

**Vantagens:**
- Builds não expiram
- Pode adicionar até 10.000 testadores externos
- Experiência profissional

---

## 🔧 Método 4: Via Mac + Xcode (Se você tem Mac)

Se você tem um Mac, pode fazer build localmente:

### 1. Instalar Xcode
- Baixe da App Store (grátis, mas precisa de ~40GB)

### 2. Build local
```bash
cd appcrianca

# Build iOS local
eas build --platform ios --profile development --local
```

### 3. Instalar via Xcode
1. Abra o arquivo `.ipa` no Xcode
2. Window > Devices and Simulators
3. Conecte seu iPhone via USB
4. Arraste o `.ipa` para a lista de apps instalados

---

## 📊 Comparação dos Métodos

| Método | Custo | Duração | Dificuldade | Recomendado |
|--------|-------|---------|-------------|-------------|
| Expo Go | Grátis | Ilimitado | ⭐ Fácil | ❌ Pode não funcionar |
| Development Build | Grátis | 7 dias | ⭐⭐ Médio | ✅ SIM (desenvolvimento) |
| TestFlight | 99 USD/ano | Ilimitado | ⭐⭐⭐ Difícil | ✅ SIM (produção) |
| Mac + Xcode | Grátis* | 7 dias | ⭐⭐⭐⭐ Muito Difícil | ⚠️ Se tiver Mac |

*Requer Mac (caro)

---

## 🚀 Recomendação Final

**Para testar agora (grátis):**
1. Use o **Método 2: Development Build**
2. Não precisa pagar nada
3. Funciona perfeitamente por 7 dias
4. Renovar build a cada 7 dias é rápido

**Para publicar/uso contínuo:**
1. Assine o Apple Developer Program (99 USD/ano)
2. Use o **Método 3: TestFlight**
3. Distribua para até 10.000 testadores
4. Depois publique na App Store

---

## ❓ Problemas Comuns

### "No development team found"
- Use: `eas device:create` para registrar seu iPhone
- EAS criará automaticamente um certificado

### "Provisioning profile expired"
- Normal após 7 dias com conta gratuita
- Faça novo build: `eas build --platform ios --profile development`

### "Untrusted Enterprise Developer"
- Configurações > Geral > Gerenciamento de Dispositivo
- Toque no perfil > "Confiar"

### Build demora muito
- Builds iOS levam ~15-20 minutos
- É normal, Apple é mais lento que Android

---

## 📞 Precisa de Ajuda?

- Documentação EAS: https://docs.expo.dev/build/introduction/
- Fórum Expo: https://forums.expo.dev
- Discord Expo: https://chat.expo.dev
