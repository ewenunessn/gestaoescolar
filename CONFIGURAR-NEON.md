# 🚀 Como Configurar o Banco Neon

## Passo a Passo Rápido

### 1. Obter Connection String do Neon
1. Acesse https://neon.tech
2. Faça login ou crie uma conta
3. Crie um novo projeto
4. Copie a connection string (algo como: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/db?sslmode=require`)

### 2. Configurar no Projeto
```bash
cd backend
npm run configure-db
```
- Escolha opção **1** (Configurar Neon)
- Cole sua connection string
- Pronto! 🎉

### 3. Executar Migrações
```bash
npm run init-neon
```

### 4. Iniciar Servidor
```bash
npm run dev
```

## ✅ Verificação
Você deve ver no console:
```
✅ Usando NEON/VERCEL (com SSL)
✅ PostgreSQL conectado: { current_time: '...', db_name: '...' }
```

## 🔄 Para Voltar ao Banco Local (Futuro)
```bash
npm run configure-db
```
- Escolha opção **2** (Voltar para banco local)
- Certifique-se de que o PostgreSQL local está rodando

## 📁 Arquivos Modificados
- `backend/.env` - Configuração das variáveis de ambiente
- `backend/src/database.ts` - Melhorados os comentários
- `backend/CONFIGURACAO-BANCO.md` - Documentação completa
- `backend/scripts/configure-neon.js` - Script configurador
- `backend/README.md` - Instruções do projeto

## 🎯 Próximos Passos
1. Configure sua connection string do Neon
2. Execute as migrações
3. Teste a aplicação
4. Desenvolva com tranquilidade! 🚀