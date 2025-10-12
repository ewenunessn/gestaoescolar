import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import faturamentoService from '../services/faturamento';
import type { FaturamentoDetalhado } from '../types/faturamento';
import { formatarMoeda } from '../utils/dateUtils';

interface ModalVisualizarFaturamentoProps {
  open: boolean;
  onClose: () => void;
  faturamentoId: number;
}

export default function ModalVisualizarFaturamento({
  open,
  onClose,
  faturamentoId
}: ModalVisualizarFaturamentoProps) {
  const [loading, setLoading] = useState(false);
  const [faturamento, setFaturamento] = useState<FaturamentoDetalhado | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (open && faturamentoId) {
      carregarFaturamento();
    }
  }, [open, faturamentoId]);

  const carregarFaturamento = async () => {
    try {
      setLoading(true);
      setErro('');
      
      const dados = await faturamentoService.buscarPorId(faturamentoId);
      setFaturamento(dados);
      
    } catch (error: any) {
      console.error('Erro ao carregar faturamento:', error);
      setErro(error.response?.data?.message || 'Erro ao carregar faturamento');
    } finally {
      setLoading(false);
    }
  };

  const calcularResumoModalidades = () => {
    if (!faturamento) return [];

    const resumoPorModalidade: { [key: string]: any } = {};

    // Agregar dados por modalidade
    faturamento.itens.forEach(item => {
      const key = item.modalidade_nome;
      
      if (!resumoPorModalidade[key]) {
        resumoPorModalidade[key] = {
          nome: item.modalidade_nome,
          codigo_financeiro: item.modalidade_codigo_financeiro,
          quantidade: 0,
          percentual: item.percentual_modalidade,
          valor: 0
        };
      }
      
      resumoPorModalidade[key].quantidade += Number(item.quantidade_modalidade || 0);
      resumoPorModalidade[key].valor += Number(item.valor_total || 0);
    });

    return Object.values(resumoPorModalidade).sort((a: any, b: any) => b.valor - a.valor);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon />
          <Typography variant="h6">
            {faturamento ? `Faturamento ${faturamento.numero}` : 'Visualizar Faturamento'}
          </Typography>
        </Box>
        <Button onClick={onClose} color="inherit" size="small">
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent>
        {erro && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>
            {erro}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Carregando faturamento...</Typography>
          </Box>
        )}

        {faturamento && !loading && (
          <Box>
            {/* Informações do Faturamento */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                {faturamento.numero}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip 
                  label={faturamento.status} 
                  color={faturamento.status === 'gerado' ? 'primary' : 'success'}
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">
                  Valor Total: <strong>{formatarMoeda(faturamento.valor_total)}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Itens: <strong>{faturamento.itens.length}</strong>
                </Typography>
              </Box>
            </Box>

            {/* Resumo por Modalidade */}
            <Typography variant="h6" gutterBottom>
              Resumo por Modalidade
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        Modalidade
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Qtd. Modalidade
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Percentual
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Valor
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {calcularResumoModalidades().map((modalidade, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {modalidade.nome}
                          </Typography>
                          {modalidade.codigo_financeiro && (
                            <Typography variant="caption" color="text.secondary">
                              {modalidade.codigo_financeiro}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color="primary"
                        >
                          {modalidade.quantidade}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {Number(modalidade.percentual || 0).toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color="primary"
                        >
                          {formatarMoeda(modalidade.valor)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {faturamento.observacoes && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Observações:
                </Typography>
                <Typography variant="body2">
                  {faturamento.observacoes}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}