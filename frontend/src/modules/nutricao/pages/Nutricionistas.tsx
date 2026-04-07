import { useState, useMemo, useCallback } from "react";
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
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Popover,
  Divider,
  Grid,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { useToast } from "../../../hooks/useToast";
import {
  useNutricionistas,
  useCreateNutricionista,
  useUpdateNutricionista,
  useDeleteNutricionista,
} from "../../../hooks/queries/useNutricionistaQueries";
import { Nutricionista } from "../../../services/nutricionistas";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import { DataTable } from "../../../components/DataTable";
import { ColumnDef } from "@tanstack/react-table";

const NutricionistasPage = () => {
  const toast = useToast();
  
  // Estados de filtro
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState({
    status: 'todos',
  });

  // Estados de modais
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingNutricionista, setEditingNutricionista] = useState<Nutricionista | null>(null);
  const [nutricionistaToDelete, setNutricionistaToDelete] = useState<Nutricionista | null>(null);
  const [touched, setTouched] = useState<any>({});
  const [erroNutricionista, setErroNutricionista] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    crn: '',
    crn_regiao: '',
    cpf: '',
    email: '',
    telefone: '',
    especialidade: '',
    ativo: true,
  });

  // Queries e mutations
  const { data: nutricionistas = [], isLoading: loading, error } = useNutricionistas();
  const createMutation = useCreateNutricionista();
  const updateMutation = useUpdateNutricionista();
  const deleteMutation = useDeleteNutricionista();

  // Filtrar nutricionistas
  const nutricionistasFiltrados = useMemo(() => {
    return nutricionistas.filter((n) => {
      // Filtro de status
      if (filters.status === 'ativo' && !n.ativo) return false;
      if (filters.status === 'inativo' && n.ativo) return false;
      
      return true;
    });
  }, [nutricionistas, filters]);

  const handleRowClick = useCallback((nutricionista: Nutricionista) => {
    openModal(nutricionista);
  }, []);

  const columns = useMemo<ColumnDef<Nutricionista>[]>(() => [
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
      id: 'crn',
      header: 'CRN',
      size: 150,
      enableSorting: false,
      cell: ({ row }) => (
        <Chip
          label={`${row.original.crn_regiao} ${row.original.crn}`}
          size="small"
          sx={{ bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 600 }}
        />
      ),
    },
    { 
      accessorKey: 'especialidade', 
      header: 'Especialidade',
      size: 150,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined;
        return (
          <Typography variant="body2" color="text.secondary">
            {value || '-'}
          </Typography>
        );
      },
    },
    { 
      id: 'contato',
      header: 'Contato',
      size: 200,
      enableSorting: false,
      cell: ({ row }) => {
        const contato = row.original.email || row.original.telefone || '-';
        return (
          <Typography variant="body2" color="text.secondary">
            {contato}
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
      size: 100,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
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
  ], []);

  // Funções
  const openModal = (nutricionista: Nutricionista | null = null) => {
    setErroNutricionista('');
    setTouched({});
    if (nutricionista) {
      setEditingNutricionista(nutricionista);
      setFormData({
        nome: nutricionista.nome,
        crn: nutricionista.crn,
        crn_regiao: nutricionista.crn_regiao,
        cpf: nutricionista.cpf || '',
        email: nutricionista.email || '',
        telefone: nutricionista.telefone || '',
        especialidade: nutricionista.especialidade || '',
        ativo: nutricionista.ativo,
      });
    } else {
      setEditingNutricionista(null);
      setFormData({
        nome: '',
        crn: '',
        crn_regiao: '',
        cpf: '',
        email: '',
        telefone: '',
        especialidade: '',
        ativo: true,
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingNutricionista(null);
  };

  const handleSave = async () => {
    try {
      // Validação
      if (!formData.nome.trim() || !formData.crn.trim() || !formData.crn_regiao) {
        setErroNutricionista('Preencha todos os campos obrigatórios');
        setTouched({ nome: true, crn: true, crn_regiao: true });
        return;
      }

      if (editingNutricionista) {
        await updateMutation.mutateAsync({ id: editingNutricionista.id, data: formData });
        toast.success('Nutricionista atualizado com sucesso!');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Nutricionista criado com sucesso!');
      }
      closeModal();
    } catch (err: any) {
      setErroNutricionista(err.response?.data?.message || 'Erro ao salvar nutricionista');
    }
  };

  const openDeleteModal = (nutricionista: Nutricionista) => {
    setNutricionistaToDelete(nutricionista);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setNutricionistaToDelete(null);
  };

  const handleDelete = async () => {
    if (!nutricionistaToDelete) return;
    try {
      await deleteMutation.mutateAsync(nutricionistaToDelete.id);
      toast.success('Nutricionista excluído com sucesso!');
      closeDeleteModal();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao excluir nutricionista');
    }
  };

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error">Erro ao carregar nutricionistas</Alert>
      </PageContainer>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: 'background.default', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageContainer fullHeight>
        <PageHeader
          title="Nutricionistas"
          totalCount={nutricionistasFiltrados.length}
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Cadastros' },
            { label: 'Nutricionistas' },
          ]}
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openModal()}
              sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' }, borderRadius: '6px', textTransform: 'none', fontWeight: 500 }}>
              Novo Nutricionista
            </Button>
          }
        />

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            data={nutricionistasFiltrados}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            searchPlaceholder="Buscar nutricionistas..."
            onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
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

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setFilters({ status: 'todos' });
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
          {filters.status !== 'todos' && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Filtros ativos:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  label={`Status: ${filters.status === 'ativo' ? 'Ativos' : 'Inativos'}`}
                  size="small"
                  onDelete={() => setFilters({ ...filters, status: 'todos' })}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Popover>

      {/* Modal de Criação/Edição */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            {editingNutricionista ? 'Editar Nutricionista' : 'Novo Nutricionista'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Preencha os dados do nutricionista
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {erroNutricionista && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {erroNutricionista}
              </Typography>
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            {/* Informações Pessoais */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Informações Pessoais
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Nome Completo"
                    fullWidth
                    required
                    value={formData.nome}
                    onChange={(e) => {
                      setFormData({ ...formData, nome: e.target.value });
                      if (erroNutricionista) setErroNutricionista("");
                    }}
                    onBlur={() => setTouched({ ...touched, nome: true })}
                    error={touched.nome && !formData.nome.trim()}
                    helperText={touched.nome && !formData.nome.trim() ? "Campo obrigatório" : ""}
                    placeholder="Ex: Maria Silva Santos"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Registro Profissional */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Registro Profissional
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required error={touched.crn_regiao && !formData.crn_regiao}>
                    <InputLabel>Região CRN</InputLabel>
                    <Select
                      value={formData.crn_regiao}
                      onChange={(e) => {
                        setFormData({ ...formData, crn_regiao: e.target.value });
                        if (erroNutricionista) setErroNutricionista("");
                      }}
                      onBlur={() => setTouched({ ...touched, crn_regiao: true })}
                      label="Região CRN"
                    >
                      <MenuItem value="CRN-1">CRN-1 (RJ/ES)</MenuItem>
                      <MenuItem value="CRN-2">CRN-2 (RS)</MenuItem>
                      <MenuItem value="CRN-3">CRN-3 (SP/MS)</MenuItem>
                      <MenuItem value="CRN-4">CRN-4 (RJ)</MenuItem>
                      <MenuItem value="CRN-5">CRN-5 (PR)</MenuItem>
                      <MenuItem value="CRN-6">CRN-6 (MG)</MenuItem>
                      <MenuItem value="CRN-7">CRN-7 (BA/SE)</MenuItem>
                      <MenuItem value="CRN-8">CRN-8 (PE/AL)</MenuItem>
                      <MenuItem value="CRN-9">CRN-9 (GO/TO/DF)</MenuItem>
                      <MenuItem value="CRN-10">CRN-10 (SC)</MenuItem>
                    </Select>
                    {touched.crn_regiao && !formData.crn_regiao && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                        Campo obrigatório
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Número CRN"
                    fullWidth
                    required
                    value={formData.crn}
                    onChange={(e) => {
                      setFormData({ ...formData, crn: e.target.value });
                      if (erroNutricionista) setErroNutricionista("");
                    }}
                    onBlur={() => setTouched({ ...touched, crn: true })}
                    error={touched.crn && !formData.crn.trim()}
                    helperText={touched.crn && !formData.crn.trim() ? "Campo obrigatório" : "Ex: 12345"}
                    placeholder="12345"
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
                    label="CPF"
                    fullWidth
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Telefone"
                    fullWidth
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="E-mail"
                    type="email"
                    fullWidth
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nutricionista@exemplo.com"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Especialização */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Especialização
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Especialidade"
                    fullWidth
                    value={formData.especialidade}
                    onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                    placeholder="Ex: Nutrição Escolar, Clínica, Esportiva"
                    helperText="Área de especialização do nutricionista"
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
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Nutricionista Ativo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Nutricionistas ativos aparecem no sistema
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
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending || !formData.nome.trim() || !formData.crn.trim() || !formData.crn_regiao}
            startIcon={(createMutation.isPending || updateMutation.isPending) ? <CircularProgress size={20} /> : null}
          >
            {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : (editingNutricionista ? 'Salvar Alterações' : 'Criar Nutricionista')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o nutricionista "{nutricionistaToDelete?.nome}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteModal} disabled={deleteMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <LoadingOverlay 
        open={
          createMutation.isPending ||
          updateMutation.isPending ||
          deleteMutation.isPending
        }
        message={
          createMutation.isPending ? 'Criando nutricionista...' :
          updateMutation.isPending ? 'Atualizando nutricionista...' :
          deleteMutation.isPending ? 'Excluindo nutricionista...' :
          'Processando...'
        }
      />
    </Box>
  );
};

export default NutricionistasPage;
