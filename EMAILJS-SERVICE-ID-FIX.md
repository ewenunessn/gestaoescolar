# Como Resolver o Erro "Service ID not found" no EmailJS

## Problema Identificado

❌ **Erro:** `The service ID not found. To find this ID, visit https://dashboard.emailjs.com/admin`

❌ **Service ID atual:** `service_pbayjwr` (não existe no dashboard)

## Solução Passo a Passo

### 1. Acessar o Dashboard do EmailJS

1. Acesse: https://dashboard.emailjs.com/admin
2. Faça login com suas credenciais
3. Se não tiver conta, crie uma gratuita

### 2. Verificar Serviços Existentes

1. No dashboard, clique em **"Email Services"**
2. Verifique se existe algum serviço ativo
3. Se existir, anote o **Service ID** (formato: `service_xxxxxxx`)

### 3. Criar Novo Serviço (se necessário)

Se não houver serviços ou quiser criar um novo:

1. Clique em **"Add New Service"**
2. Escolha **"Gmail"** como provedor
3. Clique em **"Connect Account"**
4. Autorize o acesso à sua conta Gmail
5. **IMPORTANTE:** Certifique-se de marcar a permissão **"Send email on your behalf"**
6. Após a autorização, anote o **Service ID** gerado

### 4. Verificar/Criar Template

1. Vá para **"Email Templates"**
2. Se não houver template, clique em **"Create New Template"**
3. Configure o template com as seguintes variáveis:
   - `{{from_name}}` - Nome do interessado
   - `{{from_email}}` - Email do interessado
   - `{{phone}}` - Telefone
   - `{{school}}` - Escola/Instituição
   - `{{position}}` - Cargo/Função
   - `{{message}}` - Mensagem adicional
4. Anote o **Template ID** (formato: `template_xxxxxxx`)

### 5. Obter Public Key

1. Vá para **"Account"** → **"General"**
2. Copie a **Public Key** (formato alfanumérico)

### 6. Atualizar Configuração no Projeto

Edite o arquivo `frontend/src/config/emailjs.config.ts`:

```typescript
export const emailjsConfig = {
  serviceId: 'SEU_NOVO_SERVICE_ID',     // Substitua pelo Service ID correto
  templateId: 'SEU_TEMPLATE_ID',        // Substitua pelo Template ID correto
  publicKey: 'SUA_PUBLIC_KEY',          // Substitua pela Public Key correta
  destinationEmail: 'ewertonbarruja@gmail.com'
};
```

### 7. Testar a Configuração

1. Salve o arquivo de configuração
2. Acesse o formulário em: http://localhost:5173/
3. Preencha e envie um teste
4. Verifique se o email chegou no destino

## Configuração Atual (Para Referência)

```typescript
// Configuração atual que está causando erro:
serviceId: 'service_pbayjwr'    // ❌ Não encontrado
templateId: 'template_g1cv8nf'  // ⚠️ Verificar se existe
publicKey: 'Q6o-dcQJlJUeGK23r' // ⚠️ Verificar se está correta
```

## Dicas Importantes

- ✅ O plano gratuito permite 200 emails/mês
- ✅ Sempre teste com um email real primeiro
- ✅ Verifique a pasta de spam do email de destino
- ✅ Mantenha as credenciais seguras

## Próximos Passos

1. [ ] Acessar dashboard do EmailJS
2. [ ] Verificar/criar serviço Gmail
3. [ ] Copiar Service ID correto
4. [ ] Atualizar arquivo de configuração
5. [ ] Testar formulário
6. [ ] Confirmar recebimento do email

---

**Após seguir estes passos, o erro 400 "Service ID not found" será resolvido.**