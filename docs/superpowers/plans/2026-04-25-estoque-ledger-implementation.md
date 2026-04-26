# Estoque Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remodelar o módulo de estoque para usar ledger operacional, projeções de saldo e fluxos orientados por tarefa para escola, central, recebimentos e entregas.

**Architecture:** O backend passa a gravar eventos imutáveis em `estoque_eventos` e expor projeções de leitura para estoque central e escolar. As telas deixam de editar saldo diretamente e passam a registrar ações operacionais (`entrada`, `saída`, `ajuste`, `transferência`) com origem, motivo e saldo derivado pelo backend.

**Tech Stack:** PostgreSQL, SQL migrations, Express, TypeScript, React, MUI, Vitest, Node built-in test runner via `tsx --test`.

---

## File Structure

- Create `backend/src/migrations/20260425_create_estoque_ledger.sql`: cria `estoque_eventos`, `estoque_operacao_escola` e views/projeções base.
- Create `backend/src/modules/estoque/services/estoqueLedgerService.ts`: API central de escrita/leitura do ledger.
- Create `backend/src/modules/estoque/services/estoqueProjectionService.ts`: leitura de saldos, timeline e cards de resumo.
- Create `backend/src/modules/estoque/services/estoqueIntegracaoService.ts`: builders para eventos disparados por recebimentos e entregas.
- Create `backend/src/modules/estoque/services/estoqueLedgerService.test.ts`: testes de saldo, bloqueio de saída e estorno.
- Create `backend/src/modules/estoque/services/estoqueIntegracaoService.test.ts`: testes de payload para recebimento e transferência.
- Modify `backend/src/modules/estoque/controllers/estoqueEscolarController.ts`: trocar SQL direto por ledger + projeções.
- Modify `backend/src/modules/estoque/controllers/EstoqueCentralController.ts`: adicionar transferência e leitura via projeções.
- Modify `backend/src/modules/estoque/routes/estoqueEscolarRoutes.ts`: expor endpoints de dashboard, eventos e configuração operacional.
- Modify `backend/src/modules/estoque/routes/estoqueCentralRoutes.ts`: expor endpoints de transferência e timeline.
- Modify `backend/src/modules/recebimentos/controllers/recebimentoController.ts`: gerar `recebimento_central` na mesma transação.
- Modify `backend/src/modules/entregas/models/Entrega.ts`: gerar `transferencia_para_escola` na confirmação efetiva.
- Modify `backend/src/routes/registerApiRoutes.ts`: manter o encaixe das rotas de estoque sem quebrar aliases.
- Modify `shared/types/index.ts`: adicionar tipos de evento, origem, modos de operação e projeções.
- Modify `frontend/src/services/estoqueEscolarService.ts`: consumir dashboard, timeline e ações do novo backend.
- Modify `frontend/src/services/estoqueCentralService.ts`: consumir resumo, transferências e timeline do ledger.
- Create `frontend/src/modules/estoque/components/StockSummaryCards.tsx`: cards de resumo e criticidade.
- Create `frontend/src/modules/estoque/components/StockActionPanel.tsx`: hub de ações com CTAs explícitos.
- Create `frontend/src/modules/estoque/components/StockMovementDialog.tsx`: diálogo único para entrada, saída, ajuste e transferência.
- Create `frontend/src/modules/estoque/components/StockTimeline.tsx`: linha do tempo auditável por origem e motivo.
- Create `frontend/src/modules/estoque/components/StockMovementDialog.test.tsx`: cobre validação e preview de saldo.
- Create `frontend/src/modules/estoque/pages/EstoqueEscolar.test.tsx`: cobre o fluxo guiado do estoque escolar.
- Modify `frontend/src/modules/estoque/pages/EstoqueEscolar.tsx`: painel administrativo do estoque escolar.
- Modify `frontend/src/modules/estoque/pages/EstoqueEscolaPortal.tsx`: painel do portal escolar com a mesma linguagem de ação.
- Modify `frontend/src/modules/estoque/pages/EstoqueCentral.tsx`: resumo central, recebimentos, transferências e timeline.

