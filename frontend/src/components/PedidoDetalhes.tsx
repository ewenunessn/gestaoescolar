import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Container,
  LinearProgress
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  Schedule,
  Warning,
  Close
} from '@mui/icons-material';

import { PedidoModerno, formatarData, formatarPreco, getCorStatus } from '../types/pedidos';
import PedidoValidationAlert from './PedidoValidationAlert';
import { pedidoModernoService } from '../services/pedidoModernoService';
import { recebimentoSimplificadoService } from '../services/recebimentoSimplificadoService';
import { EstatisticasRecebimento, ItemRecebimento } from '../types/recebimentoSimplificado';
import TabelaPedidoCompleta from './TabelaPedidoCompleta';

interface PedidoDetalhesProps {
  pedidoId: number;
  onClose?: () => void;
}

interface PedidoDetalhado extends PedidoModerno {
  itens?: Array<{
    id: number;
    produto_id: number;
    nome_produto: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
    unidade: string;
    nome_fornecedor: string;
    fornecedor_id: number;
  }>;

}

const PedidoDetalhes: React.FC<PedidoDetalhesProps> = ({ pedidoId, onClose }) => {
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingRecebimento, setLoadingRecebimento] = useState(false);
  const [estatisticasRecebimento, setEstatisticasRecebimento] = useState<EstatisticasRecebimento | null>(null);
  const [itensRecebimento, setItensRecebimento] = useState<ItemRecebimento[]>([]);

  // Função para formatar quantidades removendo zeros desnecessários
  const formatarQuantidade = (quantidade: number | string): string => {
    const num = typeof quantidade === 'string' ? parseFloat(quantidade) : quantidade;
    if (isNaN(num)) return '0';
    
    // Remove zeros desnecessários após o ponto decimal
    return num % 1 === 0 ? num.toString() : num.toFixed(3).replace(/\.?0+$/, '');
  };
  




   const getProgressColor = (percentage: number) => {
     if (percentage === 100) return 'success';
     if (percentage >= 70) return 'info';
     if (percentage >= 40) return 'warning';
     return 'error';
   };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Carregar detalhes do pedido
  const carregarPedido = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await pedidoModernoService.buscarPedido(pedidoId);
      
      if (response.success && response.data) {
        const { pedido: pedidoInfo, itens } = response.data;
        
        setPedido({
          ...pedidoInfo,
          itens: itens || []
        });
        
        // Carregar dados de recebimento em paralelo
        await carregarDadosRecebimento();
      } else {
        setError('Erro ao carregar pedido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar pedido:', err);
      setError(err.message || 'Erro de conexão ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados de recebimento
  const carregarDadosRecebimento = async () => {
    setLoadingRecebimento(true);
    
    try {
      console.log(`🔄 Carregando dados de recebimento para pedido ${pedidoId}...`);
      
      // Tentar carregar estatísticas de recebimento
      const estatisticas = await recebimentoSimplificadoService.buscarEstatisticas(pedidoId);
      console.log('📊 DEBUG - Estatísticas carregadas:', estatisticas);
      setEstatisticasRecebimento(estatisticas);
      
      // Tentar carregar itens de recebimento
      const { itens, estatisticas: estatisticasItens } = await recebimentoSimplificadoService.listarItensPedido(pedidoId);
      console.log('📦 DEBUG - Itens de recebimento carregados:', {
        quantidade_itens: itens.length,
        itens: itens,
        estatisticas_itens: estatisticasItens
      });
      setItensRecebimento(itens);
      
      // Se as estatísticas dos itens estão disponíveis, usar elas também
      if (estatisticasItens && Object.keys(estatisticasItens).length > 0) {
        console.log('📊 DEBUG - Usando estatísticas dos itens:', estatisticasItens);
        setEstatisticasRecebimento(estatisticasItens);
      }
      
    } catch (err: any) {
      console.log('⚠️ Dados de recebimento não disponíveis para este pedido:', err.message);
      console.error('❌ Erro completo:', err);
      // Não é um erro crítico, apenas não mostra a seção de recebimento
      setEstatisticasRecebimento(null);
      setItensRecebimento([]);
    } finally {
      setLoadingRecebimento(false);
    }
  };

  useEffect(() => {
    carregarPedido();
  }, [pedidoId]);

  // Funções auxiliares para status de recebimento
  const getStatusRecebimentoColor = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'error';
      case 'PARCIAL': return 'warning';
      case 'RECEBIDO': return 'success';
      default: return 'default';
    }
  };

  const getStatusRecebimentoIcon = (status: string) => {
    switch (status) {
      case 'PENDENTE': return <Schedule />;
      case 'PARCIAL': return <Warning />;
      case 'RECEBIDO': return <CheckCircle />;
      default: return <Schedule />;
    }
  };

  const getStatusRecebimentoLabel = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'Pendente';
      case 'PARCIAL': return 'Parcial';
      case 'RECEBIDO': return 'Recebido';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
        <Typography sx={{ ml: 2 }}>Carregando detalhes do pedido...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={carregarPedido} sx={{ ml: 2 }}>
          Tentar Novamente
        </Button>
      </Alert>
    );
  }

  if (!pedido) {
    return (
      <Alert severity="warning">
        Pedido não encontrado
        <Button onClick={carregarPedido} sx={{ ml: 2 }}>
          Tentar Novamente
        </Button>
      </Alert>
    );
  }

  console.log('Renderizando pedido:', pedido);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Simples */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
            {/* Header Principal */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                  Pedido #{pedido.numero_pedido}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                   <Typography variant="body2" color="text.secondary">
                     Usuário: {pedido.nome_usuario || 'Não informado'}
                   </Typography>
                   <Typography variant="body2" color="text.secondary">
                     Data: {formatarData(pedido.data_criacao)}
                   </Typography>
                   <Chip 
                     label={pedido.status} 
                     color={pedido.status === 'ATIVO' ? 'success' : 'default'}
                     size="small"
                   />
                 </Box>
              </Box>
              
              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    carregarPedido();
                    carregarDadosRecebimento();
                  }} 
                  disabled={loading || loadingRecebimento}
                  startIcon={<Refresh />}
                >
                  Atualizar
                </Button>
                {onClose && (
                  <Button 
                    variant="outlined"
                    size="small"
                    onClick={onClose}
                    startIcon={<Close />}
                  >
                    Fechar
                  </Button>
                )}
              </Box>
            </Box>
            

          </CardContent>
        </Card>
        
      {/* Alerta de Validação */}
      <PedidoValidationAlert 
        pedidoId={pedidoId} 
        autoValidate={true}
        showDetails={true}
      />




      {pedido && (
        <TabelaPedidoCompleta 
          pedidoInfo={{
            numero_pedido: pedido.numero_pedido,
            data_criacao: pedido.data_criacao,
            nome_usuario: pedido.nome_usuario || 'Não informado',
            valor_total: pedido.valor_total || 0,
            status: pedido.status,
            fornecedores: pedido.itens ? 
              Object.values(
                pedido.itens.reduce((acc, item) => {
                  const fornecedorId = item.fornecedor_id;
                          if (!acc[fornecedorId]) {
                              acc[fornecedorId] = {
                              fornecedor_id: fornecedorId,
                              nome_fornecedor: item.nome_fornecedor,
                              status_geral: 'PENDENTE' as const,
                              valor_total: 0,
                              itens: [],
                              progresso_recebimento: 0
                            };
                          }
                          
                          // Buscar dados de recebimento para este item
                          // Primeiro tenta match por pedido_item_id (mais preciso)
                          let itemRecebimento = itensRecebimento.find(ir => 
                            ir.pedido_item_id === item.id
                          );
                          
                          // Se não encontrar, tenta match por produto_id e fornecedor_id
                          if (!itemRecebimento) {
                            itemRecebimento = itensRecebimento.find(ir => 
                              ir.produto_id === item.produto_id && 
                              ir.fornecedor_id === item.fornecedor_id
                            );
                          }
                          
                          console.log(`🔍 DEBUG - Item ${item.nome_produto}:`, {
                            item_id: item.id,
                            produto_id: item.produto_id,
                            fornecedor_id: item.fornecedor_id,
                            quantidade_esperada: item.quantidade,
                            itemRecebimento: itemRecebimento,
                            itensRecebimento_length: itensRecebimento.length,
                            match_method: itemRecebimento ? 
                              (itensRecebimento.find(ir => ir.pedido_item_id === item.id) ? 'pedido_item_id' : 'produto_fornecedor') 
                              : 'no_match'
                          });
                          
                          const statusItem = itemRecebimento ? 
                            (parseFloat(itemRecebimento.quantidade_recebida.toString()) >= parseFloat(item.quantidade.toString()) ? 'RECEBIDO' :
                             parseFloat(itemRecebimento.quantidade_recebida.toString()) > 0 ? 'PARCIAL' : 'PENDENTE') as const
                            : 'PENDENTE' as const;
                          
                          console.log(`🔍 DEBUG - Status calculado para ${item.nome_produto}:`, {
                            status: statusItem,
                            quantidade_recebida: itemRecebimento?.quantidade_recebida || 0,
                            quantidade_esperada: item.quantidade
                          });
                          
                          acc[fornecedorId].itens.push({
                            id: item.id,
                            produto_id: item.produto_id,
                            nome_produto: item.nome_produto,
                            quantidade: item.quantidade,
                            preco_unitario: item.preco_unitario,
                            subtotal: item.subtotal,
                            unidade: item.unidade,
                            status_recebimento: statusItem,
                            quantidade_recebida: itemRecebimento ? parseFloat(itemRecebimento.quantidade_recebida.toString()) : 0
                          });
                          
                          acc[fornecedorId].valor_total += item.subtotal;
                          
                          return acc;
                        }, {} as Record<number, any>)
                      ).map(fornecedor => {
                        const totalItens = fornecedor.itens.length;
                        const itensRecebidos = fornecedor.itens.filter((item: any) => item.status_recebimento === 'RECEBIDO').length;
                        const itensParciais = fornecedor.itens.filter((item: any) => item.status_recebimento === 'PARCIAL').length;
                        
                        const statusGeral = itensRecebidos === totalItens ? 'RECEBIDO' as const :
                                          (itensRecebidos > 0 || itensParciais > 0) ? 'PARCIAL' as const :
                                          'PENDENTE' as const;
                        
                        // Calcular progresso baseado no valor recebido vs valor total
                        const valorTotalFornecedor = fornecedor.valor_total;
                        const valorRecebidoFornecedor = fornecedor.itens.reduce((acc: number, item: any) => {
                          const percentualRecebido = item.quantidade > 0 ? (item.quantidade_recebida / item.quantidade) : 0;
                          return acc + (item.subtotal * Math.min(percentualRecebido, 1)); // Limita a 100%
                        }, 0);
                        
                        const progresso = valorTotalFornecedor > 0 ? (valorRecebidoFornecedor / valorTotalFornecedor) * 100 : 0;
                        
                        return {
                          ...fornecedor,
                          status_geral: statusGeral,
                          progresso_recebimento: progresso
                        };
                      })
                      : []
                  }}
                />
        )}




    </Container>
  );
};

export default PedidoDetalhes;