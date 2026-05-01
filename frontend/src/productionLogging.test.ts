import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('frontend production logging safety', () => {
  it('does not log full API payloads in the shared API client', () => {
    const source = read('frontend/src/services/api.ts');

    expect(source).not.toContain('data: config.data');
    expect(source).not.toContain('params: config.params');
    expect(source).not.toContain('data: response.data');
    expect(source).not.toContain('data: error.response?.data');
  });

  it('does not log full authentication errors from login flows', () => {
    const auth = read('frontend/src/services/auth.ts');
    const loginPage = read('frontend/src/pages/Login.tsx');

    expect(auth).not.toContain('Login falhou');
    expect(loginPage).not.toContain('[LOGIN] Erro');
  });

  it('only emits API errors when debug logging is enabled', () => {
    const source = read('frontend/src/config/api.ts');

    expect(source).toContain('export const apiError');
    expect(source).toContain('if (apiConfig.debug)');
  });
});
