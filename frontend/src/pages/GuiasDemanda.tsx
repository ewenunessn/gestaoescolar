import React, { useState, useEffect } from 'react';
import StatusIndicator from '../components/StatusIndicator';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Tooltip,
  TablePagination,
  InputAdornment,
  Collapse
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  TuneRounded,
  ExpandLess,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { guiaService, Guia, CreateGuiaData } from '../services/guiaService';
import PageBreadcrumbs from '../components/PageBreadcrumbs';

const GuiasDemanda: React.FC = () => {
  const navigate = useNavigate();
  const [guias, setGuias] = useState<Guia[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    mes: '',
    ano: '',
    status: ''
  });
  const [formData, setFormData] = useState<CreateGuiaData>({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    observacao: ''
  });

  const { success, error } = useNotification();

  useEffect(() => {
    carregarGuias();
  }, []);

  // Filtrar guias
  const filteredGuias = guias.filter(guia => {
    const matchesSearch = !searchTerm ||
      `${guia.mes}/${guia.ano}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (guia.nome && guia.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (guia.observacao && guia.observacao.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMes = !filters.mes || guia.mes === parseInt(filters.mes);
    const matchesAno = !filters.ano || guia.ano === parseInt(filters.ano);
    const matchesStatus = !filters.status || guia.status === filters.status;

    return matchesSearch && matchesMes && matchesAno && matchesStatus;
  });

  // Paginação
  const paginatedGuias = filteredGuias.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Verificar se há filtros ativos
  const hasActiveFilters = filters.mes || filters.ano || filters.status;

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const toggleFilters = () => {
    setFiltersExpanded(!filtersExpanded);
  };

  const clearFilters = () => {
    setFilters({ mes: '', ano: '', status: '' });
    setSearchTerm('');
    setPage(0);
  };

  const carregarGuias = async () => {
    try {
      setLoading(true);
      const response = await guiaService.listarGuias();
      const guiasData = Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : [];

      // Debug temporário
      console.log('Dados das guias recebidos:', guiasData);
      if (guiasData.length > 0) {
        console.log('Primeira guia completa:', guiasData[0]);
        console.log('Propriedades de data disponíveis:', {
          createdAt: guiasData[0].createdAt,
          created_at: guiasData[0].created_at,
          updatedAt: guiasData[0].updatedAt,
          updated_at: guiasData[0].updated_at
        });
      }

      setGuias(guiasData);
    } catch (err: any) {
      console.error('Erro ao carregar guias:', err);
      error('Erro ao carregar guias');
      setGuias([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuia = async () => {
    try {
      await guiaService.criarGuia(formData);
      success('Guia criada com sucesso!');
      setOpenDialog(false);
      setFormData({
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
        observacao: ''
      });
      carregarGuias();
    } catch (errorCatch: any) {
      error(errorCatch.response?.data?.error || 'Erro ao criar guia');
    }
  };

  const handleDeleteGuia = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta guia?')) {
      try {
        await guiaService.deletarGuia(id);
        success('Guia excluída com sucesso!');
        carregarGuias();
      } catch (errorCatch: any) {
        error('Erro ao excluir guia');
      }
    }
  };

  const handleViewDetalhes = (guia: Guia) => {
    navigate(`/guias-demanda/${guia.id}`);
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

  const formatDate = (dateString: string | undefined) => {
    try {
      if (!dateString) {
        console.log('Data vazia recebida');
        return '-';
      }

      console.log('Tentando formatar data:', dateString, 'tipo:', typeof dateString);

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.log('Data inválida:', dateString);
        return '-';
      }

      const formatted = date.toLocaleDateString('pt-BR');
      console.log('Data formatada:', formatted);
      return formatted;
    } catch (error) {
      console.log('Erro ao formatar data:', dateString, error);
      return '-';
    }
  };

  const FiltersContent = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Mês</InputLabel>
          <Select
            value={filters.mes}
            onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
            label="Mês"
          >
            <MenuItem value="">Todos</MenuItem>
            {[...Array(12)].map((_, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleDateString('pt-BR', { month: 'long' })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={3}>
        <TextField
          label="Ano"
          type="number"
          size="small"
          value={filters.ano}
          onChange={(e) => setFilters({ ...filters, ano: e.target.value })}
          fullWidth
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            label="Status"
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="aberta">Aberta</MenuItem>
            <MenuItem value="fechada">Fechada</MenuItem>
            <MenuItem value="cancelada">Cancelada</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={3}>
        <Button
          variant="outlined"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          fullWidth
          sx={{ height: '40px' }}
        >
          Limpar Filtros
        </Button>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <PageBreadcrumbs 
          items={[
            { label: 'Guias de Demanda', icon: <AssignmentIcon fontSize="small" /> }
          ]}
        />
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>
          Guias de Demanda
        </Typography>

        <Card sx={{ borderRadius: '12px', p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              placeholder="Buscar guias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{
                flex: 1,
                minWidth: '200px',
                '& .MuiOutlinedInput-root': { borderRadius: '8px' }
              }}
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
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'}
                startIcon={filtersExpanded ? <ExpandLess /> : <TuneRounded />}
                onClick={toggleFilters}
                sx={{ position: 'relative' }}
              >
                Filtros
                {hasActiveFilters && !filtersExpanded && (
                  <Box sx={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'error.main'
                  }} />
                )}
              </Button>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
                variant="contained"
                color="success"
              >
                Nova Guia
              </Button>
            </Box>
          </Box>

          <Collapse in={filtersExpanded} timeout={400}>
            <Box sx={{ mb: 3 }}>
              <FiltersContent />
            </Box>
          </Collapse>

          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredGuias.length)}-${Math.min((page + 1) * rowsPerPage, filteredGuias.length)} de ${filteredGuias.length} guias`}
          </Typography>
        </Card>

        {loading ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={60} />
            </CardContent>
          </Card>
        ) : filteredGuias.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <AssignmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                {searchTerm || hasActiveFilters ? 'Nenhuma guia encontrada' : 'Nenhuma guia cadastrada'}
              </Typography>
              {(searchTerm || hasActiveFilters) && (
                <Button variant="outlined" onClick={clearFilters} sx={{ mt: 2 }}>
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Mês/Ano</TableCell>
                    <TableCell>Observação</TableCell>
                    <TableCell align="center">Produtos</TableCell>
                    <TableCell>Criado em</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedGuias.map((guia) => (
                    <TableRow key={guia.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIndicator status={guia.status} size="small" />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {guia.nome || `${guia.mes}/${guia.ano}`}
                            </Typography>
                            {guia.nome && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {guia.mes}/{guia.ano}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {guia.observacao || '-'}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        {(() => {
                          const count = parseInt(guia.total_produtos?.toString() || '0') || guia.produtosEscola?.length || 0;
                          return (
                            <Chip
                              label={count}
                              size="small"
                              sx={{
                                fontWeight: 'bold',
                                minWidth: '40px',
                                ...(count > 0 ? {
                                  bgcolor: 'primary.main',
                                  color: 'primary.contrastText'
                                } : {
                                  bgcolor: 'grey.300',
                                  color: 'grey.700'
                                })
                              }}
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {(() => {
                            const dateValue = guia.createdAt || guia.created_at || guia.updatedAt || guia.updated_at;
                            console.log('Guia ID:', guia.id, 'Data encontrada:', dateValue);
                            return formatDate(dateValue);
                          })()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver Detalhes">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetalhes(guia)}
                            color="primary"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredGuias.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Itens por página:"
            />
          </Paper>
        )}

      </Box>

      {/* Dialog para criar nova guia */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 2 }}>
          <Typography variant="h6" component="div">
            Nova Guia de Demanda
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Mês</InputLabel>
                <Select
                  value={formData.mes}
                  onChange={(e) => setFormData({ ...formData, mes: e.target.value as number })}
                  label="Mês"
                >
                  {[...Array(12)].map((_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Ano"
                type="number"
                value={formData.ano}
                onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) || new Date().getFullYear() })}
                fullWidth
                inputProps={{ min: 2020, max: 2030 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Nome da Guia (Opcional)"
                value={(formData as any).nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value } as any)}
                fullWidth
                placeholder="Ex: Guia Especial de Natal, Guia Emergencial..."
                helperText="Se não informado, será usado o padrão: Mês Ano"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Observação (Opcional)"
                multiline
                rows={3}
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                fullWidth
                placeholder="Adicione uma observação sobre esta guia..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleCreateGuia}
            variant="contained"
            disabled={!formData.mes || !formData.ano}
          >
            Criar Guia
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuiasDemanda;