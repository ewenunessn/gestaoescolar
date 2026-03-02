# 🔄 Migração: App Web → App Native

Guia de diferenças entre o app entregador web (PWA) e o app nativo (React Native).

## 📊 Comparação

| Recurso | App Web (PWA) | App Native (React Native) |
|---------|---------------|---------------------------|
| **Plataforma** | Navegador | Android/iOS |
| **Instalação** | Via navegador | Via APK/App Store |
| **Offline** | Service Worker | AsyncStorage + NetInfo |
| **Câmera** | HTML5 getUserMedia | expo-camera |
| **Armazenamento** | localStorage | AsyncStorage |
| **Navegação** | React Router | React Navigation |
| **UI** | CSS/Tailwind | React Native Paper |
| **Performance** | Boa | Excelente |
| **Acesso Hardware** | Limitado | Completo |

## 🔧 Principais Diferenças Técnicas

### 1. Armazenamento

**Web (localStorage):**
```typescript
localStorage.setItem('token', token);
const token = localStorage.getItem('token');
```

**Native (AsyncStorage):**
```typescript
await AsyncStorage.setItem('token', token);
const token = await AsyncStorage.getItem('token');
```

### 2. Navegação

**Web (React Router):**
```typescript
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/rotas');
```

**Native (React Navigation):**
```typescript
import { useNavigation } from '@react-navigation/native';
const navigation = useNavigation();
navigation.navigate('Rotas');
```

### 3. Componentes UI

**Web (HTML/CSS):**
```tsx
<div className="container">
  <button onClick={handleClick}>Clique</button>
</div>
```

**Native (React Native):**
```tsx
<View style={styles.container}>
  <Button onPress={handleClick}>Clique</Button>
</View>
```

### 4. Estilização

**Web (CSS/Tailwind):**
```tsx
<div className="bg-blue-500 p-4 rounded">
  Conteúdo
</div>
```

**Native (StyleSheet):**
```tsx
<View style={styles.container}>
  Conteúdo
</View>

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
  }
});
```

### 5. Requisições HTTP

**Ambos usam Axios, mas configuração difere:**

**Web:**
```typescript
const API_URL = 'http://localhost:3000/api';
```

**Native:**
```typescript
// Não pode usar localhost!
const API_URL = 'http://192.168.1.100:3000/api';
```

### 6. Câmera

**Web (html5-qrcode):**
```typescript
import { Html5QrcodeScanner } from 'html5-qrcode';
const scanner = new Html5QrcodeScanner('reader', config);
```

**Native (expo-camera):**
```typescript
import { Camera } from 'expo-camera';
<Camera onBarCodeScanned={handleScan} />
```

### 7. Offline

**Web (Service Worker):**
```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

**Native (NetInfo + AsyncStorage):**
```typescript
import NetInfo from '@react-native-community/netinfo';
const state = await NetInfo.fetch();
if (!state.isConnected) {
  // Salvar no AsyncStorage
}
```

## 🎯 Funcionalidades Implementadas

### ✅ Já Implementado

- [x] Login com JWT
- [x] Listagem de rotas
- [x] Detalhes de rota
- [x] Listagem de escolas
- [x] Detalhes de escola
- [x] Listagem de itens
- [x] Histórico de entregas
- [x] Tema Material Design 3

### 🚧 Em Desenvolvimento

- [ ] Scanner QR Code nativo
- [ ] Assinatura digital
- [ ] Confirmação de entregas
- [ ] Modo offline completo
- [ ] Sincronização automática
- [ ] Notificações push
- [ ] Geolocalização

## 📦 Dependências Principais

### App Web
```json
{
  "react-router-dom": "^6.30.3",
  "html5-qrcode": "^2.3.8",
  "qrcode": "^1.5.3",
  "axios": "^1.7.2"
}
```

### App Native
```json
{
  "@react-navigation/native": "^6.1.17",
  "@react-navigation/stack": "^6.3.29",
  "react-native-paper": "^5.12.3",
  "@react-native-async-storage/async-storage": "1.23.1",
  "expo-camera": "~14.0.0",
  "axios": "^1.7.2"
}
```

## 🔄 Processo de Migração

### 1. Estrutura de Pastas

**Web:**
```
apps/entregador/
├── src/
│   ├── pages/
│   ├── components/
│   ├── api/
│   └── offline/
```

**Native:**
```
apps/entregador-native/
├── src/
│   ├── screens/      # pages → screens
│   ├── components/
│   ├── api/
│   └── services/     # offline → services
```

### 2. Componentes Reutilizáveis

Alguns componentes podem ser compartilhados com adaptações:
- API clients (axios)
- Lógica de negócio
- Tipos TypeScript
- Constantes

### 3. Componentes Específicos

Precisam ser reescritos:
- UI components (HTML → React Native)
- Navegação (Router → Navigation)
- Armazenamento (localStorage → AsyncStorage)
- Câmera (HTML5 → Expo Camera)

## 🚀 Vantagens do App Native

1. **Performance**: Mais rápido e fluido
2. **Offline**: Melhor suporte offline
3. **Hardware**: Acesso completo a câmera, GPS, etc
4. **UX**: Interface mais nativa e familiar
5. **Notificações**: Push notifications nativas
6. **App Store**: Pode ser publicado nas lojas

## 📱 Quando Usar Cada Um?

### Use o App Web (PWA) quando:
- Precisa de deploy rápido
- Quer evitar lojas de apps
- Usuários têm conexão estável
- Não precisa de recursos avançados

### Use o App Native quando:
- Precisa de melhor performance
- Quer acesso completo ao hardware
- Precisa funcionar offline extensivamente
- Quer publicar nas lojas oficiais

## 🔧 Configuração de Desenvolvimento

### App Web
```bash
cd apps/entregador
npm install
npm run dev
# Acesse http://localhost:5174
```

### App Native
```bash
cd apps/entregador-native
npm install
npm start
# Escaneie QR Code no Expo Go
```

## 📚 Recursos

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

## 🤝 Contribuindo

Ao adicionar funcionalidades:
1. Implemente primeiro no app web (mais rápido)
2. Teste e valide
3. Migre para o app native
4. Mantenha ambos sincronizados

## 📝 Notas

- O app native é baseado no app web
- Mantemos a mesma API e estrutura de dados
- Funcionalidades devem ser equivalentes
- UI pode variar para melhor UX nativa
