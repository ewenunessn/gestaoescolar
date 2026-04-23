# Configuração do Vercel

## Variáveis de Ambiente Necessárias no Backend

Acesse: https://vercel.com/seu-projeto/settings/environment-variables

Adicione a seguinte variável:

```
CORS_ORIGIN=https://nutriescola.vercel.app
```

Ou se tiver múltiplos domínios:

```
CORS_ORIGIN=https://nutriescola.vercel.app,https://outro-dominio.vercel.app
```

Após adicionar, faça um redeploy do backend:
1. Vá em Deployments
2. Clique nos 3 pontos do último deployment
3. Clique em "Redeploy"

## Verificação

Após o deploy, teste acessando:
- https://gestaoescolar-backend.vercel.app/health

O CORS deve estar funcionando corretamente.
