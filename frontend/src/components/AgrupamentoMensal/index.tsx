import React, { useState } from 'react';
import { Box } from '@mui/material';
import { ListaAgrupamentos } from './ListaAgrupamentos';
import { DetalhesAgrupamento } from './DetalhesAgrupamento';
import { AgrupamentoMensal } from '../../types/agrupamentoMensal';

export const AgrupamentoMensalModule: React.FC = () => {
  const [agrupamentoSelecionado, setAgrupamentoSelecionado] = useState<AgrupamentoMensal | null>(null);

  const handleSelectAgrupamento = (agrupamento: AgrupamentoMensal) => {
    setAgrupamentoSelecionado(agrupamento);
  };

  const handleVoltar = () => {
    setAgrupamentoSelecionado(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      {agrupamentoSelecionado ? (
        <DetalhesAgrupamento
          agrupamento={agrupamentoSelecionado}
          onVoltar={handleVoltar}
        />
      ) : (
        <ListaAgrupamentos
          onSelectAgrupamento={handleSelectAgrupamento}
        />
      )}
    </Box>
  );
};

export default AgrupamentoMensalModule;