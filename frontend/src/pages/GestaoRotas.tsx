import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StatusIndicator from '../components/StatusIndicator';
import PageHeader from '../components/PageHeader';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    Button,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Alert,
    CircularProgress,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TablePagination,
    useTheme,
    useMediaQuery,
    Collapse,
    SelectChangeEvent,
    Avatar,
    Tooltip,
    Switch,
    FormControlLabel
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Route as RouteIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    TuneRounded,
    Save as SaveIcon
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

    // Estados do formulário
    const [formRota, setFormRota] = useState<CreateRotaData>({
        nome: '',
        descricao: '',
        cor: '#1976d2',
        ativo: true
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
                cor: rota.cor,
                ativo: rota.ativo
            });
        } else {
            setRotaEditando(null);
            setFormRota({
                nome: '',
                descricao: '',
                cor: '#1976d2',
                ativo: true
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
        if (!confirm('ATENÇÃO: Você está prestes a EXCLUIR PERMANENTEMENTE esta rota.\n\nIsso removerá:\n- O cadastro da rota\n- A associação com as escolas (as escolas ficarão "Sem Rota")\n- O histórico de planejamentos desta rota\n\nDeseja continuar?')) return;

        try {
            await rotaService.deletarRota(id);
            setSuccessMessage('Rota excluída permanentemente!');
            await loadRotas();
        } catch (err) {
            console.error('Erro ao deletar rota:', err);
            setError('Erro ao remover rota');
        }
    };

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

                <Box sx={{ mb: 4, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', flex: 1, maxWidth: isMobile ? '100%' : 500, bgcolor: 'background.paper', borderRadius: 2, p: 0.5, border: '1px solid', borderColor: 'divider' }}>
                        <IconButton size="small" sx={{ p: 1 }}>
                            <SearchIcon fontSize="small" color="action" />
                        </IconButton>
                        <TextField
                            placeholder="Buscar rotas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            fullWidth
                            variant="standard"
                            InputProps={{ disableUnderline: true }}
                            sx={{ px: 1 }}
                        />
                        {searchTerm && (
                            <IconButton size="small" onClick={() => setSearchTerm('')}>
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={toggleFilters}
                            startIcon={<TuneRounded />}
                            color={hasActiveFilters ? "primary" : "inherit"}
                            sx={{ 
                                textTransform: 'none', 
                                borderColor: hasActiveFilters ? 'primary.main' : 'divider',
                                color: hasActiveFilters ? 'primary.main' : 'text.secondary'
                            }}
                        >
                            Filtros
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => abrirModalRota()}
                            startIcon={<AddIcon />}
                            disableElevation
                            sx={{ textTransform: 'none', borderRadius: 2 }}
                        >
                            Nova Rota
                        </Button>
                    </Box>
                </Box>

                <Collapse in={filtersExpanded}>
                    <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6} md={4}>
                                <FormControl fullWidth size="small" variant="outlined">
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={selectedStatus}
                                        onChange={(e: SelectChangeEvent<string>) => setSelectedStatus(e.target.value)}
                                        label="Status"
                                    >
                                        <MenuItem value="">Todos</MenuItem>
                                        <MenuItem value="ativo">Ativos</MenuItem>
                                        <MenuItem value="inativo">Inativos</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <FormControl fullWidth size="small" variant="outlined">
                                    <InputLabel>Ordenar por</InputLabel>
                                    <Select
                                        value={sortBy}
                                        onChange={(e: SelectChangeEvent<string>) => setSortBy(e.target.value)}
                                        label="Ordenar por"
                                    >
                                        <MenuItem value="name">Nome (A-Z)</MenuItem>
                                        <MenuItem value="escolas">Mais Escolas</MenuItem>
                                        <MenuItem value="status">Status</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} display="flex" justifyContent="flex-end">
                                <Button size="small" onClick={clearFilters} disabled={!hasActiveFilters}>
                                    Limpar Filtros
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                </Collapse>

                {loading ? (
                    <Box display="flex" justifyContent="center" py={8}>
                        <CircularProgress size={40} thickness={4} />
                    </Box>
                ) : error && rotas.length === 0 ? (
                    <Box textAlign="center" py={6}>
                        <Typography color="error" gutterBottom>{error}</Typography>
                        <Button variant="outlined" onClick={loadRotas}>Tentar Novamente</Button>
                    </Box>
                ) : filteredRotas.length === 0 ? (
                    <Box textAlign="center" py={8} color="text.secondary">
                        <RouteIcon sx={{ fontSize: 48, opacity: 0.2, mb: 2 }} />
                        <Typography variant="body1">
                            Nenhuma rota encontrada
                        </Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {paginatedRotas.map((rota) => (
                            <Grid item xs={12} sm={6} md={4} key={rota.id}>
                                <Card 
                                    elevation={0}
                                    sx={{ 
                                        height: '100%',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        transition: 'all 0.2s',
                                        opacity: rota.ativo ? 1 : 0.6,
                                        bgcolor: rota.ativo ? 'background.paper' : '#f5f5f5',
                                        '&:hover': { 
                                            borderColor: 'primary.main',
                                            transform: rota.ativo ? 'translateY(-2px)' : 'none',
                                            boxShadow: rota.ativo ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                                        }
                                    }}
                                >
                                    <Box sx={{ p: 2.5 }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Box 
                                                    sx={{ 
                                                        width: 10, 
                                                        height: 10, 
                                                        borderRadius: '50%', 
                                                        bgcolor: rota.cor,
                                                        boxShadow: `0 0 0 2px ${rota.cor}40`
                                                    }} 
                                                />
                                                <Typography variant="subtitle1" fontWeight="600">
                                                    {rota.nome}
                                                </Typography>
                                            </Box>
                                            <IconButton 
                                                size="small" 
                                                onClick={(e) => {
                                                    // Implementar menu de ações aqui se necessário
                                                    // Por enquanto, vou manter ações diretas simplificadas
                                                }}
                                            >
                                                {/* <MoreVert fontSize="small" /> */}
                                            </IconButton>
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" sx={{ 
                                            mb: 3, 
                                            minHeight: '2.5em',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {rota.descricao || 'Sem descrição'}
                                        </Typography>

                                        <Box display="flex" alignItems="center" gap={3} mb={3}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    Escolas
                                                </Typography>
                                                <Typography variant="h6" fontWeight="bold">
                                                    {rota.total_escolas || 0}
                                                </Typography>
                                            </Box>
                                            <Divider orientation="vertical" flexItem />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    Status
                                                </Typography>
                                                <Typography 
                                                    variant="body2" 
                                                    fontWeight="medium"
                                                    color={rota.ativo ? 'success.main' : 'text.disabled'}
                                                >
                                                    {rota.ativo ? 'Ativa' : 'Inativa'}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        <Box display="flex" justifyContent="flex-end" gap={1}>
                                            <Button 
                                                size="small" 
                                                color="inherit" 
                                                onClick={() => navigate(`/gestao-rotas/${rota.id}/escolas`)}
                                                sx={{ textTransform: 'none', color: 'text.secondary' }}
                                            >
                                                Escolas
                                            </Button>
                                            <Button 
                                                size="small" 
                                                color="primary" 
                                                onClick={() => abrirModalRota(rota)}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                Editar
                                            </Button>
                                            <Button 
                                                size="small" 
                                                color="error" 
                                                onClick={() => deletarRota(rota.id)}
                                                sx={{ textTransform: 'none', minWidth: 0, px: 1 }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </Button>
                                        </Box>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
                
                <Box mt={4} display="flex" justifyContent="center">
                    <TablePagination
                        component="div"
                        count={filteredRotas.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Itens por página"
                        sx={{ border: 'none' }}
                    />
                </Box>

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
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formRota.ativo ?? true}
                                            onChange={(e) => setFormRota(prev => ({ ...prev, ativo: e.target.checked }))}
                                            name="ativo"
                                            color="primary"
                                        />
                                    }
                                    label={formRota.ativo ? 'Rota Ativa' : 'Rota Inativa'}
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

            </Box>
        </Box>
    );
};

export default GestaoRotas;