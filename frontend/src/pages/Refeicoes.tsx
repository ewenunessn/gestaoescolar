import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Chip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Tooltip,
  Menu,
  Collapse,
  Divider,
  Grid,
  TablePagination,
  OutlinedInput,
  Checkbox,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Info,
  Restaurant,
  CheckCircle,
  Cancel,
  Clear,
  MoreVert,
  TuneRounded,
  ExpandMore,
  ExpandLess,
  Clear as ClearIcon,
  Edit,
  Delete,
  Visibility,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { listarRefeicoes, criarRefeicao, editarRefeicao, deletarRefeicao } from '../services/refeicoes';
import { Refeicao } from '../types/refeicao';

const RefeicoesPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Estados principais
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estados de modais
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingRefeicao, setEditingRefeicao] = useState<Refeicao | null>(null);
  const [refeicaoToDelete, setRefeicaoToDelete] = useState<Refeicao | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'almoco' as 'cafe_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia',
    ativo: true,
  });

  // Carregar refeições
  const loadRefeicoes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listarRefeicoes();
      setRefeicoes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Erro ao carregar refeições:', err);
      setError('Erro ao carregar refeições. Tente novamente.');
      setRefeicoes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefeicoes();
  }, []);

  // Detectar filtros ativos
  useEffect(() => {
    const hasFilters = !!(selectedTipo || selectedStatus || searchTerm);
    setHasActiveFilters(hasFilters);
  }, [selectedTipo, selectedStatus, searchTerm]);
  
  // Mapear tipos de refeição para exibição
  const tiposRefeicao = {
    'cafe_manha': 'Café da Manhã',
    'almoco': 'Almoço',
    'lanche_tarde': 'Lanche da Tarde',
    'jantar': 'Jantar',
    'ceia': 'Ceia'
  };

  // Filtrar e ordenar refeições
  const filteredRefeicoes = useMemo(() => {
    return refeicoes.filter(refeicao => {
      const matchesSearch = refeicao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (refeicao.descricao || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo = !selectedTipo || refeicao.tipo === selectedTipo;
      const matchesStatus = !selectedStatus ||
        (selectedStatus === 'ativo' && refeicao.ativo) ||
        (selectedStatus === 'inativo' && !refeicao.ativo);
      return matchesSearch && matchesTipo && matchesStatus;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.nome.localeCompare(b.nome);
        case 'tipo':
          return a.tipo.localeCompare(b.tipo);
        case 'status':
          return Number(b.ativo) - Number(a.ativo);
        default:
          return a.nome.localeCompare(b.nome);
      }
    });
  }, [refeicoes, searchTerm, selectedTipo, selectedStatus, sortBy]);

  // Refeições paginadas
  const paginatedRefeicoes = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredRefeicoes.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRefeicoes, page, rowsPerPage]);

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
  }, [searchTerm, selectedTipo, selectedStatus, sortBy]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedTipo('');
    setSelectedStatus('');
    setSortBy('name');
    setPage(0);
  }, []);

  const toggleFilters = useCallback(() => {
    setFiltersExpanded(!filtersExpanded);
  }, [filtersExpanded]);

  // Componente de conteúdo dos filtros
  const FiltersContent = () => (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: '12px', p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.9rem' }}>
          Filtros Avançados
        </Typography>
        {hasActiveFilters && (
          <Button size="small" onClick={clearFilters} sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.8rem' }}>
            Limpar
          </Button>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel>Tipo</InputLabel>
          <Select value={selectedTipo} onChange={(e) => setSelectedTipo(e.target.value)} label="Tipo">
            <MenuItem value="">Todos os tipos</MenuItem>
            {Object.entries(tiposRefeicao).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }} size="small">
          <InputLabel>Status</InputLabel>
          <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} label="Status">
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ativo">Ativas</MenuItem>
            <MenuItem value="inativo">Inativas</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }} size="small">
          <InputLabel>Ordenar por</InputLabel>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Ordenar por">
            <MenuItem value="name">Nome</MenuItem>
            <MenuItem value="tipo">Tipo</MenuItem>
            <MenuItem value="status">Status</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );

  // Funções de modais
  const openModal = (refeicao: Refeicao | null = null) => {
    if (refeicao) {
      setEditingRefeicao(refeicao);
      setFormData({
        nome: refeicao.nome,
        descricao: refeicao.descricao || '',
        tipo: refeicao.tipo,
        ativo: refeicao.ativo,
      });
    } else {
      setEditingRefeicao(null);
      setFormData({
        nome: '',
        descricao: '',
        tipo: 'almoco',
        ativo: true,
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRefeicao(null);
  };

  const handleSave = async () => {
    try {
      if (editingRefeicao) {
        await editarRefeicao(editingRefeicao.id, formData);
        setSuccessMessage('Refeição atualizada com sucesso!');
      } else {
        await criarRefeicao(formData);
        setSuccessMessage('Refeição criada com sucesso!');
      }
      closeModal();
      await loadRefeicoes();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError('Erro ao salvar refeição. Verifique os dados e tente novamente.');
    }
  };

  const openDeleteModal = (refeicao: Refeicao) => {
    setRefeicaoToDelete(refeicao);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setRefeicaoToDelete(null);
  };

  const handleDelete = async () => {
    if (!refeicaoToDelete) return;
    try {
      await deletarRefeicao(refeicaoToDelete.id);
      setSuccessMessage('Refeição excluída com sucesso!');
      closeDeleteModal();
      await loadRefeicoes();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const message = err.response?.data?.message.includes('cardapios')
        ? 'Não é possível excluir. A refeição está em uso em um ou mais cardápios.'
        : 'Erro ao excluir a refeição. Tente novamente.';
      setError(message);
    }
  };

  const handleViewDetails = (refeicao: Refeicao) => {
    navigate(`/refeicoes/${refeicao.id}`);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {successMessage && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}>
          <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ minWidth: 300 }}>
            {successMessage}
          </Alert>
        </Box>
      )}

      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>
          Refeições
        </Typography>
        
        <Card sx={{ borderRadius: '12px', p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              placeholder="Buscar refeições..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'}
                startIcon={filtersExpanded ? <ExpandLess /> : <TuneRounded />}
                onClick={toggleFilters}
                size="small"
              >
                Filtros
                {hasActiveFilters && !filtersExpanded && (
                  <Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }}/>
                )}
              </Button>
              <Button startIcon={<AddIcon />} onClick={() => openModal()} variant="contained" color="success" size="small">
                Nova Refeição
              </Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small">
                <MoreVert />
              </IconButton>
            </Box>
          </Box>

          <Collapse in={filtersExpanded} timeout={300}>
            <Box sx={{ mb: 2 }}><FiltersContent /></Box>
          </Collapse>

          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
            {`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredRefeicoes.length)}-${Math.min((page + 1) * rowsPerPage, filteredRefeicoes.length)} de ${filteredRefeicoes.length} refeições`}
          </Typography>
        </Card>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
              <Button variant="contained" onClick={loadRefeicoes}>Tentar Novamente</Button>
            </CardContent>
          </Card>
        ) : filteredRefeicoes.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Restaurant sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhuma refeição encontrada</Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2, borderRadius: '12px' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome da Refeição</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRefeicoes.map((refeicao) => (
                  <TableRow key={refeicao.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{refeicao.nome}</Typography>
                      {refeicao.descricao && (
                        <Typography variant="caption" color="text.secondary">{refeicao.descricao}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{tiposRefeicao[refeicao.tipo]}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={refeicao.ativo ? 'Ativa' : 'Inativa'} size="small" color={refeicao.ativo ? 'success' : 'error'} />
                    </TableCell>
                    <TableCell align="center">
                        <Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => handleViewDetails(refeicao)} color="default"><Visibility fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Editar"><IconButton size="small" onClick={() => openModal(refeicao)} color="primary"><Edit fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Excluir"><IconButton size="small" onClick={() => openDeleteModal(refeicao)} color="error"><Delete fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredRefeicoes.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Linhas por página:"
            />
          </TableContainer>
        )}
      </Box>

      {/* Modal de Criação/Edição */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingRefeicao ? 'Editar Refeição' : 'Nova Refeição'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField label="Nome da Refeição" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
            <TextField label="Descrição (Opcional)" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} multiline rows={3} />
            <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })} label="Tipo">
                    {Object.entries(tiposRefeicao).map(([value, label]) => (
                        <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={formData.ativo} onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} />} label="Refeição Ativa" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={closeModal} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.nome.trim()}>
            {editingRefeicao ? 'Salvar Alterações' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a refeição "{refeicaoToDelete?.nome}"? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={closeDeleteModal} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button onClick={handleDelete} color="error" variant="contained">Excluir</Button>
        </DialogActions>
      </Dialog>
      
      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        {/* Adicionar opções como "Exportar" aqui no futuro */}
        <MenuItem disabled>
            <Typography>Nenhuma ação disponível</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default RefeicoesPage;