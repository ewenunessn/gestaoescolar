import React, { useState } from 'react';
import { Box, Typography, Container } from '@mui/material';
import { EscolasEntregaList } from '../modules/entregas/components/EscolasEntregaList';
import { ItensEntregaList } from '../modules/entregas/components/ItensEntregaList';
import { FiltrosEntrega } from '../modules/entregas/components/FiltrosEntrega';
import { EscolaEntrega } from '../modules/entregas/types';

const Entregas: React.FC = () => {
  const [escolaSelecionada, setEscolaSelecionada] = useState<EscolaEntrega | null>(null);
  const [filtros, setFiltros] = useState<{ guiaId?: number; rotaId?: number }>({});

  const handleEscolaSelect = (escola: EscolaEntrega) => {
    setEscolaSelecionada(escola);
  };

  const handleVoltar = () => {
    setEscolaSelecionada(null);
  };

  const handleFiltroChange = (guiaId?: number, rotaId?: number) => {
    setFiltros({ guiaId, rotaId });
    // Reset escola selecionada quando filtros mudarem
    setEscolaSelecionada(null);
  };

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {!escolaSelecionada ? (
          <>
            <Typography variant="h4" component="h1" gutterBottom>
              Módulo de Entregas
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Gerencie as entregas dos itens das guias para as escolas por rota
            </Typography>
            
            <FiltrosEntrega 
              onFiltroChange={handleFiltroChange}
              filtroAtivo={filtros}
            />
            
            <EscolasEntregaList 
              onEscolaSelect={handleEscolaSelect}
              filtros={filtros}
            />
          </>
        ) : (
          <ItensEntregaList 
            escola={escolaSelecionada} 
            onVoltar={handleVoltar}
            filtros={filtros}
          />
        )}
      </Box>
    </Container>
  );
};

export default Entregas;