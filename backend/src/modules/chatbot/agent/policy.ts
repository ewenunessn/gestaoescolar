import type { AgentToolDefinition } from "./toolRegistry";

export type AgentPolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

export interface AgentPolicy {
  validateToolCall(input: {
    toolName: string;
    tool?: AgentToolDefinition;
    input: Record<string, unknown>;
  }): AgentPolicyDecision;
}

export function createReadOnlyPolicy(): AgentPolicy {
  return {
    validateToolCall({ toolName, tool }) {
      if (!tool) {
        return {
          allowed: false,
          reason: `A ferramenta ${toolName} nao esta disponivel para este agente somente leitura.`,
        };
      }

      if (!tool.readOnly) {
        return {
          allowed: false,
          reason: "Este agente esta em modo somente leitura e nao pode executar ferramentas que alteram dados.",
        };
      }

      return { allowed: true };
    },
  };
}
