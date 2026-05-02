import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('backend batching contracts', () => {
  it('creates food solicitation items without product or item insert loops', () => {
    const source = read('backend/src/modules/solicitacoes/controllers/solicitacoesAlimentosController.ts');

    assert.match(source, /WHERE p\.id = ANY\(\$1::int\[\]\)/);
    assert.match(source, /FROM UNNEST\(\$2::jsonb\[\]\)/);
    assert.doesNotMatch(source, /const produto = await buscarProdutoParaSolicitacao/);
    assert.doesNotMatch(source, /for \(const item of itensNormalizados\)/);
  });

  it('duplicates meal modality settings without per-product queries', () => {
    const source = read('backend/src/modules/cardapios/controllers/refeicaoController.ts');

    assert.match(source, /WITH produtos_originais/);
    assert.doesNotMatch(source, /for \(const produtoNovo of produtosCopiados\.rows\)/);
    assert.doesNotMatch(source, /produtoOriginal = await client\.query/);
  });

  it('saves delivery schedule schools with batched inserts', () => {
    const source = read('backend/src/modules/compras/controllers/programacaoEntregaController.ts');

    assert.match(source, /FROM UNNEST\(\$2::int\[\], \$3::numeric\[\]\)/);
    assert.doesNotMatch(source, /for \(const esc of prog\.escolas\)/);
  });

  it('stores role and user permissions with batched inserts', () => {
    const source = read('backend/src/modules/usuarios/controllers/adminUsuariosController.ts');

    assert.match(source, /INSERT INTO funcao_permissoes[\s\S]*FROM UNNEST\(\$2::int\[\], \$3::int\[\]\)/);
    assert.match(source, /INSERT INTO usuario_permissoes[\s\S]*FROM UNNEST\(\$2::int\[\], \$3::int\[\]\)/);
    assert.doesNotMatch(source, /for \(const perm of permissoes\)/);
    assert.doesNotMatch(source, /for \(const perm of \(permissoes \|\| \[\]\)\)/);
  });
});
