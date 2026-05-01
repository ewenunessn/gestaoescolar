import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('cardapio PDF product loading', () => {
  it('loads detailed report products through the batch endpoint', () => {
    const source = read('src/utils/cardapioPdfGenerators.ts');
    const pageSource = read('src/modules/cardapios/pages/CardapioCalendario.tsx');

    expect(source).toContain('/refeicoes/produtos/batch');
    expect(source).not.toContain('/refeicoes/${ref.refeicao_id}/produtos');
    expect(pageSource).toContain('/refeicoes/produtos/batch');
    expect(pageSource).not.toContain('/refeicoes/${ref.refeicao_id}/produtos');
  });
});
