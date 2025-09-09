import React from 'react';
import { Container } from '@mui/material';
import RecebimentoItens from '../components/RecebimentoSimplificado/RecebimentoItens';

const RecebimentoItensPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <RecebimentoItens />
    </Container>
  );
};

export default RecebimentoItensPage;