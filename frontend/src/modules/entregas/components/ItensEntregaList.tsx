import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
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
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Paper,
  LinearProgress
} from "@mui/material";
import {
  LocalShipping as DeliveryIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  LocationOn as LocationIcon
} from "@mui/icons-material";
import { ColumnDef } from "@tanstack/react-table";
import { EscolaEntrega, ItemEntrega, ConfirmarEntregaData } from "../types";
import { entregaService } from "../services/entregaService";
import ViewTabs from "../../../components/ViewTabs";
import { DataTableAdvanced } from "../../../components/DataTableAdvanced";

interface ItemSelecionado extends ItemEntrega {
  selecionado: boolean;
  quantidade_a_entregar: number;
}

type Etapa = 'selecao' | 'revisao' | 'sucesso';

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
  const [itens, setItens] = useState<ItemSelecionado[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<ItemSelecionado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('selecao');
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'entregues'>('pendentes');
  // Estados para revisão e entrega
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [nomeEntregador, setNomeEntregador] = useState('');
  const [observacao, setObservacao] = useState('');
  const [processando, setProcessando] = useState(false);
  const [localizacaoGPS, setLocalizacaoGPS] = useState<{ latitude: number; longitude: number; precisao: number } | null>(null);

  useEffect(() => {
    carregarItens();
    carregarNomeEntregador();
    obterLocalizacao();
  }, [escola.id, filtros]);

  const carregarNomeEntregador = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setNomeEntregador(user.nome || '');
      } catch (e) {
        console.error('Erro ao obter dados do usuário:', e);
      }
    }
  };

  const obterLocalizacao = async () => {
    try {
      const localizacao = await entregaService.obterLocalizacaoGPS();
      setLocalizacaoGPS(localizacao);
    } catch (error) {
      console.warn('Não foi possível obter localização GPS:', error);
    }
  };

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
      
      const itensComSelecao: ItemSelecionado[] = data.map(item => ({
        ...item,
        selecionado: false,
        quantidade_a_entregar: item.saldo_pendente !== undefined && item.saldo_pendente > 0 
          ? item.saldo_pendente 
          : item.quantidade
      }));
      
      setItens(itensComSelecao);
      setEtapa('selecao');
      setItensSelecionados([]);
      setNomeRecebedor('');
      setObservacao('');
    } catch (err) {
      console.error('Erro ao carregar itens:', err);
      setError('Erro ao carregar itens para entrega');
    } finally {
      setLoading(false);
    }
  };
  const formatarQuantidade = (valor: number | string): string => {
    const num = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (Number.isInteger(num)) return num.toString();
    return num.toFixed(3).replace(/\.?0+$/, '');
  };

  const handleAbaChange = (value: string | number) => {
    setAbaAtiva(value === 'entregues' ? 'entregues' : 'pendentes');
    setItensSelecionados([]);
  };

  const handleSelectionChange = useCallback((selectedRows: ItemSelecionado[]) => {
    setItensSelecionados(selectedRows);
  }, []);

  const atualizarQuantidade = useCallback((itemId: number, valor: string) => {
    const quantidade = parseFloat(valor) || 0;
    setItens(prev => prev.map(item => {
      if (item.id === itemId) {
        const quantidadeMaxima = item.saldo_pendente !== undefined && item.saldo_pendente > 0 
          ? item.saldo_pendente 
          : item.quantidade;
        const quantidadeLimitada = Math.min(quantidade, quantidadeMaxima);
        return { ...item, quantidade_a_entregar: quantidadeLimitada };
      }
      return item;
    }));
  }, []);

  const continuar = () => {
    if (itensSelecionados.length === 0) {
      setError('Selecione pelo menos um item para entrega');
      return;
    }

    const invalidos = itensSelecionados.filter(i => i.quantidade_a_entregar <= 0);
    if (invalidos.length > 0) {
      setError('Todas as quantidades devem ser maiores que zero');
      return;
    }

    const diferentes = itensSelecionados.filter(i => {
      const quantidadeEsperada = (i.saldo_pendente !== undefined && i.saldo_pendente > 0) 
        ? i.saldo_pendente 
        : i.quantidade;
      const diff = Math.abs(i.quantidade_a_entregar - quantidadeEsperada);
      return diff > 0.01;
    });
    
    if (diferentes.length > 0) {
      const confirmacao = window.confirm(
        `⚠️ Entrega Parcial/Diferente\n\nAlguns itens têm quantidade diferente da esperada. Deseja continuar?`
      );
      if (!confirmacao) return;
    }

    setEtapa('revisao');
  };
  const finalizarEntrega = async () => {
    if (!nomeRecebedor.trim()) {
      setError('Informe o nome de quem recebeu a entrega');
      return;
    }

    if (!nomeEntregador.trim()) {
      setError('Informe o nome de quem entregou');
      return;
    }

    try {
      setProcessando(true);
      setError(null);
      
      const historicoIds: number[] = [];
      
      for (const item of itensSelecionados) {
        const entregaData: ConfirmarEntregaData = {
          quantidade_entregue: item.quantidade_a_entregar,
          nome_quem_entregou: nomeEntregador.trim(),
          nome_quem_recebeu: nomeRecebedor.trim(),
          observacao: observacao.trim() || undefined,
          latitude: localizacaoGPS?.latitude,
          longitude: localizacaoGPS?.longitude,
          precisao_gps: localizacaoGPS?.precisao,
          client_operation_id: `${Date.now()}_${item.id}_${Math.random().toString(36).slice(2, 11)}`
        };

        const response = await entregaService.confirmarEntrega(item.id, entregaData);
        
        if (response?.historico_id) {
          historicoIds.push(response.historico_id);
        }
      }

      if (historicoIds.length > 0) {
        try {
          const itensComprovante = itensSelecionados.map((item, index) => ({
            historico_entrega_id: historicoIds[index],
            produto_nome: item.produto_nome,
            quantidade_entregue: item.quantidade_a_entregar,
            unidade: item.unidade,
            lote: item.lote || undefined
          }));

          await entregaService.criarComprovante({
            escola_id: escola.id,
            nome_quem_entregou: nomeEntregador.trim(),
            nome_quem_recebeu: nomeRecebedor.trim(),
            observacao: observacao.trim() || undefined,
            assinatura_base64: '',
            itens: itensComprovante
          });
        } catch (err) {
          console.error('Erro ao criar comprovante:', err);
        }
      }

      setEtapa('sucesso');
      
      setTimeout(() => {
        onVoltar();
      }, 2000);
    } catch (err) {
      console.error('Erro ao finalizar entrega:', err);
      setError('Erro ao finalizar entrega');
      setProcessando(false);
    }
  };

  const cancelarEntrega = async (item: ItemEntrega) => {
    const motivo = window.prompt('Motivo do cancelamento (opcional):');
    if (motivo === null) return; // User clicked cancel
    
    if (!window.confirm(`Tem certeza que deseja cancelar esta entrega?\n\nProduto: ${item.produto_nome}\nQuantidade: ${item.quantidade} ${item.unidade}`)) {
      return;
    }

    try {
      setProcessando(true);
      
      // Use the safe cancellation endpoint
      if (item.historico_entregas && item.historico_entregas.length > 0) {
        const historicoId = item.historico_entregas[item.historico_entregas.length - 1].id;
        await entregaService.cancelarItemEntrega(historicoId, motivo || undefined);
      } else {
        // Fallback to old method if no historico
        await entregaService.cancelarEntrega(item.id);
      }
      
      await carregarItens();
    } catch (err) {
      console.error('Erro ao cancelar entrega:', err);
      setError('Erro ao cancelar entrega');
    } finally {
      setProcessando(false);
    }
  };
  // Filtrar itens por aba
  const itensFiltrados = itens.filter((item) => {
    if (abaAtiva === 'pendentes') {
      return !item.entrega_confirmada || (item.saldo_pendente && item.saldo_pendente > 0);
    } else {
      return item.historico_entregas && item.historico_entregas.length > 0;
    }
  });

  // Colunas para itens pendentes
  const colunasPendentes: ColumnDef<ItemSelecionado>[] = useMemo(() => [
    {
      accessorKey: 'produto_nome',
      header: 'Produto',
      size: 300,
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {row.original.produto_nome}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Guia: {row.original.mes}/{row.original.ano}
            {row.original.lote && ` • Lote: ${row.original.lote}`}
          </Typography>
        </Box>
      ),
    },
    {
      accessorKey: 'quantidade',
      header: 'Programado',
      size: 150,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2">
            {formatarQuantidade(row.original.quantidade)} {row.original.unidade}
          </Typography>
          {row.original.quantidade_ja_entregue && row.original.quantidade_ja_entregue > 0 && (
            <Typography variant="caption" color="error.main">
              Faltam: {formatarQuantidade(row.original.saldo_pendente || 0)}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'quantidade_entregar',
      header: 'Qtd. a Entregar',
      size: 150,
      meta: { align: 'center' },
      cell: ({ row }) => {
        const isSelecionado = itensSelecionados.some(i => i.id === row.original.id);
        if (!isSelecionado) {
          return <Typography variant="body2" color="text.secondary">-</Typography>;
        }
        return (
          <Box onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <TextField
              type="number"
              value={row.original.quantidade_a_entregar}
              onChange={(e) => atualizarQuantidade(row.original.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              size="small"
              inputProps={{ min: 0, step: 0.001 }}
              sx={{ width: 100 }}
            />
          </Box>
        );
      },
    },
  ], [itensSelecionados, atualizarQuantidade]);

  // Colunas para itens entregues
  const colunasEntregues: ColumnDef<ItemSelecionado>[] = useMemo(() => [
    {
      accessorKey: 'produto_nome',
      header: 'Produto',
      size: 250,
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {row.original.produto_nome}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Guia: {row.original.mes}/{row.original.ano}
            {row.original.lote && ` • Lote: ${row.original.lote}`}
          </Typography>
        </Box>
      ),
    },
    {
      accessorKey: 'quantidade',
      header: 'Programado',
      size: 120,
      meta: { align: 'center' },
      cell: ({ row }) => `${formatarQuantidade(row.original.quantidade)} ${row.original.unidade}`,
    },
    {
      id: 'historico',
      header: 'Histórico de Entregas',
      size: 400,
      cell: ({ row }) => {
        if (!row.original.historico_entregas || row.original.historico_entregas.length === 0) {
          return <Typography variant="caption" color="text.secondary">Sem histórico</Typography>;
        }
        return (
          <Box>
            {row.original.historico_entregas.map((h, idx) => (
              <Box key={h.id} sx={{ mb: 0.5 }}>
                <Typography variant="caption" fontWeight="bold" color="success.main">
                  {formatarQuantidade(h.quantidade_entregue)} {row.original.unidade}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  em {new Date(h.data_entrega).toLocaleDateString('pt-BR')} • 
                  {h.nome_quem_recebeu}
                </Typography>
              </Box>
            ))}
          </Box>
        );
      },
    },
    {
      id: 'acoes',
      header: 'Ações',
      size: 120,
      meta: { align: 'center' },
      enableSorting: false,
      cell: ({ row }) => (
        <Tooltip title="Cancelar entrega">
          <span>
            <IconButton
              size="small"
              color="error"
              onClick={() => cancelarEntrega(row.original)}
              disabled={processando}
            >
              <CancelIcon />
            </IconButton>
          </span>
        </Tooltip>
      ),
    },
  ], [processando, cancelarEntrega]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando itens...</Typography>
      </Box>
    );
  }

  // Tela de sucesso
  if (etapa === 'sucesso') {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="400px"
        sx={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999
        }}
      >
        <Paper sx={{ p: 6, textAlign: 'center', maxWidth: 400 }}>
          <Box 
            sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              bgcolor: 'success.main', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}
          >
            <CheckIcon sx={{ fontSize: 48, color: 'white' }} />
          </Box>
          <Typography variant="h5" color="success.main" fontWeight="bold" gutterBottom>
            Entrega Confirmada!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {itensSelecionados.length} {itensSelecionados.length === 1 ? 'item confirmado' : 'itens confirmados'} com sucesso
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Tela de revisão
  if (etapa === 'revisao') {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        <Stepper activeStep={1} sx={{ mb: 3, flexShrink: 0 }}>
          <Step completed>
            <StepLabel>Seleção de Itens</StepLabel>
          </Step>
          <Step>
            <StepLabel>Revisão</StepLabel>
          </Step>
          <Step>
            <StepLabel>Confirmação</StepLabel>
          </Step>
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          pb: 2
        }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumo da Entrega ({itensSelecionados.length} itens)
            </Typography>
          
          <DataTableAdvanced
            title="Resumo da Entrega"
            data={itensSelecionados}
            columns={[
              {
                accessorKey: 'produto_nome',
                header: 'Produto',
                size: 250,
              },
              {
                accessorKey: 'mes',
                header: 'Guia',
                size: 100,
                cell: ({ row }) => `${row.original.mes}/${row.original.ano}`,
              },
              {
                id: 'quantidade',
                header: 'Quantidade',
                size: 150,
                meta: { align: 'right' },
                cell: ({ row }) => `${formatarQuantidade(row.original.quantidade_a_entregar)} ${row.original.unidade}`,
              },
            ]}
            loading={false}
            emptyMessage="Nenhum item selecionado"
          />

          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome de Quem Entregou *"
                value={nomeEntregador}
                onChange={(e) => setNomeEntregador(e.target.value)}
                fullWidth
                disabled={!!nomeEntregador}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome de Quem Recebeu *"
                value={nomeRecebedor}
                onChange={(e) => setNomeRecebedor(e.target.value)}
                fullWidth
                required
              />
            </Grid>
          </Grid>

          <TextField
            label="Observações (opcional)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />

          {localizacaoGPS && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <LocationIcon color="info" />
                <Typography variant="subtitle2" color="info.main">
                  Localização GPS Capturada
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Lat: {localizacaoGPS.latitude.toFixed(6)}, 
                Lng: {localizacaoGPS.longitude.toFixed(6)} 
                (Precisão: {localizacaoGPS.precisao.toFixed(0)}m)
              </Typography>
            </Box>
          )}

        </Paper>
        </Box>

        <Box display="flex" gap={2} sx={{ 
          flexShrink: 0, 
          pt: 2, 
          pb: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}>
          <Button
            variant="outlined"
            onClick={() => setEtapa('selecao')}
            disabled={processando}
            fullWidth
          >
            Voltar
          </Button>
          <Button
            variant="contained"
            onClick={finalizarEntrega}
            disabled={processando || !nomeRecebedor.trim()}
            fullWidth
            sx={{ flex: 2 }}
          >
            {processando ? <CircularProgress size={20} /> : 'Finalizar Entrega'}
          </Button>
        </Box>

      </Box>
    );
  }
  // Tela principal de seleção
  return (
    <Box>

      <Stepper activeStep={0} sx={{ mb: 3 }}>
        <Step>
          <StepLabel>Seleção de Itens</StepLabel>
        </Step>
        <Step>
          <StepLabel>Revisão</StepLabel>
        </Step>
        <Step>
          <StepLabel>Confirmação</StepLabel>
        </Step>
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <ViewTabs
        value={abaAtiva}
        onChange={handleAbaChange}
        tabs={[
          {
            value: "pendentes",
            label: `Pendentes (${itens.filter(i => !i.entrega_confirmada || (i.saldo_pendente && i.saldo_pendente > 0)).length})`,
          },
          {
            value: "entregues",
            label: `Entregues (${itens.filter(i => i.historico_entregas?.length).length})`,
          },
        ]}
      />

      {abaAtiva === 'pendentes' ? (
        <>
          <DataTableAdvanced
            title="Itens Pendentes"
            data={itensFiltrados}
            columns={colunasPendentes}
            loading={loading}
            searchPlaceholder="Buscar produto..."
            emptyMessage="Nenhum item pendente encontrado"
            enableRowSelection={true}
            onSelectionChange={handleSelectionChange}
            toolbarActions={
              <Button
                variant="contained"
                startIcon={<DeliveryIcon />}
                onClick={continuar}
                disabled={itensSelecionados.length === 0}
                size="small"
              >
                Continuar
              </Button>
            }
          />
        </>
      ) : (
        <DataTableAdvanced
          title="Itens Entregues"
          data={itensFiltrados}
          columns={colunasEntregues}
          loading={loading}
          searchPlaceholder="Buscar produto..."
          emptyMessage="Nenhum item entregue ainda"
        />
      )}
    </Box>
  );
};
