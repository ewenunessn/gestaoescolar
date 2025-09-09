import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Button,
  Box,
  Typography,
  Slide,
  SlideProps,
} from '@mui/material';
import {
  Update,
  Refresh,
  Close,
} from '@mui/icons-material';

interface RealTimeNotificationProps {
  hasNewData: boolean;
  onRefresh: () => void;
  onDismiss: () => void;
  message?: string;
  autoHideDuration?: number;
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const RealTimeNotification: React.FC<RealTimeNotificationProps> = ({
  hasNewData,
  onRefresh,
  onDismiss,
  message = "Novos dados disponíveis",
  autoHideDuration = null, // null = não esconde automaticamente
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(hasNewData);
  }, [hasNewData]);

  const handleClose = () => {
    setOpen(false);
    onDismiss();
  };

  const handleRefresh = () => {
    onRefresh();
    handleClose();
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      TransitionComponent={SlideTransition}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        '& .MuiSnackbarContent-root': {
          padding: 0,
        },
      }}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{
          minWidth: 350,
          bgcolor: '#2563eb',
          color: 'white',
          '& .MuiAlert-icon': {
            color: 'white',
          },
          '& .MuiAlert-action': {
            color: 'white',
          },
        }}
        icon={<Update />}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              sx={{
                color: 'white',
                borderColor: 'white',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'white',
                },
              }}
              variant="outlined"
            >
              Atualizar
            </Button>
            <Button
              size="small"
              onClick={handleClose}
              sx={{
                color: 'white',
                minWidth: 'auto',
                p: 0.5,
              }}
            >
              <Close fontSize="small" />
            </Button>
          </Box>
        }
      >
        <AlertTitle sx={{ color: 'white', fontWeight: 600 }}>
          Dados Atualizados
        </AlertTitle>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          {message}
        </Typography>
      </Alert>
    </Snackbar>
  );
};

export default RealTimeNotification;