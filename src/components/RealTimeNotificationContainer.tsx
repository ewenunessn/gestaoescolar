import React from 'react';
import {
  Box,
  Snackbar,
  Alert,
  AlertTitle,
  Button,
  Typography,
  Slide,
  SlideProps,
} from '@mui/material';
import {
  Update,
  Refresh,
  Close,
  CheckCircle,
  Warning,
  Error,
  Info,
} from '@mui/icons-material';
import { useRealTimeNotifications } from '../hooks/useRealTimeNotifications';

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

interface RealTimeNotificationContainerProps {
  maxNotifications?: number;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

export const RealTimeNotificationContainer: React.FC<RealTimeNotificationContainerProps> = ({
  maxNotifications = 3,
  position = { vertical: 'bottom', horizontal: 'center' }
}) => {
  const { notifications, removeNotification } = useRealTimeNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle />;
      case 'warning': return <Warning />;
      case 'error': return <Error />;
      default: return <Update />;
    }
  };

  const getSeverity = (type: string): 'success' | 'info' | 'warning' | 'error' => {
    switch (type) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'success': return '#059669';
      case 'warning': return '#d97706';
      case 'error': return '#dc2626';
      default: return '#2563eb';
    }
  };

  // Mostrar apenas as últimas notificações
  const visibleNotifications = notifications.slice(-maxNotifications);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: position.vertical === 'bottom' ? 20 : 'auto',
        top: position.vertical === 'top' ? 20 : 'auto',
        left: position.horizontal === 'left' ? 20 : 'auto',
        right: position.horizontal === 'right' ? 20 : 'auto',
        transform: position.horizontal === 'center' ? 'translateX(-50%)' : 'none',
        left: position.horizontal === 'center' ? '50%' : 'auto',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: 400,
      }}
    >
      {visibleNotifications.map((notification, index) => (
        <Alert
          key={notification.id}
          severity={getSeverity(notification.type)}
          variant="filled"
          sx={{
            minWidth: 350,
            bgcolor: getColor(notification.type),
            color: 'white',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            transform: `translateY(${index * -5}px)`,
            opacity: 1 - (index * 0.1),
            '& .MuiAlert-icon': {
              color: 'white',
            },
            '& .MuiAlert-action': {
              color: 'white',
            },
          }}
          icon={getIcon(notification.type)}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {notification.onAction && notification.actionLabel && (
                <Button
                  size="small"
                  startIcon={<Refresh />}
                  onClick={() => {
                    notification.onAction?.();
                    removeNotification(notification.id);
                  }}
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
                  {notification.actionLabel}
                </Button>
              )}
              <Button
                size="small"
                onClick={() => removeNotification(notification.id)}
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
            {notification.type === 'info' && 'Dados Atualizados'}
            {notification.type === 'success' && 'Sucesso'}
            {notification.type === 'warning' && 'Atenção'}
            {notification.type === 'error' && 'Erro'}
          </AlertTitle>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            {notification.message}
          </Typography>
        </Alert>
      ))}
    </Box>
  );
};

export default RealTimeNotificationContainer;