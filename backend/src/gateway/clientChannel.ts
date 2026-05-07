import type { NextFunction, Request, Response } from "express";

export const BFF_CHANNELS = ["web", "app", "portal", "chatbot"] as const;

export type BffClientChannel = (typeof BFF_CHANNELS)[number];
export type ClientChannel = BffClientChannel | "api" | "public";

export interface BffRouteDefinition {
  channel: BffClientChannel;
  prefix: string;
  description: string;
}

const BFF_ROUTE_DEFINITIONS: BffRouteDefinition[] = [
  {
    channel: "web",
    prefix: "/bff/web",
    description: "Painel administrativo web",
  },
  {
    channel: "app",
    prefix: "/bff/app",
    description: "Aplicativo operacional e entregador",
  },
  {
    channel: "portal",
    prefix: "/bff/portal",
    description: "Portal da escola",
  },
  {
    channel: "chatbot",
    prefix: "/bff/chatbot",
    description: "Cliente conversacional",
  },
];

export function getBffRouteDefinitions(): BffRouteDefinition[] {
  return BFF_ROUTE_DEFINITIONS.map((definition) => ({ ...definition }));
}

export function resolveClientChannel(path: string): ClientChannel | null {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const [, root, channel] = normalizedPath.split("/");

  if (root === "bff") {
    return BFF_CHANNELS.includes(channel as BffClientChannel)
      ? (channel as BffClientChannel)
      : null;
  }

  if (root === "api") return "api";
  return "public";
}

export function gatewayClientChannelMiddleware(req: Request, res: Response, next: NextFunction) {
  const channel = resolveClientChannel(req.path);

  if (!channel) {
    return res.status(404).json({
      success: false,
      error: "UNKNOWN_CLIENT_CHANNEL",
      message: "Canal BFF nao reconhecido.",
    });
  }

  (req as Request & { clientChannel?: ClientChannel }).clientChannel = channel;
  res.setHeader("X-Gateway-Client", channel);
  next();
}
