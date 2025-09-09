import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Container
} from '@mui/material';
import {
  Info as InfoIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const SistemaDescontinuado: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <InfoIcon color="primary" sx={{ fontSize: 64, mb: 2 }} />
          
          <Typography variant="h4" gutterBottom>
            Sistema Atualizado
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            O sistema de recebimento foi simplificado para oferecer uma experiência mais intuitiva e eficiente.
          </Typography>

          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="subtitle2" gutterBottom>
              🎉 Novidades do Sistema Simplificado:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>✅ Sem necessidade de "iniciar" e "finalizar" recebimentos</li>
              <li>✅ Status automático baseado nas quantidades recebidas</li>
              <li>✅ Interface mais limpa e intuitiva</li>
              <li>✅ Registro automático no estoque e contratos</li>
              <li>✅ Histórico completo de todas as operações</li>
            </Box>
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/recebimento-simples')}
            >
              Ir para Novo Sistema
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<CheckCircleIcon />}
              onClick={() => navigate('/dashboard')}
            >
              Voltar ao Dashboard
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            Todos os dados e funcionalidades foram preservados no novo sistema.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SistemaDescontinuado;