# Guia de Sincronização do EmailJS - Erro 420

## Status Atual ✅

**Service ID:** `service_pbayjwr` - ✅ **EXISTE e está CONECTADO**

**Configuração do Serviço:**
- **Nome:** GestaoEscolar
- **Tipo:** Gmail (personal service)
- **Limite:** 500 emails por dia
- **Conta conectada:** ewenunes0@gmail.com
- **Permissão:** "Send email on your behalf" ✅ AUTORIZADA

## Problema Atual: Erro 420

❌ **Erro:** `420 The service isn't updated`

### O que significa este erro?

O erro 420 indica que o serviço foi criado/modificado recentemente no dashboard do EmailJS, mas ainda não foi totalmente sincronizado nos servidores da API. Este é um processo normal que pode levar alguns minutos.

## Solução: Aguardar Sincronização

### Tempo de Espera
- **Mínimo:** 2-3 minutos
- **Máximo:** 10-15 minutos
- **Recomendado:** Aguardar 5 minutos antes de testar novamente

### Como Verificar se Sincronizou

1. **Teste no Dashboard:**
   - No dashboard do EmailJS, clique em "Send test email"
   - Se funcionar, a sincronização foi concluída

2. **Teste no Formulário:**
   - Acesse: http://localhost:5173/
   - Preencha e envie o formulário
   - Se não der erro 420, está funcionando

## Configuração Atual do Projeto

```typescript
// frontend/src/config/emailjs.config.ts
export const emailjsConfig = {
  serviceId: 'service_pbayjwr',        // ✅ CORRETO - Existe no dashboard
  templateId: 'template_g1cv8nf',      // ⚠️ Verificar se existe
  publicKey: 'Q6o-dcQJlJUeGK23r',     // ⚠️ Verificar se está correta
  destinationEmail: 'ewertonbarruja@gmail.com'
};
```

## Próximos Passos

### 1. Aguardar (5 minutos)
⏳ **Aguarde 5 minutos** para que o serviço seja totalmente sincronizado.

### 2. Verificar Template ID
No dashboard do EmailJS:
- Vá para "Email Templates"
- Verifique se existe um template com ID `template_g1cv8nf`
- Se não existir, crie um novo template ou anote o ID correto

### 3. Verificar Public Key
No dashboard do EmailJS:
- Vá para "Account" → "General"
- Verifique se a Public Key `Q6o-dcQJlJUeGK23r` está correta
- Se não estiver, copie a Public Key correta

### 4. Testar Novamente
Após 5 minutos:
- Teste o formulário em http://localhost:5173/
- Se ainda der erro, verifique Template ID e Public Key

## Sinais de Sucesso

✅ **Service ID existe e está conectado**
✅ **Conta Gmail autorizada com permissões corretas**
✅ **Limite de 500 emails/dia configurado**

⏳ **Aguardando:** Sincronização completa (erro 420 temporário)

## Dicas Importantes

- 🕐 **Paciência:** O erro 420 é temporário e normal
- 🔄 **Não recrie:** Não delete e recrie o serviço, apenas aguarde
- ✉️ **Teste gradual:** Teste primeiro no dashboard, depois no formulário
- 📧 **Verifique spam:** Emails podem ir para a pasta de spam inicialmente

---

**O serviço está configurado corretamente. Apenas aguarde a sincronização!**