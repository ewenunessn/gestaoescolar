import { render } from '@testing-library/react';
import { Tooltip } from '@mui/material';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StatusIndicator from './StatusIndicator';

describe('StatusIndicator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pode ser usado como filho direto do Tooltip', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <Tooltip title="Ativa">
        <StatusIndicator status="ativo" text="Ativa" size="small" />
      </Tooltip>,
    );

    expect(consoleError).not.toHaveBeenCalled();
  });
});
