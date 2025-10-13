# 📱 Testar App via USB

## 🔧 Configuração do Celular

### Android:
1. **Ativar Modo Desenvolvedor:**
   - Vá em `Configurações → Sobre o telefone`
   - Toque 7 vezes em "Número da versão"
   - Volte e entre em "Opções do desenvolvedor"

2. **Ativar Depuração USB:**
   - Em "Opções do desenvolvedor"
   - Ative "Depuração USB"
   - Conecte o cabo USB ao computador
   - Autorize o computador no celular

3. **Verificar Conexão:**
   ```bash
   adb devices
   ```
   Deve mostrar seu dispositivo listado

## 🚀 Executar App via USB

### Método 1: Expo Go (Recomendado)
```bash
cd apps/entregas-mobile

# Iniciar Expo
npm start

# No menu que aparecer, pressione:
# - 'a' para Android via USB
# - 'i' para iOS via USB (Mac apenas)
```

### Método 2: Build de Desenvolvimento
```bash
cd apps/entregas-mobile

# Android
npx expo run:android

# iOS (Mac apenas)
npx expo run:ios
```

## 📊 Ver Logs em Tempo Real

### Logs do Android:
```bash
# Ver todos os logs
adb logcat

# Filtrar apenas logs do React Native
adb logcat *:S ReactNative:V ReactNativeJS:V

# Limpar logs e ver novos
adb logcat -c && adb logcat
```

### Logs do Expo:
Os logs aparecem automaticamente no terminal onde você executou `npm start`

## 🔍 Debug do Sistema Offline

Para ver os logs do sistema offline, abra o terminal do Expo e observe:

```
🔄 Iniciando confirmação de entrega - Item ID: 63
📶 Status offline: true/false
📱 Modo offline detectado...
🔍 Buscando item 63 no cache...
✅ Item 63 encontrado no cache: Nome do Produto
📝 Atualizando item 63 no cache local
💾 Item 63 atualizado no cache da escola X
📤 Operação XXX adicionada à fila de sincronização
```

## 🐛 Problemas Comuns

### "adb: command not found"
**Solução:** Instale o Android SDK Platform Tools
- Windows: `choco install adb`
- Mac: `brew install android-platform-tools`
- Linux: `sudo apt install adb`

### "No devices found"
**Solução:**
1. Verifique se o cabo USB está funcionando (tente transferir arquivos)
2. Desconecte e reconecte o cabo
3. Revogue autorizações USB no celular e autorize novamente
4. Execute: `adb kill-server && adb start-server`

### "Expo Go não conecta"
**Solução:**
1. Certifique-se que o celular e PC estão na mesma rede WiFi
2. Ou use: `npm start -- --tunnel` (mais lento mas funciona sempre)
3. Ou use USB: `npm start -- --localhost`

### App não atualiza
**Solução:**
1. Feche completamente o app no celular
2. No terminal do Expo, pressione 'r' para reload
3. Ou pressione 'c' para limpar cache

## 📱 Testar Modo Offline

### Método 1: Modo Avião
1. Abra o app conectado à internet
2. Navegue pelas rotas/escolas (dados são baixados)
3. Ative o modo avião no celular
4. Tente confirmar uma entrega
5. Veja os logs no terminal

### Método 2: Desconectar WiFi
1. Abra o app conectado
2. Navegue pelas rotas/escolas
3. Desconecte o WiFi do celular
4. Tente confirmar uma entrega

### Método 3: Simular no Código (Desenvolvimento)
Adicione no `offlineService.ts`:
```typescript
// Forçar modo offline para testes
async isOffline(): Promise<boolean> {
  return true; // SEMPRE offline para testes
}
```

## 🎯 Comandos Úteis

```bash
# Limpar cache do Expo
npx expo start -c

# Reinstalar dependências
rm -rf node_modules
npm install

# Verificar dispositivos conectados
adb devices

# Reiniciar servidor ADB
adb kill-server
adb start-server

# Ver logs em tempo real
adb logcat | grep -i "react"

# Capturar screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Gravar tela
adb shell screenrecord /sdcard/demo.mp4
# Pressione Ctrl+C para parar
adb pull /sdcard/demo.mp4
```

## 📝 Checklist de Teste Offline

- [ ] Conectar à internet e fazer login
- [ ] Navegar por todas as rotas
- [ ] Abrir detalhes de várias escolas
- [ ] Verificar logs: "X rotas salvas no cache"
- [ ] Verificar logs: "X escolas salvas no cache"
- [ ] Verificar logs: "X itens salvos no cache"
- [ ] Ativar modo avião
- [ ] Tentar listar rotas (deve funcionar)
- [ ] Tentar listar escolas (deve funcionar)
- [ ] Tentar confirmar entrega (deve salvar na fila)
- [ ] Verificar logs: "Operação XXX adicionada à fila"
- [ ] Desativar modo avião
- [ ] Verificar logs: "Sincronizando automaticamente..."
- [ ] Verificar logs: "Operação XXX sincronizada com sucesso"

## 🎉 Sucesso!

Se você ver estes logs, o sistema offline está funcionando:

```
✅ Dados pré-carregados automaticamente! App pronto para uso offline.
📱 Modo offline detectado, usando cache local
💾 Item 63 atualizado no cache da escola 5
📤 Operação abc123 adicionada à fila de sincronização
🔄 Voltou online! Sincronizando automaticamente...
✅ Entrega 63 confirmada no servidor
✅ Operação abc123 removida da fila
```
