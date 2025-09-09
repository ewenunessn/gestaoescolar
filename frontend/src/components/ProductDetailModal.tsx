import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Grid,
  Chip,
  Divider,
  IconButton,
  Alert,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close,
  Business,
  AttachMoney,
  Inventory,
  Assignment,
  CalendarToday,
  Add,
  Remove,
  ShoppingCart,
} from '@mui/icons-material';
import { ProdutoContrato } from '../types/carrinho';

interface ProductDetailModalProps {
  produto: ProdutoContrato | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (quantidade: number) => void;
  quantidadeAtualCarrinho?: number;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  produto,
  open,
  onClose,
  onAddToCart,
  quantidadeAtualCarrinho = 0,
}) => {
  const [quantidade, setQuantidade] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (produto && open) {
      // Se já tem no carrinho, começar com a quantidade atual + 1
      setQuantidade(quantidadeAtualCarrinho > 0 ? quantidadeAtualCarrinho : 1);
      setError(null);
    }
  }, [produto, open, quantidadeAtualCarrinho]);

  if (!produto) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleQuantidadeChange = (newQuantidade: number) => {
    setError(null);
    
    if (newQuantidade < 1) {
      setError('Quantidade deve ser maior que zero');
      return;
    }
    
    if (newQuantidade > produto.quantidade_disponivel) {
      setError(`Quantidade máxima disponível: ${produto.quantidade_disponivel}`);
      return;
    }
    
    setQuantidade(newQuantidade);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value) || 0;
    handleQuantidadeChange(value);
  };

  const handleIncrement = () => {
    handleQuantidadeChange(quantidade + 1);
  };

  const handleDecrement = () => {
    handleQuantidadeChange(quantidade - 1);
  };

  const handleAddToCart = () => {
    if (error || quantidade < 1) return;
    
    // Validação adicional antes de adicionar
    if (quantidade > produto.quantidade_disponivel) {
      setError(`Quantidade máxima disponível: ${produto.quantidade_disponivel}`);
      return;
    }
    
    onAddToCart(quantidade);
    onClose();
  };

  const isDisponivel = produto.quantidade_disponivel > 0 && produto.contrato_ativo;
  const subtotal = quantidade * produto.preco_contratual;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
          Detalhes do Produto
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Informações principais */}
          <Grid item xs={12}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 'bold', color: 'primary.main' }}
            >
              {produto.nome_produto}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {!produto.contrato_ativo && (
                <Chip label="Contrato Inativo" color="error" size="small" />
              )}
              {produto.quantidade_disponivel <= 0 && (
                <Chip label="Esgotado" color="warning" size="small" />
              )}
              {quantidadeAtualCarrinho > 0 && (
                <Chip
                  label={`${quantidadeAtualCarrinho} no carrinho`}
                  color="success"
                  size="small"
                />
              )}
            </Box>
          </Grid>

          {/* Informações do fornecedor */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Business sx={{ mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Fornecedor
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {produto.nome_fornecedor}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Preço */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AttachMoney sx={{ mr: 1, color: 'success.main' }} />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Preço Contratual
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 'bold', color: 'success.main' }}
                >
                  {formatCurrency(produto.preco_contratual)}
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    / {produto.unidade}
                  </Typography>
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Disponibilidade */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Inventory sx={{ mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Quantidade Disponível
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {produto.quantidade_disponivel.toLocaleString('pt-BR')} {produto.unidade}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Contrato */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Assignment sx={{ mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Número do Contrato
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {produto.numero_contrato}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Vigência do contrato */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Vigência do Contrato
                </Typography>
                <Typography variant="body1">
                  {formatDate(produto.data_inicio)} até {formatDate(produto.data_fim)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* Seleção de quantidade */}
          {isDisponivel && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Selecionar Quantidade
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <IconButton
                  onClick={handleDecrement}
                  disabled={quantidade <= 1}
                  color="primary"
                >
                  <Remove />
                </IconButton>

                <TextField
                  type="number"
                  value={quantidade}
                  onChange={handleInputChange}
                  inputProps={{
                    min: 1,
                    max: produto.quantidade_disponivel,
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {produto.unidade}
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 120 }}
                  size="small"
                />

                <IconButton
                  onClick={handleIncrement}
                  disabled={quantidade >= produto.quantidade_disponivel}
                  color="primary"
                >
                  <Add />
                </IconButton>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Subtotal */}
              <Box
                sx={{
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  p: 2,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Subtotal: {formatCurrency(subtotal)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {quantidade} {produto.unidade} × {formatCurrency(produto.preco_contratual)}
                </Typography>
              </Box>
            </Grid>
          )}

          {/* Mensagem se não disponível */}
          {!isDisponivel && (
            <Grid item xs={12}>
              <Alert severity="warning">
                {!produto.contrato_ativo
                  ? 'Este produto não está disponível pois o contrato está inativo.'
                  : 'Este produto está temporariamente esgotado.'}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="outlined" size="large">
          Cancelar
        </Button>
        {isDisponivel && (
          <Button
            onClick={handleAddToCart}
            variant="contained"
            startIcon={<ShoppingCart />}
            disabled={!!error || quantidade < 1}
            size="large"
            sx={{ minWidth: 150 }}
          >
            {quantidadeAtualCarrinho > 0 ? 'Atualizar Carrinho' : 'Adicionar ao Carrinho'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProductDetailModal;