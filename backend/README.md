# Backend - Sistema de Gestão de Alimentação Escolar

## 🚀 Início Rápido

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar banco de dados

#### Opção A: Neon (Recomendado)
```bash
npm run configure-db
```
Siga as instruções para configurar sua connection string do Neon.

#### Opção B: Manual
1. Copie `.env.example` para `.env`
2. Configure `DATABASE_URL` com sua connection string do Neon
3. Ou configure as variáveis `DB_*` para banco local

### 3. Executar migrações
```bash
npm run init-neon
```

### 4. Iniciar servidor
```bash
npm run dev
```

## 🗄️ Configuração do Banco

Este projeto suporta **Neon** (recomendado) e **PostgreSQL local**.

### Comandos úteis:
- `npm run configure-db` - Configurador interativo do banco
- `npm run init-neon` - Executar migrações
- `npm run check-neon` - Verificar tabelas

### Documentação completa:
📖 Veja [CONFIGURACAO-BANCO.md](./CONFIGURACAO-BANCO.md) para instruções detalhadas.

## 🔄 Alternando entre bancos

### Para usar Neon:
```bash
npm run configure-db
# Escolha opção 1
```

### Para usar banco local:
```bash
npm run configure-db
# Escolha opção 2
```

## 📝 Scripts disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run start` - Iniciar servidor de produção
- `npm run test` - Executar testes
- `npm run configure-db` - Configurar banco interativamente

## 🛠️ Desenvolvimento

O sistema detecta automaticamente qual configuração de banco usar baseado na presença da `DATABASE_URL` no arquivo `.env`.

Você verá no console:
- `✅ Usando NEON/VERCEL (com SSL)` - Quando usando Neon
- `🔧 Usando configuração BANCO LOCAL` - Quando usando PostgreSQL local