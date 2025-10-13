import React, { useState } from 'react';
import { Box, Typography, Container } from '@mui/material';
import { EscolasEntregaList } from '../modules/entregas/components/EscolasEntregaList';
import { ItensEntregaList } from '../modules/entregas/components/ItensEntregaList';
import { EscolaEntrega } from '../modules/entregas/types';

const Entregas: React.FC = () => {
  const [escolaSelecionada, setEscolaSelecionada] = useState<EscolaEntrega | null>(null);

  const handleEscolaSelect = (escola: EscolaEntrega) => {
    setEscolaSelecionada(escola);
  };

  const handleVoltar = () => {
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
              Gerencie as entregas dos itens das guias para as escolas
            </Typography>
            <EscolasEntregaList onEscolaSelect={handleEscolaSelect} />
          </>
        ) : (
          <ItensEntregaList escola={escolaSelecionada} onVoltar={handleVoltar} />
        )}
      </Box>
    </Container>
  );
};

export default Entregas;