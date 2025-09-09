import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { ListaAgrupamentos } from '../components/AgrupamentoMensal/ListaAgrupamentos';
import { AgrupamentoMensal } from '../types/agrupamentoMensal';
import { useNavigate } from 'react-router-dom';

const AgrupamentosMensais: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectAgrupamento = (agrupamento: AgrupamentoMensal) => {
    navigate(`/agrupamentos-mensais/${agrupamento.id}`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Agrupamentos Mensais
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Gerencie pedidos organizados por mês e faça faturamentos independentes por fornecedor.
        </Typography>
        
        <ListaAgrupamentos onSelectAgrupamento={handleSelectAgrupamento} />
      </Box>
    </Container>
  );
};

export default AgrupamentosMensais;