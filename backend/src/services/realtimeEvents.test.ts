import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createRealtimeEvent,
  shouldDeliverRealtimeEvent,
  type RealtimeSubscriberUser,
} from './realtimeEvents';

describe('realtimeEvents', () => {
  it('delivers school-scoped events to the same school and admins', () => {
    const event = createRealtimeEvent({
      domain: 'solicitacoes_alimentos',
      action: 'updated',
      entityId: 10,
      escolaId: 80,
    });

    const sameSchool: RealtimeSubscriberUser = { id: 1, tipo: 'escola', escola_id: 80 };
    const otherSchool: RealtimeSubscriberUser = { id: 2, tipo: 'escola', escola_id: 81 };
    const admin: RealtimeSubscriberUser = { id: 3, tipo: 'admin' };

    assert.equal(shouldDeliverRealtimeEvent(event, sameSchool), true);
    assert.equal(shouldDeliverRealtimeEvent(event, otherSchool), false);
    assert.equal(shouldDeliverRealtimeEvent(event, admin), true);
  });

  it('prioritizes explicit user targets when present', () => {
    const event = createRealtimeEvent({
      domain: 'notificacoes',
      action: 'created',
      usuarioIds: [7],
    });

    assert.equal(shouldDeliverRealtimeEvent(event, { id: 7, tipo: 'admin' }), true);
    assert.equal(shouldDeliverRealtimeEvent(event, { id: 8, tipo: 'admin' }), false);
  });
});
