import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Alert,
  CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Stack, Tooltip
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
} from "@mui/icons-material";
import { buscarFornecedor } from "../services/fornecedores";
import { listarContratos } from "../services/contratos";
import PageBreadcrumbs from '../components/PageBreadcrumbs';

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
const PageHeader = ({ onEdit, onVerItens }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Detalhes do Fornecedor
            </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
            <Button variant="outlined" startIcon={<InventoryIcon />} onClick={onVerItens}>
                Ver Todos os Itens
            </Button>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={onEdit}>
                Editar Fornecedor
            </Button>
        </Stack>
    </Box>
);

const InfoItem = ({ icon, label, value }) => (
    <Stack direction="row" alignItems="center" spacing={1.5}>
        {icon}
        <Box>
            <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
            <Typography variant="body2" fontWeight={500}>{value}</Typography>
        </Box>
    </Stack>
);

// --- Componente Principal ---
export default function FornecedorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [fornecedorData, todosContratos] = await Promise.all([
        buscarFornecedor(Number(id)),
        listarContratos()
      ]);
      setFornecedor(fornecedorData);
      const contratosDoFornecedor = todosContratos.filter(
        (c: Contrato) => c.fornecedor_id === Number(id)
      );
      setContratos(contratosDoFornecedor);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados do fornecedor");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const valorTotalContratos = useMemo(() => 
    contratos.reduce((total, contrato) => total + (Number(contrato.valor_total_contrato) || 0), 0),
    [contratos]
  );
  
  const handleNovoContrato = useCallback(() => navigate(`/contratos/novo?fornecedor_id=${id}`), [navigate, id]);
  const handleVerContrato = useCallback((contratoId: number) => navigate(`/contratos/${contratoId}?from=fornecedor&fornecedor_id=${id}`), [navigate, id]);
  const handleEditarFornecedor = useCallback(() => navigate(`/fornecedores?edit=${id}`), [navigate, id]);
  const handleVerItens = useCallback(() => navigate(`/fornecedores/${id}/itens`), [navigate, id]);

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: 'center', minHeight: '80vh' }}><CircularProgress size={60} /></Box>;
  if (error) return <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}><Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={carregarDados}>Tentar Novamente</Button></CardContent></Card></Box>;
  if (!fornecedor) return <Alert severity="error">Fornecedor não encontrado</Alert>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <PageBreadcrumbs 
          items={[
            { label: 'Fornecedores', path: '/fornecedores', icon: <BusinessIcon fontSize="small" /> },
            { label: fornecedor?.nome || 'Detalhes do Fornecedor' }
          ]}
        />
        <PageHeader onEdit={handleEditarFornecedor} onVerItens={handleVerItens} />

        <Grid container spacing={4}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                  <BusinessIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="600">{fornecedor.nome}</Typography>
                    <Chip label={fornecedor.ativo ? "Ativo" : "Inativo"} color={fornecedor.ativo ? "success" : "error"} size="small" sx={{ mt: 0.5 }} />
                  </Box>
                </Stack>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}><InfoItem icon={<ReceiptLongIcon color="action" />} label="CNPJ" value={fornecedor.cnpj} /></Grid>
                  {fornecedor.email && <Grid item xs={12} md={6}><InfoItem icon={<EmailIcon color="action" />} label="E-mail" value={fornecedor.email} /></Grid>}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Stack spacing={4} height="100%">
              <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', flex: 1 }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                  <DescriptionIcon color="primary" sx={{ fontSize: 40, mb: 1 }}/>
                  <Typography variant="h4" fontWeight="bold">{contratos.length}</Typography>
                  <Typography color="text.secondary">Contrato(s) Cadastrado(s)</Typography>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', flex: 1 }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                  <MonetizationOnIcon color="primary" sx={{ fontSize: 40, mb: 1 }}/>
                  <Typography variant="h4" fontWeight="bold">{formatarMoeda(valorTotalContratos)}</Typography>
                  <Typography color="text.secondary">em Valor Total de Contratos</Typography>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>

        <Paper sx={{ mt: 4, width: '100%', overflow: 'hidden', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="600">Contratos</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleNovoContrato} color="success">
              Novo Contrato
            </Button>
          </Box>
          {contratos.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
                <MenuBookIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhum contrato encontrado</Typography>
                <Typography variant="body2" color="text.secondary">Cadastre o primeiro contrato para este fornecedor.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead><TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Número</TableCell><TableCell sx={{ fontWeight: 600 }}>Vigência</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Valor Total</TableCell><TableCell sx={{ fontWeight: 600 }}>Status</TableCell><TableCell align="center" sx={{ fontWeight: 600 }}>Ações</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {contratos.map((contrato) => {
                    const status = getStatusContrato(contrato);
                    return (
                      <TableRow key={contrato.id} hover>
                        <TableCell><Typography variant="body2" fontWeight="600">{contrato.numero}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{`${formatarData(contrato.data_inicio)} a ${formatarData(contrato.data_fim)}`}</Typography></TableCell>
                        <TableCell>{formatarMoeda(contrato.valor_total_contrato)}</TableCell>
                        <TableCell><Chip label={status.status} color={status.color} size="small" variant="outlined" /></TableCell>
                        <TableCell align="center">
                          <Tooltip title="Ver Detalhes do Contrato"><IconButton size="small" onClick={() => handleVerContrato(contrato.id)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </Box>
  );
}