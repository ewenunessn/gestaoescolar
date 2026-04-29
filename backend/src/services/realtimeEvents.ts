import type { Response } from 'express';

export type RealtimeDomain =
  | 'solicitacoes_alimentos'
  | 'entregas'
  | 'estoque_central'
  | 'estoque_escolar'
  | 'compras'
  | 'guias'
  | 'notificacoes'
  | 'system';

export interface RealtimeSubscriberUser {
  id: number;
  tipo: string;
  escola_id?: number;
  isSystemAdmin?: boolean;
}

export interface RealtimeEventInput {
  domain: RealtimeDomain;
  action: string;
  entityId?: number;
  escolaId?: number;
  usuarioIds?: number[];
  payload?: Record<string, unknown>;
}

export interface RealtimeEvent extends RealtimeEventInput {
  id: string;
  type: string;
  occurredAt: string;
}

interface RealtimeSubscriber {
  id: string;
  user: RealtimeSubscriberUser;
  response: Response;
  heartbeat: NodeJS.Timeout;
}

const subscribers = new Map<string, RealtimeSubscriber>();
let eventSequence = 0;

function nextEventId(): string {
  eventSequence += 1;
  return `${Date.now()}-${eventSequence}`;
}

export function createRealtimeEvent(input: RealtimeEventInput): RealtimeEvent {
  return {
    ...input,
    id: nextEventId(),
    type: `${input.domain}.${input.action}`,
    occurredAt: new Date().toISOString(),
    usuarioIds: input.usuarioIds ? Array.from(new Set(input.usuarioIds)) : undefined,
  };
}

export function shouldDeliverRealtimeEvent(event: RealtimeEvent, user: RealtimeSubscriberUser): boolean {
  if (event.usuarioIds && event.usuarioIds.length > 0) {
    return event.usuarioIds.includes(Number(user.id));
  }

  if (event.escolaId && user.escola_id && Number(user.escola_id) !== Number(event.escolaId)) {
    return false;
  }

  return true;
}

function writeSseEvent(response: Response, event: RealtimeEvent): void {
  response.write(`id: ${event.id}\n`);
  response.write(`event: message\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function publishRealtimeEvent(input: RealtimeEventInput): RealtimeEvent {
  const event = createRealtimeEvent(input);

  for (const subscriber of subscribers.values()) {
    if (!shouldDeliverRealtimeEvent(event, subscriber.user)) {
      continue;
    }

    try {
      writeSseEvent(subscriber.response, event);
    } catch {
      unsubscribeRealtimeClient(subscriber.id);
    }
  }

  return event;
}

export function subscribeToRealtimeEvents(user: RealtimeSubscriberUser, response: Response): () => void {
  const subscriberId = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.flushHeaders?.();

  const heartbeat = setInterval(() => {
    response.write(`: heartbeat ${new Date().toISOString()}\n\n`);
  }, 25_000);

  const subscriber: RealtimeSubscriber = {
    id: subscriberId,
    user,
    response,
    heartbeat,
  };

  subscribers.set(subscriberId, subscriber);

  writeSseEvent(response, createRealtimeEvent({
    domain: 'system',
    action: 'connected',
    usuarioIds: [user.id],
  }));

  return () => unsubscribeRealtimeClient(subscriberId);
}

export function unsubscribeRealtimeClient(subscriberId: string): void {
  const subscriber = subscribers.get(subscriberId);
  if (!subscriber) {
    return;
  }

  clearInterval(subscriber.heartbeat);
  subscribers.delete(subscriberId);
}

export function getRealtimeSubscriberCount(): number {
  return subscribers.size;
}
