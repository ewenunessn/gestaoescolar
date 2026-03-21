import React, { useState, useEffect, useMemo, useCallback } from "react";
import PageHeader from "../components/PageHeader";
import PageContainer from "../components/PageContainer";
import { useToast } from "../hooks/useToast";
import {
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
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Switch,
  FormControlLabel,
  Popover,
  Grid,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Modalidade } from "../services/modalidades";
import { useModalidades, useCreateModalidade, useUpdateModalidade, useDeleteModalidade } from "../hooks/queries/useModalidadeQueries";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { DataTable } from "../components/DataTable";
import { ColumnDef } from "@tanstack/react-table";

const ModalidadesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // React Query hooks para modalidades
  const { data: modalidades = [], isLoading: loading, error: queryError, refetch } = useModalidades();
  const createModalidadeMutation = useCreateModalidade();
  const updateModalidadeMutation = useUpdateModalidade();
  const deleteModalidadeMutation = useDeleteModalidade();
  
  // Estados de ações
  const [importExportMenuAnchor, setImportExportMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de filtro
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState({
    status: 'todos',
    sortBy: 'nome',
  });

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

  // Filtrar e ordenar modalidades
  const modalidadesFiltradas = useMemo(() => {
    const sortBy = filters.sortBy || 'nome';
    
    return modalidades
      .filter((modalidade) => {
        // Filtro de status
        if (filters.status === 'ativo' && !modalidade.ativo) return false;
        if (filters.status === 'inativo' && modalidade.ativo) return false;

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

  const handleRowClick = useCallback((modalidade: Modalidade) => {
    openModal(modalidade);
  }, []);

  const columns = useMemo<ColumnDef<Modalidade>[]>(() => [
    { 
      accessorKey: 'id', 
      header: 'ID',
      size: 80,
      enableSorting: true,
    },
    { 
      accessorKey: 'nome', 
      header: 'Nome da Modalidade',
      size: 300,
      enableSorting: true,
    },
    { 
      accessorKey: 'codigo_financeiro', 
      header: 'Código Financeiro',
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
      accessorKey: 'valor_repasse', 
      header: 'Valor Repasse',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return (
          <Typography variant="body2" color="text.secondary">
            {formatCurrency(value)}
          </Typography>
        );
      },
    },
    { 
      accessorKey: 'parcelas', 
      header: 'Parcelas',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return (
          <Chip 
            label={`${value || 1}x`} 
            size="small" 
            sx={{ 
              bgcolor: '#e3f2fd', 
              color: '#1976d2',
              fontWeight: 600,
              fontSize: '0.75rem'
            }} 
          />
        );
      },
    },
    { 
      id: 'total_anual',
      header: 'Total Anual',
      size: 120,
      enableSorting: false,
      cell: ({ row }) => {
        const valor = Number(row.original.valor_repasse);
        const parcelas = Number(row.original.parcelas) || 1;
        return (
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
            {formatCurrency(valor * parcelas)}
          </Typography>
        );
      },
    },
    { 
      accessorKey: 'total_alunos', 
      header: 'Alunos',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as number | undefined;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {value || 0}
            </Typography>
          </Box>
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
        toast.success('Modalidade atualizada com sucesso!');
      } else {
        await createModalidadeMutation.mutateAsync(dataToSend);
        toast.success('Modalidade criada com sucesso!');
      }
      closeModal();
    } catch (err) {
      toast.error("Erro ao salvar modalidade. Verifique os dados e tente novamente.");
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
      toast.success('Modalidade excluída com sucesso!');
      closeDeleteModal();
    } catch (err) {
      toast.error("Erro ao excluir. A modalidade pode estar em uso.");
    }
  };
  
  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageContainer fullHeight>
        <PageHeader title="Modalidades" />

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            data={modalidadesFiltradas}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            searchPlaceholder="Buscar modalidades..."
            onCreateClick={() => openModal()}
            createButtonLabel="Nova Modalidade"
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
              <MenuItem value="todos">Todas</MenuItem>
              <MenuItem value="ativo">Ativas</MenuItem>
              <MenuItem value="inativo">Inativas</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Ordenar por</InputLabel>
            <Select
              value={filters.sortBy}
              label="Ordenar por"
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            >
              <MenuItem value="nome">Nome</MenuItem>
              <MenuItem value="valor">Valor Repasse</MenuItem>
              <MenuItem value="status">Status</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setFilters({ status: 'todos', sortBy: 'nome' });
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
          {(filters.status !== 'todos' || filters.sortBy !== 'nome') && (
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
                {filters.sortBy !== 'nome' && (
                  <Chip
                    label={`Ordem: ${filters.sortBy === 'valor' ? 'Valor' : 'Status'}`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, sortBy: 'nome' })}
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
            {editingModalidade ? 'Editar Modalidade' : 'Nova Modalidade'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Preencha os dados da modalidade de ensino
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
                    label="Nome da Modalidade" 
                    value={formData.nome} 
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })} 
                    required 
                    fullWidth
                    placeholder="Ex: Ensino Fundamental, Ensino Médio"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    label="Descrição" 
                    value={formData.descricao} 
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} 
                    placeholder="Descrição da modalidade (opcional)"
                    helperText="Descrição detalhada da modalidade de ensino"
                    multiline
                    rows={2}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Dados Financeiros */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Dados Financeiros
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField 
                    label="Código Financeiro" 
                    value={formData.codigo_financeiro} 
                    onChange={(e) => setFormData({ ...formData, codigo_financeiro: e.target.value })} 
                    placeholder="Ex: 2.036, 1.025, FIN-001"
                    helperText="Código usado no sistema financeiro (opcional)"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Valor do Repasse (R$)" 
                    type="number" 
                    value={formData.valor_repasse} 
                    onChange={(e) => setFormData({ ...formData, valor_repasse: parseFloat(e.target.value) || 0 })} 
                    inputProps={{ step: "0.01", min: "0" }}
                    helperText="Valor de cada parcela do repasse"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Número de Parcelas" 
                    type="number" 
                    value={formData.parcelas} 
                    onChange={(e) => setFormData({ ...formData, parcelas: parseInt(e.target.value) || 1 })} 
                    inputProps={{ step: "1", min: "1" }}
                    helperText={`Total anual: ${formatCurrency(Number(formData.valor_repasse) * Number(formData.parcelas))}`}
                    fullWidth
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
                      Modalidade Ativa
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Modalidades ativas aparecem no sistema e podem receber alunos
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
            disabled={createModalidadeMutation.isPending || updateModalidadeMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={createModalidadeMutation.isPending || updateModalidadeMutation.isPending || !formData.nome.trim()}
            startIcon={(createModalidadeMutation.isPending || updateModalidadeMutation.isPending) ? <CircularProgress size={20} /> : null}
          >
            {(createModalidadeMutation.isPending || updateModalidadeMutation.isPending) ? 'Salvando...' : (editingModalidade ? 'Salvar Alterações' : 'Criar Modalidade')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a modalidade "{modalidadeToDelete?.nome}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteModal} disabled={deleteModalidadeMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={deleteModalidadeMutation.isPending}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      
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
        <MenuItem onClick={() => { setImportExportMenuAnchor(null); navigate('/modalidades/gerenciar-alunos'); }}>
          <PeopleIcon sx={{ mr: 1 }} /> Gerenciar Alunos por Escola
        </MenuItem>
      </Menu>

      <LoadingOverlay 
        open={
          createModalidadeMutation.isPending ||
          updateModalidadeMutation.isPending ||
          deleteModalidadeMutation.isPending
        }
        message={
          createModalidadeMutation.isPending ? 'Criando modalidade...' :
          updateModalidadeMutation.isPending ? 'Atualizando modalidade...' :
          deleteModalidadeMutation.isPending ? 'Excluindo modalidade...' :
          'Processando...'
        }
      />
    </Box>
  );
};

export default ModalidadesPage;