import React, { useState, useMemo, useCallback } from "react";
import PageHeader from "../../../components/PageHeader";
import PageContainer from "../../../components/PageContainer";
import { useToast } from "../../../hooks/useToast";
import {
  Typography,
  Button,
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
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Modalidade } from "../../../services/modalidades";
import {
  useModalidades,
  useCategoriasFinanceirasModalidade,
  useCreateModalidade,
  useUpdateModalidade,
  useDeleteModalidade,
} from "../../../hooks/queries/useModalidadeQueries";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import { EntityListTable } from "../../../components/data-display/EntityListTable";
import StatusIndicator from "../../../components/StatusIndicator";
import { FormDialog, ConfirmDialog } from "../../../components/BaseDialog";
import { ColumnDef } from "@tanstack/react-table";

const ModalidadesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // React Query hooks para modalidades
  const { data: modalidades = [], isLoading: loading } = useModalidades();
  const { data: categoriasFinanceiras = [] } = useCategoriasFinanceirasModalidade();
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
    categorias_financeiras_ids: [] as string[],
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
      size: 240,
      enableSorting: true,
    },
    {
      accessorKey: 'descricao',
      header: 'Descricao / Faixa etaria',
      size: 260,
      enableSorting: false,
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined;
        return (
          <Typography variant="body2" color="text.secondary" noWrap>
            {value || '-'}
          </Typography>
        );
      },
    },
    {
      accessorKey: 'categoria_financeira_nome',
      header: 'Modalidades Financeiras',
      size: 260,
      enableSorting: true,
      cell: ({ row }) => {
        const categorias = row.original.categorias_financeiras || [];
        if (categorias.length > 0) {
          return (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {categorias.map((categoria) => (
                <Chip key={categoria.id} label={categoria.nome} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
              ))}
            </Box>
          );
        }

        const value = row.original.categoria_financeira_nome;
        return (
          <Chip label={value || 'Sem vinculo'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
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
          <span>
            <StatusIndicator status={getValue() ? 'ativo' : 'inativo'} text={getValue() ? 'Ativa' : 'Inativa'} size="small" />
          </span>
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
              color="edit"
              onClick={() => openModal(row.original)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              color="delete"
              onClick={() => openDeleteModal(row.original)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], []);

  // Funções de modais
  const openModal = (modalidade: Modalidade | null = null) => {
    if (modalidade) {
      setEditingModalidade(modalidade);
      setFormData({
        nome: modalidade.nome,
        descricao: modalidade.descricao || "",
        categorias_financeiras_ids: (modalidade.categorias_financeiras_ids || [modalidade.categoria_financeira_id])
          .filter(Boolean)
          .map(String),
        ativo: modalidade.ativo,
      });
    } else {
      setEditingModalidade(null);
      setFormData({ nome: "", descricao: "", categorias_financeiras_ids: [], ativo: true });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSave = async () => {
    try {
      if (formData.categorias_financeiras_ids.length === 0) {
        toast.warning("Selecione ao menos uma modalidade financeira antes de salvar.");
        return;
      }
      const dataToSend = {
        nome: formData.nome,
        descricao: formData.descricao,
        ativo: formData.ativo,
        categorias_financeiras_ids: formData.categorias_financeiras_ids.map(Number),
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

  const handleCategoriaChange = (categoriaIds: string[]) => {
    setFormData({
      ...formData,
      categorias_financeiras_ids: categoriaIds,
    });
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
    <Box
      sx={{
        height: 'calc(100vh - var(--app-top-offset, 0px))',
        bgcolor: 'background.default',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PageContainer fullHeight>
        <PageHeader
          title="Modalidades Pedagogicas"
          totalCount={modalidades.length}
          breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Cadastros' }, { label: 'Modalidades Pedagogicas' }]}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" color="primary" onClick={() => navigate('/modalidades-financeiras')} sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 500 }}>
                Financeiras
              </Button>
              <Button variant="contained" color="add" startIcon={<AddIcon />} onClick={() => openModal()} sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 500 }}>
                Nova Modalidade
              </Button>
            </Box>
          }
        />

        {/* EntityListTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <EntityListTable
            title="Modalidades Pedagogicas"
            data={modalidadesFiltradas}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            searchPlaceholder="Buscar modalidades pedagogicas..."
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
                    label={`Ordem: Status`}
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
      <FormDialog
        open={modalOpen}
        onClose={closeModal}
        title={editingModalidade ? 'Editar Modalidade Pedagogica' : 'Nova Modalidade Pedagogica'}
        onSave={handleSave}
        loading={createModalidadeMutation.isPending || updateModalidadeMutation.isPending}
        disableSave={!formData.nome.trim() || formData.categorias_financeiras_ids.length === 0}
        maxWidth="md"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Preencha os dados da modalidade pedagogica usada em escolas, cardapios e demandas.
        </Typography>

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
                label="Descricao / faixa etaria"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                fullWidth
                multiline
                minRows={2}
                placeholder="Ex: alunos de 4 a 5 anos; etapa pedagogica usada no cardapio e na demanda"
                helperText="Use este campo para registrar a faixa etaria ou observacao pedagogica."
              />
            </Grid>
          </Grid>
        </Box>

        <Divider />

        {/* Vinculo Financeiro */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Vinculo Financeiro
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <FormControl fullWidth required>
                  <InputLabel>Modalidades financeiras</InputLabel>
                  <Select
                    multiple
                    label="Modalidades financeiras"
                    value={formData.categorias_financeiras_ids}
                    onChange={(e) => {
                      const value = e.target.value as string[] | string;
                      handleCategoriaChange(typeof value === "string" ? value.split(",") : value);
                    }}
                    renderValue={(selected) =>
                      (selected as string[])
                        .map((id) => categoriasFinanceiras.find((categoria) => String(categoria.id) === id)?.nome)
                        .filter(Boolean)
                        .join(", ")
                    }
                  >
                    {categoriasFinanceiras.map((categoria) => (
                      <MenuItem key={categoria.id} value={String(categoria.id)}>
                        {categoria.nome}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, ml: 1.75 }}>
                    Selecione uma ou mais modalidades financeiras ja cadastradas para financiar esta etapa pedagogica.
                  </Typography>
                </FormControl>
                <Button
                  variant="outlined"
                  color="add"
                  onClick={() => navigate('/modalidades-financeiras')}
                  sx={{ minWidth: 170, height: 40, textTransform: 'none' }}
                >
                  Gerenciar financeiras
                </Button>
              </Box>
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
      </FormDialog>


      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDialog
        open={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir a modalidade "${modalidadeToDelete?.nome}"?`}
        loading={deleteModalidadeMutation.isPending}
        severity="error"
        confirmLabel="Excluir"
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
        <MenuItem onClick={() => { setImportExportMenuAnchor(null); navigate('/modalidades/gerenciar-alunos'); }}>
          <PeopleIcon sx={{ mr: 1 }} /> Gerenciar Alunos por Escola
        </MenuItem>
        <MenuItem onClick={() => { setImportExportMenuAnchor(null); navigate('/modalidades/relatorio-alunos'); }}>
          <AssessmentIcon sx={{ mr: 1 }} /> Relatorio de Alunos
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
