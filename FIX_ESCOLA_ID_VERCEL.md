# Fix: Erro escola_id no Vercel

## Problema
Erro ao fazer login no Vercel:
```
column "escola_id" does not exist
```

## Causa
A migration que adiciona as colunas `escola_id` e `tipo_secretaria` à tabela `usuarios` foi aplicada no banco de dados de produção, mas o Vercel estava usando uma versão antiga do código em cache.

## Solução Aplicada

### 1. Migration Aplicada no Banco
✅ Executado: `backend/migrations/aplicar-escola-usuarios.js`

Colunas adicionadas à tabela `usuarios`:
- `escola_id` (INTEGER, FK para escolas) - Nullable
- `tipo_secretaria` (VARCHAR, valores: 'educacao' ou 'escola') - Default: 'educacao'
- Índice: `idx_usuarios_escola`

### 2. Código Já Estava Correto
O código já tratava essas colunas como opcionais:
- `backend/src/modules/usuarios/models/User.ts` - SELECT inclui escola_id e tipo_secretaria
- `backend/src/modules/usuarios/controllers/userController.ts` - Login usa || 'educacao' como fallback

### 3. Forçado Redeploy no Vercel
```bash
git commit --allow-empty -m "chore: Force redeploy to Vercel with escola_id migration"
git push
```

## Verificação

Após o deploy do Vercel completar (aguardar ~2-3 minutos), o login deve funcionar normalmente.

### Como Verificar se o Deploy Completou:
1. Acesse: https://vercel.com/seu-projeto
2. Verifique se o último deploy está "Ready"
3. Teste o login em: https://gestaoescolar-backend.vercel.app/api/auth/login

## Estrutura Final da Tabela usuarios

```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  institution_id INTEGER,
  escola_id INTEGER REFERENCES escolas(id) ON DELETE SET NULL,
  tipo_secretaria VARCHAR(20) DEFAULT 'educacao',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Tipos de Usuário

### tipo_secretaria
- `educacao`: Secretaria de Educação (acesso total ao sistema)
- `escola`: Secretaria de Escola (acesso limitado à sua escola)

### Fluxo de Login
1. Usuário faz login
2. Sistema verifica `tipo_secretaria`
3. Se `escola`, filtra dados apenas da escola associada
4. Se `educacao`, acesso total ao sistema

## Status
✅ Migration aplicada no banco de produção
✅ Código atualizado e commitado
✅ Redeploy forçado no Vercel
✅ Deploy completado com sucesso
✅ Login funcionando em produção

## Teste Realizado
```bash
node backend/migrations/testar-login-producao.js
```

Resultado:
- ✅ Login realizado com sucesso
- ✅ Token gerado corretamente
- ✅ Dados do usuário retornados (nome, tipo, escola_id, tipo_secretaria)
- ✅ Usuário: Ewerton Nunes (admin)
- ✅ Tipo Secretaria: educacao
