import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch
} from "@mui/material";
import {
  Search,
  Inventory,
  Warning,
  TrendingUp,
  TrendingDown,
  Add,
  Visibility,
  History,
  Refresh,
  FilterList
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  getPosicaoEstoque,
  getAlertas,
  atualizarAlertas,
  criarLoteEstoque,
  formatarQuantidade,
  formatarData,
  calcularDiasParaVencimento,
  isVencimentoProximo,
  isVencido,
  type EstoquePosicao,
  type AlertaEstoque
} from "../services/estoqueModernoService";
import { useToast } from "../hooks/useToast";

const EstoqueModerno: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // Estados principais
  const [posicoes, setPosicoes] = useState<EstoquePosicao[]>([]);
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  
  // Estados do modal de entrada
  const [modalEntrada, setModalEntrada] = useState(false);
  const [novaEntrada, setNovaEntrada] = useState({
    produto_id: "",
    lote: "",
    quantidade: "",
    data_fabricacao: "",
    data_validade: "",

    observacoes: ""
  });

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  // Recarregar quando a opção mostrarTodos mudar
  useEffect(() => {
    carregarDados();
  }, [mostrarTodos]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [posicoesData, alertasData] = await Promise.all([
        getPosicaoEstoque(mostrarTodos),
        getAlertas()
      ]);
      
      setPosicoes(posicoesData);
      setAlertas(alertasData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showToast("Erro ao carregar dados do estoque", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarAlertas = async () => {
    try {
      await atualizarAlertas();
      await carregarDados();
      showToast("Alertas atualizados com sucesso", "success");
    } catch (error) {
      console.error("Erro ao atualizar alertas:", error);
      showToast("Erro ao atualizar alertas", "error");
    }
  };

  const handleCriarEntrada = async () => {
    try {
      if (!novaEntrada.produto_id || !novaEntrada.lote || !novaEntrada.quantidade) {
        showToast("Preencha os campos obrigatórios", "warning");
        return;
      }

      await criarLoteEstoque({
        produto_id: parseInt(novaEntrada.produto_id),
        lote: novaEntrada.lote,
        quantidade: parseFloat(novaEntrada.quantidade),
        data_fabricacao: novaEntrada.data_fabricacao || undefined,
        data_validade: novaEntrada.data_validade || undefined,
  
        observacoes: novaEntrada.observacoes || undefined
      });

      setModalEntrada(false);
      setNovaEntrada({
        produto_id: "",
        lote: "",
        quantidade: "",
        data_fabricacao: "",
        data_validade: "",
  
        observacoes: ""
      });
      
      await carregarDados();
      showToast("Entrada registrada com sucesso", "success");
    } catch (error: any) {
      console.error("Erro ao criar entrada:", error);
      showToast(error.response?.data?.message || "Erro ao registrar entrada", "error");
    }
  };

  // Filtrar posições
  const posicoesFiltradas = posicoes.filter(posicao =>
    posicao.produto_nome.toLowerCase().includes(busca.toLowerCase())
  );

  // Calcular estatísticas
  const estatisticas = {
    totalProdutos: posicoes.length,
    produtosComEstoque: posicoes.filter(p => Number(p.quantidade_disponivel) > 0).length,
    produtosVencidos: posicoes.filter(p => Number(p.quantidade_vencida) > 0).length,
    alertasCriticos: alertas.filter(a => a.nivel === 'critical').length,
    alertasAvisos: alertas.filter(a => a.nivel === 'warning').length
  };

  const getStatusProduto = (posicao: EstoquePosicao) => {
    const quantidadeVencida = Number(posicao.quantidade_vencida) || 0;
    const quantidadeDisponivel = Number(posicao.quantidade_disponivel) || 0;
    
    if (quantidadeVencida > 0) return { color: 'error', label: 'Com Vencidos' };
    if (quantidadeDisponivel === 0) return { color: 'error', label: 'Sem Estoque' };
    if (posicao.proximo_vencimento && isVencimentoProximo(posicao.proximo_vencimento)) {
      return { color: 'warning', label: 'Vence em Breve' };
    }
    return { color: 'success', label: 'Normal' };
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
      {/* Cabeçalho */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Estoque Moderno
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleAtualizarAlertas}
          >
            Atualizar Alertas
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setModalEntrada(true)}
          >
            Nova Entrada
          </Button>
        </Box>
      </Box>

      {/* Alertas críticos */}
      {alertas.filter(a => a.nivel === 'critical').length > 0 && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => navigate("/estoque-moderno/alertas")}
            >
              Ver Alertas
            </Button>
          }
        >
          <Typography variant="subtitle2" fontWeight="bold">
            {alertas.filter(a => a.nivel === 'critical').length} alertas críticos encontrados!
          </Typography>
          <Typography variant="body2">
            Verifique produtos vencidos e sem estoque na seção de alertas.
          </Typography>
        </Alert>
      )}

      {/* Cards de estatísticas */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Inventory color="primary" />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {estatisticas.totalProdutos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Produtos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <TrendingUp color="success" />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {estatisticas.produtosComEstoque}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Com Estoque
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <TrendingDown color="error" />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {estatisticas.produtosVencidos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Com Vencidos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            onClick={() => navigate("/estoque-moderno/alertas")}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Warning color="warning" />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {estatisticas.alertasCriticos + estatisticas.alertasAvisos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Alertas Ativos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>


      </Grid>

      {/* Busca e Filtros */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center" gap={1}>
              <FilterList color="action" />
              <FormControlLabel
                control={
                  <Switch
                    checked={mostrarTodos}
                    onChange={(e) => setMostrarTodos(e.target.checked)}
                    color="primary"
                  />
                }
                label="Mostrar todos os produtos"
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Tabela de posições */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Produto</TableCell>
              <TableCell align="right">Qtd. Disponível</TableCell>
              <TableCell align="right">Qtd. Vencida</TableCell>
              <TableCell align="center">Lotes Ativos</TableCell>
              <TableCell>Próximo Vencimento</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {posicoesFiltradas.map((posicao) => {
              const status = getStatusProduto(posicao);
              const diasVencimento = calcularDiasParaVencimento(posicao.proximo_vencimento);
              
              return (
                <TableRow key={posicao.produto_id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {posicao.produto_nome}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Unidade: {posicao.produto_unidade}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formatarQuantidade(posicao.quantidade_disponivel, posicao.produto_unidade)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {Number(posicao.quantidade_vencida) > 0 ? (
                      <Typography variant="body2" color="error" fontWeight="bold">
                        {formatarQuantidade(posicao.quantidade_vencida, posicao.produto_unidade)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={posicao.lotes_ativos}
                      size="small"
                      color={posicao.lotes_ativos > 0 ? "primary" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    {posicao.proximo_vencimento ? (
                      <Box>
                        <Typography variant="body2">
                          {formatarData(posicao.proximo_vencimento)}
                        </Typography>
                        {diasVencimento !== null && (
                          <Typography
                            variant="caption"
                            color={
                              diasVencimento < 0 ? "error" :
                              diasVencimento <= 7 ? "warning" : "text.secondary"
                            }
                          >
                            {diasVencimento < 0 ? `Vencido há ${Math.abs(diasVencimento)} dias` :
                             diasVencimento === 0 ? "Vence hoje" :
                             `${diasVencimento} dias`}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={status.label}
                      size="small"
                      color={status.color as any}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={1}>
                      <Tooltip title="Ver Lotes">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/estoque-moderno/produtos/${posicao.produto_id}/lotes`)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Movimentações">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/estoque-moderno/produtos/${posicao.produto_id}/movimentacoes`)}
                        >
                          <History />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {posicoesFiltradas.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            {busca ? "Nenhum produto encontrado com o termo pesquisado." : "Nenhum produto em estoque."}
          </Typography>
        </Box>
      )}

      {/* Modal de Nova Entrada */}
      <Dialog open={modalEntrada} onClose={() => setModalEntrada(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Entrada de Estoque</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="ID do Produto *"
              type="number"
              value={novaEntrada.produto_id}
              onChange={(e) => setNovaEntrada({ ...novaEntrada, produto_id: e.target.value })}
              fullWidth
            />
            <TextField
              label="Número do Lote *"
              value={novaEntrada.lote}
              onChange={(e) => setNovaEntrada({ ...novaEntrada, lote: e.target.value })}
              fullWidth
            />
            <TextField
              label="Quantidade *"
              type="number"
              value={novaEntrada.quantidade}
              onChange={(e) => setNovaEntrada({ ...novaEntrada, quantidade: e.target.value })}
              fullWidth
            />
            <TextField
              label="Data de Fabricação"
              type="date"
              value={novaEntrada.data_fabricacao}
              onChange={(e) => setNovaEntrada({ ...novaEntrada, data_fabricacao: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Data de Validade"
              type="date"
              value={novaEntrada.data_validade}
              onChange={(e) => setNovaEntrada({ ...novaEntrada, data_validade: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Observações"
              multiline
              rows={3}
              value={novaEntrada.observacoes}
              onChange={(e) => setNovaEntrada({ ...novaEntrada, observacoes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalEntrada(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCriarEntrada} variant="contained">
            Registrar Entrada
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EstoqueModerno;