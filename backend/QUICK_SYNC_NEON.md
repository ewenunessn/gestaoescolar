# Sincronização Rápida com Neon

## 🚀 Executar Agora

```bash
cd backend
npm run sync-neon
```

Isso irá:
- ✅ Conectar ao Neon usando DATABASE_URL do .env
- ✅ Criar tabelas de instituições
- ✅ Criar tabelas de system admins
- ✅ Criar tabela de planos
- ✅ Inserir 3 planos padrão

## 📋 Comandos Disponíveis

```bash
# Sincronização simples (recomendado)
npm run sync-neon

# Sincronização completa com verificação
npm run sync-neon-full

# Criar primeiro admin do sistema
npm run create-admin

# Criar instituição de exemplo
npm run create-institution
```

## ✅ Verificar se Funcionou

Após executar, verifique no Neon Console:

```sql
-- Deve retornar 7 tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%institution%' 
   OR table_name LIKE '%system_admin%';

-- Deve retornar 3 planos
SELECT * FROM institution_plans;
```

## ⚠️ Importante

Certifique-se de que o `.env` tem:
```env
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/db?sslmode=require
```

## 🆘 Problemas?

Veja o guia completo: [SYNC_NEON_GUIDE.md](./SYNC_NEON_GUIDE.md)
