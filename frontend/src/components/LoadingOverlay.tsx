import React from 'react';
import { Backdrop, CircularProgress, Box, Typography } from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  progress?: number;
}

/**
 * Overlay de loading que bloqueia toda a interface
 * Use para ações demoradas ou críticas
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message = 'Processando...',
  progress,
}) => {
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.modal + 1,
        flexDirection: 'column',
        gap: 2,
      }}
      open={open}
    >
      <CircularProgress color="inherit" size={60} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6">{message}</Typography>
        {progress !== undefined && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {progress}%
          </Typography>
        )}
      </Box>
    </Backdrop>
  );
};
