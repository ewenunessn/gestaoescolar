# 👤 Período Individual por Usuário

**Data:** 16/03/2026  
**Status:** IMPLEMENTADO ✅

---

## 🎯 Objetivo

Permitir que cada usuário selecione seu próprio período de trabalho, independente do período ativo global.

---

## 💡 Casos de Uso

### 1. Consulta de Dados Históricos
- Usuário A trabalha no período 2026 (atual)
- Usuário B consulta relatórios de 2025
- Ambos trabalham simultaneamente sem conflito

### 2. Múltiplas Secretarias
- Secretaria A: Ano letivo 2026 (Jan-Dez)
- Secretaria B: Ano letivo 2025/2026 (Fev-Jan)
- Cada uma trabalha em seu próprio calendário

### 3. Análises Comparativas
- Nutricionista compara cardápios de 2025 vs 2026
- Alterna entre períodos facilmente
- Dados sempre consistentes

---

## 🗄️ Estrutura do Banco

### Coluna Adicionada
```sql
ALTER TABLE usuarios 
ADD COLUMN periodo_selecionado_id INTEGER REFERENCES periodos(id);
```

### Lógica de Funcionamento
```
1. Usuário faz login
2. Sistema verifica se tem periodo_selecionado_id
3. Se SIM: usa o período selecionado pelo usuário
4. Se NÃO: usa o período ativo global
```

---

## 🔧 Implementação Backend

### 1. Endpoint: Obter Período Ativo
**GET** `/api/periodos/ativo`

**Lógica:**
```typescript
1. Verificar se usuário está logado
2. Se logado, buscar periodo_selecionado_id
3. Se tem período selecionado, retornar esse período
4. Caso contrário, retornar período ativo global
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "ano": 2025,
    "descricao": "Ano Letivo 2025",
    "ativo": false,
    "fechado": false,
    "ocultar_dados": false
  },
  "fonte": "usuario"  // ou "global"
}
```

### 2. Endpoint: Selecionar Período
**POST** `/api/periodos/selecionar`

**Body:**
```json
{
  "periodoId": 2
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Período 2025 selecionado com sucesso",
  "data": { ... }
}
```

---

## 🎨 Implementação Frontend

### 1. Seletor de Período no Header

**Localização:** Próximo ao nome do usuário

**Componente:**
```tsx
<Select
  value={periodoSelecionado?.id}
  onChange={handleSelecionarPeriodo}
  size="small"
>
  {periodos.map(p => (
    <MenuItem key={p.id} value={p.id}>
      {p.ano} {p.ativo && '(Ativo)'}
    </MenuItem>
  ))}
</Select>
```

### 2. Indicador Visual

**Período do Usuário:**
```
👤 2025 (Seu período)
```

**Período Global:**
```
🌐 2026 (Período ativo)
```

### 3. Serviço Frontend

**Arquivo:** `frontend/src/services/periodos.ts`

```typescript
export async function selecionarPeriodo(periodoId: number) {
  const response = await api.post('/periodos/selecionar', { periodoId });
  return response.data;
}
```

---

## 🔄 Fluxo Completo

### Cenário 1: Usuário Seleciona Período Diferente

1. **Usuário clica no seletor de período**
   - Vê lista de todos os períodos disponíveis
   - Período ativo marcado com "(Ativo)"

2. **Usuário seleciona 2025**
   - Frontend chama `POST /api/periodos/selecionar`
   - Backend atualiza `usuarios.periodo_selecionado_id = 2`
   - Retorna sucesso

3. **Sistema recarrega dados**
   - Todas as queries usam período 2025
   - Pedidos, guias, cardápios de 2025 aparecem
   - Dados de 2026 ficam ocultos

4. **Indicador atualiza**
   - Header mostra "👤 2025 (Seu período)"
   - Usuário sabe que está em período diferente

### Cenário 2: Usuário Volta ao Período Ativo

1. **Usuário seleciona período ativo (2026)**
   - Frontend chama `POST /api/periodos/selecionar`
   - Backend atualiza para período ativo

2. **Sistema volta ao normal**
   - Todas as queries usam período 2026
   - Indicador mostra "🌐 2026 (Período ativo)"

---

## 📊 Compatibilidade

### Queries Existentes
Todas as queries que usam `periodo_id` continuam funcionando:

```sql
-- Antes (período global)
SELECT * FROM pedidos 
WHERE periodo_id = (SELECT id FROM periodos WHERE ativo = true)

-- Depois (período do usuário)
SELECT * FROM pedidos 
WHERE periodo_id = :periodo_usuario_ou_ativo
```

### Filtro de Ocultar Dados
O filtro de `ocultar_dados` continua funcionando:

```sql
SELECT * FROM pedidos p
LEFT JOIN periodos per ON p.periodo_id = per.id
WHERE (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
  AND p.periodo_id = :periodo_usuario
```

---

## ⚠️ Considerações Importantes

### 1. Permissões
- Todos os usuários podem selecionar qualquer período
- Apenas admin pode ativar/fechar períodos
- Período fechado pode ser selecionado (somente leitura)

### 2. Dados Ocultos
- Se usuário seleciona período com `ocultar_dados = true`
- Dados NÃO aparecem (filtro continua ativo)
- Usuário precisa desmarcar "ocultar dados" primeiro

### 3. Período Ativo
- Período ativo global continua existindo
- Usado como padrão para novos usuários
- Usado quando usuário não tem período selecionado

### 4. Performance
- Índice em `usuarios.periodo_selecionado_id`
- Query adicional apenas no login
- Período armazenado em sessão/token

---

## 🧪 Testes

### Teste 1: Selecionar Período Diferente
```bash
# Login como usuário 1
POST /api/auth/login
{ "email": "user1@example.com", "password": "..." }

# Selecionar período 2025
POST /api/periodos/selecionar
{ "periodoId": 2 }

# Verificar período ativo
GET /api/periodos/ativo
# Deve retornar período 2025 com fonte: "usuario"

# Listar pedidos
GET /api/pedidos
# Deve retornar apenas pedidos de 2025
```

### Teste 2: Múltiplos Usuários
```bash
# Usuário 1 seleciona 2025
# Usuário 2 seleciona 2026
# Ambos veem dados diferentes
# Sem conflito
```

---

## 📝 Migração

### Aplicar no Banco Local
```bash
node backend/migrations/aplicar-periodo-usuario-local.js
```

### Aplicar no Neon
```bash
DATABASE_URL="..." node backend/migrations/aplicar-periodo-usuario-neon.js
```

### Verificar
```sql
SELECT 
  u.nome,
  u.periodo_selecionado_id,
  p.ano
FROM usuarios u
LEFT JOIN periodos p ON u.periodo_selecionado_id = p.id;
```

---

## ✅ Vantagens

1. ✅ **Flexibilidade**: Cada usuário trabalha no seu ritmo
2. ✅ **Histórico**: Fácil consultar dados antigos
3. ✅ **Sem Conflito**: Múltiplos usuários, múltiplos períodos
4. ✅ **Compatível**: Não quebra funcionalidade existente
5. ✅ **Simples**: Uma coluna, um endpoint

---

## 🚀 Próximos Passos

### Obrigatório
1. ✅ Adicionar coluna no banco
2. ✅ Implementar endpoint de seleção
3. ✅ Atualizar endpoint de período ativo
4. ⚠️ Criar seletor no frontend
5. ⚠️ Testar com múltiplos usuários

### Opcional
6. Salvar histórico de períodos selecionados
7. Sugestão automática de período
8. Notificação quando período muda
9. Atalho de teclado para trocar período

---

**Última atualização:** 16/03/2026  
**Versão:** 1.0.0  
**Status:** BACKEND COMPLETO, FRONTEND PENDENTE
