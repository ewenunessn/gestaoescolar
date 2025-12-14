import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StatusIndicator from '../components/StatusIndicator';
import PageHeader from '../components/PageHeader';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Container,
    Card,
    CardContent,
    Button,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    Alert,
    CircularProgress,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    ListItemIcon,
    Paper,
    Tooltip,
    Avatar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    InputAdornment,
    useTheme,
    useMediaQuery,
    Collapse,
    SelectChangeEvent,
    Menu
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Route as RouteIcon,
    School as SchoolIcon,

    Save as SaveIcon,
    Cancel as CancelIcon,
    ArrowUpward as ArrowUpIcon,
    ArrowDownward as ArrowDownIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    TuneRounded,
    ExpandMore,
    ExpandLess,
    MoreVert,
    Info
} from '@mui/icons-material';

import { rotaService } from '../modules/entregas/services/rotaService';
import { RotaEntrega, CreateRotaData } from '../modules/entregas/types/rota';
import PageBreadcrumbs from '../components/PageBreadcrumbs';



const GestaoRotas: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();

    const [rotas, setRotas] = useState<RotaEntrega[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estados dos modais
    const [modalRotaAberto, setModalRotaAberto] = useState(false);
    const [rotaEditando, setRotaEditando] = useState<RotaEntrega | null>(null);

    // Estados de filtros e busca
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [hasActiveFilters, setHasActiveFilters] = useState(false);

    // Estados de paginação
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Estados de ações
    const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

    // Estados do formulário
    const [formRota, setFormRota] = useState<CreateRotaData>({
        nome: '',
        descricao: '',
        cor: '#1976d2'
    });
    const [salvando, setSalvando] = useState(false);






    const loadRotas = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const rotasData = await rotaService.listarRotas();
            setRotas(Array.isArray(rotasData) ? rotasData : []);
        } catch (err: any) {
            setError('Erro ao carregar rotas. Tente novamente.');
            setRotas([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRotas();
    }, [loadRotas]);

    useEffect(() => {
        const hasFilters = !!(selectedStatus || searchTerm);
        setHasActiveFilters(hasFilters);
    }, [selectedStatus, searchTerm]);



    const filteredRotas = useMemo(() => {
        return rotas.filter(rota => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = rota.nome.toLowerCase().includes(searchLower) ||
                rota.descricao?.toLowerCase().includes(searchLower);
            const matchesStatus = !selectedStatus ||
                (selectedStatus === 'ativo' ? rota.ativo : !rota.ativo);
            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            if (sortBy === 'escolas') return (b.total_escolas || 0) - (a.total_escolas || 0);
            if (sortBy === 'status') return Number(b.ativo) - Number(a.ativo);
            return a.nome.localeCompare(b.nome);
        });
    }, [rotas, searchTerm, selectedStatus, sortBy]);

    const paginatedRotas = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return filteredRotas.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredRotas, page, rowsPerPage]);

    const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    useEffect(() => { setPage(0); }, [searchTerm, selectedStatus, sortBy]);

    const clearFilters = useCallback(() => {
        setSearchTerm('');
        setSelectedStatus('');
        setSortBy('name');
    }, []);

    const toggleFilters = useCallback(() => setFiltersExpanded(!filtersExpanded), [filtersExpanded]);

    const abrirModalRota = (rota?: RotaEntrega) => {
        if (rota) {
            setRotaEditando(rota);
            setFormRota({
                nome: rota.nome,
                descricao: rota.descricao || '',
                cor: rota.cor
            });
        } else {
            setRotaEditando(null);
            setFormRota({
                nome: '',
                descricao: '',
                cor: '#1976d2'
            });
        }
        setModalRotaAberto(true);
    };

    const fecharModalRota = () => {
        setModalRotaAberto(false);
        setRotaEditando(null);
        setSalvando(false);
    };

    const salvarRota = async () => {
        if (!formRota.nome.trim()) {
            setError('Nome da rota é obrigatório');
            return;
        }

        try {
            setSalvando(true);

            if (rotaEditando) {
                await rotaService.atualizarRota(rotaEditando.id, formRota);
            } else {
                await rotaService.criarRota(formRota);
            }

            await loadRotas();
            setSuccessMessage('Rota salva com sucesso!');
            fecharModalRota();

        } catch (err) {
            console.error('Erro ao salvar rota:', err);
            setError('Erro ao salvar rota');
        } finally {
            setSalvando(false);
        }
    };

    const deletarRota = async (id: number) => {
        if (!confirm('Tem certeza que deseja remover esta rota? Todas as escolas associadas serão desvinculadas.')) return;

        try {
            await rotaService.deletarRota(id);
            setSuccessMessage('Rota removida com sucesso!');
            await loadRotas();
        } catch (err) {
            console.error('Erro ao deletar rota:', err);
            setError('Erro ao remover rota');
        }
    };



    const FiltersContent = () => (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: '12px', p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TuneRounded sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Filtros Avançados
                    </Typography>
                </Box>
                {hasActiveFilters && (
                    <Button size="small" onClick={clearFilters} sx={{ color: 'text.secondary', textTransform: 'none' }}>
                        Limpar Tudo
                    </Button>
                )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={selectedStatus}
                            onChange={(e: SelectChangeEvent<string>) => setSelectedStatus(e.target.value)}
                            label="Status"
                        >
                            <MenuItem value="">Todas</MenuItem>
                            <MenuItem value="ativo">Ativas</MenuItem>
                            <MenuItem value="inativo">Inativas</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Ordenar por</InputLabel>
                        <Select
                            value={sortBy}
                            onChange={(e: SelectChangeEvent<string>) => setSortBy(e.target.value)}
                            label="Ordenar por"
                        >
                            <MenuItem value="name">Nome</MenuItem>
                            <MenuItem value="escolas">Número de Escolas</MenuItem>
                            <MenuItem value="status">Status</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Box>
    );

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {successMessage && (
                <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}>
                    <Alert severity="success" onClose={() => setSuccessMessage(null)}>
                        {successMessage}
                    </Alert>
                </Box>
            )}
            {error && (
                <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}>
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Box>
            )}

            <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
                <PageBreadcrumbs
                    items={[
                        { label: 'Gestão de Rotas', icon: <RouteIcon fontSize="small" /> }
                    ]}
                />
                <PageHeader 
                    title="Gestão de Rotas de Entrega"
                    totalCount={filteredRotas.length}
                    statusLegend={[
                      { status: 'ativo', label: 'ATIVAS', count: filteredRotas.filter(r => r.ativo).length },
                      { status: 'inativo', label: 'INATIVAS', count: filteredRotas.filter(r => !r.ativo).length }
                    ]}
                />

                <Card sx={{ borderRadius: '12px', p: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
                        <TextField
                            placeholder="Buscar rotas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            size="small"
                            sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
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
                            >
                                Filtros
                                {hasActiveFilters && !filtersExpanded && (
                                    <Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                                )}
                            </Button>
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => abrirModalRota()}
                                variant="contained"
                                color="success"
                            >
                                Nova Rota
                            </Button>
                            <IconButton size="small" onClick={(e) => setActionsMenuAnchor(e.currentTarget)}>
                                <MoreVert />
                            </IconButton>
                        </Box>
                    </Box>
                    <Collapse in={filtersExpanded} timeout={300}>
                        <Box sx={{ mb: 2 }}>
                            <FiltersContent />
                        </Box>
                    </Collapse>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontSize: '0.8rem' }}>
                        {`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredRotas.length)}-${Math.min((page + 1) * rowsPerPage, filteredRotas.length)} de ${filteredRotas.length} rotas`}
                    </Typography>
                </Card>

                {loading ? (
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 6 }}>
                            <CircularProgress size={60} />
                        </CardContent>
                    </Card>
                ) : error && rotas.length === 0 ? (
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 6 }}>
                            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                            <Button variant="contained" onClick={loadRotas}>Tentar Novamente</Button>
                        </CardContent>
                    </Card>
                ) : filteredRotas.length === 0 ? (
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 6 }}>
                            <RouteIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                                Nenhuma rota encontrada
                            </Typography>
                        </CardContent>
                    </Card>
                ) : (
                    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Nome da Rota</TableCell>
                                        <TableCell align="center">Total de Escolas</TableCell>
                                        <TableCell>Descrição</TableCell>
                                        <TableCell align="center">Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedRotas.map((rota) => (
                                        <TableRow key={rota.id} hover>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <StatusIndicator status={rota.ativo ? 'ativo' : 'inativo'} size="small" />
                                                    <Avatar sx={{ bgcolor: rota.cor, width: 32, height: 32 }}>
                                                        <RouteIcon fontSize="small" />
                                                    </Avatar>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {rota.nome}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                                    {rota.total_escolas || 0}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {rota.descricao || '-'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                    <Tooltip title="Gerenciar Escolas">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => navigate(`/gestao-rotas/${rota.id}/escolas`)}
                                                            color="primary"
                                                        >
                                                            <SchoolIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Editar Rota">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => abrirModalRota(rota)}
                                                            color="primary"
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Remover Rota">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => deletarRota(rota.id)}
                                                            color="error"
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={filteredRotas.length}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            labelRowsPerPage="Itens por página:"
                        />
                    </Paper>
                )}

                {/* Modal de Rota */}
                <Dialog open={modalRotaAberto} onClose={fecharModalRota} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        {rotaEditando ? 'Editar Rota' : 'Nova Rota'}
                    </DialogTitle>

                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Nome da Rota"
                                    fullWidth
                                    required
                                    value={formRota.nome}
                                    onChange={(e) => setFormRota(prev => ({ ...prev, nome: e.target.value }))}
                                    placeholder="Ex: Rota Centro, Equipe Norte, etc."
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Descrição"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={formRota.descricao}
                                    onChange={(e) => setFormRota(prev => ({ ...prev, descricao: e.target.value }))}
                                    placeholder="Descreva a região ou características desta rota"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Cor da Rota
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <TextField
                                            type="color"
                                            value={formRota.cor}
                                            onChange={(e) => setFormRota(prev => ({ ...prev, cor: e.target.value }))}
                                            sx={{ width: 80 }}
                                            size="small"
                                        />
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ bgcolor: formRota.cor, width: 28, height: 28 }}>
                                                <RouteIcon fontSize="small" />
                                            </Avatar>
                                            <Typography variant="body2" color="text.secondary">
                                                Prévia nos badges das guias
                                            </Typography>
                                        </Box>
                                    </Box>
                                    
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                        Cores sugeridas:
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {[
                                            { cor: '#2563eb', nome: 'Azul' },
                                            { cor: '#dc2626', nome: 'Vermelho' },
                                            { cor: '#16a34a', nome: 'Verde' },
                                            { cor: '#ca8a04', nome: 'Amarelo' },
                                            { cor: '#9333ea', nome: 'Roxo' },
                                            { cor: '#ea580c', nome: 'Laranja' },
                                            { cor: '#0891b2', nome: 'Ciano' },
                                            { cor: '#be123c', nome: 'Rosa' }
                                        ].map((cor) => (
                                            <Tooltip key={cor.cor} title={cor.nome}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setFormRota(prev => ({ ...prev, cor: cor.cor }))}
                                                    sx={{
                                                        bgcolor: cor.cor,
                                                        width: 24,
                                                        height: 24,
                                                        border: formRota.cor === cor.cor ? '2px solid #000' : '1px solid #ccc',
                                                        '&:hover': { bgcolor: cor.cor, opacity: 0.8 }
                                                    }}
                                                />
                                            </Tooltip>
                                        ))}
                                    </Box>
                                </Box>
                            </Grid>


                        </Grid>
                    </DialogContent>

                    <DialogActions>
                        <Button onClick={fecharModalRota} disabled={salvando}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={salvarRota}
                            variant="contained"
                            disabled={salvando || !formRota.nome.trim()}
                            startIcon={salvando ? <CircularProgress size={20} /> : <SaveIcon />}
                        >
                            {salvando ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogActions>
                </Dialog>




                {/* Menu de Ações */}
                <Menu
                    anchorEl={actionsMenuAnchor}
                    open={Boolean(actionsMenuAnchor)}
                    onClose={() => setActionsMenuAnchor(null)}
                >
                    <MenuItem onClick={() => { setActionsMenuAnchor(null); }}>
                        <Info sx={{ mr: 1 }} />
                        Relatório de Rotas
                    </MenuItem>
                </Menu>

            </Box>
        </Box>
    );
};

export default GestaoRotas;