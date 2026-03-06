import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography,
  Chip, List, ListItem, ListItemText, Divider
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon,
  Restaurant as RestaurantIcon, ShoppingCart as ProductIcon
} from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import {
  buscarCardapioModalidade, listarRefeicoesCardapio, criarRefeicaoDia,
  editarRefeicaoDia, removerRefeicaoDia, listarProdutosRefeicao,
  adicionarProdutoRefeicao, editarProdutoRefeicao, removerProdutoRefeicao,
  CardapioModalidade, RefeicaoDia, ProdutoRefeicao, TIPOS_REFEICAO
} from '../services/cardapiosModalidade';
import { listarProdutos, Produto } from '../services/produtoService';

const CardapioRefeicoesPage: React.FC = () => {
  const { cardapioId } = useParams<{ cardapioId: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [cardapio, setCardapio] = useState<CardapioModalidade | null>(null);
  const [refeicoes, setRefeicoes] = useState<RefeicaoDia[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [openRefeicaoDialog, setOpenRefeicaoDialog] = useState(false);
  const [editModeRefeicao, setEditModeRefeicao] = useState(false);
  const [selectedRefeicaoId, setSelectedRefeicaoId] = useState<number | null>(null);
  const [formRefeicao, setFormRefeicao] = useState({
    data: '', tipo_refeicao: '', descricao: '', observacao: '', ativo: true
  });

  const [openProdutosDialog, setOpenProdutosDialog] = useState(false);
  const [refeicaoSelecionada, setRefeicaoSelecionada] = useState<RefeicaoDia | null>(null);
  const [produtosRefeicao, setProdutosRefeicao] = useState<ProdutoRefeicao[]>([]);
  const [openAddProdutoDialog, setOpenAddProdutoDialog] = useState(false);
  const [formProduto, setFormProduto] = useState({
    produto_id: '', quantidade: '', per_capita: false, observacao: ''
  });
  const [editModeProduto, setEditModeProduto] = useState(false);
  const [selectedProdutoId, setSelectedProdutoId] = useState<number | null>(null);

  useEffect(() => {
    if (cardapioId) loadData();
  }, [cardapioId]);

  const loadData = async () => {
    try {
      const [cardapioData, refeicoesData, produtosData] = await Promise.all([
        buscarCardapioModalidade(parseInt(cardapioId!)),
        listarRefeicoesCardapio(parseInt(cardapioId!)),
        listarProdutos()
      ]);
      setCardapio(cardapioData);
      setRefeicoes(refeicoesData);
      setProdutos(produtosData);
    } catch (err) {
      error('Erro ao carregar cardápio');
    }
  };

  const handleOpenRefeicaoDialog = (refeicao?: RefeicaoDia) => {
    if (refeicao) {
      setEditModeRefeicao(true);
      setSelectedRefeicaoId(refeicao.id);
      setFormRefeicao({
        data: refeicao.data.split('T')[0],
        tipo_refeicao: refeicao.tipo_refeicao,
        descricao: refeicao.descricao || '',
        observacao: refeicao.observacao || '',
        ativo: refeicao.ativo
      });
    } else {
      setEditModeRefeicao(false);
      setSelectedRefeicaoId(null);
      setFormRefeicao({ data: '', tipo_refeicao: '', descricao: '', observacao: '', ativo: true });
    }
    setOpenRefeicaoDialog(true);
  };

  const handleSubmitRefeicao = async () => {
    try {
      if (!formRefeicao.data || !formRefeicao.tipo_refeicao) {
        error('Preencha data e tipo de refeição');
        return;
      }
      if (editModeRefeicao && selectedRefeicaoId) {
        await editarRefeicaoDia(selectedRefeicaoId, formRefeicao);
        success('Refeição atualizada!');
      } else {
        await criarRefeicaoDia(parseInt(cardapioId!), formRefeicao);
        success('Refeição criada!');
      }
      setOpenRefeicaoDialog(false);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao salvar refeição');
    }
  };

  const handleDeleteRefeicao = async (refeicaoId: number) => {
    if (window.confirm('Remover esta refeição?')) {
      try {
        await removerRefeicaoDia(refeicaoId);
        success('Refeição removida!');
        loadData();
      } catch (err) {
        error('Erro ao remover refeição');
      }
    }
  };

  const handleOpenProdutosDialog = async (refeicao: RefeicaoDia) => {
    try {
      setRefeicaoSelecionada(refeicao);
      const produtosData = await listarProdutosRefeicao(refeicao.id);
      setProdutosRefeicao(produtosData);
      setOpenProdutosDialog(true);
    } catch (err) {
      error('Erro ao carregar produtos');
    }
  };

  const handleOpenAddProdutoDialog = (produto?: ProdutoRefeicao) => {
    if (produto) {
      setEditModeProduto(true);
      setSelectedProdutoId(produto.id);
      setFormProduto({
        produto_id: produto.produto_id.toString(),
        quantidade: produto.quantidade.toString(),
        per_capita: produto.per_capita,
        observacao: produto.observacao || ''
      });
    } else {
      setEditModeProduto(false);
      setSelectedProdutoId(null);
      setFormProduto({ produto_id: '', quantidade: '', per_capita: false, observacao: '' });
    }
    setOpenAddProdutoDialog(true);
  };

  const handleSubmitProduto = async () => {
    try {
      if (!formProduto.produto_id || !formProduto.quantidade) {
        error('Selecione produto e quantidade');
        return;
      }
      const data = {
        produto_id: parseInt(formProduto.produto_id),
        quantidade: parseFloat(formProduto.quantidade),
        per_capita: formProduto.per_capita,
        observacao: formProduto.observacao || undefined
      };
      if (editModeProduto && selectedProdutoId) {
        await editarProdutoRefeicao(selectedProdutoId, data);
        success('Produto atualizado!');
      } else {
        await adicionarProdutoRefeicao(refeicaoSelecionada!.id, data);
        success('Produto adicionado!');
      }
      setOpenAddProdutoDialog(false);
      const produtosData = await listarProdutosRefeicao(refeicaoSelecionada!.id);
      setProdutosRefeicao(produtosData);
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao salvar produto');
    }
  };

  const handleDeleteProduto = async (produtoId: number) => {
    if (window.confirm('Remover este produto?')) {
      try {
        await removerProdutoRefeicao(produtoId);
        success('Produto removido!');
        const produtosData = await listarProdutosRefeicao(refeicaoSelecionada!.id);
        setProdutosRefeicao(produtosData);
      } catch (err) {
        error('Erro ao remover produto');
      }
    }
  };

  const refeicoesPorData = refeicoes.reduce((acc, refeicao) => {
    const data = refeicao.data.split('T')[0];
    if (!acc[data]) acc[data] = [];
    acc[data].push(refeicao);
    return acc;
  }, {} as Record<string, RefeicaoDia[]>);

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/cardapios')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4">{cardapio?.nome}</Typography>
          <Typography variant="subtitle1" color="textSecondary">
            {cardapio?.modalidade_nome}
          </Typography>
        </Box>
      </Box>

      <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenRefeicaoDialog()} sx={{ mb: 3 }}>
        Nova Refeição
      </Button>

      {Object.keys(refeicoesPorData).length === 0 ? (
        <Card><CardContent><Typography align="center" color="textSecondary">Nenhuma refeição cadastrada</Typography></CardContent></Card>
      ) : (
        Object.entries(refeicoesPorData).sort(([a], [b]) => a.localeCompare(b)).map(([data, refeicoesData]) => (
          <Card key={data} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📅 {new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
              <List>
                {refeicoesData.map((refeicao, index) => (
                  <React.Fragment key={refeicao.id}>
                    {index > 0 && <Divider />}
                    <ListItem secondaryAction={
                      <Box>
                        <IconButton size="small" color="primary" onClick={() => handleOpenProdutosDialog(refeicao)}><ProductIcon /></IconButton>
                        <IconButton size="small" color="primary" onClick={() => handleOpenRefeicaoDialog(refeicao)}><EditIcon /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteRefeicao(refeicao.id)}><DeleteIcon /></IconButton>
                      </Box>
                    }>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <RestaurantIcon fontSize="small" />
                            <Typography variant="subtitle1">{TIPOS_REFEICAO[refeicao.tipo_refeicao]}</Typography>
                            <Chip label={`${refeicao.total_produtos || 0} produtos`} size="small" color="primary" variant="outlined" />
                          </Box>
                        }
                        secondary={<>{refeicao.descricao && <Typography variant="body2">{refeicao.descricao}</Typography>}</>}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={openRefeicaoDialog} onClose={() => setOpenRefeicaoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editModeRefeicao ? 'Editar Refeição' : 'Nova Refeição'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Data" type="date" fullWidth required InputLabelProps={{ shrink: true }}
              value={formRefeicao.data} onChange={(e) => setFormRefeicao({ ...formRefeicao, data: e.target.value })} />
            <FormControl fullWidth required>
              <InputLabel>Tipo de Refeição</InputLabel>
              <Select value={formRefeicao.tipo_refeicao} onChange={(e) => setFormRefeicao({ ...formRefeicao, tipo_refeicao: e.target.value })} label="Tipo de Refeição">
                {Object.entries(TIPOS_REFEICAO).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Descrição" fullWidth multiline rows={2} value={formRefeicao.descricao}
              onChange={(e) => setFormRefeicao({ ...formRefeicao, descricao: e.target.value })} />
            <TextField label="Observação" fullWidth multiline rows={2} value={formRefeicao.observacao}
              onChange={(e) => setFormRefeicao({ ...formRefeicao, observacao: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRefeicaoDialog(false)}>Cancelar</Button>
          <Button onClick={handleSubmitRefeicao} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openProdutosDialog} onClose={() => setOpenProdutosDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Produtos - {refeicaoSelecionada && TIPOS_REFEICAO[refeicaoSelecionada.tipo_refeicao]}</DialogTitle>
        <DialogContent>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenAddProdutoDialog()} sx={{ mb: 2 }}>Adicionar Produto</Button>
          {produtosRefeicao.length === 0 ? (
            <Typography align="center" color="textSecondary">Nenhum produto cadastrado</Typography>
          ) : (
            <List>
              {produtosRefeicao.map((produto, index) => (
                <React.Fragment key={produto.id}>
                  {index > 0 && <Divider />}
                  <ListItem secondaryAction={
                    <Box>
                      <IconButton size="small" color="primary" onClick={() => handleOpenAddProdutoDialog(produto)}><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteProduto(produto.id)}><DeleteIcon /></IconButton>
                    </Box>
                  }>
                    <ListItemText primary={produto.produto_nome}
                      secondary={`${produto.quantidade} ${produto.unidade}${produto.per_capita ? ' (per capita)' : ''}${produto.observacao ? ` • ${produto.observacao}` : ''}`} />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenProdutosDialog(false)}>Fechar</Button></DialogActions>
      </Dialog>

      <Dialog open={openAddProdutoDialog} onClose={() => setOpenAddProdutoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editModeProduto ? 'Editar Produto' : 'Adicionar Produto'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required disabled={editModeProduto}>
              <InputLabel>Produto</InputLabel>
              <Select value={formProduto.produto_id} onChange={(e) => setFormProduto({ ...formProduto, produto_id: e.target.value })} label="Produto">
                {produtos.map((p) => <MenuItem key={p.id} value={p.id}>{p.nome} ({p.unidade})</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Quantidade" type="number" fullWidth required value={formProduto.quantidade}
              onChange={(e) => setFormProduto({ ...formProduto, quantidade: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select value={formProduto.per_capita ? 'per_capita' : 'total'}
                onChange={(e) => setFormProduto({ ...formProduto, per_capita: e.target.value === 'per_capita' })} label="Tipo">
                <MenuItem value="per_capita">Per Capita (por aluno)</MenuItem>
                <MenuItem value="total">Total</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Observação" fullWidth multiline rows={2} value={formProduto.observacao}
              onChange={(e) => setFormProduto({ ...formProduto, observacao: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddProdutoDialog(false)}>Cancelar</Button>
          <Button onClick={handleSubmitProduto} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CardapioRefeicoesPage;
