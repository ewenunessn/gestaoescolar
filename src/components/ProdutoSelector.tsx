import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { produtoService } from '../services/produtoService';
import { Produto } from '../types/produto';

interface ProdutoSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (produto: Produto) => void;
  multiSelect?: boolean;
}

const ProdutoSelector: React.FC<ProdutoSelectorProps> = ({
  open,
  onClose,
  onSelect,
  multiSelect = false
}) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filteredProdutos, setFilteredProdutos] = useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      carregarProdutos();
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = produtos.filter(
        (produto) =>
          produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          produto.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          produto.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProdutos(filtered);
    } else {
      setFilteredProdutos(produtos);
    }
  }, [searchTerm, produtos]);

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      const response = await produtoService.listarProdutos();
      setProdutos(response.data);
      setFilteredProdutos(response.data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (produto: Produto) => {
    onSelect(produto);
    onClose();
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Selecionar Produto</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
            variant="outlined"
            size="small"
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredProdutos.map((produto) => (
              <ListItemButton
                key={produto.id}
                onClick={() => handleSelect(produto)}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  mb: 1,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <ListItemText
                  primary={produto.nome}
                  secondary={
                    <Box>
                      {produto.codigo && (
                        <Typography variant="body2" color="textSecondary">
                          Código: {produto.codigo}
                        </Typography>
                      )}
                      {produto.descricao && (
                        <Typography variant="body2" color="textSecondary">
                          {produto.descricao}
                        </Typography>
                      )}
                      <Typography variant="body2" color="primary">
                        {produto.unidade}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {filteredProdutos.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="textSecondary">
              {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProdutoSelector;