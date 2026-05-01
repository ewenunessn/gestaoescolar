import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('mobile production safety', () => {
  it('does not log login responses or full axios errors in the delivery app', () => {
    const auth = read('apps/entregador-native/src/api/auth.ts');
    const client = read('apps/entregador-native/src/api/client.ts');

    expect(auth).not.toContain('Resposta do login');
    expect(auth).not.toContain('console.log');
    expect(client).not.toContain('Erro completo');
    expect(client).not.toContain('Data completa');
  });

  it('does not accept legacy mock-token authentication in the school stock app', () => {
    const source = read('apps/estoque-escolar-mobile/src/services/api.ts');

    expect(source).toContain('Login por email e senha foi descontinuado');
    expect(source).not.toContain('admin123');
    expect(source).not.toContain('123456');
    expect(source).not.toContain('const token = `mock_token_');
  });

  it('does not log request bodies or full API responses in the school stock app', () => {
    const source = read('apps/estoque-escolar-mobile/src/services/api.ts');

    expect(source).not.toContain('options.body');
    expect(source).not.toContain('API Response:`, result');
  });
});
