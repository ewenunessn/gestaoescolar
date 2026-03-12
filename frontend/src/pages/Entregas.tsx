import React, { useState, useEffect } from 'react';
import { Box, Typography, Container } from '@mui/material';
import { LocalShipping as LocalShippingIcon } from '@mui/icons-material';
import { usePageTitle } from '../contexts/PageTitleContext';
import { EscolasEntregaList } from '../modules/entregas/components/EscolasEntregaList';
import { ItensEntregaList } from '../modules/entregas/components/ItensEntregaList';
import { FiltrosEntrega } from '../modules/entregas/components/FiltrosEntrega';
import { EscolaEntrega } from '../modules/entregas/types';
import PageBreadcrumbs from '../components/PageBreadcrumbs';

const Entregas: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const [escolaSelecionada, setEscolaSelecionada] = useState<EscolaEntrega | null>(null);
  const [filtros, setFiltros] = useState<{
    guiaId?: number;
    rotaId?: number;
    dataInicio?: string;
    dataFim?: string;
    somentePendentes?: boolean;
  }>({
    somentePendentes: true,
    dataFim: new Date().toISOString().split('T')[0]
  });

  // Definir título da página
  useEffect(() => {
    setPageTitle('Entregas');
    return () => setPageTitle('');
  }, [setPageTitle]);

  const handleEscolaSelect = (escola: EscolaEntrega) => {
    setEscolaSelecionada(escola);
  };

  const handleVoltar = () => {
    setEscolaSelecionada(null);
  };

  const handleFiltroChange = (novosFiltros: {
    guiaId?: number;
    rotaId?: number;
    dataInicio?: string;
    dataFim?: string;
    somentePendentes?: boolean;
  }) => {
    setFiltros(novosFiltros);
    // Reset escola selecionada quando filtros mudarem
    setEscolaSelecionada(null);
  };

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        <PageBreadcrumbs 
          items={[
            { label: 'Entregas', icon: <LocalShippingIcon fontSize="small" /> }
          ]}
          showBackButton={false}
        />
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
