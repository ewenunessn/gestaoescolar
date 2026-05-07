export interface AgentToolDefinition {
  name: string;
  description: string;
  readOnly: boolean;
  execute(input: Record<string, unknown>): Promise<unknown>;
}

export interface AgentToolRegistry {
  register(tool: AgentToolDefinition): AgentToolRegistry;
  get(name: string): AgentToolDefinition | undefined;
  list(): AgentToolDefinition[];
}

export function createToolRegistry(initialTools: AgentToolDefinition[] = []): AgentToolRegistry {
  const tools = new Map<string, AgentToolDefinition>();

  const registry: AgentToolRegistry = {
    register(tool) {
      tools.set(tool.name, tool);
      return registry;
    },
    get(name) {
      return tools.get(name);
    },
    list() {
      return Array.from(tools.values());
    },
  };

  for (const tool of initialTools) {
    registry.register(tool);
  }

  return registry;
}
