import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '../hooks/useToast';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  ContentCopy as ContentCopyIcon,
  GroupWork as GroupWorkIcon,
} from '@mui/icons-material';
import { 
  useRefeicoes, 
  useCriarRefeicao, 
  useEditarRefeicao, 
  useDeletarRefeicao,
  useDuplicarRefeicao
} from '../hooks/queries/useRefeicaoQueries';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Refeicao } from '../types/refeicao';
import { TIPOS_REFEICAO } from '../services/cardapiosModalidade';

const PreparacoesPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // React Query hooks
  const { 
    data: preparacoes = [], 
    isLoading: loading 
  } = useRefeicoes();
  
  const criarPreparacaoMutation = useCriarRefeicao();
  const editarPreparacaoMutation = useEditarRefeicao();
  const deletarPreparacaoMutation = useDeletarRefeicao();
  const duplicarPreparacaoMutation = useDuplicarRefeicao();
  
  // Estados de filtro
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState({
    status: 'todos',
    tipo: 'todos',
  });

  // Estados de modais
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [editingPreparacao, setEditingPreparacao] = useState<Refeicao | null>(null);
  const [preparacaoToDelete, setPreparacaoToDelete] = useState<Refeicao | null>(null);
  const [preparacaoToDuplicate, setPreparacaoToDuplicate] = useState<Refeicao | null>(null);
  const [duplicateNome, setDuplicateNome] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'almoco' as 'cafe_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia',
    ativo: true,
  });
  
  // Estados de validação
  const [erroPreparacao, setErroPreparacao] = useState('');
  const [touched, setTouched] = useState<any>({});

  // Usar tipos de refeição padronizados do cardápio
  const tiposPreparacao = TIPOS_REFEICAO;

  // Filtrar preparações
  const preparacoesFiltradas = useMemo(() => {
    return preparacoes.filter(p => {
      // Filtro de status
      if (filters.status === 'ativo' && !p.ativo) return false;
      if (filters.status === 'inativo' && p.ativo) return false;

      // Filtro de tipo
      if (filters.tipo !== 'todos' && p.tipo !== filters.tipo) {
        return false;
      }

      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [preparacoes, filters]);

  const handleRowClick = useCallback((preparacao: Refeicao) => {
    navigate(`/preparacoes/${preparacao.id}`);
  }, [navigate]);

  const columns = useMemo<ColumnDef<Refeicao>[]>(() => [
    { 
      accessorKey: 'id', 
      header: 'ID',
      size: 80,
      enableSorting: true,
    },
    { 
      accessorKey: 'nome', 
      header: 'Nome da Preparação',
      size: 300,
      enableSorting: true,
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {row.original.nome}
        </Typography>
      ),
    },
    { 
      accessorKey: 'tipo', 
      header: 'Tipo',
      size: 180,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <Chip 
            label={tiposPreparacao[value as keyof typeof tiposPreparacao] || value} 
            size="small"
            color="primary"
            variant="outlined"
          />
        );
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
      size: 150,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Ver Detalhes">
            <IconButton
              size="small"
              onClick={() => navigate(`/preparacoes/${row.original.id}`)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Duplicar">
            <IconButton
              size="small"
              onClick={() => openDuplicateModal(row.original)}
              color="primary"
            >
              <ContentCopyIcon fontSize="small" />
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
  const openModal = (preparacao: Refeicao | null = null) => {
    setErroPreparacao('');
    setTouched({});
    if (preparacao) {
      setEditingPreparacao(preparacao);
      setFormData({
        nome: preparacao.nome,
        descricao: preparacao.descricao || '',
        tipo: preparacao.tipo,
        ativo: preparacao.ativo,
      });
    } else {
      setEditingPreparacao(null);
      setFormData({
        nome: '',
        descricao: '',
        tipo: 'almoco',
        ativo: true,
      });
    }
    setModalOpen(true);
  };
  
  const closeModal = () => {
    setModalOpen(false);
    setErroPreparacao('');
    setTouched({});
  };

  const handleSave = async () => {
    // Validação
    if (!formData.nome.trim()) {
      setErroPreparacao('Nome é obrigatório.');
      setTouched({ ...touched, nome: true });
      return;
    }
    
    try {
      if (editingPreparacao) {
        await editarPreparacaoMutation.mutateAsync({ id: editingPreparacao.id, data: formData });
        toast.success('Preparação atualizada com sucesso!');
      } else {
        await criarPreparacaoMutation.mutateAsync(formData);
        toast.success('Preparação criada com sucesso!');
      }
      closeModal();
    } catch (err: any) {
      console.error('Erro ao salvar preparação:', err);
      setErroPreparacao(err.message || 'Erro ao salvar preparação.');
    }
  };

  const openDeleteModal = (preparacao: Refeicao) => {
    setPreparacaoToDelete(preparacao);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setPreparacaoToDelete(null);
  };

  const handleDelete = async () => {
    if (!preparacaoToDelete) return;
    try {
      await deletarPreparacaoMutation.mutateAsync(preparacaoToDelete.id);
      toast.success('Preparação removida com sucesso!');
      closeDeleteModal();
    } catch (err: any) {
      const message = err.response?.data?.message?.includes('cardapios')
        ? 'Não é possível excluir. A preparação está em uso em um ou mais cardápios.'
        : 'Erro ao remover preparação';
      toast.error(message);
    }
  };

  const openDuplicateModal = (preparacao: Refeicao) => {
    setPreparacaoToDuplicate(preparacao);
    setDuplicateNome(`${preparacao.nome} (Cópia)`);
    setDuplicateModalOpen(true);
  };

  const closeDuplicateModal = () => {
    setDuplicateModalOpen(false);
    setPreparacaoToDuplicate(null);
    setDuplicateNome('');
  };

  const handleDuplicate = async () => {
    if (!preparacaoToDuplicate || !duplicateNome.trim()) return;
    try {
      await duplicarPreparacaoMutation.mutateAsync({ 
        id: preparacaoToDuplicate.id, 
        nome: duplicateNome.trim() 
      });
      toast.success('Preparação duplicada com sucesso!');
      closeDuplicateModal();
    } catch (err: any) {
      toast.error('Erro ao duplicar preparação');
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageContainer fullHeight>
        <PageHeader title="Preparações" />

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            data={preparacoesFiltradas}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            searchPlaceholder="Buscar preparações..."
            onCreateClick={() => openModal()}
            createButtonLabel="Nova Preparação"
            onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
            initialPageSize={50}
            toolbarExtra={
              <Tooltip title="Gerenciar grupos de ingredientes">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<GroupWorkIcon />}
                  onClick={() => navigate('/grupos-ingredientes')}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Grupos
                </Button>
              </Tooltip>
            }
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
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filters.tipo}
              label="Tipo"
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
            >
              <MenuItem value="todos">Todos</MenuItem>
              {Object.entries(tiposPreparacao).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
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
                    label={`Status: ${filters.status === 'ativo' ? 'Ativas' : 'Inativas'}`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, status: 'todos' })}
                  />
                )}
                {filters.tipo !== 'todos' && (
                  <Chip
                    label={`Tipo: ${tiposPreparacao[filters.tipo as keyof typeof tiposPreparacao]}`}
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
      <Dialog 
        open={modalOpen} 
        onClose={closeModal} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            {editingPreparacao ? 'Editar Preparação' : 'Nova Preparação'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Preencha os dados da preparação
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {erroPreparacao && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {erroPreparacao}
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
                    label="Nome da Preparação" 
                    value={formData.nome} 
                    onChange={(e) => {
                      setFormData({ ...formData, nome: e.target.value });
                      if (erroPreparacao) setErroPreparacao('');
                    }}
                    onBlur={() => setTouched({ ...touched, nome: true })}
                    required 
                    fullWidth
                    error={touched.nome && !formData.nome.trim()}
                    helperText={touched.nome && !formData.nome.trim() ? 'Campo obrigatório' : ''}
                    placeholder="Ex: Arroz com Feijão"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    label="Descrição" 
                    value={formData.descricao} 
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} 
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Descrição opcional da preparação"
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
                    <InputLabel>Tipo de Preparação</InputLabel>
                    <Select
                      value={formData.tipo}
                      label="Tipo de Preparação"
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    >
                      {Object.entries(tiposPreparacao).map(([value, label]) => (
                        <MenuItem key={value} value={value}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                      Preparação Ativa
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Preparações ativas aparecem no sistema e podem ser usadas em cardápios
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
            disabled={criarPreparacaoMutation.isPending || editarPreparacaoMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={criarPreparacaoMutation.isPending || editarPreparacaoMutation.isPending || !formData.nome.trim()}
            startIcon={(criarPreparacaoMutation.isPending || editarPreparacaoMutation.isPending) ? <CircularProgress size={20} /> : null}
          >
            {(criarPreparacaoMutation.isPending || editarPreparacaoMutation.isPending) ? 'Salvando...' : 'Salvar Preparação'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a preparação "{preparacaoToDelete?.nome}"? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteModal} disabled={deletarPreparacaoMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={deletarPreparacaoMutation.isPending}
          >
            {deletarPreparacaoMutation.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Duplicar Preparação */}
      <Dialog 
        open={duplicateModalOpen} 
        onClose={closeDuplicateModal} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Duplicar Preparação
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Alert severity="info">
              Todos os dados da preparação "{preparacaoToDuplicate?.nome}" serão copiados, incluindo produtos e ingredientes. Apenas altere o nome da nova preparação.
            </Alert>
            <TextField 
              label="Nome da Nova Preparação" 
              value={duplicateNome} 
              onChange={(e) => setDuplicateNome(e.target.value)} 
              required 
              autoFocus
              fullWidth
              placeholder="Ex: Arroz com Feijão (Cópia)"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={closeDuplicateModal} 
            variant="outlined"
            disabled={duplicarPreparacaoMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDuplicate} 
            variant="contained" 
            disabled={!duplicateNome.trim() || duplicarPreparacaoMutation.isPending}
            startIcon={duplicarPreparacaoMutation.isPending ? <CircularProgress size={20} /> : <ContentCopyIcon />}
          >
            {duplicarPreparacaoMutation.isPending ? 'Duplicando...' : 'Duplicar'}
          </Button>
        </DialogActions>
      </Dialog>

      <LoadingOverlay 
        open={
          criarPreparacaoMutation.isPending ||
          editarPreparacaoMutation.isPending ||
          deletarPreparacaoMutation.isPending ||
          duplicarPreparacaoMutation.isPending
        }
        message={
          criarPreparacaoMutation.isPending ? 'Criando preparação...' :
          editarPreparacaoMutation.isPending ? 'Atualizando preparação...' :
          deletarPreparacaoMutation.isPending ? 'Excluindo preparação...' :
          duplicarPreparacaoMutation.isPending ? 'Duplicando preparação...' :
          'Processando...'
        }
      />
    </Box>
  );
};

export default PreparacoesPage;
