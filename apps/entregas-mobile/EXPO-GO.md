# 📱 Rodar App no Expo Go

Guia completo para rodar o app de entregas mobile no Expo Go.

## 📋 Pré-requisitos

### 1. Instalar Node.js
- Versão 18 ou superior
- Download: https://nodejs.org/

### 2. Instalar Expo CLI
```bash
npm install -g expo-cli
```

### 3. Instalar Expo Go no Celular

**Android:**
- Google Play Store: https://play.google.com/store/apps/details?id=host.exp.exponent

**iOS:**
- App Store: https://apps.apple.com/app/expo-go/id982107779

## 🚀 Iniciar o App

### 1. Instalar Dependências

```bash
cd apps/entregas-mobile
npm install
```

### 2. Configurar API

Edite o arquivo `src/config/api.ts`:

```typescript
// Para desenvolvimento local
export const API_URL = 'http://SEU-IP-LOCAL:3000';

// Exemplo:
export const API_URL = 'http://192.168.1.100:3000';

// Para produção
// export const API_URL = 'https://gestaoescolar-backend.vercel.app';
```

**⚠️ IMPORTANTE:** 
- Use o IP da sua máquina na rede local (não use `localhost`)
- O celular e o computador devem estar na mesma rede Wi-Fi
- Para descobrir seu IP:
  - Windows: `ipconfig` (procure por "IPv4")
  - Mac/Linux: `ifconfig` ou `ip addr`

### 3. Iniciar o Servidor

```bash
npm start
```

Ou para limpar o cache:
```bash
npm start -- --clear
```

### 4. Abrir no Expo Go

Após iniciar, você verá um QR Code no terminal.

**Android:**
1. Abra o app Expo Go
2. Toque em "Scan QR Code"
3. Escaneie o QR Code do terminal

**iOS:**
1. Abra o app Câmera nativo
2. Aponte para o QR Code
3. Toque na notificação que aparecer
4. O app abrirá no Expo Go

**Alternativa (ambos):**
- Pressione `a` no terminal para Android
- Pressione `i` no terminal para iOS (requer Mac)
- Pressione `w` para abrir no navegador

## 🔧 Comandos Úteis

```bash
# Iniciar normalmente
npm start

# Limpar cache e iniciar
npm start -- --clear

# Abrir no Android
npm run android

# Abrir no iOS (requer Mac)
npm run ios

# Abrir no navegador
npm run web

# Verificar tipos TypeScript
npx tsc --noEmit
```

## 🐛 Troubleshooting

### Erro: "Unable to resolve module"

**Solução:**
```bash
# Limpar cache
rm -rf node_modules
npm install
npm start -- --clear
```

### Erro: "Network response timed out"

**Problema:** App não consegue conectar com a API

**Solução:**
1. Verifique se o backend está rodando
2. Confirme que está usando o IP correto (não localhost)
3. Verifique se celular e PC estão na mesma rede
4. Desative firewall temporariamente para testar

### Erro: "Camera permission denied"

**Solução:**
1. Vá em Configurações do celular
2. Apps → Expo Go → Permissões
3. Ative a permissão de Câmera

### App não carrega no Expo Go

**Solução:**
```bash
# Limpar tudo
rm -rf node_modules
rm package-lock.json
npm install
npm start -- --clear
```

### Erro: "Invariant Violation: Module AppRegistry is not a registered callable module"

**Solução:**
```bash
# Reinstalar Expo
npm install expo@~49.0.0
npm start -- --clear
```

## 📱 Funcionalidades Disponíveis no Expo Go

✅ **Funcionam:**
- Navegação entre telas
- Listagem de rotas e escolas
- Formulários de entrega
- AsyncStorage (armazenamento local)
- Câmera (com permissão)
- Localização (com permissão)
- Notificações
- Modo offline básico

❌ **Não funcionam (requerem build nativo):**
- Notificações push personalizadas
- Background tasks avançados
- Alguns módulos nativos específicos

## 🔐 Permissões

O app solicita as seguintes permissões:

- **Câmera**: Para escanear QR Code e tirar fotos de comprovante
- **Localização**: Para registrar local da entrega (opcional)
- **Armazenamento**: Para cache offline

## 🌐 Configuração de Rede

### Desenvolvimento Local

1. Backend rodando em `http://localhost:3000`
2. Descubra seu IP local:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```
3. Configure em `src/config/api.ts`:
   ```typescript
   export const API_URL = 'http://192.168.1.100:3000';
   ```

### Produção (Vercel/Netlify)

```typescript
export const API_URL = 'https://gestaoescolar-backend.vercel.app';
```

## 📊 Monitoramento

### Ver Logs

No terminal onde o Expo está rodando, você verá:
- Logs do app
- Erros
- Avisos
- Requisições de rede

### DevTools

Pressione `m` no terminal para abrir o menu de desenvolvedor no celular:
- Reload
- Debug Remote JS
- Show Performance Monitor
- Toggle Element Inspector

## 🚀 Próximos Passos

### Para Desenvolvimento

1. Mantenha o Expo Go instalado
2. Use `npm start` para desenvolvimento rápido
3. Teste em dispositivos reais

### Para Produção

Quando estiver pronto para publicar:

1. **Build Standalone (APK/IPA):**
```bash
# Android
eas build --platform android

# iOS
eas build --platform ios
```

2. **Publicar no Expo:**
```bash
expo publish
```

3. **Submeter para Lojas:**
```bash
# Google Play
eas submit --platform android

# App Store
eas submit --platform ios
```

## 📚 Recursos

- [Documentação Expo](https://docs.expo.dev/)
- [Expo Go](https://expo.dev/client)
- [React Native](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)

## 💡 Dicas

1. **Hot Reload**: Salve o arquivo e o app recarrega automaticamente
2. **Shake para Menu**: Agite o celular para abrir o menu de desenvolvedor
3. **Logs**: Use `console.log()` para debug
4. **Network**: Verifique requisições no terminal
5. **Cache**: Limpe o cache se algo estranho acontecer

## ⚡ Performance

Para melhor performance no Expo Go:

1. Minimize o uso de imagens grandes
2. Use `React.memo` para componentes pesados
3. Evite re-renders desnecessários
4. Use `FlatList` para listas longas
5. Otimize navegação com `lazy loading`

## 🎯 Checklist Antes de Testar

- [ ] Node.js instalado
- [ ] Expo CLI instalado globalmente
- [ ] Expo Go instalado no celular
- [ ] Dependências instaladas (`npm install`)
- [ ] API configurada com IP correto
- [ ] Backend rodando
- [ ] Celular e PC na mesma rede Wi-Fi
- [ ] Permissões concedidas no celular

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs no terminal
2. Limpe o cache: `npm start -- --clear`
3. Reinstale dependências: `rm -rf node_modules && npm install`
4. Consulte a documentação do Expo
5. Verifique issues no GitHub do Expo

---

**Pronto para começar?**

```bash
cd apps/entregas-mobile
npm install
npm start
```

Escaneie o QR Code e comece a desenvolver! 🚀
