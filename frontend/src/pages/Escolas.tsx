import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StatusIndicator from '../components/StatusIndicator';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import TableFilter, { FilterField } from '../components/TableFilter';
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
  FilterList as FilterIcon,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import CompactPagination from '../components/CompactPagination';
import { useNavigate, useLocation } from 'react-router-dom';
import { listarEscolas, criarEscola, importarEscolasLote } from '../services/escolas';
import { useEscolas, useCriarEscola } from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import ImportacaoEscolas from '../components/ImportacaoEscolas';
import LocationSelector from '../components/LocationSelector';
import { LoadingScreen } from '../components';
import { LoadingOverlay } from '../components/LoadingOverlay';
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
  const location = useLocation();

  // React Query hooks
  const escolasQuery = useEscolas();
  const criarEscolaMutation = useCriarEscola();
  const toast = useToast();
  
  // Estados locais (apenas UI)
  const [error, setError] = useState<string | null>(null);

  // Estados de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);

  // Estados de importação
  const [errosImportacao, setErrosImportacao] = useState<ErroImportacao[]>([]);
  const [sucessoImportacaoCount, setSucessoImportacaoCount] = useState(0);

  // Estados de filtros - NOVO SISTEMA
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<'nome' | 'municipio' | 'total_alunos' | ''>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);

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

  // Extrair dados únicos para filtros
  const municipios = useMemo(() => [...new Set(escolas.map(e => e.municipio).filter(Boolean))].sort(), [escolas]);
  const modalidades = useMemo(() => [...new Set(escolas.flatMap(e => e.modalidades?.split(',').map(mod => mod.trim()) || []).filter(Boolean))].sort(), [escolas]);

  useEffect(() => {
    const state = location.state as { successMessage?: string } | undefined;
    if (state?.successMessage) {
      setSuccessMessage(state.successMessage);
      loadEscolas();
      navigate(location.pathname, { replace: true });
    }
  }, [loadEscolas, location.pathname, location.state, navigate]);

  // Definir campos de filtro
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'select',
      label: 'Município',
      key: 'municipio',
      options: municipios.map(m => ({ value: m, label: m })),
    },
    {
      type: 'select',
      label: 'Administração',
      key: 'administracao',
      options: [
        { value: 'municipal', label: 'Municipal' },
        { value: 'estadual', label: 'Estadual' },
        { value: 'federal', label: 'Federal' },
        { value: 'particular', label: 'Particular' },
      ],
    },
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'ativo', label: 'Ativas' },
        { value: 'inativo', label: 'Inativas' },
      ],
    },
    {
      type: 'custom',
      label: 'Modalidades',
      key: 'modalidades',
      customRender: (value, onChange) => (
        <FormControl fullWidth size="small">
          <Select
            multiple
            value={value || []}
            onChange={(e) => onChange(e.target.value)}
            input={<OutlinedInput />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map(v => <Chip key={v} label={v} size="small" />)}
              </Box>
            )}
            sx={{ borderRadius: '8px' }}
          >
            {modalidades.map(m => (
              <MenuItem key={m} value={m}>
                <Checkbox checked={(value || []).includes(m)} />
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ),
    },
  ], [municipios, modalidades]);

  const filteredEscolas = useMemo(() => {
    return escolas.filter(escola => {
      // Busca por palavra-chave
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!escola.nome.toLowerCase().includes(searchLower) &&
            !(escola.municipio || '').toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Filtro de município
      if (filters.municipio && escola.municipio !== filters.municipio) {
        return false;
      }

      // Filtro de administração
      if (filters.administracao && escola.administracao !== filters.administracao) {
        return false;
      }

      // Filtro de status
      if (filters.status) {
        if (filters.status === 'ativo' && !escola.ativo) return false;
        if (filters.status === 'inativo' && escola.ativo) return false;
      }

      // Filtro de modalidades
      if (filters.modalidades && filters.modalidades.length > 0) {
        if (!escola.modalidades) return false;
        const escolaModalidades = escola.modalidades.split(',').map(m => m.trim());
        if (!filters.modalidades.some((m: string) => escolaModalidades.includes(m))) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (!sortBy) return 0;
      
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      
      if (sortBy === 'nome') {
        return a.nome.localeCompare(b.nome) * multiplier;
      }
      if (sortBy === 'municipio') {
        return (a.municipio || '').localeCompare(b.municipio || '') * multiplier;
      }
      if (sortBy === 'total_alunos') {
        return ((a.total_alunos || 0) - (b.total_alunos || 0)) * multiplier;
      }
      return 0;
    });
  }, [escolas, filters, sortBy, sortOrder]);

  const paginatedEscolas = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredEscolas.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredEscolas, page, rowsPerPage]);

  const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);
  // Reset da página quando filtros mudam
  useEffect(() => { setPage(0); }, [filters, sortBy]);
  
  const handleSort = (column: 'nome' | 'municipio' | 'total_alunos') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    
    // Validação especial para codigo_acesso: apenas números, máximo 6 dígitos
    if (name === 'codigo_acesso') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6);
      setFormData(prev => ({ ...prev, [name!]: numericValue }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name!]: value as string }));
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [event.target.name]: event.target.checked }));
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("O nome da escola é obrigatório.");
      return;
    }
    
    criarEscolaMutation.mutate(formData, {
      onSuccess: () => {
        setSuccessMessage('Escola criada com sucesso!');
        closeModal();
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao salvar a escola. Verifique os dados e tente novamente.';
        setError(errorMessage);
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

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      {error && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="error" onClose={() => setError(null)}>{error}</Alert></Box>)}

      <PageContainer fullHeight>
        <PageHeader 
          title="Escolas"
        />
        
        <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar escolas..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              size="small"
              sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setFilters(prev => ({ ...prev, search: '' }))}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<FilterIcon />} onClick={(e) => { setFilterAnchorEl(e.currentTarget); setFilterOpen(true); }} size="small">
                Filtros
              </Button>
              <Button startIcon={<AddIcon />} onClick={openModal} variant="contained" color="add" size="small">Nova Escola</Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small"><MoreVert /></IconButton>
            </Box>
          </Box>
        </Card>

        <TableFilter
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={setFilters}
          fields={filterFields}
          initialValues={filters}
          showSearch={false}
          anchorEl={filterAnchorEl}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, px: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            Exibindo {filteredEscolas.length} resultado{filteredEscolas.length !== 1 ? 's' : ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusIndicator status="ativo" size="small" />
            <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ATIVAS
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
              {filteredEscolas.filter(e => e.ativo).length}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusIndicator status="inativo" size="small" />
            <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              INATIVAS
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
              {filteredEscolas.filter(e => !e.ativo).length}
            </Typography>
          </Box>
        </Box>

        {errosImportacao.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setErrosImportacao([])}>
            <Typography variant="h6">Relatório de Importação</Typography>
            <Typography variant="body2">Algumas escolas não puderam ser importadas. Veja os detalhes:</Typography>
            <Box component="ul" sx={{ pl: 2, mt: 1, maxHeight: 150, overflowY: 'auto' }}>{errosImportacao.map((err, i) => <li key={i}><Typography variant="caption"><strong>{err.escola}:</strong> {err.erro}</Typography></li>)}</Box>
          </Alert>
        )}

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {loading ? (<LoadingScreen message="Carregando escolas..." />
          ) : error && escolas.length === 0 ? (<Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadEscolas}>Tentar Novamente</Button></CardContent></Card>
          ) : filteredEscolas.length === 0 ? (<Card><CardContent sx={{ textAlign: 'center', py: 6 }}><School sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhuma escola encontrada</Typography></CardContent></Card>
          ) : (
            <Box sx={{ width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#e9ecef' }
                        }}
                        onClick={() => handleSort('nome')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          Nome da Escola
                          {sortBy === 'nome' && (
                            sortOrder === 'asc' ? <ArrowUpward sx={{ fontSize: '0.875rem' }} /> : <ArrowDownward sx={{ fontSize: '0.875rem' }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="center" 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#e9ecef' }
                        }}
                        onClick={() => handleSort('total_alunos')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          Total de Alunos
                          {sortBy === 'total_alunos' && (
                            sortOrder === 'asc' ? <ArrowUpward sx={{ fontSize: '0.875rem' }} /> : <ArrowDownward sx={{ fontSize: '0.875rem' }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">Modalidades</TableCell>
                      <TableCell 
                        align="center" 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#e9ecef' }
                        }}
                        onClick={() => handleSort('municipio')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          Município
                          {sortBy === 'municipio' && (
                            sortOrder === 'asc' ? <ArrowUpward sx={{ fontSize: '0.875rem' }} /> : <ArrowDownward sx={{ fontSize: '0.875rem' }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">Administração</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedEscolas.map((escola, index) => (
                      <TableRow key={escola.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIndicator status={escola.ativo ? 'ativo' : 'inativo'} size="small" />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{escola.nome}</Typography>
                            {escola.endereco && <Typography variant="caption" sx={{ color: '#6c757d' }} display="block">{escola.endereco}</Typography>}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>{escola.total_alunos || 0}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ color: '#6c757d' }}>{escola.modalidades || '-'}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ color: '#6c757d' }}>{escola.municipio || '-'}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ color: '#6c757d', textTransform: 'capitalize' }}>{escola.administracao || '-'}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => handleViewDetails(escola)} color="primary"><Visibility fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <CompactPagination 
                count={filteredEscolas.length} 
                page={page} 
                onPageChange={handleChangePage} 
                rowsPerPage={rowsPerPage} 
                onRowsPerPageChange={handleChangeRowsPerPage} 
                rowsPerPageOptions={[25, 50, 100, 200]} 
              />
            </Box>
          )}
        </Box>

      {/* Modal de Criação */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Escola</DialogTitle>
        <DialogContent dividers><Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}><TextField name="nome" label="Nome da Escola" value={formData.nome} onChange={handleFormChange} fullWidth required /></Grid>
          <Grid item xs={12} sm={6}><TextField name="codigo" label="Código INEP" value={formData.codigo} onChange={handleFormChange} fullWidth /></Grid>
          <Grid item xs={12} sm={6}><TextField name="codigo_acesso" label="Código de Acesso (6 dígitos)" value={formData.codigo_acesso} onChange={handleFormChange} fullWidth required inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }} helperText="Código numérico de 6 dígitos para acesso da escola" /></Grid>
          <Grid item xs={12}><FormControl fullWidth><InputLabel>Administração</InputLabel><Select name="administracao" value={formData.administracao} label="Administração" onChange={handleFormChange}><MenuItem value=""><em>Nenhuma</em></MenuItem><MenuItem value="municipal">Municipal</MenuItem><MenuItem value="estadual">Estadual</MenuItem><MenuItem value="federal">Federal</MenuItem><MenuItem value="particular">Particular</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12}><TextField name="endereco" label="Endereço Completo" value={formData.endereco} onChange={handleFormChange} fullWidth /></Grid>
          <Grid item xs={12}><TextField name="municipio" label="Município" value={formData.municipio} onChange={handleFormChange} fullWidth /></Grid>
          <Grid item xs={12}><LocationSelector value={formData.endereco_maps} onChange={(m) => setFormData(p => ({ ...p, endereco_maps: m }))} label="Localização no Mapa" placeholder="Cole a URL do Google Maps aqui" /></Grid>
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

      <LoadingOverlay 
        open={criarEscolaMutation.isPending || loadingImport || loadingExport}
        message={
          criarEscolaMutation.isPending ? 'Salvando escola...' :
          loadingImport ? 'Importando escolas...' :
          loadingExport ? 'Exportando para Excel...' :
          'Processando...'
        }
      />
    </PageContainer>
    </Box>
  );
};

export default EscolasPage;
