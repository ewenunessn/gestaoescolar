import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { listarAditivosContrato, listarProdutosContrato, criarAditivo, validarAditivoQuantidade } from '../services/aditivosContratos';
import api from '../services/api';

interface AditivoContrato {
  id: number;
  contrato_id: number;
  contrato_produto_id?: number;
  tipo: 'QUANTIDADE' | 'PRAZO';
  quantidade_adicional?: number;
  percentual_aumento?: number;
  dias_adicionais?: number;
  nova_data_fim?: string;
  justificativa: string;
  numero_aditivo?: string;
  data_assinatura: string;
  valor_adicional?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Campos adicionais
  contrato_numero?: string;
  produto_nome?: string;
  quantidade_original?: number;
  fornecedor_nome?: string;
}

interface ProdutoContrato {
  id: number;
  produto_id: number;
  produto_nome: string;
  quantidade_original: number;
  quantidade_atual: number;
  total_aditivos: number;
  percentual_aditivos: number;
}

interface AditivosContratoProps {
  contratoId: number;
  contratoNumero: string;
  dataFimContrato: string;
  onAtualizarContrato?: () => void;
}

const AditivosContrato: React.FC<AditivosContratoProps> = ({
  contratoId,
  contratoNumero,
  dataFimContrato,
  onAtualizarContrato
}) => {
  const [aditivos, setAditivos] = useState<AditivoContrato[]>([]);
  const [produtosContrato, setProdutosContrato] = useState<ProdutoContrato[]>([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [tipoAditivo, setTipoAditivo] = useState<'QUANTIDADE' | 'PRAZO'>('QUANTIDADE');
  const [formData, setFormData] = useState({
    contrato_produto_id: '',
    quantidade_adicional: '',
    dias_adicionais: '',
    nova_data_fim: '',
    justificativa: '',
    numero_aditivo: '',
    data_assinatura: format(new Date(), 'yyyy-MM-dd'),
    valor_adicional: '0'
  });
  const [validacao, setValidacao] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    carregarAditivos();
    if (tipoAditivo === 'QUANTIDADE') {
      carregarProdutosContrato();
    }
  }, [contratoId, tipoAditivo]);

  const carregarAditivos = async () => {
    try {
      setLoading(true);
      const aditivos = await listarAditivosContrato(contratoId);
      setAditivos(aditivos || []);
    } catch (error: any) {
      if (!error.message.includes('404')) {
        console.error('Erro ao carregar aditivos:', error);
        setError('Erro ao carregar aditivos do contrato');
      }
    } finally {
      setLoading(false);
    }
  };

  const carregarProdutosContrato = async () => {
    try {
      const produtos = await listarProdutosContrato(contratoId);
      setProdutosContrato(produtos || []);
    } catch (error: any) {
      if (!error.message.includes('404')) {
        console.error('Erro ao carregar produtos do contrato:', error);
      }
    }
  };

  const validarAditivoQuantidadeLocal = async (contratoProdutoId: string, quantidadeAdicional: string) => {
    if (!contratoProdutoId || !quantidadeAdicional) {
      setValidacao(null);
      return;
    }

    try {
      const validacao = await validarAditivoQuantidade(
        parseInt(contratoProdutoId),
        parseFloat(quantidadeAdicional)
      );
      setValidacao(validacao);
    } catch (error: any) {
      console.error('Erro ao validar aditivo:', error);
      setValidacao(null);
    }
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setSuccess(null);

      const dadosAditivo = {
        contrato_id: contratoId,
        tipo: tipoAditivo,
        justificativa: formData.justificativa,
        numero_aditivo: formData.numero_aditivo,
        data_assinatura: formData.data_assinatura,
        valor_adicional: parseFloat(formData.valor_adicional) || 0,
        ...(tipoAditivo === 'QUANTIDADE' && {
          contrato_produto_id: parseInt(formData.contrato_produto_id),
          quantidade_adicional: parseFloat(formData.quantidade_adicional)
        }),
        ...(tipoAditivo === 'PRAZO' && {
          ...(formData.dias_adicionais && { dias_adicionais: parseInt(formData.dias_adicionais) }),
          ...(formData.nova_data_fim && { nova_data_fim: formData.nova_data_fim })
        })
      };

      await criarAditivo(dadosAditivo);
      
      setSuccess('Aditivo criado com sucesso!');
      setOpenModal(false);
      resetForm();
      carregarAditivos();
      if (tipoAditivo === 'QUANTIDADE') {
        carregarProdutosContrato();
      }
      if (onAtualizarContrato) {
        onAtualizarContrato();
      }
    } catch (error: any) {
      console.error('Erro ao criar aditivo:', error);
      setError(error.response?.data?.error || 'Erro ao criar aditivo');
    }
  };

  const handleRemover = async (aditivoId: number) => {
    if (!window.confirm('Tem certeza que deseja remover este aditivo?')) {
      return;
    }

    try {
      setError(null);
      await api.delete(`/api/aditivos-contratos/${aditivoId}`);
      setSuccess('Aditivo removido com sucesso!');
      carregarAditivos();
      if (tipoAditivo === 'QUANTIDADE') {
        carregarProdutosContrato();
      }
      if (onAtualizarContrato) {
        onAtualizarContrato();
      }
    } catch (error: any) {
      console.error('Erro ao remover aditivo:', error);
      setError(error.response?.data?.error || 'Erro ao remover aditivo');
    }
  };

  const resetForm = () => {
    setFormData({
      contrato_produto_id: '',
      quantidade_adicional: '',
      dias_adicionais: '',
      nova_data_fim: '',
      justificativa: '',
      numero_aditivo: '',
      data_assinatura: format(new Date(), 'yyyy-MM-dd'),
      valor_adicional: '0'
    });
    setValidacao(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    resetForm();
  };

  // Efeito para validar aditivo de quantidade em tempo real
  useEffect(() => {
    if (tipoAditivo === 'QUANTIDADE' && formData.contrato_produto_id && formData.quantidade_adicional) {
      const timeoutId = setTimeout(() => {
        validarAditivoQuantidadeLocal(formData.contrato_produto_id, formData.quantidade_adicional);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.contrato_produto_id, formData.quantidade_adicional, tipoAditivo]);

  const aditivosQuantidade = aditivos.filter(a => a.tipo === 'QUANTIDADE');
  const aditivosPrazo = aditivos.filter(a => a.tipo === 'PRAZO');

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Aditivos Contratuais ({aditivos.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenModal}
        >
          Novo Aditivo
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {aditivos.length === 0 ? (
        <Alert severity="info">
          Este contrato ainda não possui aditivos.
        </Alert>
      ) : (
        <Box>
          {/* Aditivos de Quantidade */}
          {aditivosQuantidade.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon color="primary" />
                  <Typography variant="subtitle1">
                    Aditivos de Quantidade ({aditivosQuantidade.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produto</TableCell>
                        <TableCell>Qtd. Adicional</TableCell>
                        <TableCell>Percentual</TableCell>
                        <TableCell>Data Assinatura</TableCell>
                        <TableCell>Justificativa</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {aditivosQuantidade.map((aditivo) => (
                        <TableRow key={aditivo.id}>
                          <TableCell>{aditivo.produto_nome || 'N/A'}</TableCell>
                          <TableCell>{aditivo.quantidade_adicional}</TableCell>
                          <TableCell>
                            {aditivo.percentual_aumento ? `${aditivo.percentual_aumento}%` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(aditivo.data_assinatura), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 200 }}>
                              {aditivo.justificativa}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={aditivo.ativo ? 'Ativo' : 'Inativo'}
                              color={aditivo.ativo ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemover(aditivo.id)}
                              title="Remover Aditivo"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Aditivos de Prazo */}
          {aditivosPrazo.length > 0 && (
            <Accordion sx={{ mt: aditivosQuantidade.length > 0 ? 1 : 0 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="secondary" />
                  <Typography variant="subtitle1">
                    Aditivos de Prazo ({aditivosPrazo.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Dias Adicionais</TableCell>
                        <TableCell>Nova Data Fim</TableCell>
                        <TableCell>Data Assinatura</TableCell>
                        <TableCell>Justificativa</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {aditivosPrazo.map((aditivo) => (
                        <TableRow key={aditivo.id}>
                          <TableCell>{aditivo.dias_adicionais || 'N/A'}</TableCell>
                          <TableCell>
                            {aditivo.nova_data_fim
                              ? format(new Date(aditivo.nova_data_fim), 'dd/MM/yyyy', { locale: ptBR })
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell>
                            {format(new Date(aditivo.data_assinatura), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 200 }}>
                              {aditivo.justificativa}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={aditivo.ativo ? 'Ativo' : 'Inativo'}
                              color={aditivo.ativo ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemover(aditivo.id)}
                              title="Remover Aditivo"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

      {/* Modal para criar novo aditivo */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>Novo Aditivo Contratual</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Seleção do tipo de aditivo */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Tipo de Aditivo</InputLabel>
              <Select
                value={tipoAditivo}
                label="Tipo de Aditivo"
                onChange={(e) => setTipoAditivo(e.target.value as 'QUANTIDADE' | 'PRAZO')}
              >
                <MenuItem value="QUANTIDADE">Aditivo de Quantidade</MenuItem>
                <MenuItem value="PRAZO">Aditivo de Prazo</MenuItem>
              </Select>
            </FormControl>

            {/* Campos específicos para aditivo de quantidade */}
            {tipoAditivo === 'QUANTIDADE' && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Produto</InputLabel>
                  <Select
                    value={formData.contrato_produto_id}
                    label="Produto"
                    onChange={(e) => setFormData({ ...formData, contrato_produto_id: e.target.value })}
                    required
                  >
                    {produtosContrato.map((produto) => (
                      <MenuItem key={produto.id} value={produto.id}>
                        {produto.produto_nome} (Atual: {produto.quantidade_atual} | Aditivos: {produto.percentual_aditivos}%)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Quantidade Adicional"
                  type="number"
                  value={formData.quantidade_adicional}
                  onChange={(e) => setFormData({ ...formData, quantidade_adicional: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                />

                {/* Exibir validação */}
                {validacao && (
                  <Alert 
                    severity={validacao.pode_adicionar ? 'success' : 'error'} 
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="body2">
                      <strong>Produto:</strong> {validacao.produto_nome}<br/>
                      <strong>Quantidade Original:</strong> {validacao.quantidade_original}<br/>
                      <strong>Aditivos Existentes:</strong> {validacao.total_aditivos_existentes} ({validacao.percentual_atual}%)<br/>
                      <strong>Novo Percentual:</strong> {validacao.percentual_novo}%<br/>
                      <strong>Disponível:</strong> {validacao.quantidade_maxima_disponivel} ({validacao.percentual_disponivel}%)
                    </Typography>
                    {!validacao.pode_adicionar && (
                      <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                        ⚠️ Esta quantidade ultrapassaria o limite de 25% de aditivos!
                      </Typography>
                    )}
                  </Alert>
                )}
              </>
            )}

            {/* Campos específicos para aditivo de prazo */}
            {tipoAditivo === 'PRAZO' && (
              <>
                <TextField
                  label="Dias Adicionais"
                  type="number"
                  value={formData.dias_adicionais}
                  onChange={(e) => setFormData({ ...formData, dias_adicionais: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                  inputProps={{ min: 1 }}
                  helperText="Ou informe a nova data fim abaixo"
                />

                <TextField
                  label="Nova Data Fim"
                  type="date"
                  value={formData.nova_data_fim}
                  onChange={(e) => setFormData({ ...formData, nova_data_fim: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: dataFimContrato }}
                  helperText="Ou informe os dias adicionais acima"
                />
              </>
            )}

            {/* Campos comuns */}
            <TextField
              label="Número do Aditivo"
              value={formData.numero_aditivo}
              onChange={(e) => setFormData({ ...formData, numero_aditivo: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
              helperText="Opcional - número de identificação do aditivo"
            />

            <TextField
              label="Data de Assinatura"
              type="date"
              value={formData.data_assinatura}
              onChange={(e) => setFormData({ ...formData, data_assinatura: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
              required
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Valor Adicional"
              type="number"
              value={formData.valor_adicional}
              onChange={(e) => setFormData({ ...formData, valor_adicional: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Valor adicional ao contrato (opcional)"
            />

            <TextField
              label="Justificativa"
              value={formData.justificativa}
              onChange={(e) => setFormData({ ...formData, justificativa: e.target.value })}
              fullWidth
              multiline
              rows={3}
              required
              helperText="Descreva o motivo do aditivo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.justificativa || 
              (tipoAditivo === 'QUANTIDADE' && (!formData.contrato_produto_id || !formData.quantidade_adicional || (validacao && !validacao.pode_adicionar))) ||
              (tipoAditivo === 'PRAZO' && (!formData.dias_adicionais && !formData.nova_data_fim))
            }
          >
            Criar Aditivo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AditivosContrato;