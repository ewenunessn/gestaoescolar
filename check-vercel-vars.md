# Checklist para Configurar JWT_SECRET no Vercel

## Passo a Passo Detalhado:

### 1. Acesse o Projeto Correto
- Vá em: https://vercel.com/dashboard
- Procure pelo projeto: **gestaoescolar-backend** (ou o nome que você deu)
- Clique no projeto

### 2. Vá em Settings
- No menu lateral esquerdo, clique em **Settings**
- Depois clique em **Environment Variables**

### 3. Adicione/Edite JWT_SECRET
Se a variável JÁ EXISTE:
- Clique nos 3 pontinhos (...) ao lado dela
- Clique em **Edit**
- Cole o valor: `0af3++BeU5woHy0VyjpNKgOHPPkUCDkmeIt0NhYhZVatE3t+xtkTIoEGLIrpKE5OSjKgfmO4FY2L3qRs/+KEBw==`
- Marque: ☑️ Production ☑️ Preview ☑️ Development
- Clique em **Save**

Se a variável NÃO EXISTE:
- Clique em **Add New**
- Name: `JWT_SECRET`
- Value: `0af3++BeU5woHy0VyjpNKgOHPPkUCDkmeIt0NhYhZVatE3t+xtkTIoEGLIrpKE5OSjKgfmO4FY2L3qRs/+KEBw==`
- Marque: ☑️ Production ☑️ Preview ☑️ Development
- Clique em **Save**

### 4. Redeploy SEM Cache
- Vá em **Deployments** (menu lateral)
- Encontre o último deployment
- Clique nos 3 pontinhos (...) ao lado dele
- Clique em **Redeploy**
- **IMPORTANTE:** DESMARQUE a opção "Use existing Build Cache"
- Clique em **Redeploy**

### 5. Aguarde o Deploy Completar
- Aguarde 2-3 minutos
- O status deve mudar para "Ready"

### 6. Teste
Acesse: https://gestaoescolar-backend.vercel.app/api/debug-env

Deve mostrar:
```json
{
  "JWT_SECRET_EXISTS": true,
  "JWT_SECRET_LENGTH": 88
}
```

## Problemas Comuns:

### "Não vejo a opção de marcar Production/Preview/Development"
- Você está editando a variável DEPOIS de criá-la
- Delete a variável e crie novamente do zero

### "A variável aparece mas o debug-env mostra false"
- O deploy não completou ainda (aguarde mais)
- Você não desmarcou "Use existing Build Cache" no redeploy
- Você está acessando o projeto errado (verifique a URL)

### "Fiz tudo mas ainda não funciona"
- Verifique se o nome é exatamente `JWT_SECRET` (case-sensitive)
- Verifique se não tem espaços antes/depois do valor
- Tente deletar TODAS as variáveis de ambiente e criar novamente
