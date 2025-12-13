import React, { useState, useMemo, useCallback, useEffect } from "react";
import StatusIndicator from "../components/StatusIndicator";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  Paper,
  CircularProgress,
  Menu,
  MenuItem,
  Collapse,
  Divider,
  TablePagination,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Business,
  Download,
  Upload,
  Search as SearchIcon,
  TuneRounded,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
  MoreVert,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  listarFornecedores,
  criarFornecedor,
  editarFornecedor,
  removerFornecedor,
  importarFornecedoresLote,
} from "../services/fornecedores";
import { 
  useFornecedores, 
  useCriarFornecedor, 
  useAtualizarFornecedor, 
  useExcluirFornecedor 
} from "../hooks/queries";
import ImportacaoFornecedores from '../components/ImportacaoFornecedores';
import ConfirmacaoExclusaoFornecedor from '../components/ConfirmacaoExclusaoFornecedor';
import * as XLSX from 'xlsx';
import { formatarDocumento } from "../utils/validacaoDocumento"; // Supondo que você tenha essa util

// Interfaces
interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  email?: string;
  ativo: boolean;
}

const FornecedoresPage: React.FC = () => {
  const navigate = useNavigate();

  // Estados de filtros (moved up before React Query hooks)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("nome");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // React Query hooks
  const { 
    data: fornecedoresData, 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useFornecedores({ search: searchTerm, ativo: selectedStatus ? selectedStatus === 'ativo' : undefined });
  
  const criarFornecedorMutation = useCriarFornecedor();
  const atualizarFornecedorMutation = useAtualizarFornecedor();
  const excluirFornecedorMutation = useExcluirFornecedor();
  
  // Estados locais
  const fornecedores = fornecedoresData?.fornecedores || [];
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const error = queryError?.message || null;

  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estados de modais
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [fornecedorToDelete, setFornecedorToDelete] = useState<Fornecedor | null>(null);
  const [formData, setFormData] = useState({ nome: "", cnpj: "", email: "", ativo: true });

  // Função para refresh manual (React Query já gerencia o carregamento automaticamente)
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);
  
  // Detectar filtros ativos
  useEffect(() => {
    setHasActiveFilters(!!(searchTerm || selectedStatus));
  }, [searchTerm, selectedStatus]);
  
  // Filtrar e ordenar fornecedores
  const filteredFornecedores = useMemo(() => {
    return fornecedores.filter(f => {
      const matchesSearch = f.nome.toLowerCase().includes(searchTerm.toLowerCase()) || f.cnpj.includes(searchTerm);
      const matchesStatus = !selectedStatus || (selectedStatus === 'ativo' && f.ativo) || (selectedStatus === 'inativo' && !f.ativo);
      return matchesSearch && matchesStatus;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [fornecedores, searchTerm, selectedStatus, sortBy]);

  // Fornecedores paginados
  const paginatedFornecedores = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredFornecedores.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredFornecedores, page, rowsPerPage]);
  
  // Funções de paginação
  const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);
  
  // Reset da página quando filtros mudam
  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedStatus, sortBy]);
  
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedStatus("");
    setSortBy("nome");
  }, []);
  
  const toggleFilters = useCallback(() => setFiltersExpanded(!filtersExpanded), [filtersExpanded]);
  
  // Componente de conteúdo dos filtros
  const FiltersContent = () => (
    <Box sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '16px', p: 3, border: '1px solid rgba(148, 163, 184, 0.1)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TuneRounded sx={{ color: 'primary.main' }} /><Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>Filtros Avançados</Typography></Box>
        {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: 'text.secondary', textTransform: 'none' }}>Limpar Tudo</Button>}
      </Box>
      <Divider sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 150 }}><InputLabel>Status</InputLabel><Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} label="Status"><MenuItem value="">Todos</MenuItem><MenuItem value="ativo">Ativos</MenuItem><MenuItem value="inativo">Inativos</MenuItem></Select></FormControl>
        <FormControl sx={{ minWidth: 150 }}><InputLabel>Ordenar por</InputLabel><Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Ordenar por"><MenuItem value="nome">Nome</MenuItem></Select></FormControl>
      </Box>
    </Box>
  );

  // Funções de modais
  const openModal = (fornecedor: Fornecedor | null = null) => {
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      setFormData({ nome: fornecedor.nome, cnpj: fornecedor.cnpj, email: fornecedor.email || '', ativo: fornecedor.ativo });
    } else {
      setEditingFornecedor(null);
      setFormData({ nome: "", cnpj: "", email: "", ativo: true });
    }
    setModalOpen(true);
  };
  
  const closeModal = () => setModalOpen(false);

  const handleSave = async () => {
    try {
      if (editingFornecedor) {
        await atualizarFornecedorMutation.mutateAsync({ id: editingFornecedor.id, data: formData });
        setSuccessMessage('Fornecedor atualizado com sucesso!');
      } else {
        await criarFornecedorMutation.mutateAsync(formData);
        setSuccessMessage('Fornecedor criado com sucesso!');
      }
      closeModal();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar fornecedor:', err);
    }
  };

  const openDeleteModal = (fornecedor: Fornecedor) => {
    setFornecedorToDelete(fornecedor);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setFornecedorToDelete(null);
  };

  const handleDelete = async () => {
    if (!fornecedorToDelete) return;
    try {
      await excluirFornecedorMutation.mutateAsync(fornecedorToDelete.id);
      setSuccessMessage('Fornecedor removido com sucesso!');
      closeDeleteModal();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao remover fornecedor:', err);
    }
  };

  // Funções de Importação/Exportação
  const handleImportFornecedores = async (data: any[]) => { /* ... */ };
  const handleExportarFornecedores = () => { /* ... */ };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>Fornecedores</Typography>

        <Card sx={{ borderRadius: '12px', p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField placeholder="Buscar por nome ou CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>), endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>)}}/>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLessIcon /> : <TuneRounded />} onClick={toggleFilters} size="small">Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }}/>)}</Button>
              <Button startIcon={<AddIcon />} onClick={() => openModal()} variant="contained" color="success" size="small">Novo Fornecedor</Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small"><MoreVert /></IconButton>
            </Box>
          </Box>
          <Collapse in={filtersExpanded} timeout={400}><Box sx={{ mb: 3 }}><FiltersContent /></Box></Collapse>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>{`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredFornecedores.length)}-${Math.min((page + 1) * rowsPerPage, filteredFornecedores.length)} de ${filteredFornecedores.length} fornecedores`}</Typography>
        </Card>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={handleRefresh}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredFornecedores.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Business sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhum fornecedor encontrado</Typography></CardContent></Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table>
                <TableHead><TableRow><TableCell>Nome</TableCell><TableCell>CNPJ</TableCell><TableCell>Email</TableCell><TableCell align="center">Ações</TableCell></TableRow></TableHead>
                <TableBody>
                  {paginatedFornecedores.map((f) => (
                    <TableRow key={f.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIndicator status={f.ativo ? 'ativo' : 'inativo'} size="small" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.nome}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary" fontFamily="monospace">{formatarDocumento(f.cnpj)}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{f.email || 'Não informado'}</Typography></TableCell>

                      <TableCell align="center">
                        <Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => navigate(`/fornecedores/${f.id}`)} color="primary"><InfoIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Editar"><IconButton size="small" onClick={() => openModal(f)} color="secondary"><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Excluir"><IconButton size="small" onClick={() => openDeleteModal(f)} color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={filteredFornecedores.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Itens por página:" />
          </Paper>
        )}
      </Box>

      {/* Modal de Criação/Edição */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField label="Nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
            <TextField label="CNPJ" value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} required />
            <TextField label="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <FormControlLabel control={<Switch checked={formData.ativo} onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} />} label="Ativo" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={closeModal} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.nome.trim() || !formData.cnpj.trim()}>Salvar</Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de Confirmação de Exclusão */}
      <ConfirmacaoExclusaoFornecedor open={deleteModalOpen} fornecedor={fornecedorToDelete} onConfirm={handleDelete} onCancel={closeDeleteModal} />
      
      {/* Modal de Importação */}
      <ImportacaoFornecedores open={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImportFornecedores} />

      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); setImportModalOpen(true); }}><Upload sx={{ mr: 1 }} /> Importar em Lote</MenuItem>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); handleExportarFornecedores(); }}><Download sx={{ mr: 1 }} /> Exportar Excel</MenuItem>
      </Menu>
    </Box>
  );
};

export default FornecedoresPage;