import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, CircularProgress, Alert, IconButton, Chip, TextField, InputAdornment
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Search as SearchIcon } from '@mui/icons-material';
import { buscarFornecedor } from '../services/fornecedores';
import { listarContratos } from '../services/contratos';
import api from '../services/api';

interface ItemContrato {
  id: number;
  contrato_id: number;
  contrato_numero: string;
  produto_id: number;
  produto_nome: string;
  marca: string;
  unidade: string;
  preco_unitario: number;
  quantidade: number;
  valor_total: number;
}

const formatarMoeda = (valor: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

export default function ItensFornecedor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [fornecedor, setFornecedor] = useState<any>(null);
  const [itens, setItens] = useState<ItemContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const carregarDados = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const fornecedorData = await buscarFornecedor(Number(id));
        setFornecedor(fornecedorData);
        
        // Buscar todos os produtos de contratos deste fornecedor diretamente
        const { data } = await api.get(`/contrato-produtos/fornecedor/${id}`);
        const produtos = data.data || [];
        
        const todosItens: ItemContrato[] = produtos.map((item: any) => ({
          id: item.id,
          contrato_id: item.contrato_id,
          contrato_numero: item.contrato_numero,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          marca: item.marca || '-',
          unidade: item.unidade,
          preco_unitario: Number(item.preco_unitario),
          quantidade: Number(item.quantidade_contratada || item.quantidade),
          valor_total: Number(item.preco_unitario) * Number(item.quantidade_contratada || item.quantidade)
        }));
        
        setItens(todosItens);
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [id]);

  const itensFiltrados = useMemo(() => {
    if (!searchTerm) return itens;
    
    const termo = searchTerm.toLowerCase();
    return itens.filter(item => 
      item.produto_nome.toLowerCase().includes(termo) ||
      item.marca.toLowerCase().includes(termo) ||
      item.contrato_numero.toLowerCase().includes(termo) ||
      item.unidade.toLowerCase().includes(termo)
    );
  }, [itens, searchTerm]);

  const valorTotalGeral = itensFiltrados.reduce((total, item) => total + item.valor_total, 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton 
            onClick={() => navigate(`/fornecedores/${id}`)} 
            sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Itens de Contratos - {fornecedor?.nome}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Todos os produtos de todos os contratos deste fornecedor
            </Typography>
          </Box>
        </Box>

        {/* Busca */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Buscar por produto, marca, contrato ou unidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 500 }}
          />
        </Box>

        {/* Resumo */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Card sx={{ flex: 1, p: 2 }}>
            <Typography variant="body2" color="text.secondary">Total de Itens</Typography>
            <Typography variant="h5" fontWeight="bold">
              {itensFiltrados.length}
              {searchTerm && itens.length !== itensFiltrados.length && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  de {itens.length}
                </Typography>
              )}
            </Typography>
          </Card>
          <Card sx={{ flex: 1, p: 2 }}>
            <Typography variant="body2" color="text.secondary">Valor Total</Typography>
            <Typography variant="h5" fontWeight="bold" color="primary.main">
              {formatarMoeda(valorTotalGeral)}
            </Typography>
          </Card>
        </Box>

        {/* Tabela */}
        <Card sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Contrato</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Produto</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Marca</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Unidade</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Preço Unitário</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Quantidade</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Valor Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itensFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">
                        {searchTerm 
                          ? 'Nenhum item encontrado com os termos de busca'
                          : 'Nenhum item encontrado nos contratos deste fornecedor'
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  itensFiltrados.map((item, index) => (
                    <TableRow key={`${item.contrato_id}-${item.id}-${index}`} hover>
                      <TableCell>
                        <Chip label={item.contrato_numero} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{item.produto_nome}</TableCell>
                      <TableCell>{item.marca}</TableCell>
                      <TableCell>{item.unidade}</TableCell>
                      <TableCell align="right">{formatarMoeda(item.preco_unitario)}</TableCell>
                      <TableCell align="right">{item.quantidade.toLocaleString('pt-BR')}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="600" color="primary.main">
                          {formatarMoeda(item.valor_total)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>
    </Box>
  );
}
