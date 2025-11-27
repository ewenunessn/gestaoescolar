import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import PermissoesUsuario from '../components/PermissoesUsuario';

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
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function GerenciarUsuario() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tabAtual, setTabAtual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (id) {
      carregarUsuario();
    }
  }, [id]);

  const carregarUsuario = async () => {
    try {
      setLoading(true);
      // Aqui você deve implementar a chamada para buscar dados do usuário
      // Por enquanto, vou simular
      setUsuario({
        id: Number(id),
        nome: 'Usuário Exemplo',
        email: 'usuario@exemplo.com'
      });
    } catch (error: any) {
      console.error('Erro ao carregar usuário:', error);
      setErro('Erro ao carregar dados do usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    navigate('/usuarios');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (erro) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{erro}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleVoltar} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleVoltar}
          sx={{ mr: 2 }}
        >
          Voltar
        </Button>
        <Typography variant="h4">
          Gerenciar Usuário
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nome"
                value={usuario?.nome || ''}
                fullWidth
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                value={usuario?.email || ''}
                fullWidth
                disabled
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabAtual} onChange={(e, newValue) => setTabAtual(newValue)}>
          <Tab label="Dados Básicos" />
          <Tab label="Permissões" />
        </Tabs>
      </Box>

      <TabPanel value={tabAtual} index={0}>
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              Edição de dados básicos do usuário será implementada aqui.
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabAtual} index={1}>
        {id && <PermissoesUsuario usuarioId={Number(id)} />}
      </TabPanel>
    </Container>
  );
}
