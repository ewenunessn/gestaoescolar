import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  IconButton,
  Button,
  Slide,
  Fade,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  Close,
} from '@mui/icons-material';
import { Notification, NotificationType, useNotification } from '../context/NotificationContext';

const getNotificationConfig = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return {
        icon: <CheckCircle />,
        color: '#059669',
        bgColor: '#dcfce7',
        borderColor: '#10b981',
      };
    case 'error':
      return {
        icon: <Error />,
        color: '#dc2626',
        bgColor: '#fee2e2',
        borderColor: '#ef4444',
      };
    case 'warning':
      return {
        icon: <Warning />,
        color: '#d97706',
        bgColor: '#fef3c7',
        borderColor: '#f59e0b',
      };
    case 'info':
      return {
        icon: <Info />,
        color: '#2563eb',
        bgColor: '#dbeafe',
        borderColor: '#3b82f6',
      };
    default:
      return {
        icon: <Info />,
        color: '#6b7280',
        bgColor: '#f3f4f6',
        borderColor: '#9ca3af',
      };
  }
};

interface ToastItemProps {
  notification: Notification;
}

const ToastItem: React.FC<ToastItemProps> = ({ notification }) => {
  const { removeNotification } = useNotification();
  const [visible, setVisible] = useState(false);
  const config = getNotificationConfig(notification.type);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => removeNotification(notification.id), 300);
  };

  return (
    <Slide direction="left" in={visible} timeout={300}>
      <Card
        sx={{
          mb: 2,
          p: 2,
          minWidth: '320px',
          maxWidth: '400px',
          bgcolor: config.bgColor,
          border: `1px solid ${config.borderColor}`,
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '4px',
            height: '100%',
            bgcolor: config.color,
          },
        }}
      >
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Box
            sx={{
              color: config.color,
              mt: 0.5,
              '& svg': { fontSize: 20 },
            }}
          >
            {config.icon}
          </Box>
          
          <Box flex={1}>
            <Typography
              variant="subtitle2"
              fontWeight="bold"
              sx={{
                color: config.color,
                mb: notification.message ? 0.5 : 0,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              {notification.title}
            </Typography>
            
            {notification.message && (
              <Typography
                variant="body2"
                sx={{
                  color: '#374151',
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  whiteSpace: 'pre-line',
                }}
              >
                {notification.message}
              </Typography>
            )}
            
            {notification.action && (
              <Button
                size="small"
                onClick={notification.action.onClick}
                sx={{
                  mt: 1,
                  color: config.color,
                  fontWeight: 600,
                  textTransform: 'none',
                  p: 0,
                  minWidth: 'auto',
                  '&:hover': {
                    bgcolor: 'transparent',
                    textDecoration: 'underline',
                  },
                }}
              >
                {notification.action.label}
              </Button>
            )}
          </Box>
          
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              color: '#6b7280',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.1)',
              },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Card>
    </Slide>
  );
};

const ToastContainer: React.FC = () => {
  const { notifications } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        pointerEvents: 'none',
        '& > *': {
          pointerEvents: 'auto',
        },
      }}
    >
      {notifications.map((notification) => (
        <ToastItem key={notification.id} notification={notification} />
      ))}
    </Box>
  );
};

export default ToastContainer;