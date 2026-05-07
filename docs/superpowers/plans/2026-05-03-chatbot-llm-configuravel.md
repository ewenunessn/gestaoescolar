# Chatbot LLM Configuravel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a configurable read-only LLM chatbot with a floating frontend panel and a first controlled stock-update query tool.

**Architecture:** Add a new backend `chatbot` module with config, provider adapters, controlled tools, orchestration, controller, and route registration. Add a frontend service plus a global floating chat panel mounted in `AppShellLayout`.

**Tech Stack:** Express, TypeScript, PostgreSQL via existing `db`, React 18, MUI, Axios, node:test backend tests, Vitest frontend tests.

---

### Task 1: Backend Configuration And Provider Contracts

**Files:**
- Create: `backend/src/modules/chatbot/config/chatbotConfig.ts`
- Create: `backend/src/modules/chatbot/providers/types.ts`
- Create: `backend/src/modules/chatbot/providers/ollamaProvider.ts`
- Create: `backend/src/modules/chatbot/providers/openAiCompatibleProvider.ts`
- Create: `backend/src/modules/chatbot/providers/providerFactory.ts`
- Test: `backend/src/modules/chatbot/config/chatbotConfig.test.ts`

- [ ] **Step 1: Write failing config tests**

Create tests that assert disabled defaults, Ollama defaults, provider validation, timeout validation, and temperature validation.

- [ ] **Step 2: Run config tests and verify failure**

Run: `npx tsx --test src/modules/chatbot/config/chatbotConfig.test.ts`

- [ ] **Step 3: Implement config and providers**

Implement provider-neutral message types, Ollama adapter for `/api/chat`, OpenAI-compatible adapter for `/chat/completions`, and factory selection.

- [ ] **Step 4: Run config tests and verify pass**

Run: `npx tsx --test src/modules/chatbot/config/chatbotConfig.test.ts`

### Task 2: Stock Tool

**Files:**
- Create: `backend/src/modules/chatbot/tools/types.ts`
- Create: `backend/src/modules/chatbot/tools/estoqueTools.ts`
- Test: `backend/src/modules/chatbot/tools/estoqueTools.test.ts`

- [ ] **Step 1: Write failing tool tests**

Test product resolution by exact/partial name, active school grouping, updated schools, pending schools, maximum day clamp, and ambiguous product candidates.

- [ ] **Step 2: Run tool tests and verify failure**

Run: `npx tsx --test src/modules/chatbot/tools/estoqueTools.test.ts`

- [ ] **Step 3: Implement tool with dependency injection**

Implement `consultarAtualizacoesProdutoPorPeriodo` using injected query function so tests can run without a database. SQL must be fixed and parameterized.

- [ ] **Step 4: Run tool tests and verify pass**

Run: `npx tsx --test src/modules/chatbot/tools/estoqueTools.test.ts`

### Task 3: Orchestrator, Controller, And Route

**Files:**
- Create: `backend/src/modules/chatbot/services/chatbotOrchestrator.ts`
- Create: `backend/src/modules/chatbot/controllers/chatbotController.ts`
- Create: `backend/src/modules/chatbot/routes/chatbotRoutes.ts`
- Modify: `backend/src/routes/registerApiRoutes.ts`
- Test: `backend/src/modules/chatbot/services/chatbotOrchestrator.test.ts`

- [ ] **Step 1: Write failing orchestrator tests**

Test that a stock question calls the stock tool and provider, disabled config returns a controlled error, and generic question calls provider without a tool.

- [ ] **Step 2: Run orchestrator tests and verify failure**

Run: `npx tsx --test src/modules/chatbot/services/chatbotOrchestrator.test.ts`

- [ ] **Step 3: Implement orchestration and HTTP endpoint**

Validate message length/history, enforce enabled config, identify stock-update questions, call the tool, call the provider, and register `/api/chatbot`.

- [ ] **Step 4: Run orchestrator tests and verify pass**

Run: `npx tsx --test src/modules/chatbot/services/chatbotOrchestrator.test.ts`

### Task 4: Frontend Chat Panel

**Files:**
- Create: `frontend/src/services/chatbotService.ts`
- Create: `frontend/src/components/chatbot/FloatingChatbot.tsx`
- Test: `frontend/src/components/chatbot/FloatingChatbot.test.tsx`
- Modify: `frontend/src/components/layout/AppShellLayout.tsx`

- [ ] **Step 1: Write failing component tests**

Test floating button rendering, panel open/close, message submission, loading state, response rendering, and error rendering.

- [ ] **Step 2: Run frontend test and verify failure**

Run: `npm run test:run -- --run src/components/chatbot/FloatingChatbot.test.tsx`

- [ ] **Step 3: Implement service and component**

Use stable callbacks, keep session history local, and mount the component once inside `AppShellLayoutInner`.

- [ ] **Step 4: Run frontend test and verify pass**

Run: `npm run test:run -- --run src/components/chatbot/FloatingChatbot.test.tsx`

### Task 5: Verification

**Files:**
- Modify as needed only in files touched by previous tasks.

- [ ] **Step 1: Run focused backend tests**

Run all chatbot backend tests with `npx tsx --test src/modules/chatbot/**/*.test.ts`.

- [ ] **Step 2: Run focused frontend tests**

Run `npm run test:run -- --run src/components/chatbot/FloatingChatbot.test.tsx`.

- [ ] **Step 3: Run builds**

Run `npm run build --prefix backend` and `npm run build --prefix frontend`.

- [ ] **Step 4: Report residual risks**

If full frontend build exposes unrelated existing errors, report them separately and keep the chatbot implementation verified by focused tests.
