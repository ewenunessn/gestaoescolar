import type { ChatbotConfig } from "../config/chatbotConfig";
import type { ChatbotMessage, ChatbotProvider } from "../providers/types";
import type {
  AgentActionEvent,
  AgentObservationEvent,
  AgentRuntimeEvent,
} from "./events";
import { createAgentEventId } from "./events";
import type { AgentPolicy } from "./policy";
import type { AgentToolRegistry } from "./toolRegistry";

interface AgentToolAction {
  action: "tool";
  tool: string;
  input: Record<string, unknown>;
}

interface AgentFinalAction {
  action: "final";
  needsDatabase: boolean;
  answer: string;
}

type AgentAction = AgentToolAction | AgentFinalAction;

export interface RunAgentRuntimeInput {
  provider: ChatbotProvider;
  config: ChatbotConfig;
  initialMessages: ChatbotMessage[];
  tools: AgentToolRegistry;
  policy: AgentPolicy;
  maxSteps?: number;
}

export interface RunAgentRuntimeResult {
  handled: boolean;
  answer: string;
  toolsUsed: string[];
  events: AgentRuntimeEvent[];
  fallbackContent?: string;
  observations: unknown[];
}

export class AgentToolBlockedError extends Error {
  readonly observation?: unknown;

  constructor(message: string, observation?: unknown) {
    super(message);
    this.name = "AgentToolBlockedError";
    this.observation = observation;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function extractJsonObject(content: string): Record<string, unknown> | null {
  const trimmed = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function parseAction(content: string): AgentAction | null {
  const parsed = extractJsonObject(content);
  if (!parsed) return null;

  if (parsed.action === "tool") {
    const tool = typeof parsed.tool === "string" ? parsed.tool : "";
    const toolInput = parsed.input && typeof parsed.input === "object" && !Array.isArray(parsed.input)
      ? parsed.input as Record<string, unknown>
      : {};

    if (!tool) return null;
    return { action: "tool", tool, input: toolInput };
  }

  if (parsed.action === "final") {
    return {
      action: "final",
      needsDatabase: parsed.needsDatabase === true,
      answer: typeof parsed.answer === "string" ? parsed.answer : "",
    };
  }

  return null;
}

function appendObservationMessages(input: {
  messages: ChatbotMessage[];
  assistantContent: string;
  toolName: string;
  observation: unknown;
}): void {
  input.messages.push(
    { role: "assistant", content: input.assistantContent },
    {
      role: "user",
      content: [
        `Resultado da ferramenta ${input.toolName}:`,
        JSON.stringify(input.observation, null, 2),
        "Continue o loop. Use outra ferramenta se precisar ou finalize com action=final e needsDatabase=true.",
      ].join("\n"),
    },
  );
}

export async function runAgentRuntime(input: RunAgentRuntimeInput): Promise<RunAgentRuntimeResult> {
  const messages = [...input.initialMessages];
  const maxSteps = input.maxSteps ?? 6;
  const events: AgentRuntimeEvent[] = [];
  const observations: unknown[] = [];
  const toolsUsed: string[] = [];
  let eventSequence = 0;

  for (let step = 0; step < maxSteps; step += 1) {
    const completion = await input.provider.complete({
      config: input.config,
      messages,
    });
    const action = parseAction(completion.content);

    if (!action) {
      return {
        handled: false,
        answer: "",
        toolsUsed,
        events,
        observations,
        fallbackContent: completion.content,
      };
    }

    if (action.action === "final") {
      events.push({
        id: createAgentEventId("msg", eventSequence += 1),
        type: "message",
        source: "agent",
        content: action.answer,
        handled: action.needsDatabase,
        createdAt: nowIso(),
      });

      return {
        handled: action.needsDatabase,
        answer: action.answer,
        toolsUsed,
        events,
        observations,
        fallbackContent: completion.content,
      };
    }

    const tool = input.tools.get(action.tool);
    const actionEvent: AgentActionEvent = {
      id: createAgentEventId("act", eventSequence += 1),
      type: "action",
      toolName: action.tool,
      input: action.input,
      status: "pending",
      createdAt: nowIso(),
    };
    events.push(actionEvent);
    toolsUsed.push(action.tool);

    const decision = input.policy.validateToolCall({
      toolName: action.tool,
      tool,
      input: action.input,
    });

    if (decision.allowed === false) {
      actionEvent.status = "blocked";
      events.push({
        id: createAgentEventId("block", eventSequence += 1),
        type: "policy_block",
        actionId: actionEvent.id,
        toolName: action.tool,
        reason: decision.reason,
        createdAt: nowIso(),
      });

      return {
        handled: true,
        answer: decision.reason,
        toolsUsed,
        events,
        observations,
      };
    }

    try {
      const observation = await tool.execute(action.input);
      actionEvent.status = "executed";
      observations.push(observation);
      const observationEvent: AgentObservationEvent = {
        id: createAgentEventId("obs", eventSequence += 1),
        type: "observation",
        actionId: actionEvent.id,
        toolName: action.tool,
        observation,
        createdAt: nowIso(),
      };
      events.push(observationEvent);

      appendObservationMessages({
        messages,
        assistantContent: completion.content,
        toolName: action.tool,
        observation,
      });
    } catch (error) {
      if (error instanceof AgentToolBlockedError) {
        actionEvent.status = "blocked";
        if (error.observation !== undefined) {
          observations.push(error.observation);
        }
        events.push({
          id: createAgentEventId("block", eventSequence += 1),
          type: "policy_block",
          actionId: actionEvent.id,
          toolName: action.tool,
          reason: error.message,
          createdAt: nowIso(),
        });

        return {
          handled: true,
          answer: error.message,
          toolsUsed,
          events,
          observations,
        };
      }

      const message = error instanceof Error ? error.message : "Falha ao executar ferramenta.";
      events.push({
        id: createAgentEventId("error", eventSequence += 1),
        type: "error",
        message,
        createdAt: nowIso(),
      });

      return {
        handled: true,
        answer: message,
        toolsUsed,
        events,
        observations,
      };
    }
  }

  return {
    handled: true,
    answer: "Consultei o banco, mas o agente atingiu o limite de passos antes de finalizar a resposta.",
    toolsUsed,
    events,
    observations,
  };
}
