import { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import StatusIndicator from '../components/StatusIndicator';
import CompactPagination from '../components/CompactPagination';
import { useToast } from '../hooks/useToast';
import {
  useNutricionistas,
  useCreateNutricionista,
  useUpdateNutricionista,
  useDeleteNutricionista,
} from '../hooks/queries/useNutricionistaQueries';
import { Nutricionista } from '../services/nutricionistas';
import { LoadingOverlay } from '../components/LoadingOverlay';

const NutricionistasPage = () => {
  const toast = useToast();
  
  // Estados
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingNutricionista, setEditingNutricionista] = useState<Nutricionista | null>(null);
  const [nutricionistaToDelete, setNutricionistaToDelete] = useState<Nutricionista | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [formDataInicial, setFormDataInicial] = useState<any>(null);
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
  const { data: nutricionistas = [], isLoading, error } = useNutricionistas();
  const createMutation = useCreateNutricionista();
  const updateMutation = useUpdateNutricionista();
  const deleteMutation = useDeleteNutricionista();

  // Filtrar nutricionistas
  const filteredNutricionistas = useMemo(() => {
    return nutricionistas.filter((n) => {
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          n.nome.toLowerCase().includes(searchLower) ||
          n.crn.toLowerCase().includes(searchLower) ||
          n.crn_regiao.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [nutricionistas, search]);

  // Paginar
  const paginatedNutricionistas = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredNutricionistas.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredNutricionistas, page, rowsPerPage]);

  // Funções
  const hasUnsavedChanges = () => {
    if (!formDataInicial) return false;
    return JSON.stringify(formData) !== JSON.stringify(formDataInicial);
  };

  const openModal = (nutricionista: Nutricionista | null = null) => {
    setErroNutricionista('');
    setTouched({});
    if (nutricionista) {
      setEditingNutricionista(nutricionista);
      const formInicial = {
        nome: nutricionista.nome,
        crn: nutricionista.crn,
        crn_regiao: nutricionista.crn_regiao,
        cpf: nutricionista.cpf || '',
        email: nutricionista.email || '',
        telefone: nutricionista.telefone || '',
        especialidade: nutricionista.especialidade || '',
        ativo: nutricionista.ativo,
      };
      setFormData(formInicial);
      setFormDataInicial(JSON.parse(JSON.stringify(formInicial)));
    } else {
      setEditingNutricionista(null);
      const formInicial = {
        nome: '',
        crn: '',
        crn_regiao: '',
        cpf: '',
        email: '',
        telefone: '',
        especialidade: '',
        ativo: true,
      };
      setFormData(formInicial);
      setFormDataInicial(JSON.parse(JSON.stringify(formInicial)));
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    if (hasUnsavedChanges()) {
      setConfirmClose(true);
    } else {
      setModalOpen(false);
      setEditingNutricionista(null);
    }
  };

  const confirmCloseModal = () => {
    setConfirmClose(false);
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
        toast.success('Sucesso!', 'Nutricionista atualizado com sucesso!');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Sucesso!', 'Nutricionista criado com sucesso!');
      }
      setModalOpen(false);
      setEditingNutricionista(null);
      setErroNutricionista('');
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
      toast.success('Sucesso!', 'Nutricionista excluído com sucesso!');
      closeDeleteModal();
    } catch (err: any) {
      toast.error('Erro', err.response?.data?.message || 'Erro ao excluir nutricionista');
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress size={60} />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error">Erro ao carregar nutricionistas</Alert>
      </PageContainer>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      <PageContainer fullHeight>
        <PageHeader title="Nutricionistas" />
        
        {/* Barra de busca e ações */}
        <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar nutricionistas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button 
              startIcon={<AddIcon />} 
              onClick={() => openModal()} 
              variant="contained" 
              color="add" 
              size="small"
            >
              Novo Nutricionista
            </Button>
          </Box>
        </Card>

        {/* Legenda de status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, px: 1 }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
            Exibindo {filteredNutricionistas.length} {filteredNutricionistas.length === 1 ? 'resultado' : 'resultados'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusIndicator status="ativo" size="small" />
              <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ATIVOS
              </Typography>
              <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                {filteredNutricionistas.filter(n => n.ativo).length}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusIndicator status="inativo" size="small" />
              <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                INATIVOS
              </Typography>
              <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                {filteredNutricionistas.filter(n => !n.ativo).length}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Tabela */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ flex: 1, minHeight: 0 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell align="center">CRN</TableCell>
                  <TableCell align="center">Especialidade</TableCell>
                  <TableCell align="center">Contato</TableCell>
                  <TableCell align="center" width="120">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedNutricionistas.map((nutricionista) => (
                  <TableRow key={nutricionista.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusIndicator status={nutricionista.ativo ? 'ativo' : 'inativo'} size="small" />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {nutricionista.nome}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${nutricionista.crn_regiao} ${nutricionista.crn}`}
                        size="small"
                        sx={{ bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {nutricionista.especialidade || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {nutricionista.email || nutricionista.telefone || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openModal(nutricionista)} color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" onClick={() => openDeleteModal(nutricionista)} color="delete">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <CompactPagination
            count={filteredNutricionistas.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </Box>
      </PageContainer>

      {/* Modal de Criação/Edição */}
      <Dialog 
        open={modalOpen} 
        onClose={closeModal} 
        maxWidth="md" 
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
            {editingNutricionista ? 'Editar Nutricionista' : 'Novo Nutricionista'}
          </Typography>
          <IconButton
            size="small"
            onClick={closeModal}
            sx={{ color: 'text.secondary' }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {erroNutricionista && (
            <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                {erroNutricionista}
              </Typography>
            </Alert>
          )}
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nome Completo"
              fullWidth
              required
              size="small"
              value={formData.nome}
              onChange={(e) => {
                setFormData({ ...formData, nome: e.target.value });
                if (erroNutricionista) setErroNutricionista("");
              }}
              onBlur={() => setTouched({ ...touched, nome: true })}
              error={touched.nome && !formData.nome.trim()}
              helperText={touched.nome && !formData.nome.trim() ? "Campo obrigatório" : ""}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required size="small" sx={{ flex: 1 }} error={touched.crn_regiao && !formData.crn_regiao}>
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

              <TextField
                label="Número CRN"
                fullWidth
                required
                size="small"
                sx={{ flex: 1 }}
                value={formData.crn}
                onChange={(e) => {
                  setFormData({ ...formData, crn: e.target.value });
                  if (erroNutricionista) setErroNutricionista("");
                }}
                onBlur={() => setTouched({ ...touched, crn: true })}
                error={touched.crn && !formData.crn.trim()}
                helperText={touched.crn && !formData.crn.trim() ? "Campo obrigatório" : "Ex: 12345"}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="CPF"
                fullWidth
                size="small"
                sx={{ flex: 1 }}
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />

              <TextField
                label="Telefone"
                fullWidth
                size="small"
                sx={{ flex: 1 }}
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </Box>

            <TextField
              label="E-mail"
              type="email"
              fullWidth
              size="small"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="nutricionista@exemplo.com"
            />

            <TextField
              label="Especialidade"
              fullWidth
              size="small"
              value={formData.especialidade}
              onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
              placeholder="Ex: Nutrição Escolar, Clínica, Esportiva"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  size="small"
                />
              }
              label={<Typography variant="body2">Nutricionista Ativo</Typography>}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={closeModal} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending || !formData.nome.trim() || !formData.crn.trim() || !formData.crn_regiao}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (editingNutricionista ? 'Salvar' : 'Criar Nutricionista')}
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
          <Button onClick={confirmCloseModal} color="delete" variant="contained" size="small">
            Descartar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja excluir o nutricionista "{nutricionistaToDelete?.nome}"?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={closeDeleteModal} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="delete" variant="contained">
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
