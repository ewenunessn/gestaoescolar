import React, { useEffect, useState, useMemo, useCallback } from "react";
import StatusIndicator from "../components/StatusIndicator";
import { listarCardapios } from "../services/cardapios";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Chip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Tooltip,
  Paper,
  Menu,
  Collapse,
  TablePagination,
  Divider,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  MenuBook,
  Visibility,
  Clear as ClearIcon,
  MoreVert,
  TuneRounded,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

// Interface
interface Cardapio {
  id: number;
  nome: string;
  periodo_dias: number;
  data_inicio: string;
  data_fim: string;
  modalidade_nome?: string;
  ativo: boolean;
}

const CardapiosPage = () => {
  const navigate = useNavigate();

  // Estados principais
  const [cardapios, setCardapios] = useState<Cardapio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModalidade, setSelectedModalidade] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("nome");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Carregar cardápios
  const loadCardapios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listarCardapios();
      setCardapios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Erro ao carregar cardápios. Tente novamente.");
      setCardapios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCardapios();
  }, [loadCardapios]);

  // Detectar filtros ativos
  useEffect(() => {
    setHasActiveFilters(!!(searchTerm || selectedModalidade || selectedStatus));
  }, [searchTerm, selectedModalidade, selectedStatus]);

  // Extrair modalidades únicas para filtros
  const modalidades = useMemo(() => {
    return [...new Set(cardapios.map(c => c.modalidade_nome).filter(Boolean))].sort();
  }, [cardapios]);

  // Filtrar e ordenar cardápios
  const filteredCardapios = useMemo(() => {
    return cardapios.filter(cardapio => {
      const matchesSearch = cardapio.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModalidade = !selectedModalidade || cardapio.modalidade_nome === selectedModalidade;
      const matchesStatus = !selectedStatus ||
        (selectedStatus === 'ativo' && cardapio.ativo) ||
        (selectedStatus === 'inativo' && !cardapio.ativo);
      return matchesSearch && matchesModalidade && matchesStatus;
    }).sort((a, b) => a.nome.localeCompare(b.nome)); // Simplificado para ordenar por nome
  }, [cardapios, searchTerm, selectedModalidade, selectedStatus]);

  // Cardápios paginados
  const paginatedCardapios = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredCardapios.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCardapios, page, rowsPerPage]);
  
  // Funções de paginação
  const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedModalidade, selectedStatus, sortBy]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedModalidade("");
    setSelectedStatus("");
    setSortBy("nome");
  }, []);

  const toggleFilters = useCallback(() => setFiltersExpanded(!filtersExpanded), [filtersExpanded]);

  const formatarData = (data: string) => new Date(data).toLocaleDateString('pt-BR');

  // Componente de conteúdo dos filtros
  const FiltersContent = () => (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: '12px', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.9rem' }}>Filtros Avançados</Typography>
        {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.8rem' }}>Limpar</Button>}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
        <FormControl fullWidth size="small"><InputLabel>Modalidade</InputLabel><Select value={selectedModalidade} onChange={(e) => setSelectedModalidade(e.target.value)} label="Modalidade"><MenuItem value="">Todas</MenuItem>{modalidades.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} label="Status"><MenuItem value="">Todos</MenuItem><MenuItem value="ativo">Ativos</MenuItem><MenuItem value="inativo">Inativos</MenuItem></Select></FormControl>
        <FormControl fullWidth size="small"><InputLabel>Ordenar por</InputLabel><Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Ordenar por"><MenuItem value="nome">Nome</MenuItem><MenuItem value="modalidade">Modalidade</MenuItem></Select></FormControl>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Card sx={{ borderRadius: '12px', p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField placeholder="Buscar cardápios..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>), endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>)}}/>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLessIcon /> : <TuneRounded />} onClick={toggleFilters} size="small">Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }}/>)}</Button>
              <Button startIcon={<AddIcon />} onClick={() => navigate("/cardapios/novo")} variant="contained" color="success" size="small">Novo Cardápio</Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small"><MoreVert /></IconButton>
            </Box>
          </Box>
          <Collapse in={filtersExpanded} timeout={300}><Box sx={{ mb: 2 }}><FiltersContent /></Box></Collapse>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredCardapios.length)}-${Math.min((page + 1) * rowsPerPage, filteredCardapios.length)} de ${filteredCardapios.length} cardápios`}</Typography>
        </Card>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadCardapios}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredCardapios.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><MenuBook sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhum cardápio encontrado</Typography></CardContent></Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell sx={{ py: 1 }}>Cardápio</TableCell><TableCell align="center" sx={{ py: 1 }}>Modalidade</TableCell><TableCell align="center" sx={{ py: 1 }}>Vigência</TableCell><TableCell align="center" sx={{ py: 1 }}>Ações</TableCell></TableRow></TableHead>
                <TableBody>
                  {paginatedCardapios.map((cardapio) => (
                    <TableRow key={cardapio.id} hover sx={{ '& td': { py: 0.75 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIndicator status={cardapio.ativo ? 'ativo' : 'inativo'} size="small" />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{cardapio.nome}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{cardapio.periodo_dias} dias</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center"><Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>{cardapio.modalidade_nome || 'N/A'}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>{`${formatarData(cardapio.data_inicio)} a ${formatarData(cardapio.data_fim)}`}</Typography></TableCell>

                      <TableCell align="center"><Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => navigate(`/cardapios/${cardapio.id}`)} color="primary"><Visibility fontSize="small" /></IconButton></Tooltip></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={filteredCardapios.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Itens por página:" />
          </Paper>
        )}
      </Box>
      
      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        <MenuItem disabled><Typography>Nenhuma ação disponível</Typography></MenuItem>
      </Menu>
    </Box>
  );
};

export default CardapiosPage;