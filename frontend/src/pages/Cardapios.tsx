import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  Info,
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
    <Box sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '16px', p: 3, border: '1px solid rgba(148, 163, 184, 0.1)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TuneRounded sx={{ color: '#4f46e5' }} /><Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>Filtros Avançados</Typography></Box>
        {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: '#64748b', textTransform: 'none' }}>Limpar Tudo</Button>}
      </Box>
      <Divider sx={{ mb: 3 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
        <FormControl fullWidth><InputLabel>Modalidade</InputLabel><Select value={selectedModalidade} onChange={(e) => setSelectedModalidade(e.target.value)} label="Modalidade"><MenuItem value="">Todas</MenuItem>{modalidades.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel>Status</InputLabel><Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} label="Status"><MenuItem value="">Todos</MenuItem><MenuItem value="ativo">Ativos</MenuItem><MenuItem value="inativo">Inativos</MenuItem></Select></FormControl>
        <FormControl fullWidth><InputLabel>Ordenar por</InputLabel><Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Ordenar por"><MenuItem value="nome">Nome</MenuItem><MenuItem value="modalidade">Modalidade</MenuItem></Select></FormControl>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TextField placeholder="Buscar cardápios..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#64748b' }} /></InputAdornment>), endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>)}}/>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLessIcon /> : <TuneRounded />} onClick={toggleFilters}>Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }}/>)}</Button>
              <Button startIcon={<AddIcon />} onClick={() => navigate("/cardapios/novo")} sx={{ bgcolor: '#059669', color: 'white', '&:hover': { bgcolor: '#047857' } }}>Novo Cardápio</Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} sx={{ border: '1px solid #d1d5db' }}><MoreVert /></IconButton>
            </Box>
          </Box>
          <Collapse in={filtersExpanded} timeout={400}><Box sx={{ mb: 3 }}><FiltersContent /></Box></Collapse>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>{`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredCardapios.length)}-${Math.min((page + 1) * rowsPerPage, filteredCardapios.length)} de ${filteredCardapios.length} cardápios`}</Typography>
        </Card>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadCardapios}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredCardapios.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><MenuBook sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} /><Typography variant="h6" sx={{ color: '#6b7280' }}>Nenhum cardápio encontrado</Typography></CardContent></Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table>
                <TableHead><TableRow><TableCell>Cardápio</TableCell><TableCell>Modalidade</TableCell><TableCell>Vigência</TableCell><TableCell align="center">Status</TableCell><TableCell align="center">Ações</TableCell></TableRow></TableHead>
                <TableBody>
                  {paginatedCardapios.map((cardapio) => (
                    <TableRow key={cardapio.id} hover>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{cardapio.nome}</Typography><Typography variant="caption" color="text.secondary">{cardapio.periodo_dias} dias</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{cardapio.modalidade_nome || 'N/A'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{`${formatarData(cardapio.data_inicio)} a ${formatarData(cardapio.data_fim)}`}</Typography></TableCell>
                      <TableCell align="center"><Chip label={cardapio.ativo ? 'Ativo' : 'Inativo'} size="small" color={cardapio.ativo ? 'success' : 'error'} variant="outlined" /></TableCell>
                      <TableCell align="center"><Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => navigate(`/cardapios/${cardapio.id}`)} color="primary"><Info fontSize="small" /></IconButton></Tooltip></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={filteredCardapios.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Itens por página:" />
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