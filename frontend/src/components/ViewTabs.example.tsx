import React, { useState } from 'react';
import { Box } from '@mui/material';
import ViewTabs from './ViewTabs';

/**
 * Exemplo de uso do componente ViewTabs
 * 
 * Este componente cria abas estilizadas para alternar entre diferentes visualizações.
 * Design inspirado em tabs modernas com fundo branco para a aba selecionada.
 */

const ViewTabsExample: React.FC = () => {
  const [view, setView] = useState('consolidado');

  return (
    <Box sx={{ p: 3 }}>
      <ViewTabs
        value={view}
        onChange={setView}
        tabs={[
          { value: 'consolidado', label: 'Consolidado' },
          { value: 'detalhado', label: 'Detalhado' },
          { value: 'grafico', label: 'Gráfico' },
        ]}
      />

      <Box sx={{ mt: 3 }}>
        {view === 'consolidado' && <div>Conteúdo Consolidado</div>}
        {view === 'detalhado' && <div>Conteúdo Detalhado</div>}
        {view === 'grafico' && <div>Conteúdo Gráfico</div>}
      </Box>
    </Box>
  );
};

export default ViewTabsExample;

/**
 * CARACTERÍSTICAS:
 * 
 * - Design limpo com bordas arredondadas
 * - Aba selecionada: fundo branco (#ffffff) com borda (#dee2e6)
 * - Abas não selecionadas: fundo transparente
 * - Hover: fundo cinza claro (#f8f9fa)
 * - Texto: cinza (#6c757d) quando não selecionado, preto (#212529) quando selecionado
 * - Sem indicador de linha inferior (MUI padrão)
 * - Espaçamento entre abas: 8px (gap: 1)
 * - Padding horizontal: 24px (px: 3)
 * - Altura mínima: 42px
 * - Fonte: 0.875rem (14px)
 * - Peso da fonte: 500 (medium)
 * - Sem transformação de texto (mantém capitalização original)
 * 
 * USO RECOMENDADO:
 * 
 * - Alternar entre diferentes visualizações de dados (tabela, gráfico, etc.)
 * - Alternar entre diferentes agrupamentos (por escola, por produto, etc.)
 * - Alternar entre diferentes períodos (mensal, anual, etc.)
 * - Qualquer situação onde você precisa de abas estilizadas
 */
