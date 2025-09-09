import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Container, Alert, CircularProgress } from '@mui/material';
import { DetalhesAgrupamento } from '../components/AgrupamentoMensal/DetalhesAgrupamento';
import { agrupamentoMensalService } from '../services/agrupamentoMensal';
import { AgrupamentoMensal } from '../types/agrupamentoMensal';

const AgrupamentoDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agrupamento, setAgrupamento] = useState<AgrupamentoMensal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      carregarAgrupamento();
    }
  }, [id]);

  const carregarAgrupamento = async () => {
    try {
      setLoading(true);
      setError(null);
      const detalhes = await agrupamentoMensalService.obterAgrupamento(Number(id));
      setAgrupamento(detalhes.agrupamento);
    } catch (error) {
      console.error('Erro ao carregar agrupamento:', error);
      setError('Erro ao carregar detalhes do agrupamento');
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    navigate('/agrupamentos-mensais');
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  if (!agrupamento) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Alert severity="warning">Agrupamento não encontrado</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <DetalhesAgrupamento 
          agrupamento={agrupamento} 
          onVoltar={handleVoltar}
        />
      </Box>
    </Container>
  );
};

export default AgrupamentoDetalhes;