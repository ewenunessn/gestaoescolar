import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Menu,
  Collapse,
  Divider,
  TablePagination,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  MenuBook,
  TuneRounded,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  MoreVert,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listarContratos } from "../services/contratos";
import { listarFornecedores } from "../services/fornecedores";

// Interfaces
interface Contrato {
  id: number;
  fornecedor_id: number;
  numero: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  valor_total_contrato?: number;
}

interface Fornecedor {
  id: number;
  nome: string;
}

const ContratosPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fornecedorIdParam = searchParams.get('fornecedor_id');

  // Estados principais
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFornecedor, setSelectedFornecedor] = useState<number | string>(fornecedorIdParam ? Number(fornecedorIdParam) : "");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("numero");
  const [filtersExpanded, setFiltersExpanded] = useState(!!fornecedorIdParam);
  const [hasActiveFilters, setHasActiveFilters] = useState(!!fornecedorIdParam);

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Carregar dados
  const loadContratos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [contratosData, fornecedoresData] = await Promise.all([
        listarContratos(),
        listarFornecedores(),
      ]);
      setContratos(Array.isArray(contratosData) ? contratosData : []);
      setFornecedores(Array.isArray(fornecedoresData) ? fornecedoresData : []);
    } catch (err) {
      setError("Erro ao carregar contratos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContratos();
  }, [loadContratos]);

  // Mapa de fornecedores para performance
  const fornecedorMap = useMemo(() => new Map(fornecedores.map(f => [f.id, f.nome])), [fornecedores]);

  // Detectar filtros ativos
  useEffect(() => {
    setHasActiveFilters(!!(searchTerm || selectedFornecedor || selectedStatus));
  }, [searchTerm, selectedFornecedor, selectedStatus]);

  // Funções de status e data
  const getStatusContrato = useCallback((contrato: Contrato) => {
    if (!contrato.ativo) return { status: "Inativo", color: "default" as const };
    const hoje = new Date();
    const fim = new Date(contrato.data_fim);
    if (hoje > fim) return { status: "Expirado", color: "error" as const };
    return { status: "Ativo", color: "success" as const };
  }, []);

  // Filtrar e ordenar contratos
  const filteredContratos = useMemo(() => {
    return contratos.filter(contrato => {
      const fornecedorNome = fornecedorMap.get(contrato.fornecedor_id)?.toLowerCase() || "";
      const matchesSearch = contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) || fornecedorNome.includes(searchTerm.toLowerCase());
      const matchesFornecedor = !selectedFornecedor || contrato.fornecedor_id === selectedFornecedor;
      const statusInfo = getStatusContrato(contrato);
      const matchesStatus = !selectedStatus || statusInfo.status.toLowerCase() === selectedStatus;
      
      return matchesSearch && matchesFornecedor && matchesStatus;
    }).sort((a, b) => a.numero.localeCompare(b.numero));
  }, [contratos, searchTerm, selectedFornecedor, selectedStatus, fornecedorMap, getStatusContrato]);

  // Contratos paginados
  const paginatedContratos = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredContratos.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredContratos, page, rowsPerPage]);

  // Funções de paginação
  const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);
  
  // Reset da página quando filtros mudam
  useEffect(() => setPage(0), [searchTerm, selectedFornecedor, selectedStatus, sortBy]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedFornecedor("");
    setSelectedStatus("");
    setSortBy("numero");
    if (fornecedorIdParam) navigate('/contratos', { replace: true });
  }, [fornecedorIdParam, navigate]);

  const toggleFilters = useCallback(() => setFiltersExpanded(!filtersExpanded), [filtersExpanded]);
  const formatarData = (data: string) => new Date(data).toLocaleDateString('pt-BR');
  const formatarValor = (valor?: number) => `R$ ${(Number(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Componente de conteúdo dos filtros
  const FiltersContent = () => (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: '12px', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.9rem' }}>Filtros Avançados</Typography>
        {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.8rem' }}>Limpar</Button>}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
        <FormControl fullWidth size="small"><InputLabel>Fornecedor</InputLabel><Select value={selectedFornecedor} onChange={(e) => setSelectedFornecedor(e.target.value)} label="Fornecedor"><MenuItem value="">Todos</MenuItem>{fornecedores.map(f => <MenuItem key={f.id} value={f.id}>{f.nome}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} label="Status"><MenuItem value="">Todos</MenuItem><MenuItem value="ativo">Ativo</MenuItem><MenuItem value="expirado">Expirado</MenuItem><MenuItem value="inativo">Inativo</MenuItem></Select></FormControl>
        <FormControl fullWidth size="small"><InputLabel>Ordenar por</InputLabel><Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Ordenar por"><MenuItem value="numero">Número</MenuItem></Select></FormControl>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>Contratos</Typography>

        <Card sx={{ borderRadius: '12px', p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField placeholder="Buscar por número ou fornecedor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>), endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>)}}/>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLessIcon /> : <TuneRounded />} onClick={toggleFilters}>Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }}/>)}</Button>
              <Button size="small" startIcon={<AddIcon />} onClick={() => navigate("/contratos/novo")} variant="contained" color="success">Novo Contrato</Button>
              <IconButton size="small" onClick={(e) => setActionsMenuAnchor(e.currentTarget)}><MoreVert /></IconButton>
            </Box>
          </Box>
          <Collapse in={filtersExpanded} timeout={300}><Box sx={{ mb: 2 }}><FiltersContent /></Box></Collapse>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b', fontSize: '0.8rem' }}>{`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredContratos.length)}-${Math.min((page + 1) * rowsPerPage, filteredContratos.length)} de ${filteredContratos.length} contratos`}</Typography>
        </Card>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadContratos}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredContratos.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><MenuBook sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhum contrato encontrado</Typography></CardContent></Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table>
                <TableHead><TableRow><TableCell>Número</TableCell><TableCell>Fornecedor</TableCell><TableCell>Vigência</TableCell><TableCell align="right">Valor Total</TableCell><TableCell align="center">Status</TableCell><TableCell align="center">Ações</TableCell></TableRow></TableHead>
                <TableBody>
                  {paginatedContratos.map((contrato) => {
                    const status = getStatusContrato(contrato);
                    return (
                      <TableRow key={contrato.id} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{contrato.numero}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{fornecedorMap.get(contrato.fornecedor_id) || "N/A"}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{`${formatarData(contrato.data_inicio)} a ${formatarData(contrato.data_fim)}`}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" color="text.secondary">{formatarValor(contrato.valor_total_contrato)}</Typography></TableCell>
                        <TableCell align="center"><Chip label={status.status} size="small" color={status.color} /></TableCell>
                        <TableCell align="center"><Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => navigate(`/contratos/${contrato.id}`)} color="primary"><InfoIcon fontSize="small" /></IconButton></Tooltip></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={filteredContratos.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Itens por página:" />
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

export default ContratosPage;