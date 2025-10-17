import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Box,
  Chip,
  Tooltip,
  Card,
  CardContent,
  Collapse,
  Divider,
  TablePagination,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  TuneRounded,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
  MoreVert,
  Category,
  People as PeopleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  listarModalidades,
  criarModalidade,
  editarModalidade,
  removerModalidade,
  Modalidade, // <-- TIPO IMPORTADO DO SERVIÇO (AGORA CORRETO)
} from "../services/modalidades";

const ModalidadesPage = () => {
  const navigate = useNavigate();
  
  // Estados principais
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("nome");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estados de modais
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingModalidade, setEditingModalidade] = useState<Modalidade | null>(null);
  const [modalidadeToDelete, setModalidadeToDelete] = useState<Modalidade | null>(null);
  const [formData, setFormData] = useState({ nome: "", codigo_financeiro: "", valor_repasse: 0, ativo: true });

  // Carregar modalidades
  const loadModalidades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listarModalidades();
      setModalidades(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Erro ao carregar modalidades. Tente novamente.");
      setModalidades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModalidades();
  }, [loadModalidades]);

  // Detectar filtros ativos
  useEffect(() => {
    setHasActiveFilters(!!(searchTerm || selectedStatus));
  }, [searchTerm, selectedStatus]);

  // Filtrar e ordenar modalidades
  const filteredModalidades = useMemo(() => {
    return modalidades
      .filter((modalidade) => {
        const matchesSearch = modalidade.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !selectedStatus ||
          (selectedStatus === "ativo" && modalidade.ativo) ||
          (selectedStatus === "inativo" && !modalidade.ativo);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "nome":
            return a.nome.localeCompare(b.nome);
          case "valor":
            return Number(a.valor_repasse) - Number(b.valor_repasse);
          case "status":
            return Number(b.ativo) - Number(a.ativo);
          default:
            return 0;
        }
      });
  }, [modalidades, searchTerm, selectedStatus, sortBy]);

  // Modalidades paginadas
  const paginatedModalidades = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredModalidades.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredModalidades, page, rowsPerPage]);

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
  }, [searchTerm, selectedStatus, sortBy]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedStatus("");
    setSortBy("nome");
    setPage(0);
  }, []);

  const toggleFilters = useCallback(() => {
    setFiltersExpanded(!filtersExpanded);
  }, [filtersExpanded]);

  // Formatar valor para moeda
  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value) || 0);
  };

  // Componente de conteúdo dos filtros
  const FiltersContent = () => (
    <Box sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '16px', p: 3, border: '1px solid rgba(148, 163, 184, 0.1)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneRounded sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>Filtros Avançados</Typography>
        </Box>
        {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: 'text.secondary', textTransform: 'none' }}>Limpar Tudo</Button>}
      </Box>
      <Divider sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} label="Status">
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ativo">Ativas</MenuItem>
            <MenuItem value="inativo">Inativas</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Ordenar por</InputLabel>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Ordenar por">
            <MenuItem value="nome">Nome</MenuItem>
            <MenuItem value="valor">Valor Repasse</MenuItem>
            <MenuItem value="status">Status</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );

  // Funções de modais
  const openModal = (modalidade: Modalidade | null = null) => {
    if (modalidade) {
      setEditingModalidade(modalidade);
      setFormData({
        nome: modalidade.nome,
        codigo_financeiro: modalidade.codigo_financeiro || "",
        valor_repasse: Number(modalidade.valor_repasse),
        ativo: modalidade.ativo,
      });
    } else {
      setEditingModalidade(null);
      setFormData({ nome: "", codigo_financeiro: "", valor_repasse: 0, ativo: true });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSave = async () => {
    try {
      const dataToSend = { ...formData, valor_repasse: Number(formData.valor_repasse) };
      if (editingModalidade) {
        await editarModalidade(editingModalidade.id, dataToSend);
        setSuccessMessage('Modalidade atualizada com sucesso!');
      } else {
        await criarModalidade(dataToSend);
        setSuccessMessage('Modalidade criada com sucesso!');
      }
      closeModal();
      await loadModalidades();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Erro ao salvar modalidade. Verifique os dados e tente novamente.");
    }
  };

  const openDeleteModal = (modalidade: Modalidade) => {
    setModalidadeToDelete(modalidade);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setModalidadeToDelete(null);
  };

  const handleDelete = async () => {
    if (!modalidadeToDelete) return;
    try {
      await removerModalidade(modalidadeToDelete.id);
      setSuccessMessage('Modalidade excluída com sucesso!');
      closeDeleteModal();
      await loadModalidades();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Erro ao excluir. A modalidade pode estar em uso.");
    }
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
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>Modalidades</Typography>

        <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TextField
              placeholder="Buscar modalidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>),
                endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>),
              }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLessIcon /> : <TuneRounded />} onClick={toggleFilters}>
                Filtros
                {hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }}/>)}
              </Button>
              <Button startIcon={<AddIcon />} onClick={() => openModal()} variant="contained" color="success">
                Nova Modalidade
              </Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)}>
                <MoreVert />
              </IconButton>
            </Box>
          </Box>

          <Collapse in={filtersExpanded} timeout={400}><Box sx={{ mb: 3 }}><FiltersContent /></Box></Collapse>

          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredModalidades.length)}-${Math.min((page + 1) * rowsPerPage, filteredModalidades.length)} de ${filteredModalidades.length} modalidades`}
          </Typography>
        </Card>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadModalidades}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredModalidades.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Category sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhuma modalidade encontrada</Typography></CardContent></Card>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2, borderRadius: '12px' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome da Modalidade</TableCell>
                  <TableCell align="center">Código Financeiro</TableCell>
                  <TableCell align="center">Valor Repasse</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedModalidades.map((modalidade) => (
                  <TableRow key={modalidade.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {modalidade.nome}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {modalidade.codigo_financeiro || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(modalidade.valor_repasse)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={modalidade.ativo ? 'Ativa' : 'Inativa'} 
                        size="small" 
                        color={modalidade.ativo ? 'success' : 'error'} 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openModal(modalidade)} color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" onClick={() => openDeleteModal(modalidade)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination component="div" count={filteredModalidades.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Linhas por página:" />
          </TableContainer>
        )}
      </Box>

      {/* Modal de Criação/Edição */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingModalidade ? 'Editar Modalidade' : 'Nova Modalidade'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField 
              label="Nome da Modalidade" 
              value={formData.nome} 
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })} 
              required 
            />
            <TextField 
              label="Código Financeiro" 
              value={formData.codigo_financeiro} 
              onChange={(e) => setFormData({ ...formData, codigo_financeiro: e.target.value })} 
              placeholder="Ex: 2.036, 1.025, FIN-001"
              helperText="Código usado no sistema financeiro (opcional)"
            />
            <TextField 
              label="Valor do Repasse (R$)" 
              type="number" 
              value={formData.valor_repasse} 
              onChange={(e) => setFormData({ ...formData, valor_repasse: parseFloat(e.target.value) || 0 })} 
              inputProps={{ step: "0.01", min: "0" }} 
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={closeModal} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.nome.trim()}>
            {editingModalidade ? 'Salvar Alterações' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirmar Exclusão</DialogTitle>
        <DialogContent><Typography>Tem certeza que deseja excluir a modalidade "{modalidadeToDelete?.nome}"?</Typography></DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}><Button onClick={closeDeleteModal} sx={{ color: 'text.secondary' }}>Cancelar</Button><Button onClick={handleDelete} color="error" variant="contained">Excluir</Button></DialogActions>
      </Dialog>
      
      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); navigate('/modalidades/gerenciar-alunos'); }}>
          <PeopleIcon sx={{ mr: 1 }} /> Gerenciar Alunos por Escola
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ModalidadesPage;