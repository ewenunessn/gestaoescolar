import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  LinearProgress,
  Typography,
  Chip,
  Stack
} from '@mui/material';
import { CheckCircle, Warning, Error, Info } from '@mui/icons-material';

interface RecebimentoFeedbackProps {
  tipo: 'success' | 'warning' | 'error' | 'info';
  titulo: string;
  mensagem: string;
  detalhes?: string[];
  progresso?: number;
  mostrarProgresso?: boolean;
}

export const RecebimentoFeedback: React.FC<RecebimentoFeedbackProps> = ({
  tipo,
  titulo,
  mensagem,
  detalhes,
  progresso,
  mostrarProgresso = false
}) => {
  const getIcon = () => {
    switch (tipo) {
      case 'success': return <CheckCircle />;
      case 'warning': return <Warning />;
      case 'error': return <Error />;
      case 'info': return <Info />;
      default: return <Info />;
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Alert 
        severity={tipo} 
        icon={getIcon()}
        sx={{ mb: mostrarProgresso ? 1 : 0 }}
      >
        <AlertTitle>{titulo}</AlertTitle>
        <Typography variant="body2" sx={{ mb: detalhes ? 1 : 0 }}>
          {mensagem}
        </Typography>
        
        {detalhes && detalhes.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
            {detalhes.map((detalhe, index) => (
              <Chip 
                key={index}
                label={detalhe}
                size="small"
                variant="outlined"
                color={tipo === 'error' ? 'error' : 'default'}
              />
            ))}
          </Stack>
        )}
      </Alert>
      
      {mostrarProgresso && progresso !== undefined && (
        <Box sx={{ width: '100%' }}>
          <LinearProgress 
            variant="determinate" 
            value={progresso} 
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {Math.round(progresso)}% concluído
          </Typography>
        </Box>
      )}
    </Box>
  );
};