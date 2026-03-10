import React from 'react';
import { Alert, Box, Slide } from '@mui/material';
import { useNotification } from '../context/NotificationContext';

const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 70,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {notifications.map((notification) => (
        <Slide
          key={notification.id}
          direction="down"
          in={true}
          mountOnEnter
          unmountOnExit
        >
          <Alert
            severity={notification.type}
            onClose={() => removeNotification(notification.id)}
            sx={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: '8px',
              minWidth: 300,
              maxWidth: 600,
              pointerEvents: 'auto',
            }}
          >
            {notification.title}
            {notification.message && ` - ${notification.message}`}
          </Alert>
        </Slide>
      ))}
    </Box>
  );
};

export default ToastContainer;
