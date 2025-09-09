import { useEffect, useState, useMemo } from "react";
import { listarCardapios } from "../services/cardapios";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Tooltip,
  Paper,
  Menu,
  Collapse,
  Snackbar,
  TablePagination,
} from "@mui/material";
import {
  Search,
  Add,
  MenuBook,
  Visibility,
  CheckCircle,
  Cancel,
  CalendarToday,
  Clear,
  FilterList,
  MoreVert,
  ArrowUpward,
  ArrowDownward,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

interface Cardapio {
  id: number;
  nome: string;
  periodo_dias: number;
  data_inicio: string;
  data_fim: string;
  modalidade_id?: number;
  modalidade_nome?: string;
  ativo: boolean;
}

export default function CardapiosPage() {
  const [cardapios, setCardapios] = useState<Cardapio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModalidade, setSelectedModalidade] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("nome");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Estados de UI
  const [showFilters, setShowFilters] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const carregarCardapios = async () => {
    try {
      setLoading(true);
      const data = await listarCardapios();
      setCardapios(data);
      setError("");
    } catch (error) {
      console.error('Erro ao carregar cardápios:', error);
      setError("Erro ao carregar cardápios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarCardapios();
  }, []);

  // Detectar filtros ativos
  const hasActiveFilters = useMemo(() => {
    return searchTerm || selectedModalidade || selectedStatus;
  }, [searchTerm, selectedModalidade, selectedStatus]);

  // Extrair dados únicos para filtros
  const modalidades = useMemo(() => {
    const uniqueModalidades = [...new Set(cardapios.map(c => c.modalidade_nome).filter(Boolean))];
    return uniqueModalidades.sort();
  }, [cardapios]);

  // Filtrar e ordenar cardápios
  const filteredCardapios = useMemo(() => {
    let filtered = cardapios.filter(cardapio => {
      const matchesSearch = cardapio.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModalidade = !selectedModalidade || cardapio.modalidade_nome === selectedModalidade;
      const matchesStatus = !selectedStatus || 
        (selectedStatus === 'ativo' && cardapio.ativo) ||
        (selectedStatus === 'inativo' && !cardapio.ativo);
      
      return matchesSearch && matchesModalidade && matchesStatus;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Cardapio];
      let bValue: any = b[sortBy as keyof Cardapio];
      
      if (sortBy === 'modalidade') {
        aValue = a.modalidade_nome || '';
        bValue = b.modalidade_nome || '';
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [cardapios, searchTerm, selectedModalidade, selectedStatus, sortBy, sortOrder]);

  // Paginação
  const paginatedCardapios = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredCardapios.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCardapios, page, rowsPerPage]);

  // Funções de filtros
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedModalidade("");
    setSelectedStatus("");
    setPage(0);
  };

  const removeSearchFilter = () => setSearchTerm("");
  const removeModalidadeFilter = () => setSelectedModalidade("");
  const removeStatusFilter = () => setSelectedStatus("");

  const toggleFilters = () => setShowFilters(!showFilters);

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Componente de Filtros
  const FiltersContent = () => (
    <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        {/* Modalidade */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Modalidade</InputLabel>
          <Select
            value={selectedModalidade}
            onChange={(e) => setSelectedModalidade(e.target.value as string)}
            label="Modalidade"
          >
            <MenuItem value="">Todas as modalidades</MenuItem>
            {modalidades.map(modalidade => (
              <MenuItem key={modalidade} value={modalidade}>{modalidade}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Status */}
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as string)}
            label="Status"
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ativo">Ativos</MenuItem>
            <MenuItem value="inativo">Inativos</MenuItem>
          </Select>
        </FormControl>

        {/* Ordenação */}
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Ordenar por</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as string)}
            label="Ordenar por"
          >
            <MenuItem value="nome">Nome</MenuItem>
            <MenuItem value="modalidade">Modalidade</MenuItem>
            <MenuItem value="periodo_dias">Período</MenuItem>
            <MenuItem value="ativo">Status</MenuItem>
          </Select>
        </FormControl>

        {/* Direção da Ordenação */}
        <Tooltip title={`Ordenação ${sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}`}>
          <IconButton
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            sx={{
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              color: sortOrder === 'asc' ? '#059669' : '#dc2626',
            }}
          >
            {sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <Box sx={{ maxWidth: '1400px', mx: 'auto', p: 3 }}>
        {/* Mensagem de Sucesso */}
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ mb: 2 }}
            onClose={() => setSuccessMessage("")}
          >
            {successMessage}
          </Alert>
        )}

        {/* Cabeçalho removido */}

        {/* Barra de Busca e Ações */}
        <Card sx={{ mb: 3, boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              alignItems: 'center',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <TextField
                placeholder="Buscar cardápios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#6b7280' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchTerm("")}
                        sx={{ color: '#6b7280' }}
                      >
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': {
                      '& > fieldset': {
                        borderColor: '#4f46e5',
                      }
                    }
                  }
                }}
              />
              
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {/* Botão de Filtros */}
                <Tooltip title="Filtros avançados">
                  <IconButton
                    onClick={toggleFilters}
                    sx={{
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: showFilters || hasActiveFilters ? '#4f46e5' : '#6b7280',
                      backgroundColor: showFilters || hasActiveFilters ? '#f0f9ff' : 'transparent',
                      '&:hover': {
                        backgroundColor: '#f0f9ff',
                        borderColor: '#4f46e5',
                      }
                    }}
                  >
                    <FilterList />
                    {hasActiveFilters && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                        }}
                      />
                    )}
                  </IconButton>
                </Tooltip>

                {/* Botão Novo Cardápio */}
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate("/cardapios/novo")}
                  sx={{
                    backgroundColor: '#4f46e5',
                    '&:hover': {
                      backgroundColor: '#4338ca',
                    },
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 3,
                  }}
                >
                  Novo Cardápio
                </Button>

                {/* Menu de Ações */}
                <IconButton
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    color: '#6b7280',
                    '&:hover': {
                      backgroundColor: '#f9fafb',
                      borderColor: '#9ca3af',
                    }
                  }}
                >
                  <MoreVert />
                </IconButton>
              </Box>
            </Box>
          </Box>

          {/* Filtros Avançados */}
          <Collapse in={showFilters}>
            <FiltersContent />
          </Collapse>
        </Card>

        {/* Chips de Filtros Ativos */}
        {hasActiveFilters && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {searchTerm && (
              <Chip
                label={`Busca: "${searchTerm}"`}
                onDelete={removeSearchFilter}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
            {selectedModalidade && (
              <Chip
                label={`Modalidade: ${selectedModalidade}`}
                onDelete={removeModalidadeFilter}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
            {selectedStatus && (
              <Chip
                label={`Status: ${selectedStatus === 'ativo' ? 'Ativos' : 'Inativos'}`}
                onDelete={removeStatusFilter}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        )}

        {/* Contador de Cardápios */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            sx={{
              color: '#6b7280',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            Mostrando {paginatedCardapios.length} de {filteredCardapios.length} cardápios
            {filteredCardapios.length !== cardapios.length && (
              <Typography
                component="span"
                sx={{
                  color: '#4f46e5',
                  fontSize: '0.875rem',
                  ml: 1,
                  fontWeight: 500,
                }}
              >
                (filtrados de {cardapios.length} total)
              </Typography>
            )}
          </Typography>
        </Box>

        {/* Tabela de Cardápios */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : filteredCardapios.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <MenuBook sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nenhum cardápio encontrado
            </Typography>
            <Typography color="text.secondary">
              {searchTerm || hasActiveFilters 
                ? 'Tente ajustar os filtros ou buscar por outros termos'
                : 'Comece criando seu primeiro cardápio'
              }
            </Typography>
          </Box>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Cardápio</TableCell>
                    <TableCell>Modalidade</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell>Vigência</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedCardapios.map((cardapio) => (
                    <TableRow key={cardapio.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MenuBook color="primary" fontSize="small" />
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {cardapio.nome}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {cardapio.id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {cardapio.modalidade_nome || 'Não definida'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarToday fontSize="small" color="action" />
                          <Typography variant="body2">
                            {cardapio.periodo_dias} dias
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatarData(cardapio.data_inicio)} até {formatarData(cardapio.data_fim)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={cardapio.ativo ? <CheckCircle /> : <Cancel />}
                          label={cardapio.ativo ? 'Ativo' : 'Inativo'}
                          color={cardapio.ativo ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalhes">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/cardapios/${cardapio.id}`)}
                            sx={{
                              color: '#4f46e5',
                              '&:hover': {
                                backgroundColor: '#f0f9ff',
                              }
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Paginação */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredCardapios.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
          </Paper>
        )}

        {/* Menu de Ações */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem 
            onClick={() => {
              clearFilters();
              setAnchorEl(null);
            }}
            disabled={!hasActiveFilters}
            sx={{ minWidth: 150 }}
          >
            <Clear sx={{ mr: 1, fontSize: 20 }} />
            Limpar Filtros
          </MenuItem>
        </Menu>

        {/* Sistema de Mensagens */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={4000}
          onClose={() => setSuccessMessage("")}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSuccessMessage("")} 
            severity="success" 
            sx={{ width: '100%' }}
          >
            {successMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
