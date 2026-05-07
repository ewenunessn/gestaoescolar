export type AgentRuntimeEvent =
  | AgentActionEvent
  | AgentObservationEvent
  | AgentMessageEvent
  | AgentPolicyBlockEvent
  | AgentErrorEvent;

export interface AgentActionEvent {
  id: string;
  type: "action";
  toolName: string;
  input: Record<string, unknown>;
  status: "pending" | "executed" | "blocked";
  createdAt: string;
}

export interface AgentObservationEvent {
  id: string;
  type: "observation";
  actionId: string;
  toolName: string;
  observation: unknown;
  createdAt: string;
}

export interface AgentMessageEvent {
  id: string;
  type: "message";
  source: "agent";
  content: string;
  handled: boolean;
  createdAt: string;
}

export interface AgentPolicyBlockEvent {
  id: string;
  type: "policy_block";
  actionId: string;
  toolName: string;
  reason: string;
  createdAt: string;
}

export interface AgentErrorEvent {
  id: string;
  type: "error";
  message: string;
  createdAt: string;
}

export function createAgentEventId(prefix: string, sequence: number): string {
  return `${prefix}_${sequence}`;
}
