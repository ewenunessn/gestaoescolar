import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  Fade,
} from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  backdrop?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message = 'Carregando...',
  backdrop = true,
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
      }}
    >
      <CircularProgress size={48} thickness={4} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );

  if (backdrop) {
    return (
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'rgba(255, 255, 255, 0.8)',
        }}
        open={open}
      >
        <Fade in={open}>
          <Box sx={{ color: 'text.primary' }}>
            {content}
          </Box>
        </Fade>
      </Backdrop>
    );
  }

  return (
    <Fade in={open}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 1000,
        }}
      >
        {content}
      </Box>
    </Fade>
  );
};

export default LoadingOverlay;