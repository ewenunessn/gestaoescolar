import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Remove as RemoveIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { CarrinhoItem } from '../types/carrinho';

interface CartItemProps {
  item: CarrinhoItem;
  onUpdateQuantity: (itemId: number, quantidade: number) => Promise<void>;
  onRemoveItem: (itemId: number) => Promise<void>;
  loading?: boolean;
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemoveItem,
  loading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [quantidade, setQuantidade] = useState(item.quantidade || 1);
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [tentativaQuantidade, setTentativaQuantidade] = useState(0);

  // Sincronizar quantidade quando o item muda
  useEffect(() => {
    if (item.quantidade && item.quantidade !== quantidade) {
      setQuantidade(item.quantidade);
    }
  }, [item.quantidade]);

  const subtotal = quantidade * (Number(item.preco_unitario) || 0);

  const handleQuantityChange = async (novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      setError('Quantidade deve ser maior que zero');
      return;
    }

    // Validação preventiva baseada na quantidade disponível
    if (item.quantidade_disponivel && novaQuantidade > item.quantidade_disponivel) {
      setError(`Máximo disponível: ${item.quantidade_disponivel} ${item.unidade || 'unidades'}`);
      setQuantidade(item.quantidade_disponivel);
      return;
    }

    try {
      setError(null);
      setUpdating(true);

      // Atualização otimista da UI
      const quantidadeAnterior = quantidade;
      setQuantidade(novaQuantidade);

      if (!item.id) {
        throw new Error('ID do item não encontrado');
      }

      await onUpdateQuantity(item.id, novaQuantidade);
    } catch (error: any) {
      // Reverter em caso de erro
      setQuantidade(item.quantidade);

      let errorMessage = 'Erro ao atualizar quantidade';

      // Extrair informações detalhadas do erro da API
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (errorData.quantidade_disponivel !== undefined) {
          errorMessage = `Máximo disponível: ${errorData.quantidade_disponivel} ${item.unidade || 'unidades'}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);

      // Limpar erro após alguns segundos
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async () => {
    try {
      setError(null);
      setRemoving(true);
      await onRemoveItem(item.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao remover item');
      setRemoving(false);
    }
  };

  const handleQuantityInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value) || 0;
    if (value > 0) {
      setQuantidade(value);
    }
  };

  const handleQuantityInputBlur = () => {
    if (quantidade !== item.quantidade && quantidade > 0) {
      // Verificar se excede o limite antes de tentar atualizar
      if (item.quantidade_disponivel && quantidade > item.quantidade_disponivel) {
        setTentativaQuantidade(quantidade);
        setShowLimitDialog(true);
        return;
      }
      handleQuantityChange(quantidade);
    } else {
      setQuantidade(item.quantidade);
    }
  };

  const handleAcceptLimit = () => {
    setQuantidade(item.quantidade_disponivel || 1);
    setShowLimitDialog(false);
    handleQuantityChange(item.quantidade_disponivel || 1);
  };

  const handleCancelLimit = () => {
    setQuantidade(item.quantidade);
    setShowLimitDialog(false);
  };

  const handleQuantityInputKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleQuantityInputBlur();
    }
  };

  return (
    <Fade in={true} timeout={400}>
      <Card
        sx={{
          mb: 2,
          opacity: removing ? 0.5 : 1,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: theme.shadows[4],
            transform: isMobile ? 'none' : 'translateY(-2px)',
          }
        }}
      >
        <CardContent>
          {error && (
            <Slide direction="down" in={!!error} timeout={300}>
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            </Slide>
          )}

          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 2 : 0
          }}>
            <Box sx={{ flex: 1, mb: isMobile ? 2 : 0 }}>
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                component="h3"
                gutterBottom
                sx={{ fontWeight: 'bold' }}
              >
                {item.nome_produto || `Produto ${item.produto_id}`}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Unidade: {item.unidade || 'UN'}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Preço unitário: R$ {(item.preco_unitario || 0).toFixed(2)}
              </Typography>

              {item.quantidade_disponivel && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Disponível: {item.quantidade_disponivel} {item.unidade || 'unidades'}
                </Typography>
              )}
            </Box>

            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 1 : 2,
              flexDirection: isMobile ? 'row' : 'row',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'space-between' : 'flex-end'
            }}>
              {/* Controles de quantidade */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => handleQuantityChange(quantidade - 1)}
                  disabled={quantidade <= 1 || updating || loading}
                  sx={{
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: isMobile ? 'none' : 'scale(1.1)',
                    }
                  }}
                >
                  <RemoveIcon />
                </IconButton>

                <TextField
                  size="small"
                  type="number"
                  value={quantidade}
                  onChange={handleQuantityInputChange}
                  onBlur={handleQuantityInputBlur}
                  onKeyPress={handleQuantityInputKeyPress}
                  disabled={updating || loading}
                  inputProps={{
                    min: 1,
                    style: { textAlign: 'center', width: isMobile ? '50px' : '60px' }
                  }}
                  sx={{ width: isMobile ? '70px' : '80px' }}
                />

                <IconButton
                  size="small"
                  onClick={() => handleQuantityChange(quantidade + 1)}
                  disabled={
                    updating ||
                    loading ||
                    (item.quantidade_disponivel && quantidade >= item.quantidade_disponivel)
                  }
                  sx={{
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: isMobile ? 'none' : 'scale(1.1)',
                    }
                  }}
                >
                  <AddIcon />
                </IconButton>

                {updating && <CircularProgress size={16} />}
              </Box>

              {/* Botão remover */}
              <IconButton
                color="error"
                onClick={handleRemove}
                disabled={removing || loading}
                title="Remover item"
                sx={{
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: isMobile ? 'none' : 'scale(1.1)',
                    bgcolor: 'error.light',
                    color: 'white',
                  }
                }}
              >
                {removing ? <CircularProgress size={20} color="error" /> : <DeleteIcon />}
              </IconButton>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 1 : 0
          }}>
            <Typography variant="body2" color="text.secondary">
              {quantidade} x R$ {(item.preco_unitario || 0).toFixed(2)}
            </Typography>

            <Typography
              variant={isMobile ? "h6" : "h6"}
              color="primary.main"
              sx={{ fontWeight: 'bold' }}
            >
              R$ {subtotal.toFixed(2)}
            </Typography>
          </Box>
        </CardContent>

        {/* Dialog de limite de quantidade */}
        <Dialog
          open={showLimitDialog}
          onClose={handleCancelLimit}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Limite de Quantidade Excedido
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Você tentou adicionar <strong>{tentativaQuantidade}</strong> {item.unidade || 'unidades'} de <strong>{item.nome_produto}</strong>.
            </Typography>
            <Typography variant="body1" gutterBottom>
              A quantidade máxima disponível é <strong>{item.quantidade_disponivel}</strong> {item.unidade || 'unidades'}.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deseja ajustar para a quantidade máxima disponível?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelLimit} color="secondary">
              Cancelar
            </Button>
            <Button onClick={handleAcceptLimit} variant="contained" color="primary">
              OK - Ajustar para {item.quantidade_disponivel}
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
    </Fade>
  );
};

export default CartItem;