import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('StateFeedback production states', () => {
  it('provides shared loading, error, and empty state components', () => {
    const source = read('frontend/src/components/StateFeedback.tsx');

    expect(source).toContain('export function LoadingState');
    expect(source).toContain('export function ErrorState');
    expect(source).toContain('export function EmptyState');
    expect(source).toContain('actionLabel');
  });

  it('is used by the critical frontend surfaces', () => {
    const files = [
      'frontend/src/modules/portal-escola/pages/PortalEscolaHome.tsx',
      'frontend/src/modules/portal-escola/pages/CardapioPage.tsx',
      'frontend/src/modules/portal-escola/pages/SolicitacoesPage.tsx',
      'frontend/src/modules/portal-escola/pages/ComprovantesPage.tsx',
      'frontend/src/modules/portal-escola/pages/AlunosPage.tsx',
      'frontend/src/modules/estoque/pages/EstoqueCentral.tsx',
      'frontend/src/modules/abastecimento/pages/Abastecimento.tsx',
      'frontend/src/modules/entregas/components/EscolasEntregaList.tsx',
    ];

    for (const file of files) {
      expect(read(file), file).toContain('StateFeedback');
    }
  });
});