## Task 1: Criar A Base Do Ledger E Das Projeções

**Files:**
- Create: `backend/src/migrations/20260425_create_estoque_ledger.sql`
- Create: `backend/src/modules/estoque/services/estoqueLedgerService.ts`
- Create: `backend/src/modules/estoque/services/estoqueProjectionService.ts`
- Create: `backend/src/modules/estoque/services/estoqueLedgerService.test.ts`
- Modify: `shared/types/index.ts`

- [ ] **Step 1: Write the failing backend tests**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyStockEvents,
  validateStockDelta,
  buildEstornoEvent,
} from './estoqueLedgerService';

describe('estoqueLedgerService', () => {
  it('rebuilds school balance from deltas in order', () => {
    const saldo = applyStockEvents([
      { quantidade_delta: 10 },
      { quantidade_delta: -4 },
      { quantidade_delta: 3 },
    ]);

    assert.equal(saldo, 9);
  });

  it('rejects a saída above available saldo', () => {
    assert.throws(() => validateStockDelta({ saldoAtual: 5, quantidadeDelta: -6 }));
  });

  it('creates an explicit estorno event instead of deleting history', () => {
    const estorno = buildEstornoEvent({ id: 55, quantidade_delta: -2, produto_id: 9 });
    assert.equal(estorno.evento_estornado_id, 55);
    assert.equal(estorno.quantidade_delta, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test backend/src/modules/estoque/services/estoqueLedgerService.test.ts`

Expected: FAIL because `estoqueLedgerService.ts` does not exist yet.

- [ ] **Step 3: Create the SQL migration**

Create `backend/src/migrations/20260425_create_estoque_ledger.sql` with the ledger tables and projections:

```sql
CREATE TABLE IF NOT EXISTS estoque_eventos (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  escopo VARCHAR(20) NOT NULL CHECK (escopo IN ('central', 'escola')),
  escola_id INTEGER,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  lote_id INTEGER,
  tipo_evento VARCHAR(50) NOT NULL,
  origem VARCHAR(50) NOT NULL,
  quantidade_delta NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantidade_absoluta NUMERIC(12,3),
  motivo TEXT,
  observacao TEXT,
  referencia_tipo VARCHAR(50),
  referencia_id INTEGER,
  usuario_id INTEGER,
  usuario_nome_snapshot VARCHAR(255),
  data_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  evento_estornado_id BIGINT REFERENCES estoque_eventos(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estoque_operacao_escola (
  escola_id INTEGER PRIMARY KEY REFERENCES escolas(id),
  modo_operacao VARCHAR(20) NOT NULL CHECK (modo_operacao IN ('escola', 'central', 'hibrido')),
  permite_ajuste_escola BOOLEAN NOT NULL DEFAULT true,
  permite_lancamento_central BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER
);
```

- [ ] **Step 4: Implement the minimal ledger service and projection helpers**

Create `backend/src/modules/estoque/services/estoqueLedgerService.ts` with pure helpers plus DB-backed append/list methods:

```ts
export interface StockEventInput {
  escopo: 'central' | 'escola';
  escola_id?: number;
  produto_id: number;
  lote_id?: number;
  tipo_evento: string;
  origem: string;
  quantidade_delta: number;
  quantidade_absoluta?: number;
  motivo?: string;
  observacao?: string;
  referencia_tipo?: string;
  referencia_id?: number;
  usuario_id?: number;
  usuario_nome_snapshot?: string;
}

export function applyStockEvents(events: Array<{ quantidade_delta: number }>): number {
  return events.reduce((acc, event) => acc + Number(event.quantidade_delta), 0);
}

export function validateStockDelta(input: { saldoAtual: number; quantidadeDelta: number }): void {
  if (input.saldoAtual + input.quantidadeDelta < 0) {
    throw new Error('Saldo insuficiente para a movimentação');
  }
}
```

- [ ] **Step 5: Update shared stock types**

Extend `shared/types/index.ts` with types consumed by backend and frontend:

```ts
export type OrigemEventoEstoque =
  | 'recebimento'
  | 'transferencia'
  | 'portal_escola'
  | 'central_operador'
  | 'sistema'
  | 'estorno';

export type TipoEventoEstoque =
  | 'recebimento_central'
  | 'transferencia_para_escola'
  | 'entrada_manual_escola'
  | 'saida_escola'
  | 'ajuste_estoque'
  | 'estorno_evento';

export type ModoOperacaoEstoqueEscola = 'escola' | 'central' | 'hibrido';
```

- [ ] **Step 6: Verify the tests and backend build**

Run:

```bash
npx tsx --test backend/src/modules/estoque/services/estoqueLedgerService.test.ts
npm run build --prefix backend
```

Expected: both commands PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/migrations/20260425_create_estoque_ledger.sql backend/src/modules/estoque/services/estoqueLedgerService.ts backend/src/modules/estoque/services/estoqueProjectionService.ts backend/src/modules/estoque/services/estoqueLedgerService.test.ts shared/types/index.ts
git commit -m "feat: add stock ledger foundation"
```

## Task 2: Migrar O Estoque Escolar Para O Ledger

**Files:**
- Modify: `backend/src/modules/estoque/controllers/estoqueEscolarController.ts`
- Modify: `backend/src/modules/estoque/routes/estoqueEscolarRoutes.ts`
- Modify: `backend/src/routes/registerApiRoutes.ts`
- Modify: `frontend/src/services/estoqueEscolarService.ts`
- Create: `frontend/src/modules/estoque/pages/EstoqueEscolar.test.tsx`

- [ ] **Step 1: Write the failing school flow tests**

Create `frontend/src/modules/estoque/pages/EstoqueEscolar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import EstoqueEscolar from './EstoqueEscolar';

describe('EstoqueEscolar', () => {
  it('renders action cards before the grid', () => {
    render(<EstoqueEscolar />);
    expect(screen.getByText('Registrar entrada')).toBeInTheDocument();
    expect(screen.getByText('Registrar saída')).toBeInTheDocument();
    expect(screen.getByText('Registrar ajuste')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run --prefix frontend -- src/modules/estoque/pages/EstoqueEscolar.test.tsx`

Expected: FAIL because the current page still renders the old table-first layout.

- [ ] **Step 3: Rewrite the school controller around ledger reads and writes**

Refactor `estoqueEscolarController.ts` so the public handlers delegate to the new services:

```ts
export async function listarEstoqueEscola(req: Request, res: Response) {
  const escolaId = Number(req.params.escolaId);
  const data = await estoqueProjectionService.listarSaldoEscolar(escolaId);
  res.json({ success: true, data });
}

export async function registrarMovimentacao(req: Request, res: Response) {
  const escolaId = Number(req.params.escolaId);
  const usuario = req.user;

  const evento = await estoqueLedgerService.registrarMovimentacaoEscolar({
    escola_id: escolaId,
    produto_id: Number(req.body.produto_id),
    tipo_evento: req.body.tipo_evento,
    origem: req.body.origem ?? 'central_operador',
    quantidade_delta: Number(req.body.quantidade_delta),
    motivo: req.body.motivo,
    observacao: req.body.observacao,
    usuario_id: usuario?.id,
    usuario_nome_snapshot: usuario?.nome,
  });

  res.status(201).json({ success: true, data: evento });
}
```

- [ ] **Step 4: Expand school routes without breaking existing aliases**

Update `backend/src/modules/estoque/routes/estoqueEscolarRoutes.ts`:

```ts
router.get('/escolas/:escolaId/dashboard', authMiddleware, listarEstoqueEscola);
router.get('/escolas/:escolaId/eventos', authMiddleware, listarHistoricoEscola);
router.get('/escolas/:escolaId/operacao', authMiddleware, buscarConfiguracaoOperacaoEscola);
router.post('/escolas/:escolaId/movimentacoes', authMiddleware, registrarMovimentacao);
```

Keep the current `/historico` route as an alias until the new frontend stops using it.

- [ ] **Step 5: Update the frontend school service API**

Modify `frontend/src/services/estoqueEscolarService.ts` to use event-oriented payloads:

```ts
export interface RegistrarEventoEscolarPayload {
  produto_id: number;
  tipo_evento: 'entrada_manual_escola' | 'saida_escola' | 'ajuste_estoque';
  quantidade_delta: number;
  motivo: string;
  observacao?: string;
  origem?: 'portal_escola' | 'central_operador';
}

export async function registrarEventoEscolar(escolaId: number, payload: RegistrarEventoEscolarPayload) {
  const { data } = await apiWithRetry.post(`/estoque-escolar/escolas/${escolaId}/movimentacoes`, payload);
  return data.data;
}
```

- [ ] **Step 6: Verify backend and frontend**

Run:

```bash
npm run build --prefix backend
npm run test:run --prefix frontend -- src/modules/estoque/pages/EstoqueEscolar.test.tsx
```

Expected: both commands PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/estoque/controllers/estoqueEscolarController.ts backend/src/modules/estoque/routes/estoqueEscolarRoutes.ts backend/src/routes/registerApiRoutes.ts frontend/src/services/estoqueEscolarService.ts frontend/src/modules/estoque/pages/EstoqueEscolar.test.tsx
git commit -m "feat: migrate school stock api to ledger"
```

## Task 3: Redesenhar O Estoque Escolar E O Portal Da Escola

**Files:**
- Create: `frontend/src/modules/estoque/components/StockSummaryCards.tsx`
- Create: `frontend/src/modules/estoque/components/StockActionPanel.tsx`
- Create: `frontend/src/modules/estoque/components/StockMovementDialog.tsx`
- Create: `frontend/src/modules/estoque/components/StockTimeline.tsx`
- Create: `frontend/src/modules/estoque/components/StockMovementDialog.test.tsx`
- Modify: `frontend/src/modules/estoque/pages/EstoqueEscolar.tsx`
- Modify: `frontend/src/modules/estoque/pages/EstoqueEscolaPortal.tsx`

- [ ] **Step 1: Write the failing dialog test**

Create `frontend/src/modules/estoque/components/StockMovementDialog.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StockMovementDialog } from './StockMovementDialog';

describe('StockMovementDialog', () => {
  it('shows saldo preview before confirming', () => {
    render(
      <StockMovementDialog
        open
        mode="saida"
        saldoAtual={12}
        unidade="KG"
        onClose={() => {}}
        onSubmit={() => Promise.resolve()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '5' } });
    expect(screen.getByText('Saldo depois: 7 KG')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the dialog and page tests to verify they fail**

Run:

```bash
npm run test:run --prefix frontend -- src/modules/estoque/components/StockMovementDialog.test.tsx src/modules/estoque/pages/EstoqueEscolar.test.tsx
```

Expected: FAIL because the new components and copy do not exist yet.

- [ ] **Step 3: Build the reusable task-first components**

Create the components with explicit props and no business logic hidden in page files:

```tsx
export interface StockActionPanelProps {
  onEntrada: () => void;
  onSaida: () => void;
  onAjuste: () => void;
  onHistorico: () => void;
  onTransferencia?: () => void;
}

export function StockActionPanel(props: StockActionPanelProps) {
  return (
    <Card>
      <Button onClick={props.onEntrada}>Registrar entrada</Button>
      <Button onClick={props.onSaida}>Registrar saída</Button>
      <Button onClick={props.onAjuste}>Registrar ajuste</Button>
      {props.onTransferencia ? <Button onClick={props.onTransferencia}>Transferir para escola</Button> : null}
      <Button onClick={props.onHistorico}>Ver histórico</Button>
    </Card>
  );
}
```

- [ ] **Step 4: Rewrite `EstoqueEscolar.tsx` around actions and timeline**

Use the new service calls and components:

```tsx
<PageContainer>
  <PageHeader title="Estoque Escolar" />
  <StockSummaryCards items={itens} />
  <StockActionPanel
    onEntrada={() => abrirDialogo('entrada')}
    onSaida={() => abrirDialogo('saida')}
    onAjuste={() => abrirDialogo('ajuste')}
    onHistorico={() => setHistoricoOpen(true)}
  />
  <StockTimeline eventos={historicoItens} />
</PageContainer>
```

Only keep the table below the action hub as secondary reading, not as the first interaction.

- [ ] **Step 5: Rewrite `EstoqueEscolaPortal.tsx` with the same interaction model**

The portal should share the same action cards and movement dialog but force origin `portal_escola`:

```tsx
await registrarEventoEscolar(escolaId, {
  produto_id: item.produto_id,
  tipo_evento: mode === 'entrada' ? 'entrada_manual_escola' : mode === 'saida' ? 'saida_escola' : 'ajuste_estoque',
  quantidade_delta: mode === 'saida' ? -quantidade : quantidade,
  origem: 'portal_escola',
  motivo,
  observacao,
});
```

- [ ] **Step 6: Verify the redesigned school UI**

Run:

```bash
npm run test:run --prefix frontend -- src/modules/estoque/components/StockMovementDialog.test.tsx src/modules/estoque/pages/EstoqueEscolar.test.tsx
npm run build --prefix frontend
```

Expected: both commands PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/modules/estoque/components/StockSummaryCards.tsx frontend/src/modules/estoque/components/StockActionPanel.tsx frontend/src/modules/estoque/components/StockMovementDialog.tsx frontend/src/modules/estoque/components/StockTimeline.tsx frontend/src/modules/estoque/components/StockMovementDialog.test.tsx frontend/src/modules/estoque/pages/EstoqueEscolar.tsx frontend/src/modules/estoque/pages/EstoqueEscolaPortal.tsx
git commit -m "feat: redesign school stock workflows"
```

## Task 4: Integrar Recebimentos E Entregas Ao Ledger

**Files:**
- Create: `backend/src/modules/estoque/services/estoqueIntegracaoService.ts`
- Create: `backend/src/modules/estoque/services/estoqueIntegracaoService.test.ts`
- Modify: `backend/src/modules/recebimentos/controllers/recebimentoController.ts`
- Modify: `backend/src/modules/entregas/models/Entrega.ts`
- Modify: `backend/src/modules/estoque/services/estoqueLedgerService.ts`

- [ ] **Step 1: Write the failing integration payload tests**

Create `backend/src/modules/estoque/services/estoqueIntegracaoService.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRecebimentoCentralEvent,
  buildTransferenciaParaEscolaEvent,
} from './estoqueIntegracaoService';

describe('estoqueIntegracaoService', () => {
  it('maps recebimento to a central positive delta', () => {
    const event = buildRecebimentoCentralEvent({ produto_id: 8, quantidade: 14, pedido_item_id: 21 });
    assert.equal(event.tipo_evento, 'recebimento_central');
    assert.equal(event.quantidade_delta, 14);
  });

  it('maps entrega to a school transfer event', () => {
    const event = buildTransferenciaParaEscolaEvent({ escola_id: 5, produto_id: 8, quantidade: 3, guia_item_id: 44 });
    assert.equal(event.tipo_evento, 'transferencia_para_escola');
    assert.equal(event.escola_id, 5);
    assert.equal(event.quantidade_delta, 3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test backend/src/modules/estoque/services/estoqueIntegracaoService.test.ts`

Expected: FAIL because `estoqueIntegracaoService.ts` does not exist yet.

- [ ] **Step 3: Implement integration event builders**

Create `backend/src/modules/estoque/services/estoqueIntegracaoService.ts`:

```ts
export function buildRecebimentoCentralEvent(input: { produto_id: number; quantidade: number; pedido_item_id: number }) {
  return {
    escopo: 'central' as const,
    produto_id: input.produto_id,
    tipo_evento: 'recebimento_central',
    origem: 'recebimento',
    quantidade_delta: Number(input.quantidade),
    referencia_tipo: 'recebimento',
    referencia_id: input.pedido_item_id,
  };
}
```

- [ ] **Step 4: Hook `registrarRecebimento` into the ledger transaction**

In `backend/src/modules/recebimentos/controllers/recebimentoController.ts`, after inserting the `recebimentos` row and before `COMMIT`, append the stock event with the same DB client:

```ts
await estoqueLedgerService.appendEventWithClient(client, {
  ...buildRecebimentoCentralEvent({
    produto_id: Number(itemMeta.produto_id),
    quantidade: Number(quantidadeRecebida),
    pedido_item_id: Number(pedidoItemId),
  }),
  usuario_id: usuarioId,
  usuario_nome_snapshot: req.user?.nome,
});
```

- [ ] **Step 5: Hook `confirmarEntrega` into the ledger transaction**

In `backend/src/modules/entregas/models/Entrega.ts`, after the delivery confirmation becomes effective, append `transferencia_para_escola`:

```ts
await estoqueLedgerService.appendEvent({
  ...buildTransferenciaParaEscolaEvent({
    escola_id: item.escola_id,
    produto_id: item.produto_id,
    quantidade: dados.quantidade_entregue,
    guia_item_id: itemId,
  }),
  usuario_nome_snapshot: dados.nome_quem_entregou,
});
```

- [ ] **Step 6: Verify the backend integrations**

Run:

```bash
npx tsx --test backend/src/modules/estoque/services/estoqueIntegracaoService.test.ts
npm run build --prefix backend
```

Expected: both commands PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/estoque/services/estoqueIntegracaoService.ts backend/src/modules/estoque/services/estoqueIntegracaoService.test.ts backend/src/modules/recebimentos/controllers/recebimentoController.ts backend/src/modules/entregas/models/Entrega.ts backend/src/modules/estoque/services/estoqueLedgerService.ts
git commit -m "feat: connect receipts and deliveries to stock ledger"
```

## Task 5: Migrar E Redesenhar O Estoque Central

**Files:**
- Modify: `backend/src/modules/estoque/controllers/EstoqueCentralController.ts`
- Modify: `backend/src/modules/estoque/routes/estoqueCentralRoutes.ts`
- Modify: `frontend/src/services/estoqueCentralService.ts`
- Modify: `frontend/src/modules/estoque/pages/EstoqueCentral.tsx`

- [ ] **Step 1: Capture the new central transfer contract**

Add a transfer payload to `frontend/src/services/estoqueCentralService.ts`:

```ts
export interface RegistrarTransferenciaPayload {
  escola_id: number;
  produto_id: number;
  quantidade: number;
  motivo: string;
  observacao?: string;
}
```

- [ ] **Step 2: Add the central controller endpoint**

Update `EstoqueCentralController.ts`:

```ts
async registrarTransferencia(req: Request, res: Response) {
  const data = await estoqueLedgerService.registrarTransferenciaParaEscola({
    escola_id: Number(req.body.escola_id),
    produto_id: Number(req.body.produto_id),
    quantidade: Number(req.body.quantidade),
    motivo: req.body.motivo,
    observacao: req.body.observacao,
    usuario_id: req.user?.id,
    usuario_nome_snapshot: req.user?.nome,
  });

  res.status(201).json({ success: true, data });
}
```

- [ ] **Step 3: Add the route and keep read aliases**

Update `backend/src/modules/estoque/routes/estoqueCentralRoutes.ts`:

```ts
router.get('/posicao', requireLeitura('estoque'), EstoqueCentralController.listar);
router.get('/movimentacoes', requireLeitura('estoque'), EstoqueCentralController.listarMovimentacoes);
router.post('/transferencias', requireEscrita('estoque'), EstoqueCentralController.registrarTransferencia);
```

- [ ] **Step 4: Rewrite the central page around summary, timeline and transfer**

Refactor `frontend/src/modules/estoque/pages/EstoqueCentral.tsx` so the first visible actions are:

```tsx
<StockSummaryCards items={posicoes} />
<StockActionPanel
  onEntrada={() => abrirDialogo('entrada')}
  onSaida={() => abrirDialogo('saida')}
  onAjuste={() => abrirDialogo('ajuste')}
  onTransferencia={() => abrirDialogo('transferencia')}
/>
<StockTimeline eventos={movimentacoes} />
```

The transfer flow must show the target school and the projected saldo after the operation before confirmation.

- [ ] **Step 5: Verify central build and tests**

Run:

```bash
npm run build --prefix backend
npm run build --prefix frontend
```

Expected: both commands PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/estoque/controllers/EstoqueCentralController.ts backend/src/modules/estoque/routes/estoqueCentralRoutes.ts frontend/src/services/estoqueCentralService.ts frontend/src/modules/estoque/pages/EstoqueCentral.tsx
git commit -m "feat: migrate central stock workflows to ledger"
```

## Task 6: Fechar A Escrita Legada E Rodar Verificação Final

**Files:**
- Modify: `backend/src/modules/estoque/controllers/estoqueEscolarController.ts`
- Modify: `backend/src/modules/estoque/controllers/EstoqueCentralController.ts`
- Modify: `backend/src/modules/estoque/services/estoqueLedgerService.ts`
- Modify: `backend/tests/runInventoryTests.ts`

- [ ] **Step 1: Remove or guard direct saldo mutations**

Any path that still does raw `UPDATE estoque_escolas` or `UPDATE estoque_central_lotes` as a primary write must now route through the ledger service:

```ts
throw new Error('Legacy stock write path is disabled; use estoqueLedgerService');
```

Use this guard only in dead-end legacy writers that should never be called again. For active endpoints, swap the implementation instead of throwing.

- [ ] **Step 2: Register the new inventory test files in the inventory runner**

Update `backend/tests/runInventoryTests.ts` patterns so the new tests are included:

```ts
const inventoryTestSuites = [
  {
    name: 'Inventory Unit Tests',
    pattern: 'src/modules/estoque/**/*.test.ts',
    description: 'Unit tests for ledger and integration logic',
    category: 'unit',
  },
];
```

- [ ] **Step 3: Run the focused verification commands**

Run:

```bash
npx tsx --test backend/src/modules/estoque/services/estoqueLedgerService.test.ts
npx tsx --test backend/src/modules/estoque/services/estoqueIntegracaoService.test.ts
npm run test:run --prefix frontend -- src/modules/estoque/components/StockMovementDialog.test.tsx src/modules/estoque/pages/EstoqueEscolar.test.tsx
npm run build --prefix backend
npm run build --prefix frontend
```

Expected: all commands PASS.

- [ ] **Step 4: Run the broader inventory smoke suite**

Run: `npx tsx backend/tests/runInventoryTests.ts`

Expected: PASS or a precise failure list limited to inventory cases that still need migration.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/estoque/controllers/estoqueEscolarController.ts backend/src/modules/estoque/controllers/EstoqueCentralController.ts backend/src/modules/estoque/services/estoqueLedgerService.ts backend/tests/runInventoryTests.ts
git commit -m "chore: disable legacy stock writes and verify ledger rollout"
```

## Self-Review

- Spec coverage: ledger base, projeções, modos de operação, estoque escolar, portal escolar, recebimentos, entregas, estoque central e bloqueio de escrita legada estão cobertos.
- Placeholder scan: não há `TODO`, `TBD` ou referências vagas do tipo "implementar depois".
- Type consistency: os nomes `recebimento_central`, `transferencia_para_escola`, `saida_escola`, `ajuste_estoque`, `portal_escola` e `central_operador` foram mantidos consistentes entre backend, shared types e frontend.
