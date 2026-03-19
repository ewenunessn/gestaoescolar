# Configuração do Banco de Dados

Este projeto suporta duas configurações de banco de dados: **Neon** (recomendado) e **PostgreSQL Local**.

## 🚀 Configuração Neon (Recomendado)

O Neon é um banco PostgreSQL serverless que oferece:
- ✅ Sempre disponível (não precisa rodar localmente)
- ✅ Backups automáticos
- ✅ Escalabilidade automática
- ✅ SSL por padrão
- ✅ Plano gratuito generoso

### Como configurar:

1. **Crie uma conta no Neon**: https://neon.tech
2. **Crie um novo projeto** e banco de dados
3. **Copie a connection string** fornecida pelo Neon
4. **Configure no arquivo `.env`**:

```env
# Descomente e configure com sua connection string do Neon
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require

# Comente as configurações do banco local
# DB_USER=postgres
# DB_HOST=localhost
# DB_NAME=alimentacao_escolar
# DB_PASSWORD=admin123
# DB_PORT=5432
# DB_SSL=false
```

## 🏠 Configuração Banco Local

Para usar PostgreSQL local (útil para desenvolvimento offline):

### Pré-requisitos:
- PostgreSQL instalado e rodando
- Banco `alimentacao_escolar` criado

### Como configurar:

1. **Comente a DATABASE_URL** no arquivo `.env`:
```env
# DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
```

2. **Descomente e configure as variáveis locais**:
```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=alimentacao_escolar
DB_PASSWORD=admin123
DB_PORT=5432
DB_SSL=false
```

3. **Certifique-se de que o PostgreSQL está rodando**:
```bash
# Windows
net start postgresql-x64-14

# Linux/Mac
sudo systemctl start postgresql
# ou
brew services start postgresql
```

## 🔄 Como Alternar Entre Configurações

### Para usar Neon:
1. Descomente `DATABASE_URL` no `.env`
2. Comente todas as variáveis `DB_*`
3. Reinicie o servidor

### Para usar banco local:
1. Comente `DATABASE_URL` no `.env`
2. Descomente as variáveis `DB_*`
3. Certifique-se de que o PostgreSQL local está rodando
4. Reinicie o servidor

## 🔍 Verificação da Configuração

O sistema detecta automaticamente qual configuração usar:

- **Se `DATABASE_URL` existir**: Usa Neon/Vercel
- **Se `DATABASE_URL` não existir**: Usa configuração local

Você verá no console qual configuração está sendo usada:
```
✅ Usando NEON/VERCEL (com SSL)
```
ou
```
🔧 Usando configuração BANCO LOCAL
```

## 🛠️ Comandos Úteis

```bash
# Testar conexão
npm run dev

# Executar migrações
npm run migrate

# Resetar banco (cuidado!)
npm run db:reset
```

## ⚠️ Importante

- **Nunca commite** o arquivo `.env` com dados reais
- **Use `.env.example`** como template
- **Mantenha backups** dos dados importantes
- **Teste a conexão** após qualquer mudança de configuração