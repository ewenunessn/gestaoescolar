import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import { guiaService, Guia, AddProdutoGuiaData } from '../services/guiaService';
import { listarProdutos } from '../services/produtos';
import { escolaService } from '../services/escolaService';

interface AdicionarProdutoIndividualProps {
  open: boolean;
  onClose: () => void;
  guia: Guia | null;
  onUpdate: () => void;
}

const AdicionarProdutoIndividual: React.FC<AdicionarProdutoIndividualProps> = ({ 
  open, 
  onClose, 
  guia, 
  onUpdate 
}) => {
  const [escolas, setEscolas] = useState<any[]>([]);
  const [produtosList, setProdutosList] = useState<any[]>([]);
  const [selectedEscola, setSelectedEscola] = useState('');
  const [selectedProduto, setSelectedProduto] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('');
  const [lote, setLote] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  const { success, error } = useNotification();

  useEffect(() => {
    if (open) {
      carregarDados();
    }
  }, [open]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [escolasData, produtosData] = await Promise.all([
        escolaService.listarEscolas(),
        listarProdutos()
      ]);

      setEscolas(Array.isArray(escolasData) ? escolasData : []);
      setProdutosList(Array.isArray(produtosData) ? produtosData : []);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleProdutoChange = (produtoId: string) => {
    setSelectedProduto(produtoId);
    const produto = produtosList.find(p => p.id.toString() === produtoId);
    if (produto) {
      setUnidade(produto.unidade || 'kg');
    }
  };

  const handleSalvar = async () => {
    if (!guia || !selectedProduto || !selectedEscola || !quantidade || !unidade) {
      error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);
      
      const data: AddProdutoGuiaData = {
        produtoId: parseInt(selectedProduto),
        escolaId: parseInt(selectedEscola),
        quantidade: parseFloat(quantidade),
        unidade,
        lote: lote || undefined,
        observacao
      };

      await guiaService.adicionarProdutoGuia(guia.id, data);
      success('Produto adicionado com sucesso!');
      
      // Limpar formulário
      setSelectedEscola('');
      setSelectedProduto('');
      setQuantidade('');
      setUnidade('');
      setLote('');
      setObservacao('');
      
      onUpdate();
      onClose();
    } catch (errorCatch: any) {
      error(errorCatch.response?.data?.error || 'Erro ao adicionar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Adicionar Produto Individual</DialogTitle>
      <DialogContent>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <CircularProgress />
          </div>
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Escola</InputLabel>
                <Select
                  value={selectedEscola}
                  onChange={(e) => setSelectedEscola(e.target.value)}
                  label="Escola"
                >
                  {escolas.map((escola) => (
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
                  onChange={(e) => handleProdutoChange(e.target.value)}
                  label="Produto"
                >
                  {produtosList.map((produto) => (
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
                required
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                label="Unidade"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Lote (Opcional)"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                fullWidth
                placeholder="Ex: Lote-001, 2024-12-10"
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
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSalvar} 
          variant="contained" 
          disabled={loading || !selectedProduto || !selectedEscola || !quantidade || !unidade}
        >
          {loading ? <CircularProgress size={24} /> : 'Adicionar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdicionarProdutoIndividual;