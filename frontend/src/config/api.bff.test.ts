import { describe, expect, it } from 'vitest';

import { createApiConfigForEnvironment } from './api';

describe('api BFF defaults', () => {
  it('uses web BFF as the default browser API surface', () => {
    expect(createApiConfigForEnvironment('development').baseURL).toBe('http://localhost:3000/bff/web');
    expect(createApiConfigForEnvironment('production').baseURL).toBe('https://gestaoescolar-backend.vercel.app/bff/web');
  });

  it('preserves explicit API URL overrides', () => {
    expect(createApiConfigForEnvironment('development', {
      VITE_API_URL: 'http://localhost:4000/api',
    }).baseURL).toBe('http://localhost:4000/api');
  });
});
