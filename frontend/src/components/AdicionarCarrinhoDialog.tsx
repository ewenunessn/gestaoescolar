import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Close,
  ShoppingCart,
  Add,
  Remove,
  CheckCircle,
} from '@mui/icons-material';
import { ProdutoContrato } from '../types/carrinho';

interface AdicionarCarrinhoDialogProps {
  open: boolean;
  onClose: () => void;
  produto: ProdutoContrato | null;
  onAdicionarItem: (produto: ProdutoContrato, quantidade: number) => Promise<void>;
}

export default function AdicionarCarrinhoDialog({
  open,
  onClose,
  produto,
  onAdicionarItem
}: AdicionarCarrinhoDialogProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes or product changes
  useEffect(() => {
    if (open && produto) {
      setQuantidade(1);
      setError(null);
    }
  }, [open, produto]);

  const handleSubmit = async () => {
    if (!produto) return;

    if (quantidade < 1) {
      setError('Quantidade mínima é 1 unidade');
      return;
    }

    if (quantidade > produto.quantidade_disponivel) {
      setError(`Quantidade máxima disponível: ${produto.quantidade_disponivel.toLocaleString('pt-BR')} ${produto.unidade}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onAdicionarItem(produto, quantidade);
      onClose();
    } catch (error: any) {
      console.error('Erro ao adicionar produto ao carrinho:', error);
      let errorMessage = 'Erro ao adicionar produto ao carrinho';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Adicionar suporte para tecla Enter
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && open && !loading) {
        handleSubmit();
      }
    };

    if (open) {
      document.addEventListener('keypress', handleKeyPress);
      return () => document.removeEventListener('keypress', handleKeyPress);
    }
  }, [open, loading, handleSubmit]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getProductIcon = (productName: string) => {
    const name = productName.toLowerCase();
    if (name.includes('arroz')) return '🍚';
    if (name.includes('feijão')) return '🫘';
    if (name.includes('óleo')) return '🫒';
    if (name.includes('macarrão')) return '🍝';
    if (name.includes('carne')) return '🥩';
    if (name.includes('frango')) return '🍗';
    if (name.includes('leite')) return '🥛';
    if (name.includes('batata')) return '🥔';
    if (name.includes('cenoura')) return '🥕';
    if (name.includes('banana')) return '🍌';
    if (name.includes('pão')) return '🍞';
    if (name.includes('suco')) return '🧃';
    if (name.includes('açúcar')) return '🍯';
    if (name.includes('sal')) return '🧂';
    if (name.includes('farinha')) return '🌾';
    return '🍎';
  };

  const handleQuantidadeChange = (value: string) => {
    // Permitir campo vazio para facilitar digitação
    if (value === '') {
      setQuantidade(0);
      setError(null);
      return;
    }

    const numValue = parseInt(value);

    // Verificar se é um número válido
    if (isNaN(numValue)) {
      setError('Digite apenas números');
      return;
    }

    // Permitir qualquer valor durante a digitação, validar apenas no submit
    setQuantidade(numValue);

    // Limpar erro se o valor estiver dentro dos limites
    if (produto && numValue >= 1 && numValue <= produto.quantidade_disponivel) {
      setError(null);
    }
  };

  const incrementQuantidade = () => {
    if (produto && quantidade < produto.quantidade_disponivel) {
      setQuantidade(prev => prev + 1);
      setError(null);
    }
  };

  const decrementQuantidade = () => {
    if (quantidade > 1) {
      setQuantidade(prev => prev - 1);
      setError(null);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!produto) {
    return null;
  }

  const valorTotal = quantidade * produto.preco_contratual;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          minHeight: '500px'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ShoppingCart sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Adicionar ao Carrinho
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={loading}
            sx={{ color: 'grey.500' }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Informações do Produto */}
        <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  mr: 2,
                  flexShrink: 0,
                }}
              >
                {getProductIcon(produto.nome_produto)}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {produto.nome_produto}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {produto.nome_fornecedor}
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Unidade:</strong>
                </Typography>
                <Typography variant="body1">
                  {produto.unidade}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Preço Unitário:</strong>
                </Typography>
                <Typography variant="body1" color="primary.main" fontWeight="medium">
                  {formatPrice(produto.preco_contratual)}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Disponível:</strong>
                </Typography>
                <Typography variant="body1" color="success.main" fontWeight="medium">
                  {produto.quantidade_disponivel} {produto.unidade}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Contrato:</strong>
                </Typography>
                <Typography variant="body1">
                  {produto.numero_contrato}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Seleção de Quantidade */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
            Quantidade
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton
              onClick={decrementQuantidade}
              disabled={quantidade <= 1 || loading}
              sx={{
                border: '1px solid',
                borderColor: 'grey.300',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'primary.50',
                }
              }}
            >
              <Remove />
            </IconButton>

            <TextField
              type="number"
              value={quantidade === 0 ? '' : quantidade}
              onChange={(e) => handleQuantidadeChange(e.target.value)}
              disabled={loading}
              placeholder="Digite a quantidade"
              sx={{
                width: 160,
                '& .MuiOutlinedInput-root': {
                  textAlign: 'center',
                }
              }}
              inputProps={{
                min: 1,
                max: produto.quantidade_disponivel,
                style: { textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" color="text.secondary">
                      {produto.unidade}
                    </Typography>
                  </InputAdornment>
                ),
              }}
            />

            <IconButton
              onClick={incrementQuantidade}
              disabled={quantidade >= produto.quantidade_disponivel || loading}
              sx={{
                border: '1px solid',
                borderColor: 'grey.300',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'primary.50',
                }
              }}
            >
              <Add />
            </IconButton>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Máximo disponível: {produto.quantidade_disponivel.toLocaleString('pt-BR')} {produto.unidade}
          </Typography>
          <Typography variant="body2" color="primary.main" sx={{ mt: 0.5, fontWeight: 'medium' }}>
            💡 Dica: Digite diretamente a quantidade desejada no campo acima
          </Typography>

          {/* Sugestões de Quantidade */}
          {produto.quantidade_disponivel > 10 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Quantidades sugeridas:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[10, 50, 100, 500, 1000].map(qty => {
                  if (qty <= produto.quantidade_disponivel) {
                    return (
                      <Button
                        key={qty}
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setQuantidade(qty);
                          setError(null);
                        }}
                        disabled={loading}
                        sx={{
                          minWidth: 'auto',
                          px: 1.5,
                          py: 0.5,
                          fontSize: '0.75rem',
                          borderColor: 'grey.300',
                          color: 'text.secondary',
                          '&:hover': {
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            bgcolor: 'primary.50',
                          }
                        }}
                      >
                        {qty.toLocaleString('pt-BR')}
                      </Button>
                    );
                  }
                  return null;
                })}
                {produto.quantidade_disponivel > 1000 && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setQuantidade(produto.quantidade_disponivel);
                      setError(null);
                    }}
                    disabled={loading}
                    sx={{
                      minWidth: 'auto',
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.75rem',
                      borderColor: 'success.main',
                      color: 'success.main',
                      '&:hover': {
                        borderColor: 'success.dark',
                        color: 'success.dark',
                        bgcolor: 'success.50',
                      }
                    }}
                  >
                    Máximo
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {/* Resumo do Valor */}
        <Card sx={{
          bgcolor: quantidade > 0 ? 'primary.50' : 'grey.50',
          border: '1px solid',
          borderColor: quantidade > 0 ? 'primary.200' : 'grey.200',
          transition: 'all 0.3s ease'
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1">
                {quantidade > 0 ? quantidade.toLocaleString('pt-BR') : '0'} × {formatPrice(produto.preco_contratual)}
              </Typography>
              <Typography
                variant="h6"
                color={quantidade > 0 ? 'primary.main' : 'text.secondary'}
                fontWeight="bold"
                sx={{ fontSize: '1.25rem' }}
              >
                {formatPrice(valorTotal)}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {quantidade > 0
                ? `Valor total a ser adicionado ao carrinho`
                : 'Digite a quantidade para ver o valor total'
              }
            </Typography>
            {quantidade > produto.quantidade_disponivel && (
              <Typography variant="body2" color="error.main" sx={{ mt: 1, fontWeight: 'medium' }}>
                ⚠️ Quantidade excede o disponível ({produto.quantidade_disponivel.toLocaleString('pt-BR')} {produto.unidade})
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Erro */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          color="inherit"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || quantidade < 1 || quantidade > produto.quantidade_disponivel}
          startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
          sx={{
            minWidth: 160,
            bgcolor: 'primary.main',
            fontSize: '1rem',
            fontWeight: 'bold',
            '&:hover': {
              bgcolor: 'primary.dark',
            }
          }}
        >
          {loading ? 'Adicionando...' : `Adicionar ${quantidade > 0 ? quantidade.toLocaleString('pt-BR') : ''} ao Carrinho`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}