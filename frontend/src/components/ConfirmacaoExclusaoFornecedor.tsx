import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Warning,
  Business,
  Assignment,
} from '@mui/icons-material';
import { verificarRelacionamentosFornecedor } from '../services/fornecedores';

interface ConfirmacaoExclusaoFornecedorProps {
  open: boolean;
  fornecedor: {
    id: number;
    nome: string;
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmacaoExclusaoFornecedor: React.FC<ConfirmacaoExclusaoFornecedorProps> = ({
  open,
  fornecedor,
  onConfirm,
  onCancel
}) => {
  const [relacionamentos, setRelacionamentos] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && fornecedor) {
      carregarRelacionamentos();
    }
  }, [open, fornecedor]);

  const carregarRelacionamentos = async () => {
    if (!fornecedor) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await verificarRelacionamentosFornecedor(fornecedor.id);
      setRelacionamentos(data);
    } catch (err: any) {
      setError('Erro ao carregar relacionamentos do fornecedor');
      console.error('Erro ao carregar relacionamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!fornecedor) return null;

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return { bgcolor: '#dcfce7', color: '#059669' };
      case 'finalizado':
        return { bgcolor: '#f3f4f6', color: '#374151' };
      case 'cancelado':
        return { bgcolor: '#fee2e2', color: '#dc2626' };
      default:
        return { bgcolor: '#fef3c7', color: '#d97706' };
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          color: '#1f2937',
          borderBottom: '1px solid #e5e7eb',
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Warning sx={{ color: '#f59e0b' }} />
        Confirmar Exclusão de Fornecedor
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={40} />
            <Typography sx={{ mt: 2 }}>Verificando relacionamentos...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">
            {error}
          </Alert>
        ) : relacionamentos ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Business sx={{ color: '#4f46e5' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {relacionamentos.fornecedor}
              </Typography>
            </Box>

            {relacionamentos.podeExcluir ? (
              <Alert severity="success" sx={{ mb: 3 }}>
                <strong>Exclusão Permitida</strong><br/>
                Este fornecedor não possui contratos vinculados e pode ser excluído com segurança.
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 3 }}>
                <strong>Exclusão Bloqueada</strong><br/>
                Este fornecedor possui {relacionamentos.totalContratos} contratos vinculados 
                ({relacionamentos.contratosAtivos} ativos) e não pode ser excluído.
              </Alert>
            )}

            {relacionamentos.totalContratos > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment sx={{ color: '#059669' }} />
                  Contratos Vinculados ({relacionamentos.totalContratos})
                </Typography>

                <List sx={{ bgcolor: '#f9fafb', borderRadius: '8px', p: 1 }}>
                  {relacionamentos.contratos.slice(0, 5).map((contrato, index) => (
                    <React.Fragment key={contrato.id}>
                      <ListItem sx={{ py: 1 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                              <Typography sx={{ fontWeight: 600 }}>
                                {contrato.numero}
                              </Typography>
                              <Chip
                                label={contrato.status}
                                size="small"
                                sx={{
                                  ...getStatusColor(contrato.status),
                                  fontWeight: 600,
                                  textTransform: 'capitalize',
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', gap: 3, fontSize: '0.875rem', color: '#6b7280' }}>
                              <span>📅 {formatarData(contrato.dataInicio)} - {formatarData(contrato.dataFim)}</span>
                              <span>💰 {formatarMoeda(contrato.valorTotal)}</span>
                              <span>📦 {contrato.totalProdutos} produtos</span>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < Math.min(relacionamentos.contratos.length, 5) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>

                {relacionamentos.totalContratos > 5 && (
                  <Typography sx={{ mt: 2, color: '#6b7280', fontStyle: 'italic' }}>
                    ... e mais {relacionamentos.totalContratos - 5} contratos
                  </Typography>
                )}

                {!relacionamentos.podeExcluir && (
                  <Alert severity="info" sx={{ mt: 3 }}>
                    <strong>Para excluir este fornecedor:</strong><br/>
                    1. Finalize ou cancele todos os contratos ativos<br/>
                    2. Ou transfira os contratos para outro fornecedor<br/>
                    3. Ou desative o fornecedor em vez de excluí-lo
                  </Alert>
                )}
              </Box>
            )}

            {relacionamentos.podeExcluir && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                <strong>Atenção:</strong> Esta ação não pode ser desfeita. 
                Todos os dados do fornecedor serão permanentemente removidos.
              </Alert>
            )}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Carregando informações...</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid #e5e7eb' }}>
        <Button
          onClick={onCancel}
          sx={{
            color: '#6b7280',
            textTransform: 'none',
          }}
        >
          Cancelar
        </Button>

        {relacionamentos?.podeExcluir && !loading && (
          <Button
            onClick={onConfirm}
            variant="contained"
            color="error"
            sx={{
              textTransform: 'none',
            }}
          >
            Confirmar Exclusão
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmacaoExclusaoFornecedor;