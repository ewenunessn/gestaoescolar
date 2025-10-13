# 📱 Instalação do App Entregas Mobile

## 🚀 Pré-requisitos

### 1. Node.js
```bash
# Verificar se Node.js está instalado
node --version
# Deve ser v16 ou superior
```

### 2. Expo CLI
```bash
# Instalar Expo CLI globalmente
npm install -g @expo/cli

# Verificar instalação
expo --version
```

### 3. Git
```bash
# Verificar se Git está instalado
git --version
```

## 📦 Instalação Passo a Passo

### 1. Navegar para o diretório
```bash
cd apps/entregas-mobile
```

### 2. Limpar cache (se necessário)
```bash
npm cache clean --force
```

### 3. Instalar dependências
```bash
# Instalar com npm
npm install

# OU instalar com yarn (se preferir)
yarn install
```

### 4. Se houver erros de versão, tente:
```bash
# Deletar node_modules e package-lock.json
rm -rf node_modules package-lock.json

# Reinstalar
npm install
```

## 🔧 Configuração

### 1. Configurar API Backend
Edite o arquivo `src/services/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://SEU_IP_LOCAL:3001/api'  // Substitua SEU_IP_LOCAL
  : 'https://sua-api-producao.com/api';
```

**Importante**: Use o IP da sua máquina, não localhost, para testar no dispositivo físico.

### 2. Encontrar seu IP local
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

## 🚀 Executar o App

### 1. Iniciar o servidor de desenvolvimento
```bash
npm start
```

### 2. Opções de execução
- **Expo Go App**: Escaneie o QR code com o app Expo Go
- **Android Emulator**: Pressione 'a' no terminal
- **iOS Simulator**: Pressione 'i' no terminal (apenas macOS)
- **Web**: Pressione 'w' no terminal

## 📱 Testando no Dispositivo

### Android
1. Instale o **Expo Go** da Play Store
2. Escaneie o QR code que aparece no terminal
3. O app será carregado automaticamente

### iOS
1. Instale o **Expo Go** da App Store
2. Escaneie o QR code com a câmera do iPhone
3. Abra no Expo Go quando solicitado

## 🔧 Solução de Problemas

### Erro: "No matching version found"
```bash
# Limpar cache e reinstalar
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Metro bundler failed"
```bash
# Resetar cache do Metro
npx expo start --clear
```

### Erro: "Unable to resolve module"
```bash
# Reinstalar dependências
rm -rf node_modules
npm install
npx expo install --fix
```

### Erro de permissões (Android)
- Verifique se as permissões estão habilitadas no app
- Câmera, Localização, Armazenamento

## 📋 Checklist de Instalação

- [ ] Node.js v16+ instalado
- [ ] Expo CLI instalado globalmente
- [ ] Dependências instaladas sem erros
- [ ] API backend configurada
- [ ] App executando no Expo Go
- [ ] Permissões funcionando (câmera, GPS)

## 🆘 Ajuda Adicional

### Documentação Oficial
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Paper](https://reactnativepaper.com/)
- [React Navigation](https://reactnavigation.org/)

### Comandos Úteis
```bash
# Ver logs detalhados
npx expo start --dev-client

# Verificar dependências
npx expo doctor

# Atualizar Expo SDK
npx expo install --fix
```

## 🔄 Atualizações

Para atualizar o app:
```bash
# Parar o servidor (Ctrl+C)
git pull origin main
npm install
npm start
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no terminal
2. Consulte a documentação do Expo
3. Verifique se o backend está rodando
4. Teste em um dispositivo diferente