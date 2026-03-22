import React, { useState } from 'react';
import {
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Tooltip,
  Alert,
  Snackbar,
  Backdrop,
} from '@mui/material';
import { CalendarToday, Public, Person } from '@mui/icons-material';
import { usePeriodos, usePeriodoAtivo, useSelecionarPeriodo } from '../hooks/queries/usePeriodosQueries';

export const SeletorPeriodo: React.FC = () => {
  const { data: periodos, isLoading: loadingPeriodos } = usePeriodos();
  const { data: periodoAtivo, isLoading: loadingAtivo } = usePeriodoAtivo();
  const selecionarPeriodo = useSelecionarPeriodo();
  const [erro, setErro] = useState<string | null>(null);

  const handleChange = (event: any) => {
    const periodoId = event.target.value;
    setErro(null);
    
    selecionarPeriodo.mutate(periodoId, {
      onError: (error: any) => {
        console.error('Erro ao selecionar período:', error);
        setErro(error?.response?.data?.message || 'Erro ao selecionar período');
      },
    });
  };

  const handleCloseErro = () => {
    setErro(null);
  };

  if (loadingPeriodos || loadingAtivo) {
    return <CircularProgress size={20} />;
  }

  if (!periodos?.length || !periodoAtivo) {
    return (
      <Tooltip title="Nenhum período cadastrado. Acesse Configurações > Períodos.">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.5, cursor: 'default' }}>
          <CalendarToday fontSize="small" />
          <Typography variant="caption" color="text.secondary">Sem período</Typography>
        </Box>
      </Tooltip>
    );
  }

  const periodoGlobalAtivo = periodos.find(p => p.ativo);
  const isUsuarioPeriodo = periodoAtivo.id !== periodoGlobalAtivo?.id;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={isUsuarioPeriodo ? 'Seu período selecionado' : 'Período ativo global'}>
          {isUsuarioPeriodo ? <Person fontSize="small" /> : <Public fontSize="small" />}
        </Tooltip>
        
        <Select
          value={periodoAtivo.id}
          onChange={handleChange}
          size="small"
          disabled={selecionarPeriodo.isPending}
          sx={{
            minWidth: 120,
            '& .MuiSelect-select': {
              py: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            },
          }}
        >
          {periodos.map((periodo) => (
            <MenuItem key={periodo.id} value={periodo.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2">{periodo.ano}</Typography>
                {periodo.ativo && (
                  <Chip label="Ativo" size="small" color="primary" sx={{ height: 20 }} />
                )}
                {periodo.fechado && (
                  <Chip label="Fechado" size="small" color="default" sx={{ height: 20 }} />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Backdrop com loading durante a troca de período */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={selecionarPeriodo.isPending}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Alterando período letivo...
          </Typography>
        </Box>
      </Backdrop>

      <Snackbar
        open={!!erro}
        autoHideDuration={6000}
        onClose={handleCloseErro}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseErro} severity="error" sx={{ width: '100%' }}>
          {erro}
        </Alert>
      </Snackbar>
    </>
  );
};
