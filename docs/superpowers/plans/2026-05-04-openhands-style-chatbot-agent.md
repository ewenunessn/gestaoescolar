# OpenHands-Style Chatbot Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a small OpenHands/Qwen-style agent core for the NutriLog chatbot while keeping all database behavior read-only.

**Architecture:** Add a local `agent/` module with typed events, an action-observation tool registry, a read-only policy, and a bounded runtime loop. Migrate only the `DatabaseAgent` LLM tool loop to this core, preserving existing semantic stock shortcuts and orchestrator behavior.

**Qwen Code patterns adopted:** core separated from the chat UI/service, explicit tool registry with descriptions, read-only policy gate, short-context refinement memory, and bounded tool loop. Deferred for later: subagents, write tools, and external MCP connectors.

**Tech Stack:** TypeScript, Node test runner, existing chatbot provider interface.

---

### Task 1: Agent Core

**Files:**
- Create: `backend/src/modules/chatbot/agent/events.ts`
- Create: `backend/src/modules/chatbot/agent/toolRegistry.ts`
- Create: `backend/src/modules/chatbot/agent/policy.ts`
- Create: `backend/src/modules/chatbot/agent/runtime.ts`
- Test: `backend/src/modules/chatbot/agent/agentRuntime.test.ts`

- [x] Write tests for action/observation event emission, policy blocking, and final messages.
- [x] Implement minimal core types and runtime loop.
- [x] Verify the focused test passes.

### Task 2: DatabaseAgent Migration

**Files:**
- Modify: `backend/src/modules/chatbot/services/databaseAgentService.ts`
- Test: `backend/src/modules/chatbot/services/databaseAgentService.test.ts`

- [x] Keep semantic stock shortcuts unchanged.
- [x] Replace the manual LLM tool loop with the new `runAgentRuntime`.
- [x] Preserve returned `toolsUsed`, `trace`, and fallback behavior.
- [x] Add short-context refinement memory for follow-up messages like `arroz polido`.
- [x] Verify database agent tests pass.

### Task 3: Regression

**Files:**
- Existing chatbot and estoque tests.

- [ ] Run the chatbot, database agent, SQL agent, and estoque tool tests together.
- [ ] Fix any contract mismatch without changing user-facing behavior.
