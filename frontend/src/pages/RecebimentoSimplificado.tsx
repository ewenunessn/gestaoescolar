import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import ListaPedidosPendentes from '../components/RecebimentoSimplificado/ListaPedidosPendentes';
import ListaPedidosRecebidos from '../components/RecebimentoSimplificado/ListaPedidosRecebidos';

const RecebimentoSimplificado: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box sx={{ p: 3 }}>
      {/* Cabeçalho */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Recebimentos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gerencie recebimentos de pedidos
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Pedidos Pendentes" />
          <Tab label="Pedidos Recebidos" />
        </Tabs>
      </Box>

      {/* Conteúdo das abas */}
      {tabValue === 0 && <ListaPedidosPendentes />}
      {tabValue === 1 && <ListaPedidosRecebidos />}
    </Box>
  );
};

export default RecebimentoSimplificado;