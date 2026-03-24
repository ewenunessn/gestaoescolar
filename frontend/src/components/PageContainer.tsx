import React from 'react';
import { Box, BoxProps } from '@mui/material';

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
  return (
    <Box
      sx={{
        px: '20px',
        py: 1.5,
        ...(fullHeight && {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default PageContainer;
