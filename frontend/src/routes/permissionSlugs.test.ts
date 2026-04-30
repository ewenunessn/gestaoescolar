import { describe, expect, it } from 'vitest';
import {
  CANONICAL_PERMISSION_SLUGS,
  ROUTE_PERMISSION_SLUGS,
} from './permissionSlugs';

describe('route permission slugs', () => {
  it('uses backend canonical slugs for purchase, guide, billing, and meal-prep routes', () => {
    expect(CANONICAL_PERMISSION_SLUGS.compras).toBe('compras');
    expect(CANONICAL_PERMISSION_SLUGS.guias).toBe('guias');
    expect(CANONICAL_PERMISSION_SLUGS.faturamentos).toBe('faturamentos');
    expect(CANONICAL_PERMISSION_SLUGS.refeicoes).toBe('refeicoes');

    expect(ROUTE_PERMISSION_SLUGS.compras).toBe('compras');
    expect(ROUTE_PERMISSION_SLUGS.guiasDemanda).toBe('guias');
    expect(ROUTE_PERMISSION_SLUGS.faturamentos).toBe('faturamentos');
    expect(ROUTE_PERMISSION_SLUGS.preparacoes).toBe('refeicoes');
  });

  it('uses a dedicated portal school slug instead of dashboard', () => {
    expect(ROUTE_PERMISSION_SLUGS.portalEscola).toBe('portal_escola');
    expect(ROUTE_PERMISSION_SLUGS.portalEscola).not.toBe('dashboard');
  });
});
