# 📱 App Entregador Native (React Native + Expo)

Versão nativa do App Entregador para Android e iOS.

## 🚀 Início Rápido

### 1. Instalar Dependências

```bash
cd apps/entregador-native
npm install
```

### 2. Configurar API

Edite `src/api/client.ts` e coloque seu IP local:

```typescript
export const API_URL = __DEV__ 
  ? 'http://SEU-IP-LOCAL:3000/api' // Exemplo: 192.168.1.100
  : 'https://gestaoescolar-backend.vercel.app/api';
```

**Como descobrir seu IP:**
- Windows: `ipconfig`
- Mac/Linux: `ifconfig`

### 3. Iniciar

```bash
npm start
```

Depois escaneie o QR Code com o **Expo Go**.

## 📱 Instalar Expo Go

- **Android:** [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS:** [App Store](https://apps.apple.com/app/expo-go/id982107779)

## 🎯 Funcionalidades

- ✅ Login com autenticação JWT
- ✅ Listagem de rotas
- ✅ Scanner de QR Code para filtro
- ✅ Detalhes de escolas e itens
- ✅ Confirmação de entregas
- ✅ Assinatura digital
- ✅ Histórico de entregas
- ✅ Modo offline
- ✅ Sincronização automática

## 📂 Estrutura

```
apps/entregador-native/
├── src/
│   ├── api/              # Chamadas à API
│   │   ├── client.ts     # Cliente HTTP
│   │   ├── auth.ts       # Autenticação
│   │   └── rotas.ts      # Endpoints de rotas
│   ├── screens/          # Telas do app
│   │   ├── LoginScreen.tsx
│   │   ├── RotasScreen.tsx
│   │   ├── RotaDetalheScreen.tsx
│   │   ├── EscolaDetalheScreen.tsx
│   │   └── HistoricoScreen.tsx
│   ├── components/       # Componentes reutilizáveis
│   │   ├── QRScanner.tsx
│   │   └── SignaturePad.tsx
│   └── theme.ts          # Tema do app
├── assets/               # Imagens e ícones
├── App.tsx              # Componente principal
├── app.json             # Configuração do Expo
└── package.json         # Dependências

```

## 🔧 Comandos

```bash
# Iniciar
npm start

# Android
npm run android

# iOS (requer Mac)
npm run ios

# Web
npm run web

# Limpar cache
npm start -- --clear
```

## 📦 Build para Produção

### Android APK

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login no Expo
eas login

# Configurar
eas build:configure

# Build APK
eas build --platform android --profile preview

# Build AAB (Google Play)
eas build --platform android --profile production
```

### iOS

```bash
# Build IPA
eas build --platform ios --profile production
```

## 🔐 Permissões

O app solicita:
- **Câmera**: Para scanner QR Code e fotos
- **Internet**: Para comunicação com API
- **Armazenamento**: Para cache offline

## 🌐 Configuração de Rede

### Desenvolvimento Local

1. Backend rodando em `http://localhost:3000`
2. Descubra seu IP: `ipconfig` (Windows) ou `ifconfig` (Mac/Linux)
3. Configure em `src/api/client.ts`:
   ```typescript
   export const API_URL = 'http://192.168.1.100:3000/api';
   ```

### Produção

```typescript
export const API_URL = 'https://gestaoescolar-backend.vercel.app/api';
```

## 🐛 Troubleshooting

### "Unable to resolve module"

```bash
rm -rf node_modules
npm install
npm start -- --clear
```

### "Network request failed"

- Verifique se o backend está rodando
- Confirme que está usando o IP correto (não localhost)
- Verifique se celular e PC estão na mesma rede

### Câmera não funciona

- Vá em Configurações → Expo Go → Permissões
- Ative a câmera

## 📚 Tecnologias

- React Native 0.74
- Expo SDK 51
- TypeScript
- React Navigation 6
- React Native Paper 5
- Axios
- AsyncStorage
- Expo Camera (a implementar)

## 🎨 Design

- Material Design 3
- Cor primária: #1976d2 (azul)
- Cor secundária: #4caf50 (verde)
- Tema claro

## 🚀 Próximos Passos

1. Implementar todas as telas
2. Adicionar scanner QR Code
3. Implementar assinatura digital
4. Adicionar modo offline
5. Implementar sincronização
6. Adicionar notificações push
7. Otimizar performance
8. Fazer build de produção

## 📝 Status

🚧 **Em Desenvolvimento**

- [x] Estrutura básica
- [x] Tela de login
- [ ] Tela de rotas
- [ ] Tela de detalhes
- [ ] Scanner QR Code
- [ ] Assinatura digital
- [ ] Modo offline
- [ ] Build Android

## 🤝 Contribuindo

Este app é baseado no app entregador web e está sendo convertido para React Native.

## 📄 Licença

Parte do Sistema de Gestão Escolar.
