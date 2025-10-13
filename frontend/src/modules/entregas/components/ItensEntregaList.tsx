import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
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
  Tooltip
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

interface ItensEntregaListProps {
  escola: EscolaEntrega;
  onVoltar: () => void;
  filtros: { guiaId?: number; rotaId?: number };
}

export const ItensEntregaList: React.FC<ItensEntregaListProps> = ({ escola, onVoltar, filtros }) => {
  const [itens, setItens] = useState<ItemEntrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<ItemEntrega | null>(null);
  const [dadosEntrega, setDadosEntrega] = useState<ConfirmarEntregaData>({
    quantidade_entregue: 0,
    nome_quem_entregou: '',
    nome_quem_recebeu: ''
  });
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    carregarItens();
  }, [escola.id, filtros]);

  const carregarItens = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await entregaService.listarItensPorEscola(escola.id, filtros.guiaId);
      setItens(data);
    } catch (err) {
      console.error('Erro ao carregar itens:', err);
      setError('Erro ao carregar itens para entrega');
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogEntrega = (item: ItemEntrega) => {
    setItemSelecionado(item);
    setDadosEntrega({
      quantidade_entregue: item.quantidade,
      nome_quem_entregou: '',
      nome_quem_recebeu: ''
    });
    setDialogAberto(true);
  };

  const fecharDialog = () => {
    setDialogAberto(false);
    setItemSelecionado(null);
    setDadosEntrega({
      quantidade_entregue: 0,
      nome_quem_entregou: '',
      nome_quem_recebeu: ''
    });
  };

  const confirmarEntrega = async () => {
    if (!itemSelecionado) return;

    try {
      setProcessando(true);
      await entregaService.confirmarEntrega(itemSelecionado.id, dadosEntrega);
      await carregarItens(); // Recarregar lista
      fecharDialog();
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
            {itens.length} itens para entrega
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Lista de Itens */}
      <Grid container spacing={2}>
        {itens.map((item) => (
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
                  {getStatusChip(item)}
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

                <Box display="flex" gap={1} mt={2}>
                  {!item.entrega_confirmada ? (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<DeliveryIcon />}
                      onClick={() => abrirDialogEntrega(item)}
                      disabled={processando}
                    >
                      Confirmar Entrega
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => cancelarEntrega(item)}
                      disabled={processando}
                    >
                      Cancelar Entrega
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {itens.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            Nenhum item para entrega encontrado
          </Typography>
        </Box>
      )}

      {/* Dialog de Confirmação de Entrega */}
      <Dialog open={dialogAberto} onClose={fecharDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Confirmar Entrega
          {itemSelecionado && (
            <Typography variant="body2" color="text.secondary">
              {itemSelecionado.produto_nome}
            </Typography>
          )}
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Quantidade Entregue"
                type="number"
                fullWidth
                value={dadosEntrega.quantidade_entregue}
                onChange={(e) => setDadosEntrega(prev => ({
                  ...prev,
                  quantidade_entregue: Number(e.target.value)
                }))}
                inputProps={{ min: 0, step: 0.001 }}
                helperText={itemSelecionado ? `Quantidade original: ${itemSelecionado.quantidade} ${itemSelecionado.unidade}` : ''}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Nome de Quem Entregou"
                fullWidth
                value={dadosEntrega.nome_quem_entregou}
                onChange={(e) => setDadosEntrega(prev => ({
                  ...prev,
                  nome_quem_entregou: e.target.value
                }))}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Nome de Quem Recebeu"
                fullWidth
                value={dadosEntrega.nome_quem_recebeu}
                onChange={(e) => setDadosEntrega(prev => ({
                  ...prev,
                  nome_quem_recebeu: e.target.value
                }))}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={fecharDialog} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={confirmarEntrega}
            variant="contained"
            disabled={
              processando ||
              !dadosEntrega.nome_quem_entregou.trim() ||
              !dadosEntrega.nome_quem_recebeu.trim() ||
              dadosEntrega.quantidade_entregue <= 0
            }
          >
            {processando ? <CircularProgress size={20} /> : 'Confirmar Entrega'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};