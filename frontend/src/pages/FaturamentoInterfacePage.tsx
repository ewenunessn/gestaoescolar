import React from 'react';
import { Container, Box } from '@mui/material';
import FaturamentoInterface from '../components/FaturamentoInterface';

const FaturamentoInterfacePage: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box py={2}>
        <FaturamentoInterface />
      </Box>
    </Container>
  );
};

export default FaturamentoInterfacePage;