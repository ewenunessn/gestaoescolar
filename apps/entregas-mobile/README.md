# Entregas Mobile

Aplicativo móvel para gerenciamento de entregas escolares.

## 🚀 Funcionalidades

### 📱 **Telas Principais**
- **Login**: Autenticação de entregadores
- **Home**: Dashboard com estatísticas e resumo
- **Rotas**: Visualização de rotas e escolas
- **Entregas**: Lista de entregas por status
- **Perfil**: Configurações do usuário

### 🎯 **Recursos Principais**
- **Gestão de Entregas**: Confirmar/cancelar entregas
- **Localização GPS**: Captura automática de localização
- **Fotos Comprovante**: Câmera integrada para evidências
- **Offline First**: Funciona sem internet (sincroniza depois)
- **Push Notifications**: Notificações de novas entregas

### 📊 **Dashboard**
- Estatísticas em tempo real
- Progresso de entregas por escola
- Rotas disponíveis
- Ações rápidas

## 🛠️ **Tecnologias**

- **React Native** com Expo
- **TypeScript** para tipagem
- **React Navigation** para navegação
- **React Native Paper** para UI
- **Expo Camera** para fotos
- **Expo Location** para GPS
- **AsyncStorage** para dados locais
- **Axios** para API

## 📦 **Instalação**

```bash
# Instalar dependências
npm install

# Instalar Expo CLI (se não tiver)
npm install -g @expo/cli

# Iniciar o projeto
npm start

# Para Android
npm run android

# Para iOS
npm run ios
```

## 🔧 **Configuração**

### API Backend
Edite o arquivo `src/services/api.ts` para configurar a URL da API:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001/api' // Desenvolvimento
  : 'https://sua-api-producao.com/api'; // Produção
```

### Permissões
O app solicita as seguintes permissões:
- **Câmera**: Para fotos de comprovante
- **Localização**: Para GPS das entregas
- **Galeria**: Para selecionar fotos existentes

## 📱 **Fluxo de Uso**

### 1. **Login**
- Entregador faz login com email/senha
- Token é armazenado localmente

### 2. **Dashboard**
- Visualiza estatísticas gerais
- Acessa rotas disponíveis
- Ações rápidas (scanner QR, mapa)

### 3. **Rotas**
- Lista todas as rotas
- Expande para ver escolas
- Navega para detalhes da escola

### 4. **Escola**
- Lista itens para entrega
- Separa por status (pendente/entregue)
- Confirma entregas individuais

### 5. **Confirmar Entrega**
- Informa quantidade entregue
- Nome de quem recebeu
- Tira foto comprovante
- Captura localização GPS
- Confirma a entrega

## 🔄 **Estados dos Itens**

- **Pendente**: Item marcado para entrega, não confirmado
- **Entregue**: Item confirmado com dados completos
- **Não p/ Entrega**: Item não marcado para entrega

## 📊 **Dados Capturados**

Para cada entrega confirmada:
- ✅ Quantidade entregue
- 👤 Nome de quem recebeu
- 📅 Data/hora da entrega
- 📍 Coordenadas GPS
- 📷 Foto comprovante (opcional)
- 💬 Observações (opcional)

## 🎨 **Design System**

### Cores
- **Primary**: #1976d2 (Azul)
- **Success**: #4caf50 (Verde)
- **Warning**: #ff9800 (Laranja)
- **Error**: #f44336 (Vermelho)
- **Background**: #f5f5f5 (Cinza claro)

### Componentes
- Cards com elevação
- Botões arredondados
- Ícones Material Design
- Tipografia consistente

## 🔐 **Segurança**

- Autenticação JWT
- Dados sensíveis criptografados
- Validação de permissões
- Logs de auditoria

## 📈 **Performance**

- Lazy loading de imagens
- Cache de dados locais
- Sincronização inteligente
- Otimização de rede

## 🚀 **Build e Deploy**

### Android
```bash
# Build APK
expo build:android

# Build AAB (Play Store)
expo build:android -t app-bundle
```

### iOS
```bash
# Build IPA
expo build:ios
```

### Configuração EAS
```bash
# Instalar EAS CLI
npm install -g eas-cli

# Configurar projeto
eas build:configure

# Build
eas build --platform android
eas build --platform ios
```

## 📱 **Compatibilidade**

- **Android**: 6.0+ (API 23+)
- **iOS**: 11.0+
- **Expo SDK**: 49.0+
- **React Native**: 0.72+

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT.