# Kids English App - Mobile

Aplicativo mobile para ensino de inglês para crianças, desenvolvido com React Native e Expo.

## Tecnologias

- **Frontend Mobile**: React Native + Expo
- **Backend**: Python + Flask
- **Banco de Dados**: Supabase / SQLite
- **Áudio**: Edge TTS para síntese de voz

## Estrutura do Projeto

```
kids-english-mobile/
├── app/                    # Telas do aplicativo (Expo Router)
├── components/             # Componentes reutilizáveis
├── services/              # Serviços de API e integrações
├── hooks/                 # Custom React Hooks
├── constants/             # Constantes e configurações
├── assets/                # Imagens, fontes, etc
├── backend/               # API Python/Flask
└── public/                # Arquivos públicos
```

## Instalação

### 1. Dependências do Mobile

```bash
npm install
```

### 2. Dependências do Backend

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configuração

Crie um arquivo `.env` na raiz com:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000
SUPABASE_URL=sua_url_supabase
SUPABASE_KEY=sua_chave_supabase
```

## Executar o Projeto

### Iniciar o Backend

```bash
python backend/english_audio_service.py
```

### Iniciar o App Mobile

```bash
npx expo start
```

Escaneie o QR code com o aplicativo Expo Go (iOS/Android) ou rode em um emulador.

## Funcionalidades

- Ensino de inglês interativo
- Síntese de voz com Edge TTS
- Reconhecimento de fala
- Sistema de salas e ambientes
- Autenticação de usuários
- Progresso do aluno

## Deploy

O aplicativo pode ser publicado via:
- Expo Application Services (EAS)
- Build standalone APK/IPA

## Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

MIT
