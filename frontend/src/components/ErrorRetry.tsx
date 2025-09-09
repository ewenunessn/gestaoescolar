import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Refresh,
  ErrorOutline,
  WifiOff,
  Warning,
} from '@mui/icons-material';

interface ErrorRetryProps {
  error: string;
  onRetry: () => void;
  loading?: boolean;
  variant?: 'network' | 'server' | 'validation' | 'generic';
  showDetails?: boolean;
}

const ErrorRetry: React.FC<ErrorRetryProps> = ({
  error,
  onRetry,
  loading = false,
  variant = 'generic',
  showDetails = false,
}) => {
  const getErrorConfig = () => {
    switch (variant) {
      case 'network':
        return {
          icon: <WifiOff sx={{ fontSize: 48, color: 'warning.main' }} />,
          title: 'Problema de Conexão',
          description: 'Verifique sua conexão com a internet e tente novamente.',
          severity: 'warning' as const,
        };
      case 'server':
        return {
          icon: <ErrorOutline sx={{ fontSize: 48, color: 'error.main' }} />,
          title: 'Erro do Servidor',
          description: 'Ocorreu um problema no servidor. Tente novamente em alguns instantes.',
          severity: 'error' as const,
        };
      case 'validation':
        return {
          icon: <Warning sx={{ fontSize: 48, color: 'warning.main' }} />,
          title: 'Dados Inválidos',
          description: 'Verifique os dados informados e tente novamente.',
          severity: 'warning' as const,
        };
      default:
        return {
          icon: <ErrorOutline sx={{ fontSize: 48, color: 'error.main' }} />,
          title: 'Erro Inesperado',
          description: 'Ocorreu um erro inesperado. Tente novamente.',
          severity: 'error' as const,
        };
    }
  };

  const config = getErrorConfig();

  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Paper sx={{ p: 4, maxWidth: 500, mx: 'auto' }}>
        <Alert severity={config.severity} sx={{ mb: 3 }}>
          <AlertTitle>{config.title}</AlertTitle>
          {config.description}
        </Alert>

        <Box sx={{ mb: 3 }}>
          {config.icon}
        </Box>

        {showDetails && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 3,
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              textAlign: 'left',
              wordBreak: 'break-word',
            }}
          >
            {error}
          </Typography>
        )}

        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={onRetry}
          disabled={loading}
          size="large"
        >
          {loading ? 'Tentando...' : 'Tentar Novamente'}
        </Button>
      </Paper>
    </Box>
  );
};

export default ErrorRetry;