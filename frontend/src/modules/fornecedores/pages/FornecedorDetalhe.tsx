import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { OperationalDataTable } from "../../../components/data-display/OperationalDataTable";
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Alert,
  CircularProgress, IconButton, Stack, Tooltip, Menu, MenuItem
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
import StatusIndicator from "../../../components/StatusIndicator";

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
const contratoColumnHelper = createColumnHelper<Contrato>();

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
  
  const handleNovoContrato = useCallback(() => navigate(`/contratos/novo?fornecedor_id=${id}`), [navigate, id]);
  const handleVerContrato = useCallback((contratoId: number) => navigate(`/contratos/${contratoId}?from=fornecedor&fornecedor_id=${id}`), [navigate, id]);
  const handleEditarFornecedor = useCallback(() => navigate(`/fornecedores?edit=${id}`), [navigate, id]);
  const handleVerItens = useCallback(() => navigate(`/fornecedores/${id}/itens`), [navigate, id]);

  const contratoColumns = useMemo(() => [
    contratoColumnHelper.accessor('numero', {
      header: 'Número',
      cell: (info) => (
        <Typography variant="body2" fontWeight={600}>
          {info.getValue()}
        </Typography>
      ),
    }),
    contratoColumnHelper.accessor((row) => `${formatarData(row.data_inicio)} a ${formatarData(row.data_fim)}`, {
      id: 'vigencia',
      header: 'Vigência',
      cell: (info) => <Typography variant="body2">{info.getValue()}</Typography>,
    }),
    contratoColumnHelper.accessor('valor_total_contrato', {
      header: 'Valor Total',
      cell: (info) => <Typography variant="body2">{formatarMoeda(Number(info.getValue()) || 0)}</Typography>,
    }),
    contratoColumnHelper.display({
      id: 'status',
      header: 'Status',
      cell: (info) => {
        const status = getStatusContrato(info.row.original);
        return (
          <StatusIndicator status={status.status} text={status.status} size="small" />
        );
      },
    }),
    contratoColumnHelper.display({
      id: 'acoes',
      header: 'Ações',
      cell: (info) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="Ver Detalhes">
            <IconButton size="small" onClick={() => handleVerContrato(info.row.original.id)} sx={{ p: 0.5 }}>
              <VisibilityIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    }),
  ], [handleVerContrato]);

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: 'center', minHeight: '80vh', bgcolor: 'background.default' }}><CircularProgress size={60} /></Box>;
  if (error) return <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}><PageContainer><Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={carregarDados}>Tentar Novamente</Button></CardContent></Card></PageContainer></Box>;
  if (!fornecedor) return <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', p: 3 }}><Alert severity="error">Fornecedor não encontrado</Alert></Box>;

  return (
    <Box sx={{ height: 'calc(100vh - var(--app-top-offset, 0px))', bgcolor: 'background.default', overflow: 'hidden' }}>
      <PageContainer fullHeight>
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
          topAction={
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchorEl(e.currentTarget)}
              sx={{
                width: 36,
                height: 36,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                color: 'text.secondary',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          }
        />

        <Card sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid', borderColor: 'divider', mb: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1f1f1f' : 'background.paper' }}>
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

        {/* Tabela de Contratos */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <OperationalDataTable
            data={contratos}
            columns={contratoColumns}
            loading={loading}
            searchPlaceholder="Buscar contratos..."
            emptyMessage="Nenhum contrato encontrado"
            rightToolbarActions={
              <Button
                startIcon={<AddIcon />}
                onClick={handleNovoContrato}
                variant="contained"
                color="add"
                size="small"
                sx={{ minHeight: 28, fontSize: '0.75rem', borderRadius: 1, textTransform: 'none' }}
              >
                Novo Contrato
              </Button>
            }
          />
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
