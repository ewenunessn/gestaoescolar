import React from 'react';
import { Box, BoxProps, useTheme } from '@mui/material';

interface PageContainerProps extends BoxProps {
  children: React.ReactNode;
  fullHeight?: boolean;
}

/**
 * Container padrão para páginas do sistema
 * Aplica padding horizontal de 20px e outros estilos consistentes
 */
const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  fullHeight = false,
  sx,
  ...props 
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        pl: { xs: 2, md: 3 },
        pr: 0,
        py: { xs: 2, md: 2.5 },
        width: '100%',
        boxSizing: 'border-box',
        minHeight: 'calc(100vh - var(--app-top-offset, 0px))',
        ...(fullHeight && {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }),
      }}
    >
      <Box
        sx={{
          width: '100%',
          p: { xs: 1.5, md: 2 },
          borderRadius: '16px 0 0 16px',
          backgroundColor: theme.palette.mode === 'light'
            ? theme.palette.background.paper
            : '#141414',
          boxSizing: 'border-box',
          minHeight: {
            xs: 'calc(100vh - var(--app-top-offset, 0px) - 32px)',
            md: 'calc(100vh - var(--app-top-offset, 0px) - 40px)',
          },
          ...(fullHeight && {
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }),
          '& > .data-table-paper': {
            flex: fullHeight ? 1 : undefined,
            minHeight: fullHeight ? 0 : undefined,
          },
          '& .data-table-paper': {
            borderRadius: 1.25,
          },
        ...sx,
      }}
      {...props}
    >
      {children}
      </Box>
    </Box>
  );
};

export default PageContainer;
