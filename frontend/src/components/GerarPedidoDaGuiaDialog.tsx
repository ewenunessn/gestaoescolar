import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, Box, Typography,
  CircularProgress, Alert, Chip, IconButton,
} from '@mui/material';
import { Close as CloseIcon, ShoppingCart as ShoppingCartIcon } from '@mui/icons-material';
import { guiaService } from '../services/guiaService';
import { gerarPedidoDaGuia } from '../services/planejamentoCompras';
import { useToast } from '../hooks/useToast';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  guiaIdInicial?: number;
}

export default function GerarPedidoDaGuiaDialog({ open, onClose, onSuccess, guiaIdInicial }: Props) {
  const [guias, setGuias] = useState<any[]>([]);
  const [guiaSelecionada, setGuiaSelecionada] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [pedidoGerado, setPedidoGerado] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      carregarGuias();
    }
  }, [open]);

  // Pré-selecionar guia se guiaIdInicial foi fornecido
  useEffect(() => {
    if (guiaIdInicial && guias.length > 0) {
      const guia = guias.find(g => g.id === guiaIdInicial);
      if (guia) {
        setGuiaSelecionada(guia);
      }
    }
  }, [guiaIdInicial, guias]);

  async function carregarGuias() {
    setLoading(true);
    try {
      const response = await guiaService.listarGuias();
      const guiasData = response?.data ?? response ?? [];
      
      // Filtrar apenas guias abertas e ordenar por mais recentes
      const guiasAbertas = guiasData
        .filter((g: any) => g.status === 'aberta')
        .sort((a: any, b: any) => {
          if (a.ano !== b.ano) return b.ano - a.ano;
          return b.mes - a.mes;
        });
      
      setGuias(guiasAbertas);
      
      if (guiasAbertas.length > 0) {
        setGuiaSelecionada(guiasAbertas[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar guias:', error);
      toast.error('Erro ao carregar guias de demanda');
    } finally {
      setLoading(false);
    }
  }

  async function handleGerar() {
    if (!guiaSelecionada) {
      toast.warning('Selecione uma guia de demanda');
      return;
    }

    setGerando(true);
    try {
      const resultado = await gerarPedidoDaGuia(guiaSelecionada.id);
      
      if (resultado.total_criados > 0) {
        const pedido = resultado.pedidos_criados[0];
        toast.success(`Pedido ${pedido.numero} gerado com sucesso!`);
        setPedidoGerado(pedido);
        
        if (onSuccess) {
          onSuccess();
        }
        
        onClose();
      } else {
        const erro = resultado.erros?.[0]?.motivo || 'Nenhum pedido foi criado';
        toast.error(erro);
      }
    } catch (error: any) {
      const mensagem = error.response?.data?.error || 'Erro ao gerar pedido';
      toast.error(mensagem);
    } finally {
      setGerando(false);
    }
  }

  const formatarCompetencia = (guia: any) => {
    if (guia.nome) return guia.nome;
    if (guia.competencia_mes_ano) return guia.competencia_mes_ano;
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[(guia.mes ?? 1) - 1]}/${guia.ano}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCartIcon color="primary" />
          <Typography variant="h6">Gerar Pedido da Guia</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : guias.length === 0 ? (
          <Alert severity="info">
            Nenhuma guia de demanda aberta encontrada. Crie uma guia no Planejamento de Compras primeiro.
          </Alert>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              Selecione uma guia de demanda para gerar o pedido de compra automaticamente.
            </Alert>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Guia de Demanda</InputLabel>
              <Select
                value={guiaSelecionada?.id ?? ''}
                label="Guia de Demanda"
                onChange={(e) => setGuiaSelecionada(guias.find(g => g.id === Number(e.target.value)) ?? null)}
              >
                {guias.map(guia => (
                  <MenuItem key={guia.id} value={guia.id}>
                    <Box>
                      <Typography variant="body2">{formatarCompetencia(guia)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {guia.total_produtos ?? 0} produto(s) • {guia.total_escolas ?? 0} escola(s)
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {guiaSelecionada && (
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Detalhes da Guia
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`Guia #${guiaSelecionada.id}`} size="small" />
                  <Chip label={`Status: ${guiaSelecionada.status}`} size="small" color="success" />
                  {guiaSelecionada.competencia_mes_ano && (
                    <Chip label={guiaSelecionada.competencia_mes_ano} size="small" variant="outlined" />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  O pedido será gerado com base nas quantidades ajustadas desta guia.
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={gerando}>
          Cancelar
        </Button>
        <Button
          onClick={handleGerar}
          variant="contained"
          disabled={!guiaSelecionada || gerando || loading}
          startIcon={gerando ? <CircularProgress size={20} /> : <ShoppingCartIcon />}
        >
          {gerando ? 'Gerando...' : 'Gerar Pedido'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
