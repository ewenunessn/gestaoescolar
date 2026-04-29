import { QueryKey } from '@tanstack/react-query';
import { apiConfig } from '../config/api';

export type RealtimeDomain =
  | 'solicitacoes_alimentos'
  | 'entregas'
  | 'estoque_central'
  | 'estoque_escolar'
  | 'compras'
  | 'guias'
  | 'notificacoes'
  | 'system';

export interface RealtimeEvent {
  id: string;
  type?: string;
  domain: RealtimeDomain;
  action: string;
  entityId?: number;
  escolaId?: number;
  usuarioIds?: number[];
  occurredAt: string;
  payload?: Record<string, unknown>;
}

export const REALTIME_BROWSER_EVENT = 'nutrilog:realtime-event';

export function getRealtimeInvalidationKeys(event: RealtimeEvent): QueryKey[] {
  switch (event.domain) {
    case 'solicitacoes_alimentos':
      return [['solicitacoes-alimentos'], ['notificacoes']];
    case 'entregas':
      return [['entregas'], ['romaneio']];
    case 'estoque_central':
      return [['estoque-central']];
    case 'estoque_escolar':
      return [['estoque-escolar']];
    case 'compras':
      return [['pedidos'], ['compras'], ['recebimentos']];
    case 'guias':
      return [['guias'], ['guias-demanda'], ['entregas']];
    case 'notificacoes':
      return [['notificacoes']];
    default:
      return [];
  }
}

export function shouldRefreshForRealtimeEvent(
  event: RealtimeEvent | null | undefined,
  options: { domains: RealtimeDomain[]; escolaId?: number | null; entityId?: number | null },
): boolean {
  if (!event || !options.domains.includes(event.domain)) {
    return false;
  }

  if (
    options.escolaId !== undefined
    && options.escolaId !== null
    && event.escolaId !== undefined
    && Number(event.escolaId) !== Number(options.escolaId)
  ) {
    return false;
  }

  if (
    options.entityId !== undefined
    && options.entityId !== null
    && event.entityId !== undefined
    && Number(event.entityId) !== Number(options.entityId)
  ) {
    return false;
  }

  return true;
}

export function toRealtimeEventsUrl(baseURL = apiConfig.baseURL, token?: string | null): string {
  const normalizedBase = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const endpoint = normalizedBase.endsWith('/api')
    ? `${normalizedBase}/events`
    : `${normalizedBase}/api/events`;
  const url = new URL(endpoint);

  if (token) {
    url.searchParams.set('token', token);
  }

  return url.toString();
}

export function dispatchRealtimeBrowserEvent(event: RealtimeEvent): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<RealtimeEvent>(REALTIME_BROWSER_EVENT, { detail: event }));
}

export function connectRealtimeEvents(options: {
  token: string | null;
  onEvent: (event: RealtimeEvent) => void;
  onError?: (error: Event) => void;
  baseURL?: string;
}): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined' || !options.token) {
    return () => {};
  }

  const source = new EventSource(toRealtimeEventsUrl(options.baseURL ?? apiConfig.baseURL, options.token));

  source.onmessage = (message) => {
    if (!message.data) {
      return;
    }

    try {
      options.onEvent(JSON.parse(message.data) as RealtimeEvent);
    } catch (error) {
      console.warn('[realtime] Evento invalido ignorado', error);
    }
  };

  source.onerror = (error) => {
    options.onError?.(error);
  };

  return () => source.close();
}
