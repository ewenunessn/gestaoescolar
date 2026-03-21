import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Menu,
  MenuItem,
  Grid,
  SelectChangeEvent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Popover,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Download,
  Upload,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
} from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate, useLocation } from 'react-router-dom';
import { importarEscolasLote } from '../services/escolas';
import { useEscolas, useCriarEscola, useExcluirEscola } from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import ImportacaoEscolas from '../components/ImportacaoEscolas';
import LocationSelector from '../components/LocationSelector';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { DataTable } from '../components/DataTable';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import * as XLSX from 'xlsx';

// Interfaces
interface EscolaLocal {
  id: number;
  nome: string;
  codigo?: string; // Código INEP (também usado para acesso ao sistema)
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
  const navigate = useNavigate();
  const location = useLocation();

  // React Query hooks
  const escolasQuery = useEscolas();
  const criarEscolaMutation = useCriarEscola();
  const excluirEscolaMutation = useExcluirEscola();
  const toast = useToast();

  // Estados de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);
  const [importExportMenuAnchor, setImportExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);

  // Estados de importação
  const [errosImportacao, setErrosImportacao] = useState<ErroImportacao[]>([]);

  // Estados do modal
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [escolaToDelete, setEscolaToDelete] = useState<EscolaLocal | null>(null);
  
  // Estados de filtro
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState({
    status: 'todos',
    administracao: 'todos',
  });
  
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '', // Código INEP (também usado para acesso ao sistema)
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
  
  // Filtrar escolas
  const escolasFiltradas = useMemo(() => {
    return escolas.filter((escola) => {
      // Filtro de status
      if (filters.status === 'ativo' && !escola.ativo) return false;
      if (filters.status === 'inativo' && escola.ativo) return false;
      
      // Filtro de administração
      if (filters.administracao !== 'todos' && escola.administracao !== filters.administracao) {
        return false;
      }
      
      return true;
    });
  }, [escolas, filters]);
  
  const loadEscolas = useCallback(() => {
    escolasQuery.refetch();
  }, [escolasQuery]);

  useEffect(() => {
    const state = location.state as { successMessage?: string } | undefined;
    if (state?.successMessage) {
      toast.success(state.successMessage);
      loadEscolas();
      navigate(location.pathname, { replace: true });
    }
  }, [loadEscolas, location.pathname, location.state, navigate, toast]);

  const handleRowClick = useCallback((escola: EscolaLocal) => {
    navigate(`/escolas/${escola.id}`);
  }, [navigate]);

