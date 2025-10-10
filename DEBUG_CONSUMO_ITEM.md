# 🔍 Debug - Consumo por Item

## Problema Relatado
Ao clicar em "Registrar" no botão de consumo por item, nada acontece.

## ✅ Verificações Realizadas

### 1. Backend - Rotas
- ✅ Rota configurada: `POST /api/faturamentos/:id/itens/:itemId/registrar-consumo`
- ✅ Rota configurada: `POST /api/faturamentos/:id/itens/:itemId/reverter-consumo`

### 2. Backend - Controller
- ✅ Função `registrarConsumoItem` existe e está exportada
- ✅ Função `reverterConsumoItem` existe e está exportada

### 3. Backend - Service
- ✅ Método `FaturamentoService.registrarConsumoItem` implementado
- ✅ Método `FaturamentoService.reverterConsumoItem` implementado

### 4. Frontend - Service
- ✅ Método `faturamentoService.registrarConsumoItem` implementado
- ✅ Método `faturamentoService.reverterConsumoItem` implementado

### 5. Frontend - Interface
- ✅ Handler `handleRegistrarConsumoItem` implementado
- ✅ Handler `handleReverterConsumoItem` implementado
- ✅ Botões renderizados na tabela

## 🔍 Possíveis Causas

### 1. Item ID Undefined
O `faturamento_item_id` pode não estar sendo retornado pela API.

**Verificar:**
- Abrir DevTools (F12)
- Ir para aba Console
- Procurar logs: `📊 Item filtrado:`
- Verificar se `id` está `undefined`

### 2. Servidor Backend Não Está Rodando
**Verificar:**
```bash
# Verificar se o servidor está rodando
curl http://localhost:3000/api/health

# Ou verificar os logs do servidor
```

### 3. Erro de CORS ou Rede
**Verificar:**
- Abrir DevTools (F12)
- Ir para aba Network
- Clicar em "Registrar"
- Verificar se a requisição foi enviada
- Verificar status da resposta

## 🧪 Testes Manuais

### Teste 1: Verificar Logs do Console

1. Abrir DevTools (F12)
2. Ir para aba Console
3. Clicar em "Ver Detalhes" de um contrato
4. Verificar logs:
   - `📊 Item filtrado:` - deve mostrar os itens com `id`
   - `📊 Total de itens filtrados:` - deve mostrar quantidade

5. Clicar em "Registrar" em um item
6. Verificar logs:
   - `🔵 handleRegistrarConsumoItem chamado:` - deve mostrar itemId e faturamentoId
   - `📤 Enviando requisição para registrar consumo...`
   - `✅ Consumo registrado com sucesso!`
   - `🔄 Recarregando dados...`
   - `✅ Dados recarregados!`

### Teste 2: Verificar Network

1. Abrir DevTools (F12)
2. Ir para aba Network
3. Clicar em "Registrar" em um item
4. Procurar requisição: `POST /api/faturamentos/{id}/itens/{itemId}/registrar-consumo`
5. Verificar:
   - Status: deve ser 200
   - Response: `{ success: true, message: "..." }`

### Teste 3: Testar Endpoint Diretamente

```bash
# Substituir {faturamentoId} e {itemId} pelos valores reais
curl -X POST http://localhost:3000/api/faturamentos/{faturamentoId}/itens/{itemId}/registrar-consumo \
  -H "Content-Type: application/json"
```

### Teste 4: Verificar Banco de Dados

```sql
-- Verificar se a coluna existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'faturamento_itens' 
  AND column_name IN ('consumo_registrado', 'data_consumo');

-- Verificar dados dos itens
SELECT 
  id,
  faturamento_id,
  produto_id,
  modalidade_id,
  quantidade_modalidade,
  consumo_registrado,
  data_consumo
FROM faturamento_itens
WHERE faturamento_id = {faturamentoId};
```

## 🔧 Soluções Possíveis

### Solução 1: Item ID Undefined

Se o `id` estiver `undefined` nos logs, o problema é que o backend não está retornando o `faturamento_item_id`.

**Ação:**
1. Verificar logs do backend ao carregar o resumo
2. Procurar log: `📊 Item adicionado ao resumo:`
3. Verificar se `faturamento_item_id` está presente

**Se não estiver presente:**
- Reiniciar o servidor backend
- Verificar se o código foi salvo corretamente

### Solução 2: Servidor Não Está Rodando

**Ação:**
```bash
# Ir para a pasta do backend
cd backend

# Iniciar o servidor
npm run dev
```

### Solução 3: Erro de Validação

Se aparecer erro no console, verificar a mensagem.

**Erros comuns:**
- `Item do faturamento não encontrado` - itemId inválido
- `Consumo do item já foi registrado` - item já consumido
- `Saldo insuficiente` - sem saldo no contrato

### Solução 4: Colunas Não Existem no Banco

**Ação:**
```bash
# Executar migration novamente
node backend/run-migration-consumo-item.js
node backend/run-migration-consumo-item-neon.js
```

## 📝 Checklist de Debug

- [ ] Abrir DevTools Console
- [ ] Verificar logs ao carregar página
- [ ] Verificar se `id` dos itens não é `undefined`
- [ ] Clicar em "Registrar"
- [ ] Verificar logs do handler
- [ ] Verificar Network tab
- [ ] Verificar resposta da API
- [ ] Verificar logs do backend
- [ ] Verificar banco de dados

## 🎯 Próximos Passos

1. **Executar Teste 1** - Verificar logs do console
2. **Se `id` for `undefined`** - Verificar backend
3. **Se `id` estiver OK** - Verificar Network
4. **Se requisição não for enviada** - Verificar handler
5. **Se requisição retornar erro** - Verificar mensagem

---

**Aguardando feedback dos testes para continuar o debug!**
