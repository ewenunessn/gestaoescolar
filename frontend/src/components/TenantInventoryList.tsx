import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  TablePagination,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Assessment as AssessmentIcon,
  Inventory as InventoryIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useTenant } from '../context/TenantContext';
import { formatarQuantidade } from '../utils/formatters';

interface InventoryItem {
  id: number;
  escola_id?: number;
  produto_id: number;
  produto_nome: string;
  categoria?: string;
  unidade_medida?: string;
  unidade?: string;
  quantidade_atual: number;
  status_estoque: 'normal' | 'critico' | 'vencido' | 'atencao' | 'sem_estoque';
  dias_para_vencimento?: number;
  data_validade?: string;
}

interface TenantInventoryListProps {
  items: InventoryItem[];
  loading?: boolean;
  error?: any;
  onViewDetails?: (item: InventoryItem) => void;
  onAddStock?: (item: InventoryItem) => void;
  onRemoveStock?: (item: InventoryItem) => void;
  onAdjustStock?: (item: InventoryItem) => void;
  showActions?: boolean;
  emptyMessage?: string;
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onPageChange?: (event: unknown, newPage: number) => void;
  onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  showPagination?: boolean;
}

export const TenantInventoryList: React.FC<TenantInventoryListProps> = ({
  items,
  loading = false,
  error,
  onViewDetails,
  onAddStock,
  onRemoveStock,
  onAdjustStock,
  showActions = true,
  emptyMessage = 'Nenhum produto encontrado',
  page = 0,
  rowsPerPage = 10,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  showPagination = false,
}) => {
  const { currentTenant, error: tenantError } = useTenant();

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vencido': return 'error';
      case 'critico': return 'warning';
      case 'atencao': return 'info';
      case 'sem_estoque': return 'default';
      default: return 'success';
    }
  };

  // Get status text
  const getStatusText = (status: string, dias?: number) => {
    switch (status) {
      case 'vencido': return 'Vencido';
      case 'critico': return dias === 0 ? 'Vence hoje' : `${dias} dias`;
      case 'atencao': return dias === 0 ? 'Vence hoje' : `${dias} dias`;
      case 'sem_estoque': return 'Sem estoque';
      default: return 'Normal';
    }
  };

  // Format date
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Handle tenant-specific errors
  const renderError = () => {
    if (tenantError) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro no contexto da organização: {tenantError}
        </Alert>
      );
    }

    if (error?.response?.status === 403) {
      const errorCode = error?.response?.data?.code;
      if (errorCode === 'TENANT_OWNERSHIP_ERROR') {
        return (
          <Alert severity="error" sx={{ mb: 2 }}>
            Você não tem permissão para acessar este recurso da organização.
          </Alert>
        );
      } else if (errorCode === 'CROSS_TENANT_INVENTORY_ACCESS') {
        return (
          <Alert severity="error" sx={{ mb: 2 }}>
            Acesso negado: operação entre organizações não permitida.
          </Alert>
        );
      }
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.message || 'Erro ao carregar dados do inventário'}
        </Alert>
      );
    }

    return null;
  };

  // Show loading state
  if (loading) {
    return (
      <Paper sx={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Carregando inventário...
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Show error state
  const errorComponent = renderError();
  if (errorComponent) {
    return errorComponent;
  }

  // Show empty state
  if (!items || items.length === 0) {
    return (
      <Paper sx={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {emptyMessage}
          </Typography>
          {currentTenant && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Organização: {currentTenant.name}
            </Typography>
          )}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ borderRadius: '12px', overflow: 'hidden' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Produto</TableCell>
              <TableCell align="center">Estoque Atual</TableCell>
              <TableCell align="center">Validade</TableCell>
              <TableCell align="center">Status</TableCell>
              {showActions && <TableCell align="center">Ações</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              // Ensure safe data access
              const quantidadeSegura = Number(item.quantidade_atual) || 0;
              const unidade = item.unidade_medida || item.unidade || '';

              return (
                <TableRow key={item.id || `${item.produto_id}-${item.id}`} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {item.produto_nome}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.categoria}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600}>
                      {formatarQuantidade(quantidadeSegura)} {unidade}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {item.data_validade ? (
                      <Typography variant="body2">
                        {formatarData(item.data_validade)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Sem validade
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={getStatusText(item.status_estoque, item.dias_para_vencimento)}
                      color={getStatusColor(item.status_estoque) as any}
                      size="small"
                    />
                  </TableCell>
                  {showActions && (
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {onViewDetails && (
                          <Tooltip title="Ver Detalhes">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => onViewDetails(item)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onAddStock && (
                          <Tooltip title="Entrada">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => onAddStock(item)}
                            >
                              <AddIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onRemoveStock && (
                          <Tooltip title={quantidadeSegura <= 0 ? "Sem estoque disponível" : "Saída"}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => onRemoveStock(item)}
                                disabled={quantidadeSegura <= 0}
                              >
                                <RemoveIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {onAdjustStock && (
                          <Tooltip title="Ajustar estoque (conferência)">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => onAdjustStock(item)}
                            >
                              <AssessmentIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {showPagination && onPageChange && onRowsPerPageChange && (
        <TablePagination
          component="div"
          count={totalCount || items.length}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          labelRowsPerPage="Itens por página:"
        />
      )}

      {/* Tenant Info Footer */}
      {currentTenant && (
        <Box sx={{ 
          p: 1, 
          bgcolor: 'background.default', 
          borderTop: '1px solid', 
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1
        }}>
          <Typography variant="caption" color="text.secondary">
            Dados da organização:
          </Typography>
          <Chip 
            label={currentTenant.name} 
            size="small" 
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: '20px' }}
          />
        </Box>
      )}
    </Paper>
  );
};

export default TenantInventoryList;