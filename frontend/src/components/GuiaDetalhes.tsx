import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Chip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { guiaService, Guia, GuiaProdutoEscola, AddProdutoGuiaData } from '../services/guiaService';
import { produtoService } from '../services/produtoService';
import { escolaService } from '../services/escolaService';
import ProdutoSelector from './ProdutoSelector';

interface GuiaDetalhesProps {
  open: boolean;
  onClose: () => void;
  guia: Guia | null;
  onUpdate: () => void;
}

const GuiaDetalhes: React.FC<GuiaDetalhesProps> = ({ open, onClose, guia, onUpdate }) => {
  const [produtos, setProdutos] = useState<GuiaProdutoEscola[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAddProduto, setOpenAddProduto] = useState(false);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [produtosList, setProdutosList] = useState<any[]>([]);
  const [selectedEscola, setSelectedEscola] = useState('');
  const [selectedProduto, setSelectedProduto] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('');
  const [observacao, setObservacao] = useState('');

  const { success, error } = useNotification();

  useEffect(() => {
    if (guia) {
      carregarProdutos();
      carregarEscolas();
      carregarProdutosDisponiveis();
    }
  }, [guia]);

  const carregarProdutos = async () => {
    if (!guia) return;
    
    try {
      setLoading(true);
      const response = await guiaService.listarProdutosGuia(guia.id);
      setProdutos(response.data);
    } catch (errorCatch: any) {
      error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const carregarEscolas = async () => {
    try {
      const response = await escolaService.listarEscolas();
      setEscolas(response.data);
    } catch (errorCatch: any) {
      error('Erro ao carregar escolas');
    }
  };

  const carregarProdutosDisponiveis = async () => {
    try {
      const response = await produtoService.listarProdutos();
      setProdutosList(response.data);
    } catch (errorCatch: any) {
      error('Erro ao carregar produtos');
    }
  };

  const handleAddProduto = async () => {
    if (!guia || !selectedProduto || !selectedEscola || !quantidade || !unidade) {
      error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const data: AddProdutoGuiaData = {
        produtoId: parseInt(selectedProduto),
        escolaId: parseInt(selectedEscola),
        quantidade: parseFloat(quantidade),
        unidade,
        observacao
      };

      await guiaService.adicionarProdutoGuia(guia.id, data);
      success('Produto adicionado com sucesso!');
      setOpenAddProduto(false);
      setSelectedEscola('');
      setSelectedProduto('');
      setQuantidade('');
      setUnidade('');
      setObservacao('');
      carregarProdutos();
      onUpdate();
    } catch (errorCatch: any) {
      error(errorCatch.response?.data?.error || 'Erro ao adicionar produto');
    }
  };

  const handleRemoveProduto = async (produtoId: number, escolaId: number) => {
    if (!guia) return;
    
    if (window.confirm('Tem certeza que deseja remover este produto?')) {
      try {
        await guiaService.removerProdutoGuia(guia.id, produtoId, escolaId);
        success('Produto removido com sucesso!');
        carregarProdutos();
        onUpdate();
      } catch (errorCatch: any) {
        error('Erro ao remover produto');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'success';
      case 'fechada':
        return 'default';
      case 'cancelada':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'Aberta';
      case 'fechada':
        return 'Fechada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  if (!guia) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          Guia de Demanda - {guia.mes}/{guia.ano}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
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
                  color={getStatusColor(guia.status)}
                  size="small"
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
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Produtos por Escola ({produtos?.length || 0})
            </Typography>
            {guia.status === 'aberta' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenAddProduto(true)}
                size="small"
              >
                Adicionar Produto
              </Button>
            )}
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Escola</TableCell>
                  <TableCell>Produto</TableCell>
                  <TableCell align="right">Quantidade</TableCell>
                  <TableCell>Unidade</TableCell>
                  <TableCell>Observação</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {produtos?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.escola?.nome}</TableCell>
                    <TableCell>{item.produto?.nome}</TableCell>
                    <TableCell align="right">{item.quantidade}</TableCell>
                    <TableCell>{item.unidade}</TableCell>
                    <TableCell>{item.observacao || '-'}</TableCell>
                    <TableCell align="center">
                      {guia.status === 'aberta' && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveProduto(item.produtoId, item.escolaId)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {(!produtos || produtos.length === 0) && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary">
                Nenhum produto adicionado ainda.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para adicionar produto */}
      <Dialog open={openAddProduto} onClose={() => setOpenAddProduto(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Produto à Guia</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Escola</InputLabel>
                <Select
                  value={selectedEscola}
                  onChange={(e) => setSelectedEscola(e.target.value)}
                  label="Escola"
                >
                  {escolas?.map((escola) => (
                    <MenuItem key={escola.id} value={escola.id}>
                      {escola.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Produto</InputLabel>
                <Select
                  value={selectedProduto}
                  onChange={(e) => setSelectedProduto(e.target.value)}
                  label="Produto"
                >
                  {produtosList?.map((produto) => (
                    <MenuItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Quantidade"
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                fullWidth
                inputProps={{ step: 0.001, min: 0 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Unidade"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Observação"
                multiline
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddProduto(false)}>Cancelar</Button>
          <Button onClick={handleAddProduto} variant="contained">
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GuiaDetalhes;