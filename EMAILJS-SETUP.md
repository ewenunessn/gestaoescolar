# Configuração do EmailJS - Envio Gratuito de Emails

Este guia explica como configurar o EmailJS para permitir o envio gratuito de emails através do formulário de interesse.

## 📧 O que é o EmailJS?

O EmailJS é um serviço que permite enviar emails diretamente do frontend (JavaScript) sem necessidade de um servidor backend. Oferece um plano gratuito com até 200 emails por mês.

## 🚀 Passo a Passo da Configuração

### 1. Criar Conta no EmailJS

1. Acesse [https://www.emailjs.com/](https://www.emailjs.com/)
2. Clique em "Sign Up" e crie uma conta gratuita
3. Confirme seu email

### 2. Configurar Serviço de Email

1. No dashboard, clique em "Add New Service"
2. Escolha seu provedor de email (Gmail, Outlook, Yahoo, etc.)
3. Para Gmail:
   - Clique em "Gmail"
   - Faça login com sua conta Google
   - Autorize o EmailJS
4. Dê um nome ao serviço (ex: "GestaoEscolar")
5. Anote o **Service ID** gerado (ex: `service_abc123`)

### 3. Criar Template de Email

1. Vá para "Email Templates"
2. Clique em "Create New Template"
3. Configure o template:

**Subject (Assunto):**
```
Novo interesse em demonstração - {{from_name}}
```

**Content (Conteúdo):**
```
Novo interesse em demonstração da plataforma GestãoEscolar!

Dados do interessado:
- Nome: {{from_name}}
- Email: {{from_email}}
- Telefone: {{phone}}
- Escola/Instituição: {{school}}
- Cargo/Função: {{position}}

Mensagem:
{{message}}

---
Este email foi enviado automaticamente através do formulário de interesse.
Para responder, utilize o email: {{from_email}}
```

4. Configure o destinatário:
   - **To Email:** Seu email onde deseja receber as mensagens
   - **From Name:** {{from_name}}
   - **Reply To:** {{from_email}}

5. Salve o template e anote o **Template ID** (ex: `template_xyz789`)

### 4. Obter Chave Pública

1. Vá para "Account" → "General"
2. Encontre a seção "Public Key"
3. Anote a **Public Key** (ex: `abcdefghijklmnop`)

### 5. Configurar no Projeto

1. Abra o arquivo `frontend/src/config/emailjs.config.ts`
2. Substitua os valores pelas suas chaves:

```typescript
export const emailjsConfig = {
  serviceId: 'service_abc123',        // Seu Service ID
  templateId: 'template_xyz789',      // Seu Template ID
  publicKey: 'abcdefghijklmnop',      // Sua Public Key
  destinationEmail: 'seu@email.com'   // Email que receberá as mensagens
};
```

## 🧪 Testando a Configuração

1. Inicie o servidor de desenvolvimento:
   ```bash
   cd frontend
   npm run dev
   ```

2. Acesse `http://localhost:5173`
3. Clique em "Entrar" para ir ao formulário
4. Preencha e envie o formulário
5. Verifique se o email chegou na sua caixa de entrada

## 🔧 Solução de Problemas

### Erro: "EmailJS não configurado"
- Verifique se você substituiu todas as chaves no arquivo `emailjs.config.ts`
- Certifique-se de que não há espaços extras nas chaves

### Email não chega
- Verifique a pasta de spam
- Confirme se o Service ID, Template ID e Public Key estão corretos
- Teste o template diretamente no dashboard do EmailJS

### Erro de CORS
- Adicione seu domínio nas configurações de segurança do EmailJS
- Para desenvolvimento local, adicione `http://localhost:5173`

## 📊 Limites do Plano Gratuito

- **200 emails por mês**
- **Até 2 templates**
- **Até 2 serviços de email**

Para mais emails, considere upgradar para um plano pago.

## 🔒 Segurança

- A Public Key pode ser exposta no frontend (é seguro)
- Nunca exponha sua Private Key
- Configure filtros anti-spam no EmailJS se necessário

## 📞 Suporte

Se tiver problemas:
1. Consulte a [documentação oficial do EmailJS](https://www.emailjs.com/docs/)
2. Verifique o console do navegador para erros
3. Teste as configurações no dashboard do EmailJS