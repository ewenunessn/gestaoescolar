import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment
} from "@mui/material";
import {
  ArrowBack,
  History,
  Add,
  Remove,
  Edit,
  Visibility,
  FilterList
} from "@mui/icons-material";
import {
  getLotesProduto,
  processarSaidaEstoque,
  formatarQuantidade,
  formatarData,
  formatarDataHora,
  getStatusLoteColor,
  getStatusLoteLabel,
  calcularDiasParaVencimento,
  type EstoqueLote
} from "../services/estoqueCentralService";
import { buscarProduto } from "../services/produtos";
import { useToast } from "../hooks/useToast";

const EstoqueLotes: React.FC = () => {
  const { produto_id } = useParams<{ produto_id: string }>();
  const navigate = useNavigate();
  const { success, error, warning } = useToast();

  // Estados
  const [lotes, setLotes] = useState<EstoqueLote[]>([]);
  const [produto, setProduto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apenasAtivos, setApenasAtivos] = useState(true);

  // Modal de saída
  const [modalSaida, setModalSaida] = useState(false);
  const [dadosSaida, setDadosSaida] = useState({
    quantidade: "",
    motivo: "",
    documento_referencia: "",
    observacoes: ""
  });

  useEffect(() => {
    if (produto_id) {
      carregarDados();
    }
  }, [produto_id, apenasAtivos]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const produtoIdNum = parseInt(produto_id!);

      const [lotesData, produtoData] = await Promise.all([
        getLotesProduto(produtoIdNum, apenasAtivos),
        buscarProduto(produtoIdNum)
      ]);

      setLotes(lotesData);
      setProduto(produtoData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      error("Erro ao carregar dados do produto");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessarSaida = async () => {
    try {
      if (!dadosSaida.quantidade || !dadosSaida.motivo) {
        warning("Preencha quantidade e motivo");
        return;
      }

      await processarSaidaEstoque({
        produto_id: parseInt(produto_id!),
        quantidade: parseFloat(dadosSaida.quantidade),
        motivo: dadosSaida.motivo,
        documento_referencia: dadosSaida.documento_referencia || undefined,
        observacoes: dadosSaida.observacoes || undefined
      });

      setModalSaida(false);
      setDadosSaida({
        quantidade: "",
        motivo: "",
        documento_referencia: "",
        observacoes: ""
      });

      await carregarDados();
      success("Saída processada com sucesso");
    } catch (err: any) {
      console.error("Erro ao processar saída:", err);
      error("Erro ao processar saída", err.response?.data?.message || "Erro ao processar saída");
    }
  };

  const calcularTotais = () => {
    return {
      quantidadeTotal: lotes.reduce((sum, lote) => sum + lote.quantidade_atual, 0),
      lotesAtivos: lotes.filter(lote => lote.status === 'ativo').length,
      lotesVencidos: lotes.filter(lote => lote.status === 'vencido').length
    };
  };

  const getStatusVencimento = (lote: EstoqueLote) => {
    if (!lote.data_validade) return null;

    const dias = calcularDiasParaVencimento(lote.data_validade);
    if (dias === null) return null;

    if (dias < 0) return { color: 'error', text: `Vencido há ${Math.abs(dias)} dias` };
    if (dias === 0) return { color: 'error', text: 'Vence hoje' };
    if (dias <= 7) return { color: 'warning', text: `Vence em ${dias} dias` };
    if (dias <= 30) return { color: 'info', text: `Vence em ${dias} dias` };

    return { color: 'success', text: `Vence em ${dias} dias` };
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

  const totais = calcularTotais();

  return (
    <Box>
      {/* Cabeçalho */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate("/estoque-moderno")}>
          <ArrowBack />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Lotes - {produto.nome}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Unidade: {produto.unidade}
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant={apenasAtivos ? "contained" : "outlined"}
            startIcon={<FilterList />}
            onClick={() => setApenasAtivos(!apenasAtivos)}
          >
            {apenasAtivos ? "Mostrar Todos" : "Apenas Ativos"}
          </Button>
          <Button
            variant="contained"
            startIcon={<Remove />}
            onClick={() => setModalSaida(true)}
            disabled={totais.quantidadeTotal === 0}
          >
            Processar Saída
          </Button>
        </Box>
      </Box>

      {/* Cards de resumo */}
      <Box display="flex" gap={2} mb={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold">
              {formatarQuantidade(totais.quantidadeTotal, produto.unidade)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quantidade Total
            </Typography>
          </CardContent>
        </Card>



        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold">
              {totais.lotesAtivos}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lotes Ativos
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold">
              {totais.lotesVencidos}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lotes Vencidos
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Mensagem quando não há lotes */}
      {lotes.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {apenasAtivos 
            ? "Nenhum lote ativo encontrado. Use o filtro 'Mostrar Todos' para ver lotes esgotados."
            : "Nenhum lote encontrado para este produto."
          }
        </Alert>
      )}

      {/* Tabela de lotes */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lote</TableCell>
              <TableCell align="right">Qtd. Inicial</TableCell>
              <TableCell align="right">Qtd. Atual</TableCell>
              <TableCell>Data Fabricação</TableCell>
              <TableCell>Data Validade</TableCell>
              <TableCell>Status Vencimento</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell>Criado em</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lotes.map((lote) => {
              const statusVencimento = getStatusVencimento(lote);

              return (
                <TableRow key={lote.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {lote.lote}
                    </Typography>
                    {lote.observacoes && (
                      <Typography variant="caption" color="text.secondary">
                        {lote.observacoes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatarQuantidade(lote.quantidade_inicial, produto.unidade)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formatarQuantidade(lote.quantidade_atual, produto.unidade)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatarData(lote.data_fabricacao)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatarData(lote.data_validade)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {statusVencimento && (
                      <Chip
                        label={statusVencimento.text}
                        size="small"
                        color={statusVencimento.color as any}
                      />
                    )}
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={getStatusLoteLabel(lote.status)}
                      size="small"
                      color={getStatusLoteColor(lote.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatarDataHora(lote.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Movimentações">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/estoque-moderno/produtos/${produto_id}/movimentacoes`)}
                      >
                        <History />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {lotes.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            {apenasAtivos ? "Nenhum lote ativo encontrado." : "Nenhum lote encontrado."}
          </Typography>
        </Box>
      )}

      {/* Modal de Saída */}
      <Dialog open={modalSaida} onClose={() => setModalSaida(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Processar Saída de Estoque</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <Alert severity="info">
              <Typography variant="body2">
                A saída será processada automaticamente seguindo a ordem FIFO (primeiro a vencer, primeiro a sair).
              </Typography>
            </Alert>

            <TextField
              label="Quantidade *"
              type="number"
              value={dadosSaida.quantidade}
              onChange={(e) => setDadosSaida({ ...dadosSaida, quantidade: e.target.value })}
              InputProps={{
                endAdornment: <InputAdornment position="end">{produto.unidade}</InputAdornment>,
              }}
              inputProps={{ min: 0.01, step: 0.01, max: totais.quantidadeTotal }}
              fullWidth
            />

            <TextField
              label="Motivo *"
              value={dadosSaida.motivo}
              onChange={(e) => setDadosSaida({ ...dadosSaida, motivo: e.target.value })}
              placeholder="Ex: Entrega para escola, Perda por vencimento, etc."
              fullWidth
            />

            <TextField
              label="Documento de Referência"
              value={dadosSaida.documento_referencia}
              onChange={(e) => setDadosSaida({ ...dadosSaida, documento_referencia: e.target.value })}
              placeholder="Ex: Pedido #123, Nota Fiscal, etc."
              fullWidth
            />

            <TextField
              label="Observações"
              multiline
              rows={3}
              value={dadosSaida.observacoes}
              onChange={(e) => setDadosSaida({ ...dadosSaida, observacoes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalSaida(false)}>
            Cancelar
          </Button>
          <Button onClick={handleProcessarSaida} variant="contained">
            Processar Saída
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EstoqueLotes;