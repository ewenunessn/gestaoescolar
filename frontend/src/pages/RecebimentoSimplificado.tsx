import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
} from '@mui/material';
import ListaPedidosPendentes from '../components/RecebimentoSimplificado/ListaPedidosPendentes';
import ListaPedidosRecebidos from '../components/RecebimentoSimplificado/ListaPedidosRecebidos';

// Componente auxiliar para painéis de abas
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}


const RecebimentoSimplificadoPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        
        {/* Cabeçalho */}
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              color: '#1f2937',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            Recebimentos
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#6b7280',
              fontFamily: 'Inter, sans-serif',
              mt: 1
            }}
          >
            Gerencie o recebimento de pedidos de forma rápida e eficiente.
          </Typography>
        </Box>

        {/* Card com as abas e conteúdo */}
        <Card sx={{
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleChange}
              aria-label="abas de recebimento de pedidos"
              sx={{
                '& .MuiTabs-indicator': {
                  backgroundColor: '#4f46e5',
                  height: '3px',
                },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem',
                  '&.Mui-selected': {
                    color: '#4f46e5',
                  },
                }
              }}
            >
              <Tab label="Pedidos Pendentes" id="tab-pendentes" aria-controls="tabpanel-pendentes" />
              <Tab label="Histórico de Recebidos" id="tab-recebidos" aria-controls="tabpanel-recebidos" />
            </Tabs>
          </Box>

          {/* Conteúdo das abas */}
          <TabPanel value={tabValue} index={0}>
            <ListaPedidosPendentes />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ListaPedidosRecebidos />
          </TabPanel>
          
        </Card>
      </Box>
    </Box>
  );
};

export default RecebimentoSimplificadoPage;