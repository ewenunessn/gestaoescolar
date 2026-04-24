import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import CompactPagination from "../../../components/CompactPagination";
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Alert,
  CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Stack, Tooltip, Menu, MenuItem
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  MenuBook as MenuBookIcon,
  ReceiptLong as ReceiptLongIcon,
  MonetizationOn as MonetizationOnIcon,
  Inventory as InventoryIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { fornecedorService } from "../../../services/fornecedores";
import { listarContratos } from "../../../services/contratos";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";
import { usePageTitle } from "../../../contexts/PageTitleContext";

// --- Interfaces ---
interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  email?: string;
  ativo: boolean;
}

interface Contrato {
  id: number;
  numero: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  fornecedor_id: number;
  valor_total_contrato?: number;
}

// --- Funções Utilitárias ---
const formatarData = (data: string) => new Date(data).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
const formatarMoeda = (valor: number = 0) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

const getStatusContrato = (contrato: Contrato) => {
  if (!contrato) return { status: "Desconhecido", color: "default" as const };
  const hoje = new Date();
  const inicio = new Date(contrato.data_inicio);
  const dataFim = new Date(contrato.data_fim);
  if (!contrato.ativo) return { status: "Inativo", color: "default" as const };
  if (hoje < inicio) return { status: "Pendente", color: "warning" as const };
  if (hoje > dataFim) return { status: "Expirado", color: "error" as const };
  return { status: "Ativo", color: "success" as const };
};

// --- Subcomponentes de UI ---
interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const InfoItem = ({ icon, label, value }: InfoItemProps) => (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {icon}
        <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>{label}</Typography>
            <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>{value}</Typography>
        </Box>
    </Stack>
);

