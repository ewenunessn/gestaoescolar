import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { guiaService, Guia, GuiaProdutoEscola } from '../services/guiaService';
import { entregaService } from '../modules/entregas/services/entregaService';
import GuiaDetalhes from '../components/GuiaDetalhes';
import AdicionarProdutoIndividual from '../components/AdicionarProdutoIndividual';

interface ProdutoAgrupado {
  nome: string;
  unidade: string;
  lote?: string;
  data_criacao?: string;
  totalQuantidade: number;
  totalEscolas: number;
  escolas: GuiaProdutoEscola[];
}

// Helper para normalizar valores boolean que podem vir como string do backend
const normalizeBoolean = (value: any): boolean => {
  if (value === null || value === undefined) return true; // Default para true
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (typeof value === 'number') return value !== 0;
  return Boolean(value);
};

const GuiaDetalhe: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [guia, setGuia] = useState<Guia | null>(null);
  const [produtos, setProdutos] = useState<GuiaProdutoEscola[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddProdutoIndividual, setOpenAddProdutoIndividual] = useState(false);
  const [openAddProdutoMassa, setOpenAddProdutoMassa] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoAgrupado | null>(null);
  const [openEscolasProduto, setOpenEscolasProduto] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [removendoItens, setRemovendoItens] = useState(false);
  const [dadosEntrega, setDadosEntrega] = useState<{[key: string]: any}>({});

  useEffect(() => {
    if (id) {
      carregarGuia();
    }
  }, [id]);

  const carregarGuia = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [guiaResponse, produtosResponse] = await Promise.all([
        guiaService.buscarGuia(parseInt(id)),
        guiaService.listarProdutosGuia(parseInt(id))
      ]);

      setGuia(guiaResponse.data || guiaResponse);

      const produtosData = produtosResponse?.data || produtosResponse;

      setProdutos(Array.isArray(produtosData) ? produtosData : []);
    } catch (err: any) {
      console.error('Erro ao carregar guia:', err);
      error('Erro ao carregar dados da guia');
    } finally {
      setLoading(false);
    }
  };

  // Agrupar produtos por data, lote e nome
  const produtosAgrupados = useMemo(() => {
    const grupos: { [key: string]: ProdutoAgrupado } = {};

    produtos.forEach((item: any) => {
      const produtoNome = (item as any).produto_nome || item.produto?.nome || 'Produto não informado';
      const dataCriacao = item.data_criacao || item.created_at?.split('T')[0] || 'Sem data';
      const lote = item.lote || 'Sem lote';

      // Chave única: data + lote + produto
      const chaveGrupo = `${dataCriacao}_${lote}_${produtoNome}`;

      if (!grupos[chaveGrupo]) {
        grupos[chaveGrupo] = {
          nome: produtoNome,
          unidade: item.unidade || '',
          lote: item.lote || null,
          data_criacao: dataCriacao,
          totalQuantidade: 0,
          totalEscolas: 0,
          escolas: []
        };
      }

      grupos[chaveGrupo].totalQuantidade += parseFloat(item.quantidade) || 0;
      grupos[chaveGrupo].totalEscolas += 1;
      grupos[chaveGrupo].escolas.push(item);
    });

    // Ordenar por data (mais recente primeiro), depois por lote, depois por nome
    return Object.values(grupos).sort((a, b) => {
      // Primeiro por data (mais recente primeiro)
      const dataA = new Date(a.data_criacao || '1900-01-01');
      const dataB = new Date(b.data_criacao || '1900-01-01');
      if (dataA.getTime() !== dataB.getTime()) {
        return dataB.getTime() - dataA.getTime();
      }

      // Depois por lote
      const loteA = a.lote || '';
      const loteB = b.lote || '';
      if (loteA !== loteB) {
        return loteA.localeCompare(loteB);
      }

      // Por último por nome do produto
      return a.nome.localeCompare(b.nome);
    });
  }, [produtos]);

  const handleVerEscolas = async (produto: ProdutoAgrupado) => {
    setProdutoSelecionado(produto);
    setItensSelecionados(new Set());
    setOpenEscolasProduto(true);
    
    // Carregar dados de entrega para cada escola
    try {
      const dadosEntregaTemp: {[key: string]: any} = {};
      
      for (const item of produto.escolas) {
        const escolaId = (item as any).escola_id || item.escolaId;
        if (escolaId && guia) {
          try {
            const itensEntrega = await entregaService.listarItensPorEscola(escolaId, guia.id);
            // Encontrar o item específico deste produto
            const itemEntrega = itensEntrega.find((entrega: any) => 
              entrega.produto_id === ((item as any).produto_id || item.produtoId) &&
              entrega.lote === item.lote
            );
            
            if (itemEntrega) {
              dadosEntregaTemp[`${escolaId}_${(item as any).produto_id || item.produtoId}_${item.lote || 'sem_lote'}`] = itemEntrega;
            }
          } catch (err) {
            console.log(`Erro ao carregar dados de entrega para escola ${escolaId}:`, err);
          }
        }
      }
      
      setDadosEntrega(dadosEntregaTemp);
    } catch (err) {
      console.error('Erro ao carregar dados de entrega:', err);
    }
  };

  const handleSelecionarItem = (itemId: string) => {
    const novosSelecionados = new Set(itensSelecionados);
    if (novosSelecionados.has(itemId)) {
      novosSelecionados.delete(itemId);
    } else {
      novosSelecionados.add(itemId);
    }
    setItensSelecionados(novosSelecionados);
  };

  const handleSelecionarTodos = () => {
    if (!produtoSelecionado) return;

    if (itensSelecionados.size === produtoSelecionado.escolas.length) {
      // Se todos estão selecionados, desselecionar todos
      setItensSelecionados(new Set());
    } else {
      // Selecionar todos
      const todosIds = new Set(produtoSelecionado.escolas.map((item: any, index) =>
        item.id?.toString() || `${item.produto_id || item.produtoId}_${item.escola_id || item.escolaId}_${index}`
      ));
      setItensSelecionados(todosIds);
    }
  };

  const handleRemoverSelecionados = async () => {
    if (!guia || itensSelecionados.size === 0) return;

    const confirmacao = window.confirm(
      `Tem certeza que deseja remover ${itensSelecionados.size} item(s) selecionado(s)?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmacao) return;

    try {
      setRemovendoItens(true);

      for (const itemId of itensSelecionados) {
        const item = produtoSelecionado?.escolas.find((escola: any, index) => {
          const id = escola.id?.toString() || `${escola.produto_id || escola.produtoId}_${escola.escola_id || escola.escolaId}_${index}`;
          return id === itemId;
        });

        if (item) {
          const produtoId = (item as any).produto_id || item.produtoId;
          const escolaId = (item as any).escola_id || item.escolaId;

          // Remover diretamente sem confirmação adicional (já confirmou acima)
          await handleRemoverProdutoSemConfirmacao(produtoId, escolaId);
        }
      }

      setItensSelecionados(new Set());
      setOpenEscolasProduto(false);
      await carregarGuia(); // Recarregar dados
      success(`${itensSelecionados.size} item(s) removido(s) com sucesso!`);
    } catch (err: any) {
      error('Erro ao remover itens selecionados');
    } finally {
      setRemovendoItens(false);
    }
  };

  const handleRemoverProduto = async (produtoId: number, escolaId: number) => {
    if (!guia || !window.confirm('Tem certeza que deseja remover este item?')) return;

    try {
      await guiaService.removerProdutoGuia(guia.id, produtoId, escolaId);
      success('Item removido com sucesso!');
      await carregarGuia();
    } catch (err: any) {
      error('Erro ao remover item');
    }
  };

  const handleRemoverProdutoSemConfirmacao = async (produtoId: number, escolaId: number) => {
    if (!guia) return;

    try {
      await guiaService.removerProdutoGuia(guia.id, produtoId, escolaId);
    } catch (err: any) {
      throw err; // Propagar erro para função chamadora
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta': return 'success';
      case 'fechada': return 'default';
      case 'cancelada': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aberta': return 'Aberta';
      case 'fechada': return 'Fechada';
      case 'cancelada': return 'Cancelada';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!guia) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Guia não encontrada</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Cabeçalho */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/guias-demanda')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Guia de Demanda - {guia.mes}/{guia.ano}
          </Typography>
        </Box>

        {/* Informações da Guia */}
        <Card sx={{ borderRadius: '12px', p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="textSecondary">
                Mês/Ano
              </Typography>
              <Typography variant="h6">
                {guia.mes}/{guia.ano}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="textSecondary">
                Status
              </Typography>
              <Chip
                label={getStatusLabel(guia.status)}
                size="small"
                sx={{
                  fontWeight: 'bold',
                  minWidth: '70px',
                  ...(guia.status === 'aberta' && {
                    bgcolor: 'success.main',
                    color: 'success.contrastText'
                  }),
                  ...(guia.status === 'fechada' && {
                    bgcolor: 'grey.600',
                    color: 'white'
                  }),
                  ...(guia.status === 'cancelada' && {
                    bgcolor: 'error.main',
                    color: 'error.contrastText'
                  })
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Observação
              </Typography>
              <Typography>
                {guia.observacao || '-'}
              </Typography>
            </Grid>
          </Grid>
        </Card>

        {/* Produtos Agrupados */}
        <Card sx={{ borderRadius: '12px', p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6">
                Produtos ({produtosAgrupados.length} grupos)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Agrupados por Data → Lote → Produto
              </Typography>
            </Box>
            {guia.status === 'aberta' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenAddProdutoIndividual(true)}
                >
                  Adicionar Individual
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenAddProdutoMassa(true)}
                >
                  Adicionar em Massa
                </Button>
              </Box>
            )}
          </Box>

          {produtosAgrupados.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary">
                Nenhum produto adicionado ainda.
              </Typography>
            </Box>
          ) : (
            <>


              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Data</TableCell>
                      <TableCell>Lote</TableCell>
                      <TableCell align="center">Escolas</TableCell>
                      <TableCell align="right">Quantidade Total</TableCell>
                      <TableCell>Unidade</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      // Agrupar por produto para mostrar cabeçalhos quando há múltiplos lotes
                      const produtosPorNome: { [key: string]: ProdutoAgrupado[] } = {};
                      produtosAgrupados.forEach(produto => {
                        if (!produtosPorNome[produto.nome]) {
                          produtosPorNome[produto.nome] = [];
                        }
                        produtosPorNome[produto.nome].push(produto);
                      });

                      return Object.entries(produtosPorNome).map(([nomeProduto, lotesProduto]) => (
                        <React.Fragment key={nomeProduto}>
                          {/* Cabeçalho do produto se houver múltiplos lotes */}
                          {lotesProduto.length > 1 && (
                            <TableRow sx={{ bgcolor: 'primary.50' }}>
                              <TableCell colSpan={7} sx={{ py: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                                    📦 {nomeProduto}
                                  </Typography>
                                  <Chip
                                    label={`${lotesProduto.length} lote(s)`}
                                    size="small"
                                    sx={{
                                      fontWeight: 'bold',
                                      bgcolor: 'primary.main',
                                      color: 'primary.contrastText'
                                    }}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    Total: {lotesProduto.reduce((sum, lote) => sum + lote.totalQuantidade, 0).toLocaleString('pt-BR')} {lotesProduto[0]?.unidade}
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}

                          {/* Linhas dos lotes */}
                          {lotesProduto.map((produto, index) => (
                            <TableRow
                              key={`${produto.data_criacao}_${produto.lote}_${produto.nome}_${index}`}
                              hover
                            >
                              <TableCell>
                                <Typography variant="body2" fontWeight={lotesProduto.length === 1 ? "bold" : "medium"}>
                                  {produto.nome}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {produto.data_criacao && produto.data_criacao !== 'Sem data'
                                    ? new Date(produto.data_criacao).toLocaleDateString('pt-BR')
                                    : '-'
                                  }
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {produto.lote && produto.lote !== 'Sem lote' && produto.lote !== null && produto.lote !== undefined ? (
                                  <Chip
                                    label={produto.lote}
                                    size="small"
                                    sx={{
                                      fontSize: '0.75rem',
                                      fontWeight: 'bold',
                                      bgcolor: '#1976d2',
                                      color: 'white'
                                    }}
                                  />
                                ) : (
                                  <Chip
                                    label="Sem lote"
                                    size="small"
                                    sx={{
                                      fontSize: '0.75rem',
                                      fontWeight: 'medium',
                                      bgcolor: 'grey.300',
                                      color: 'grey.700',
                                      fontStyle: 'italic'
                                    }}
                                  />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" color="text.secondary">
                                  {produto.totalEscolas} escola(s)
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="medium">
                                  {produto.totalQuantidade.toLocaleString('pt-BR')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {produto.unidade}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Ver escolas">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleVerEscolas(produto)}
                                    color="primary"
                                  >
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Card>
      </Box>

      {/* Modal para adicionar produto individual */}
      <AdicionarProdutoIndividual
        open={openAddProdutoIndividual}
        onClose={() => setOpenAddProdutoIndividual(false)}
        guia={guia}
        onUpdate={carregarGuia}
      />

      {/* Modal para adicionar produtos em massa */}
      <Dialog open={openAddProdutoMassa} onClose={() => setOpenAddProdutoMassa(false)} maxWidth="lg" fullWidth>
        <GuiaDetalhes
          onClose={() => setOpenAddProdutoMassa(false)}
          guia={guia}
          onUpdate={carregarGuia}
        />
      </Dialog>

      {/* Modal para ver escolas do produto */}
      <Dialog open={openEscolasProduto} onClose={() => setOpenEscolasProduto(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">
                {produtoSelecionado?.nome} - Escolas ({produtoSelecionado?.totalEscolas})
              </Typography>
              {produtoSelecionado?.lote && (
                <Chip
                  label={`Lote: ${produtoSelecionado.lote}`}
                  size="small"
                  sx={{
                    mt: 1,
                    fontWeight: 'bold',
                    bgcolor: '#1976d2',
                    color: 'white'
                  }}
                />
              )}
            </Box>
            {guia.status === 'aberta' && itensSelecionados.size > 0 && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="body2" color="primary">
                  {itensSelecionados.size} selecionado(s)
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={handleRemoverSelecionados}
                  disabled={removendoItens}
                  startIcon={removendoItens ? <CircularProgress size={16} /> : <DeleteIcon />}
                >
                  {removendoItens ? 'Removendo...' : 'Remover Selecionados'}
                </Button>
              </Box>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {guia.status === 'aberta' && produtoSelecionado && produtoSelecionado.escolas.length > 0 && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={itensSelecionados.size === produtoSelecionado.escolas.length && produtoSelecionado.escolas.length > 0}
                    indeterminate={itensSelecionados.size > 0 && itensSelecionados.size < produtoSelecionado.escolas.length}
                    onChange={handleSelecionarTodos}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight="medium">
                    {itensSelecionados.size === produtoSelecionado.escolas.length && produtoSelecionado.escolas.length > 0
                      ? 'Desselecionar todos'
                      : 'Selecionar todos'
                    } ({produtoSelecionado.escolas.length} itens)
                  </Typography>
                }
              />
            </Box>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {guia.status === 'aberta' && <TableCell padding="checkbox">Seleção</TableCell>}
                  <TableCell>Escola</TableCell>
                  <TableCell align="right">Quantidade</TableCell>
                  <TableCell>Unidade</TableCell>
                  <TableCell align="center">Para Entrega</TableCell>
                  <TableCell align="center">Status Entrega</TableCell>
                  <TableCell align="right">Qtd. Entregue</TableCell>
                  <TableCell>Observação</TableCell>
                  {guia.status === 'aberta' && <TableCell align="center">Ação Individual</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {produtoSelecionado?.escolas.map((item: any, index) => {
                  const itemId = item.id?.toString() || `${item.produto_id || item.produtoId}_${item.escola_id || item.escolaId}_${index}`;
                  const isSelected = itensSelecionados.has(itemId);

                  return (
                    <TableRow
                      key={itemId}
                      hover
                      selected={isSelected}
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: 'primary.50'
                        }
                      }}
                    >
                      {guia.status === 'aberta' && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelecionarItem(itemId)}
                            color="primary"
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography variant="body2" fontWeight={isSelected ? "medium" : "normal"}>
                          {(item as any).escola_nome || item.escola?.nome || 'Escola não informada'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {typeof item.quantidade === 'number' ? item.quantidade.toLocaleString('pt-BR') : item.quantidade || '0'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.unidade || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={normalizeBoolean(item.para_entrega)}
                              onChange={async (e) => {
                                const novoValor = e.target.checked;
                                
                                // Atualizar o estado local imediatamente para feedback visual
                                setProdutos(prevProdutos => 
                                  prevProdutos.map(produto => 
                                    produto.id === item.id 
                                      ? { ...produto, para_entrega: novoValor }
                                      : produto
                                  )
                                );
                                
                                // Atualizar também o produtoSelecionado se estiver no modal
                                if (produtoSelecionado) {
                                  setProdutoSelecionado(prev => ({
                                    ...prev!,
                                    escolas: prev!.escolas.map(escola => 
                                      escola.id === item.id 
                                        ? { ...escola, para_entrega: novoValor }
                                        : escola
                                    )
                                  }));
                                }
                                
                                try {
                                  // Atualizar no backend
                                  await guiaService.atualizarParaEntrega(item.id, novoValor);
                                  success(`Item ${novoValor ? 'marcado' : 'desmarcado'} para entrega`);
                                } catch (err) {
                                  error('Erro ao atualizar campo para entrega');
                                  // Em caso de erro, reverter o estado local e recarregar
                                  setProdutos(prevProdutos => 
                                    prevProdutos.map(produto => 
                                      produto.id === item.id 
                                        ? { ...produto, para_entrega: !novoValor }
                                        : produto
                                    )
                                  );
                                  if (produtoSelecionado) {
                                    setProdutoSelecionado(prev => ({
                                      ...prev!,
                                      escolas: prev!.escolas.map(escola => 
                                        escola.id === item.id 
                                          ? { ...escola, para_entrega: !novoValor }
                                          : escola
                                      )
                                    }));
                                  }
                                  await carregarGuia();
                                }
                              }}
                              disabled={guia.status !== 'aberta'}
                              color="primary"
                            />
                          }
                          label=""
                          sx={{ m: 0 }}
                        />
                      </TableCell>
                      
                      {/* Status de Entrega */}
                      <TableCell align="center">
                        {(() => {
                          const escolaId = (item as any).escola_id || item.escolaId;
                          const produtoId = (item as any).produto_id || item.produtoId;
                          const lote = item.lote || 'sem_lote';
                          const chaveEntrega = `${escolaId}_${produtoId}_${lote}`;
                          const dadosItem = dadosEntrega[chaveEntrega];
                          
                          if (!normalizeBoolean(item.para_entrega)) {
                            return (
                              <Chip
                                label="Não p/ entrega"
                                size="small"
                                sx={{ bgcolor: 'grey.300', color: 'grey.700' }}
                              />
                            );
                          }
                          
                          if (dadosItem?.entrega_confirmada) {
                            return (
                              <Chip
                                icon={<CheckCircleIcon />}
                                label="Entregue"
                                size="small"
                                color="success"
                                sx={{ fontWeight: 'bold' }}
                              />
                            );
                          } else {
                            return (
                              <Chip
                                icon={<PendingIcon />}
                                label="Pendente"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            );
                          }
                        })()}
                      </TableCell>
                      
                      {/* Quantidade Entregue */}
                      <TableCell align="right">
                        {(() => {
                          const escolaId = (item as any).escola_id || item.escolaId;
                          const produtoId = (item as any).produto_id || item.produtoId;
                          const lote = item.lote || 'sem_lote';
                          const chaveEntrega = `${escolaId}_${produtoId}_${lote}`;
                          const dadosItem = dadosEntrega[chaveEntrega];
                          
                          if (!normalizeBoolean(item.para_entrega)) {
                            return (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            );
                          }
                          
                          if (dadosItem?.entrega_confirmada && dadosItem?.quantidade_entregue) {
                            return (
                              <Box>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  {typeof dadosItem.quantidade_entregue === 'number' 
                                    ? dadosItem.quantidade_entregue.toLocaleString('pt-BR') 
                                    : dadosItem.quantidade_entregue}
                                </Typography>
                                {dadosItem.data_entrega && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {new Date(dadosItem.data_entrega).toLocaleDateString('pt-BR')}
                                  </Typography>
                                )}
                              </Box>
                            );
                          } else {
                            return (
                              <Typography variant="body2" color="warning.main">
                                Pendente
                              </Typography>
                            );
                          }
                        })()}
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {item.observacao || '-'}
                        </Typography>
                      </TableCell>
                      {guia.status === 'aberta' && (
                        <TableCell align="center">
                          <Tooltip title="Remover apenas este item">
                            <IconButton
                              size="small"
                              onClick={() => {
                                handleRemoverProduto((item as any).produto_id || item.produtoId, (item as any).escola_id || item.escolaId);
                                setOpenEscolasProduto(false);
                              }}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    {produtoSelecionado?.totalQuantidade.toLocaleString('pt-BR')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Programado ({produtoSelecionado?.unidade})
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="success.main" fontWeight="bold">
                    {(() => {
                      if (!produtoSelecionado) return '0';
                      let totalEntregue = 0;
                      produtoSelecionado.escolas.forEach((item: any) => {
                        const escolaId = (item as any).escola_id || item.escolaId;
                        const produtoId = (item as any).produto_id || item.produtoId;
                        const lote = item.lote || 'sem_lote';
                        const chaveEntrega = `${escolaId}_${produtoId}_${lote}`;
                        const dadosItem = dadosEntrega[chaveEntrega];
                        if (dadosItem?.entrega_confirmada && dadosItem?.quantidade_entregue) {
                          totalEntregue += parseFloat(dadosItem.quantidade_entregue) || 0;
                        }
                      });
                      return totalEntregue.toLocaleString('pt-BR');
                    })()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Entregue ({produtoSelecionado?.unidade})
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="warning.main" fontWeight="bold">
                    {(() => {
                      if (!produtoSelecionado) return '0';
                      let totalPendente = 0;
                      produtoSelecionado.escolas.forEach((item: any) => {
                        if (normalizeBoolean(item.para_entrega)) {
                          const escolaId = (item as any).escola_id || item.escolaId;
                          const produtoId = (item as any).produto_id || item.produtoId;
                          const lote = item.lote || 'sem_lote';
                          const chaveEntrega = `${escolaId}_${produtoId}_${lote}`;
                          const dadosItem = dadosEntrega[chaveEntrega];
                          if (!dadosItem?.entrega_confirmada) {
                            totalPendente += parseFloat(item.quantidade) || 0;
                          }
                        }
                      });
                      return totalPendente.toLocaleString('pt-BR');
                    })()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pendente Entrega ({produtoSelecionado?.unidade})
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="info.main" fontWeight="bold">
                    {(() => {
                      if (!produtoSelecionado) return '0%';
                      let totalParaEntrega = 0;
                      let totalEntregue = 0;
                      
                      produtoSelecionado.escolas.forEach((item: any) => {
                        if (normalizeBoolean(item.para_entrega)) {
                          totalParaEntrega += parseFloat(item.quantidade) || 0;
                          const escolaId = (item as any).escola_id || item.escolaId;
                          const produtoId = (item as any).produto_id || item.produtoId;
                          const lote = item.lote || 'sem_lote';
                          const chaveEntrega = `${escolaId}_${produtoId}_${lote}`;
                          const dadosItem = dadosEntrega[chaveEntrega];
                          if (dadosItem?.entrega_confirmada && dadosItem?.quantidade_entregue) {
                            totalEntregue += parseFloat(dadosItem.quantidade_entregue) || 0;
                          }
                        }
                      });
                      
                      const percentual = totalParaEntrega > 0 ? (totalEntregue / totalParaEntrega) * 100 : 0;
                      return `${percentual.toFixed(1)}%`;
                    })()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Progresso Entrega
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Box>
              {itensSelecionados.size > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {itensSelecionados.size} de {produtoSelecionado?.escolas.length} itens selecionados
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {guia.status === 'aberta' && itensSelecionados.size > 0 && (
                <Button
                  onClick={() => setItensSelecionados(new Set())}
                  color="inherit"
                >
                  Limpar Seleção
                </Button>
              )}
              <Button onClick={() => setOpenEscolasProduto(false)}>
                Fechar
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuiaDetalhe;