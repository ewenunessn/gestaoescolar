import React, { useState, useEffect, useMemo, useCallback } from "react";
import StatusIndicator from "../components/StatusIndicator";
import PageHeader from "../components/PageHeader";
import PageContainer from "../components/PageContainer";
import TableFilter, { FilterField } from "../components/TableFilter";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  IconButton,
  Chip,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Menu,
  Collapse,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  MenuBook,
  MoreVert,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import CompactPagination from '../components/CompactPagination';
import { useNavigate, useSearchParams } from "react-router-dom";
import { listarContratos } from "../services/contratos";
import { listarFornecedores } from "../services/fornecedores";

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
  const [searchParams] = useSearchParams();
  const fornecedorIdParam = searchParams.get('fornecedor_id');

  // Estados principais
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de filtros - NOVO SISTEMA
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({
    fornecedor: fornecedorIdParam ? Number(fornecedorIdParam) : undefined
  });

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Carregar dados
  const loadContratos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [contratosData, fornecedoresData] = await Promise.all([
        listarContratos(),
        listarFornecedores(),
      ]);
      setContratos(Array.isArray(contratosData) ? contratosData : []);
      setFornecedores(Array.isArray(fornecedoresData) ? fornecedoresData : []);
    } catch (err) {
      setError("Erro ao carregar contratos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContratos();
  }, [loadContratos]);

  // Mapa de fornecedores para performance
  const fornecedorMap = useMemo(() => new Map(fornecedores.map(f => [f.id, f.nome])), [fornecedores]);

  // Definir campos de filtro
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'select',
      label: 'Fornecedor',
      key: 'fornecedor',
      options: fornecedores.map(f => ({ value: f.id.toString(), label: f.nome })),
    },
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'vigente', label: 'Vigente' },
        { value: 'vencido', label: 'Vencido' },
        { value: 'suspenso', label: 'Suspenso' },
      ],
    },
  ], [fornecedores]);

  // Funções de status e data
  const getStatusContrato = useCallback((contrato: Contrato) => {
    if (!contrato.ativo) return { status: "suspenso", color: "default" as const };
    const hoje = new Date();
    const fim = new Date(contrato.data_fim);
    if (hoje > fim) return { status: "vencido", color: "error" as const };
    return { status: "vigente", color: "success" as const };
  }, []);

  // Filtrar e ordenar contratos
  const filteredContratos = useMemo(() => {
    return contratos.filter(contrato => {
      // Busca por palavra-chave
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const fornecedorNome = fornecedorMap.get(contrato.fornecedor_id)?.toLowerCase() || "";
        if (!contrato.numero.toLowerCase().includes(searchLower) && !fornecedorNome.includes(searchLower)) {
          return false;
        }
      }

      // Filtro de fornecedor
      if (filters.fornecedor && contrato.fornecedor_id !== Number(filters.fornecedor)) {
        return false;
      }

      // Filtro de status
      if (filters.status) {
        const statusInfo = getStatusContrato(contrato);
        if (statusInfo.status !== filters.status) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => a.numero.localeCompare(b.numero));
  }, [contratos, filters, fornecedorMap, getStatusContrato]);

  // Contratos paginados
  const paginatedContratos = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredContratos.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredContratos, page, rowsPerPage]);

  // Legenda de status
  const statusLegend = useMemo(() => {
    const statusCounts = filteredContratos.reduce((acc, contrato) => {
      const statusInfo = getStatusContrato(contrato);
      const status = statusInfo.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { status: 'vigente', label: 'VIGENTE', count: statusCounts.vigente || 0 },
      { status: 'vencido', label: 'VENCIDO', count: statusCounts.vencido || 0 },
      { status: 'suspenso', label: 'SUSPENSO', count: statusCounts.suspenso || 0 }
    ];
  }, [filteredContratos, getStatusContrato]);

  // Funções de paginação
  const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);
  const formatarData = (data: string) => new Date(data).toLocaleDateString('pt-BR');
  const formatarValor = (valor?: number) => `R$ ${(Number(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      <PageContainer fullHeight>
        <PageHeader 
          title="Contratos"
        />
        
        <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar por número ou fornecedor..."
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
              <Button startIcon={<AddIcon />} onClick={() => navigate("/contratos/novo")} variant="contained" color="add" size="small">Novo Contrato</Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small"><MoreVert /></IconButton>
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
            Exibindo {filteredContratos.length} {filteredContratos.length === 1 ? 'resultado' : 'resultados'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {statusLegend.map((item) => (
              <Box key={item.status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusIndicator status={item.status} size="small" />
                <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {item.label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                  {item.count}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadContratos}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredContratos.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><MenuBook sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhum contrato encontrado</Typography></CardContent></Card>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ flex: 1, minHeight: 0 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
                    <TableCell align="center">Fornecedor</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Vigência</TableCell>
                    <TableCell align="center">Valor Total</TableCell>
                    <TableCell align="center" width="80">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedContratos.map((contrato) => {
                    const status = getStatusContrato(contrato);
                    return (
                      <TableRow key={contrato.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StatusIndicator status={getStatusContrato(contrato).status} size="small" />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{contrato.numero}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center"><Typography variant="body2" color="text.secondary">{fornecedorMap.get(contrato.fornecedor_id) || "N/A"}</Typography></TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={contrato.status ? contrato.status.charAt(0).toUpperCase() + contrato.status.slice(1) : 'Ativo'} 
                            size="small"
                            color={contrato.status === 'ativo' ? 'success' : contrato.status === 'suspenso' ? 'warning' : 'default'}
                            sx={{ minWidth: 80 }}
                          />
                        </TableCell>
                        <TableCell align="center"><Typography variant="body2" color="text.secondary">{`${formatarData(contrato.data_inicio)} a ${formatarData(contrato.data_fim)}`}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2" color="text.secondary">{formatarValor(contrato.valor_total_contrato)}</Typography></TableCell>

                        <TableCell align="center"><Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => navigate(`/contratos/${contrato.id}`)} color="primary"><InfoIcon fontSize="small" /></IconButton></Tooltip></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <CompactPagination count={filteredContratos.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 25, 50, 100]} />
          </Box>
        )}
        </Box>
      </PageContainer>
      
      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        <MenuItem disabled><Typography>Nenhuma ação disponível</Typography></MenuItem>
      </Menu>
    </Box>
  );
};

export default ContratosPage;