// --- Componente Principal ---
export default function FornecedorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = usePageTitle();
  
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado do menu de ações
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);
  
  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Atualizar título da página
  useEffect(() => {
    if (fornecedor) {
      setPageTitle(fornecedor.nome);
    }
    return () => setPageTitle('');
  }, [fornecedor, setPageTitle]);

  const carregarDados = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [fornecedorData, todosContratos] = await Promise.all([
        fornecedorService.buscarPorId(Number(id)),
        listarContratos()
      ]);
      setFornecedor(fornecedorData);
      const contratosDoFornecedor = todosContratos.filter(
        (c: Contrato) => c.fornecedor_id === Number(id)
      );
      setContratos(contratosDoFornecedor);
    } catch (err: any) {
      const errorMessage = err.message || "Erro ao carregar dados do fornecedor";
      setError(errorMessage);
      
      // Se for erro 404 (fornecedor não encontrado), redirecionar após 2 segundos
      if (err.response?.status === 404 || errorMessage.includes('não encontrado')) {
        setTimeout(() => {
          navigate('/fornecedores', { 
            state: { message: 'Fornecedor não encontrado. Pode ter sido excluído.' } 
          });
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const valorContratosVigentes = useMemo(() => 
    contratos
      .filter(c => {
        const hoje = new Date();
        const inicio = new Date(c.data_inicio);
        const fim = new Date(c.data_fim);
        return c.ativo && hoje >= inicio && hoje <= fim;
      })
      .reduce((total, contrato) => total + (Number(contrato.valor_total_contrato) || 0), 0),
    [contratos]
  );
  
  const valorContratosExpirados = useMemo(() => 
    contratos
      .filter(c => {
        const hoje = new Date();
        const fim = new Date(c.data_fim);
        return hoje > fim;
      })
      .reduce((total, contrato) => total + (Number(contrato.valor_total_contrato) || 0), 0),
    [contratos]
  );
  
  // Contratos paginados
  const paginatedContratos = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return contratos.slice(startIndex, startIndex + rowsPerPage);
  }, [contratos, page, rowsPerPage]);

  // Funções de paginação
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);
  
  const handleNovoContrato = useCallback(() => navigate(`/contratos/novo?fornecedor_id=${id}`), [navigate, id]);
  const handleVerContrato = useCallback((contratoId: number) => navigate(`/contratos/${contratoId}?from=fornecedor&fornecedor_id=${id}`), [navigate, id]);
  const handleEditarFornecedor = useCallback(() => navigate(`/fornecedores?edit=${id}`), [navigate, id]);
  const handleVerItens = useCallback(() => navigate(`/fornecedores/${id}/itens`), [navigate, id]);

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: 'center', minHeight: '80vh', bgcolor: 'background.default' }}><CircularProgress size={60} /></Box>;
  if (error) return <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}><PageContainer><Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={carregarDados}>Tentar Novamente</Button></CardContent></Card></PageContainer></Box>;
  if (!fornecedor) return <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', p: 3 }}><Alert severity="error">Fornecedor não encontrado</Alert></Box>;

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: 'background.default', overflow: 'hidden' }}>
      <PageContainer fullHeight sx={{ bgcolor: 'background.default' }}>
        {/* Seta + Breadcrumbs na mesma linha */}
        <Box sx={{ display: 'none' }}>
          <IconButton size="small" onClick={() => navigate('/fornecedores')} sx={{ mr: 0.5, p: 0.5 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <PageBreadcrumbs
            items={[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Fornecedores', path: '/fornecedores' },
              { label: fornecedor?.nome || 'Detalhes' },
            ]}
          />
        </Box>

        <PageHeader
          onBack={() => navigate('/fornecedores')}
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Fornecedores', path: '/fornecedores' },
            { label: fornecedor?.nome || 'Detalhes' },
          ]}
          title={fornecedor?.nome || 'Detalhes do Fornecedor'}
          action={
            <IconButton onClick={(e) => setMenuAnchorEl(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          }
        />

        <Card sx={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', mb: 2 }}>
          <CardContent sx={{ p: 1.5 }}>
            <Grid container spacing={2} alignItems="stretch">
              {/* Primeira coluna - Informações básicas */}
              <Grid item xs={12} md={5}>
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <InfoItem icon={<BusinessIcon fontSize="small" color="action" />} label="CNPJ" value={fornecedor.cnpj} />
                  {fornecedor.email && <InfoItem icon={<EmailIcon fontSize="small" color="action" />} label="E-mail" value={fornecedor.email} />}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Status:</Typography>
                    <Chip 
                      label={fornecedor.ativo ? "Ativo" : "Inativo"} 
                      color={fornecedor.ativo ? "success" : "error"} 
                      size="small" 
                      sx={{ height: 20, fontSize: '0.7rem', color: 'white' }} 
                    />
                  </Box>
                </Box>
              </Grid>
              
              {/* Segunda coluna - Contratos Vigentes */}
              <Grid item xs={12} md={3.5}>
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 1.5, 
                  bgcolor: 'rgba(46, 125, 50, 0.08)', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'success.light'
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500, mb: 0.5 }}>
                    Contratos Vigentes
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main" sx={{ fontSize: '1.25rem' }}>
                    {formatarMoeda(valorContratosVigentes)}
                  </Typography>
                </Box>
              </Grid>
              
              {/* Terceira coluna - Contratos Expirados */}
              <Grid item xs={12} md={3.5}>
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 1.5, 
                  bgcolor: 'rgba(211, 47, 47, 0.08)', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'error.light'
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500, mb: 0.5 }}>
                    Contratos Expirados
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main" sx={{ fontSize: '1.25rem' }}>
                    {formatarMoeda(valorContratosExpirados)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Legenda de Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
            Exibindo {contratos.length} {contratos.length === 1 ? 'resultado' : 'resultados'}
          </Typography>
          <Button 
            startIcon={<AddIcon />} 
            onClick={handleNovoContrato} 
            variant="contained" 
            color="add" 
            size="small"
          >
            Novo Contrato
          </Button>
        </Box>

        {/* Tabela de Contratos */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {contratos.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <MenuBookIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                  Nenhum contrato encontrado
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Cadastre o primeiro contrato para este fornecedor.
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={handleNovoContrato}
                  color="add"
                >
                  Novo Contrato
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1 }}>Número</TableCell>
                      <TableCell sx={{ py: 1 }}>Vigência</TableCell>
                      <TableCell sx={{ py: 1 }}>Valor Total</TableCell>
                      <TableCell sx={{ py: 1 }}>Status</TableCell>
                      <TableCell align="center" sx={{ py: 1 }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedContratos.map((contrato) => {
                      const status = getStatusContrato(contrato);
                      return (
                        <TableRow key={contrato.id} hover>
                          <TableCell sx={{ py: 1 }}>
                            <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.8125rem' }}>
                              {contrato.numero}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                              {`${formatarData(contrato.data_inicio)} a ${formatarData(contrato.data_fim)}`}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                              {formatarMoeda(contrato.valor_total_contrato)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <Chip 
                              label={status.status} 
                              color={status.color} 
                              size="small" 
                              sx={{ height: 20, fontSize: '0.7rem', color: status.color !== 'default' ? 'white' : undefined }} 
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1 }}>
                            <Tooltip title="Ver Detalhes">
                              <IconButton size="small" onClick={() => handleVerContrato(contrato.id)} sx={{ p: 0.5 }}>
                                <VisibilityIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <CompactPagination
                count={contratos.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Box>
          )}
        </Box>
      </PageContainer>

      {/* Menu de ações */}
      <Menu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={() => setMenuAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { setMenuAnchorEl(null); handleEditarFornecedor(); }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Editar Fornecedor
        </MenuItem>
        <MenuItem onClick={() => { setMenuAnchorEl(null); handleVerItens(); }}>
          <InventoryIcon fontSize="small" sx={{ mr: 1 }} />
          Ver Todos os Itens
        </MenuItem>
      </Menu>
    </Box>
  );
}
