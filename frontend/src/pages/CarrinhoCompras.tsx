import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Divider,
  Chip,
  Card,
  CardContent,
  Collapse,
  Tooltip,
  Badge,
  Snackbar,
  TextField,
  InputAdornment,
} from "@mui/material";
import {
  Add,
  Remove,
  Delete,
  Edit,
  CreditCard,
  Store,
  ExpandMore,
  ExpandLess,
  SelectAll,
  ClearAll,
  ShoppingCart,
  Warning,
  CheckCircle,
  Info,
  Search,
  FilterList,
} from "@mui/icons-material";
import { useCarrinho } from "../context/CarrinhoContext";
import { useToast } from "../hooks/useToast";
import { useNavigate } from "react-router-dom";
import { carrinhoService } from "../services/carrinho";

const CarrinhoCompras: React.FC = () => {
  const navigate = useNavigate();

  const {
    itens,
    loading,
    error,
    totalGeral,
    atualizarQuantidade,
    removerItem,
    limparError,
    carregarCarrinho,
  } = useCarrinho();



  // Estados para seleção de fornecedores e itens
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(
    new Set()
  );
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(
    new Set()
  );

  // Estados para finalização de pedido
  const [finalizandoPedido, setFinalizandoPedido] = useState(false);
  const [sucessoPedido, setSucessoPedido] = useState<string | null>(null);
  const toast = useToast();

  // Estados para melhorias da interface
  const [searchTerm, setSearchTerm] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'selected' | 'complete' | null>(null);

  // Filtrar itens baseado na busca
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return itens;
    
    return itens.filter(item => 
      item.nome_produto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nome_fornecedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.unidade?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [itens, searchTerm]);

  // Agrupar itens filtrados por fornecedor usando useMemo para evitar recálculo desnecessário
  const groupedItems = useMemo(() => {
    return filteredItems.reduce((groups, item) => {
      const supplier = item.nome_fornecedor || "Fornecedor não informado";
      if (!groups[supplier]) {
        groups[supplier] = [];
      }
      groups[supplier].push(item);
      return groups;
    }, {} as Record<string, typeof filteredItems>);
  }, [filteredItems]);

  // Função para validar itens antes de finalizar pedido
  const validateItems = (itemsToValidate: typeof itens) => {
    const errors: string[] = [];
    
    itemsToValidate.forEach(item => {
      if (!item.produto_id) {
        errors.push(`Item "${item.nome_produto}" não possui ID do produto`);
      }
      if (!item.contrato_id) {
        errors.push(`Item "${item.nome_produto}" não possui contrato associado`);
      }
      if (!item.fornecedor_id) {
        errors.push(`Item "${item.nome_produto}" não possui fornecedor associado`);
      }
      const quantidade = localQuantities[item.id] || item.quantidade;
      if (!quantidade || quantidade <= 0) {
        errors.push(`Item "${item.nome_produto}" possui quantidade inválida`);
      }
      if (!item.preco_unitario || item.preco_unitario <= 0) {
        errors.push(`Item "${item.nome_produto}" possui preço inválido`);
      }
    });
    
    return errors;
  };

  // Funções para manipular seleções
  const handleSupplierToggle = (supplierName: string) => {
    const newSelectedSuppliers = new Set(selectedSuppliers);
    const newSelectedItems = new Set(selectedItems);
    const newExpandedSuppliers = new Set(expandedSuppliers);

    if (selectedSuppliers.has(supplierName)) {
      // Desmarcar fornecedor e todos seus itens
      newSelectedSuppliers.delete(supplierName);
      groupedItems[supplierName]?.forEach((item) => {
        newSelectedItems.delete(item.id);
      });
    } else {
      // Marcar fornecedor e todos seus itens
      newSelectedSuppliers.add(supplierName);
      groupedItems[supplierName]?.forEach((item) => {
        newSelectedItems.add(item.id);
      });
      // Expandir automaticamente quando selecionado
      newExpandedSuppliers.add(supplierName);
    }

    setSelectedSuppliers(newSelectedSuppliers);
    setSelectedItems(newSelectedItems);
    setExpandedSuppliers(newExpandedSuppliers);
  };

  const handleItemToggle = (itemId: number, supplierName: string) => {
    const newSelectedItems = new Set(selectedItems);
    const newSelectedSuppliers = new Set(selectedSuppliers);

    if (selectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
      // Verificar se ainda há itens selecionados deste fornecedor
      const supplierItems = groupedItems[supplierName] || [];
      const hasSelectedItems = supplierItems.some(
        (item) => item.id !== itemId && newSelectedItems.has(item.id)
      );
      if (!hasSelectedItems) {
        newSelectedSuppliers.delete(supplierName);
      }
    } else {
      newSelectedItems.add(itemId);
      // Verificar se todos os itens do fornecedor estão selecionados
      const supplierItems = groupedItems[supplierName] || [];
      const allSelected = supplierItems.every(
        (item) => item.id === itemId || newSelectedItems.has(item.id)
      );
      if (allSelected) {
        newSelectedSuppliers.add(supplierName);
      }
    }

    setSelectedItems(newSelectedItems);
    setSelectedSuppliers(newSelectedSuppliers);
  };

  const toggleSupplierExpansion = (supplierName: string) => {
    const newExpanded = new Set(expandedSuppliers);
    if (expandedSuppliers.has(supplierName)) {
      newExpanded.delete(supplierName);
    } else {
      newExpanded.add(supplierName);
    }
    setExpandedSuppliers(newExpanded);
  };

  // Estados para controle de quantidades e atualizações
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
  const [localQuantities, setLocalQuantities] = useState<{
    [key: number]: number;
  }>({});

  // Funções para selecionar/desselecionar todos os itens
  const selectAllItems = () => {
    const allItemIds = new Set(itens.map((item) => item.id));
    const allSuppliers = new Set(Object.keys(groupedItems));
    setSelectedItems(allItemIds);
    setSelectedSuppliers(allSuppliers);
  };

  const clearAllSelections = () => {
    setSelectedItems(new Set());
    setSelectedSuppliers(new Set());
  };

  // Funções para expandir/colapsar todos os fornecedores
  const expandAllSuppliers = () => {
    const allSuppliers = new Set(Object.keys(groupedItems));
    setExpandedSuppliers(allSuppliers);
  };

  const collapseAllSuppliers = () => {
    setExpandedSuppliers(new Set());
  };

  // Calcular totais dos itens selecionados usando useMemo para otimização
  const selectedSubtotal = useMemo(() => {
    let total = 0;
    itens.forEach((item) => {
      if (selectedItems.has(item.id)) {
        const quantity = localQuantities[item.id] || item.quantidade || 0;
        total += quantity * (item.preco_unitario || 0);
      }
    });
    return total;
  }, [itens, selectedItems, localQuantities]);



  // Removido useEffect duplicado - o contexto já carrega o carrinho automaticamente

  // Fornecedores ficam colapsados por padrão para melhor performance
  // Os usuários podem expandir manualmente conforme necessário

  const handleVoltarCatalogo = () => {
    navigate("/catalogo");
  };

  // Função para finalizar pedido selecionado
  const finalizarPedidoSelecionado = async () => {
    if (selectedItems.size === 0) {
      toast.warningRequired("Selecione pelo menos um item para finalizar o pedido");
      return;
    }

    // Preparar itens selecionados
    const itensSelecionados = filteredItems.filter((item) => selectedItems.has(item.id));
    
    // Validar itens antes de prosseguir
    const errors = validateItems(itensSelecionados);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationErrors(true);
      return;
    }

    setFinalizandoPedido(true);
    setSucessoPedido(null);

    try {
      const itensFormatados = itensSelecionados.map((item) => ({
        id: item.id,
        produto_id: item.produto_id,
        contrato_id: item.contrato_id,
        fornecedor_id: item.fornecedor_id,
        quantidade: Number(localQuantities[item.id]) || Number(item.quantidade),
        preco_unitario: item.preco_unitario,
        nome_fornecedor: item.nome_fornecedor,
      }));

      // Confirmar pedido usando a nova integração do carrinho
      const resultado = await carrinhoService.confirmarPedido({
        observacoes: `Pedido com ${itensFormatados.length} itens selecionados`,
        data_entrega_prevista: null
      });

      toast.successCreate(`Pedido ${resultado.pedido.numero_pedido}`);
      setSucessoPedido(`Pedido ${resultado.pedido.numero_pedido} criado com sucesso!`);

      // Limpar seleções
      clearAllSelections();

      // Recarregar carrinho
      await carregarCarrinho();

      // Redirecionar para página de pedidos após 3 segundos
      setTimeout(() => {
        navigate("/pedidos");
      }, 3000);
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      toast.errorSave(error instanceof Error ? error.message : "Erro ao finalizar pedido");
    } finally {
      setFinalizandoPedido(false);
    }
  };

  // Função para finalizar pedido completo
  const finalizarPedidoCompleto = async () => {
    if (filteredItems.length === 0) {
      toast.warning("Carrinho vazio", "Adicione itens ao carrinho antes de finalizar o pedido.");
      return;
    }

    // Validar todos os itens antes de prosseguir
    const errors = validateItems(filteredItems);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationErrors(true);
      return;
    }

    setFinalizandoPedido(true);
    setSucessoPedido(null);

    try {
      const itensFormatados = filteredItems.map(item => ({
        id: item.id,
        produto_id: item.produto_id,
        contrato_id: item.contrato_id,
        fornecedor_id: item.fornecedor_id,
        quantidade: Number(localQuantities[item.id]) || Number(item.quantidade),
        preco_unitario: item.preco_unitario,
        nome_fornecedor: item.nome_fornecedor,
      }));

      // Confirmar pedido usando a nova integração do carrinho
      const resultado = await carrinhoService.confirmarPedido({
        observacoes: `Pedido com ${itensFormatados.length} itens do carrinho`,
        data_entrega_prevista: null
      });

      toast.successCreate(`Pedido ${resultado.pedido.numero_pedido}`);
      setSucessoPedido(`Pedido ${resultado.pedido.numero_pedido} criado com sucesso!`);

      // Limpar seleções
      clearAllSelections();

      // Recarregar carrinho (deve estar vazio agora)
      await carregarCarrinho();

      // Redirecionar para página de pedidos após 3 segundos
      setTimeout(() => {
        navigate("/pedidos");
      }, 3000);
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      toast.errorSave(error instanceof Error ? error.message : "Erro ao finalizar pedido");
    } finally {
      setFinalizandoPedido(false);
    }
  };

  // Inicializar quantidades locais quando os itens carregarem (otimizado)
  useEffect(() => {
    if (itens.length === 0) {
      setLocalQuantities({});
      return;
    }

    // Só atualizar se houver mudanças reais nos itens
    const quantities: { [key: number]: number } = {};
    
    itens.forEach((item) => {
      quantities[item.id] = item.quantidade;
    });

    // Atualizar apenas quando os itens mudarem (não quando localQuantities mudar)
    setLocalQuantities(quantities);
  }, [itens]); // Removido localQuantities da dependência para evitar loop

  const updateQuantity = async (itemId: number, change: number) => {
    const item = itens.find(i => i.id === itemId);
    const localQty = localQuantities[itemId] ? Number(localQuantities[itemId]) : undefined;
    const itemQty = item?.quantidade ? Number(item.quantidade) : undefined;
    const currentQuantity = localQty ?? itemQty ?? 1;
    const newQuantity = Math.max(1, currentQuantity + change);

    // Atualização otimista da UI
    setLocalQuantities((prev) => ({
      ...prev,
      [itemId]: newQuantity,
    }));

    // Marcar item como sendo atualizado
    setUpdatingItems((prev) => new Set(prev).add(itemId));

    try {
      // Fazer a requisição para o backend
      await atualizarQuantidade(itemId, newQuantity);
    } catch (error) {
      // Reverter em caso de erro
      setLocalQuantities((prev) => ({
        ...prev,
        [itemId]: currentQuantity,
      }));
      console.error("Erro ao atualizar quantidade:", error);
    } finally {
      // Remover da lista de itens sendo atualizados
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const subtotal = totalGeral;
  const shipping = 0; // Frete sempre grátis
  const total = subtotal + shipping;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const getProductIcon = (productName: string) => {
    const name = productName.toLowerCase();
    if (name.includes("arroz")) return "🍚";
    if (name.includes("feijão")) return "🫘";
    if (name.includes("óleo")) return "🫒";
    if (name.includes("macarrão")) return "🍝";
    if (name.includes("carne")) return "🥩";
    if (name.includes("frango")) return "🍗";
    if (name.includes("leite")) return "🥛";
    if (name.includes("batata")) return "🥔";
    if (name.includes("cenoura")) return "🥕";
    if (name.includes("banana")) return "🍌";
    if (name.includes("pão")) return "🍞";
    if (name.includes("suco")) return "🧃";
    return "🍎";
  };

  // Loading inicial
  if (loading && itens.length === 0) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f9fafb",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f9fafb" }}>


      <Box
        sx={{
          maxWidth: "1280px",
          mx: "auto",
          px: { xs: 2, sm: 3, lg: 4 },
          py: 4,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
            gap: 4,
          }}
        >
          {/* Items do Carrinho */}
          <Box>
            <Box
              sx={{
                bgcolor: "white",
                borderRadius: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                p: 3,
              }}
            >
              {/* Cabeçalho com título e estatísticas */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: "#1f2937",
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Itens do Carrinho
                    </Typography>
                    <Badge
                      badgeContent={filteredItems.length}
                      color="primary"
                      sx={{
                        "& .MuiBadge-badge": {
                          bgcolor: "#059669",
                          color: "white",
                          fontWeight: 600,
                        },
                      }}
                    >
                      <ShoppingCart sx={{ color: "#6b7280" }} />
                    </Badge>
                    {searchTerm && (
                      <Chip
                        label={`${filteredItems.length} de ${itens.length} itens`}
                        size="small"
                        color="info"
                        sx={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                      />
                    )}
                  </Box>

                  {Object.keys(groupedItems).length > 0 && (
                    <Chip
                      label={`${expandedSuppliers.size}/${Object.keys(groupedItems).length} fornecedores expandidos`}
                      size="small"
                      icon={<Store />}
                      sx={{
                        bgcolor: expandedSuppliers.size > 0 ? "#e0f2fe" : "#f5f5f5",
                        color: expandedSuppliers.size > 0 ? "#0277bd" : "#6b7280",
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    />
                  )}
                </Box>

                {/* Barra de busca */}
                {itens.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Buscar por produto, fornecedor ou unidade..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ color: "#6b7280" }} />
                          </InputAdornment>
                        ),
                        endAdornment: searchTerm && (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setSearchTerm("")}
                              sx={{ color: "#6b7280" }}
                            >
                              <ClearAll />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          bgcolor: "#f9fafb",
                          "&:hover": { bgcolor: "#f3f4f6" },
                          "&.Mui-focused": { bgcolor: "white" },
                        },
                      }}
                    />
                  </Box>
                )}

                {/* Controles de ação */}
                {filteredItems.length > 0 && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Tooltip title={selectedItems.size === filteredItems.length ? "Limpar todas as seleções" : "Selecionar todos os itens visíveis"}>
                        <Button
                          size="small"
                          startIcon={selectedItems.size === filteredItems.length ? <ClearAll /> : <SelectAll />}
                          onClick={selectedItems.size === filteredItems.length ? clearAllSelections : selectAllItems}
                          sx={{
                            color: selectedItems.size === filteredItems.length ? "#dc2626" : "#059669",
                            textTransform: "none",
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            "&:hover": { 
                              bgcolor: selectedItems.size === filteredItems.length ? "#fef2f2" : "#f0f9ff" 
                            },
                          }}
                        >
                          {selectedItems.size === filteredItems.length ? "Limpar Seleção" : "Selecionar Todos"}
                        </Button>
                      </Tooltip>
                      {selectedItems.size > 0 && (
                        <Chip
                          label={`${selectedItems.size} selecionados`}
                          size="small"
                          color="primary"
                          sx={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                        />
                      )}
                    </Box>
                    
                    <Tooltip title={expandedSuppliers.size === Object.keys(groupedItems).length ? "Colapsar todos os fornecedores" : "Expandir todos os fornecedores"}>
                      <Button
                        size="small"
                        startIcon={expandedSuppliers.size === Object.keys(groupedItems).length ? <ExpandLess /> : <ExpandMore />}
                        onClick={expandedSuppliers.size === Object.keys(groupedItems).length ? collapseAllSuppliers : expandAllSuppliers}
                        sx={{
                          color: expandedSuppliers.size === Object.keys(groupedItems).length ? "#dc2626" : "#059669",
                          textTransform: "none",
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                          "&:hover": { 
                            bgcolor: expandedSuppliers.size === Object.keys(groupedItems).length ? "#fef2f2" : "#f0fdf4" 
                          },
                        }}
                      >
                        {expandedSuppliers.size === Object.keys(groupedItems).length ? "Colapsar Todos" : "Expandir Todos"}
                      </Button>
                    </Tooltip>
                  </Box>
                )}
              </Box>

              {/* Alertas de erro e validação */}
              {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={limparError}>
                  {error}
                </Alert>
              )}
              
              {showValidationErrors && validationErrors.length > 0 && (
                <Alert
                  severity="warning"
                  icon={<Warning />}
                  onClose={() => setShowValidationErrors(false)}
                  sx={{
                    mb: 3,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Problemas encontrados nos itens:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {validationErrors.map((error, index) => (
                        <Typography component="li" key={index} variant="body2">
                          {error}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                </Alert>
              )}
              
              {filteredItems.length !== itens.length && (
                <Alert
                  severity="info"
                  icon={<Info />}
                  sx={{
                    mb: 3,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  Mostrando {filteredItems.length} de {itens.length} itens. Use a busca para filtrar os resultados.
                </Alert>
              )}

              {itens.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <ShoppingCart
                    sx={{ fontSize: 64, color: "#d1d5db", mb: 2 }}
                  />
                  <Typography
                    variant="h6"
                    sx={{
                      color: "#6b7280",
                      mb: 2,
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    }}
                  >
                    Seu carrinho está vazio
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleVoltarCatalogo}
                    sx={{
                      mt: 2,
                      bgcolor: "#4f46e5",
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      textTransform: "none",
                      "&:hover": { bgcolor: "#4338ca" },
                    }}
                  >
                    Continuar Comprando
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {Object.entries(groupedItems).map(
                    ([supplierName, supplierItems]) => {
                      const isSupplierSelected =
                        selectedSuppliers.has(supplierName);
                      const isExpanded = expandedSuppliers.has(supplierName);
                      const supplierTotal = supplierItems.reduce(
                        (sum, item) => {
                          const quantity =
                            localQuantities[item.id] || item.quantidade || 0;
                          return sum + quantity * (item.preco_unitario || 0);
                        },
                        0
                      );

                      return (
                        <Card
                          key={supplierName}
                          sx={{
                            border: isSupplierSelected
                              ? "2px solid #4f46e5"
                              : "1px solid #e5e7eb",
                            borderRadius: "12px",
                            overflow: "hidden",
                            transition: "all 0.2s",
                          }}
                        >
                          {/* Header do Fornecedor */}
                          <CardContent
                            sx={{
                              bgcolor: isSupplierSelected
                                ? "#f0f9ff"
                                : "#f9fafb",
                              borderBottom: "1px solid #e5e7eb",
                              py: 2,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={isSupplierSelected}
                                    onChange={() =>
                                      handleSupplierToggle(supplierName)
                                    }
                                    sx={{
                                      color: "#4f46e5",
                                      "&.Mui-checked": {
                                        color: "#4f46e5",
                                      },
                                    }}
                                  />
                                }
                                label=""
                                sx={{ m: 0 }}
                              />

                              <Store sx={{ color: "#4f46e5", fontSize: 24 }} />

                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  variant="h6"
                                  sx={{
                                    fontWeight: 600,
                                    color: "#1f2937",
                                    fontFamily:
                                      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                  }}
                                >
                                  {supplierName}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: "#6b7280",
                                    fontFamily:
                                      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                  }}
                                >
                                  {supplierItems.length}{" "}
                                  {supplierItems.length === 1
                                    ? "item"
                                    : "itens"}{" "}
                                  • Total: {formatPrice(supplierTotal)}
                                </Typography>
                              </Box>

                              <Chip
                                label={`${supplierItems.filter((item) =>
                                  selectedItems.has(item.id)
                                ).length
                                  }/${supplierItems.length} selecionados`}
                                size="small"
                                sx={{
                                  bgcolor: isSupplierSelected
                                    ? "#4f46e5"
                                    : "#e5e7eb",
                                  color: isSupplierSelected
                                    ? "white"
                                    : "#6b7280",
                                  fontFamily:
                                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                }}
                              />

                              <IconButton
                                onClick={() =>
                                  toggleSupplierExpansion(supplierName)
                                }
                                sx={{ color: "#6b7280" }}
                              >
                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                              </IconButton>
                            </Box>
                          </CardContent>

                          {/* Itens do Fornecedor */}
                          <Collapse in={isExpanded}>
                            <CardContent sx={{ p: 0 }}>
                              {supplierItems.map((item, index) => (
                                <Box key={item.id}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 2,
                                      p: 3,
                                      bgcolor: selectedItems.has(item.id)
                                        ? "#f8fafc"
                                        : "white",
                                      "&:hover": {
                                        bgcolor: "#f8fafc",
                                      },
                                      transition: "background-color 0.2s",
                                    }}
                                  >
                                    {/* Checkbox do item */}
                                    <Checkbox
                                      checked={selectedItems.has(item.id)}
                                      onChange={() =>
                                        handleItemToggle(item.id, supplierName)
                                      }
                                      sx={{
                                        color: "#4f46e5",
                                        "&.Mui-checked": {
                                          color: "#4f46e5",
                                        },
                                      }}
                                    />

                                    {/* Ícone do produto */}
                                    <Box
                                      sx={{
                                        width: 56,
                                        height: 56,
                                        background:
                                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        borderRadius: "8px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "1.5rem",
                                      }}
                                    >
                                      {getProductIcon(item.nome_produto || "")}
                                    </Box>

                                    {/* Informações do produto */}
                                    <Box sx={{ flex: 1 }}>
                                      <Typography
                                        variant="subtitle1"
                                        sx={{
                                          fontWeight: 600,
                                          color: "#1f2937",
                                          fontFamily:
                                            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                        }}
                                      >
                                        {item.nome_produto}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          color: "#9ca3af",
                                          fontFamily:
                                            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                        }}
                                      >
                                        Unidade: {item.unidade}
                                      </Typography>
                                    </Box>

                                    {/* Controles de quantidade */}
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        p: 1,
                                        bgcolor: "#f8fafc",
                                        borderRadius: 2,
                                        border: "1px solid #e2e8f0",
                                      }}
                                    >
                                      <Tooltip title="Diminuir quantidade">
                                        <IconButton
                                          onClick={() =>
                                            updateQuantity(item.id, -1)
                                          }
                                          disabled={loading || (localQuantities[item.id] || item.quantidade) <= 1}
                                          sx={{
                                            width: 32,
                                            height: 32,
                                            color: "#dc2626",
                                            bgcolor: "#fef2f2",
                                            "&:hover": { bgcolor: "#fee2e2", transform: "scale(1.05)" },
                                            "&:disabled": { 
                                              bgcolor: "#f9fafb", 
                                              color: "#d1d5db",
                                              transform: "none"
                                            },
                                            transition: "all 0.2s ease",
                                          }}
                                        >
                                          <Remove sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </Tooltip>
                                      
                                      <Box
                                        sx={{
                                          display: "flex",
                                          flexDirection: "column",
                                          alignItems: "center",
                                          minWidth: "60px",
                                        }}
                                      >
                                        {updatingItems.has(item.id) ? (
                                          <CircularProgress size={16} />
                                        ) : (
                                          <>
                                            <Typography
                                              sx={{
                                                fontWeight: 700,
                                                fontSize: "1.1rem",
                                                color: "#1f2937",
                                                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                                lineHeight: 1,
                                              }}
                                            >
                                              {localQuantities[item.id] ||
                                                item.quantidade}
                                            </Typography>
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                color: "#6b7280",
                                                fontSize: "0.75rem",
                                                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                              }}
                                            >
                                              {item.unidade}
                                            </Typography>
                                          </>
                                        )}
                                      </Box>
                                      
                                      <Tooltip title="Aumentar quantidade">
                                        <IconButton
                                          onClick={() =>
                                            updateQuantity(item.id, 1)
                                          }
                                          disabled={loading}
                                          sx={{
                                            width: 32,
                                            height: 32,
                                            color: "#059669",
                                            bgcolor: "#f0fdf4",
                                            "&:hover": { bgcolor: "#dcfce7", transform: "scale(1.05)" },
                                            "&:disabled": { 
                                              bgcolor: "#f9fafb", 
                                              color: "#d1d5db",
                                              transform: "none"
                                            },
                                            transition: "all 0.2s ease",
                                          }}
                                        >
                                          <Add sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>

                                    {/* Preço */}
                                    <Box
                                      sx={{ textAlign: "right", minWidth: 120 }}
                                    >
                                      <Typography
                                        variant="subtitle1"
                                        sx={{
                                          fontWeight: "bold",
                                          color: "#1f2937",
                                          fontFamily:
                                            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                        }}
                                      >
                                        {formatPrice(
                                          (localQuantities[item.id] ||
                                            item.quantidade ||
                                            0) * (item.preco_unitario || 0)
                                        )}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          color: "#6b7280",
                                          fontFamily:
                                            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                        }}
                                      >
                                        {formatPrice(item.preco_unitario || 0)}{" "}
                                        cada
                                      </Typography>
                                    </Box>

                                    {/* Botões de ação */}
                                    <Box sx={{ display: "flex", gap: 1 }}>
                                      <Tooltip title="Editar quantidade">
                                        <IconButton
                                          size="small"
                                          sx={{
                                            width: 32,
                                            height: 32,
                                            color: "#4f46e5",
                                            bgcolor: "#f0f9ff",
                                            "&:hover": { 
                                              bgcolor: "#dbeafe",
                                              transform: "scale(1.05)"
                                            },
                                            transition: "all 0.2s ease",
                                          }}
                                        >
                                          <Edit sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </Tooltip>
                                      
                                      <Tooltip title="Remover item do carrinho">
                                        <IconButton
                                          onClick={() => removerItem(item.id)}
                                          disabled={loading}
                                          sx={{
                                            width: 32,
                                            height: 32,
                                            bgcolor: "#fef2f2",
                                            color: "#ef4444",
                                            "&:hover": { 
                                              bgcolor: "#fee2e2",
                                              transform: "scale(1.05)"
                                            },
                                            "&:disabled": { 
                                              bgcolor: "#f9fafb",
                                              color: "#d1d5db",
                                              transform: "none"
                                            },
                                            transition: "all 0.2s ease",
                                          }}
                                        >
                                          <Delete sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </Box>

                                  {index < supplierItems.length - 1 && (
                                    <Divider sx={{ mx: 3 }} />
                                  )}
                                </Box>
                              ))}
                            </CardContent>
                          </Collapse>
                        </Card>
                      );
                    }
                  )}
                </Box>
              )}
            </Box>
          </Box>

          {/* Resumo do Pedido */}
          <Box>
            <Box
              sx={{
                bgcolor: "white",
                borderRadius: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                p: 3,
                position: "sticky",
                top: 20,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: "#1f2937",
                  mb: 3,
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                Resumo do Pedido
              </Typography>

              {/* Mensagem de sucesso */}
              {sucessoPedido && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  {sucessoPedido}
                </Alert>
              )}

              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography
                    sx={{
                      color: "#6b7280",
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    }}
                  >
                    Subtotal ({itens.length}{" "}
                    {itens.length === 1 ? "item" : "itens"})
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 500,
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    }}
                  >
                    {formatPrice(subtotal)}
                  </Typography>
                </Box>

                {selectedItems.size > 0 && (
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography
                      sx={{
                        color: "#4f46e5",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segue UI', Roboto, sans-serif",
                      }}
                    >
                      Itens selecionados ({selectedItems.size})
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 500,
                        color: "#4f46e5",
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      {formatPrice(selectedSubtotal)}
                    </Typography>
                  </Box>
                )}





                <Divider />

                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      color: "#1f2937",
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    }}
                  >
                    Total
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      color: "#1f2937",
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    }}
                  >
                    {formatPrice(total)}
                  </Typography>
                </Box>
              </Box>

              {/* Botões de finalização */}
              {itens.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {selectedItems.size > 0 && (
                    <Tooltip title={`Finalizar apenas os ${selectedItems.size} itens selecionados`}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={finalizandoPedido ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                        onClick={finalizarPedidoSelecionado}
                        disabled={finalizandoPedido}
                        sx={{
                          bgcolor: "#4f46e5",
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                          textTransform: "none",
                          py: 1.5,
                          fontSize: "1rem",
                          fontWeight: 600,
                          boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
                          "&:hover": {
                            bgcolor: "#4338ca",
                            transform: "translateY(-2px)",
                            boxShadow: "0 6px 16px rgba(79, 70, 229, 0.4)",
                          },
                          "&:disabled": {
                            bgcolor: "#9ca3af",
                            transform: "none",
                            boxShadow: "none",
                          },
                          transition: "all 0.3s ease",
                        }}
                      >
                        {finalizandoPedido ? (
                          "Processando pedido selecionado..."
                        ) : (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <span>Finalizar Pedido Selecionado</span>
                            <Chip
                              label={`${selectedItems.size} ${selectedItems.size === 1 ? "item" : "itens"}`}
                              size="small"
                              sx={{
                                bgcolor: "rgba(255, 255, 255, 0.2)",
                                color: "white",
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                        )}
                      </Button>
                    </Tooltip>
                  )}

                  <Tooltip title={`Finalizar todos os ${itens.length} itens do carrinho`}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={finalizandoPedido ? <CircularProgress size={20} color="inherit" /> : <CreditCard />}
                      onClick={finalizarPedidoCompleto}
                      disabled={finalizandoPedido}
                      sx={{
                        bgcolor: selectedItems.size > 0 ? "#059669" : "#4f46e5",
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        textTransform: "none",
                        py: 1.5,
                        fontSize: "1rem",
                        fontWeight: 600,
                        boxShadow: selectedItems.size > 0 ? "0 4px 12px rgba(5, 150, 105, 0.3)" : "0 4px 12px rgba(79, 70, 229, 0.3)",
                        "&:hover": {
                          bgcolor: selectedItems.size > 0 ? "#047857" : "#4338ca",
                          transform: "translateY(-2px)",
                          boxShadow: selectedItems.size > 0 ? "0 6px 16px rgba(5, 150, 105, 0.4)" : "0 6px 16px rgba(79, 70, 229, 0.4)",
                        },
                        "&:disabled": {
                          bgcolor: "#9ca3af",
                          transform: "none",
                          boxShadow: "none",
                        },
                        transition: "all 0.3s ease",
                      }}
                    >
                      {finalizandoPedido ? (
                        "Processando pedido completo..."
                      ) : (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <span>Finalizar Pedido Completo</span>
                          <Chip
                            label={`${itens.length} ${itens.length === 1 ? "item" : "itens"}`}
                            size="small"
                            sx={{
                              bgcolor: "rgba(255, 255, 255, 0.2)",
                              color: "white",
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      )}
                    </Button>
                  </Tooltip>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Loading overlay */}
      {loading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(255, 255, 255, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography
              variant="h6"
              sx={{
                color: "#6b7280",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              Carregando carrinho...
            </Typography>
          </Box>
        </Box>
      )}

      {/* Snackbar para notificações */}
      <Snackbar
        open={!!pendingAction}
        autoHideDuration={6000}
        onClose={() => setPendingAction(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setPendingAction(null)}
          severity={pendingAction?.type || 'info'}
          sx={{
            width: '100%',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {pendingAction?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CarrinhoCompras;