  const columns = useMemo(() => [
    { 
      accessorKey: 'id', 
      header: 'ID',
      size: 80,
      enableSorting: true,
    },
    { 
      accessorKey: 'nome', 
      header: 'Nome',
      size: 300,
      enableSorting: true,
    },
    { 
      accessorKey: 'total_alunos', 
      header: 'Total Alunos',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as number | undefined;
        return value ? value.toLocaleString('pt-BR') : '-';
      },
    },
    { 
      accessorKey: 'municipio', 
      header: 'Município',
      size: 150,
      enableSorting: true,
      cell: ({ getValue }) => getValue() || '-',
    },
    { 
      accessorKey: 'administracao', 
      header: 'Administração',
      size: 150,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined;
        return value ? String(value).charAt(0).toUpperCase() + String(value).slice(1) : '-';
      },
    },
    { 
      accessorKey: 'ativo', 
      header: 'Status',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Tooltip title={getValue() ? 'Ativa' : 'Inativa'}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: getValue() ? 'success.main' : 'error.main',
              display: 'inline-block',
            }}
          />
        </Tooltip>
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      size: 100,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={() => navigate(`/escolas/${row.original.id}`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              onClick={() => openDeleteModal(row.original)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [navigate, toast]);

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = event.target;
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
        toast.success('Escola criada com sucesso!');
        closeModal();
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao salvar a escola.';
        toast.error(errorMessage);
      }
    });
  };

  const handleImportEscolas = async (escolasParaImportar: any[]) => {
    if (!escolasParaImportar || escolasParaImportar.length === 0) {
      toast.error("Nenhum dado válido para importar.");
      return;
    }
    try {
      setLoadingImport(true);
      setImportModalOpen(false);
      const response = await importarEscolasLote(escolasParaImportar);
      const { sucesso_count = 0, erros = [] } = response.data || {};

      toast.success(`${sucesso_count} escolas foram importadas com sucesso.`);
      if (erros.length > 0) {
        setErrosImportacao(erros);
      }
      loadEscolas();
    } catch (err) {
      toast.error('Ocorreu um erro crítico durante a importação.');
    } finally {
      setLoadingImport(false);
    }
  };

  const handleExportarEscolas = () => {
    if (escolas.length === 0) {
      toast.error("Não há escolas para exportar.");
      return;
    }
    try {
      setLoadingExport(true);
      const dataToExport = escolas.map(e => ({
        'Nome': e.nome,
        'Código INEP': e.codigo,
        'Endereço': e.endereco,
        'Município': e.municipio,
        'Telefone': e.telefone,
        'Gestor': e.nome_gestor,
        'Administração': e.administracao,
        'Ativo': e.ativo ? 'Sim' : 'Não'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Escolas');
      XLSX.writeFile(workbook, `Relatorio_Escolas_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
      toast.success("Exportação concluída com sucesso!");
    } catch (err) {
      toast.error("Ocorreu um erro ao gerar o arquivo Excel.");
    } finally {
      setLoadingExport(false);
    }
  };

  const openModal = () => {
    setFormData({ 
      nome: '', 
      codigo: '', // Código INEP (também usado para acesso ao sistema)
      endereco: '', 
      municipio: '', 
      endereco_maps: '', 
      telefone: '', 
      email: '', 
      nome_gestor: '', 
      administracao: '', 
      ativo: true 
    });
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const openDeleteModal = (escola: EscolaLocal) => {
    setEscolaToDelete(escola);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setEscolaToDelete(null);
  };

  const handleDelete = async () => {
    if (!escolaToDelete) return;
    try {
      await excluirEscolaMutation.mutateAsync(escolaToDelete.id);
      toast.success('Escola excluída com sucesso!');
      closeDeleteModal();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Erro ao excluir. A escola pode estar em uso.';
      toast.error(errorMessage);
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageContainer fullHeight>
        <PageHeader title="Escolas" />

        {errosImportacao.length > 0 && (
          <Alert severity="warning" onClose={() => setErrosImportacao([])}>
            <Typography variant="h6">Relatório de Importação</Typography>
            <Typography variant="body2">Algumas escolas não puderam ser importadas.</Typography>
          </Alert>
        )}

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            data={escolasFiltradas}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            searchPlaceholder="Buscar escolas..."
            onCreateClick={openModal}
            createButtonLabel="Nova Escola"
            onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
            onImportExportClick={(e) => setImportExportMenuAnchor(e.currentTarget)}
          />
        </Box>
      </PageContainer>

      {/* Popover de Filtros */}
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 280 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Filtros
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="ativo">Ativas</MenuItem>
              <MenuItem value="inativo">Inativas</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Administração</InputLabel>
            <Select
              value={filters.administracao}
              label="Administração"
              onChange={(e) => setFilters({ ...filters, administracao: e.target.value })}
            >
              <MenuItem value="todos">Todas</MenuItem>
              <MenuItem value="municipal">Municipal</MenuItem>
              <MenuItem value="estadual">Estadual</MenuItem>
              <MenuItem value="federal">Federal</MenuItem>
              <MenuItem value="particular">Particular</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setFilters({ status: 'todos', administracao: 'todos' });
              }}
            >
              Limpar
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => setFilterAnchorEl(null)}
            >
              Aplicar
            </Button>
          </Box>
          
          {/* Indicador de filtros ativos */}
          {(filters.status !== 'todos' || filters.administracao !== 'todos') && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Filtros ativos:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {filters.status !== 'todos' && (
                  <Chip
                    label={`Status: ${filters.status === 'ativo' ? 'Ativas' : 'Inativas'}`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, status: 'todos' })}
                  />
                )}
                {filters.administracao !== 'todos' && (
                  <Chip
                    label={`Adm: ${filters.administracao.charAt(0).toUpperCase() + filters.administracao.slice(1)}`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, administracao: 'todos' })}
                  />
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Popover>

      {/* Modal de Criação */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Nova Escola
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Preencha os dados da escola
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            {/* Informações Básicas */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Informações Básicas
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField 
                    name="nome" 
                    label="Nome da Escola" 
                    value={formData.nome} 
                    onChange={handleFormChange} 
                    fullWidth 
                    required
                    placeholder="Ex: Escola Municipal João Silva"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    name="codigo" 
                    label="Código INEP" 
                    value={formData.codigo} 
                    onChange={handleFormChange} 
                    fullWidth
                    placeholder="Ex: 12345678"
                    helperText="Código do INEP - também usado para acesso ao sistema"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Administração *</InputLabel>
                    <Select 
                      name="administracao" 
                      value={formData.administracao} 
                      label="Tipo de Administração *" 
                      onChange={handleFormChange}
                    >
                      <MenuItem value=""><em>Selecione</em></MenuItem>
                      <MenuItem value="municipal">Municipal</MenuItem>
                      <MenuItem value="estadual">Estadual</MenuItem>
                      <MenuItem value="federal">Federal</MenuItem>
                      <MenuItem value="particular">Particular</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Localização */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Localização
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField 
                    name="endereco" 
                    label="Endereço Completo" 
                    value={formData.endereco} 
                    onChange={handleFormChange} 
                    fullWidth
                    placeholder="Rua, número, bairro"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    name="municipio" 
                    label="Município" 
                    value={formData.municipio} 
                    onChange={handleFormChange} 
                    fullWidth
                    placeholder="Ex: São Paulo"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocationSelector 
                    value={formData.endereco_maps} 
                    onChange={(m) => setFormData(p => ({ ...p, endereco_maps: m }))} 
                    label="Localização no Mapa" 
                    placeholder="Cole a URL do Google Maps"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Contato */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Contato
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    name="telefone" 
                    label="Telefone" 
                    value={formData.telefone} 
                    onChange={handleFormChange} 
                    fullWidth
                    placeholder="(00) 0000-0000"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    name="email" 
                    label="Email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleFormChange} 
                    fullWidth
                    placeholder="escola@exemplo.com"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    name="nome_gestor" 
                    label="Nome do Gestor/Diretor" 
                    value={formData.nome_gestor} 
                    onChange={handleFormChange} 
                    fullWidth
                    placeholder="Nome completo do responsável"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Status */}
            <Box>
              <FormControlLabel 
                control={
                  <Switch 
                    checked={formData.ativo} 
                    onChange={handleSwitchChange} 
                    name="ativo"
                    color="primary"
                  />
                } 
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Escola Ativa
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Escolas ativas aparecem no sistema e podem receber entregas
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={closeModal} 
            variant="outlined" 
            disabled={criarEscolaMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={criarEscolaMutation.isPending || !formData.nome.trim()}
            startIcon={criarEscolaMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {criarEscolaMutation.isPending ? 'Salvando...' : 'Salvar Escola'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Importação */}
      <ImportacaoEscolas open={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImportEscolas} />

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a escola "{escolaToDelete?.nome}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteModal} disabled={excluirEscolaMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={excluirEscolaMutation.isPending}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); setImportModalOpen(true); }} disabled={loadingImport}>
          <Upload sx={{ mr: 1 }} /> {loadingImport ? 'Importando...' : 'Importar em Lote'}
        </MenuItem>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); handleExportarEscolas(); }} disabled={loadingExport}>
          <Download sx={{ mr: 1 }} /> {loadingExport ? 'Exportando...' : 'Exportar Excel'}
        </MenuItem>
      </Menu>

      {/* Menu de Importar/Exportar */}
      <Menu 
        anchorEl={importExportMenuAnchor} 
        open={Boolean(importExportMenuAnchor)} 
        onClose={() => setImportExportMenuAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem 
          onClick={() => { 
            setImportExportMenuAnchor(null); 
            setImportModalOpen(true); 
          }} 
          disabled={loadingImport}
        >
          <FileUploadIcon sx={{ mr: 1 }} /> 
          {loadingImport ? 'Importando...' : 'Importar Escolas'}
        </MenuItem>
        <MenuItem 
          onClick={() => { 
            setImportExportMenuAnchor(null); 
            handleExportarEscolas(); 
          }} 
          disabled={loadingExport}
        >
          <FileDownloadIcon sx={{ mr: 1 }} /> 
          {loadingExport ? 'Exportando...' : 'Exportar Excel'}
        </MenuItem>
      </Menu>

      <LoadingOverlay 
        open={criarEscolaMutation.isPending || excluirEscolaMutation.isPending || loadingImport || loadingExport}
        message={
          criarEscolaMutation.isPending ? 'Salvando escola...' :
          excluirEscolaMutation.isPending ? 'Excluindo escola...' :
          loadingImport ? 'Importando escolas...' :
          loadingExport ? 'Exportando para Excel...' :
          'Processando...'
        }
      />
    </Box>
  );
};

export default EscolasPage;
