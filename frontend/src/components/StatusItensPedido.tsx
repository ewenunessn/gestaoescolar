import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Grid,
  Divider,
  Collapse,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Schedule,
  LocalShipping,
  Warning,
  Business
} from '@mui/icons-material';
import { pedidoModernoService } from '../services/pedidoModernoService';

interface StatusItensPedidoProps {
  pedidoId: number;
  numeroPedido: string;
}

interface ItemStatus {
  pedido_item_id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  nome_produto: string;
  unidade: string;
  nome_fornecedor: string;
  fornecedor_id: number;
  status_fornecedor: string;
  status_recebimento: string;
  quantidade_esperada: number;
  quantidade_recebida: number;
  quantidade_pendente: number;
  valor_total_recebido: number;
  recebimento_id?: number;
  numero_recebimento?: string;
  status_recebimento_geral?: string;
  percentual_recebido: number;
  status_entrega?: string;
}

interface FornecedorStatus {
  fornecedor: {
    id: number;
    nome: string;
    status: string;
  };
  itens: ItemStatus[];
  resumo: {
    total_itens: number;
    itens_nao_iniciados: number;
    itens_pendentes: number;
    itens_parciais: number;
    itens_completos: number;
    valor_total_esperado: number;
    valor_total_recebido: number;
    percentual_geral: number;
  };
}

