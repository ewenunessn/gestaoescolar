import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  Business,
  Phone,
  Email,
  LocationOn,
  Description,
  Visibility,
  Edit,
} from "@mui/icons-material";
import { buscarFornecedor } from "../services/fornecedores";
import { listarContratos } from "../services/contratos";
// import { listarAditivosContrato } from "../services/aditivosContratos"; // Removido - módulo de aditivos excluído

interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  ativo: boolean;
}

interface Contrato {
  id: number;
  numero: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  valor_total_contrato?: number;
}

export default function FornecedorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  // const [aditivosMap, setAditivosMap] = useState<Map<number, any[]>>(new Map()); // Removido - módulo de aditivos excluído
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Carregar dados do fornecedor
      const fornecedorData = await buscarFornecedor(Number(id));
      setFornecedor(fornecedorData);
      
      // Carregar contratos do fornecedor
      const contratosData = await listarContratos();
      const contratosFornecedor = contratosData.filter(
        (contrato: Contrato) => contrato.fornecedor_id === Number(id)
      );
      setContratos(contratosFornecedor);

      // Carregar aditivos removido - módulo de aditivos excluído do sistema
      
    } catch (error: any) {
      setError(error.message || "Erro ao carregar dados do fornecedor");
    } finally {
      setLoading(false);
    }
  };

  const handleNovoContrato = () => {
    navigate(`/contratos/novo?fornecedor_id=${id}`);
  };

  const handleVerContrato = (contratoId: number) => {
    navigate(`/contratos/${contratoId}`);
  };

  const handleEditarFornecedor = () => {
    navigate(`/fornecedores?edit=${id}`);
  };



  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  // Funções para calcular status - aditivos removidos do sistema
  const getStatusContrato = (contrato: Contrato) => {
    if (!contrato) return { status: "Desconhecido", color: "default" };

    const hoje = new Date();
    const inicio = new Date(contrato.data_inicio);
    const dataFim = new Date(contrato.data_fim);

    if (!contrato.ativo) return { status: "Inativo", color: "error" };
    if (hoje < inicio) return { status: "Pendente", color: "warning" };
    if (hoje > dataFim) return { status: "Expirado", color: "error" };
    return { status: "Ativo", color: "success" };
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!fornecedor) {
    return <Alert severity="error">Fornecedor não encontrado</Alert>;
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/fornecedores")}
          sx={{ mb: 2 }}
        >
          Voltar para Fornecedores
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>

          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEditarFornecedor}
          >
            Editar Fornecedor
          </Button>
        </Box>
      </Box>

      {/* Informações do Fornecedor */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Business sx={{ mr: 1, fontSize: 32, color: "primary.main" }} />
            <Typography variant="h4">
              {fornecedor.nome}
            </Typography>
            <Chip
              label={fornecedor.ativo ? "Ativo" : "Inativo"}
              color={fornecedor.ativo ? "success" : "error"}
              sx={{ ml: 2 }}
            />
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  CNPJ
                </Typography>
                <Typography variant="body1">
                  {fornecedor.cnpj}
                </Typography>
              </Box>

              {fornecedor.telefone && (
                <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                  <Phone sx={{ mr: 1, fontSize: 20, color: "text.secondary" }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Telefone
                    </Typography>
                    <Typography variant="body1">
                      {fornecedor.telefone}
                    </Typography>
                  </Box>
                </Box>
              )}

              {fornecedor.email && (
                <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                  <Email sx={{ mr: 1, fontSize: 20, color: "text.secondary" }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      E-mail
                    </Typography>
                    <Typography variant="body1">
                      {fornecedor.email}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              {fornecedor.endereco && (
                <Box sx={{ mb: 2, display: "flex", alignItems: "flex-start" }}>
                  <LocationOn sx={{ mr: 1, fontSize: 20, color: "text.secondary", mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Endereço
                    </Typography>
                    <Typography variant="body1">
                      {fornecedor.endereco}
                    </Typography>
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" color="primary">
                  {contratos.length} contrato(s) cadastrado(s)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Valor total: {formatarMoeda(
                    contratos.reduce((total, contrato) => 
                      total + (contrato.valor_total_contrato || 0), 0
                    )
                  )}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Contratos */}
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center" }}>
              <Description sx={{ mr: 1 }} />
              Contratos ({contratos.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleNovoContrato}
            >
              Novo Contrato
            </Button>
          </Box>

          {contratos.length === 0 ? (
            <Alert severity="info">
              Este fornecedor ainda não possui contratos cadastrados.
              <br />
              Clique em "Novo Contrato" para cadastrar o primeiro contrato.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell>Valor Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contratos.map((contrato) => {
                    const status = getStatusContrato(contrato);
                    return (
                      <TableRow key={contrato.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {contrato.numero}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatarData(contrato.data_inicio)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            até {formatarData(contrato.data_fim)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {contrato.valor_total_contrato 
                            ? formatarMoeda(contrato.valor_total_contrato)
                            : "N/A"
                          }
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={status.status}
                            color={status.color as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleVerContrato(contrato.id)}
                            title="Ver Detalhes"
                          >
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}