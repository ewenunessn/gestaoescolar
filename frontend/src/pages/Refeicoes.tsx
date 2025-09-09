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
  Fade,
  Slide,
  ListItemIcon,
  ListItemText,
  Grid,
  TablePagination,
  Checkbox,
  OutlinedInput,
  Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit,
  Delete,
  Restaurant,
  Visibility,
  CalendarToday,
  Info,
  CheckCircle,
  Cancel,
  Clear,
  MoreVert,
  FilterList,
  TuneRounded,
  ExpandMore,
  ExpandLess,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { listarRefeicoes, criarRefeicao, editarRefeicao, deletarRefeicao } from '../services/refeicoes';
import { Refeicao } from '../types/refeicao';

const RefeicoesPage = () => {
  const navigate = useNavigate();
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingRefeicao, setEditingRefeicao] = useState<Refeicao | null>(null);
  const [refeicaoToDelete, setRefeicaoToDelete] = useState<Refeicao | null>(null);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    tipo: 'almoco' as const,
    ativo: true
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Estados para filtros avançados
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    carregarRefeicoes();
  }, []);

  // Detectar filtros ativos
  useEffect(() => {
    const hasFilters = searchTerm || selectedTipo || selectedStatus;
    setHasActiveFilters(!!hasFilters);
  }, [searchTerm, selectedTipo, selectedStatus]);

  const carregarRefeicoes = async () => {
    try {
      setLoading(true);
      const data = await listarRefeicoes();
      setRefeicoes(data);
    } catch (error: any) {
      console.error('Erro ao carregar refeições:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar refeições. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar refeições
  const refeicoesFiltradas = useMemo(() => {
    return refeicoes.filter(refeicao => {
      const matchesSearch = refeicao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (refeicao.descricao && refeicao.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTipo = !selectedTipo || refeicao.tipo === selectedTipo;
      const matchesStatus = !selectedStatus ||
        (selectedStatus === 'ativo' && refeicao.ativo) ||
        (selectedStatus === 'inativo' && !refeicao.ativo);
      
      return matchesSearch && matchesTipo && matchesStatus;
    });
  }, [refeicoes, searchTerm, selectedTipo, selectedStatus]);

  const abrirModal = () => {
    setForm({ nome: '', descricao: '', tipo: 'almoco' as const, ativo: true });
    setEditingRefeicao(null);
    setModalOpen(true);
  };

  const abrirModalEdicao = (refeicao: Refeicao) => {
    setForm({
      nome: refeicao.nome,
      descricao: refeicao.descricao || '',
      tipo: refeicao.tipo,
      ativo: refeicao.ativo
    });
    setEditingRefeicao(refeicao);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditingRefeicao(null);
    setForm({ nome: '', descricao: '', tipo: 'almoco' as const, ativo: true });
  };

  const salvarRefeicao = async () => {
    try {
      const dadosRefeicao = {
        nome: form.nome,
        descricao: form.descricao || undefined,
        tipo: form.tipo,
        ativo: form.ativo
      };

      if (editingRefeicao) {
        await editarRefeicao(editingRefeicao.id, dadosRefeicao);
        setSnackbar({
          open: true,
          message: 'Refeição atualizada com sucesso!',
          severity: 'success'
        });
      } else {
        await criarRefeicao(dadosRefeicao);
        setSnackbar({
          open: true,
          message: 'Refeição criada com sucesso!',
          severity: 'success'
        });
      }

      await carregarRefeicoes();
      fecharModal();
    } catch (error: any) {
      console.error('Erro ao salvar refeição:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Erro desconhecido';
      setSnackbar({
        open: true,
        message: `Erro ao salvar refeição: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  const abrirModalDelete = (refeicao: Refeicao) => {
    setRefeicaoToDelete(refeicao);
    setDeleteModalOpen(true);
  };

  const fecharModalDelete = () => {
    setDeleteModalOpen(false);
    setRefeicaoToDelete(null);
  };

  const confirmarDelete = async () => {
    if (refeicaoToDelete) {
      try {
        await deletarRefeicao(refeicaoToDelete.id);
        await carregarRefeicoes();
        fecharModalDelete();
        setSnackbar({
          open: true,
          message: 'Refeição excluída com sucesso!',
          severity: 'success'
        });
      } catch (error: any) {
        console.error('Erro ao deletar refeição:', error);
        fecharModalDelete();
        
        // Verifica se é erro de constraint (refeição sendo usada)
        const errorMessage = error?.message || error?.response?.data?.message || 'Erro desconhecido';
        
        if (errorMessage.includes('está sendo usada em cardápio') || 
            errorMessage.includes('constraint') || 
            error?.response?.status === 409) {
          setSnackbar({
            open: true,
            message: `Não é possível excluir a refeição "${refeicaoToDelete.nome}" pois ela está sendo utilizada em cardápios. Remova-a dos cardápios primeiro.`,
            severity: 'warning'
          });
        } else {
          setSnackbar({
            open: true,
            message: `Erro ao excluir refeição: ${errorMessage}`,
            severity: 'error'
          });
        }
      }
    }
  };

  const formatarData = (data: string | null) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarTipo = (tipo: string) => {
    const tipos = {
      'cafe_manha': 'Café da Manhã',
      'almoco': 'Almoço',
      'lanche_tarde': 'Lanche da Tarde',
      'jantar': 'Jantar',
      'ceia': 'Ceia'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const verDetalhes = (refeicaoId: number) => {
    navigate(`/refeicoes/${refeicaoId}`);
  };

  // Funções para filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTipo('');
    setSelectedStatus('');
  };

  const toggleFilters = useCallback(() => {
    setFiltersExpanded(!filtersExpanded);
  }, [filtersExpanded]);

  // Componente de conteúdo dos filtros
  const FiltersContent = () => (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '16px',
        p: 3,
        border: '1px solid rgba(148, 163, 184, 0.1)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(79, 70, 229, 0.3), transparent)',
        },
      }}
    >
      {/* Header dos filtros */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TuneRounded sx={{ color: '#4f46e5', fontSize: 20 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#1e293b',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              Filtros Avançados
            </Typography>
          </Box>
          {hasActiveFilters && (
            <Chip
              label="Ativo"
              size="small"
              sx={{
                bgcolor: '#dcfce7',
                color: '#166534',
                fontWeight: 600,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}
        </Box>
        <Button
          startIcon={<Clear />}
          onClick={clearFilters}
          size="small"
          sx={{
            color: '#ef4444',
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
          }}
        >
          Limpar Tudo
        </Button>
      </Box>

      {/* Campos de filtro */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Tipo de Refeição */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Tipo de Refeição</InputLabel>
          <Select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            label="Tipo de Refeição"
            sx={{
              borderRadius: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4f46e5',
              },
            }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="cafe_manha">Café da Manhã</MenuItem>
            <MenuItem value="almoco">Almoço</MenuItem>
            <MenuItem value="lanche_tarde">Lanche da Tarde</MenuItem>
            <MenuItem value="jantar">Jantar</MenuItem>
            <MenuItem value="ceia">Ceia</MenuItem>
          </Select>
        </FormControl>

        {/* Status */}
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            label="Status"
            sx={{
              borderRadius: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4f46e5',
              },
            }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ativo">Ativo</MenuItem>
            <MenuItem value="inativo">Inativo</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Chips de filtros ativos */}
      {hasActiveFilters && (
        <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {selectedTipo && (
            <Chip
              label={`Tipo: ${formatarTipo(selectedTipo)}`}
              onDelete={() => setSelectedTipo('')}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          {selectedStatus && (
            <Chip
              label={`Status: ${selectedStatus === 'ativo' ? 'Ativo' : 'Inativo'}`}
              onDelete={() => setSelectedStatus('')}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          {searchTerm && (
            <Chip
              label={`Busca: "${searchTerm}"`}
              onDelete={() => setSearchTerm('')}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        p: 3,
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 'bold', 
            color: 'primary.main',
            mb: 3
          }}
        >
          Refeições
        </Typography>

        {/* Card Principal */}
        <Card sx={{ mb: 3, boxShadow: 2 }}>
          <CardContent sx={{ p: 3 }}>
            {/* Barra de Busca e Ações */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
              <TextField
                placeholder="Buscar refeições..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchTerm('')}
                        edge="end"
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  flex: 1, 
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'background.paper',
                    borderRadius: '12px',
                  }
                }}
              />

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {/* Botão de Filtros */}
                <Button
                  variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'}
                  startIcon={<FilterList />}
                  onClick={toggleFilters}
                  sx={{
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    ...(filtersExpanded || hasActiveFilters ? {
                      bgcolor: '#4f46e5',
                      '&:hover': { bgcolor: '#4338ca' },
                    } : {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                      color: '#64748b',
                      '&:hover': {
                        borderColor: '#4f46e5',
                        bgcolor: 'rgba(79, 70, 229, 0.05)',
                      },
                    }),
                  }}
                >
                  Filtros
                  {hasActiveFilters && !filtersExpanded && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: '#ef4444',
                      }}
                    />
                  )}
                </Button>

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={abrirModal}
                  sx={{ 
                    whiteSpace: 'nowrap',
                    bgcolor: '#059669',
                    color: 'white',
                    textTransform: 'none',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    '&:hover': { bgcolor: '#047857' },
                  }}
                >
                  Nova Refeição
                </Button>

                <IconButton
                  onClick={(e) => setActionsMenuAnchor(e.currentTarget)}
                  sx={{
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    color: '#6b7280',
                    '&:hover': {
                      bgcolor: '#f9fafb',
                      borderColor: '#9ca3af',
                    },
                  }}
                >
                  <MoreVert />
                </IconButton>
              </Box>
            </Box>

            {/* Filtros colapsáveis */}
            <Collapse in={filtersExpanded} timeout={400}>
              <Box sx={{ mb: 3 }}>
                <FiltersContent />
              </Box>
            </Collapse>

            {/* Contador de Refeições */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? (
                  <>
                    Mostrando <strong>{refeicoesFiltradas.length}</strong> de <strong>{refeicoes.length}</strong> refeições
                    {searchTerm && (
                      <>
                        {' '}para <strong>"{searchTerm}"</strong>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Total de <strong>{refeicoes.length}</strong> refeições
                  </>
                )}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Tabela de Refeições */}
        <Paper sx={{ boxShadow: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : refeicoesFiltradas.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Restaurant sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchTerm ? 'Nenhuma refeição encontrada' : 'Nenhuma refeição cadastrada'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm 
                  ? 'Tente ajustar os filtros de busca ou limpar a pesquisa.'
                  : 'Comece criando sua primeira refeição clicando no botão "Nova Refeição".'}
              </Typography>
              {searchTerm && (
                <Button
                  variant="outlined"
                  onClick={() => setSearchTerm('')}
                  startIcon={<ClearIcon />}
                >
                  Limpar Busca
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                   <TableRow>
                     <TableCell>Refeição</TableCell>
                     <TableCell>Tipo</TableCell>
                     <TableCell>Status</TableCell>
                     <TableCell>Data Criação</TableCell>
                     <TableCell align="center">Ações</TableCell>
                   </TableRow>
                 </TableHead>
                <TableBody>
                  {refeicoesFiltradas.map((refeicao) => (
                    <TableRow key={refeicao.id}>
                       <TableCell>
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                           <Restaurant color="primary" fontSize="small" />
                           <Box>
                             <Typography variant="body2" fontWeight="bold">
                               {refeicao.nome}
                             </Typography>
                             {refeicao.descricao && (
                               <Typography variant="caption" color="text.secondary">
                                 {refeicao.descricao}
                               </Typography>
                             )}
                           </Box>
                         </Box>
                       </TableCell>
                       <TableCell>
                         <Typography variant="body2">
                           {formatarTipo(refeicao.tipo)}
                         </Typography>
                       </TableCell>
                       <TableCell>
                         <Chip
                           label={refeicao.ativo ? 'Ativo' : 'Inativo'}
                           size="small"
                           color={refeicao.ativo ? 'success' : 'error'}
                           variant="outlined"
                         />
                       </TableCell>
                       <TableCell>
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                           <CalendarToday fontSize="small" color="action" />
                           <Typography variant="body2">
                             {formatarData(refeicao.created_at)}
                           </Typography>
                         </Box>
                       </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Ver Detalhes">
                            <IconButton
                              size="small"
                              onClick={() => verDetalhes(refeicao.id)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => abrirModalEdicao(refeicao)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remover">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => abrirModalDelete(refeicao)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Modal de Cadastro/Edição */}
      <Dialog open={modalOpen} onClose={fecharModal} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRefeicao ? 'Editar Refeição' : 'Nova Refeição'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nome da Refeição"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Descrição"
              value={form.descricao || ''}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              select
              label="Tipo de Refeição"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}
              fullWidth
              SelectProps={{
                native: true,
              }}
            >
              <option value="cafe_manha">Café da Manhã</option>
              <option value="almoco">Almoço</option>
              <option value="lanche_tarde">Lanche da Tarde</option>
              <option value="jantar">Jantar</option>
              <option value="ceia">Ceia</option>
            </TextField>
            <TextField
              select
              label="Status"
              value={form.ativo ? 'true' : 'false'}
              onChange={(e) => setForm({ ...form, ativo: e.target.value === 'true' })}
              fullWidth
              SelectProps={{
                native: true,
              }}
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharModal}>Cancelar</Button>
          <Button
            onClick={salvarRefeicao}
            variant="contained"
            disabled={!form.nome.trim()}
          >
            {editingRefeicao ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação de Delete */}
      <Dialog open={deleteModalOpen} onClose={fecharModalDelete}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a refeição "{refeicaoToDelete?.nome}"?
            Esta ação não pode ser desfeita.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Atenção:</strong> Se esta refeição estiver sendo usada em cardápios, 
              ela não poderá ser excluída. Remova-a dos cardápios primeiro.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharModalDelete}>Cancelar</Button>
          <Button onClick={confirmarDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu de Ações */}
      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={() => setActionsMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          },
        }}
      >
        <MenuItem
          onClick={() => {
            clearFilters();
            setActionsMenuAnchor(null);
          }}
          disabled={!hasActiveFilters}
        >
          <ListItemIcon>
            <Clear fontSize="small" />
          </ListItemIcon>
          <ListItemText>Limpar Filtros</ListItemText>
        </MenuItem>
      </Menu>

      {/* Sistema de Mensagens */}
      {snackbar.open && (
        <Box
          sx={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            minWidth: 400,
            maxWidth: 600,
          }}
        >
          <Fade in={snackbar.open}>
            <Alert
              severity={snackbar.severity}
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              sx={{
                boxShadow: 3,
                '& .MuiAlert-message': {
                  fontSize: '0.875rem',
                },
              }}
            >
              {snackbar.message}
            </Alert>
          </Fade>
        </Box>
      )}
      </Box>
    </Box>
  );
};

export default RefeicoesPage;
