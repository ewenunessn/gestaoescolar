import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Alert,
  Divider,
  Autocomplete,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon
} from '@mui/icons-material';
import pedidosService from '../services/pedidos';
import { ContratoProduto } from '../types/pedido';
import { formatarMoeda } from '../utils/dateUtils';

interface ItemPedido {
  contrato_produto_id: number;
  produto_nome: string;
  unidade: string;
  fornecedor_nome: string;
  contrato_numero: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  data_entrega_prevista: string;
  observacoes?: string;
}

export default function NovoPedido() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<ContratoProduto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ContratoProduto | null>(null);
  
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [erro, setErro] = useState('');

  // Data padrão: 7 dias a partir de hoje
  const getDataPadrao = () => {
    const data = new Date();
    data.setDate(data.getDate() + 7);
    return data.toISOString().split('T')[0];
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      const produtos = await pedidosService.listarTodosProdutosDisponiveis();
      setProdutosDisponiveis(produtos);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setErro('Erro ao carregar produtos disponíveis');
    }
  };

  const adicionarProduto = () => {
    if (!produtoSelecionado) {
      setErro('Selecione um produto');
      return;
    }

    const novoItem: ItemPedido = {
      contrato_produto_id: produtoSelecionado.contrato_produto_id,
      produto_nome: produtoSelecionado.produto_nome,
      unidade: produtoSelecionado.unidade,
      fornecedor_nome: produtoSelecionado.fornecedor_nome,
      contrato_numero: produtoSelecionado.contrato_numero,
      quantidade: 1,
      preco_unitario: produtoSelecionado.preco_unitario,
      valor_total: produtoSelecionado.preco_unitario,
      data_entrega_prevista: getDataPadrao(),
      observacoes: ''
    };

    setItens([...itens, novoItem]);
    setProdutoSelecionado(null);
    setErro('');
  };

  const removerItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const atualizarQuantidade = (index: number, quantidade: number) => {
    const novosItens = [...itens];
    novosItens[index].quantidade = quantidade;
    novosItens[index].valor_total = quantidade * novosItens[index].preco_unitario;
    setItens(novosItens);
  };

  const atualizarDataEntrega = (index: number, data: string) => {
    const novosItens = [...itens];
    novosItens[index].data_entrega_prevista = data;
    setItens(novosItens);
  };

  const atualizarObservacoes = (index: number, observacoes: string) => {
    const novosItens = [...itens];
    novosItens[index].observacoes = observacoes;
    setItens(novosItens);
  };

  const calcularValorTotal = () => {
    return itens.reduce((total, item) => total + item.valor_total, 0);
  };

  const agruparPorFornecedor = () => {
    const grupos: { [key: string]: ItemPedido[] } = {};
    itens.forEach(item => {
      if (!grupos[item.fornecedor_nome]) {
        grupos[item.fornecedor_nome] = [];
      }
      grupos[item.fornecedor_nome].push(item);
    });
    return grupos;
  };

  const validarFormulario = () => {
    if (itens.length === 0) {
      setErro('Adicione pelo menos um item ao pedido');
      return false;
    }
    if (itens.some(item => item.quantidade <= 0)) {
      setErro('Todas as quantidades devem ser maiores que zero');
      return false;
    }
    if (itens.some(item => !item.data_entrega_prevista)) {
      setErro('Todos os itens devem ter data de entrega prevista');
      return false;
    }
    return true;
  };

  const handleSubmit = async (salvarComoRascunho: boolean = false) => {
    if (!validarFormulario()) return;

    try {
      setLoading(true);
      setErro('');

      const dados = {
        observacoes: observacoes || undefined,
        salvar_como_rascunho: salvarComoRascunho,
        itens: itens.map(item => ({
          contrato_produto_id: item.contrato_produto_id,
          quantidade: item.quantidade,
          data_entrega_prevista: item.data_entrega_prevista,
          observacoes: item.observacoes
        }))
      };

      const pedido = await pedidosService.criar(dados);
      navigate(`/pedidos/${pedido.id}`);
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error);
      setErro(error.response?.data?.message || 'Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  };

  const gruposFornecedores = agruparPorFornecedor();
  const totalFornecedores = Object.keys(gruposFornecedores).length;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/pedidos')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Novo Pedido de Compra
        </Typography>
      </Box>

      {erro && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
          {erro}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Adicionar Produtos
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={9}>
                  <Autocomplete
                    value={produtoSelecionado}
                    onChange={(_, newValue) => setProdutoSelecionado(newValue)}
                    options={produtosDisponiveis}
                    groupBy={(option) => option.fornecedor_nome}
                    getOptionLabel={(option) => 
                      `${option.produto_nome} - ${option.fornecedor_nome} (${formatarMoeda(option.preco_unitario)}/${option.unidade})`
                    }
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Buscar produto" 
                        placeholder="Digite para buscar..."
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box>
                          <Typography variant="body2">
                            <strong>{option.produto_nome}</strong>
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.fornecedor_nome} - Contrato {option.contrato_numero} - {formatarMoeda(option.preco_unitario)}/{option.unidade}
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={adicionarProduto}
                    disabled={!produtoSelecionado}
                  >
                    Adicionar
                  </Button>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Observações Gerais do Pedido"
                  multiline
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações que se aplicam a todo o pedido..."
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumo
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Total de Itens:</Typography>
                <Typography fontWeight="bold">{itens.length}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Fornecedores:</Typography>
                <Typography fontWeight="bold">{totalFornecedores}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Quantidade Total:</Typography>
                <Typography fontWeight="bold">
                  {itens.reduce((sum, item) => sum + item.quantidade, 0)}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Valor Total:</Typography>
                <Typography variant="h6" color="primary" fontWeight="bold">
                  {formatarMoeda(calcularValorTotal())}
                </Typography>
              </Box>

              {totalFornecedores > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Fornecedores no pedido:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.keys(gruposFornecedores).map(fornecedor => (
                      <Chip 
                        key={fornecedor} 
                        label={`${fornecedor} (${gruposFornecedores[fornecedor].length})`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Itens do Pedido
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Fornecedor</TableCell>
                      <TableCell>Contrato</TableCell>
                      <TableCell>Unidade</TableCell>
                      <TableCell width="100">Quantidade</TableCell>
                      <TableCell width="140">Data Entrega</TableCell>
                      <TableCell align="right">Preço Unit.</TableCell>
                      <TableCell align="right">Valor Total</TableCell>
                      <TableCell width="150">Observações</TableCell>
                      <TableCell align="center" width="60">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {itens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center">
                          Nenhum item adicionado
                        </TableCell>
                      </TableRow>
                    ) : (
                      itens.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.produto_nome}</TableCell>
                          <TableCell>{item.fornecedor_nome}</TableCell>
                          <TableCell>{item.contrato_numero}</TableCell>
                          <TableCell>{item.unidade}</TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={item.quantidade}
                              onChange={(e) => atualizarQuantidade(index, parseFloat(e.target.value) || 0)}
                              inputProps={{ min: 0, step: 0.001 }}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="date"
                              size="small"
                              value={item.data_entrega_prevista}
                              onChange={(e) => atualizarDataEntrega(index, e.target.value)}
                              fullWidth
                              InputLabelProps={{ shrink: true }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatarMoeda(item.preco_unitario)}
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold">
                              {formatarMoeda(item.valor_total)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.observacoes || ''}
                              onChange={(e) => atualizarObservacoes(index, e.target.value)}
                              fullWidth
                              placeholder="Obs. do item"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removerItem(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/pedidos')}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={() => handleSubmit(true)}
                disabled={loading || itens.length === 0}
              >
                {loading ? 'Salvando...' : 'Salvar como Rascunho'}
              </Button>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => handleSubmit(false)}
                disabled={loading || itens.length === 0}
              >
                {loading ? 'Enviando...' : 'Criar e Enviar Pedido'}
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
