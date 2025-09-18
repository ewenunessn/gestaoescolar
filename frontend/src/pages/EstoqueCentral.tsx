import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  IconButton,
  Chip,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  FormControlLabel,
  Switch,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Tooltip,
  Menu,
  MenuItem,
  Collapse,
  Divider,
  TablePagination,
} from "@mui/material";
import {
  Search as SearchIcon,
  Inventory,
  Warning,
  TrendingUp,
  TrendingDown,
  Add as AddIcon,
  Info as InfoIcon,
  History,
  Refresh,
  TuneRounded,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
  MoreVert,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  getPosicaoEstoque,
  getAlertas,
  atualizarAlertas,
  criarLoteEstoque,
  formatarData,
  calcularDiasParaVencimento,
  isVencimentoProximo,
  type EstoquePosicao,
  type AlertaEstoque
} from "../services/estoqueCentralService";

// Helper para formatação de quantidade (exemplo)
const formatarQuantidade = (qtd: number | string, unidade: string) => `${Number(qtd).toLocaleString('pt-BR')} ${unidade}`;

const EstoqueCentralPage: React.FC = () => {
  const navigate = useNavigate();

  // Estados principais
  const [posicoes, setPosicoes] = useState<EstoquePosicao[]>([]);
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  
  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estados de modais
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ produto_id: "", lote: "", quantidade: "", data_validade: "" });

  // Carregar dados
  const loadEstoque = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [posicoesData, alertasData] = await Promise.all([
        getPosicaoEstoque(mostrarTodos),
        getAlertas()
      ]);
      setPosicoes(Array.isArray(posicoesData) ? posicoesData : []);
      setAlertas(Array.isArray(alertasData) ? alertasData : []);
    } catch (err) {
      setError("Erro ao carregar dados do estoque. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [mostrarTodos]);

  useEffect(() => {
    loadEstoque();
  }, [loadEstoque]);

  // Detectar filtros ativos
  useEffect(() => {
    setHasActiveFilters(!!(searchTerm || mostrarTodos));
  }, [searchTerm, mostrarTodos]);

  // Filtrar posições
  const filteredPosicoes = useMemo(() => {
    return posicoes.filter(p => p.produto_nome.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [posicoes, searchTerm]);

  // Posições paginadas
  const paginatedPosicoes = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredPosicoes.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredPosicoes, page, rowsPerPage]);

  // Funções de paginação e filtros
  const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);
  useEffect(() => setPage(0), [searchTerm, mostrarTodos]);
  const clearFilters = useCallback(() => { setSearchTerm(""); setMostrarTodos(false); }, []);
  const toggleFilters = useCallback(() => setFiltersExpanded(!filtersExpanded), [filtersExpanded]);
  
  // Handlers de ações
  const handleAtualizarAlertas = async () => {
    try {
      await atualizarAlertas();
      await loadEstoque();
      setSuccessMessage("Alertas atualizados com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Erro ao atualizar alertas.");
    }
  };

  const handleSave = async () => {
    try {
      // Validação
      await criarLoteEstoque({
        produto_id: parseInt(formData.produto_id),
        lote: formData.lote,
        quantidade: parseFloat(formData.quantidade),
        data_validade: formData.data_validade || undefined,
      });
      setModalOpen(false);
      setFormData({ produto_id: "", lote: "", quantidade: "", data_validade: "" });
      await loadEstoque();
      setSuccessMessage("Entrada registrada com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao registrar entrada.");
    }
  };

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  // Componentes de UI
  const getStatusProduto = (posicao: EstoquePosicao) => {
    if (Number(posicao.quantidade_vencida) > 0) return { color: "error" as const, label: 'Com Vencidos' };
    if (Number(posicao.quantidade_disponivel) === 0) return { color: "default" as const, label: 'Sem Estoque' };
    if (posicao.proximo_vencimento && isVencimentoProximo(posicao.proximo_vencimento)) return { color: "warning" as const, label: 'Vence em Breve' };
    return { color: "success" as const, label: 'Normal' };
  };

  const FiltersContent = () => (
    <Box sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '16px', p: 3, border: '1px solid rgba(148, 163, 184, 0.1)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TuneRounded sx={{ color: '#4f46e5' }} /><Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>Filtros</Typography></Box>
        {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: '#64748b', textTransform: 'none' }}>Limpar Tudo</Button>}
      </Box>
      <Divider sx={{ mb: 2 }} />
      <FormControlLabel control={<Switch checked={mostrarTodos} onChange={(e) => setMostrarTodos(e.target.checked)} />} label="Mostrar todos os produtos (incluindo sem estoque)" />
    </Box>
  );

  const estatisticas = useMemo(() => ({
    totalProdutos: posicoes.length,
    comEstoque: posicoes.filter(p => Number(p.quantidade_disponivel) > 0).length,
    comVencidos: posicoes.filter(p => Number(p.quantidade_vencida) > 0).length,
    alertasAtivos: alertas.length
  }), [posicoes, alertas]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#1e293b' }}>Estoque Central</Typography>

        <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TextField placeholder="Buscar por produto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#64748b' }} /></InputAdornment>), endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>)}}/>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLessIcon /> : <TuneRounded />} onClick={toggleFilters}>Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }}/>)}</Button>
              <Button startIcon={<AddIcon />} onClick={openModal} sx={{ bgcolor: '#059669', color: 'white', '&:hover': { bgcolor: '#047857' } }}>Nova Entrada</Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} sx={{ border: '1px solid #d1d5db' }}><MoreVert /></IconButton>
            </Box>
          </Box>
          <Collapse in={filtersExpanded} timeout={400}><Box sx={{ mb: 3 }}><FiltersContent /></Box></Collapse>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>{`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredPosicoes.length)}-${Math.min((page + 1) * rowsPerPage, filteredPosicoes.length)} de ${filteredPosicoes.length} posições de estoque`}</Typography>
        </Card>
        
        {/* Cards de Estatísticas e Alertas */}
        <Grid container spacing={3} mb={3}>
            {Object.entries({
                'Total Produtos': { value: estatisticas.totalProdutos, icon: <Inventory color="primary" /> },
                'Com Estoque': { value: estatisticas.comEstoque, icon: <TrendingUp color="success" /> },
                'Com Vencidos': { value: estatisticas.comVencidos, icon: <TrendingDown color="error" /> },
                'Alertas Ativos': { value: estatisticas.alertasAtivos, icon: <Warning color="warning" /> },
            }).map(([title, data]) => (
                <Grid item xs={12} sm={6} md={3} key={title}><Card><CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>{data.icon}<Box><Typography variant="h6" fontWeight="bold">{data.value}</Typography><Typography variant="body2" color="text.secondary">{title}</Typography></Box></CardContent></Card></Grid>
            ))}
        </Grid>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadEstoque}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredPosicoes.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Inventory sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} /><Typography variant="h6" sx={{ color: '#6b7280' }}>Nenhuma posição de estoque encontrada</Typography></CardContent></Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table>
                <TableHead><TableRow><TableCell>Produto</TableCell><TableCell align="right">Qtd. Disponível</TableCell><TableCell align="right">Qtd. Vencida</TableCell><TableCell>Próximo Vencimento</TableCell><TableCell align="center">Status</TableCell><TableCell align="center">Ações</TableCell></TableRow></TableHead>
                <TableBody>
                  {paginatedPosicoes.map((posicao) => {
                    const status = getStatusProduto(posicao);
                    return (
                      <TableRow key={posicao.produto_id} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{posicao.produto_nome}</Typography><Typography variant="caption" color="text.secondary">Un: {posicao.produto_unidade}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" fontWeight="bold">{formatarQuantidade(posicao.quantidade_disponivel, posicao.produto_unidade)}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" color={Number(posicao.quantidade_vencida) > 0 ? 'error' : 'text.secondary'}>{formatarQuantidade(posicao.quantidade_vencida, posicao.produto_unidade)}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{posicao.proximo_vencimento ? formatarData(posicao.proximo_vencimento) : '-'}</Typography></TableCell>
                        <TableCell align="center"><Chip label={status.label} size="small" color={status.color} variant="outlined" /></TableCell>
                        <TableCell align="center">
                          <Tooltip title="Ver Lotes"><IconButton size="small" onClick={() => navigate(`/estoque-moderno/produtos/${posicao.produto_id}/lotes`)}><InfoIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Movimentações"><IconButton size="small" onClick={() => navigate(`/estoque-moderno/produtos/${posicao.produto_id}/movimentacoes`)}><History fontSize="small" /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={filteredPosicoes.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Itens por página:" />
          </Paper>
        )}
      </Box>

      {/* Modal de Nova Entrada */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Nova Entrada de Estoque</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField label="ID do Produto *" type="number" value={formData.produto_id} onChange={(e) => setFormData({ ...formData, produto_id: e.target.value })} required />
            <TextField label="Número do Lote *" value={formData.lote} onChange={(e) => setFormData({ ...formData, lote: e.target.value })} required />
            <TextField label="Quantidade *" type="number" value={formData.quantidade} onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })} required />
            <TextField label="Data de Validade" type="date" value={formData.data_validade} onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={closeModal} sx={{ color: '#6b7280' }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.produto_id || !formData.lote || !formData.quantidade} sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>Registrar Entrada</Button>
        </DialogActions>
      </Dialog>
      
      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); handleAtualizarAlertas(); }}><Refresh sx={{ mr: 1 }} /> Atualizar Alertas</MenuItem>
      </Menu>
    </Box>
  );
};

export default EstoqueCentralPage;