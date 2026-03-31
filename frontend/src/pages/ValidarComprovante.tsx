import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  QrCodeScanner as QrIcon,
  CheckCircle as ValidIcon,
  Cancel as InvalidIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import api from '../services/api';

interface ComprovanteItem {
  id: number;
  produto_nome: string;
  quantidade_entregue: number;
  unidade: string;
  lote?: string;
}

interface ComprovanteValidado {
  id: number;
  numero_comprovante: string;
  escola_nome: string;
  escola_endereco?: string;
  data_entrega: string;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  cargo_recebedor?: string;
  observacao?: string;
  assinatura_base64?: string;
  total_itens: number;
  status: string;
  itens: ComprovanteItem[];
}

export default function ValidarComprovante() {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [comprovante, setComprovante] = useState<ComprovanteValidado | null>(null);
  const [erro, setErro] = useState('');

  const validarComprovante = async () => {
    if (!codigo.trim()) {
      setErro('Digite o código do comprovante');
      return;
    }

    try {
      setLoading(true);
      setErro('');
      setComprovante(null);

      const response = await api.get(`/entregas/comprovantes/numero/${codigo.trim()}`);
      setComprovante(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setErro('Comprovante não encontrado. Verifique o código e tente novamente.');
      } else {
        setErro('Erro ao validar comprovante. Tente novamente.');
      }
      setComprovante(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      validarComprovante();
    }
  };

  const formatarQuantidade = (valor: number): string => {
    if (Number.isInteger(valor)) {
      return valor.toLocaleString('pt-BR');
    }
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            textAlign: 'center'
          }}
        >
          <QrIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Validar Comprovante de Entrega
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Digite ou escaneie o código do comprovante para verificar sua autenticidade
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              label="Código do Comprovante"
              placeholder="COMP-2026-03-00001"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              disabled={loading}
              autoFocus
            />
            <Button
              variant="contained"
              size="large"
              onClick={validarComprovante}
              disabled={loading || !codigo.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              sx={{ minWidth: 140 }}
            >
              {loading ? 'Validando...' : 'Validar'}
            </Button>
          </Box>

          {erro && (
            <Alert
              severity="error"
              icon={<InvalidIcon />}
              sx={{ mb: 3, textAlign: 'left' }}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                Comprovante Inválido
              </Typography>
              <Typography variant="body2">{erro}</Typography>
            </Alert>
          )}

          {comprovante && (
            <Alert
              severity="success"
              icon={<ValidIcon />}
              sx={{ mb: 3, textAlign: 'left' }}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                ✓ Comprovante Autêntico
              </Typography>
              <Typography variant="body2">
                Este comprovante é válido e foi registrado no sistema.
              </Typography>
            </Alert>
          )}
        </Paper>

        {comprovante && (
          <Paper elevation={3} sx={{ mt: 3, p: 3, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
              Detalhes do Comprovante
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {comprovante.numero_comprovante}
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Escola
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      {comprovante.escola_nome}
                    </Typography>
                    {comprovante.escola_endereco && (
                      <Typography variant="body2" color="text.secondary">
                        {comprovante.escola_endereco}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Data da Entrega
                    </Typography>
                    <Typography variant="body1">
                      {new Date(comprovante.data_entrega).toLocaleString('pt-BR')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Chip
                      label={comprovante.status}
                      color={comprovante.status === 'finalizado' ? 'success' : 'default'}
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Entregador
                    </Typography>
                    <Typography variant="body1">
                      {comprovante.nome_quem_entregou}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Recebedor
                    </Typography>
                    <Typography variant="body1">
                      {comprovante.nome_quem_recebeu}
                    </Typography>
                    {comprovante.cargo_recebedor && (
                      <Typography variant="body2" color="text.secondary">
                        {comprovante.cargo_recebedor}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {comprovante.observacao && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Observações
                      </Typography>
                      <Typography variant="body1">
                        {comprovante.observacao}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Itens Entregues ({comprovante.total_itens})
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell>Produto</TableCell>
                        <TableCell align="right">Quantidade</TableCell>
                        <TableCell>Unidade</TableCell>
                        {comprovante.itens.some(i => i.lote) && (
                          <TableCell>Lote</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {comprovante.itens.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.produto_nome}</TableCell>
                          <TableCell align="right">
                            {formatarQuantidade(item.quantidade_entregue)}
                          </TableCell>
                          <TableCell>{item.unidade}</TableCell>
                          {comprovante.itens.some(i => i.lote) && (
                            <TableCell>{item.lote || '-'}</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {comprovante.assinatura_base64 && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Assinatura Digital do Recebedor
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          mt: 2
                        }}
                      >
                        <Box
                          component="img"
                          src={comprovante.assinatura_base64}
                          alt="Assinatura Digital"
                          sx={{
                            maxWidth: '300px',
                            maxHeight: '120px',
                            border: '1px solid #ddd',
                            borderRadius: 1,
                            p: 1,
                            backgroundColor: '#fff'
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="white">
            Sistema de Gestão de Alimentação Escolar
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
