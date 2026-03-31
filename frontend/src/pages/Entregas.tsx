import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { usePageTitle } from '../contexts/PageTitleContext';
import { EscolasEntregaList } from '../modules/entregas/components/EscolasEntregaList';
import { ItensEntregaList } from '../modules/entregas/components/ItensEntregaList';
import { EscolaEntrega } from '../modules/entregas/types';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';

const Entregas: React.FC = () => {
  const { setPageTitle, setBackPath } = usePageTitle();
  const [escolaSelecionada, setEscolaSelecionada] = useState<EscolaEntrega | null>(null);
  const [filtros, setFiltros] = useState<{
    guiaId?: number;
    rotaId?: number;
    dataInicio?: string;
    dataFim?: string;
    somentePendentes?: boolean;
  }>({
    somentePendentes: false,
    dataFim: new Date().toISOString().split('T')[0]
  });

  // Definir título da página
  useEffect(() => {
    if (escolaSelecionada) {
      setPageTitle(`Entregas - ${escolaSelecionada.nome}`);
      setBackPath('/entregas');
    } else {
      setPageTitle('Entregas');
      setBackPath('');
    }
    return () => {
      setPageTitle('');
      setBackPath('');
    };
  }, [setPageTitle, setBackPath, escolaSelecionada]);

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
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageContainer fullHeight>
        <PageHeader title="Entregas" />
        
        {!escolaSelecionada ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <EscolasEntregaList 
              onEscolaSelect={handleEscolaSelect}
              filtros={filtros}
              onFiltroChange={handleFiltroChange}
            />
          </Box>
        ) : (
          <ItensEntregaList 
            escola={escolaSelecionada} 
            onVoltar={handleVoltar}
            filtros={filtros}
          />
        )}
      </PageContainer>
    </Box>
  );
};

export default Entregas;
