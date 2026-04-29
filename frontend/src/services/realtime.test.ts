import { describe, expect, it } from 'vitest';
import {
  REALTIME_BROWSER_EVENT,
  getRealtimeInvalidationKeys,
  shouldRefreshForRealtimeEvent,
  toRealtimeEventsUrl,
  type RealtimeEvent,
} from './realtime';

describe('realtime service helpers', () => {
  it('maps solicitation changes to solicitation and notification caches', () => {
    const event: RealtimeEvent = {
      id: 'evt-1',
      domain: 'solicitacoes_alimentos',
      action: 'updated',
      entityId: 10,
      escolaId: 80,
      occurredAt: '2026-04-28T12:00:00.000Z',
    };

    expect(getRealtimeInvalidationKeys(event)).toEqual([
      ['solicitacoes-alimentos'],
      ['notificacoes'],
    ]);
  });

  it('matches local refresh handlers by domain and school', () => {
    const event: RealtimeEvent = {
      id: 'evt-2',
      domain: 'estoque_escolar',
      action: 'updated',
      escolaId: 80,
      occurredAt: '2026-04-28T12:00:00.000Z',
    };

    expect(shouldRefreshForRealtimeEvent(event, { domains: ['estoque_escolar'], escolaId: 80 })).toBe(true);
    expect(shouldRefreshForRealtimeEvent(event, { domains: ['entregas'], escolaId: 80 })).toBe(false);
    expect(shouldRefreshForRealtimeEvent(event, { domains: ['estoque_escolar'], escolaId: 81 })).toBe(false);
  });

  it('matches local refresh handlers by entity when provided', () => {
    const event: RealtimeEvent = {
      id: 'evt-3',
      domain: 'compras',
      action: 'updated',
      entityId: 44,
      occurredAt: '2026-04-28T12:00:00.000Z',
    };

    expect(shouldRefreshForRealtimeEvent(event, { domains: ['compras'], entityId: 44 })).toBe(true);
    expect(shouldRefreshForRealtimeEvent(event, { domains: ['compras'], entityId: 45 })).toBe(false);
  });

  it('maps central stock and purchase changes to their caches', () => {
    expect(getRealtimeInvalidationKeys({
      id: 'evt-4',
      domain: 'estoque_central',
      action: 'updated',
      occurredAt: '2026-04-28T12:00:00.000Z',
    })).toEqual([['estoque-central']]);

    expect(getRealtimeInvalidationKeys({
      id: 'evt-5',
      domain: 'compras',
      action: 'updated',
      entityId: 12,
      occurredAt: '2026-04-28T12:00:00.000Z',
    })).toEqual([['pedidos'], ['compras'], ['recebimentos']]);

    expect(getRealtimeInvalidationKeys({
      id: 'evt-6',
      domain: 'guias',
      action: 'updated',
      entityId: 20,
      occurredAt: '2026-04-28T12:00:00.000Z',
    })).toEqual([['guias'], ['guias-demanda'], ['entregas']]);
  });

  it('builds the SSE endpoint from the configured API base URL', () => {
    const url = toRealtimeEventsUrl('http://localhost:3000/api', 'abc 123');

    expect(url).toBe('http://localhost:3000/api/events?token=abc+123');
    expect(REALTIME_BROWSER_EVENT).toBe('nutrilog:realtime-event');
  });
});
