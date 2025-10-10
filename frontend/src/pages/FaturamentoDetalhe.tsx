import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  FileDownload as FileDownloadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import faturamentoService from '../services/faturamento';
import type { ContratoCalculado } from '../types/faturamento';
import { formatarMoeda, formatarData } from '../utils/dateUtils';
import { exportarContratoParaExcel } from '../utils/exportarFaturamentoExcel';

export default function FaturamentoDetalhe() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [faturamentos, setFaturamentos] = useState<any[]>([]);
  const [previa, setPrevia] = useState<any>(null);
  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [dialogConsumo, setDialogConsumo] = useState(false);
  const [dialogContrato, setDialogContrato] = useState(false);
  const [dialogRemoverModalidade, setDialogRemoverModalidade] = useState(false);
  const [contratoSelecionado, setContratoSelecionado] = useState<ContratoCalculado | null>(null);
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState<number | null>(null);
  const [modalidadeParaRemover, setModalidadeParaRemover] = useState<{ contratoId: number; modalidadeId: number; nome: string } | null>(null);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    carregarFaturamento();
  }, [pedidoId]);

  const carregarFaturamento = async () => {
    try {
      setLoading(true);
      setErro('');

      const faturamentosData = await faturamentoService.buscarPorPedido(Number(pedidoId));
      setFaturamentos(faturamentosData);
      console.log('📊 Faturamentos carregados:', faturamentosData);

      if (faturamentosData.length > 0) {
        // Usar o resumo real do faturamento em vez da prévia
        const resumoData = await faturamentoService.buscarResumo(faturamentosData[0].id);
        console.log('📊 Resumo carregado:', resumoData);
        
        // Adaptar o formato do resumo para o formato da prévia
        // Agrupar itens por produto para consolidar as divisões por modalidade
        const previaAdaptada = {
          pedido: {
            id: faturamentosData[0].pedido_id,
            numero: faturamentosData[0].pedido_numero || 'N/A'
          },
          contratos: resumoData.contratos.map((contrato: any) => {
            // Agrupar itens por produto
            const itensPorProduto: any = {};
            
            contrato.modalidades.forEach((modalidade: any) => {
              modalidade.itens.forEach((item: any) => {
                const key = item.produto_id;
                
                if (!itensPorProduto[key]) {
                  itensPorProduto[key] = {
                    produto_id: item.produto_id,
                    produto_nome: item.produto_nome,
                    unidade: item.unidade_medida,
                    quantidade_original: 0,
                    preco_unitario: Number(item.preco_unitario || 0),
                    valor_total: 0,
                    divisoes: []
                  };
                }
                
                itensPorProduto[key].quantidade_original += Number(item.quantidade_total || 0);
                itensPorProduto[key].valor_total += Number(item.valor_total || 0);
                itensPorProduto[key].divisoes.push({
                  modalidade_id: modalidade.modalidade_id,
                  modalidade_nome: modalidade.modalidade_nome,
                  modalidade_codigo_financeiro: modalidade.modalidade_codigo_financeiro,
                  quantidade: Number(item.quantidade_total || 0),
                  percentual: 0, // Será calculado depois
                  valor: Number(item.valor_total || 0)
                });
              });
            });
            
            // Calcular percentuais das divisões
            Object.values(itensPorProduto).forEach((item: any) => {
              // Calcular percentuais das divisões
              item.divisoes.forEach((divisao: any) => {
                divisao.percentual = item.quantidade_original > 0
                  ? (divisao.quantidade / item.quantidade_original) * 100
                  : 0;
              });
            });
            
            const contratoAdaptado = {
              contrato_id: contrato.contrato_id,
              contrato_numero: contrato.contrato_numero,
              fornecedor_id: contrato.fornecedor_id,
              fornecedor_nome: contrato.fornecedor_nome,
              fornecedor_cnpj: contrato.fornecedor_cnpj || '',
              valor_total: Number(contrato.valor_total || 0),
              itens: Object.values(itensPorProduto)
            };
            
            console.log('📊 Contrato adaptado:', contratoAdaptado);
            console.log('📊 Valor total original:', contrato.valor_total, 'Convertido:', Number(contrato.valor_total || 0));
            console.log('📊 Itens do contrato:', Object.values(itensPorProduto));
            return contratoAdaptado;
          })
        };
        
        console.log('📊 Prévia adaptada:', previaAdaptada);
        setPrevia(previaAdaptada);
      }
    } catch (error: any) {
      console.error('Erro ao carregar faturamento:', error);
      setErro(error.response?.data?.message || 'Erro ao carregar faturamento');
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = (contrato: ContratoCalculado) => {
    try {
      exportarContratoParaExcel(contrato, previa.pedido.numero);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      setErro('Erro ao exportar para Excel');
    }
  };

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(2)}%`;
  };

  const handleExcluir = async () => {
    if (faturamentos.length === 0) return;

    try {
      setProcessando(true);
      setErro('');

      await faturamentoService.excluir(faturamentos[0].id);
      
      // Redirecionar de volta para o pedido
      navigate(`/pedidos/${pedidoId}`, {
        state: { message: 'Faturamento excluído com sucesso!' }
      });
    } catch (error: any) {
      console.error('Erro ao excluir faturamento:', error);
      setErro(error.response?.data?.message || 'Erro ao excluir faturamento');
      setDialogExcluir(false);
    } finally {
      setProcessando(false);
    }
  };

  const handleRegistrarConsumo = async () => {
    if (faturamentos.length === 0) return;

    try {
      setProcessando(true);
      setErro('');

      await faturamentoService.registrarConsumo(faturamentos[0].id);
      
      // Recarregar dados
      await carregarFaturamento();
      setDialogConsumo(false);
      
    } catch (error: any) {
      console.error('Erro ao registrar consumo:', error);
      const mensagemErro = error.response?.data?.message || error.message || 'Erro ao registrar consumo';
      
      // Verificar se é erro de saldo insuficiente
      if (mensagemErro.includes('Saldo insuficiente')) {
        setErro(`❌ ${mensagemErro}\n\nPor favor, ajuste as quantidades no faturamento ou verifique o saldo disponível no contrato.`);
      } else {
        setErro(mensagemErro);
      }
      
      setDialogConsumo(false);
    } finally {
      setProcessando(false);
    }
  };

  const handleVerContrato = (contrato: ContratoCalculado) => {
    setContratoSelecionado(contrato);
    setModalidadeSelecionada(null);
    setDialogContrato(true);
  };

  const getModalidadesDoContrato = (contrato: ContratoCalculado) => {
    const modalidades = new Map();
    
    contrato.itens.forEach(item => {
      item.divisoes.forEach(divisao => {
        if (!modalidades.has(divisao.modalidade_id)) {
          modalidades.set(divisao.modalidade_id, {
            id: divisao.modalidade_id,
            nome: divisao.modalidade_nome,
            codigo: divisao.modalidade_codigo_financeiro
          });
        }
      });
    });
    
    return Array.from(modalidades.values());
  };

  const getItensFiltrados = (contrato: ContratoCalculado) => {
    const itensFiltrados: any[] = [];
    
    contrato.itens.forEach(item => {
      item.divisoes.forEach(divisao => {
        if (modalidadeSelecionada === null || divisao.modalidade_id === modalidadeSelecionada) {
          itensFiltrados.push({
            produto_nome: item.produto_nome,
            unidade: item.unidade,
            quantidade: divisao.quantidade,
            preco_unitario: item.preco_unitario,
            valor: divisao.valor
          });
        }
      });
    });
    
    return itensFiltrados;
  };

  const calcularTotalFiltrado = (contrato: ContratoCalculado) => {
    return getItensFiltrados(contrato).reduce((total, item) => total + Number(item.valor || 0), 0);
  };

  const handleRemoverModalidade = (contratoId: number, modalidadeId: number, nome: string) => {
    setModalidadeParaRemover({ contratoId, modalidadeId, nome });
    setDialogRemoverModalidade(true);
  };

  const confirmarRemoverModalidade = async () => {
    if (!modalidadeParaRemover || faturamentos.length === 0) return;

    try {
      setProcessando(true);
      setErro('');

      await faturamentoService.removerItensModalidade(
        faturamentos[0].id,
        modalidadeParaRemover.contratoId,
        modalidadeParaRemover.modalidadeId
      );

      // Recarregar dados
      await carregarFaturamento();
      setDialogRemoverModalidade(false);
      setDialogContrato(false);
      setModalidadeParaRemover(null);

    } catch (error: any) {
      console.error('Erro ao remover modalidade:', error);
      setErro(error.response?.data?.message || 'Erro ao remover modalidade');
      setDialogRemoverModalidade(false);
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Carregando faturamento...</Typography>
      </Box>
    );
  }

  if (erro) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{erro}</Alert>
        <Button onClick={() => navigate(`/pedidos/${pedidoId}`)} sx={{ mt: 2 }}>
          Voltar ao Pedido
        </Button>
      </Box>
    );
  }

  if (faturamentos.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Nenhum faturamento encontrado para este pedido</Alert>
        <Button onClick={() => navigate(`/pedidos/${pedidoId}`)} sx={{ mt: 2 }}>
          Voltar ao Pedido
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(`/pedidos/${pedidoId}`)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Faturamento - Pedido {previa?.pedido?.numero}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {faturamentos[0]?.status !== 'consumido' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => setDialogConsumo(true)}
              disabled={processando}
            >
              Registrar Consumo
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDialogExcluir(true)}
            disabled={processando}
          >
            Excluir Faturamento
          </Button>
        </Box>
      </Box>

      {erro && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
          {erro}
        </Alert>
      )}

      {/* Informações do Faturamento */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {faturamentos.map((faturamento) => (
          <Grid item xs={12} key={faturamento.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Faturamento #{faturamento.id}
                  </Typography>
                  <Chip 
                    label={faturamento.status === 'consumido' ? 'Consumo Registrado' : 'Gerado'} 
                    color={faturamento.status === 'consumido' ? 'success' : 'warning'} 
                  />
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Data de Geração</Typography>
                    <Typography variant="body1">{formatarData(faturamento.data_faturamento)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Valor Total</Typography>
                    <Typography variant="h6" color="primary">
                      {formatarMoeda(faturamento.valor_total)}
                    </Typography>
                  </Grid>
                  {faturamento.observacoes && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Observações</Typography>
                      <Typography variant="body1">{faturamento.observacoes}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Lista de Contratos */}
      {previa?.contratos && (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Contratos Faturados
          </Typography>

          <Grid container spacing={2}>
            {previa.contratos.map((contrato: ContratoCalculado) => (
              <Grid item xs={12} md={6} key={contrato.contrato_id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6">
                          Contrato {contrato.contrato_numero}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {contrato.fornecedor_nome}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {contrato.fornecedor_cnpj}
                        </Typography>
                      </Box>
                      <Typography variant="h6" color="primary">
                        {formatarMoeda(contrato.valor_total)}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleVerContrato(contrato)}
                        fullWidth
                      >
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<FileDownloadIcon />}
                        onClick={() => handleExportar(contrato)}
                        fullWidth
                      >
                        Exportar Excel
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Modal de Detalhes do Contrato */}
      <Dialog 
        open={dialogContrato} 
        onClose={() => setDialogContrato(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">
                Contrato {contratoSelecionado?.contrato_numero}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {contratoSelecionado?.fornecedor_nome} - {contratoSelecionado?.fornecedor_cnpj}
              </Typography>
            </Box>
            <Typography variant="h6" color="primary">
              {formatarMoeda(contratoSelecionado?.valor_total || 0)}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {contratoSelecionado && (
            <Box>
              {/* Seletor de Modalidade */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Filtrar por Modalidade:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label="Todas"
                    color={modalidadeSelecionada === null ? 'primary' : 'default'}
                    onClick={() => setModalidadeSelecionada(null)}
                    clickable
                  />
                  {getModalidadesDoContrato(contratoSelecionado).map((modalidade) => (
                    <Chip
                      key={modalidade.id}
                      label={modalidade.nome}
                      color={modalidadeSelecionada === modalidade.id ? 'primary' : 'default'}
                      onClick={() => setModalidadeSelecionada(modalidade.id)}
                      onDelete={() => handleRemoverModalidade(contratoSelecionado.contrato_id, modalidade.id, modalidade.nome)}
                      clickable
                    />
                  ))}
                </Box>
              </Box>

              {/* Tabela de Itens */}
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#D2691E' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ITEM</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>UNIDADE DE MEDIDA</TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>QUANTIDADE</TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>PREÇO UNITÁRIO</TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>CUSTO POR ITEM</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getItensFiltrados(contratoSelecionado).map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.produto_nome}</TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell align="right">{item.quantidade}</TableCell>
                        <TableCell align="right">{formatarMoeda(item.preco_unitario)}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="bold">
                            {formatarMoeda(item.valor)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} align="right">
                        <Typography variant="h6" fontWeight="bold">TOTAL:</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {formatarMoeda(calcularTotalFiltrado(contratoSelecionado))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogContrato(false)}>Fechar</Button>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={() => contratoSelecionado && handleExportar(contratoSelecionado)}
          >
            Exportar para Excel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Remover Modalidade */}
      <Dialog open={dialogRemoverModalidade} onClose={() => setDialogRemoverModalidade(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Remover Modalidade</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tem certeza que deseja remover todos os itens da modalidade <strong>{modalidadeParaRemover?.nome}</strong> deste faturamento?
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold', mb: 1 }}>
            ⚠️ Esta ação irá:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 3 }}>
            <li>Excluir todos os itens desta modalidade do faturamento</li>
            <li>Recalcular o valor total do faturamento</li>
            {faturamentos[0]?.status === 'consumido' && (
              <li>Restaurar o saldo consumido desta modalidade no contrato</li>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogRemoverModalidade(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={confirmarRemoverModalidade}
            color="error"
            variant="contained"
            disabled={processando}
          >
            {processando ? 'Removendo...' : 'Confirmar Remoção'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Registrar Consumo */}
      <Dialog open={dialogConsumo} onClose={() => setDialogConsumo(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Consumo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ao registrar o consumo, os saldos dos contratos serão atualizados e não será mais possível excluir este faturamento.
          </Typography>
          <Typography variant="body2" color="info.main" sx={{ fontWeight: 'bold' }}>
            ℹ️ Esta ação registrará o consumo de todos os produtos nas modalidades correspondentes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogConsumo(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={handleRegistrarConsumo}
            color="success"
            variant="contained"
            disabled={processando}
          >
            {processando ? 'Registrando...' : 'Confirmar Registro'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Exclusão */}
      <Dialog open={dialogExcluir} onClose={() => setDialogExcluir(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Excluir Faturamento</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tem certeza que deseja excluir este faturamento? Esta ação não pode ser desfeita.
          </Typography>
          {faturamentos[0]?.status === 'consumido' ? (
            <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
              ⚠️ Atenção: Este faturamento já teve seu consumo registrado. Ao excluir, os saldos dos contratos serão restaurados.
            </Typography>
          ) : (
            <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
              ⚠️ Atenção: Este faturamento ainda não teve seu consumo registrado.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogExcluir(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={handleExcluir}
            color="error"
            variant="contained"
            disabled={processando}
          >
            {processando ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
