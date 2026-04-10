import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../hooks/useToast";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import {
  Box,
  Typography,
  Button,
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
  CircularProgress,
  Menu,
  MenuItem,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Popover,
  Grid,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { 
  useFornecedores, 
  useCriarFornecedor, 
  useAtualizarFornecedor, 
  useExcluirFornecedor 
} from "../../../hooks/queries";
import ImportacaoFornecedores from "../../../components/ImportacaoFornecedores";
import ConfirmacaoExclusaoFornecedor from "../../../components/ConfirmacaoExclusaoFornecedor";
import * as XLSX from "xlsx";
import { formatarDocumento } from "../../../utils/validacaoDocumento";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import { DataTable } from "../../../components/DataTable";
import { ColumnDef } from "@tanstack/react-table";

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
  const toast = useToast();

  // React Query hooks
  const { 
    data: fornecedoresData, 
    isLoading: loading, 
    refetch 
  } = useFornecedores({ search: '', ativo: undefined });
  
  const criarFornecedorMutation = useCriarFornecedor();
  const atualizarFornecedorMutation = useAtualizarFornecedor();
  const excluirFornecedorMutation = useExcluirFornecedor();
  
  // Estados locais
  const fornecedores = fornecedoresData?.fornecedores || [];

  // Estados de ações
  const [importExportMenuAnchor, setImportExportMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de filtro
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState({
    status: 'todos',
    tipo: 'todos',
  });

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

  // Filtrar fornecedores
  const fornecedoresFiltrados = useMemo(() => {
    return fornecedores.filter(f => {
      // Filtro de status
      if (filters.status === 'ativo' && !f.ativo) return false;
      if (filters.status === 'inativo' && f.ativo) return false;

      // Filtro de tipo
      if (filters.tipo !== 'todos' && f.tipo_fornecedor !== filters.tipo) {
        return false;
      }

      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [fornecedores, filters]);

  const handleRowClick = useCallback((fornecedor: Fornecedor) => {
    navigate(`/fornecedores/${fornecedor.id}`);
  }, [navigate]);

  const columns = useMemo<ColumnDef<Fornecedor>[]>(() => [
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
      accessorKey: 'cnpj', 
      header: 'CNPJ',
      size: 150,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <Typography variant="body2" color="text.secondary" fontFamily="monospace">
            {formatarDocumento(value)}
          </Typography>
        );
      },
    },
    { 
      accessorKey: 'tipo_fornecedor', 
      header: 'Tipo',
      size: 200,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined;
        const isAF = value === 'AGRICULTURA_FAMILIAR' || value === 'COOPERATIVA_AF' || value === 'ASSOCIACAO_AF';
        const label = 
          value === 'AGRICULTURA_FAMILIAR' ? 'Agricultura Familiar' :
          value === 'COOPERATIVA_AF' ? 'Cooperativa AF' :
          value === 'ASSOCIACAO_AF' ? 'Associação AF' :
          value === 'CONVENCIONAL' ? 'Convencional' :
          value || 'Não informado';
        
        return (
          <Chip 
            label={label} 
            size="small"
            color={isAF ? 'success' : 'default'}
            sx={{ ...(isAF ? { color: 'white' } : {}) }}
          />
        );
      },
    },
    { 
      accessorKey: 'email', 
      header: 'Email',
      size: 200,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined;
        return (
          <Typography variant="body2" color="text.secondary">
            {value || 'Não informado'}
          </Typography>
        );
      },
    },
    { 
      accessorKey: 'ativo', 
      header: 'Status',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Tooltip title={getValue() ? 'Ativo' : 'Inativo'}>
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
      size: 120,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Ver Detalhes">
            <IconButton
              size="small"
              onClick={() => navigate(`/fornecedores/${row.original.id}`)}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={() => openModal(row.original)}
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
  ], [navigate]);

  // Funções de modais
  const openModal = (fornecedor: Fornecedor | null = null) => {
    setErroFornecedor("");
    setTouched({});
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      setFormData({ 
        nome: fornecedor.nome, 
        cnpj: fornecedor.cnpj, 
        email: fornecedor.email || '', 
        ativo: fornecedor.ativo,
        tipo_fornecedor: fornecedor.tipo_fornecedor || 'CONVENCIONAL',
        dap_caf: fornecedor.dap_caf || '',
        data_validade_dap: fornecedor.data_validade_dap || ''
      });
    } else {
      setEditingFornecedor(null);
      setFormData({ 
        nome: "", 
        cnpj: "", 
        email: "", 
        ativo: true, 
        tipo_fornecedor: "CONVENCIONAL",
        dap_caf: "",
        data_validade_dap: ""
      });
    }
    setModalOpen(true);
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
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await criarFornecedorMutation.mutateAsync(formData);
        toast.success('Fornecedor criado com sucesso!');
      }
      closeModal();
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
      toast.success('Fornecedor removido com sucesso!');
      closeDeleteModal();
    } catch (err: any) {
      toast.error('Erro ao remover fornecedor');
    }
  };

  // Funções de Importação/Exportação
  const handleImportFornecedores = async () => {
    // Implementar lógica de importação
    toast.success('Importação concluída!');
    refetch();
  };

  const handleExportarFornecedores = () => {
    try {
      const dadosExportacao = fornecedoresFiltrados.map(f => ({
        Nome: f.nome,
        CNPJ: f.cnpj,
        Email: f.email || '',
        Tipo: f.tipo_fornecedor || '',
        Ativo: f.ativo ? 'Sim' : 'Não'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dadosExportacao);
      XLSX.utils.book_append_sheet(wb, ws, 'Fornecedores');
      
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      XLSX.writeFile(wb, `fornecedores_${dataAtual}.xlsx`);
      
      toast.success("Exportação concluída com sucesso!");
      setImportExportMenuAnchor(null);
    } catch (error) {
      toast.error('Erro ao exportar fornecedores');
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: 'background.default', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageContainer fullHeight>
        <PageHeader
          title="Fornecedores"
          totalCount={fornecedoresFiltrados.length}
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Cadastros' },
            { label: 'Fornecedores' },
          ]}
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openModal()}
              sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' }, borderRadius: '6px', textTransform: 'none', fontWeight: 500 }}>
              Novo Fornecedor
            </Button>
          }
        />

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            data={fornecedoresFiltrados}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            searchPlaceholder="Buscar por nome ou CNPJ..."
            onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
            onImportExportClick={(e) => setImportExportMenuAnchor(e.currentTarget)}
            initialPageSize={50}
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
              <MenuItem value="ativo">Ativos</MenuItem>
              <MenuItem value="inativo">Inativos</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filters.tipo}
              label="Tipo"
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="CONVENCIONAL">Convencional</MenuItem>
              <MenuItem value="AGRICULTURA_FAMILIAR">Agricultura Familiar</MenuItem>
              <MenuItem value="COOPERATIVA_AF">Cooperativa AF</MenuItem>
              <MenuItem value="ASSOCIACAO_AF">Associação AF</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setFilters({ status: 'todos', tipo: 'todos' });
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
          {(filters.status !== 'todos' || filters.tipo !== 'todos') && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Filtros ativos:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {filters.status !== 'todos' && (
                  <Chip
                    label={`Status: ${filters.status === 'ativo' ? 'Ativos' : 'Inativos'}`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, status: 'todos' })}
                  />
                )}
                {filters.tipo !== 'todos' && (
                  <Chip
                    label={`Tipo: ${filters.tipo}`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, tipo: 'todos' })}
                  />
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Popover>

      {/* Modal de Criação/Edição */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Preencha os dados do fornecedor
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {erroFornecedor && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {erroFornecedor}
              </Typography>
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            {/* Informações Básicas */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Informações Básicas
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField 
                    label="Nome" 
                    value={formData.nome} 
                    onChange={(e) => {
                      setFormData({ ...formData, nome: e.target.value });
                      if (erroFornecedor) setErroFornecedor("");
                    }}
                    onBlur={() => setTouched({ ...touched, nome: true })}
                    required 
                    fullWidth
                    error={touched.nome && !formData.nome.trim()}
                    helperText={touched.nome && !formData.nome.trim() ? "Campo obrigatório" : ""}
                    placeholder="Nome completo do fornecedor"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="CNPJ" 
                    value={formData.cnpj} 
                    onChange={(e) => {
                      setFormData({ ...formData, cnpj: e.target.value });
                      if (erroFornecedor) setErroFornecedor("");
                    }}
                    onBlur={() => setTouched({ ...touched, cnpj: true })}
                    required 
                    fullWidth
                    error={touched.cnpj && !formData.cnpj.trim()}
                    helperText={touched.cnpj && !formData.cnpj.trim() ? "Campo obrigatório" : "Formato: 00.000.000/0000-00"}
                    placeholder="00.000.000/0000-00"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    fullWidth
                    type="email"
                    placeholder="exemplo@email.com"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Classificação */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Classificação
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
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
                </Grid>
              </Grid>
            </Box>

            {/* Agricultura Familiar - Campos Condicionais */}
            {(formData.tipo_fornecedor === 'AGRICULTURA_FAMILIAR' || 
              formData.tipo_fornecedor === 'COOPERATIVA_AF' || 
              formData.tipo_fornecedor === 'ASSOCIACAO_AF') && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                    Agricultura Familiar
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="DAP/CAF" 
                        value={formData.dap_caf} 
                        onChange={(e) => setFormData({ ...formData, dap_caf: e.target.value })} 
                        fullWidth
                        placeholder="Número da DAP ou CAF"
                        helperText="Declaração de Aptidão ao PRONAF ou CAF"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="Data de Validade DAP/CAF" 
                        value={formData.data_validade_dap} 
                        onChange={(e) => setFormData({ ...formData, data_validade_dap: e.target.value })} 
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        helperText="Data de validade da documentação"
                      />
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}

            <Divider />

            {/* Status */}
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Fornecedor Ativo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fornecedores ativos aparecem no sistema
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
            disabled={criarFornecedorMutation.isPending || atualizarFornecedorMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={criarFornecedorMutation.isPending || atualizarFornecedorMutation.isPending || !formData.nome.trim() || !formData.cnpj.trim()}
            startIcon={(criarFornecedorMutation.isPending || atualizarFornecedorMutation.isPending) ? <CircularProgress size={20} /> : null}
          >
            {(criarFornecedorMutation.isPending || atualizarFornecedorMutation.isPending) ? 'Salvando...' : 'Salvar Fornecedor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmacaoExclusaoFornecedor 
        open={deleteModalOpen} 
        fornecedor={fornecedorToDelete} 
        onConfirm={handleDelete} 
        onCancel={closeDeleteModal} 
      />
      
      {/* Modal de Importação */}
      <ImportacaoFornecedores 
        open={importModalOpen} 
        onClose={() => setImportModalOpen(false)} 
        onImport={handleImportFornecedores} 
      />

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
        >
          <FileUploadIcon sx={{ mr: 1 }} /> 
          Importar Fornecedores
        </MenuItem>
        <MenuItem 
          onClick={() => { 
            setImportExportMenuAnchor(null); 
            handleExportarFornecedores(); 
          }}
        >
          <FileDownloadIcon sx={{ mr: 1 }} /> 
          Exportar Excel
        </MenuItem>
      </Menu>

      <LoadingOverlay 
        open={
          criarFornecedorMutation.isPending ||
          atualizarFornecedorMutation.isPending ||
          excluirFornecedorMutation.isPending
        }
        message={
          criarFornecedorMutation.isPending ? 'Criando fornecedor...' :
          atualizarFornecedorMutation.isPending ? 'Atualizando fornecedor...' :
          excluirFornecedorMutation.isPending ? 'Excluindo fornecedor...' :
          'Processando...'
        }
      />
    </Box>
  );
};

export default FornecedoresPage;
