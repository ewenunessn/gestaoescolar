import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('portal escola navigation contract', () => {
  it('exposes all primary portal pages in the school user menu', () => {
    const layout = read('frontend/src/components/layout/AppShellLayout.tsx');

    expect(layout).toContain('path: "/portal-escola"');
    expect(layout).toContain('path: "/portal-escola/cardapio"');
    expect(layout).toContain('path: "/portal-escola/solicitacoes"');
    expect(layout).toContain('path: "/portal-escola/comprovantes"');
    expect(layout).toContain('path: "/portal-escola/alunos"');
  });

  it('does not route portal breadcrumbs back to the central dashboard', () => {
    const files = [
      'frontend/src/modules/portal-escola/pages/PortalEscolaHome.tsx',
      'frontend/src/modules/portal-escola/pages/CardapioPage.tsx',
      'frontend/src/modules/portal-escola/pages/SolicitacoesPage.tsx',
      'frontend/src/modules/portal-escola/pages/ComprovantesPage.tsx',
      'frontend/src/modules/portal-escola/pages/AlunosPage.tsx',
    ];

    for (const file of files) {
      expect(read(file), file).not.toContain("path: '/dashboard'");
    }
  });
});
