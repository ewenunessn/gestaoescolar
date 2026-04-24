import React, { useState } from 'react';
import {
  alpha,
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
  useTheme,
} from '@mui/material';
import { CalendarToday, Public, Person } from '@mui/icons-material';
import { usePeriodos, usePeriodoAtivo, useSelecionarPeriodo } from '../hooks/queries/usePeriodosQueries';

export const SeletorPeriodo: React.FC = () => {
  const theme = useTheme();
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
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.75 }}>
        <Tooltip title={isUsuarioPeriodo ? 'Seu período selecionado' : 'Período ativo global'}>
          <Box
            sx={{
              width: 34,
              height: 34,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1,
              color: 'text.secondary',
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.02 : 0.04),
            }}
          >
            {isUsuarioPeriodo ? <Person fontSize="small" /> : <Public fontSize="small" />}
          </Box>
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
          sx={{
            width: 198,
            '& .MuiAutocomplete-endAdornment': {
              right: 7,
              top: '50%',
              transform: 'translateY(-50%)',
            },
            '& .MuiAutocomplete-popupIndicator': {
              width: 24,
              height: 24,
              mr: 0.25,
              color: 'text.secondary',
              border: 0,
              bgcolor: 'transparent',
              '&:hover': {
                bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.04 : 0.08),
              },
            },
          }}
          componentsProps={{
            paper: {
              sx: {
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1.25,
                boxShadow: theme.palette.mode === 'light' ? '0 14px 28px rgba(31,36,48,0.12)' : '0 16px 34px rgba(0,0,0,0.32)',
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
                  bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'light' ? 0.82 : 0.72),
                  borderRadius: '8px',
                  color: 'text.primary',
                  height: 36,
                  pr: '32px !important',
                  '& fieldset': { borderColor: theme.palette.divider },
                  '&:hover fieldset': { borderColor: alpha(theme.palette.text.primary, 0.22) },
                  '&.Mui-focused fieldset': { borderColor: alpha(theme.palette.primary.main, 0.48) },
                },
                '& .MuiAutocomplete-popupIndicator .MuiSvgIcon-root': { fontSize: 18 },
                '& input::placeholder': { color: 'text.secondary', opacity: 1 },
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
              color: 'text.primary',
              '&:hover': { bgcolor: 'action.hover !important' },
              '&.Mui-focused': { bgcolor: 'action.hover !important' },
            }}>
              <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.8rem' }}>
                {periodo.descricao || periodo.ano}
              </Typography>
              {periodo.ativo && (
                <Chip label="Ativo" size="small" color="primary" sx={{ height: 16, fontSize: '0.65rem', ml: 'auto' }} />
              )}
              {periodo.fechado && (
                <Chip label="Fechado" size="small" sx={{ height: 16, fontSize: '0.65rem', ml: 'auto', color: 'text.secondary' }} />
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
