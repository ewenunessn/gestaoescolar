import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRefreshCache } from './deliverySyncPolicy';

test('fresh cache does not refresh unless forced', () => {
  const now = 1_000_000;
  assert.equal(shouldRefreshCache({ timestamp: now - 30_000, now, maxAgeMs: 60_000 }), false);
  assert.equal(shouldRefreshCache({ timestamp: now - 30_000, now, maxAgeMs: 60_000, force: true }), true);
});

test('missing or stale cache refreshes', () => {
  const now = 1_000_000;
  assert.equal(shouldRefreshCache({ timestamp: undefined, now, maxAgeMs: 60_000 }), true);
  assert.equal(shouldRefreshCache({ timestamp: now - 90_000, now, maxAgeMs: 60_000 }), true);
});
