import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar,
  Badge
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  PlayArrow,
  Stop,
  History,
  Receipt,
  Business,
  Inventory,
  Timeline,
  Person,
  DateRange,
  AttachFile,
  CloudUpload,
  Visibility,
  Edit,
  Save,
  Close,
  Warning,
  Info
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  recebimentoModernoService,
  formatarStatusRecebimento,
  getCorStatusRecebimento,
  getBgColorStatusRecebimento,
  formatarData,
  formatarDataSimples,
  formatarPreco,
  RecebimentoModerno,
  RecebimentoFornecedor
} from '../services/recebimentoModernoService';
import { useToast } from '../hooks/useToast';
// import RecebimentoPorFornecedor from '../components/RecebimentoPorFornecedor'; // Componente removido



const RecebimentoDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  // Estados do componente (devem vir antes de qualquer hook)
  const [recebimento, setRecebimento] = useState<RecebimentoModerno | null>(null);
  const [itensPorFornecedor, setItensPorFornecedor] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogFinalizar, setDialogFinalizar] = useState(false);
  const [dialogCancelar, setDialogCancelar] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [processando, setProcessando] = useState(false);

  // Log sempre que o estado mudar
  useEffect(() => {
    console.log('🔄 Estado itensPorFornecedor mudou:', {
      valor: itensPorFornecedor,
      tipo: typeof itensPorFornecedor,
      keys: Object.keys(itensPorFornecedor || {}),
      valuesLength: Object.values(itensPorFornecedor || {}).length
    });
    
    // Forçar re-renderização após mudança de estado
    if (Object.keys(itensPorFornecedor || {}).length > 0) {
      console.log('✅ Dados carregados, forçando re-renderização');
    }
  }, [itensPorFornecedor]);

  const carregarRecebimento = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      console.log('🔍 DEBUG RecebimentoDetalhes - Carregando recebimento ID:', id);
      const response = await recebimentoModernoService.buscarRecebimento(parseInt(id));
      
      console.log('✅ Resposta recebida:', response);
      console.log('   - Success:', response.success);
      console.log('   - Data:', response.data);
      console.log('   - itensPorFornecedor:', response.data?.itensPorFornecedor);
      console.log('   - Tipo itensPorFornecedor:', typeof response.data?.itensPorFornecedor);
      console.log('   - Keys itensPorFornecedor:', Object.keys(response.data?.itensPorFornecedor || {}));
      console.log('   - JSON stringify itensPorFornecedor:', JSON.stringify(response.data?.itensPorFornecedor, null, 2));
      
      setRecebimento(response.data);
      const itens = response.data.itensPorFornecedor || {};
      console.log('   - Itens que serão setados:', itens);
      console.log('   - Tipo dos itens que serão setados:', typeof itens);
      console.log('   - Keys dos itens que serão setados:', Object.keys(itens));
      setItensPorFornecedor(itens);
      
      console.log('✅ Estado atualizado com sucesso');
      
      // Pequeno delay para garantir que o estado seja atualizado
      setTimeout(() => {
        console.log('🔍 Estado após timeout:', {
          recebimento: !!response.data,
          itensPorFornecedor: Object.keys(response.data.itensPorFornecedor || {}).length
        });
      }, 100);
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar recebimento:', error);
      setError(error.message);
      toast.errorLoad('recebimento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect executado - ID:', id);
    carregarRecebimento();
  }, [id]);

  // Debug do estado atual
  useEffect(() => {
    console.log('🔍 Estado atual itensPorFornecedor:', itensPorFornecedor);
    console.log('   - Tipo:', typeof itensPorFornecedor);
    console.log('   - Keys:', Object.keys(itensPorFornecedor || {}));
    console.log('   - Length:', Object.keys(itensPorFornecedor || {}).length);
  }, [itensPorFornecedor]);

  const handleFinalizarRecebimento = async () => {
    if (!recebimento) return;

    setProcessando(true);
    try {
      await recebimentoModernoService.finalizarRecebimento(recebimento.id, observacoes);
      toast.successSave('Recebimento finalizado com sucesso');
      setDialogFinalizar(false);
      await carregarRecebimento();
    } catch (error: any) {
      toast.errorSave(error.message);
    } finally {
      setProcessando(false);
    }
  };

  const handleCancelarRecebimento = async () => {
    if (!recebimento) return;

    setProcessando(true);
    try {
      await recebimentoModernoService.cancelarRecebimento(recebimento.id, motivoCancelamento);
      toast.successSave('Recebimento cancelado');
      setDialogCancelar(false);
      await carregarRecebimento();
    } catch (error: any) {
      toast.errorSave(error.message);
    } finally {
      setProcessando(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EM_ANDAMENTO':
        return <PlayArrow sx={{ color: '#2563eb' }} />;
      case 'FINALIZADO':
        return <CheckCircle sx={{ color: '#059669' }} />;
      case 'CANCELADO':
        return <Cancel sx={{ color: '#dc2626' }} />;
      default:
        return <Info sx={{ color: '#6b7280' }} />;
    }
  };

  const calcularResumoGeral = () => {
    // Verificação de segurança
    if (!itensPorFornecedor || typeof itensPorFornecedor !== 'object') {
      console.log('🔍 calcularResumoGeral - itensPorFornecedor inválido:', itensPorFornecedor);
      return {
        totalFornecedores: 0,
        totalItens: 0,
        valorTotalEsperado: 0,
        valorTotalRecebido: 0,
        percentualGeral: 0
      };
    }

    const fornecedores = Object.values(itensPorFornecedor);
    console.log('🔍 calcularResumoGeral - fornecedores:', fornecedores.length);
    console.log('   - itensPorFornecedor:', itensPorFornecedor);
    console.log('   - Keys:', Object.keys(itensPorFornecedor));
    
    const resumo = {
      totalFornecedores: fornecedores.length,
      totalItens: fornecedores.reduce((acc, f) => acc + (f?.itens?.length || 0), 0),
      valorTotalEsperado: fornecedores.reduce((acc, f) => acc + (f?.totais?.valor_total_esperado || 0), 0),
      valorTotalRecebido: fornecedores.reduce((acc, f) => acc + (f?.totais?.valor_total_recebido || 0), 0),
      percentualGeral: fornecedores.length > 0 
        ? fornecedores.reduce((acc, f) => acc + (f?.totais?.percentual_recebido || 0), 0) / fornecedores.length 
        : 0
    };
    
    console.log('   - Resumo calculado:', resumo);
    return resumo;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando recebimento...</Typography>
      </Box>
    );
  }

  if (error || !recebimento) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Recebimento não encontrado'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/recebimentos')}
        >
          Voltar para Recebimentos
        </Button>
      </Box>
    );
  }

  const resumoGeral = calcularResumoGeral();
  const readonly = recebimento.status !== 'EM_ANDAMENTO';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Box
          sx={{
            maxWidth: '1280px',
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 4 },
            py: 2,
          }}
        >
          {/* Breadcrumbs */}
          <Breadcrumbs sx={{ mb: 2 }}>
            <Link
              color="inherit"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate('/recebimentos');
              }}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Inventory fontSize="small" />
              Recebimentos
            </Link>
            <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Receipt fontSize="small" />
              {recebimento.numero_recebimento}
            </Typography>
          </Breadcrumbs>

          {/* Header Principal */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  bgcolor: getBgColorStatusRecebimento(recebimento.status),
                  color: getCorStatusRecebimento(recebimento.status),
                  width: 56,
                  height: 56,
                }}
              >
                {getStatusIcon(recebimento.status)}
              </Avatar>
              
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 'bold',
                    color: '#1f2937',
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  {recebimento.numero_recebimento}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                  <Chip
                    icon={getStatusIcon(recebimento.status)}
                    label={formatarStatusRecebimento(recebimento.status)}
                    sx={{
                      bgcolor: getBgColorStatusRecebimento(recebimento.status),
                      color: getCorStatusRecebimento(recebimento.status),
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Criado em {formatarDataSimples(recebimento.data_inicio)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Ações */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {recebimento.status === 'EM_ANDAMENTO' && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<Stop />}
                    onClick={() => setDialogCancelar(true)}
                    sx={{ color: '#dc2626', borderColor: '#dc2626' }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircle />}
                    onClick={() => setDialogFinalizar(true)}
                    sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                  >
                    Finalizar
                  </Button>
                </>
              )}
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() => navigate('/recebimentos')}
              >
                Voltar
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Conteúdo Principal */}
      <Box
        sx={{
          maxWidth: '1280px',
          mx: 'auto',
          px: { xs: 2, sm: 3, lg: 4 },
          py: 4,
        }}
      >
        {/* Resumo Geral */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar sx={{ bgcolor: '#4f46e5', width: 48, height: 48, mx: 'auto', mb: 2 }}>
                  <Business />
                </Avatar>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1f2937', mb: 1 }}>
                  {resumoGeral.totalFornecedores}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Fornecedores
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar sx={{ bgcolor: '#059669', width: 48, height: 48, mx: 'auto', mb: 2 }}>
                  <Inventory />
                </Avatar>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1f2937', mb: 1 }}>
                  {resumoGeral.totalItens}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Itens
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar sx={{ bgcolor: '#d97706', width: 48, height: 48, mx: 'auto', mb: 2 }}>
                  <Receipt />
                </Avatar>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1f2937', mb: 1 }}>
                  {formatarPreco(resumoGeral.valorTotalRecebido)}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Valor Recebido
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                  de {formatarPreco(resumoGeral.valorTotalEsperado)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar sx={{ bgcolor: '#2563eb', width: 48, height: 48, mx: 'auto', mb: 2 }}>
                  <Timeline />
                </Avatar>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1f2937', mb: 1 }}>
                  {resumoGeral.percentualGeral.toFixed(1)}%
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Progresso
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={resumoGeral.percentualGeral}
                  sx={{
                    mt: 1,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: '#e5e7eb',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: resumoGeral.percentualGeral === 100 ? '#059669' : '#2563eb'
                    }
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Informações do Recebimento */}
        <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Informações do Recebimento
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Person sx={{ color: '#6b7280', fontSize: 20 }} />
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Recebedor
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {recebimento.nome_usuario_recebedor || 'Não informado'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <DateRange sx={{ color: '#6b7280', fontSize: 20 }} />
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Data de Início
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {formatarData(recebimento.data_inicio)}
                </Typography>
              </Grid>

              {recebimento.data_finalizacao && (
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircle sx={{ color: '#6b7280', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      Data de Finalização
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatarData(recebimento.data_finalizacao)}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Receipt sx={{ color: '#6b7280', fontSize: 20 }} />
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Pedido Relacionado
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {recebimento.numero_pedido || `#${recebimento.pedido_id}`}
                </Typography>
              </Grid>
            </Grid>

            {recebimento.observacoes && (
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e5e7eb' }}>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                  Observações
                </Typography>
                <Typography variant="body1">
                  {recebimento.observacoes}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Itens por Fornecedor */}

        
        {(() => {
          console.log('🔍 Renderizando RecebimentoPorFornecedor com props:', {
            recebimentoId: recebimento.id,
            itensPorFornecedor,
            readonly,
            keysLength: Object.keys(itensPorFornecedor || {}).length,
            loading
          });
          return null;
        })()}
        
        {!loading && recebimento && (
          <>
            {/* Log de debug na renderização */}
            {(() => {
              console.log('🎨 RENDERIZAÇÃO - Estado atual:', {
                recebimento: !!recebimento,
                itensPorFornecedor,
                keys: Object.keys(itensPorFornecedor || {}),
                loading
              });
              return null;
            })()}
            

            
            {/* Teste direto com dados */}
            <Box sx={{ p: 2, bgcolor: '#fff3cd', borderRadius: 1, mb: 2 }}>
              <Typography variant="h6">🔧 TESTE DIRETO</Typography>
              <Typography variant="body2">
                itensPorFornecedor keys: {Object.keys(itensPorFornecedor || {}).join(', ')}
              </Typography>
              <Typography variant="body2">
                Quantidade de fornecedores: {Object.keys(itensPorFornecedor || {}).length}
              </Typography>
              
              {Object.entries(itensPorFornecedor || {}).map(([fornecedorId, dados]: [string, any]) => (
                <Box key={fornecedorId} sx={{ mt: 1, p: 1, bgcolor: 'white', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Fornecedor {fornecedorId}:</strong> {dados?.fornecedor?.nome}
                  </Typography>
                  <Typography variant="body2">
                    Itens: {dados?.itens?.length || 0}
                  </Typography>
                </Box>
              ))}
            </Box>
            
            {/* Teste básico de renderização */}
            <Box sx={{ p: 2, bgcolor: '#f0f8ff', borderRadius: 1, mb: 2 }}>
              <Typography variant="h6">🧪 TESTE BÁSICO</Typography>
              <Typography variant="body2">
                itensPorFornecedor existe: {itensPorFornecedor ? 'SIM' : 'NÃO'}
              </Typography>
              <Typography variant="body2">
                Tipo: {typeof itensPorFornecedor}
              </Typography>
              <Typography variant="body2">
                Keys: {Object.keys(itensPorFornecedor || {}).join(', ')}
              </Typography>
              <Typography variant="body2">
                Quantidade de fornecedores: {Object.keys(itensPorFornecedor || {}).length}
              </Typography>
              
              {Object.entries(itensPorFornecedor || {}).map(([fornecedorId, dados]) => (
                <Box key={fornecedorId} sx={{ mt: 1, p: 1, bgcolor: 'white', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Fornecedor {fornecedorId}:</strong> {dados.fornecedor?.nome}
                  </Typography>
                  <Typography variant="caption">
                    Itens: {dados.itens?.length || 0}
                  </Typography>
                  {dados.itens?.map((item, index) => (
                    <Typography key={index} variant="caption" sx={{ display: 'block', ml: 2 }}>
                      - {item.nome_produto} (Qtd: {item.quantidade_esperada})
                    </Typography>
                  ))}
                </Box>
              ))}
            </Box>


            
            {/* <RecebimentoPorFornecedor
              recebimentoId={recebimento.id}
              itensPorFornecedor={itensPorFornecedor}
              onAtualizarRecebimento={carregarRecebimento}
              readonly={readonly}
            /> */}
            <Alert severity="info">
              Sistema de recebimento migrado para o novo sistema simplificado.
              <br />
              Acesse: Recebimentos → Sistema Simplificado
            </Alert>
          </>
        )}
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Carregando itens...</Typography>
          </Box>
        )}
      </Box>

      {/* Dialog Finalizar */}
      <Dialog open={dialogFinalizar} onClose={() => setDialogFinalizar(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Finalizar Recebimento</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Tem certeza que deseja finalizar este recebimento? Esta ação não pode ser desfeita.
          </Typography>
          <TextField
            fullWidth
            label="Observações de Finalização (opcional)"
            multiline
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogFinalizar(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleFinalizarRecebimento}
            disabled={processando}
            sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
          >
            {processando ? <CircularProgress size={20} color="inherit" /> : 'Finalizar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Cancelar */}
      <Dialog open={dialogCancelar} onClose={() => setDialogCancelar(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancelar Recebimento</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Tem certeza que deseja cancelar este recebimento? Esta ação não pode ser desfeita.
          </Typography>
          <TextField
            fullWidth
            label="Motivo do Cancelamento"
            multiline
            rows={3}
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogCancelar(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCancelarRecebimento}
            disabled={processando || !motivoCancelamento.trim()}
            sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
          >
            {processando ? <CircularProgress size={20} color="inherit" /> : 'Confirmar Cancelamento'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecebimentoDetalhes;