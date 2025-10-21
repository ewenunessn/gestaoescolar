# 📄 Sistema de Comprovantes de Entrega

## 🎯 Funcionalidade

O sistema gera automaticamente um comprovante em PDF após cada entrega bem-sucedida, contendo:

- ✅ Informações da escola
- ✅ Data e hora da entrega
- ✅ Nome de quem entregou e quem recebeu
- ✅ Lista detalhada de itens entregues
- ✅ Foto comprovante (se disponível)
- ✅ Assinaturas digitais

## 📦 Dependências Necessárias

Para que o sistema de comprovantes funcione, você precisa instalar as seguintes bibliotecas:

```bash
# Navegue até a pasta do app mobile
cd apps/entregas-mobile

# Instale as dependências
npx expo install expo-print expo-sharing expo-file-system
```

### Bibliotecas Utilizadas:

1. **expo-print** - Gera PDFs a partir de HTML
2. **expo-sharing** - Permite compartilhar arquivos (WhatsApp, Drive, Email, etc.)
3. **expo-file-system** - Gerencia arquivos no dispositivo

## 🚀 Como Funciona

### 1. Geração Automática
Após confirmar uma entrega em massa, o sistema:
1. Processa todas as entregas
2. Gera automaticamente um PDF com os dados
3. Pergunta se deseja compartilhar

### 2. Compartilhamento
O usuário pode compartilhar o comprovante via:
- 📧 Email
- 💬 WhatsApp
- ☁️ Google Drive
- 📱 Outros apps instalados

### 3. Armazenamento Local
Os comprovantes são salvos em:
```
/documentDirectory/comprovantes/
```

## 🎨 Personalização

O template HTML do comprovante pode ser personalizado editando:
```
apps/entregas-mobile/src/services/comprovanteService.ts
```

### Elementos Personalizáveis:
- Cores e estilos CSS
- Logo da instituição
- Campos adicionais
- Layout e formatação

## 📱 Uso no App

### Fluxo Completo:
1. Selecionar itens para entrega
2. Ajustar quantidades
3. Revisar e confirmar
4. ✨ **Comprovante gerado automaticamente**
5. Opção de compartilhar

### Exemplo de Uso:
```typescript
// O serviço é chamado automaticamente após entregas bem-sucedidas
const dadosComprovante = {
  escolaNome: 'Escola Municipal',
  itens: [...],
  nomeQuemRecebeu: 'João Silva',
  nomeQuemEntregou: 'Maria Santos',
  dataEntrega: new Date().toISOString(),
};

const pdfUri = await comprovanteService.gerarComprovantePDF(dadosComprovante);
await comprovanteService.compartilharComprovante(pdfUri);
```

## 🔧 Troubleshooting

### Erro: "expo-print não encontrado"
```bash
npx expo install expo-print
```

### Erro: "Compartilhamento não disponível"
- Verifique se o dispositivo suporta compartilhamento
- Teste em um dispositivo físico (não funciona em alguns emuladores)

### PDF não está sendo gerado
- Verifique os logs do console
- Confirme que os dados estão corretos
- Teste com dados simples primeiro

## 📝 Notas Importantes

- ✅ Funciona offline (gera PDF localmente)
- ✅ Não requer conexão com servidor
- ✅ Compatível com Android e iOS
- ⚠️ Requer permissões de armazenamento no Android

## 🎯 Próximas Melhorias

- [ ] Adicionar logo da instituição
- [ ] Enviar automaticamente para Drive
- [ ] Histórico de comprovantes gerados
- [ ] Assinatura digital com biometria
- [ ] QR Code para validação
