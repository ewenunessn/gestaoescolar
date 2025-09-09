import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Card,
  CardContent,
  Grid,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Chip,
  Badge,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import {
  Business,
  Description,
  ShoppingCart,
  Add,
  Remove,
  Delete,
  Inventory,
  AttachMoney,
  CheckCircle,
  Close,
  ArrowForward,
  ArrowBack,
} from "@mui/icons-material";
import {
  listarContratosFornecedor,
  listarContratoProdutos,
  criarPedido,
} from "../services/pedidos";

interface PedidoFormModernoProps {
  open: boolean;
  fornecedor: any;
  onClose: () => void;
  onPedidoRealizado: () => void;
}

const PedidoFormModerno: React.FC<PedidoFormModernoProps> = ({
  open,
  fornecedor,
  onClose,
  onPedidoRealizado,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [contratos, setContratos] = useState<any[]>([]);
  const [contratoId, setContratoId] = useState<number | null>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<{
    [produto_id: number]: { produto: any; quantidade: number };
  }>({});
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fornecedor && open) {
      console.log("🔍 Carregando contratos para fornecedor:", fornecedor);
      setActiveStep(0);
      setContratoId(null);
      setProdutos([]);
      setCarrinho({});
      setErro(null);
      
      listarContratosFornecedor(fornecedor.id)
        .then((contratos) => {
          console.log("✅ Contratos carregados:", contratos);
          setContratos(contratos);
        })
        .catch((error) => {
          console.error("❌ Erro ao carregar contratos:", error);
          setErro("Erro ao carregar contratos do fornecedor.");
        });
    }
  }, [fornecedor, open]);

  useEffect(() => {
    if (contratoId) {
      listarContratoProdutos(contratoId).then((prods) => {
        setProdutos(prods);
        setCarrinho({});
      });
    }
  }, [contratoId]);

  const adicionarAoCarrinho = (produto: any) => {
    setCarrinho((prev) => ({
      ...prev,
      [produto.produto_id]: {
        produto,
        quantidade: (prev[produto.produto_id]?.quantidade || 0) + 1,
      },
    }));
  };

  const removerDoCarrinho = (produto_id: number) => {
    setCarrinho((prev) => {
      const novo = { ...prev };
      if (novo[produto_id]) {
        if (novo[produto_id].quantidade > 1) {
          novo[produto_id].quantidade -= 1;
        } else {
          delete novo[produto_id];
        }
      }
      return novo;
    });
  };

  const alterarQuantidade = (produto_id: number, quantidade: number) => {
    if (quantidade <= 0) {
      removerDoCarrinho(produto_id);
      return;
    }

    const produto = produtos.find((p) => p.produto_id === produto_id);
    if (!produto) return;

    if (quantidade > produto.saldo) {
      setErro(`Quantidade não pode exceder o saldo disponível (${produto.saldo})`);
      return;
    }

    setCarrinho((prev) => ({
      ...prev,
      [produto_id]: {
        produto,
        quantidade,
      },
    }));
    setErro(null);
  };

  const valorTotal = Object.values(carrinho).reduce(
    (acc, item) => acc + item.quantidade * item.produto.preco,
    0
  );

  const totalItens = Object.values(carrinho).reduce(
    (acc, item) => acc + item.quantidade,
    0
  );

  const handleProximoStep = () => {
    if (activeStep === 0 && !contratoId) {
      setErro("Selecione um contrato para continuar.");
      return;
    }
    if (activeStep === 1 && totalItens === 0) {
      setErro("Adicione pelo menos um produto ao carrinho.");
      return;
    }
    setErro(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleVoltarStep = () => {
    setErro(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleConfirmarPedido = async () => {
    setErro(null);
    setLoading(true);
    
    try {
      await criarPedido({
        fornecedor_id: fornecedor.id,
        contrato_id: contratoId,
        produtos: Object.values(carrinho).map((item) => ({
          produto_id: item.produto.produto_id,
          quantidade: item.quantidade,
        })),
      });
      setLoading(false);
      onPedidoRealizado();
    } catch (e: any) {
      setErro(e.message || "Erro ao criar pedido.");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setContratoId(null);
    setProdutos([]);
    setCarrinho({});
    setErro(null);
    onClose();
  };

  const steps = [
    {
      label: "Selecionar Contrato",
      description: "Escolha o contrato para este pedido",
    },
    {
      label: "Adicionar Produtos",
      description: "Selecione os produtos e quantidades",
    },
    {
      label: "Revisar Pedido",
      description: "Confirme os detalhes do pedido",
    },
  ];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
              <Business />
            </Avatar>
            <Box>
              <Typography variant="h6">Novo Pedido</Typography>
              <Typography variant="body2" color="text.secondary">
                {fornecedor?.nome}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} orientation="horizontal" sx={{ mb: 4 }}>
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>
                  <Typography variant="subtitle2">{step.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {/* Step 0: Selecionar Contrato */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Contratos Disponíveis
              </Typography>
              <Grid container spacing={2}>
                {contratos.map((contrato) => (
                  <Grid item xs={12} sm={6} key={contrato.id}>
                    <Card
                      sx={{
                        cursor: "pointer",
                        border: contratoId === contrato.id ? 2 : 1,
                        borderColor: contratoId === contrato.id ? "primary.main" : "divider",
                        "&:hover": { borderColor: "primary.main" },
                      }}
                      onClick={() => setContratoId(contrato.id)}
                    >
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6">{contrato.numero}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(contrato.data_inicio).toLocaleDateString()} a{" "}
                              {new Date(contrato.data_fim).toLocaleDateString()}
                            </Typography>
                            <Typography variant="h6" color="primary.main" sx={{ mt: 1 }}>
                              R$ {(Number(contrato.valor_total) || 0).toFixed(2)}
                            </Typography>
                          </Box>
                          {contratoId === contrato.id && (
                            <CheckCircle color="primary" />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Step 1: Adicionar Produtos */}
          {activeStep === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  Produtos Disponíveis
                </Typography>
                <Grid container spacing={2}>
                  {produtos.map((produto) => (
                    <Grid item xs={12} sm={6} key={produto.produto_id}>
                      <Card>
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={2}>
                            <Avatar sx={{ bgcolor: "secondary.main", mr: 2 }}>
                              <Inventory />
                            </Avatar>
                            <Box flexGrow={1}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {produto.nome}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {produto.unidade}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" color="primary.main">
                              R$ {produto.preco.toFixed(2)}
                            </Typography>
                            <Chip
                              label={`Saldo: ${produto.saldo}`}
                              size="small"
                              color={produto.saldo > 0 ? "success" : "error"}
                            />
                          </Box>

                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box display="flex" alignItems="center">
                              <IconButton
                                size="small"
                                onClick={() => removerDoCarrinho(produto.produto_id)}
                                disabled={!carrinho[produto.produto_id]}
                              >
                                <Remove />
                              </IconButton>
                              <Typography sx={{ mx: 2, minWidth: 20, textAlign: "center" }}>
                                {carrinho[produto.produto_id]?.quantidade || 0}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => adicionarAoCarrinho(produto)}
                                disabled={
                                  produto.saldo <= 0 ||
                                  (carrinho[produto.produto_id]?.quantidade || 0) >= produto.saldo
                                }
                              >
                                <Add />
                              </IconButton>
                            </Box>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => adicionarAoCarrinho(produto)}
                              disabled={
                                produto.saldo <= 0 ||
                                (carrinho[produto.produto_id]?.quantidade || 0) >= produto.saldo
                              }
                            >
                              Adicionar
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ position: "sticky", top: 20 }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <ShoppingCart sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        Carrinho
                        {totalItens > 0 && (
                          <Badge badgeContent={totalItens} color="primary" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                    </Box>

                    {Object.keys(carrinho).length === 0 ? (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                        Nenhum produto adicionado
                      </Typography>
                    ) : (
                      <List dense>
                        {Object.values(carrinho).map((item) => (
                          <ListItem key={item.produto.produto_id} sx={{ px: 0 }}>
                            <ListItemText
                              primary={item.produto.nome}
                              secondary={`${item.quantidade} × R$ ${item.produto.preco.toFixed(2)}`}
                            />
                            <ListItemSecondaryAction>
                              <Box display="flex" alignItems="center">
                                <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>
                                  R$ {(item.quantidade * item.produto.preco).toFixed(2)}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => removerDoCarrinho(item.produto.produto_id)}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    )}

                    {Object.keys(carrinho).length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6">Total:</Typography>
                          <Typography variant="h6" color="primary.main" fontWeight="bold">
                            R$ {valorTotal.toFixed(2)}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Step 2: Revisar Pedido */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Resumo do Pedido
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Informações do Pedido
                      </Typography>
                      <Box mb={2}>
                        <Typography variant="body2" color="text.secondary">Fornecedor</Typography>
                        <Typography variant="body1">{fornecedor?.nome}</Typography>
                      </Box>
                      <Box mb={2}>
                        <Typography variant="body2" color="text.secondary">Contrato</Typography>
                        <Typography variant="body1">
                          {contratos.find(c => c.id === contratoId)?.numero}
                        </Typography>
                      </Box>
                      <Box mb={2}>
                        <Typography variant="body2" color="text.secondary">Total de Itens</Typography>
                        <Typography variant="body1">{totalItens} produtos</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Valor Total</Typography>
                        <Typography variant="h5" color="primary.main" fontWeight="bold">
                          R$ {valorTotal.toFixed(2)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Produtos do Pedido
                      </Typography>
                      <List dense>
                        {Object.values(carrinho).map((item) => (
                          <ListItem key={item.produto.produto_id} sx={{ px: 0 }}>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: "secondary.main", width: 32, height: 32 }}>
                                <Inventory fontSize="small" />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={item.produto.nome}
                              secondary={`${item.quantidade} ${item.produto.unidade} × R$ ${item.produto.preco.toFixed(2)}`}
                            />
                            <ListItemSecondaryAction>
                              <Typography variant="body2" fontWeight="bold">
                                R$ {(item.quantidade * item.produto.preco).toFixed(2)}
                              </Typography>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {erro && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {erro}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        
        {activeStep > 0 && (
          <Button
            onClick={handleVoltarStep}
            startIcon={<ArrowBack />}
            disabled={loading}
          >
            Voltar
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleProximoStep}
            endIcon={<ArrowForward />}
            disabled={loading}
          >
            Próximo
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleConfirmarPedido}
            disabled={loading || totalItens === 0}
            startIcon={<CheckCircle />}
          >
            {loading ? "Processando..." : "Confirmar Pedido"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PedidoFormModerno;