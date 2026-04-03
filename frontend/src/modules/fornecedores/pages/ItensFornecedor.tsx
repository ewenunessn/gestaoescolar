import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, CircularProgress, Alert, Chip, TextField, InputAdornment
} from "@mui/material";
import { Search as SearchIcon, Business as BusinessIcon, Inventory as InventoryIcon } from "@mui/icons-material";
import { buscarFornecedor } from "../../../services/fornecedores";
import api from "../../../services/api";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";
import PageContainer from "../../../components/PageContainer";

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
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'produto' | 'contrato' | 'quantidade' | 'preco'>('produto');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [fornecedorData, itensData] = await Promise.all([
        buscarFornecedor(Number(id)),
        listarItensFornecedor(Number(id))
      ]);
      setFornecedor(fornecedorData);
      setItens(itensData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const itensFiltrados = useMemo(() => {
    return itens.filter(item =>
      item.produto_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contrato_numero.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [itens, searchTerm]);

  const itensOrdenados = useMemo(() => {
    return [...itensFiltrados].sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'produto':
          aValue = a.produto_nome;
          bValue = b.produto_nome;
          break;
        case 'contrato':
          aValue = a.contrato_numero;
          bValue = b.contrato_numero;
          break;
        case 'quantidade':
          aValue = a.quantidade;
          bValue = b.quantidade;
          break;
        case 'preco':
          aValue = a.preco_unitario;
          bValue = b.preco_unitario;
          break;
        default:
          return 0;
      }
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [itensFiltrados, sortBy, sortOrder]);

  const itensPaginados = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return itensOrdenados.slice(startIndex, startIndex + rowsPerPage);
  }, [itensOrdenados, page, rowsPerPage]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh" }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error">{error}</Alert>
      </PageContainer>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PageContainer>
        <PageBreadcrumbs 
          items={[
            { label: 'Fornecedores', path: '/fornecedores', icon: <BusinessIcon fontSize="small" /> },
            { label: fornecedor?.nome || 'Fornecedor', path: `/fornecedores/${id}`, icon: <BusinessIcon fontSize="small" /> },
            { label: 'Itens de Contratos', icon: <InventoryIcon fontSize="small" /> }
          ]}
        />
        
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
          Itens de Contratos - {fornecedor?.nome || ''}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Todos os produtos de todos os contratos deste fornecedor
        </Typography>

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
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Contrato</TableCell>
                  <TableCell>Produto</TableCell>
                  <TableCell align="center">Marca</TableCell>
                  <TableCell align="center">Unidade</TableCell>
                  <TableCell align="center">Preço Unitário</TableCell>
                  <TableCell align="center">Quantidade</TableCell>
                  <TableCell align="center">Valor Total</TableCell>
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
                      <TableCell align="center">{item.marca}</TableCell>
                      <TableCell align="center">{item.unidade}</TableCell>
                      <TableCell align="center">{formatarMoeda(item.preco_unitario)}</TableCell>
                      <TableCell align="center">{item.quantidade.toLocaleString('pt-BR')}</TableCell>
                      <TableCell align="center">
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
      </PageContainer>
    </Box>
  );
}
