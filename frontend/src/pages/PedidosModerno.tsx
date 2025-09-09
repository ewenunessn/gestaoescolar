import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Avatar,
  Divider,
  IconButton,
  LinearProgress,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Menu as MuiMenu,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import {
  ShoppingCart,
  LocalShipping,
  CheckCircle,
  Cancel,
  Visibility,
  FilterList,
  Search,
  Refresh,
  Business,
  Timeline,
  Close,
  Add,
  Receipt,
  MoreVert,
  Edit,
  History,
  Print,
  GetApp,
  Menu,
} from "@mui/icons-material";
import {
  pedidoModernoService,
  formatarTipoPedido,
  formatarData,
  formatarPreco,
  PedidoModerno,
} from "../services/pedidoModernoService";
import { recebimentoModernoService } from "../services/recebimentoModernoService";
import { useNavigate } from "react-router-dom";
import PedidoDetalhes from "../components/PedidoDetalhes";
import { useToast } from "../hooks/useToast";

const statusConfig = {
  PENDENTE: {
    color: "#d97706",
    bgColor: "#fef3c7",
    icon: <Timeline />,
    label: "Pendente",
  },
  CONFIRMADO: {
    color: "#2563eb",
    bgColor: "#dbeafe",
    icon: <CheckCircle />,
    label: "Confirmado",
  },
  FATURADO: {
    color: "#059669",
    bgColor: "#d1fae5",
    icon: <Receipt />,
    label: "Faturado",
  },
  ENTREGUE: {
    color: "#059669",
    bgColor: "#dcfce7",
    icon: <CheckCircle />,
    label: "Entregue",
  },
  RECEBIDO: {
    color: "#059669",
    bgColor: "#dcfce7",
    icon: <CheckCircle />,
    label: "Recebido",
  },
  CANCELADO: {
    color: "#dc2626",
    bgColor: "#fee2e2",
    icon: <Cancel />,
    label: "Cancelado",
  },
};

const PedidosModerno: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoModerno[]>([]);
  const [produtosPedido, setProdutosPedido] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filtros, setFiltros] = useState<any>({});
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [openDetalhes, setOpenDetalhes] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [pedidoParaCancelar, setPedidoParaCancelar] =
    useState<PedidoModerno | null>(null);
  const [pedidoSelecionado, setPedidoSelecionado] =
    useState<PedidoModerno | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [pedidoMenu, setPedidoMenu] = useState<PedidoModerno | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  // Função utilitária para limpar filtros vazios
  function limparFiltros(obj: any) {
    const novo: any = {};
    Object.keys(obj).forEach((k) => {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") {
        novo[k] = obj[k];
      }
    });
    return novo;
  }

  const carregarPedidos = async (page = 1, novosFiltros = filtros) => {
    setLoading(true);
    setError(null);
    try {
      const filtrosLimpos = limparFiltros({ ...novosFiltros, busca });
      const resultado = await pedidoModernoService.listarPedidos({
        page,
        limit: pagination.limit,
        ...filtrosLimpos,
      });
      setPedidos(resultado.data || []);
      setPagination(resultado.pagination || pagination);
    } catch (error: any) {
      setError(error.message || "Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  // Busca automática ao digitar
  useEffect(() => {
    const filtrosLimpos = limparFiltros({ ...filtros, busca });
    carregarPedidos(1, filtrosLimpos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const handleVisualizarPedido = async (pedido: PedidoModerno) => {
    setPedidoSelecionado(pedido);
    try {
      const pedidoDetalhado = await pedidoModernoService.buscarPedido(
        pedido.id
      );
      setProdutosPedido(pedidoDetalhado.data.fornecedores || []);
      setOpenDetalhes(true);
    } catch (error: any) {
      setError(error.message || "Erro ao carregar detalhes do pedido");
    }
  };

  const abrirDialogCancelamento = (pedido: PedidoModerno) => {
    setPedidoParaCancelar(pedido);
    setOpenCancelDialog(true);
  };

  const fecharDialogCancelamento = () => {
    setPedidoParaCancelar(null);
    setJustificativa("");
    setOpenCancelDialog(false);
  };

  const handleConfirmarCancelamento = async () => {
    if (!pedidoParaCancelar || !justificativa) return;
    try {
      await pedidoModernoService.cancelarPedido(
        pedidoParaCancelar.id,
        justificativa
      );
      toast.success(
        "Pedido cancelado",
        `O pedido ${pedidoParaCancelar.numero_pedido} foi cancelado com sucesso.`,
        5000
      );
      fecharDialogCancelamento();
      carregarPedidos(pagination.page);
    } catch (err: any) {
      toast.error(
        "Erro ao cancelar",
        err.message || "Não foi possível cancelar o pedido. Tente novamente.",
        6000
      );
    }
  };

  const handleAplicarFiltros = () => {
    const filtrosLimpos = limparFiltros({ ...filtros, busca });
    carregarPedidos(1, filtrosLimpos);
    setMostrarFiltros(false);
  };

  const handleLimparFiltros = () => {
    setFiltros({});
    setBusca("");
    carregarPedidos(1, {});
    setMostrarFiltros(false);
  };

  // Funções do menu de ações
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, pedido: PedidoModerno) => {
    setMenuAnchor(event.currentTarget);
    setPedidoMenu(pedido);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setPedidoMenu(null);
  };

  const handleEditarPedido = () => {
    if (pedidoMenu) {
      toast.info("Funcionalidade em desenvolvimento", `Editar pedido ${pedidoMenu.numero_pedido}`);
    }
    handleCloseMenu();
  };

  const handleVerHistorico = () => {
    if (pedidoMenu) {
      toast.info("Funcionalidade em desenvolvimento", `Ver histórico do pedido ${pedidoMenu.numero_pedido}`);
    }
    handleCloseMenu();
  };

  const handleImprimirPedido = () => {
    if (pedidoMenu) {
      toast.info("Funcionalidade em desenvolvimento", `Imprimir pedido ${pedidoMenu.numero_pedido}`);
    }
    handleCloseMenu();
  };

  const handleExportarPedido = () => {
    if (pedidoMenu) {
      toast.info("Funcionalidade em desenvolvimento", `Exportar pedido ${pedidoMenu.numero_pedido}`);
    }
    handleCloseMenu();
  };

  const estatisticas = {
    total: pedidos.length,
    pendentes: pedidos.filter((p) => p.status === "PENDENTE").length,
    // emRecebimento removido
    finalizados: pedidos.filter((p) =>
      ["ENTREGUE", "RECEBIDO"].includes(p.status)
    ).length,
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f9fafb" }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <Box
          sx={{
            maxWidth: "1280px",
            mx: "auto",
            px: { xs: 2, sm: 3, lg: 4 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: "64px",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ShoppingCart sx={{ color: "#4f46e5", fontSize: 24 }} />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: "bold",
                  color: "#1f2937",
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                Meus Pedidos
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<ShoppingCart />}
                onClick={() => navigate("/catalogo")}
                sx={{
                  bgcolor: "#4f46e5",
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  textTransform: "none",
                  borderRadius: "8px",
                  "&:hover": { bgcolor: "#4338ca" },
                }}
              >
                Fazer Pedido
              </Button>
              <IconButton onClick={() => carregarPedidos(pagination.page)}>
                <Refresh />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: "1280px",
          mx: "auto",
          px: { xs: 2, sm: 3, lg: 4 },
          py: 4,
        }}
      >
        {/* Mensagens */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert
            severity="success"
            sx={{ mb: 3 }}
            onClose={() => setSuccessMessage(null)}
          >
            {successMessage}
          </Alert>
        )}

        {/* Estatísticas */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
                }}
              />
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: "#4f46e5",
                      width: 48,
                      height: 48,
                      mr: 2,
                    }}
                  >
                    <ShoppingCart />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="#1f2937">
                      {estatisticas.total}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#6b7280",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Total de Pedidos
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #d97706, #f59e0b)",
                }}
              />
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: "#d97706",
                      width: 48,
                      height: 48,
                      mr: 2,
                    }}
                  >
                    <Timeline />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="#1f2937">
                      {estatisticas.pendentes}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#6b7280",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Pendentes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card "Em Andamento" removido */}

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #059669, #10b981)",
                }}
              />
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: "#059669",
                      width: 48,
                      height: 48,
                      mr: 2,
                    }}
                  >
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="#1f2937">
                      {estatisticas.finalizados}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#6b7280",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Finalizados
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filtros e Busca */}
        <Card
          sx={{
            mb: 4,
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <TextField
                placeholder="Buscar pedidos..."
                variant="outlined"
                size="small"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                sx={{
                  flexGrow: 1,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "#9ca3af" }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                sx={{
                  borderColor: "#4f46e5",
                  color: "#4f46e5",
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  textTransform: "none",
                  borderRadius: "8px",
                  "&:hover": {
                    borderColor: "#4338ca",
                    bgcolor: "#f8fafc",
                  },
                }}
              >
                Filtros
              </Button>
            </Box>

            {mostrarFiltros && (
              <Box>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={filtros.status || ""}
                        label="Status"
                        onChange={(e) =>
                          setFiltros({ ...filtros, status: e.target.value })
                        }
                        sx={{ borderRadius: "8px" }}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        {Object.entries(statusConfig).map(
                          ([status, config]) => (
                            <MenuItem key={status} value={status}>
                              {config.label}
                            </MenuItem>
                          )
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tipo</InputLabel>
                      <Select
                        value={filtros.tipo_pedido || ""}
                        label="Tipo"
                        onChange={(e) =>
                          setFiltros({
                            ...filtros,
                            tipo_pedido: e.target.value,
                          })
                        }
                        sx={{ borderRadius: "8px" }}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="SELECIONADO">Selecionado</MenuItem>
                        <MenuItem value="COMPLETO">Completo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Data Início"
                      type="date"
                      value={filtros.data_inicio || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, data_inicio: e.target.value })
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Data Fim"
                      type="date"
                      value={filtros.data_fim || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, data_fim: e.target.value })
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                        },
                      }}
                    />
                  </Grid>
                </Grid>
                <Box display="flex" gap={2} mt={3}>
                  <Button
                    variant="contained"
                    onClick={handleAplicarFiltros}
                    sx={{
                      bgcolor: "#4f46e5",
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      textTransform: "none",
                      borderRadius: "8px",
                      "&:hover": { bgcolor: "#4338ca" },
                    }}
                  >
                    Aplicar Filtros
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleLimparFiltros}
                    sx={{
                      borderColor: "#6b7280",
                      color: "#6b7280",
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      textTransform: "none",
                      borderRadius: "8px",
                      "&:hover": {
                        borderColor: "#4b5563",
                        bgcolor: "#f9fafb",
                      },
                    }}
                  >
                    Limpar
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && <LinearProgress sx={{ mb: 3, borderRadius: "4px" }} />}
        {/* Lista de Pedidos em Tabela */}
        {!loading && pedidos.length > 0 && (
          <Card
            sx={{
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              overflow: "hidden",
              mb: 4,
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        color: "#374151",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Número do Pedido
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        color: "#374151",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Tipo
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        color: "#374151",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        color: "#374151",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Itens
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        color: "#374151",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Valor Total
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        color: "#374151",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Data
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        color: "#374151",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedidos.map((pedido) => {
                    const statusInfo =
                      statusConfig[pedido.status as keyof typeof statusConfig];
                    return (
                      <TableRow
                        key={pedido.id}
                        sx={{
                          "&:hover": {
                            bgcolor: "#f9fafb",
                            transform: "translateY(-1px)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          },
                          borderLeft: `4px solid ${statusInfo?.color || "#6b7280"}`,
                          transition: "all 0.2s ease-in-out",
                        }}
                      >
                        {/* Número do Pedido */}
                        <TableCell>
                          <Box>
                            <Typography
                              variant="body1"
                              fontWeight="bold"
                              sx={{
                                color: "#1f2937",
                                fontFamily:
                                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                              }}
                            >
                              {pedido.numero_pedido}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#6b7280",
                                fontFamily:
                                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                              }}
                            >
                              ID: {pedido.id}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        {/* Tipo */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#374151",
                              fontFamily:
                                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            }}
                          >
                            {formatarTipoPedido(pedido.tipo_pedido)}
                          </Typography>
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell>
                          <Chip
                            label={statusInfo?.label || pedido.status}
                            size="small"
                            sx={{
                              bgcolor: statusInfo?.bgColor || "#f3f4f6",
                              color: statusInfo?.color || "#6b7280",
                              fontWeight: 500,
                              fontFamily:
                                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            }}
                          />
                        </TableCell>
                        
                        {/* Itens */}
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Business
                              sx={{ fontSize: 16, mr: 1, color: "#9ca3af" }}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#374151",
                                fontFamily:
                                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                              }}
                            >
                              {pedido.total_itens} itens
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        {/* Valor Total */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#4f46e5",
                              fontWeight: "bold",
                              fontFamily:
                                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            }}
                          >
                            {formatarPreco(pedido.valor_total)}
                          </Typography>
                        </TableCell>
                        
                        {/* Data */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#374151",
                              fontFamily:
                                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            }}
                          >
                            {formatarData(pedido.data_criacao)}
                          </Typography>
                        </TableCell>
                        
                        {/* Ações */}
                        <TableCell>
                          <Box display="flex" gap={1} alignItems="center">
                            <Tooltip title="Ver Detalhes">
                              <IconButton
                                size="small"
                                onClick={() => handleVisualizarPedido(pedido)}
                                sx={{
                                  color: "#4f46e5",
                                  "&:hover": { bgcolor: "#eef2ff" },
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Mais opções">
                              <IconButton
                                size="small"
                                onClick={(e) => handleOpenMenu(e, pedido)}
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": { bgcolor: "#f3f4f6" },
                                }}
                              >
                                <MoreVert fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            {pedido.status === "PENDENTE" && (
                              <Tooltip title="Cancelar Pedido">
                                <IconButton
                                  size="small"
                                  onClick={() => abrirDialogCancelamento(pedido)}
                                  sx={{
                                    color: "#dc2626",
                                    "&:hover": { bgcolor: "#fef2f2" },
                                  }}
                                >
                                  <Cancel fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
        {/* Paginação */}
        {!loading && pedidos.length > 0 && pagination.totalPages > 1 && (
          <Card
            sx={{
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              mb: 3,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                flexDirection={{ xs: "column", sm: "row" }}
                gap={2}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "#6b7280",
                    fontFamily:
                      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  Mostrando {(pagination.page - 1) * pagination.limit + 1} a{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                  de {pagination.total} pedidos
                </Typography>
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!pagination.hasPrev}
                    onClick={() => carregarPedidos(pagination.page - 1)}
                    sx={{
                      borderRadius: "8px",
                      textTransform: "none",
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    }}
                  >
                    Anterior
                  </Button>
                  <Typography
                    variant="body2"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      px: 2,
                      color: "#374151",
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    }}
                  >
                    Página {pagination.page} de {pagination.totalPages}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!pagination.hasNext}
                    onClick={() => carregarPedidos(pagination.page + 1)}
                    sx={{
                      borderRadius: "8px",
                      textTransform: "none",
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    }}
                  >
                    Próxima
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Mensagem quando não há pedidos */}
        {!loading && pedidos.length === 0 && (
          <Card
            sx={{
              textAlign: "center",
              py: 8,
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            }}
          >
            <CardContent>
              <ShoppingCart sx={{ fontSize: 64, color: "#d1d5db", mb: 2 }} />
              <Typography
                variant="h6"
                sx={{
                  color: "#6b7280",
                  mb: 1,
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                Nenhum pedido encontrado
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#9ca3af",
                  mb: 3,
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                Comece fazendo seu primeiro pedido
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate("/catalogo")}
                sx={{
                  bgcolor: "#4f46e5",
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  textTransform: "none",
                  borderRadius: "8px",
                  "&:hover": { bgcolor: "#4338ca" },
                }}
              >
                Fazer Pedido
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Menu de Ações */}
      <MuiMenu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
            minWidth: "180px",
          },
        }}
      >
        <MenuItem onClick={handleEditarPedido}>
          <ListItemIcon>
            <Edit fontSize="small" sx={{ color: "#4f46e5" }} />
          </ListItemIcon>
          <ListItemText
            primary="Editar Pedido"
            sx={{
              "& .MuiListItemText-primary": {
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: "14px",
                color: "#374151",
              },
            }}
          />
        </MenuItem>
        
        <MenuItem onClick={handleVerHistorico}>
          <ListItemIcon>
            <History fontSize="small" sx={{ color: "#059669" }} />
          </ListItemIcon>
          <ListItemText
            primary="Ver Histórico"
            sx={{
              "& .MuiListItemText-primary": {
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: "14px",
                color: "#374151",
              },
            }}
          />
        </MenuItem>
        
        <MenuItem onClick={handleImprimirPedido}>
          <ListItemIcon>
            <Print fontSize="small" sx={{ color: "#d97706" }} />
          </ListItemIcon>
          <ListItemText
            primary="Imprimir"
            sx={{
              "& .MuiListItemText-primary": {
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: "14px",
                color: "#374151",
              },
            }}
          />
        </MenuItem>
        
        <MenuItem onClick={handleExportarPedido}>
          <ListItemIcon>
            <GetApp fontSize="small" sx={{ color: "#2563eb" }} />
          </ListItemIcon>
          <ListItemText
            primary="Exportar"
            sx={{
              "& .MuiListItemText-primary": {
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: "14px",
                color: "#374151",
              },
            }}
          />
        </MenuItem>
      </MuiMenu>

      {/* Componente de Detalhes do Pedido */}
      <PedidoDetalhes
        open={openDetalhes}
        onClose={() => setOpenDetalhes(false)}
        pedido={pedidoSelecionado}
        produtosPedido={produtosPedido}
        onPedidoAtualizado={() => {
          carregarPedidos(pagination.page);
          if (pedidoSelecionado) {
            handleVisualizarPedido(pedidoSelecionado);
          }
        }}
        onError={() => {}} // Usando toast agora
        onSuccess={() => {}} // Usando toast agora
        loading={loading}
      />
      {/* Dialog de Cancelamento */}
      <Dialog open={openCancelDialog} onClose={fecharDialogCancelamento}>
        <DialogTitle>
          <Typography
            sx={{
              fontFamily:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            Cancelar Pedido {pedidoParaCancelar?.numero_pedido}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Motivo do cancelamento"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={fecharDialogCancelamento}
            sx={{
              fontFamily:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              textTransform: "none",
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarCancelamento}
            variant="contained"
            disabled={!justificativa.trim()}
            sx={{
              bgcolor: "#dc2626",
              fontFamily:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              textTransform: "none",
              "&:hover": { bgcolor: "#b91c1c" },
            }}
          >
            Confirmar Cancelamento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PedidosModerno;