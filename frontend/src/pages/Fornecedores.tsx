import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import StatusIndicator from "../components/StatusIndicator";
import PageContainer from "../components/PageContainer";
import TableFilter, { FilterField } from "../components/TableFilter";
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
  Clear as ClearIcon,
  MoreVert,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import CompactPagination from '../components/CompactPagination';
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
  tipo_fornecedor?: string;
  dap_caf?: string;
  data_validade_dap?: string;
}

const FornecedoresPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Estados de filtros - NOVO SISTEMA
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // React Query hooks
  const { 
    data: fornecedoresData, 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useFornecedores({ search: filters.search, ativo: filters.status ? filters.status === 'ativo' : undefined });
  
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
  const [formData, setFormData] = useState({ 
    nome: "", 
    cnpj: "", 
    email: "", 
    ativo: true, 
    tipo_fornecedor: "CONVENCIONAL",
    dap_caf: "",
    data_validade_dap: ""
  });
  
  // Estados de validação
  const [erroFornecedor, setErroFornecedor] = useState("");
  const [touched, setTouched] = useState<any>({});
  
  // Estados para controle de mudanças não salvas
  const [formDataInicial, setFormDataInicial] = useState<any>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  // Função para refresh manual (React Query já gerencia o carregamento automaticamente)
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);
  
  // Definir campos de filtro
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'ativo', label: 'Ativos' },
        { value: 'inativo', label: 'Inativos' },
      ],
    },
    {
      type: 'select',
      label: 'Tipo de Fornecedor',
      key: 'tipo',
      options: [
        { value: 'empresa', label: 'Empresa' },
        { value: 'cooperativa', label: 'Cooperativa' },
        { value: 'individual', label: 'Individual' },
      ],
    },
  ], []);
  
  // Filtrar e ordenar fornecedores
  const filteredFornecedores = useMemo(() => {
    return fornecedores.filter(f => {
      // Busca por palavra-chave
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!f.nome.toLowerCase().includes(searchLower) && !f.cnpj.includes(filters.search)) {
          return false;
        }
      }

      // Filtro de status
      if (filters.status) {
        if (filters.status === 'ativo' && !f.ativo) return false;
        if (filters.status === 'inativo' && f.ativo) return false;
      }

      // Filtro de tipo
      if (filters.tipo && f.tipo_fornecedor !== filters.tipo) {
        return false;
      }

      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [fornecedores, filters]);

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
  }, [filters]);

  // Mostrar mensagem se vier de redirecionamento
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Limpar o state para não mostrar novamente
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Funções de modais
  const openModal = (fornecedor: Fornecedor | null = null) => {
    setErroFornecedor("");
    setTouched({});
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      const formInicial = { 
        nome: fornecedor.nome, 
        cnpj: fornecedor.cnpj, 
        email: fornecedor.email || '', 
        ativo: fornecedor.ativo,
        tipo_fornecedor: fornecedor.tipo_fornecedor || 'empresa'
      };
      setFormData(formInicial);
      setFormDataInicial(JSON.parse(JSON.stringify(formInicial)));
    } else {
      setEditingFornecedor(null);
      const formInicial = { nome: "", cnpj: "", email: "", ativo: true, tipo_fornecedor: "empresa" as 'empresa' | 'cooperativa' | 'individual' };
      setFormData(formInicial);
      setFormDataInicial(JSON.parse(JSON.stringify(formInicial)));
    }
    setModalOpen(true);
  };
  
  const hasUnsavedChanges = () => {
    if (!formDataInicial) return false;
    return JSON.stringify(formData) !== JSON.stringify(formDataInicial);
  };
  
  const handleCloseModal = () => {
    if (hasUnsavedChanges()) {
      setConfirmClose(true);
    } else {
      closeModal();
    }
  };
  
  const confirmCloseModal = () => {
    setConfirmClose(false);
    closeModal();
  };
  
  const closeModal = () => {
    setModalOpen(false);
    setErroFornecedor("");
    setTouched({});
  };

  const handleSave = async () => {
    // Validação
    if (!formData.nome.trim()) {
      setErroFornecedor("Nome é obrigatório.");
      setTouched({ ...touched, nome: true });
      return;
    }
    
    if (!formData.cnpj.trim()) {
      setErroFornecedor("CNPJ é obrigatório.");
      setTouched({ ...touched, cnpj: true });
      return;
    }
    
    // Validação básica de CNPJ (apenas formato)
    const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      setErroFornecedor("CNPJ deve ter 14 dígitos.");
      return;
    }
    
    try {
      if (editingFornecedor) {
        await atualizarFornecedorMutation.mutateAsync({ id: editingFornecedor.id, data: formData });
        setSuccessMessage('Fornecedor atualizado com sucesso!');
      } else {
        await criarFornecedorMutation.mutateAsync(formData);
        setSuccessMessage('Fornecedor criado com sucesso!');
      }
      closeModal();
      await refetch();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar fornecedor:', err);
      setErroFornecedor(err.message || 'Erro ao salvar fornecedor.');
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
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      <PageContainer fullHeight>
        <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar por nome ou CNPJ..."
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
              <Button startIcon={<AddIcon />} onClick={() => openModal()} variant="contained" color="success" size="small">Novo Fornecedor</Button>
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, px: 1 }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
            Exibindo {filteredFornecedores.length} {filteredFornecedores.length === 1 ? 'resultado' : 'resultados'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusIndicator status="ativo" size="small" />
              <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ATIVOS
              </Typography>
              <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                {filteredFornecedores.filter(f => f.ativo).length}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusIndicator status="inativo" size="small" />
              <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                INATIVOS
              </Typography>
              <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                {filteredFornecedores.filter(f => !f.ativo).length}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={handleRefresh}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredFornecedores.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Business sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhum fornecedor encontrado</Typography></CardContent></Card>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ flex: 1, minHeight: 0 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell align="center">CNPJ</TableCell>
                    <TableCell align="center">Tipo</TableCell>
                    <TableCell align="center">Email</TableCell>
                    <TableCell align="center" width="80">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedFornecedores.map((f) => (
                    <TableRow key={f.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIndicator status={f.ativo ? 'ativo' : 'inativo'} size="small" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.nome}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center"><Typography variant="body2" color="text.secondary" fontFamily="monospace">{formatarDocumento(f.cnpj)}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={
                            f.tipo_fornecedor === 'AGRICULTURA_FAMILIAR' ? 'Agricultura Familiar' :
                            f.tipo_fornecedor === 'COOPERATIVA_AF' ? 'Cooperativa AF' :
                            f.tipo_fornecedor === 'ASSOCIACAO_AF' ? 'Associação AF' :
                            f.tipo_fornecedor === 'CONVENCIONAL' ? 'Convencional' :
                            f.tipo_fornecedor === 'empresa' ? 'Empresa' :
                            f.tipo_fornecedor === 'cooperativa' ? 'Cooperativa' :
                            f.tipo_fornecedor === 'individual' ? 'Individual' :
                            f.tipo_fornecedor || 'Não informado'
                          } 
                          size="small"
                          color={
                            f.tipo_fornecedor === 'AGRICULTURA_FAMILIAR' || 
                            f.tipo_fornecedor === 'COOPERATIVA_AF' || 
                            f.tipo_fornecedor === 'ASSOCIACAO_AF' ? 'success' : 'default'
                          }
                          sx={{
                            ...(f.tipo_fornecedor === 'AGRICULTURA_FAMILIAR' || 
                                f.tipo_fornecedor === 'COOPERATIVA_AF' || 
                                f.tipo_fornecedor === 'ASSOCIACAO_AF' ? { color: 'white' } : {})
                          }}
                        />
                      </TableCell>
                      <TableCell align="center"><Typography variant="body2" color="text.secondary">{f.email || 'Não informado'}</Typography></TableCell>

                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => navigate(`/fornecedores/${f.id}`)} color="primary"><InfoIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Editar"><IconButton size="small" onClick={() => openModal(f)} color="secondary"><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Excluir"><IconButton size="small" onClick={() => openDeleteModal(f)} color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <CompactPagination count={filteredFornecedores.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 25, 50, 100]} />
          </Box>
        )}
        </Box>
      </PageContainer>

      {/* Modal de Criação/Edição */}
      <Dialog 
        open={modalOpen} 
        onClose={handleCloseModal}
        maxWidth="sm" 
        fullWidth 
        PaperProps={{ 
          sx: { 
            borderRadius: '12px',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            m: 0
          } 
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </Typography>
          <IconButton
            size="small"
            onClick={handleCloseModal}
            sx={{ color: 'text.secondary' }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {erroFornecedor && (
            <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                {erroFornecedor}
              </Typography>
            </Alert>
          )}
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField 
              label="Nome" 
              value={formData.nome} 
              onChange={(e) => {
                setFormData({ ...formData, nome: e.target.value });
                if (erroFornecedor) setErroFornecedor("");
              }}
              onBlur={() => setTouched({ ...touched, nome: true })}
              required 
              size="small"
              error={touched.nome && !formData.nome.trim()}
              helperText={touched.nome && !formData.nome.trim() ? "Campo obrigatório" : ""}
            />
            <TextField 
              label="CNPJ" 
              value={formData.cnpj} 
              onChange={(e) => {
                setFormData({ ...formData, cnpj: e.target.value });
                if (erroFornecedor) setErroFornecedor("");
              }}
              onBlur={() => setTouched({ ...touched, cnpj: true })}
              required 
              size="small"
              error={touched.cnpj && !formData.cnpj.trim()}
              helperText={touched.cnpj && !formData.cnpj.trim() ? "Campo obrigatório" : "Formato: 00.000.000/0000-00"}
              placeholder="00.000.000/0000-00"
            />
            <TextField 
              label="Email" 
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              size="small"
              type="email"
              placeholder="exemplo@email.com"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Fornecedor</InputLabel>
              <Select
                value={formData.tipo_fornecedor}
                label="Tipo de Fornecedor"
                onChange={(e) => setFormData({ ...formData, tipo_fornecedor: e.target.value })}
              >
                <MenuItem value="CONVENCIONAL">Convencional</MenuItem>
                <MenuItem value="AGRICULTURA_FAMILIAR">Agricultura Familiar</MenuItem>
                <MenuItem value="COOPERATIVA_AF">Cooperativa de Agricultura Familiar</MenuItem>
                <MenuItem value="ASSOCIACAO_AF">Associação de Agricultura Familiar</MenuItem>
              </Select>
            </FormControl>
            
            {/* Campos condicionais para Agricultura Familiar */}
            {(formData.tipo_fornecedor === 'AGRICULTURA_FAMILIAR' || 
              formData.tipo_fornecedor === 'COOPERATIVA_AF' || 
              formData.tipo_fornecedor === 'ASSOCIACAO_AF') && (
              <>
                <TextField 
                  label="DAP/CAF" 
                  value={formData.dap_caf} 
                  onChange={(e) => setFormData({ ...formData, dap_caf: e.target.value })} 
                  size="small"
                  placeholder="Número da DAP ou CAF"
                  helperText="Declaração de Aptidão ao PRONAF ou Cadastro Nacional da Agricultura Familiar"
                />
                <TextField 
                  label="Data de Validade DAP/CAF" 
                  value={formData.data_validade_dap} 
                  onChange={(e) => setFormData({ ...formData, data_validade_dap: e.target.value })} 
                  size="small"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  helperText="Data de validade da documentação"
                />
              </>
            )}
            
            <FormControlLabel 
              control={
                <Switch 
                  checked={formData.ativo} 
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} 
                  size="small"
                />
              } 
              label={<Typography variant="body2">Ativo</Typography>}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={handleCloseModal} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={!formData.nome.trim() || !formData.cnpj.trim()}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog de confirmação para fechar */}
      <Dialog 
        open={confirmClose} 
        onClose={() => setConfirmClose(false)}
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            m: 0
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            Descartar alterações?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Typography variant="body2">
            Você tem alterações não salvas. Deseja realmente descartar essas alterações?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={() => setConfirmClose(false)} variant="outlined" size="small">
            Continuar Editando
          </Button>
          <Button onClick={confirmCloseModal} color="error" variant="contained" size="small">
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de Confirmação de Exclusão */}
      <ConfirmacaoExclusaoFornecedor open={deleteModalOpen} fornecedor={fornecedorToDelete} onConfirm={handleDelete} onCancel={closeDeleteModal} />
      
      {/* Modal de Importação */}
      <ImportacaoFornecedores open={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImportFornecedores} />

      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); refetch(); setSuccessMessage('Lista atualizada com sucesso!'); }}><SearchIcon sx={{ mr: 1 }} /> Atualizar Lista</MenuItem>
        <Divider />
        <MenuItem onClick={() => { setActionsMenuAnchor(null); setImportModalOpen(true); }}><Upload sx={{ mr: 1 }} /> Importar em Lote</MenuItem>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); handleExportarFornecedores(); }}><Download sx={{ mr: 1 }} /> Exportar Excel</MenuItem>
      </Menu>
    </Box>
  );
};

export default FornecedoresPage;