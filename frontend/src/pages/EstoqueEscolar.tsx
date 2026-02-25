import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  SwapHoriz,
  History
} from "@mui/icons-material";
import PageHeader from "../components/PageHeader";
import { listarEscolas } from "../services/escolas";
import { listarEstoqueEscola, listarHistoricoEscola, registrarMovimentacao, type EstoqueEscolarItem, type EstoqueEscolarMovimentacao } from "../services/estoqueEscolarService";
import { useToast } from "../hooks/useToast";
import { formatarDataHora, getTipoMovimentacaoColor, getTipoMovimentacaoLabel } from "../services/estoqueCentralService";

const formatarQuantidade = (qtd: number | string, unidade: string) =>
  `${Number(qtd).toLocaleString("pt-BR")} ${unidade}`;

const EstoqueEscolar: React.FC = () => {
  const toast = useToast();
  const [escolas, setEscolas] = useState<any[]>([]);
  const [escolaId, setEscolaId] = useState<number | "">("");
  const [itens, setItens] = useState<EstoqueEscolarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "com_estoque" | "sem_estoque">("todos");
  const [quantidadeMin, setQuantidadeMin] = useState("");
  const [quantidadeMax, setQuantidadeMax] = useState("");
  const [movOpen, setMovOpen] = useState(false);
  const [movItem, setMovItem] = useState<EstoqueEscolarItem | null>(null);
  const [movTipo, setMovTipo] = useState<"entrada" | "saida" | "ajuste">("entrada");
  const [movQuantidade, setMovQuantidade] = useState("");
  const [movObservacoes, setMovObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoItens, setHistoricoItens] = useState<EstoqueEscolarMovimentacao[]>([]);
  const [historicoProdutoId, setHistoricoProdutoId] = useState<number | "">("");
  const [historicoTipo, setHistoricoTipo] = useState("");
  const [historicoBusca, setHistoricoBusca] = useState("");
  const [historicoDataInicio, setHistoricoDataInicio] = useState("");
  const [historicoDataFim, setHistoricoDataFim] = useState("");

  useEffect(() => {
    listarEscolas()
      .then(setEscolas)
      .catch(() => toast.errorLoad("as escolas"));
  }, []);

  const carregarEstoque = async (id: number) => {
    try {
      setLoading(true);
      const data = await listarEstoqueEscola(id);
      setItens(data);
    } catch {
      toast.errorLoad("o estoque da escola");
      setItens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (escolaId) {
      carregarEstoque(Number(escolaId));
    } else {
      setItens([]);
    }
    setHistoricoOpen(false);
    setHistoricoItens([]);
  }, [escolaId]);

  const categorias = useMemo(() => {
    const valores = itens.map((item) => item.categoria).filter((cat): cat is string => Boolean(cat));
    return Array.from(new Set(valores)).sort((a, b) => a.localeCompare(b));
  }, [itens]);

  const produtosOrdenados = useMemo(() => {
    return [...itens]
      .sort((a, b) => a.produto_nome.localeCompare(b.produto_nome))
      .map((item) => ({ id: item.produto_id, nome: item.produto_nome }));
  }, [itens]);

  const unidadePorProduto = useMemo(() => {
    return new Map(itens.map((item) => [item.produto_id, item.unidade]));
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    return itens.filter((item) => {
      const matchTermo = !termo ||
        item.produto_nome.toLowerCase().includes(termo) ||
        (item.categoria || "").toLowerCase().includes(termo);
      const matchCategoria = !categoriaFiltro || item.categoria === categoriaFiltro;
      const quantidadeAtual = Number(item.quantidade_atual);
      const matchStatus = statusFiltro === "todos" ||
        (statusFiltro === "sem_estoque" && quantidadeAtual <= 0) ||
        (statusFiltro === "com_estoque" && quantidadeAtual > 0);
      const min = quantidadeMin !== "" ? Number(quantidadeMin) : null;
      const max = quantidadeMax !== "" ? Number(quantidadeMax) : null;
      const matchMin = min === null || quantidadeAtual >= min;
      const matchMax = max === null || quantidadeAtual <= max;
      return matchTermo && matchCategoria && matchStatus && matchMin && matchMax;
    });
  }, [itens, searchTerm, categoriaFiltro, statusFiltro, quantidadeMin, quantidadeMax]);

  const historicoFiltrado = useMemo(() => {
    const termo = historicoBusca.trim().toLowerCase();
    const inicio = historicoDataInicio ? new Date(historicoDataInicio) : null;
    const fim = historicoDataFim ? new Date(historicoDataFim) : null;
    if (inicio) {
      inicio.setHours(0, 0, 0, 0);
    }
    if (fim) {
      fim.setHours(23, 59, 59, 999);
    }
    return historicoItens.filter((mov) => {
      const matchProduto = !historicoProdutoId || mov.produto_id === historicoProdutoId;
      const matchTipo = !historicoTipo || mov.tipo_movimentacao === historicoTipo;
      const matchTermo = !termo ||
        (mov.usuario_nome || "").toLowerCase().includes(termo) ||
        (mov.produto_nome || "").toLowerCase().includes(termo) ||
        (mov.observacoes || "").toLowerCase().includes(termo);
      const dataMov = new Date(mov.data_movimentacao);
      const matchInicio = !inicio || dataMov >= inicio;
      const matchFim = !fim || dataMov <= fim;
      return matchProduto && matchTipo && matchTermo && matchInicio && matchFim;
    });
  }, [historicoItens, historicoProdutoId, historicoTipo, historicoBusca, historicoDataInicio, historicoDataFim]);

  const abrirMovimentacao = (item: EstoqueEscolarItem, tipo: "entrada" | "saida" | "ajuste") => {
    setMovItem(item);
    setMovTipo(tipo);
    setMovQuantidade("");
    setMovObservacoes("");
    setMovOpen(true);
  };

  const fecharMovimentacao = () => {
    setMovOpen(false);
    setMovItem(null);
  };

  const salvarMovimentacao = async () => {
    if (!movItem || !escolaId) return;
    const qtd = Number(movQuantidade);
    if (isNaN(qtd) || qtd <= 0) {
      toast.warningRequired("Quantidade");
      return;
    }
    try {
      setSaving(true);
      await registrarMovimentacao(Number(escolaId), {
        produto_id: movItem.produto_id,
        tipo_movimentacao: movTipo,
        quantidade: qtd,
        observacoes: movObservacoes || undefined
      });
      toast.successSave("Movimentação registrada.");
      fecharMovimentacao();
      await carregarEstoque(Number(escolaId));
    } catch (error: any) {
      toast.errorSave(error.message);
    } finally {
      setSaving(false);
    }
  };

  const abrirHistorico = async (produtoId?: number) => {
    if (!escolaId) return;
    setHistoricoOpen(true);
    setHistoricoProdutoId(produtoId || "");
    setHistoricoTipo("");
    setHistoricoBusca("");
    setHistoricoDataInicio("");
    setHistoricoDataFim("");
    try {
      setHistoricoLoading(true);
      const data = await listarHistoricoEscola(Number(escolaId));
      setHistoricoItens(data);
    } catch {
      toast.errorLoad("o histórico");
      setHistoricoItens([]);
    } finally {
      setHistoricoLoading(false);
    }
  };

  const limparFiltros = () => {
    setSearchTerm("");
    setCategoriaFiltro("");
    setStatusFiltro("todos");
    setQuantidadeMin("");
    setQuantidadeMax("");
  };

  return (
    <Box sx={{ maxWidth: "1280px", mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
      <PageHeader title="Estoque Escolar" totalCount={itensFiltrados.length} />

      <Card sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Escola</InputLabel>
              <Select
                value={escolaId}
                label="Escola"
                onChange={(e) => setEscolaId(e.target.value as number)}
              >
                {escolas.map((e) => (
                  <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={categoriaFiltro}
                label="Categoria"
                onChange={(e) => setCategoriaFiltro(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {categorias.map((categoria) => (
                  <MenuItem key={categoria} value={categoria}>{categoria}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFiltro}
                label="Status"
                onChange={(e) => setStatusFiltro(e.target.value as "todos" | "com_estoque" | "sem_estoque")}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="com_estoque">Com estoque</MenuItem>
                <MenuItem value="sem_estoque">Sem estoque</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Qtd. mínima"
              type="number"
              value={quantidadeMin}
              onChange={(e) => setQuantidadeMin(e.target.value)}
              inputProps={{ min: 0, step: 0.001 }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Qtd. máxima"
              type="number"
              value={quantidadeMax}
              onChange={(e) => setQuantidadeMax(e.target.value)}
              inputProps={{ min: 0, step: 0.001 }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button fullWidth variant="outlined" onClick={limparFiltros}>
                Limpar filtros
              </Button>
              <Button fullWidth variant="contained" onClick={() => abrirHistorico()} disabled={!escolaId}>
                Histórico
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Card>

      <Card sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell>Unidade</TableCell>
                  <TableCell align="right">Quantidade</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itensFiltrados.map((item) => {
                  const semEstoque = Number(item.quantidade_atual) <= 0;
                  return (
                    <TableRow key={item.produto_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{item.produto_nome}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.categoria}</Typography>
                      </TableCell>
                      <TableCell>{item.unidade}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatarQuantidade(item.quantidade_atual, item.unidade)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={semEstoque ? "Sem estoque" : "Disponível"} color={semEstoque ? "default" : "success"} />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => abrirMovimentacao(item, "entrada")}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => abrirMovimentacao(item, "saida")}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => abrirMovimentacao(item, "ajuste")}>
                          <SwapHoriz fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => abrirHistorico(item.produto_id)}>
                          <History fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {itensFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Nenhum item encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={movOpen} onClose={fecharMovimentacao} maxWidth="sm" fullWidth>
        <DialogTitle>Movimentação de Estoque</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">{movItem?.produto_nome}</Typography>
            <Typography variant="caption" color="text.secondary">{movItem?.categoria}</Typography>
          </Box>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select value={movTipo} label="Tipo" onChange={(e) => setMovTipo(e.target.value as any)}>
                  <MenuItem value="entrada">Entrada</MenuItem>
                  <MenuItem value="saida">Saída</MenuItem>
                  <MenuItem value="ajuste">Ajuste</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                label="Quantidade"
                type="number"
                fullWidth
                value={movQuantidade}
                onChange={(e) => setMovQuantidade(e.target.value)}
                inputProps={{ min: 0, step: 0.001 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Observações" fullWidth value={movObservacoes} onChange={(e) => setMovObservacoes(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharMovimentacao}>Cancelar</Button>
          <Button variant="contained" onClick={salvarMovimentacao} disabled={saving}>
            {saving ? <CircularProgress size={22} /> : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={historicoOpen} onClose={() => setHistoricoOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Histórico de Movimentações</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Produto</InputLabel>
                <Select
                  value={historicoProdutoId}
                  label="Produto"
                  onChange={(e) => setHistoricoProdutoId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {produtosOrdenados.map((produto) => (
                    <MenuItem key={produto.id} value={produto.id}>{produto.nome}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={historicoTipo}
                  label="Tipo"
                  onChange={(e) => setHistoricoTipo(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="entrada">Entrada</MenuItem>
                  <MenuItem value="saida">Saída</MenuItem>
                  <MenuItem value="ajuste">Ajuste</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                placeholder="Buscar observação, usuário..."
                value={historicoBusca}
                onChange={(e) => setHistoricoBusca(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Data início"
                type="date"
                value={historicoDataInicio}
                onChange={(e) => setHistoricoDataInicio(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Data fim"
                type="date"
                value={historicoDataFim}
                onChange={(e) => setHistoricoDataFim(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            {historicoLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data/Hora</TableCell>
                      <TableCell>Produto</TableCell>
                      <TableCell align="center">Tipo</TableCell>
                      <TableCell align="right">Qtd. Anterior</TableCell>
                      <TableCell align="right">Qtd. Mov.</TableCell>
                      <TableCell align="right">Qtd. Posterior</TableCell>
                      <TableCell>Usuário</TableCell>
                      <TableCell>Observações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historicoFiltrado.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>{formatarDataHora(mov.data_movimentacao)}</TableCell>
                        <TableCell>{mov.produto_nome || "-"}</TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={getTipoMovimentacaoLabel(mov.tipo_movimentacao)}
                            color={getTipoMovimentacaoColor(mov.tipo_movimentacao) as any}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatarQuantidade(mov.quantidade_anterior, unidadePorProduto.get(mov.produto_id) || "un")}
                        </TableCell>
                        <TableCell align="right">
                          {formatarQuantidade(mov.quantidade_movimentada, unidadePorProduto.get(mov.produto_id) || "un")}
                        </TableCell>
                        <TableCell align="right">
                          {formatarQuantidade(mov.quantidade_posterior, unidadePorProduto.get(mov.produto_id) || "un")}
                        </TableCell>
                        <TableCell>{mov.usuario_nome || "-"}</TableCell>
                        <TableCell>{mov.observacoes || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {historicoFiltrado.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Typography variant="body2" color="text.secondary" textAlign="center">
                            Nenhuma movimentação encontrada
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoricoOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EstoqueEscolar;
