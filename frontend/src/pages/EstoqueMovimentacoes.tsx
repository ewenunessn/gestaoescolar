import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CircularProgress,
  Alert
} from "@mui/material";
import {
  ArrowBack,
  Search,
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Warning,
  Delete
} from "@mui/icons-material";
import {
  getMovimentacoesProduto,
  formatarQuantidade,
  formatarDataHora,
  getTipoMovimentacaoColor,
  getTipoMovimentacaoLabel,
  type MovimentacaoEstoque
} from "../services/estoqueCentralService";
import { buscarProduto } from "../services/produtos";
import { useToast } from "../hooks/useToast";

const EstoqueMovimentacoes: React.FC = () => {
  const { produto_id } = useParams<{ produto_id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Estados
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [produto, setProduto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    if (produto_id) {
      carregarDados();
    }
  }, [produto_id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const produtoIdNum = parseInt(produto_id!);
      
      const [movimentacoesData, produtoData] = await Promise.all([
        getMovimentacoesProduto(produtoIdNum, 100), // Últimas 100 movimentações
        buscarProduto(produtoIdNum)
      ]);
      
      setMovimentacoes(movimentacoesData);
      setProduto(produtoData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showToast("error", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar movimentações
  const movimentacoesFiltradas = movimentacoes.filter(mov => {
    const matchBusca = busca === "" || 
      mov.motivo.toLowerCase().includes(busca.toLowerCase()) ||
      mov.lote?.toLowerCase().includes(busca.toLowerCase()) ||
      mov.usuario_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      mov.documento_referencia?.toLowerCase().includes(busca.toLowerCase());
    
    const matchTipo = filtroTipo === "" || mov.tipo === filtroTipo;
    
    return matchBusca && matchTipo;
  });

  // Calcular estatísticas
  const calcularEstatisticas = () => {
    const entradas = movimentacoes.filter(m => m.tipo === 'entrada');
    const saidas = movimentacoes.filter(m => m.tipo === 'saida');
    const ajustes = movimentacoes.filter(m => m.tipo === 'ajuste');
    const perdas = movimentacoes.filter(m => m.tipo === 'perda');

    return {
      totalEntradas: entradas.reduce((sum, m) => sum + m.quantidade, 0),
      totalSaidas: saidas.reduce((sum, m) => sum + m.quantidade, 0),
      totalAjustes: ajustes.length,
      totalPerdas: perdas.reduce((sum, m) => sum + m.quantidade, 0),
      ultimaMovimentacao: movimentacoes.length > 0 ? movimentacoes[0].data_movimentacao : null
    };
  };

  const getIconeTipo = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <TrendingUp />;
      case 'saida':
        return <TrendingDown />;
      case 'ajuste':
        return <SwapHoriz />;
      case 'transferencia':
        return <SwapHoriz />;
      case 'perda':
        return <Warning />;
      default:
        return <SwapHoriz />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!produto) {
    return (
      <Box>
        <Alert severity="error">Produto não encontrado</Alert>
      </Box>
    );
  }

  const estatisticas = calcularEstatisticas();

  return (
    <Box>
      {/* Cabeçalho */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate(`/estoque-moderno/produtos/${produto_id}/lotes`)}>
          <ArrowBack />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Movimentações - {produto.nome}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Histórico completo de movimentações do produto
          </Typography>
        </Box>
      </Box>

      {/* Cards de estatísticas */}
      <Box display="flex" gap={2} mb={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <TrendingUp color="success" />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {formatarQuantidade(estatisticas.totalEntradas, produto.unidade)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Entradas
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <TrendingDown color="info" />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {formatarQuantidade(estatisticas.totalSaidas, produto.unidade)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Saídas
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Warning color="error" />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {formatarQuantidade(estatisticas.totalPerdas, produto.unidade)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Perdas
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <SwapHoriz color="warning" />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {estatisticas.totalAjustes}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Ajustes
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Filtros */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Buscar por motivo, lote, usuário..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />
        
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Tipo de Movimentação</InputLabel>
          <Select
            value={filtroTipo}
            label="Tipo de Movimentação"
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="entrada">Entrada</MenuItem>
            <MenuItem value="saida">Saída</MenuItem>
            <MenuItem value="ajuste">Ajuste</MenuItem>
            <MenuItem value="transferencia">Transferência</MenuItem>
            <MenuItem value="perda">Perda</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Tabela de movimentações */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data/Hora</TableCell>
              <TableCell align="center">Tipo</TableCell>
              <TableCell>Lote</TableCell>
              <TableCell align="right">Quantidade</TableCell>
              <TableCell align="right">Qtd. Anterior</TableCell>
              <TableCell align="right">Qtd. Posterior</TableCell>
              <TableCell>Motivo</TableCell>
              <TableCell>Rastreabilidade</TableCell>
              <TableCell>Usuário</TableCell>
              <TableCell>Observações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movimentacoesFiltradas.map((movimentacao) => (
              <TableRow key={movimentacao.id}>
                <TableCell>
                  <Typography variant="body2">
                    {formatarDataHora(movimentacao.data_movimentacao)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    {getIconeTipo(movimentacao.tipo)}
                    <Chip
                      label={getTipoMovimentacaoLabel(movimentacao.tipo)}
                      size="small"
                      color={getTipoMovimentacaoColor(movimentacao.tipo) as any}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {movimentacao.lote || '-'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    color={
                      movimentacao.tipo === 'entrada' ? 'success.main' :
                      movimentacao.tipo === 'saida' ? 'info.main' :
                      movimentacao.tipo === 'perda' ? 'error.main' : 'text.primary'
                    }
                  >
                    {movimentacao.tipo === 'entrada' ? '+' : '-'}
                    {formatarQuantidade(movimentacao.quantidade, produto.unidade)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {formatarQuantidade(movimentacao.quantidade_anterior, produto.unidade)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {formatarQuantidade(movimentacao.quantidade_posterior, produto.unidade)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {movimentacao.motivo}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    {movimentacao.tipo === 'entrada' && movimentacao.numero_recebimento && (
                      <Box>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          📦 {movimentacao.numero_recebimento}
                        </Typography>
                        {movimentacao.numero_pedido && (
                          <Typography variant="caption" color="text.secondary">
                            Pedido: {movimentacao.numero_pedido}
                          </Typography>
                        )}
                        {movimentacao.usuario_recebedor_nome && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Recebido por: {movimentacao.usuario_recebedor_nome}
                          </Typography>
                        )}
                      </Box>
                    )}
                    {movimentacao.documento_referencia && movimentacao.tipo !== 'entrada' && (
                      <Typography variant="body2" color="text.secondary">
                        {movimentacao.documento_referencia}
                      </Typography>
                    )}
                    {!movimentacao.numero_recebimento && !movimentacao.documento_referencia && (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {movimentacao.usuario_nome || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {movimentacao.observacoes || '-'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {movimentacoesFiltradas.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            {busca || filtroTipo ? 
              "Nenhuma movimentação encontrada com os filtros aplicados." : 
              "Nenhuma movimentação registrada para este produto."
            }
          </Typography>
        </Box>
      )}

      {movimentacoesFiltradas.length > 0 && (
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Mostrando {movimentacoesFiltradas.length} de {movimentacoes.length} movimentações
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default EstoqueMovimentacoes;