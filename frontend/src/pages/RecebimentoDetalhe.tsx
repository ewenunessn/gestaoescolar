import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Button,
  Tab,
  Tabs,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  Receipt,
  CalendarToday,
  Description,
  Person,
  CheckCircle,
  AccessTime,
  Warning,
  Download,
  Visibility,
  LocalShipping,
  ArrowBack,
  Edit,
  Save,
  Cancel,
} from "@mui/icons-material";
import {
  recebimentoModernoService,
  RecebimentoModerno,
  RecebimentoItem,
  formatarStatusRecebimento,
  formatarStatusItem,
  formatarData,
  formatarPreco
} from "../services/recebimentoModernoService";
// import RecebimentoItens from "../components/RecebimentoItens"; // Componente removido

const RecebimentoDetalhe: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [recebimento, setRecebimento] = useState<RecebimentoModerno | null>(null);
  const [itens, setItens] = useState<RecebimentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [observacoesFinalizar, setObservacoesFinalizar] = useState("");

  useEffect(() => {
    if (id) {
      carregarRecebimento();
    }
  }, [id]);

  const carregarRecebimento = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await recebimentoModernoService.buscarRecebimento(Number(id));
      console.log('🔍 DEBUG RecebimentoDetalhe - Resposta da API:', response);
      console.log('🔍 DEBUG RecebimentoDetalhe - itensPorFornecedor:', response.data.itensPorFornecedor);
      
      setRecebimento(response.data);
      
      // Extrair itens dos fornecedores
      const todosItens: RecebimentoItem[] = [];
      if (response.data.itensPorFornecedor) {
        console.log('🔍 DEBUG RecebimentoDetalhe - Fornecedores encontrados:', Object.keys(response.data.itensPorFornecedor));
        Object.values(response.data.itensPorFornecedor).forEach((fornecedor: any) => {
          console.log('🔍 DEBUG RecebimentoDetalhe - Fornecedor:', fornecedor);
          if (fornecedor.itens && Array.isArray(fornecedor.itens)) {
            console.log('🔍 DEBUG RecebimentoDetalhe - Itens do fornecedor:', fornecedor.itens.length);
            todosItens.push(...fornecedor.itens);
          }
        });
      }
      
      console.log('📦 DEBUG RecebimentoDetalhe - Total de itens extraídos:', todosItens.length);
      console.log('📦 DEBUG RecebimentoDetalhe - Itens:', todosItens);
      setItens(todosItens);
    } catch (error) {
      console.error('Erro ao carregar recebimento:', error);
      setError('Erro ao carregar detalhes do recebimento');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FINALIZADO': return 'text-green-700 bg-green-100 border-green-200';
      case 'EM_ANDAMENTO': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'PARCIAL': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'PENDENTE': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'CANCELADO': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'FINALIZADO': return <CheckCircle sx={{ width: 16, height: 16 }} />;
      case 'EM_ANDAMENTO': return <AccessTime sx={{ width: 16, height: 16 }} />;
      case 'PARCIAL': return <Warning sx={{ width: 16, height: 16 }} />;
      case 'PENDENTE': return <AccessTime sx={{ width: 16, height: 16 }} />;
      case 'CANCELADO': return <Cancel sx={{ width: 16, height: 16 }} />;
      default: return <AccessTime sx={{ width: 16, height: 16 }} />;
    }
  };

  const getItemStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETO': return <CheckCircle sx={{ width: 16, height: 16 }} />;
      case 'PARCIAL': return <Warning sx={{ width: 16, height: 16 }} />;
      case 'PENDENTE': return <AccessTime sx={{ width: 16, height: 16 }} />;
      case 'EXCEDENTE': return <Warning sx={{ width: 16, height: 16 }} />;
      default: return <AccessTime sx={{ width: 16, height: 16 }} />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleFinalizarRecebimento = () => {
    setModalFinalizar(true);
  };

  const confirmarFinalizarRecebimento = async () => {
    if (!id) return;

    try {
      setLoading(true);
      await recebimentoModernoService.finalizarRecebimento(Number(id), observacoesFinalizar);
      
      setModalFinalizar(false);
      setObservacoesFinalizar("");
      await carregarRecebimento();
      
      // Mostrar mensagem de sucesso (você pode implementar um toast aqui)
      alert("Recebimento finalizado com sucesso!");
    } catch (error) {
      console.error('Erro ao finalizar recebimento:', error);
      alert("Erro ao finalizar recebimento");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !recebimento) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Recebimento não encontrado'}</Alert>
      </Box>
    );
  }

  const totalRecebido = itens.reduce((sum, item) => sum + (item.quantidade_recebida * item.preco_unitario), 0);
  const totalEsperado = itens.reduce((sum, item) => sum + (item.quantidade_esperada * item.preco_unitario), 0);
  const totalPendente = totalEsperado - totalRecebido;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Paper sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottom: '1px solid #e5e7eb' }}>
        <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <IconButton onClick={() => navigate('/recebimentos')} sx={{ color: '#6b7280' }}>
                  <ArrowBack />
                </IconButton>
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#1f2937' }}>
                  Detalhes do Recebimento
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: '0.875rem' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Receipt sx={{ width: 16, height: 16 }} />
                  {recebimento.numero_recebimento}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarToday sx={{ width: 16, height: 16 }} />
                  {formatDate(recebimento.data_inicio)}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person sx={{ width: 16, height: 16 }} />
                  Recebido por: {recebimento.nome_usuario_recebedor || recebimento.criado_por}
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                icon={getStatusIcon(recebimento.status)}
                label={formatarStatusRecebimento(recebimento.status)}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  border: '1px solid',
                  ...getStatusColor(recebimento.status).split(' ').reduce((acc, cls) => {
                    if (cls.startsWith('text-')) acc.color = cls.replace('text-', '');
                    if (cls.startsWith('bg-')) acc.backgroundColor = cls.replace('bg-', '');
                    if (cls.startsWith('border-')) acc.borderColor = cls.replace('border-', '');
                    return acc;
                  }, {} as any)
                }}
              />
              {(recebimento.status === 'EM_ANDAMENTO' || recebimento.status === 'PARCIAL') && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={handleFinalizarRecebimento}
                  disabled={loading}
                >
                  Finalizar Recebimento
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 3, py: 3 }}>
        {/* Cards de resumo */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total de Itens</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#1f2937' }}>
                    {itens.length}
                  </Typography>
                </Box>
                <Receipt sx={{ width: 32, height: 32, color: '#3b82f6' }} />
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Itens Recebidos</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#059669' }}>
                    {itens.filter(item => item.quantidade_recebida > 0).length}
                  </Typography>
                </Box>
                <CheckCircle sx={{ width: 32, height: 32, color: '#059669' }} />
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Itens Pendentes</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#f59e0b' }}>
                    {itens.filter(item => item.quantidade_recebida < item.quantidade_esperada).length}
                  </Typography>
                </Box>
                <Warning sx={{ width: 32, height: 32, color: '#f59e0b' }} />
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Valor Recebido</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#059669' }}>
                    {formatCurrency(totalRecebido)}
                  </Typography>
                </Box>
                <Typography sx={{ color: '#059669', fontSize: '1.5rem' }}>R$</Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card sx={{ border: '1px solid #e5e7eb' }}>
          <Box sx={{ borderBottom: '1px solid #e5e7eb' }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  px: 3,
                  py: 2,
                },
                '& .Mui-selected': {
                  color: '#2563eb !important',
                  bgcolor: '#eff6ff',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#2563eb',
                  height: 2,
                },
              }}
            >
              <Tab label="Informações Gerais" />
              <Tab label="Itens do Recebimento" />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <Grid container spacing={4}>
                {/* Informações do Recebimento */}
                <Grid item xs={12} lg={6}>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Receipt sx={{ width: 20, height: 20 }} />
                      Informações do Recebimento
                    </Typography>
                    <Card sx={{ bgcolor: '#f9fafb', p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            ID do Recebimento
                          </Typography>
                          <Typography sx={{ fontWeight: 600 }}>
                            {recebimento.numero_recebimento}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Data/Hora
                          </Typography>
                          <Typography sx={{ fontWeight: 600 }}>
                            {formatDate(recebimento.data_inicio)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Recebido por
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person sx={{ width: 16, height: 16, color: '#3b82f6' }} />
                            <Typography sx={{ fontWeight: 600 }}>
                              {recebimento.nome_usuario_recebedor || recebimento.criado_por}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Status
                          </Typography>
                          <Chip
                            icon={getStatusIcon(recebimento.status)}
                            label={formatarStatusRecebimento(recebimento.status)}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </Grid>
                      </Grid>
                    </Card>
                  </Box>

                  {/* Observações */}
                  {recebimento.observacoes && (
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        Observações
                      </Typography>
                      <Card sx={{ bgcolor: '#f9fafb', border: '1px solid #e5e7eb', p: 2 }}>
                        <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6 }}>
                          {recebimento.observacoes}
                        </Typography>
                      </Card>
                    </Box>
                  )}
                </Grid>

                {/* Informações do Pedido */}
                <Grid item xs={12} lg={6}>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocalShipping sx={{ width: 20, height: 20 }} />
                      Pedido Relacionado
                    </Typography>
                    <Card sx={{ bgcolor: '#f9fafb', p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Número do Pedido
                          </Typography>
                          <Typography sx={{ fontWeight: 600 }}>
                            {recebimento.numero_pedido || `PED-${recebimento.pedido_id}`}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Fornecedor
                          </Typography>
                          <Typography sx={{ fontWeight: 600 }}>
                            {itens.length > 0 ? itens[0].nome_fornecedor : 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Valor Total Esperado
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            {formatCurrency(recebimento.valor_total_esperado || totalEsperado)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Card>
                  </Box>

                  {/* Resumo do Pedido */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Resumo do Pedido
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ color: '#166534', fontWeight: 500 }}>
                            Valor Recebido
                          </Typography>
                          <Typography sx={{ fontWeight: 700, color: '#166534', fontSize: '1.125rem' }}>
                            {formatCurrency(totalRecebido)}
                          </Typography>
                        </Box>
                      </Card>
                      <Card sx={{ bgcolor: '#fef3c7', border: '1px solid #fcd34d', p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ color: '#92400e', fontWeight: 500 }}>
                            Valor Pendente
                          </Typography>
                          <Typography sx={{ fontWeight: 700, color: '#92400e', fontSize: '1.125rem' }}>
                            {formatCurrency(totalPendente)}
                          </Typography>
                        </Box>
                      </Card>
                      <Card sx={{ bgcolor: '#eff6ff', border: '1px solid #93c5fd', p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ color: '#1e40af', fontWeight: 500 }}>
                            Progresso do Recebimento
                          </Typography>
                          <Typography sx={{ fontWeight: 700, color: '#1e40af', fontSize: '1.125rem' }}>
                            {totalEsperado > 0 ? ((totalRecebido / totalEsperado) * 100).toFixed(1) : 0}%
                          </Typography>
                        </Box>
                      </Card>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            )}

            {activeTab === 1 && (
              <Alert severity="info">
                Sistema de recebimento migrado para o novo sistema simplificado.
                <br />
                Acesse: Recebimentos → Sistema Simplificado
              </Alert>
            )}
          </Box>
        </Card>
      </Box>

      {/* Modal de Finalização */}
      <Dialog open={modalFinalizar} onClose={() => setModalFinalizar(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle color="success" />
            <Typography variant="h6">Finalizar Recebimento</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Ao finalizar o recebimento, os lotes serão automaticamente adicionados ao estoque 
                e não será mais possível fazer alterações.
              </Typography>
            </Alert>
            
            <TextField
              fullWidth
              label="Observações da Finalização"
              multiline
              rows={4}
              value={observacoesFinalizar}
              onChange={(e) => setObservacoesFinalizar(e.target.value)}
              placeholder="Adicione observações sobre a finalização do recebimento..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setModalFinalizar(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={confirmarFinalizarRecebimento} 
            variant="contained" 
            color="success"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {loading ? 'Finalizando...' : 'Finalizar Recebimento'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecebimentoDetalhe;