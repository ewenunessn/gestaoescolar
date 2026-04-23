# 🔧 Dívida Técnica — NutriLog

Diagnóstico de gambiarras, duplicações e problemas técnicos identificados no projeto.

---

## 🚨 Alta Severidade

### 1. Serviços duplicados no frontend ✅ Parcialmente resolvido

Existem 4 pares de arquivos de serviço em `frontend/src/services/`:

| Par | Status | Observação |
|-----|--------|------------|
| `demanda.ts` + `demandas.ts` | ⚠️ Mantidos separados | Propósitos diferentes: `demanda.ts` = cálculo de demanda mensal; `demandas.ts` = CRUD de ofícios. Nomes confusos mas não são duplicatas reais. |
| `faturamento.ts` + `faturamentos.ts` | ⚠️ Mantidos separados | Propósitos diferentes: `faturamento.ts` = faturamento por pedido; `faturamentos.ts` = CRUD de faturamentos. |
| `modalidades.ts` + `modalidadeService.ts` | ✅ Resolvido | `modalidadeService.ts` agora re-exporta de `modalidades.ts`. Todos os imports existentes continuam funcionando. |
| `produtos.ts` + `produtoService.ts` | ✅ Resolvido | `produtoService.ts` agora re-exporta de `produtos.ts`. Todos os imports existentes continuam funcionando. |

---

### 2. IP hardcoded no backend

**Arquivo:** `backend/src/config/config.ts` (linhas ~69 e ~78)

```ts
// ❌ Gambiarra
return `http://192.168.18.12:${this.port}${this.apiBasePath}`;
```

**Impacto:** Quebra em qualquer rede diferente da do desenvolvedor original.  
**Solução:** Usar variável de ambiente `API_HOST` ou `SERVER_URL`.

---

## ⚠️ Média Severidade

### 3. `setTimeout` como gambiarra de sincronização ✅ Resolvido

Três ocorrências de delay artificial corrigidas:

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `useEscolaQueries.ts` | `setTimeout 500ms` para esperar token | Usa `useAuth()` do `AuthContext` — reativo e correto |
| `useCurrentUser.ts` | `setTimeout 500ms` antes de buscar usuário | Busca imediatamente ao montar |
| `usePeriodosQueries.ts` | `setTimeout 300ms` antes de `window.location.reload()` | Reload imediato após invalidar queries |

---

### 4. Dois arquivos de banco de dados

**Arquivos:** `backend/src/database.ts` e `backend/src/database-vercel.ts`

Selecionados em runtime com `require()` condicional no `index.ts`:
```ts
// ❌ Gambiarra
const db = process.env.VERCEL === '1'
  ? require("./database-vercel")
  : require("./database");
```

**Impacto:** Manutenção dobrada — correções precisam ser aplicadas nos dois arquivos. `database-vercel.ts` está desatualizado.  
**Solução:** Consolidar em um único `database.ts` com configuração baseada em variável de ambiente.

---

### 5. Dois helpers de período com nomes confusos ✅ Resolvido

| Antes | Depois | Propósito |
|-------|--------|-----------|
| `periodoHelper.ts` | `periodoUsuarioHelper.ts` | Obtém o período ativo do usuário ou global |
| `periodosHelper.ts` | `periodosVisibilidadeHelper.ts` | Filtra períodos ocultos de queries SQL |

Todos os imports foram atualizados. `periodosHelper.ts` não tinha nenhum consumidor.

---

### 6. Fallback silencioso para dados falsos ✅ Parcialmente resolvido

| Arquivo | Status | Ação |
|---------|--------|------|
| `itemGuiaService.ts` | ✅ Corrigido | Removidos os dados mock de arroz/feijão/óleo. Erro agora é propagado corretamente para a UI. |
| `rotaService.ts` | ✅ Mantido (era legítimo) | O fallback em `criarPlanejamentoAvancado` não retorna dados falsos — executa a operação real via método alternativo quando a rota avançada não existe no backend. Adicionado comentário explicativo. |

---

### 7. Excesso de `as any` no TypeScript ✅ Resolvido

- Criada interface `JwtPayload` em `authMiddleware.ts` — removido `as any` do `jwt.verify`
- Expandido `express.d.ts` com `AuthUser`, `SystemAdmin` e campos completos no `Request`
- Substituídos todos os `(req as any).user` por `req.user` em todos os controllers
- Substituídos todos os `(req as any).usuario` por `req.usuario`
- Substituídos todos os `(req as any).systemAdmin` por `req.systemAdmin`
- `parseFloat(dados.quantidade as any)` → `parseFloat(String(dados.quantidade))`
- `requireAdmin as any` → `requireAdmin` (tipagem correta no middleware)
- `escolaController as any` → `escolaController` (removido cast desnecessário)

---

### 8. `console.log` em código de produção ✅ Resolvido

Removidos **todos** os `console.log` de produção:
- **24 arquivos `.tsx`** limpos (Login, Dashboard, Faturamento, Portal Escola, etc.)
- **Hooks** limpos: `useConfigChangeIndicator`, `useInstituicao`, `useEstoqueAlertas`
- **Backend modules**: guiaController, guiaModel, estoqueEscolarController, demandaController, produtoController, refeicaoCalculosController, etc.
- **Utils**: `queryAnalyzer.ts`, `cache.ts`, `database.ts`
- `console.log` inline no JSX de `GerarPedidoDaGuiaDialog.tsx` removido
- `setTimeout(1000ms)` no Login.tsx substituído por `dispatchEvent('auth-changed')`
- **Mantidos**: `console.error` (erros reais) e `apiLog` em `api.ts` (condicional ao `debug`)

---

## 🟡 Baixa Severidade

### 9. Código comentado no `backend/src/index.ts`

```ts
// import demandaRoutes from "./modules/estoque/routes/demandaRoutes"; // REMOVIDO
// Módulo de gás removido
// Importar rotas preservadas do sistema escolar  ← sem código abaixo
```

**Impacto:** Poluição visual, confusão sobre o que está ativo.  
**Solução:** Remover — o histórico do git preserva o código removido.

---

### 10. Rotas duplicadas no mesmo path

**Arquivo:** `backend/src/index.ts`

```ts
// ❌ Dois módulos registrados no mesmo prefixo /api/entregas
app.use("/api/entregas", entregaRoutes);
app.use("/api/entregas", rotaRoutes);
```

**Impacto:** Funciona por acidente (Express processa ambos), mas é confuso e pode causar conflitos.  
**Solução:** Separar em `/api/entregas` e `/api/rotas`.

---

### 11. `!important` no CSS

**Arquivo:** `frontend/src/modules/entregas/pages/Romaneio.tsx`

```ts
// ❌ Força bruta para estilos de impressão
body { background-color: white !important; }
.MuiDataGrid-cell { border-bottom: 1px solid #ddd !important; }
button, input, select { display: none !important; }
```

**Impacto:** Indica problemas de especificidade CSS resolvidos na força.  
**Solução:** Usar `@media print` com seletores mais específicos.

---

## 📋 Resumo e Prioridades

| Prioridade | Item | Esforço |
|-----------|------|---------|
| 🔴 Alta | Remover IP `192.168.18.12` hardcoded | Baixo |
| 🔴 Alta | Corrigir `setTimeout` de sincronização de token | Médio |
| 🟠 Média | Consolidar serviços duplicados (4 pares) | Alto |
| 🟠 Média | Unificar `database.ts` e `database-vercel.ts` | Médio |
| 🟠 Média | Corrigir fallback silencioso para dados falsos | Baixo |
| 🟡 Baixa | Remover `console.log` de produção | Médio |
| 🟡 Baixa | Reduzir uso de `as any` | Alto |
| 🟢 Quando der | Limpar código comentado | Baixo |
| 🟢 Quando der | Renomear helpers de período | Baixo |
| 🟢 Quando der | Corrigir rotas duplicadas no mesmo path | Baixo |
