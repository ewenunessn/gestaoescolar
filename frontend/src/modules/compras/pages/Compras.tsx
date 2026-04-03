import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import { useToast } from "../../../hooks/useToast";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import GerarPedidoDaGuiaDialog from "../../../components/GerarPedidoDaGuiaDialog";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Popover,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  ShoppingCart,
} from "@mui/icons-material";
import { ColumnDef } from "@tanstack/react-table";
import pedidosService from "../../../services/pedidos";
import { Pedido, STATUS_PEDIDO } from "../../../types/pedido";
import { formatarMoeda, formatarData } from "../../../utils/dateUtils";
import { DataTable } from "../../../components/DataTable";

const PedidosPage = () => {
  const navigate = useNavigate();
  const { setPageTitle } = usePageTitle();
  const toast = useToast();

  useEffect(() => { setPageTitle('Compras'); }, [setPageTitle]);

  // Estados principais
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de filtro
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState({
    status: 'todos',
    data_from: '',
    data_to: '',
  });

  // Estados do modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pedidoToDelete, setPedidoToDelete] = useState<Pedido | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dialogGerarDaGuia, setDialogGerarDaGuia] = useState(false);

  // Carregar pedidos (toast não é dependência para evitar loop infinito)
  const loadPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await pedidosService.listar({
        status: filters.status !== 'todos' ? filters.status : undefined,
        data_inicio: filters.data_from || undefined,
        data_fim: filters.data_to || undefined,
      });

      const data = (response as any)?.data || response;
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error('Erro ao carregar pedidos. Tente novamente.');
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.data_from, filters.data_to]); // Removido toast das dependências

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  // Filtrar pedidos
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      // Filtro de status
      if (filters.status !== 'todos' && pedido.status !== filters.status) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Ordenar por data (mais recente primeiro)
      return new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime();
    });
  }, [pedidos, filters]);

  const getStatusChip = (status: string) => {
    const statusInfo = STATUS_PEDIDO[status as keyof typeof STATUS_PEDIDO];
    return (
      <Chip
        label={statusInfo?.label || status}
        color={statusInfo?.color as any || 'default'}
        size="small"
        variant="outlined"
      />
    );
  };

  // Definir colunas
  const columns = useMemo<ColumnDef<Pedido>[]>(() => [
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
      accessorKey: 'data_pedido',
      header: 'Data',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Typography variant="body2" color="text.secondary">
          {formatarData(getValue() as string)}
        </Typography>
      ),
    },
    {
      id: 'fornecedores',
      header: 'Fornecedores',
      size: 250,
      enableSorting: false,
      cell: ({ row }) => {
        const pedido = row.original;
        return pedido.total_fornecedores && pedido.total_fornecedores > 1 ? (
          <Tooltip title={pedido.fornecedores_nomes || ''}>
            <Chip
              label={`${pedido.total_fornecedores} fornecedores`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Tooltip>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {pedido.fornecedores_nomes || '-'}
          </Typography>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 150,
      enableSorting: true,
      cell: ({ getValue }) => getStatusChip(getValue() as string),
    },
    {
      accessorKey: 'valor_total',
      header: 'Valor Total',
      size: 150,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatarMoeda(getValue() as number)}
        </Typography>
      ),
    },
    {
      accessorKey: 'total_itens',
      header: 'Itens',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Chip label={String(getValue() || 0)} size="small" />
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
              onClick={() => navigate(`/compras/${row.original.id}`)}
              color="primary"
            >
              <VisibilityIcon fontSize="small" />
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

  const handleRowClick = useCallback((pedido: Pedido) => {
    navigate(`/compras/${pedido.id}`);
  }, [navigate]);

  const openDeleteModal = (pedido: Pedido) => {
    setPedidoToDelete(pedido);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setPedidoToDelete(null);
  };

  const handleDelete = async () => {
    if (!pedidoToDelete) return;
    try {
      setDeleting(true);
      await pedidosService.excluirPedido(pedidoToDelete.id);
      toast.success('Pedido excluído com sucesso!');
      closeDeleteModal();
      loadPedidos();
    } catch (error: any) {
      toast.error('Erro ao excluir pedido. Tente novamente.');
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
        <PageHeader title="Compras" />

        {/* Botão Gerar Pedido da Guia */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<ShoppingCart />}
            onClick={() => setDialogGerarDaGuia(true)}
            size="small"
            sx={{ bgcolor: '#1d4ed8', '&:hover': { bgcolor: '#1e40af' } }}
          >
            Gerar Pedido da Guia
          </Button>
        </Box>

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            data={pedidosFiltrados}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            searchPlaceholder="Buscar pedidos..."
            onCreateClick={() => navigate('/compras/novo')}
            createButtonLabel="Novo Pedido"
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
              {Object.entries(STATUS_PEDIDO).map(([key, info]) => (
                <MenuItem key={key} value={key}>
                  {info.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Data Início"
            type="date"
            fullWidth
            value={filters.data_from}
            onChange={(e) => setFilters({ ...filters, data_from: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Data Fim"
            type="date"
            fullWidth
            value={filters.data_to}
            onChange={(e) => setFilters({ ...filters, data_to: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setFilters({ status: 'todos', data_from: '', data_to: '' });
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
          {(filters.status !== 'todos' || filters.data_from || filters.data_to) && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: 'block' }}
              >
                Filtros ativos:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {filters.status !== 'todos' && (
                  <Chip
                    label={`Status: ${STATUS_PEDIDO[filters.status as keyof typeof STATUS_PEDIDO]?.label || filters.status}`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, status: 'todos' })}
                  />
                )}
                {filters.data_from && (
                  <Chip
                    label={`De: ${formatarData(filters.data_from)}`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, data_from: '' })}
                  />
                )}
                {filters.data_to && (
                  <Chip
                    label={`Até: ${formatarData(filters.data_to)}`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, data_to: '' })}
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
            Tem certeza que deseja excluir o pedido "{pedidoToDelete?.numero}"? Esta ação não pode ser desfeita.
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

      {/* Dialog Gerar Pedido da Guia */}
      <GerarPedidoDaGuiaDialog
        open={dialogGerarDaGuia}
        onClose={() => setDialogGerarDaGuia(false)}
        onSuccess={() => {
          setDialogGerarDaGuia(false);
          loadPedidos();
        }}
      />
    </Box>
  );
};

export default PedidosPage;
