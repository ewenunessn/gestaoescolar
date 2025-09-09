import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Paper,
} from '@mui/material';
import {
  Receipt,
  Settings,
  Assessment,
  List,
} from '@mui/icons-material';
import PedidosProntosFaturamento from '../components/FaturamentoModalidades/PedidosProntosFaturamento';
import { PedidoProntoFaturamento } from '../services/faturamentoModalidades';

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
      id={`faturamento-tabpanel-${index}`}
      aria-labelledby={`faturamento-tab-${index}`}
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

function a11yProps(index: number) {
  return {
    id: `faturamento-tab-${index}`,
    'aria-controls': `faturamento-tabpanel-${index}`,
  };
}

const FaturamentoModalidades: React.FC = () => {
  const [tabAtiva, setTabAtiva] = useState(0);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoProntoFaturamento | null>(null);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabAtiva(newValue);
  };

  const handlePedidoSelecionado = (pedido: PedidoProntoFaturamento) => {
    setPedidoSelecionado(pedido);
    // Aqui você pode implementar lógica adicional quando um pedido é selecionado
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Cabeçalho */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Faturamento por Modalidades
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie o faturamento automático dividido por modalidades
          </Typography>
        </Box>

        {/* Cards de Resumo */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Receipt color="primary" />
                  <Box>
                    <Typography variant="h6" component="div">
                      Pedidos Prontos
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Para faturamento
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Settings color="secondary" />
                  <Box>
                    <Typography variant="h6" component="div">
                      Modalidades
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Configurações ativas
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Assessment color="success" />
                  <Box>
                    <Typography variant="h6" component="div">
                      Faturamentos
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Processados hoje
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <List color="info" />
                  <Box>
                    <Typography variant="h6" component="div">
                      Relatórios
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Disponíveis
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs de Navegação */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabAtiva}
            onChange={handleChangeTab}
            aria-label="Tabs de faturamento modalidades"
            variant="fullWidth"
          >
            <Tab
              icon={<Receipt />}
              label="Pedidos Prontos"
              {...a11yProps(0)}
            />
            <Tab
              icon={<Settings />}
              label="Configurações"
              {...a11yProps(1)}
            />
            <Tab
              icon={<Assessment />}
              label="Faturamentos"
              {...a11yProps(2)}
            />
            <Tab
              icon={<List />}
              label="Relatórios"
              {...a11yProps(3)}
            />
          </Tabs>
        </Paper>

        {/* Conteúdo das Tabs */}
        <TabPanel value={tabAtiva} index={0}>
          <PedidosProntosFaturamento
            onPedidoSelecionado={handlePedidoSelecionado}
          />
        </TabPanel>

        <TabPanel value={tabAtiva} index={1}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configurações de Modalidades
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Em desenvolvimento - Aqui você poderá gerenciar as modalidades
                e seus percentuais de repasse.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabAtiva} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Histórico de Faturamentos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Em desenvolvimento - Aqui você poderá visualizar o histórico de
                faturamentos processados por modalidade.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabAtiva} index={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Relatórios de Faturamento
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Em desenvolvimento - Aqui você poderá gerar relatórios detalhados
                de faturamento por modalidade, período e fornecedor.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>
      </Box>
    </Container>
  );
};

export default FaturamentoModalidades;