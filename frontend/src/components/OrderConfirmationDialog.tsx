import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { CarrinhoAgrupado, ConfirmarPedidoResponse } from '../types/carrinho';

interface OrderConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  fornecedorGroup: CarrinhoAgrupado | null;
  onConfirm: (fornecedorId: number) => Promise<ConfirmarPedidoResponse>;
  loading?: boolean;
}

const OrderConfirmationDialog: React.FC<OrderConfirmationDialogProps> = ({
  open,
  onClose,
  fornecedorGroup,
  onConfirm,
  loading = false
}) => {
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState<ConfirmarPedidoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!fornecedorGroup) return;

    try {
      setError(null);
      setConfirming(true);
      
      // Validação adicional antes de confirmar
      if (fornecedorGroup.itens.length === 0) {
        setError('Nenhum item encontrado para confirmar');
        return;
      }
      
      const response = await onConfirm(fornecedorGroup.fornecedor_id);
      setSuccess(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao confirmar pedido';
      setError(errorMessage);
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    setSuccess(null);
    setError(null);
    setConfirming(false);
    onClose();
  };

  if (!fornecedorGroup) return null;

  // Tela de sucesso
  if (success) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          
          <Typography variant="h5" gutterBottom>
            Pedido Confirmado!
          </Typography>
          
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Seu pedido foi criado com sucesso
          </Typography>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Número do Pedido
            </Typography>
            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
              {success.numero_pedido}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Valor Total
            </Typography>
            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
              R$ {success.valor_total.toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            onClick={handleClose}
            size="large"
          >
            Continuar Comprando
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Confirmar Pedido - {fornecedorGroup.nome_fornecedor}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        <Typography variant="body1" gutterBottom>
          Você está prestes a confirmar um pedido com os seguintes itens:
        </Typography>
        
        <List sx={{ mt: 2 }}>
          {fornecedorGroup.itens.map((item, index) => (
            <React.Fragment key={item.id}>
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  primary={item.nome_produto || `Produto ${item.produto_id}`}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Quantidade: {item.quantidade} {item.unidade || 'UN'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Preço unitário: R$ {item.preco_unitario.toFixed(2)}
                      </Typography>
                    </Box>
                  }
                />
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                </Typography>
              </ListItem>
              {index < fornecedorGroup.itens.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Total do Pedido:
          </Typography>
          <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
            R$ {fornecedorGroup.subtotal.toFixed(2)}
          </Typography>
        </Box>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Após a confirmação, este pedido será enviado para o fornecedor e os itens serão removidos do seu carrinho.
            Esta ação não pode ser desfeita.
          </Typography>
        </Alert>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={handleClose}
          disabled={confirming}
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={confirming || loading}
          variant="contained"
          color="primary"
          startIcon={confirming ? <CircularProgress size={20} /> : null}
        >
          {confirming ? 'Confirmando...' : 'Confirmar Pedido'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderConfirmationDialog;