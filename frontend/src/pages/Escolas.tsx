import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Tooltip,
  Menu,
  Collapse,
  Divider,
  Grid,
  TablePagination,
  Checkbox,
  OutlinedInput,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Info,
  School,
  Clear as ClearIcon,
  Download,
  MoreVert,
  Upload,
  TuneRounded,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { listarEscolas, criarEscola, importarEscolasLote } from '../services/escolas';
import ImportacaoEscolas from '../components/ImportacaoEscolas';
import LocationSelector from '../components/LocationSelector';
import * as XLSX from 'xlsx';

interface Escola {
  id: number;
  nome: string;
  codigo?: string;
  codigo_acesso: string;
  endereco?: string;
  municipio?: string;
  endereco_maps?: string;
  telefone?: string;
  email?: string;
  nome_gestor?: string;
  administracao?: 'municipal' | 'estadual' | 'federal' | 'particular';
  ativo: boolean;
  total_alunos?: number;
  modalidades?: string;
}

interface ErroImportacao {
  escola: string;
  erro: string;
  sucesso: boolean;
}

const EscolasPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  // Estados principais
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados para exibir detalhes dos erros de importação
  const [errosImportacao, setErrosImportacao] = useState<ErroImportacao[]>([]);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estados do modal
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    codigo_acesso: '',
    endereco: '',
    municipio: '',
    endereco_maps: '',
    telefone: '',
    email: '',
    nome_gestor: '',
    administracao: '' as 'municipal' | 'estadual' | 'federal' | 'particular' | '',
    ativo: true,
  });

  // Carregar escolas
  const loadEscolas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listarEscolas();
      setEscolas(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError('Erro ao carregar escolas. Tente novamente.');
      setEscolas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEscolas();
  }, [loadEscolas]);

  // Detectar filtros ativos
  useEffect(() => {
    const hasFilters = !!(selectedMunicipio || selectedStatus || searchTerm || selectedModalidades.length > 0);
    setHasActiveFilters(hasFilters);
  }, [selectedMunicipio, selectedStatus, searchTerm, selectedModalidades]);

  // Extrair dados únicos para filtros
  const municipios = useMemo(() => [...new Set(escolas.map(e => e.municipio).filter(Boolean))].sort(), [escolas]);
  const modalidades = useMemo(() => [...new Set(escolas.flatMap(e => e.modalidades?.split(',').map(mod => mod.trim()) || []).filter(Boolean))].sort(), [escolas]);

  // Filtrar e ordenar escolas
  const filteredEscolas = useMemo(() => {
    return escolas.filter(escola => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = escola.nome.toLowerCase().includes(searchLower) ||
        escola.municipio?.toLowerCase().includes(searchLower);
      const matchesMunicipio = !selectedMunicipio || escola.municipio === selectedMunicipio;
      const matchesStatus = !selectedStatus || (selectedStatus === 'ativo' ? escola.ativo : !escola.ativo);
      const matchesModalidades = selectedModalidades.length === 0 || 
        (escola.modalidades && selectedModalidades.some(modalidade => 
          escola.modalidades!.split(',').map(m => m.trim()).includes(modalidade)
        ));
      return matchesSearch && matchesMunicipio && matchesStatus && matchesModalidades;
    }).sort((a, b) => {
      // Lógica de ordenação
      return a.nome.localeCompare(b.nome);
    });
  }, [escolas, searchTerm, selectedMunicipio, selectedStatus, selectedModalidades, sortBy]);

  // Escolas paginadas
  const paginatedEscolas = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredEscolas.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredEscolas, page, rowsPerPage]);

  // Funções de paginação e filtros
  const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);
  useEffect(() => { setPage(0); }, [searchTerm, selectedMunicipio, selectedStatus, selectedModalidades, sortBy]);
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedMunicipio('');
    setSelectedStatus('');
    setSelectedModalidades([]);
    setSortBy('name');
  }, []);
  const toggleFilters = useCallback(() => setFiltersExpanded(!filtersExpanded), [filtersExpanded]);

  // Componente de conteúdo dos filtros
  const FiltersContent = () => (
    <Box sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '16px', p: 3, border: '1px solid rgba(148, 163, 184, 0.1)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TuneRounded sx={{ color: '#4f46e5' }} /><Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>Filtros Avançados</Typography></Box>
        {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: '#64748b', textTransform: 'none' }}>Limpar Tudo</Button>}
      </Box>
      <Divider sx={{ mb: 3 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
        <FormControl fullWidth><InputLabel>Município</InputLabel><Select value={selectedMunicipio} onChange={(e) => setSelectedMunicipio(e.target.value)} label="Município"><MenuItem value="">Todos</MenuItem>{municipios.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel>Status</InputLabel><Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} label="Status"><MenuItem value="">Todos</MenuItem><MenuItem value="ativo">Ativas</MenuItem><MenuItem value="inativo">Inativas</MenuItem></Select></FormControl>
        <FormControl fullWidth><InputLabel>Ordenar por</InputLabel><Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Ordenar por"><MenuItem value="name">Nome</MenuItem><MenuItem value="municipio">Município</MenuItem><MenuItem value="status">Status</MenuItem></Select></FormControl>
        <FormControl fullWidth><InputLabel>Modalidades</InputLabel><Select multiple value={selectedModalidades} onChange={(e) => setSelectedModalidades(e.target.value as string[])} input={<OutlinedInput label="Modalidades" />} renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map(v => <Chip key={v} label={v} size="small" />)}</Box>}>{modalidades.map(m => <MenuItem key={m} value={m}><Checkbox checked={selectedModalidades.includes(m)} />{m}</MenuItem>)}</Select></FormControl>
      </Box>
    </Box>
  );

  // Funções de modais e ações
  const openModal = () => {
    setFormData({ nome: '', codigo: '', codigo_acesso: '', endereco: '', municipio: '', endereco_maps: '', telefone: '', email: '', nome_gestor: '', administracao: '', ativo: true });
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const handleSave = async () => { /* ... sua lógica de salvar ... */ };
  const handleViewDetails = (escola: Escola) => navigate(`/escolas/${escola.id}`);
  const handleImportEscolas = async (escolasImportacao: any[]) => { /* ... sua lógica de importação ... */ };
  const handleExportarEscolas = async () => { /* ... sua lógica de exportação ... */ };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TextField placeholder="Buscar escolas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#64748b' }} /></InputAdornment>), endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>)}}/>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLess /> : <TuneRounded />} onClick={toggleFilters}>Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }}/>)}</Button>
              <Button startIcon={<AddIcon />} onClick={openModal} sx={{ bgcolor: '#059669', color: 'white', '&:hover': { bgcolor: '#047857' } }}>Nova Escola</Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} sx={{ border: '1px solid #d1d5db' }}><MoreVert /></IconButton>
            </Box>
          </Box>
          <Collapse in={filtersExpanded} timeout={400}><Box sx={{ mb: 3 }}><FiltersContent /></Box></Collapse>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>{`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredEscolas.length)}-${Math.min((page + 1) * rowsPerPage, filteredEscolas.length)} de ${filteredEscolas.length} escolas`}</Typography>
        </Card>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadEscolas}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredEscolas.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><School sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} /><Typography variant="h6" sx={{ color: '#6b7280' }}>Nenhuma escola encontrada</Typography></CardContent></Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table>
                <TableHead><TableRow><TableCell>Nome da Escola</TableCell><TableCell>Modalidades</TableCell><TableCell>Município</TableCell><TableCell align="center">Status</TableCell><TableCell align="center">Ações</TableCell></TableRow></TableHead>
                <TableBody>
                  {paginatedEscolas.map((escola) => (
                    <TableRow key={escola.id} hover>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{escola.nome}</Typography>{escola.endereco && <Typography variant="caption" color="text.secondary">{escola.endereco}</Typography>}</TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{escola.modalidades || '-'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{escola.municipio || '-'}</Typography></TableCell>
                      <TableCell align="center"><Chip label={escola.ativo ? 'Ativa' : 'Inativa'} size="small" color={escola.ativo ? 'success' : 'error'} variant="outlined" /></TableCell>
                      <TableCell align="center"><Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => handleViewDetails(escola)} color="primary"><Info fontSize="small" /></IconButton></Tooltip></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={filteredEscolas.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Itens por página:" />
          </Paper>
        )}
      </Box>

      {/* Modal de Criação */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        {/* ... seu código do modal de criação ... */}
      </Dialog>
      
      {/* Modal de Importação */}
      <ImportacaoEscolas open={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImportEscolas} />

      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); setImportModalOpen(true); }}><Upload sx={{ mr: 1 }} /> Importar em Lote</MenuItem>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); handleExportarEscolas(); }}><Download sx={{ mr: 1 }} /> Exportar Excel</MenuItem>
      </Menu>
    </Box>
  );
};

export default EscolasPage;