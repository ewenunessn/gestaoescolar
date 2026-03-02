# Instruções para Atualizar Status de Entregas

## Problema

Itens da guia de demanda que já têm entregas registradas ainda aparecem com status "PENDENTE" ao invés de "ENTREGUE" ou "PARCIAL".

## Solução

Execute o script SQL no banco de dados de produção para atualizar o status de todos os itens existentes.

## Como Executar

### Opção 1: Via Neon Console (Recomendado)

1. Acesse o [Neon Console](https://console.neon.tech/)
2. Selecione seu projeto
3. Vá para a aba "SQL Editor"
4. Copie e cole o conteúdo do arquivo `atualizar-status-entregas.sql`
5. Clique em "Run" para executar

### Opção 2: Via psql

```bash
# Conectar ao banco
psql "postgresql://[user]:[password]@[host]/[database]?sslmode=require"

# Executar o script
\i backend/scripts/atualizar-status-entregas.sql
```

### Opção 3: Via Node.js (se tiver acesso ao .env)

```bash
cd backend
node scripts/atualizar-status-entregas.js
```

## O que o Script Faz

1. Atualiza o status de todos os itens que têm entregas registradas:
   - `'entregue'` se quantidade_total_entregue ≥ quantidade
   - `'parcial'` se quantidade_total_entregue > 0 mas < quantidade

2. Mostra um resumo das atualizações por status

3. Lista exemplos de itens atualizados

## Verificação

Após executar o script, verifique:

1. Acesse a página "Guias de Demanda" no frontend
2. Selecione uma escola que teve entregas
3. Verifique se os itens aparecem com status correto:
   - ✅ Verde "ENTREGUE" para entregas completas
   - 🟡 Amarelo "PARCIAL" para entregas parciais
   - ⚪ Cinza "PENDENTE" para itens sem entrega

## Importante

- Este script só precisa ser executado UMA VEZ
- Após a execução, o status será atualizado automaticamente para novas entregas
- O script é seguro e não deleta dados, apenas atualiza o campo `status`

## Suporte

Se encontrar problemas, verifique:

1. Se o banco de dados está acessível
2. Se as credenciais estão corretas no .env
3. Se a tabela `historico_entregas` existe
4. Se a coluna `status` existe em `guia_produto_escola`