const StatusItensPedido: React.FC<StatusItensPedidoProps> = ({ pedidoId, numeroPedido }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fornecedores, setFornecedores] = useState<{ [key: number]: FornecedorStatus }>({});
  const [expandedFornecedores, setExpandedFornecedores] = useState<Set<number>>(new Set());

  const carregarStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await pedidoModernoService.buscarStatusItensPedido(pedidoId);
      
      if (response && response.success && response.data) {
        setFornecedores(response.data.itensPorFornecedor || {});
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (err: any) {
      console.error('Erro ao carregar status dos itens:', err);
      
      // Tentar carregar dados básicos do pedido como fallback
      try {
        const pedidoResponse = await pedidoModernoService.buscarPedido(pedidoId);
        if (pedidoResponse.success && pedidoResponse.data) {
          // Criar estrutura básica com os dados disponíveis
          const fornecedoresBasicos: any = {};
          const itens = pedidoResponse.data.itens || [];
          
          itens.forEach((item: any) => {
            const fornecedorId = item.fornecedor_id || 0;
            if (!fornecedoresBasicos[fornecedorId]) {
              fornecedoresBasicos[fornecedorId] = {
                fornecedor: {
                  id: fornecedorId,
                  nome: item.nome_fornecedor || 'Fornecedor não encontrado',
                  status: 'PENDENTE'
                },
                itens: [],
                resumo: {
                  total_itens: 0,
                  itens_nao_iniciados: 0,
                  itens_pendentes: 0,
                  itens_parciais: 0,
                  itens_completos: 0,
                  valor_total_esperado: 0,
                  valor_total_recebido: 0,
                  percentual_geral: 0
                }
              };
            }
            
            fornecedoresBasicos[fornecedorId].itens.push({
              pedido_item_id: item.id,
              produto_id: item.produto_id,
              quantidade: item.quantidade || 0,
              preco_unitario: item.preco_unitario || 0,
              subtotal: item.subtotal || 0,
              nome_produto: item.nome_produto || 'Produto não encontrado',
              unidade: item.unidade || 'UN',
              nome_fornecedor: item.nome_fornecedor || 'Fornecedor não encontrado',
              fornecedor_id: fornecedorId,
              status_fornecedor: 'PENDENTE',
              status_recebimento: 'NAO_INICIADO',
              quantidade_recebida: 0,
              quantidade_pendente: item.quantidade || 0,
              valor_total_recebido: 0,
              percentual_recebido: 0
            });
            
            fornecedoresBasicos[fornecedorId].resumo.total_itens++;
            fornecedoresBasicos[fornecedorId].resumo.itens_nao_iniciados++;
            fornecedoresBasicos[fornecedorId].resumo.valor_total_esperado += item.subtotal || 0;
          });
          
          setFornecedores(fornecedoresBasicos);
          setError('Dados carregados em modo básico (algumas funcionalidades podem estar limitadas)');
        } else {
          setError('Erro ao carregar dados do pedido');
        }
      } catch (fallbackErr) {
        console.error('Erro no fallback:', fallbackErr);
        setError('Erro ao carregar status dos itens do pedido');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarStatus();
  }, [pedidoId]);

  const toggleFornecedor = (fornecedorId: number) => {
    const newExpanded = new Set(expandedFornecedores);
    if (newExpanded.has(fornecedorId)) {
      newExpanded.delete(fornecedorId);
    } else {
      newExpanded.add(fornecedorId);
    }
    setExpandedFornecedores(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETO':
      case 'ENTREGUE':
        return 'success';
      case 'PARCIAL':
        return 'warning';
      case 'PENDENTE':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETO':
      case 'ENTREGUE':
        return <CheckCircle sx={{ fontSize: 16 }} />;
      case 'PARCIAL':
        return <LocalShipping sx={{ fontSize: 16 }} />;
      case 'PENDENTE':
        return <Schedule sx={{ fontSize: 16 }} />;
      default:
        return <Schedule sx={{ fontSize: 16 }} />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  const fornecedoresList = Object.entries(fornecedores);

  if (fornecedoresList.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Nenhum item encontrado para este pedido
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Status de Entrega - {numeroPedido}
      </Typography>

      {fornecedoresList.map(([fornecedorId, fornecedor]) => {
        const isExpanded = expandedFornecedores.has(Number(fornecedorId));
        
        return (
          <Card key={fornecedorId} sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
            <CardContent sx={{ p: 2 }}>
              {/* Header do Fornecedor */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => toggleFornecedor(Number(fornecedorId))}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Business sx={{ color: '#1976d2' }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {fornecedor.fornecedor.nome}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5 }}>
                      <Chip
                        icon={getStatusIcon(fornecedor.fornecedor.status)}
                        label={fornecedor.fornecedor.status}
                        size="small"
                        color={getStatusColor(fornecedor.fornecedor.status) as any}
                        sx={{ fontWeight: 500 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {fornecedor.resumo.itens_completos}/{fornecedor.resumo.total_itens} itens entregues
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(fornecedor.resumo.valor_total_recebido)} de {formatCurrency(fornecedor.resumo.valor_total_esperado)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ minWidth: 100 }}>
                    <LinearProgress
                      variant="determinate"
                      value={fornecedor.resumo.percentual_geral}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                      {fornecedor.resumo.percentual_geral.toFixed(1)}%
                    </Typography>
                  </Box>
                  <IconButton size="small">
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              </Box>

              {/* Detalhes dos Itens */}
              <Collapse in={isExpanded}>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  {fornecedor.itens.map((item) => (
                    <Grid item xs={12} key={item.pedido_item_id}>
                      <Card sx={{ bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                {item.nome_produto}
                              </Typography>
                              
                              <Grid container spacing={2}>
                                <Grid item xs={6} md={3}>
                                  <Typography variant="caption" color="text.secondary">
                                    Quantidade Pedida
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {item.quantidade} {item.unidade}
                                  </Typography>
                                </Grid>
                                
                                <Grid item xs={6} md={3}>
                                  <Typography variant="caption" color="text.secondary">
                                    Quantidade Recebida
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#2e7d32' }}>
                                    {item.quantidade_recebida} {item.unidade}
                                  </Typography>
                                </Grid>
                                
                                <Grid item xs={6} md={3}>
                                  <Typography variant="caption" color="text.secondary">
                                    Quantidade Pendente
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#ed6c02' }}>
                                    {item.quantidade_pendente} {item.unidade}
                                  </Typography>
                                </Grid>
                                
                                <Grid item xs={6} md={3}>
                                  <Typography variant="caption" color="text.secondary">
                                    Valor Recebido
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {formatCurrency(item.valor_total_recebido)}
                                  </Typography>
                                </Grid>
                              </Grid>

                              {item.numero_recebimento && (
                                <Box sx={{ mt: 1, p: 1, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Recebimento: 
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500, ml: 1 }}>
                                    {item.numero_recebimento} ({item.status_recebimento_geral})
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            
                            <Box sx={{ ml: 2 }}>
                              <Chip
                                icon={getStatusIcon(item.status_entrega || 'PENDENTE')}
                                label={item.status_entrega || 'PENDENTE'}
                                size="small"
                                color={getStatusColor(item.status_entrega || 'PENDENTE') as any}
                                sx={{ fontWeight: 500 }}
                              />
                              <Box sx={{ mt: 1, minWidth: 60 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={item.percentual_recebido}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                                  {item.percentual_recebido.toFixed(1)}%
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Collapse>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default StatusItensPedido;