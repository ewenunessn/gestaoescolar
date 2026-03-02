# 🚀 Início Rápido - App Entregador Native

## 📱 Passo a Passo

### 1. Instalar Dependências

```bash
cd apps/entregador-native
npm install
```

**Se der erro de `babel-preset-expo`:**
```bash
npm install babel-preset-expo @types/react @types/react-native
```

### 2. Configurar IP da API

Edite `src/api/client.ts` na linha 6:

```typescript
export const API_URL = __DEV__ 
  ? 'http://192.168.1.100:3000/api' // ← COLOQUE SEU IP AQUI
  : 'https://gestaoescolar-backend.vercel.app/api';
```

**Como descobrir seu IP:**
- Windows: Abra CMD e digite `ipconfig`
- Mac/Linux: Abra Terminal e digite `ifconfig`
- Procure por "IPv4" ou "inet"

### 3. Iniciar o App

```bash
npm start
```

Você verá:
- Um QR Code no terminal
- Uma URL (exemplo: exp://192.168.1.100:8081)
- Opções para abrir em Android/iOS/Web

### 4. Abrir no Celular

1. Instale o **Expo Go** no seu celular:
   - [Android - Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Abra o Expo Go e escaneie o QR Code que aparece no terminal

3. Aguarde o app carregar (primeira vez pode demorar)

## ✅ Pronto!

O app vai abrir no seu celular. Você pode:
- Fazer login
- Ver rotas
- Ver escolas
- Ver itens para entrega

## 🔧 Comandos Úteis

```bash
# Iniciar
npm start

# Limpar cache
npm start -- --clear

# Android (com emulador)
npm run android

# iOS (requer Mac)
npm run ios
```

## 🐛 Problemas?

### "Cannot find module 'babel-preset-expo'"
```bash
npm install babel-preset-expo @types/react @types/react-native
```

### "Network request failed"
- Verifique se o backend está rodando
- Confirme que usou o IP correto (não localhost)
- Celular e PC devem estar na mesma rede WiFi

### "Unable to resolve module"
```bash
rm -rf node_modules
npm install
npm start -- --clear
```

### "Expo Go 54 incompatível"
Este app usa Expo SDK 51 (estável). O Expo Go mais recente é compatível.
Se tiver problemas, desinstale e reinstale o Expo Go.

### Câmera não funciona
- Vá em Configurações do celular
- Expo Go → Permissões
- Ative a câmera

## 📚 Próximos Passos

1. Implementar confirmação de entregas
2. Adicionar scanner QR Code
3. Adicionar assinatura digital
4. Implementar modo offline
5. Fazer build APK

## 📖 Documentação Completa

Veja [README.md](./README.md) para mais detalhes.
