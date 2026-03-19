import React, { useEffect, useMemo, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import EscolasDataGrid from '../components/EscolasDataGrid';
import { Alert } from '@mui/material';
import { useEscolas } from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { LoadingScreen } from '../components';
import { Escola } from '../types/escola';

const EscolasPage = () => {
  const toast = useToast();

  // React Query hooks
  const { 
    data: escolas = [], 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useEscolas();
  
  // Estados locais
  const error = queryError?.message || null;

  // Função para refresh manual
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Função para visualizar escola (temporariamente desabilitada)
  const handleViewEscola = useCallback((escola: Escola) => {
    console.log('Visualizar escola:', escola);
    // navigate(`/escolas/${escola.id}`);
  }, []);

  // Estatísticas para o header
  const statusLegend = useMemo(() => {
    const ativas = escolas.filter(e => e.ativo).length;
    const inativas = escolas.filter(e => !e.ativo).length;
    
    return [
      { status: 'ativo', label: 'Ativas', count: ativas },
      { status: 'inativo', label: 'Inativas', count: inativas },
    ];
  }, [escolas]);

  // Verificar mensagem de sucesso do location state (temporariamente desabilitado)
  useEffect(() => {
    // const state = location.state as { successMessage?: string } | undefined;
    // if (state?.successMessage) {
    //   toast.success(state.successMessage);
    //   navigate(location.pathname, { replace: true });
    // }
  }, [toast]);

  if (loading && escolas.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Escolas" 
        totalCount={escolas.length}
        statusLegend={statusLegend}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <EscolasDataGrid
        escolas={escolas}
        loading={loading}
        onRefresh={handleRefresh}
        onViewEscola={handleViewEscola}
      />
    </PageContainer>
  );
};

export default EscolasPage;