import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Tooltip,
  Alert,
  Snackbar,
  Backdrop,
  Autocomplete,
  TextField,
} from '@mui/material';
import { CalendarToday, Public, Person } from '@mui/icons-material';
import { usePeriodos, usePeriodoAtivo, useSelecionarPeriodo } from '../hooks/queries/usePeriodosQueries';

export const SeletorPeriodo: React.FC = () => {
  const { data: periodos, isLoading: loadingPeriodos } = usePeriodos();
  const { data: periodoAtivo, isLoading: loadingAtivo } = usePeriodoAtivo();
  const selecionarPeriodo = useSelecionarPeriodo();
  const [erro, setErro] = useState<string | null>(null);

  const handleChange = (_: any, periodo: any) => {
    if (!periodo) return;
    setErro(null);
    selecionarPeriodo.mutate(periodo.id, {
      onError: (error: any) => {
        setErro(error?.response?.data?.message || 'Erro ao selecionar período');
      },
    });
  };

  const handleCloseErro = () => setErro(null);

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
  const periodoSelecionado = periodos.find(p => p.id === periodoAtivo.id) ?? null;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={isUsuarioPeriodo ? 'Seu período selecionado' : 'Período ativo global'}>
          {isUsuarioPeriodo ? <Person fontSize="small" sx={{ color: 'text.secondary' }} /> : <Public fontSize="small" sx={{ color: 'text.secondary' }} />}
        </Tooltip>

        <Autocomplete
          value={periodoSelecionado ?? undefined}
          onChange={handleChange}
          options={periodos}
          getOptionLabel={(p) => `${p.ano}${p.descricao ? ` - ${p.descricao}` : ''}`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          disabled={selecionarPeriodo.isPending}
          disableClearable
          size="small"
          sx={{ minWidth: 180 }}
          componentsProps={{
            paper: {
              sx: {
                bgcolor: '#21262d',
                border: '1px solid #30363d',
                borderRadius: '10px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                mt: 0.5,
              }
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Buscar período..."
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.8rem',
                  bgcolor: '#21262d',
                  borderRadius: '8px',
                  color: '#e6edf3',
                  '& fieldset': { borderColor: '#30363d' },
                  '&:hover fieldset': { borderColor: '#484f58' },
                  '&.Mui-focused fieldset': { borderColor: '#58a6ff' },
                },
                '& .MuiSvgIcon-root': { color: '#8b949e' },
                '& input::placeholder': { color: '#6e7681', opacity: 1 },
              }}
            />
          )}
          renderOption={(props, periodo) => (
            <Box component="li" {...props} sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              fontSize: '0.8rem',
              color: '#e6edf3',
              '&:hover': { bgcolor: '#2d333b !important' },
              '&.Mui-focused': { bgcolor: '#2d333b !important' },
            }}>
              <Typography variant="body2" sx={{ color: '#e6edf3', fontSize: '0.8rem' }}>
                {periodo.descricao || periodo.ano}
              </Typography>
              {periodo.ativo && (
                <Chip label="Ativo" size="small" sx={{ height: 16, fontSize: '0.65rem', ml: 'auto', bgcolor: '#1f6feb', color: '#fff' }} />
              )}
              {periodo.fechado && (
                <Chip label="Fechado" size="small" sx={{ height: 16, fontSize: '0.65rem', ml: 'auto', bgcolor: '#30363d', color: '#8b949e' }} />
              )}
            </Box>
          )}
        />
      </Box>

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
