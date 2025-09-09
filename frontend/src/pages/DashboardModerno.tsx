import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  Container,
} from "@mui/material";
import {
  ShoppingCart,
  LocalShipping,
  Inventory,
  TrendingUp,
  Warning,
  CheckCircle,
  Business,
  School,
  Restaurant,
  Assignment,
  Timeline,
  AttachMoney,
  Visibility,
  Add,
  Refresh,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { listarPedidos } from "../services/pedidos";
import { listarFornecedores } from "../services/fornecedores";

const DashboardModerno: React.FC = () => {
  const [pedidosRecentes, setPedidosRecentes] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [estatisticas, setEstatisticas] = useState({
    totalPedidos: 0,
    pedidosPendentes: 0,
    // emRecebimento: 0, // removido
    finalizados: 0,
    valorTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar pedidos recentes
      const resultadoPedidos = await listarPedidos({ page: 1, limit: 10 });
      const pedidos = resultadoPedidos.pedidos || [];
      setPedidosRecentes(pedidos);

      // Carregar fornecedores
      const fornecedoresData = await listarFornecedores();
      setFornecedores(fornecedoresData.slice(0, 5)); // Top 5 fornecedores

      // Calcular estatísticas
      const stats = {
        totalPedidos: pedidos.length,
        pedidosPendentes: pedidos.filter((p: any) => p.status === "Pendente").length,
        // emRecebimento removido
        finalizados: pedidos.filter((p: any) => ["Entregue Total", "Finalizado"].includes(p.status)).length,
        valorTotal: pedidos.reduce((acc: number, p: any) => acc + (p.valor_total || 0), 0),
      };
      setEstatisticas(stats);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    "Pendente": { color: "warning", icon: <Timeline />, label: "Aguardando" },
    "Em Recebimento": { color: "info", icon: <LocalShipping />, label: "Em Recebimento" },
    "Entregue Parcial": { color: "secondary", icon: <Warning />, label: "Parcial" },
    "Entregue Total": { color: "success", icon: <CheckCircle />, label: "Completo" },
    "Finalizado": { color: "success", icon: <CheckCircle />, label: "Finalizado" },
    "Finalizado com Divergência": { color: "error", icon: <Warning />, label: "Com Divergência" },
    "Cancelado": { color: "error", icon: <Warning />, label: "Cancelado" },
  };

  const cards = [
    {
      title: "Total de Pedidos",
      value: estatisticas.totalPedidos,
      icon: <ShoppingCart />,
      color: "primary.main",
      action: () => navigate("/pedidos"),
    },
    {
      title: "Pedidos Pendentes",
      value: estatisticas.pedidosPendentes,
      icon: <Timeline />,
      color: "warning.main",
      action: () => navigate("/pedidos"),
    },
    // Card "Em Recebimento" removido
    {
      title: "Valor Total",
      value: `R$ ${estatisticas.valorTotal.toFixed(2)}`,
      icon: <AttachMoney />,
      color: "success.main",
      action: () => navigate("/pedidos"),
    },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Visão geral do sistema de alimentação escolar
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate("/pedidos")}
            >
              Novo Pedido
            </Button>
            <IconButton onClick={carregarDados} disabled={loading}>
              <Refresh />
            </IconButton>
          </Box>
        </Box>

        {/* Cards de Estatísticas */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {cards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
                onClick={card.action}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color={card.color}>
                        {card.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.title}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: card.color, width: 56, height: 56 }}>
                      {card.icon}
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Conteúdo Principal */}
        <Grid container spacing={3}>
          {/* Pedidos Recentes */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    Pedidos Recentes
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => navigate("/pedidos")}
                    endIcon={<Visibility />}
                  >
                    Ver Todos
                  </Button>
                </Box>

                {loading ? (
                  <LinearProgress />
                ) : pedidosRecentes.length === 0 ? (
                  <Alert severity="info">Nenhum pedido encontrado</Alert>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Data</TableCell>
                          <TableCell>Valor</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pedidosRecentes.slice(0, 5).map((pedido) => {
                          const statusInfo = statusConfig[pedido.status as keyof typeof statusConfig];
                          return (
                            <TableRow key={pedido.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  #{pedido.id}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {new Date(pedido.data).toLocaleDateString("pt-BR")}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold" color="primary.main">
                                  R$ {pedido.valor_total.toFixed(2)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={statusInfo?.icon}
                                  label={statusInfo?.label}
                                  color={statusInfo?.color as any}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Ver Detalhes">
                                  <IconButton
                                    size="small"
                                    onClick={() => navigate("/pedidos")}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </Tooltip>
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
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              {/* Ações Rápidas */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Ações Rápidas
                    </Typography>
                    <List dense>
                      <ListItem
                        button
                        onClick={() => navigate("/pedidos")}
                        sx={{ borderRadius: 1, mb: 1 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
                            <ShoppingCart fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Novo Pedido"
                          secondary="Criar pedido para fornecedor"
                        />
                      </ListItem>
                      <ListItem
                        button
                        onClick={() => navigate("/recebimentos")}
                        sx={{ borderRadius: 1, mb: 1 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "info.main", width: 32, height: 32 }}>
                            <LocalShipping fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Recebimentos"
                          secondary="Conferir entregas"
                        />
                      </ListItem>
                      <ListItem
                        button
                        onClick={() => navigate("/estoque")}
                        sx={{ borderRadius: 1, mb: 1 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "warning.main", width: 32, height: 32 }}>
                            <Inventory fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Estoque"
                          secondary="Consultar disponibilidade"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top Fornecedores */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Principais Fornecedores
                    </Typography>
                    {loading ? (
                      <LinearProgress />
                    ) : (
                      <List dense>
                        {fornecedores.map((fornecedor, index) => (
                          <ListItem key={fornecedor.id} sx={{ px: 0 }}>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: "secondary.main", width: 32, height: 32 }}>
                                <Business fontSize="small" />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={fornecedor.nome}
                              secondary={fornecedor.cnpj}
                            />
                            <ListItemSecondaryAction>
                              <Chip
                                label={`#${index + 1}`}
                                size="small"
                                color="primary"
                              />
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Alertas */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Alertas do Sistema
                    </Typography>
                    <List dense>
                      {estatisticas.pedidosPendentes > 0 && (
                        <ListItem sx={{ px: 0 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: "warning.main", width: 32, height: 32 }}>
                              <Warning fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Pedidos Pendentes"
                            secondary={`${estatisticas.pedidosPendentes} pedidos aguardando processamento`}
                          />
                        </ListItem>
                      )}
                      {/* Recebimentos em Andamento removido */}
                      {estatisticas.pedidosPendentes === 0 && (
                        <ListItem sx={{ px: 0 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: "success.main", width: 32, height: 32 }}>
                              <CheckCircle fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Tudo em Dia"
                            secondary="Nenhum alerta no momento"
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default DashboardModerno;