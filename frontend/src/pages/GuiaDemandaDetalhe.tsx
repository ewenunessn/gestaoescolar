import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Chip,
  InputAdornment,
  CircularProgress,
  Tooltip,
  TablePagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  CalendarMonth as CalendarIcon,
  School as SchoolIcon,
  FilterList as FilterListIcon,
  Add as AddIcon
} from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import Toast from '../components/Toast';
import StatusIndicator from '../components/StatusIndicator';
import TableFilter, { FilterField } from '../components/TableFilter';
import { guiaService } from '../services/guiaService';
import { produtoService } from '../services/produtoService';
import api from '../services/api';

interface EscolaGuia {
  id: number;
  nome: string;
  escola_rota?: string;
  ordem_rota?: number;
  total_itens: number;
  qtd_pendente: number;
  qtd_programada: number;
  qtd_parcial: number;
  qtd_entregue: number;
  qtd_cancelado: number;
}

const GuiaDemandaDetalhe: React.FC = () => {
  const navigate = useNavigate();
  const { guiaId } = useParams<{ guiaId: string }>();
  
  const [guia, setGuia] = useState<any>(null);
  const [escolas, setEscolas] = useState<EscolaGuia[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Filtros
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  
  // Modal de adicionar em lote
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [batchForm, setBatchForm] = useState({
    produtoId: '',
    unidade: '',
    data_entrega: new Date().toISOString().split('T')[0]
  });
  const [batchQuantidades, setBatchQuantidades] = useState<Record<number, string>>({});
  const [batchStatus, setBatchStatus] = useState<Record<number, string>>({});
  const [batchSaving, setBatchSaving] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  
  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (guiaId) {
      loadGuiaDetalhes();
      loadProdutos();
    }
  }, [guiaId]);
  
  const loadProdutos = async () => {
    try {
      const data = await produtoService.listar();
      setProdutos(data);
      console.log('Produtos carregados:', data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadGuiaDetalhes = async () => {
    try {
      setLoading(true);
      const guiaData = await guiaService.buscarGuia(Number(guiaId));
      console.log('Guia carregada:', guiaData);
      
      setGuia(guiaData);
      
      // Carregar escolas usando mes e ano da guia
      if (guiaData?.mes && guiaData?.ano) {
        console.log(`Carregando escolas para ${guiaData.mes}/${guiaData.ano}`);
        const escolasData = await guiaService.listarStatusEscolas(guiaData.mes, guiaData.ano);
        console.log('Escolas carregadas:', escolasData);
        console.log('Primeira escola:', escolasData[0]);
        setEscolas(escolasData);
      } else {
        console.warn('Guia sem mês/ano:', guiaData);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes da guia:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEscolas = useMemo(() => {
    let result = escolas.filter(e => 
      e.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Aplicar filtros
    if (filters.rota) {
      result = result.filter(e => e.escola_rota === filters.rota);
    }
    
    if (filters.status) {
      result = result.filter(e => {
        const totalItens = Number(e.total_itens) || 0;
        const qtdEntregue = Number(e.qtd_entregue) || 0;
        const qtdPendente = Number(e.qtd_pendente) || 0;
        
        switch (filters.status) {
          case 'completo':
            return totalItens > 0 && qtdEntregue === totalItens;
          case 'pendente':
            return qtdPendente > 0;
          case 'sem_itens':
            return totalItens === 0;
          case 'parcial':
            return qtdEntregue > 0 && qtdEntregue < totalItens;
          default:
            return true;
        }
      });
    }
    
    return result;
  }, [escolas, searchTerm, filters]);

  const paginatedEscolas = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredEscolas.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredEscolas, page, rowsPerPage]);

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
      'pendente': 'default',
      'programada': 'info',
      'parcial': 'warning',
      'entregue': 'success',
      'cancelado': 'error'
    };
    return statusMap[status] || 'default';
  };

  const getMesNome = (mes: number) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return meses[mes - 1];
  };
  
  // Obter rotas únicas
  const rotasUnicas = useMemo(() => {
    const rotas = escolas.map(e => e.escola_rota).filter(Boolean);
    return Array.from(new Set(rotas)).sort();
  }, [escolas]);
  
  // Definir campos de filtro
  const filterFields: FilterField[] = [
    {
      key: 'rota',
      label: 'Rota',
      type: 'select',
      options: rotasUnicas.map(r => ({ value: r!, label: r! }))
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'completo', label: 'Completo' },
        { value: 'parcial', label: 'Parcial' },
        { value: 'pendente', label: 'Pendente' },
        { value: 'sem_itens', label: 'Sem Itens' }
      ]
    }
  ];
  
  const handleBatchSubmit = async () => {
    if (!batchForm.produtoId || !batchForm.data_entrega || !guia) {
      return;
    }

    const payloads = escolas
      .map((escola) => {
        const quantidade = Number(batchQuantidades[escola.id] || 0);
        const status = batchStatus[escola.id] || 'pendente';
        return {
          escola,
          quantidade,
          status
        };
      })
      .filter((item) => item.quantidade > 0);

    if (payloads.length === 0) {
      return;
    }

    try {
      setBatchSaving(true);

      for (const { escola, quantidade, status } of payloads) {
        const data = {
          produtoId: parseInt(batchForm.produtoId),
          quantidade,
          unidade: batchForm.unidade || 'Kg',
          data_entrega: batchForm.data_entrega,
          mes_competencia: guia.mes,
          ano_competencia: guia.ano,
          status
        };

        // Usar a rota correta: /escola/:escolaId/produtos
        await api.post(`/guias/escola/${escola.id}/produtos`, data);
      }

      setSuccessMessage('Quantidades adicionadas com sucesso!');
      setOpenBatchDialog(false);
      setBatchQuantidades({});
      setBatchStatus({});
      loadGuiaDetalhes();
    } catch (err) {
      console.error('Erro ao salvar em lote:', err);
    } finally {
      setBatchSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      {successMessage && (
        <Toast message={successMessage} severity="success" onClose={() => setSuccessMessage(null)} />
      )}

      <PageContainer fullHeight>
        <PageBreadcrumbs
          items={[
            { label: 'Guias de Demanda', path: '/guias-demanda', icon: <CalendarIcon fontSize="small" /> },
            { label: guia?.nome || 'Detalhes' }
          ]}
        />

        {/* Barra de Pesquisa e Cards de Resumo na mesma linha */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'stretch' }}>
          <Card sx={{ borderRadius: '12px', p: 2, flex: '0 0 500px' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                placeholder="Buscar escolas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Tooltip title="Filtros">
                <IconButton
                  size="small"
                  onClick={(e) => setFilterAnchor(e.currentTarget)}
                  sx={{
                    bgcolor: Object.keys(filters).length > 0 ? 'primary.main' : 'transparent',
                    color: Object.keys(filters).length > 0 ? 'white' : 'text.secondary',
                    '&:hover': {
                      bgcolor: Object.keys(filters).length > 0 ? 'primary.dark' : 'action.hover',
                    }
                  }}
                >
                  <FilterListIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenBatchDialog(true)}
                size="small"
                sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, whiteSpace: 'nowrap' }}
              >
                Adicionar em Lote
              </Button>
            </Box>
          </Card>
          
          <TableFilter
            open={Boolean(filterAnchor)}
            onClose={() => setFilterAnchor(null)}
            onApply={(newFilters) => {
              setFilters(newFilters);
              setFilterAnchor(null);
            }}
            fields={filterFields}
            initialValues={filters}
            anchorEl={filterAnchor}
            showSearch={false}
          />
          
          <Card sx={{ p: 1.5, flex: 1, minWidth: '100px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Total de Escolas</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>{escolas.length}</Typography>
          </Card>
          <Card sx={{ p: 1.5, flex: 1, minWidth: '100px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Total de Itens</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {escolas.reduce((sum, e) => sum + 
                (Number(e.qtd_pendente) || 0) + 
                (Number(e.qtd_programada) || 0) + 
                (Number(e.qtd_parcial) || 0) + 
                (Number(e.qtd_entregue) || 0) + 
                (Number(e.qtd_cancelado) || 0), 0)}
            </Typography>
          </Card>
          <Card sx={{ p: 1.5, flex: 1, minWidth: '100px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Entregues</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
              {escolas.reduce((sum, e) => sum + (Number(e.qtd_entregue) || 0), 0)}
            </Typography>
          </Card>
          <Card sx={{ p: 1.5, flex: 1, minWidth: '100px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Pendentes</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'warning.main' }}>
              {escolas.reduce((sum, e) => sum + (Number(e.qtd_pendente) || 0), 0)}
            </Typography>
          </Card>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, px: 1 }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
            Exibindo {filteredEscolas.length} {filteredEscolas.length === 1 ? 'escola' : 'escolas'}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : filteredEscolas.length === 0 ? (
            <Box textAlign="center" py={8}>
              <SchoolIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {escolas.length === 0 
                  ? 'Nenhuma escola com itens cadastrados para esta competência'
                  : 'Nenhuma escola encontrada com o termo de busca'}
              </Typography>
              {escolas.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  As escolas aparecerão aqui quando produtos forem adicionados para esta competência
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Escola</TableCell>
                      <TableCell align="center">Total Itens</TableCell>
                      <TableCell align="center">Pendentes</TableCell>
                      <TableCell align="center">Programados</TableCell>
                      <TableCell align="center">Entregues</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedEscolas.map((escola) => (
                      <TableRow key={escola.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {escola.nome}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={
                              (Number(escola.qtd_pendente) || 0) + 
                              (Number(escola.qtd_programada) || 0) + 
                              (Number(escola.qtd_parcial) || 0) + 
                              (Number(escola.qtd_entregue) || 0) + 
                              (Number(escola.qtd_cancelado) || 0)
                            } 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={Number(escola.qtd_pendente) || 0} size="small" color="default" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={Number(escola.qtd_programada) || 0} size="small" color="info" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={Number(escola.qtd_entregue) || 0} size="small" color="success" />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                            <StatusIndicator 
                              status={escola.qtd_entregue === escola.total_itens && escola.total_itens > 0 ? 'ativo' : 'inativo'} 
                              size="small" 
                            />
                            <Typography variant="body2">
                              {escola.qtd_entregue === escola.total_itens && escola.total_itens > 0 ? 'Completo' : 'Pendente'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="Gerenciar Itens">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => navigate(`/guias-demanda/${guiaId}/escola/${escola.id}`)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ borderTop: '1px solid #e9ecef', bgcolor: '#ffffff' }}>
                <TablePagination
                  component="div"
                  count={filteredEscolas.length}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50]}
                  labelRowsPerPage="Itens por página:"
                />
              </Box>
            </Box>
          )}
        </Box>
      </PageContainer>

      {/* Modal Adicionar em Lote */}
      <Dialog open={openBatchDialog} onClose={() => !batchSaving && setOpenBatchDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Adicionar Produto em Lote</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Produto</InputLabel>
              <Select
                value={batchForm.produtoId}
                label="Produto"
                onChange={(e) => {
                  const produto = produtos.find(p => p.id === Number(e.target.value));
                  setBatchForm({
                    ...batchForm,
                    produtoId: e.target.value,
                    unidade: produto?.unidade || 'Kg'
                  });
                }}
                disabled={batchSaving}
              >
                {produtos.map((produto) => (
                  <MenuItem key={produto.id} value={produto.id}>
                    {produto.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Data de Entrega"
              type="date"
              value={batchForm.data_entrega}
              onChange={(e) => setBatchForm({ ...batchForm, data_entrega: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={batchSaving}
            />

            {batchForm.produtoId && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Informe as quantidades por escola:
                </Typography>
                <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                  {escolas.map((escola) => (
                    <Box key={escola.id} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ flex: 1, minWidth: '200px' }}>
                        {escola.nome}
                      </Typography>
                      <TextField
                        label="Quantidade"
                        type="number"
                        size="small"
                        value={batchQuantidades[escola.id] || ''}
                        onChange={(e) => setBatchQuantidades({ ...batchQuantidades, [escola.id]: e.target.value })}
                        sx={{ width: '120px' }}
                        disabled={batchSaving}
                      />
                      <FormControl size="small" sx={{ width: '150px' }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={batchStatus[escola.id] || 'pendente'}
                          label="Status"
                          onChange={(e) => setBatchStatus({ ...batchStatus, [escola.id]: e.target.value })}
                          disabled={batchSaving}
                        >
                          <MenuItem value="pendente">Pendente</MenuItem>
                          <MenuItem value="programada">Programada</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {batchSaving && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                  Salvando...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBatchDialog(false)} disabled={batchSaving}>
            Cancelar
          </Button>
          <Button onClick={handleBatchSubmit} variant="contained" disabled={batchSaving || !batchForm.produtoId}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuiaDemandaDetalhe;
