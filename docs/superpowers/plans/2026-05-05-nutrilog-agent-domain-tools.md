# NutriLog Agent Domain Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar o agente do NutriLog em tools de dominio somente leitura, com interface parecida com frameworks como Mastra, sem migrar dependencias agora.

**Architecture:** Manter o runtime atual (`agent/runtime.ts`) e evoluir o `databaseAgentService.ts` para registrar tools por dominio. As novas tools usam SQL parametrizado e preservam a policy read-only existente.

**Tech Stack:** Node.js, TypeScript, Express, PostgreSQL, node:test/tsx.

---

### Task 1: Add Domain Tool Names And Prompt

**Files:**
- Modify: `backend/src/modules/chatbot/services/databaseAgentService.ts`
- Test: `backend/src/modules/chatbot/services/databaseAgentService.test.ts`

- [ ] Add tests proving the database agent can call `nutrilog.consultar_estoque`, `nutrilog.consultar_cardapio`, `nutrilog.consultar_demanda`, `nutrilog.consultar_pedido`, `nutrilog.consultar_entrega`, and `nutrilog.consultar_faturamento`.
- [ ] Verify the new tests fail because the tools are unavailable.
- [ ] Extend the tool-name union, prompt and registry with the domain tools.
- [ ] Run the focused chatbot agent tests.

### Task 2: Implement Read-Only Domain Tools

**Files:**
- Modify: `backend/src/modules/chatbot/services/databaseAgentService.ts`
- Test: `backend/src/modules/chatbot/services/databaseAgentService.test.ts`

- [ ] Implement each tool with bounded SELECT queries and optional filters.
- [ ] Preserve `database.executar_select_seguro` as fallback for gaps.
- [ ] Ensure all tools are registered with `readOnly: true`.
- [ ] Run focused chatbot tests and backend TypeScript check.

