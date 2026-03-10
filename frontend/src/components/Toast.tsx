import React, { useEffect } from 'react';
import { Alert, Box, Slide } from '@mui/material';

interface ToastProps {
  message: string;
  severity?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  severity = 'success', 
  onClose, 
  duration = 3000 
}) => {
  const [show, setShow] = React.useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300); // Aguarda animação terminar
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <Slide direction="down" in={show} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: 70,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 9999,
          pointerEvents: 'none', // Permite clicar através do Box
        }}
      >
        <Alert 
          severity={severity} 
          onClose={() => {
            setShow(false);
            setTimeout(onClose, 300);
          }}
          sx={{
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            minWidth: 300,
            maxWidth: 600,
            pointerEvents: 'auto', // Permite clicar no Alert
          }}
        >
          {message}
        </Alert>
      </Box>
    </Slide>
  );
};

export default Toast;
