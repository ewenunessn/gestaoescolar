import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, Box, Typography,
  CircularProgress, Alert, Chip, IconButton,
} from '@mui/material';
import { Close as CloseIcon, ShoppingCart as ShoppingCartIcon } from '@mui/icons-material';
import { guiaService } from '../services/guiaService';
import { gerarPedidoDaGuia, iniciarGeracaoPedidoAsync } from '../services/planejamentoCompras';
import { useToast } from '../hooks/useToast';
import SelecionarContratosDialog from './SelecionarContratosDialog';
import { JobProgressModal } from './JobProgressModal';

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
  const [produtosSemContrato, setProdutosSemContrato] = useState<any[]>([]);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [produtosComContrato, setProdutosComContrato] = useState(0);
  
  // Estados para seleção de múltiplos contratos
  const [produtosMultiplosContratos, setProdutosMultiplosContratos] = useState<any[]>([]);
  const [dialogSelecaoContratos, setDialogSelecaoContratos] = useState(false);
  const [contratosSelecionados, setContratosSelecionados] = useState<any[]>([]);
  
  // Job progress
  const [jobProgressOpen, setJobProgressOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  
  const toast = useToast();

  // Debug: Log quando estados de job mudam
  useEffect(() => {
    console.log('🔄 Estado jobProgressOpen mudou:', jobProgressOpen);
    console.log('🔄 Estado currentJobId mudou:', currentJobId);
  }, [jobProgressOpen, currentJobId]);

  // Debug: Log quando estados mudam
  useEffect(() => {
    console.log('🔄 Estado dialogSelecaoContratos mudou:', dialogSelecaoContratos);
    console.log('🔄 Produtos múltiplos contratos:', produtosMultiplosContratos.length);
  }, [dialogSelecaoContratos, produtosMultiplosContratos]);

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

    console.log('🚀 Iniciando geração de pedido...');
    console.log('📋 Guia selecionada:', guiaSelecionada.id);
    console.log('📋 Contratos já selecionados:', contratosSelecionados);

    setGerando(true);
    try {
      // SEMPRE usar chamada síncrona primeiro para verificações
      const resultado = await gerarPedidoDaGuia(
        guiaSelecionada.id,
        contratosSelecionados.length > 0 ? contratosSelecionados : undefined
      );
      
      console.log('📋 Resultado completo recebido:', JSON.stringify(resultado, null, 2));
      
      // Verificar se requer seleção de múltiplos contratos
      if ((resultado as any).requer_selecao) {
        console.log('⚠️ Requer seleção de múltiplos contratos');
        console.log('📦 Produtos com múltiplos contratos:', (resultado as any).produtos_multiplos_contratos);
        
        setProdutosMultiplosContratos((resultado as any).produtos_multiplos_contratos || []);
        setDialogSelecaoContratos(true);
        setGerando(false);
        
        console.log('✅ Dialog de seleção deve abrir agora');
        
        // Se também houver produtos sem contrato, guardar para mostrar depois
        if ((resultado as any).produtos_sem_contrato?.length > 0) {
          console.log('⚠️ Também há produtos sem contrato:', (resultado as any).produtos_sem_contrato);
          setProdutosSemContrato((resultado as any).produtos_sem_contrato);
        }
        
        return;
      }
      
      // Verificar se requer confirmação (produtos sem contrato)
      if ((resultado as any).requer_confirmacao) {
        console.log('⚠️ Requer confirmação (produtos sem contrato)');
        setProdutosSemContrato((resultado as any).produtos_sem_contrato || []);
        setProdutosComContrato((resultado as any).produtos_com_contrato || 0);
        setMostrarConfirmacao(true);
        setGerando(false);
        return;
      }
      
      // Se chegou aqui, pode gerar o pedido - usar sistema ASSÍNCRONO
      console.log('✅ Iniciando geração assíncrona do pedido...');
      setGerando(false);
      
      const response = await iniciarGeracaoPedidoAsync(
        guiaSelecionada.id,
        contratosSelecionados.length > 0 ? contratosSelecionados : undefined,
        false // não ignorar produtos sem contrato (já foi verificado)
      );
      
      // Fechar dialog de configuração
      onClose();
      
      // Abrir modal de progresso
      setCurrentJobId(response.job_id);
      setJobProgressOpen(true);
      
    } catch (error: any) {
      console.error('❌ Erro ao gerar pedido:', error);
      console.error('❌ Response data:', error.response?.data);
      const mensagem = error.response?.data?.error || error.response?.data?.mensagem || 'Erro ao gerar pedido';
      toast.error(mensagem);
      setGerando(false);
    }
  }

  async function handleConfirmarComSemContrato() {
    if (!guiaSelecionada) return;

    console.log('🚀 Confirmando geração com produtos sem contrato...');
    setMostrarConfirmacao(false);
    
    try {
      console.log('📞 Chamando iniciarGeracaoPedidoAsync...');
      // AQUI usar o sistema assíncrono com job
      const response = await iniciarGeracaoPedidoAsync(
        guiaSelecionada.id,
        contratosSelecionados.length > 0 ? contratosSelecionados : undefined,
        true // ignorar_sem_contrato
      );
      
      console.log('✅ Response recebida:', response);
      console.log('🆔 Job ID:', response.job_id);
      
      // Fechar dialog de configuração
      onClose();
      
      // Abrir modal de progresso
      console.log('🎬 Abrindo modal de progresso...');
      setCurrentJobId(response.job_id);
      setJobProgressOpen(true);
      console.log('✅ Estados atualizados - jobProgressOpen:', true, 'currentJobId:', response.job_id);
      
    } catch (error: any) {
      console.error('❌ Erro ao iniciar geração de pedido:', error);
      const mensagem = error.response?.data?.error || 'Erro ao iniciar geração de pedido';
      toast.error(mensagem);
    }
  }

  const handleJobComplete = (resultado: any) => {
    if (resultado) {
      // Notificação para pedido
      if (resultado.numero) {
        const avisoSemContrato = resultado.produtos_sem_contrato?.length > 0 
          ? ` (${resultado.produtos_sem_contrato.length} produtos sem contrato não incluídos)`
          : '';
        toast.success(`Pedido ${resultado.numero} gerado com sucesso!${avisoSemContrato}`);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  const handleCloseJobProgress = () => {
    setJobProgressOpen(false);
    setCurrentJobId(null);
    setContratosSelecionados([]);
    setProdutosMultiplosContratos([]);
    setProdutosSemContrato([]);
  };

  function handleCancelarConfirmacao() {
    setMostrarConfirmacao(false);
    setProdutosSemContrato([]);
    setProdutosComContrato(0);
  }

  function handleConfirmarSelecaoContratos(selecao: { produto_id: number; contrato_produto_id: number; quantidade?: number }[]) {
    setContratosSelecionados(selecao);
    setDialogSelecaoContratos(false);
    
    // Tentar gerar pedido novamente com a seleção
    setTimeout(() => handleGerar(), 100);
  }

  function handleCancelarSelecaoContratos() {
    setDialogSelecaoContratos(false);
    setProdutosMultiplosContratos([]);
    setContratosSelecionados([]);
  }

  const formatarCompetencia = (guia: any) => {
    if (guia.nome) return guia.nome;
    if (guia.competencia_mes_ano) return guia.competencia_mes_ano;
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[(guia.mes ?? 1) - 1]}/${guia.ano}`;
  };

  return (
    <>
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
          {mostrarConfirmacao ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Produtos sem contrato ativo
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {produtosSemContrato.length} produto(s) não possuem contrato ativo e serão ignorados.
                  Deseja continuar apenas com os {produtosComContrato} produtos que têm contrato?
                </Typography>
              </Alert>

              <Box sx={{ maxHeight: 300, overflowY: 'auto', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Produtos que serão ignorados:
                </Typography>
                {produtosSemContrato.map((produto, idx) => (
                  <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: 'white', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {produto.produto_nome}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Quantidade: {produto.quantidade.toFixed(2)} kg
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          ) : loading ? (
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
          {mostrarConfirmacao ? (
            <>
              <Button onClick={handleCancelarConfirmacao} disabled={gerando}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarComSemContrato}
                variant="contained"
                color="warning"
                disabled={gerando}
                startIcon={gerando ? <CircularProgress size={20} /> : <ShoppingCartIcon />}
              >
                {gerando ? 'Gerando...' : 'Continuar Mesmo Assim'}
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </DialogActions>
        
        {/* Dialog de Seleção de Múltiplos Contratos */}
        {console.log('🎨 Renderizando SelecionarContratosDialog:', { 
          open: dialogSelecaoContratos, 
          produtos: produtosMultiplosContratos.length 
        })}
        <SelecionarContratosDialog
          open={dialogSelecaoContratos}
          onClose={handleCancelarSelecaoContratos}
          produtos={produtosMultiplosContratos}
          onConfirmar={handleConfirmarSelecaoContratos}
        />
      </Dialog>
      
      {/* Modal de Progresso do Job - FORA do Dialog principal */}
      <JobProgressModal
        open={jobProgressOpen}
        jobId={currentJobId}
        onClose={handleCloseJobProgress}
        onComplete={handleJobComplete}
      />
    </>
  );
}
