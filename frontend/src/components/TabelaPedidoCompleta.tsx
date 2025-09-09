import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Collapse,
  IconButton,
  Grid,
  Divider,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  CheckCircle,
  Schedule,
  Warning,
  Receipt,
  Business,
  ShoppingCart
} from '@mui/icons-material';
import { formatarData, formatarPreco } from '../types/pedidos';

interface ItemPedido {
  id: number;
  produto_id: number;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  unidade: string;
  status_recebimento: 'RECEBIDO' | 'PENDENTE' | 'PARCIAL';
  quantidade_recebida: number;
}

interface FornecedorAgrupado {
  fornecedor_id: number;
  nome_fornecedor: string;
  status_geral: 'RECEBIDO' | 'PENDENTE' | 'PARCIAL';
  valor_total: number;
  progresso_recebimento: number;
  itens: ItemPedido[];
}

interface PedidoInfo {
  id: number;
  numero_pedido: string;
  data_pedido: string;
  valor_total: number;
  status: string;
  fornecedores: FornecedorAgrupado[];
  totalFornecedores: number;
}

interface TabelaPedidoCompletaProps {
  pedidoInfo: PedidoInfo;
}

const TabelaPedidoCompleta: React.FC<TabelaPedidoCompletaProps> = ({ pedidoInfo }) => {
  const [expandedFornecedores, setExpandedFornecedores] = useState<Set<number>>(new Set());

  // Função para formatar quantidades removendo zeros desnecessários
  const formatarQuantidade = (quantidade: number | string): string => {
    const num = typeof quantidade === 'string' ? parseFloat(quantidade) : quantidade;
    if (isNaN(num)) return '0';
    
    // Remove zeros desnecessários após o ponto decimal
    return num % 1 === 0 ? num.toString() : num.toFixed(3).replace(/\.?0+$/, '');
  };

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
      case 'RECEBIDO':
        return 'success';
      case 'FATURADO':
        return 'info';
      case 'PARCIAL':
        return 'warning';
      case 'PENDENTE':
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RECEBIDO':
        return <CheckCircle />;
      case 'FATURADO':
        return <Receipt />;
      case 'PARCIAL':
        return <Warning />;
      case 'PENDENTE':
      default:
        return <Schedule />;
    }
  };

  return (
    <Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Fornecedor
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Status
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Progresso
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Valor Total
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pedidoInfo.fornecedores.map((fornecedor) => (
              <React.Fragment key={fornecedor.fornecedor_id}>
                <TableRow hover sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => toggleFornecedor(fornecedor.fornecedor_id)}
                    >
                      {expandedFornecedores.has(fornecedor.fornecedor_id) ? 
                        <KeyboardArrowUp /> : <KeyboardArrowDown />
                      }
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: getStatusColor(fornecedor.status_geral) + '.main', width: 32, height: 32 }}>
                        <Business fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {fornecedor.nome_fornecedor}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {fornecedor.itens.length} {fornecedor.itens.length === 1 ? 'item' : 'itens'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={getStatusIcon(fornecedor.status_geral)}
                      label={fornecedor.status_geral}
                      color={getStatusColor(fornecedor.status_geral)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ width: 100 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={fornecedor.progresso_recebimento} 
                        color={fornecedor.progresso_recebimento === 100 ? 'success' : 'primary'}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {fornecedor.progresso_recebimento.toFixed(0)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {formatarPreco(fornecedor.valor_total)}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={expandedFornecedores.has(fornecedor.fornecedor_id)} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2 }}>
                        <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 600 }}>
                          Itens do Pedido
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Produto</TableCell>
                              <TableCell align="center">Quantidade</TableCell>
                              <TableCell align="center">Unidade</TableCell>
                              <TableCell align="center">Recebido</TableCell>
                              <TableCell align="center">Status</TableCell>
                              <TableCell align="right">Preço Unit.</TableCell>
                              <TableCell align="right">Subtotal</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {fornecedor.itens.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {item.nome_produto}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2">
                                    {formatarQuantidade(item.quantidade)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2">
                                    {item.unidade}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography 
                                    variant="body2" 
                                    color={item.quantidade_recebida === item.quantidade ? 'success.main' : 'warning.main'}
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {formatarQuantidade(item.quantidade_recebida)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={item.status_recebimento}
                                    color={getStatusColor(item.status_recebimento)}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2">
                                    {formatarPreco(item.preco_unitario)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {formatarPreco(item.subtotal)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TabelaPedidoCompleta;