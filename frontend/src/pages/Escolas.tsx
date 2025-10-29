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
  SelectChangeEvent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Info,
  Visibility,
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
import { useEscolas, useCriarEscola } from '../hooks/queries';
import ImportacaoEscolas from '../components/ImportacaoEscolas';
import LocationSelector from '../components/LocationSelector';
import * as XLSX from 'xlsx';

// Interfaces
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
}

const EscolasPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  // React Query hooks
  const escolasQuery = useEscolas();
  const criarEscolaMutation = useCriarEscola();
  
  // Estados locais (apenas UI)
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);

  // Estados de importação
  const [errosImportacao, setErrosImportacao] = useState<ErroImportacao[]>([]);
  const [sucessoImportacaoCount, setSucessoImportacaoCount] = useState(0);

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
  const [loadingSave, setLoadingSave] = useState(false);
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

  // Dados derivados do React Query
  const escolas = escolasQuery.data || [];
  const loading = escolasQuery.isLoading;
  
  const loadEscolas = useCallback(() => {
    escolasQuery.refetch();
  }, [escolasQuery]);

  useEffect(() => {
    loadEscolas();
  }, [loadEscolas]);

  useEffect(() => {
    const hasFilters = !!(selectedMunicipio || selectedStatus || searchTerm || selectedModalidades.length > 0);
    setHasActiveFilters(hasFilters);
  }, [selectedMunicipio, selectedStatus, searchTerm, selectedModalidades]);

  const municipios = useMemo(() => [...new Set(escolas.map(e => e.municipio).filter(Boolean))].sort(), [escolas]);
  const modalidades = useMemo(() => [...new Set(escolas.flatMap(e => e.modalidades?.split(',').map(mod => mod.trim()) || []).filter(Boolean))].sort(), [escolas]);

  const filteredEscolas = useMemo(() => {
    return escolas.filter(escola => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = escola.nome.toLowerCase().includes(searchLower) || escola.municipio?.toLowerCase().includes(searchLower);
      const matchesMunicipio = !selectedMunicipio || escola.municipio === selectedMunicipio;
      const matchesStatus = !selectedStatus || (selectedStatus === 'ativo' ? escola.ativo : !escola.ativo);
      const matchesModalidades = selectedModalidades.length === 0 || (escola.modalidades && selectedModalidades.some(modalidade => escola.modalidades!.split(',').map(m => m.trim()).includes(modalidade)));
      return matchesSearch && matchesMunicipio && matchesStatus && matchesModalidades;
    }).sort((a, b) => {
      if (sortBy === 'municipio') return (a.municipio || '').localeCompare(b.municipio || '');
      if (sortBy === 'status') return Number(b.ativo) - Number(a.ativo);
      return a.nome.localeCompare(b.nome);
    });
  }, [escolas, searchTerm, selectedMunicipio, selectedStatus, selectedModalidades, sortBy]);

  const paginatedEscolas = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredEscolas.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredEscolas, page, rowsPerPage]);

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

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name!]: value as string }));
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [event.target.name]: event.target.checked }));
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      alert("O nome da escola é obrigatório.");
      return;
    }
    
    criarEscolaMutation.mutate(formData, {
      onSuccess: () => {
        setSuccessMessage('Escola criada com sucesso!');
        closeModal();
      },
      onError: () => {
        setError('Erro ao salvar a escola. Verifique os dados e tente novamente.');
      }
    });
  };

  const handleImportEscolas = async (escolasParaImportar: any[]) => {
    if (!escolasParaImportar || escolasParaImportar.length === 0) {
      setError("Nenhum dado válido para importar.");
      return;
    }
    try {
      setLoadingImport(true);
      setImportModalOpen(false);
      const response = await importarEscolasLote(escolasParaImportar);
      const { sucesso_count = 0, erros = [] } = response.data || {};

      setSuccessMessage(`${sucesso_count} escolas foram importadas com sucesso.`);
      if (erros.length > 0) {
        setErrosImportacao(erros);
      }
      loadEscolas();
    } catch (err) {
      setError('Ocorreu um erro crítico durante a importação.');
    } finally {
      setLoadingImport(false);
    }
  };

  const handleExportarEscolas = () => {
    if (filteredEscolas.length === 0) {
      setError("Não há escolas para exportar com os filtros atuais.");
      return;
    }
    try {
      setLoadingExport(true);
      const dataToExport = filteredEscolas.map(e => ({
        'Nome': e.nome,
        'Endereço': e.endereco,
        'Município': e.municipio,
        'Telefone': e.telefone,
        'Gestor': e.nome_gestor,
        'Administração': e.administracao,
        'Código de Acesso': e.codigo_acesso,
        'Ativo': e.ativo ? 'Sim' : 'Não'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Escolas');
      XLSX.writeFile(workbook, `Relatorio_Escolas_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
      setSuccessMessage("Exportação concluída com sucesso!");
    } catch (err) {
      setError("Ocorreu um erro ao gerar o arquivo Excel.");
    } finally {
      setLoadingExport(false);
    }
  };

  const openModal = () => {
    setFormData({ nome: '', codigo: '', codigo_acesso: '', endereco: '', municipio: '', endereco_maps: '', telefone: '', email: '', nome_gestor: '', administracao: '', ativo: true });
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);
  const handleViewDetails = (escola: Escola) => navigate(`/escolas/${escola.id}`);

  const FiltersContent = () => (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: '12px', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.9rem' }}>Filtros Avançados</Typography>
        {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.8rem' }}>Limpar</Button>}
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}><FormControl fullWidth size="small"><InputLabel>Município</InputLabel><Select value={selectedMunicipio} onChange={(e: SelectChangeEvent<string>) => setSelectedMunicipio(e.target.value)} label="Município"><MenuItem value="">Todos</MenuItem>{municipios.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl></Grid>
        <Grid item xs={12} sm={6} md={3}><FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select value={selectedStatus} onChange={(e: SelectChangeEvent<string>) => setSelectedStatus(e.target.value)} label="Status"><MenuItem value="">Todos</MenuItem><MenuItem value="ativo">Ativas</MenuItem><MenuItem value="inativo">Inativas</MenuItem></Select></FormControl></Grid>
        <Grid item xs={12} sm={6} md={3}><FormControl fullWidth size="small"><InputLabel>Ordenar por</InputLabel><Select value={sortBy} onChange={(e: SelectChangeEvent<string>) => setSortBy(e.target.value)} label="Ordenar por"><MenuItem value="name">Nome</MenuItem><MenuItem value="municipio">Município</MenuItem><MenuItem value="status">Status</MenuItem></Select></FormControl></Grid>
        <Grid item xs={12} sm={6} md={3}><FormControl fullWidth size="small"><InputLabel>Modalidades</InputLabel><Select multiple value={selectedModalidades} onChange={(e: SelectChangeEvent<string[]>) => setSelectedModalidades(e.target.value as string[])} input={<OutlinedInput label="Modalidades" />} renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map(v => <Chip key={v} label={v} size="small" />)}</Box>}>{modalidades.map(m => <MenuItem key={m} value={m}><Checkbox checked={selectedModalidades.includes(m)} />{m}</MenuItem>)}</Select></FormControl></Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      {error && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="error" onClose={() => setError(null)}>{error}</Alert></Box>)}

      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>Gestão de Escolas</Typography>

        <Card sx={{ borderRadius: '12px', p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField placeholder="Buscar escolas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>), endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>) }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLess /> : <TuneRounded />} onClick={toggleFilters} size="small">Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />)}</Button>
              <Button startIcon={<AddIcon />} onClick={openModal} variant="contained" color="success" size="small">Nova Escola</Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small"><MoreVert /></IconButton>
            </Box>
          </Box>
          <Collapse in={filtersExpanded} timeout={300}><Box sx={{ mb: 2 }}><FiltersContent /></Box></Collapse>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredEscolas.length)}-${Math.min((page + 1) * rowsPerPage, filteredEscolas.length)} de ${filteredEscolas.length} escolas`}</Typography>
        </Card>

        {errosImportacao.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setErrosImportacao([])}>
            <Typography variant="h6">Relatório de Importação</Typography>
            <Typography variant="body2">Algumas escolas não puderam ser importadas. Veja os detalhes:</Typography>
            <Box component="ul" sx={{ pl: 2, mt: 1, maxHeight: 150, overflowY: 'auto' }}>{errosImportacao.map((err, i) => <li key={i}><Typography variant="caption"><strong>{err.escola}:</strong> {err.erro}</Typography></li>)}</Box>
          </Alert>
        )}

        {loading ? (<Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error && escolas.length === 0 ? (<Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadEscolas}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredEscolas.length === 0 ? (<Card><CardContent sx={{ textAlign: 'center', py: 6 }}><School sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhuma escola encontrada</Typography></CardContent></Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table>
                <TableHead><TableRow><TableCell>Nome da Escola</TableCell><TableCell align="center">Total de Alunos</TableCell><TableCell>Modalidades</TableCell><TableCell>Município</TableCell><TableCell align="center">Status</TableCell><TableCell align="center">Ações</TableCell></TableRow></TableHead>
                <TableBody>{paginatedEscolas.map((escola) => (<TableRow key={escola.id} hover><TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{escola.nome}</Typography>{escola.endereco && <Typography variant="caption" color="text.secondary" display="block">{escola.endereco}</Typography>}</TableCell><TableCell align="center"><Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>{escola.total_alunos || 0}</Typography></TableCell><TableCell><Typography variant="body2" color="text.secondary">{escola.modalidades || '-'}</Typography></TableCell><TableCell><Typography variant="body2" color="text.secondary">{escola.municipio || '-'}</Typography></TableCell><TableCell align="center"><Chip label={escola.ativo ? 'Ativa' : 'Inativa'} size="small" color={escola.ativo ? 'success' : 'error'} /></TableCell><TableCell align="center"><Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => handleViewDetails(escola)} color="primary"><Visibility fontSize="small" /></IconButton></Tooltip></TableCell></TableRow>))}</TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={filteredEscolas.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Itens por página:" />
          </Paper>
        )}
      </Box>

      {/* Modal de Criação */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Escola</DialogTitle>
        <DialogContent dividers><Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}><TextField name="nome" label="Nome da Escola" value={formData.nome} onChange={handleFormChange} fullWidth required /></Grid>
          <Grid item xs={12} sm={6}><TextField name="codigo" label="Código INEP" value={formData.codigo} onChange={handleFormChange} fullWidth /></Grid>
          <Grid item xs={12} sm={6}><FormControl fullWidth><InputLabel>Administração</InputLabel><Select name="administracao" value={formData.administracao} label="Administração" onChange={handleFormChange}><MenuItem value="municipal">Municipal</MenuItem><MenuItem value="estadual">Estadual</MenuItem><MenuItem value="federal">Federal</MenuItem><MenuItem value="particular">Particular</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12}><TextField name="endereco" label="Endereço Completo" value={formData.endereco} onChange={handleFormChange} fullWidth /></Grid>
          <Grid item xs={12}><LocationSelector value={formData.municipio} onChange={(m) => setFormData(p => ({ ...p, municipio: m }))} label="Município" placeholder="Digite o nome do município ou cole uma URL do Google Maps" /></Grid>
          <Grid item xs={12} sm={6}><TextField name="telefone" label="Telefone" value={formData.telefone} onChange={handleFormChange} fullWidth /></Grid>
          <Grid item xs={12} sm={6}><TextField name="email" label="Email" type="email" value={formData.email} onChange={handleFormChange} fullWidth /></Grid>
          <Grid item xs={12}><TextField name="nome_gestor" label="Nome do Gestor" value={formData.nome_gestor} onChange={handleFormChange} fullWidth /></Grid>
          <Grid item xs={12}><FormControlLabel control={<Switch checked={formData.ativo} onChange={handleSwitchChange} name="ativo" />} label="Escola Ativa" /></Grid>
        </Grid></DialogContent>
        <DialogActions><Button onClick={closeModal} variant="outlined" disabled={criarEscolaMutation.isPending}>Cancelar</Button><Button onClick={handleSave} variant="contained" disabled={criarEscolaMutation.isPending}>{criarEscolaMutation.isPending ? <CircularProgress size={24} /> : 'Salvar Escola'}</Button></DialogActions>
      </Dialog>

      {/* Modal de Importação */}
      <ImportacaoEscolas open={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImportEscolas} />

      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); setImportModalOpen(true); }} disabled={loadingImport}><Upload sx={{ mr: 1 }} /> {loadingImport ? 'Importando...' : 'Importar em Lote'}</MenuItem>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); handleExportarEscolas(); }} disabled={loadingExport}><Download sx={{ mr: 1 }} /> {loadingExport ? 'Exportando...' : 'Exportar Excel'}</MenuItem>
      </Menu>
    </Box>
  );
};

export default EscolasPage;