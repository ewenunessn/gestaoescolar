import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  SelectChangeEvent,
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
  Info as InfoIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { listarContratos, removerContrato } from '../services/contratos';
import { listarFornecedores } from '../services/fornecedores';
import { useToast } from '../hooks/useToast';
import { DataTable } from '../components/DataTable';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';

// Interfaces
interface Contrato {
  id: number;
  fornecedor_id: number;
  numero: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  status?: string;
  valor_total_contrato?: number;
}

interface Fornecedor {
  id: number;
  nome: string;
}

const ContratosPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Estados principais
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de filtros
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState({
    fornecedor: 'todos',
    status: 'todos',
  });

  // Estados de exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contratoToDelete, setContratoToDelete] = useState<Contrato | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Carregar dados
  const loadContratos = useCallback(async () => {
    try {
      setLoading(true);
      const [contratosData, fornecedoresData] = await Promise.all([
        listarContratos(),
        listarFornecedores(),
      ]);
      setContratos(Array.isArray(contratosData) ? contratosData : []);
      setFornecedores(Array.isArray(fornecedoresData) ? fornecedoresData : []);
    } catch (err) {
      toast.error('Erro ao carregar contratos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContratos();
  }, [loadContratos]);

  // Mapa de fornecedores para performance
  const fornecedorMap = useMemo(
    () => new Map(fornecedores.map((f) => [f.id, f.nome])),
    [fornecedores]
  );

  // Funções de status e data
  const getStatusContrato = useCallback((contrato: Contrato) => {
    if (!contrato.ativo) return { status: 'suspenso', color: 'default' as const };
    const hoje = new Date();
    const fim = new Date(contrato.data_fim);
    if (hoje > fim) return { status: 'vencido', color: 'error' as const };
    return { status: 'vigente', color: 'success' as const };
  }, []);

  const formatarData = (data: string) => new Date(data).toLocaleDateString('pt-BR');
  const formatarValor = (valor?: number) =>
    `R$ ${(Number(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Filtrar contratos
  const contratosFiltrados = useMemo(() => {
    return contratos.filter((contrato) => {
      // Filtro de fornecedor
      if (filters.fornecedor !== 'todos' && contrato.fornecedor_id !== Number(filters.fornecedor)) {
        return false;
      }

      // Filtro de status
      if (filters.status !== 'todos') {
        const statusInfo = getStatusContrato(contrato);
        if (statusInfo.status !== filters.status) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => a.numero.localeCompare(b.numero));
  }, [contratos, filters, getStatusContrato]);

  // Definir colunas
  const columns = useMemo<ColumnDef<Contrato>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 80,
        enableSorting: true,
      },
      {
        accessorKey: 'numero',
        header: 'Número',
        size: 150,
        enableSorting: true,
        cell: ({ getValue }) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {getValue() as string}
          </Typography>
        ),
      },
      {
        accessorKey: 'fornecedor_id',
        header: 'Fornecedor',
        size: 250,
        enableSorting: false,
        cell: ({ getValue }) => (
          <Typography variant="body2" color="text.secondary">
            {fornecedorMap.get(getValue() as number) || 'N/A'}
          </Typography>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        size: 120,
        enableSorting: false,
        cell: ({ row }) => {
          const statusInfo = getStatusContrato(row.original);
          return (
            <Chip
              label={statusInfo.status.charAt(0).toUpperCase() + statusInfo.status.slice(1)}
              size="small"
              color={statusInfo.color}
              sx={{ minWidth: 90 }}
            />
          );
        },
      },
      {
        id: 'vigencia',
        header: 'Vigência',
        size: 200,
        enableSorting: false,
        cell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {`${formatarData(row.original.data_inicio)} a ${formatarData(row.original.data_fim)}`}
          </Typography>
        ),
      },
      {
        accessorKey: 'valor_total_contrato',
        header: 'Valor Total',
        size: 150,
        enableSorting: true,
        cell: ({ getValue }) => (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {formatarValor(getValue() as number)}
          </Typography>
        ),
      },
      {
        id: 'actions',
        header: 'Ações',
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Ver Detalhes">
              <IconButton
                size="small"
                onClick={() => navigate(`/contratos/${row.original.id}`)}
                color="primary"
              >
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [fornecedorMap, getStatusContrato, navigate]
  );

  const handleRowClick = useCallback(
    (contrato: Contrato) => {
      navigate(`/contratos/${contrato.id}`);
    },
    [navigate]
  );

  const openDeleteModal = (contrato: Contrato) => {
    setContratoToDelete(contrato);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setContratoToDelete(null);
  };

  const handleDelete = async () => {
    if (!contratoToDelete) return;
    try {
      setDeleting(true);
      await removerContrato(contratoToDelete.id);
      toast.success('Contrato excluído com sucesso!');
      closeDeleteModal();
      loadContratos();
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || 'Erro ao excluir. O contrato pode estar em uso.';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box
      sx={{
        height: 'calc(100vh - 56px)',
        bgcolor: '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PageContainer fullHeight>
        <PageHeader title="Contratos" />

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            data={contratosFiltrados}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            searchPlaceholder="Buscar contratos..."
            onCreateClick={() => navigate('/contratos/novo')}
            createButtonLabel="Novo Contrato"
            onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
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
            <InputLabel>Fornecedor</InputLabel>
            <Select
              value={filters.fornecedor}
              label="Fornecedor"
              onChange={(e) => setFilters({ ...filters, fornecedor: e.target.value })}
            >
              <MenuItem value="todos">Todos</MenuItem>
              {fornecedores.map((f) => (
                <MenuItem key={f.id} value={f.id.toString()}>
                  {f.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="vigente">Vigente</MenuItem>
              <MenuItem value="vencido">Vencido</MenuItem>
              <MenuItem value="suspenso">Suspenso</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setFilters({ fornecedor: 'todos', status: 'todos' });
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
          {(filters.fornecedor !== 'todos' || filters.status !== 'todos') && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: 'block' }}
              >
                Filtros ativos:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {filters.fornecedor !== 'todos' && (
                  <Chip
                    label={`Fornecedor: ${
                      fornecedorMap.get(Number(filters.fornecedor)) || 'Selecionado'
                    }`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, fornecedor: 'todos' })}
                  />
                )}
                {filters.status !== 'todos' && (
                  <Chip
                    label={`Status: ${
                      filters.status.charAt(0).toUpperCase() + filters.status.slice(1)
                    }`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, status: 'todos' })}
                  />
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Popover>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o contrato "{contratoToDelete?.numero}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteModal} disabled={deleting}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu de Ações */}
      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={() => setActionsMenuAnchor(null)}
      >
        <MenuItem disabled>
          <Typography>Nenhuma ação disponível</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ContratosPage;
