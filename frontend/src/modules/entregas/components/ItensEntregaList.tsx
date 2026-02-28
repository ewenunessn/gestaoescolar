import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  LocalShipping as DeliveryIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { EscolaEntrega, ItemEntrega, ConfirmarEntregaData } from '../types';
import { entregaService } from '../services/entregaService';
import { SignaturePad } from '../../../components/SignaturePad';

interface ItensEntregaListProps {
  escola: EscolaEntrega;
  onVoltar: () => void;
  filtros: {
    guiaId?: number;
    rotaId?: number;
    dataInicio?: string;
    dataFim?: string;
    somentePendentes?: boolean;
  };
}

export const ItensEntregaList: React.FC<ItensEntregaListProps> = ({ escola, onVoltar, filtros }) => {
  const [itens, setItens] = useState<ItemEntrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [quantidadesSelecionadas, setQuantidadesSelecionadas] = useState<Record<number, number>>({});
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [dialogRevisaoAberto, setDialogRevisaoAberto] = useState(false);
  const [dialogSucessoAberto, setDialogSucessoAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'entregues'>('pendentes');

  useEffect(() => {
    carregarItens();
  }, [escola.id, filtros]);

  const carregarItens = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await entregaService.listarItensPorEscola(
        escola.id,
        filtros.guiaId,
        undefined,
        filtros.dataInicio,
        filtros.dataFim,
        undefined
      );
      setItens(data);
      setSelecionados([]);
      setQuantidadesSelecionadas({});
      setNomeRecebedor('');
    } catch (err) {
      console.error('Erro ao carregar itens:', err);
      setError('Erro ao carregar itens para entrega');
    } finally {
      setLoading(false);
    }
  };

  const alternarSelecionado = (item: ItemEntrega) => {
    if (item.entrega_confirmada) return;
    setSelecionados((prev) => {
      const jaSelecionado = prev.includes(item.id);
      if (jaSelecionado) {
        return prev.filter((id) => id !== item.id);
      }
      return [...prev, item.id];
    });
    setQuantidadesSelecionadas((prev) => {
      if (prev[item.id] !== undefined) return prev;
      return { ...prev, [item.id]: item.quantidade };
    });
  };

  const handleAbaChange = (_: React.SyntheticEvent, value: 'pendentes' | 'entregues') => {
    setAbaAtiva(value);
    setSelecionados([]);
    setQuantidadesSelecionadas({});
    setNomeRecebedor('');
  };

  const selecionarTodosPendentes = () => {
    const pendentes = itens.filter((item) => !item.entrega_confirmada);
    const ids = pendentes.map((item) => item.id);
    setSelecionados(ids);
    setQuantidadesSelecionadas((prev) => {
      const atualizado = { ...prev };
      pendentes.forEach((item) => {
        if (atualizado[item.id] === undefined) {
          atualizado[item.id] = item.quantidade;
        }
      });
      return atualizado;
    });
  };

  const limparSelecao = () => {
    setSelecionados([]);
  };

  const abrirRevisao = () => {
    setDialogRevisaoAberto(true);
  };

  const fecharRevisao = () => {
    if (processando) return;
    setDialogRevisaoAberto(false);
  };

  const confirmarEntregaSelecionados = async () => {
    const nome = nomeRecebedor.trim();
    if (!nome) {
      setError('Informe o nome de quem recebeu');
      return;
    }
    if (!assinatura) {
      setError('É necessário coletar a assinatura do recebedor');
      return;
    }
    try {
      setProcessando(true);
      const itensSelecionados = itens.filter((item) => selecionados.includes(item.id));
      await Promise.all(
        itensSelecionados.map((item) =>
          entregaService.confirmarEntrega(item.id, {
            quantidade_entregue: Number(quantidadesSelecionadas[item.id] ?? item.quantidade),
            nome_quem_entregou: nome,
            nome_quem_recebeu: nome,
            assinatura_base64: assinatura
          } as ConfirmarEntregaData)
        )
      );
      
      await carregarItens();
      setDialogRevisaoAberto(false);
      setDialogSucessoAberto(true);
      setAssinatura(null);
    } catch (err) {
      console.error('Erro ao confirmar entrega:', err);
      setError('Erro ao confirmar entrega');
    } finally {
      setProcessando(false);
    }
  };

  const cancelarEntrega = async (item: ItemEntrega) => {
    if (!confirm('Tem certeza que deseja cancelar esta entrega?')) return;

    try {
      setProcessando(true);
      await entregaService.cancelarEntrega(item.id);
      await carregarItens(); // Recarregar lista
    } catch (err) {
      console.error('Erro ao cancelar entrega:', err);
      setError('Erro ao cancelar entrega');
    } finally {
      setProcessando(false);
    }
  };

  const getStatusChip = (item: ItemEntrega) => {
    if (item.entrega_confirmada) {
      return <Chip label="Entregue" color="success" size="small" icon={<CheckIcon />} />;
    }
    return <Chip label="Pendente" color="warning" size="small" />;
  };

  const itensSelecionados = itens.filter((item) => selecionados.includes(item.id));
  const possuiQuantidadeInvalida = itensSelecionados.some((item) => {
    const valor = Number(quantidadesSelecionadas[item.id]);
    return Number.isNaN(valor) || valor <= 0;
  });
  const itensPendentes = itens.filter((item) => !item.entrega_confirmada);
  const itensEntregues = itens.filter((item) => item.entrega_confirmada);
  const itensExibidos = abaAtiva === 'pendentes' ? itensPendentes : itensEntregues;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={onVoltar}>
          <BackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5">{escola.nome}</Typography>
          <Typography variant="body2" color="text.secondary">
            {itensExibidos.length} itens
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs value={abaAtiva} onChange={handleAbaChange} sx={{ mb: 2 }}>
        <Tab value="pendentes" label={`Pendentes (${itensPendentes.length})`} />
        <Tab value="entregues" label={`Entregues (${itensEntregues.length})`} />
      </Tabs>

      {/* Lista de Itens */}
      <Grid container spacing={2}>
        {itensExibidos.map((item) => (
          <Grid item xs={12} key={item.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box flexGrow={1}>
                    <Typography variant="h6">{item.produto_nome}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Guia: {item.mes}/{item.ano}
                      {item.lote && ` • Lote: ${item.lote}`}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    {abaAtiva === 'pendentes' && !item.entrega_confirmada && (
                      <Checkbox
                        checked={selecionados.includes(item.id)}
                        onChange={() => alternarSelecionado(item)}
                      />
                    )}
                    {getStatusChip(item)}
                  </Box>
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Quantidade</Typography>
                    <Typography variant="body1">
                      {item.quantidade} {item.unidade}
                    </Typography>
                  </Grid>
                  
                  {item.entrega_confirmada && (
                    <>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Quantidade Entregue</Typography>
                        <Typography variant="body1">
                          {item.quantidade_entregue} {item.unidade}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Data da Entrega</Typography>
                        <Typography variant="body1">
                          {item.data_entrega ? new Date(item.data_entrega).toLocaleDateString('pt-BR') : '-'}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>

                {item.entrega_confirmada && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Quem Entregou</Typography>
                        <Typography variant="body1">{item.nome_quem_entregou || '-'}</Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Quem Recebeu</Typography>
                        <Typography variant="body1">{item.nome_quem_recebeu || '-'}</Typography>
                      </Grid>
                    </Grid>
                  </>
                )}

                {item.observacao && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">Observação</Typography>
                    <Typography variant="body2">{item.observacao}</Typography>
                  </Box>
                )}

                {abaAtiva === 'pendentes' && !item.entrega_confirmada && selecionados.includes(item.id) && (
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Quantidade a entregar"
                        type="number"
                        fullWidth
                        value={quantidadesSelecionadas[item.id] ?? item.quantidade}
                        onChange={(e) =>
                          setQuantidadesSelecionadas((prev) => ({
                            ...prev,
                            [item.id]: Number(e.target.value)
                          }))
                        }
                        inputProps={{ min: 0, step: 0.001 }}
                      />
                    </Grid>
                  </Grid>
                )}

                {abaAtiva === 'entregues' && item.entrega_confirmada && (
                  <Box display="flex" gap={1} mt={2}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => cancelarEntrega(item)}
                      disabled={processando}
                    >
                      Cancelar Entrega
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {itensExibidos.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            {abaAtiva === 'pendentes' ? 'Nenhum item pendente encontrado' : 'Nenhum item entregue encontrado'}
          </Typography>
        </Box>
      )}

      {abaAtiva === 'pendentes' && itensPendentes.length > 0 && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
          <Box display="flex" gap={1}>
            <Button variant="outlined" onClick={selecionarTodosPendentes}>
              Selecionar todos pendentes
            </Button>
            {selecionados.length > 0 && (
              <Button variant="text" onClick={limparSelecao}>
                Limpar seleção
              </Button>
            )}
          </Box>
          <Button
            variant="contained"
            startIcon={<DeliveryIcon />}
            onClick={abrirRevisao}
            disabled={selecionados.length === 0 || possuiQuantidadeInvalida}
          >
            Prosseguir
          </Button>
        </Box>
      )}

      <Dialog open={dialogRevisaoAberto} onClose={fecharRevisao} maxWidth="md" fullWidth>
        <DialogTitle>Revisar Entrega</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell>Guia</TableCell>
                  <TableCell align="right">Quantidade</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itensSelecionados.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.produto_nome}</TableCell>
                    <TableCell>{item.mes}/{item.ano}</TableCell>
                    <TableCell align="right">
                      {quantidadesSelecionadas[item.id] ?? item.quantidade} {item.unidade}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box mt={2}>
            <TextField
              label="Nome de quem recebeu"
              fullWidth
              value={nomeRecebedor}
              onChange={(e) => setNomeRecebedor(e.target.value)}
              required
              sx={{ mb: 3 }}
            />
          </Box>

          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Assinatura do Recebedor *
            </Typography>
            {assinatura ? (
              <Box>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 2,
                    border: '2px solid',
                    borderColor: 'success.main',
                    bgcolor: 'success.50'
                  }}
                >
                  <img
                    src={assinatura}
                    alt="Assinatura"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                  />
                </Paper>
                <Button
                  variant="outlined"
                  color="warning"
                  fullWidth
                  onClick={() => setAssinatura(null)}
                >
                  ✏️ Refazer Assinatura
                </Button>
              </Box>
            ) : (
              <SignaturePad
                onSave={(dataUrl) => setAssinatura(dataUrl)}
                onClear={() => setAssinatura(null)}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharRevisao} disabled={processando}>
            Voltar
          </Button>
          <Button
            onClick={confirmarEntregaSelecionados}
            variant="contained"
            disabled={processando || !nomeRecebedor.trim() || !assinatura || selecionados.length === 0 || possuiQuantidadeInvalida}
          >
            {processando ? <CircularProgress size={20} /> : 'Realizar entrega'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogSucessoAberto} onClose={() => setDialogSucessoAberto(false)} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" py={3}>
            <CheckIcon className="bounce" color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6">Entrega confirmada com sucesso</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              setDialogSucessoAberto(false);
              onVoltar();
            }}
          >
            Voltar para entregas
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
