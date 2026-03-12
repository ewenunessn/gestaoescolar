import React, { useState, useEffect, useMemo, useCallback } from "react";
import StatusIndicator from "../components/StatusIndicator";
import PageHeader from "../components/PageHeader";
import PageContainer from "../components/PageContainer";
import TableFilter, { FilterField } from "../components/TableFilter";
import { useToast } from "../hooks/useToast";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Box,
  Chip,
  Tooltip,
  Card,
  CardContent,
  Collapse,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  MoreVert,
  Category,
  People as PeopleIcon,
} from "@mui/icons-material";
import CompactPagination from '../components/CompactPagination';
import { useNavigate } from "react-router-dom";
import {
  criarModalidade,
  editarModalidade,
  removerModalidade,
  Modalidade, // <-- TIPO IMPORTADO DO SERVIÇO (AGORA CORRETO)
} from "../services/modalidades";
import { useModalidades, useCreateModalidade, useUpdateModalidade, useDeleteModalidade } from "../hooks/queries/useModalidadeQueries";

const ModalidadesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // React Query hooks para modalidades
  const { data: modalidades = [], isLoading: loading, error: queryError, refetch } = useModalidades();
  const createModalidadeMutation = useCreateModalidade();
  const updateModalidadeMutation = useUpdateModalidade();
  const deleteModalidadeMutation = useDeleteModalidade();
  
  // Estados de UI
  const [error, setError] = useState<string | null>(null);
  
  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de filtros - NOVO SISTEMA
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Estados de modais
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingModalidade, setEditingModalidade] = useState<Modalidade | null>(null);
  const [modalidadeToDelete, setModalidadeToDelete] = useState<Modalidade | null>(null);
  const [formData, setFormData] = useState({ 
    nome: "", 
    descricao: "",
    codigo_financeiro: "", 
    valor_repasse: 0,
    parcelas: 1,
    ativo: true 
  });

  // Tratar erros do React Query
  useEffect(() => {
    if (queryError) {
      setError("Erro ao carregar modalidades. Tente novamente.");
    } else {
      setError(null);
    }
  }, [queryError]);

  // Definir campos de filtro
  const filterFields: FilterField[] = useMemo(() => [
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
      type: 'select',
      label: 'Ordenar por',
      key: 'sortBy',
      options: [
        { value: 'nome', label: 'Nome' },
        { value: 'valor', label: 'Valor Repasse' },
        { value: 'status', label: 'Status' },
      ],
    },
  ], []);

  // Filtrar e ordenar modalidades
  const filteredModalidades = useMemo(() => {
    const sortBy = filters.sortBy || 'nome';
    
    return modalidades
      .filter((modalidade) => {
        // Busca por palavra-chave
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          if (!modalidade.nome.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        // Filtro de status
        if (filters.status) {
          if (filters.status === 'ativo' && !modalidade.ativo) return false;
          if (filters.status === 'inativo' && modalidade.ativo) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "nome":
            return a.nome.localeCompare(b.nome);
          case "valor":
            return Number(a.valor_repasse) - Number(b.valor_repasse);
          case "status":
            return Number(b.ativo) - Number(a.ativo);
          default:
            return 0;
        }
      });
  }, [modalidades, filters]);

  // Modalidades paginadas
  const paginatedModalidades = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredModalidades.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredModalidades, page, rowsPerPage]);

  // Funções de paginação
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPage(0);
  }, [filters]);

  // Formatar valor para moeda
  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value) || 0);
  };

  // Funções de modais
  const openModal = (modalidade: Modalidade | null = null) => {
    if (modalidade) {
      setEditingModalidade(modalidade);
      setFormData({
        nome: modalidade.nome,
        descricao: modalidade.descricao || "",
        codigo_financeiro: modalidade.codigo_financeiro || "",
        valor_repasse: Number(modalidade.valor_repasse),
        parcelas: Number(modalidade.parcelas) || 1,
        ativo: modalidade.ativo,
      });
    } else {
      setEditingModalidade(null);
      setFormData({ nome: "", descricao: "", codigo_financeiro: "", valor_repasse: 0, parcelas: 1, ativo: true });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSave = async () => {
    try {
      const dataToSend = { 
        ...formData, 
        valor_repasse: Number(formData.valor_repasse),
        parcelas: Number(formData.parcelas) || 1
      };
      if (editingModalidade) {
        await updateModalidadeMutation.mutateAsync({ id: editingModalidade.id, data: dataToSend });
        toast.success('Sucesso!', 'Modalidade atualizada com sucesso!');
      } else {
        await createModalidadeMutation.mutateAsync(dataToSend);
        toast.success('Sucesso!', 'Modalidade criada com sucesso!');
      }
      closeModal();
    } catch (err) {
      setError("Erro ao salvar modalidade. Verifique os dados e tente novamente.");
    }
  };

  const openDeleteModal = (modalidade: Modalidade) => {
    setModalidadeToDelete(modalidade);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setModalidadeToDelete(null);
  };

  const handleDelete = async () => {
    if (!modalidadeToDelete) return;
    try {
      await deleteModalidadeMutation.mutateAsync(modalidadeToDelete.id);
      toast.success('Sucesso!', 'Modalidade excluída com sucesso!');
      closeDeleteModal();
    } catch (err) {
      setError("Erro ao excluir. A modalidade pode estar em uso.");
    }
  };
  
  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      <PageContainer fullHeight>
        <PageHeader 
          title="Modalidades"
        />
        
        <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar modalidades..."
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
              <Button startIcon={<AddIcon />} onClick={() => openModal()} variant="contained" color="success" size="small">
                Nova Modalidade
              </Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small">
                <MoreVert />
              </IconButton>
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
            Exibindo {filteredModalidades.length} {filteredModalidades.length === 1 ? 'resultado' : 'resultados'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusIndicator status="ativo" size="small" />
              <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ATIVAS
              </Typography>
              <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                {filteredModalidades.filter(m => m.ativo).length}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusIndicator status="inativo" size="small" />
              <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                INATIVAS
              </Typography>
              <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                {filteredModalidades.filter(m => !m.ativo).length}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
          ) : error ? (
            <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={() => refetch()}>Tentar Novamente</Button></CardContent></Card>
          ) : filteredModalidades.length === 0 ? (
            <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Category sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhuma modalidade encontrada</Typography></CardContent></Card>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                <Table stickyHeader>
                <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 1 }}>Nome da Modalidade</TableCell>
                  <TableCell align="center" sx={{ py: 1 }}>Código Financeiro</TableCell>
                  <TableCell align="center" sx={{ py: 1 }}>Valor Repasse</TableCell>
                  <TableCell align="center" sx={{ py: 1 }}>Parcelas</TableCell>
                  <TableCell align="center" sx={{ py: 1 }}>Total Anual</TableCell>
                  <TableCell align="center" sx={{ py: 1 }}>Alunos</TableCell>
                  <TableCell align="center" sx={{ py: 1 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedModalidades.map((modalidade) => (
                  <TableRow key={modalidade.id} hover sx={{ '& td': { py: 0.75 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusIndicator status={modalidade.ativo ? 'ativo' : 'inativo'} size="small" />
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {modalidade.nome}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {modalidade.codigo_financeiro || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {formatCurrency(modalidade.valor_repasse)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={`${modalidade.parcelas || 1}x`} 
                        size="small" 
                        sx={{ 
                          bgcolor: '#e3f2fd', 
                          color: '#1976d2',
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#2e7d32' }}>
                        {formatCurrency(Number(modalidade.valor_repasse) * (Number(modalidade.parcelas) || 1))}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {modalidade.total_alunos || 0}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openModal(modalidade)} color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" onClick={() => openDeleteModal(modalidade)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </TableContainer>
              <CompactPagination count={filteredModalidades.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 20, 50, 100]} />
            </Box>
          )}
        </Box>
      </PageContainer>

      {/* Modal de Criação/Edição */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingModalidade ? 'Editar Modalidade' : 'Nova Modalidade'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField 
              label="Nome da Modalidade" 
              value={formData.nome} 
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })} 
              required 
            />
            <TextField 
              label="Descrição" 
              value={formData.descricao} 
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} 
              placeholder="Descrição da modalidade (opcional)"
              helperText="Descrição detalhada da modalidade de ensino"
              multiline
              rows={2}
            />
            <TextField 
              label="Código Financeiro" 
              value={formData.codigo_financeiro} 
              onChange={(e) => setFormData({ ...formData, codigo_financeiro: e.target.value })} 
              placeholder="Ex: 2.036, 1.025, FIN-001"
              helperText="Código usado no sistema financeiro (opcional)"
            />
            <TextField 
              label="Valor do Repasse (R$)" 
              type="number" 
              value={formData.valor_repasse} 
              onChange={(e) => setFormData({ ...formData, valor_repasse: parseFloat(e.target.value) || 0 })} 
              inputProps={{ step: "0.01", min: "0" }}
              helperText="Valor de cada parcela do repasse"
            />
            <TextField 
              label="Número de Parcelas" 
              type="number" 
              value={formData.parcelas} 
              onChange={(e) => setFormData({ ...formData, parcelas: parseInt(e.target.value) || 1 })} 
              inputProps={{ step: "1", min: "1" }}
              helperText={`Total anual: ${formatCurrency(Number(formData.valor_repasse) * Number(formData.parcelas))}`}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  color="primary"
                />
              }
              label="Modalidade Ativa"
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={closeModal} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.nome.trim()}>
            {editingModalidade ? 'Salvar Alterações' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirmar Exclusão</DialogTitle>
        <DialogContent><Typography>Tem certeza que deseja excluir a modalidade "{modalidadeToDelete?.nome}"?</Typography></DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}><Button onClick={closeDeleteModal} sx={{ color: 'text.secondary' }}>Cancelar</Button><Button onClick={handleDelete} color="error" variant="contained">Excluir</Button></DialogActions>
      </Dialog>
      
      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); navigate('/modalidades/gerenciar-alunos'); }}>
          <PeopleIcon sx={{ mr: 1 }} /> Gerenciar Alunos por Escola
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ModalidadesPage;