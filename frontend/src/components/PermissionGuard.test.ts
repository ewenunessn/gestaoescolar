import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'frontend/src/components/PermissionGuard.tsx'), 'utf8');

describe('PermissionGuard', () => {
  it('renders an explicit loading state while permissions are being checked', () => {
    expect(source).toContain('CircularProgress');
    expect(source).toContain('Verificando permissões...');
    expect(source).not.toContain('if (loading) return null');
  });
});
