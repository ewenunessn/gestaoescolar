import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StatusIndicator from '../components/StatusIndicator';
import PageContainer from '../components/PageContainer';
import TableFilter, { FilterField } from '../components/TableFilter';
import {
  Box, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, Grid, IconButton, InputLabel, MenuItem, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Chip, Paper,
  InputAdornment, TablePagination, CircularProgress, Alert
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CalendarMonth as CalendarIcon,
  Visibility as ViewIcon, Search as SearchIcon, Clear as ClearIcon, FilterList as FilterIcon,
  MoreVert
} from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import {
  listarCardapiosModalidade, criarCardapioModalidade, editarCardapioModalidade,
  removerCardapioModalidade, CardapioModalidade, MESES
} from '../services/cardapiosModalidade';
import { listarModalidades } from '../services/modalidadeService';
import { useNavigate } from 'react-router-dom';

const CardapiosModalidadePage: React.FC = () => {
  const [cardapios, setCardapios] = useState<CardapioModalidade[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  // Estados de filtros
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  
  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  const [formData, setFormData] = useState({
    modalidade_id: '',
    nome: '',
    mes: '',
    ano: new Date().getFullYear().toString(),
    observacao: '',
    ativo: true
  });
  
  const { success, error } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cardapiosData, modalidadesData] = await Promise.all([
        listarCardapiosModalidade(),
        listarModalidades()
      ]);
      setCardapios(cardapiosData);
      setModalidades(modalidadesData);
    } catch (err) {
      error('Erro ao carregar cardápios');
    } finally {
      setLoading(false);
    }
  };

  // Definir campos de filtro
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'select',
      label: 'Modalidade',
      key: 'modalidade',
      options: modalidades.map(m => ({ value: m.id.toString(), label: m.nome })),
    },
    {
      type: 'select',
      label: 'Mês',
      key: 'mes',
      options: Object.entries(MESES).map(([num, nome]) => ({ value: num, label: nome })),
    },
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' },
      ],
    },
  ], [modalidades]);

  // Filtrar cardápios
  const filteredCardapios = useMemo(() => {
    return cardapios.filter(cardapio => {
      // Busca por palavra-chave
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!cardapio.nome.toLowerCase().includes(searchLower) &&
            !(cardapio.modalidade_nome || '').toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Filtro de modalidade
      if (filters.modalidade && cardapio.modalidade_id.toString() !== filters.modalidade) {
        return false;
      }

      // Filtro de mês
      if (filters.mes && cardapio.mes.toString() !== filters.mes) {
        return false;
      }

      // Filtro de status
      if (filters.status) {
        if (filters.status === 'ativo' && !cardapio.ativo) return false;
        if (filters.status === 'inativo' && cardapio.ativo) return false;
      }

      return true;
    }).sort((a, b) => {
      // Ordenar por ano e mês (mais recente primeiro)
      if (a.ano !== b.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });
  }, [cardapios, filters]);

  // Cardápios paginados
  const paginatedCardapios = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredCardapios.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCardapios, page, rowsPerPage]);

  // Funções de paginação
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPage(0);
  }, [filters]);

  const handleOpenDialog = (cardapio?: CardapioModalidade) => {
    if (cardapio) {
      setEditMode(true);
      setSelectedId(cardapio.id);
      setFormData({
        modalidade_id: cardapio.modalidade_id.toString(),
        nome: cardapio.nome,
        mes: cardapio.mes.toString(),
        ano: cardapio.ano.toString(),
        observacao: cardapio.observacao || '',
        ativo: cardapio.ativo
      });
    } else {
      setEditMode(false);
      setSelectedId(null);
      setFormData({
        modalidade_id: '',
        nome: '',
        mes: '',
        ano: new Date().getFullYear().toString(),
        observacao: '',
        ativo: true
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.modalidade_id || !formData.nome || !formData.mes || !formData.ano) {
        error('Preencha todos os campos obrigatórios');
        return;
      }

      const data = {
        modalidade_id: parseInt(formData.modalidade_id),
        nome: formData.nome,
        mes: parseInt(formData.mes),
        ano: parseInt(formData.ano),
        observacao: formData.observacao || undefined,
        ativo: formData.ativo
      };

      if (editMode && selectedId) {
        await editarCardapioModalidade(selectedId, data);
        success('Cardápio atualizado!');
      } else {
        await criarCardapioModalidade(data);
        success('Cardápio criado!');
      }

      setOpenDialog(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Erro ao salvar cardápio');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Remover este cardápio?')) {
      try {
        await removerCardapioModalidade(id);
        success('Cardápio removido!');
        loadData();
      } catch (err) {
        error('Erro ao remover cardápio');
      }
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      <PageContainer fullHeight>
        <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar cardápios..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              size="small"
              sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setFilters(prev => ({ ...prev, search: '' }))}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<FilterIcon />} onClick={(e) => { setFilterAnchorEl(e.currentTarget); setFilterOpen(true); }} size="small">
                Filtros
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} size="small" color="success">
                Novo Cardápio
              </Button>
            </Box>
          </Box>
        </Card>

        <TableFilter
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={setFilters}
          fields={filterFields}
          initialValues={filters}
          showSearch={false}
          anchorEl={filterAnchorEl}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, px: 1 }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
            Exibindo {filteredCardapios.length} {filteredCardapios.length === 1 ? 'resultado' : 'resultados'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusIndicator status="ativo" size="small" />
              <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ATIVOS
              </Typography>
              <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                {filteredCardapios.filter(c => c.ativo).length}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusIndicator status="inativo" size="small" />
              <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                INATIVOS
              </Typography>
              <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                {filteredCardapios.filter(c => !c.ativo).length}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
          ) : filteredCardapios.length === 0 ? (
            <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CalendarIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhum cardápio encontrado</Typography></CardContent></Card>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>Modalidade</TableCell>
                      <TableCell>Competência</TableCell>
                      <TableCell align="center">Refeições</TableCell>
                      <TableCell align="center">Dias</TableCell>
                      <TableCell align="center" width="120">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedCardapios.map((cardapio) => (
                      <TableRow key={cardapio.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StatusIndicator status={cardapio.ativo ? 'ativo' : 'inativo'} size="small" />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{cardapio.nome}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{cardapio.modalidade_nome}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <CalendarIcon fontSize="small" color="action" />
                            <Typography variant="body2">{MESES[cardapio.mes]} / {cardapio.ano}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={cardapio.total_refeicoes || 0} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={cardapio.total_dias || 0} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="primary" onClick={() => navigate(`/cardapios/${cardapio.id}/calendario`)} title="Ver calendário">
                            <ViewIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialog(cardapio)} title="Editar">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete(cardapio.id)} title="Remover">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ borderTop: '1px solid #e9ecef', bgcolor: '#ffffff' }}>
                <TablePagination
                  component="div"
                  count={filteredCardapios.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  labelRowsPerPage="Itens por página:"
                />
              </Box>
            </Box>
          )}
        </Box>
      </PageContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Editar Cardápio' : 'Novo Cardápio'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Modalidade</InputLabel>
              <Select value={formData.modalidade_id} onChange={(e) => setFormData({ ...formData, modalidade_id: e.target.value })} label="Modalidade">
                {modalidades.map((m) => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField label="Nome do Cardápio" fullWidth required value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Mês</InputLabel>
                  <Select value={formData.mes} onChange={(e) => setFormData({ ...formData, mes: e.target.value })} label="Mês">
                    {Object.entries(MESES).map(([num, nome]) => <MenuItem key={num} value={num}>{nome}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Ano" type="number" fullWidth required value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: e.target.value })} />
              </Grid>
            </Grid>

            <TextField label="Observação" fullWidth multiline rows={3} value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={formData.ativo ? 'ativo' : 'inativo'}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.value === 'ativo' })} label="Status">
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="inativo">Inativo</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">{editMode ? 'Salvar' : 'Criar'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CardapiosModalidadePage;
