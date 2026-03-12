import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StatusIndicator from '../components/StatusIndicator';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import TableFilter, { FilterField } from '../components/TableFilter';
import { useNavigate } from 'react-router-dom';
import CompactPagination from '../components/CompactPagination';
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
    useTheme,
    useMediaQuery,
    SelectChangeEvent,
    Avatar,
    Tooltip,
    Switch,
    FormControlLabel,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Route as RouteIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    FilterList as FilterIcon,
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

    // Estados de filtros - NOVO SISTEMA
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
    const [filters, setFilters] = useState<Record<string, any>>({});

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

    // Definir campos de filtro
    const filterFields: FilterField[] = useMemo(() => [
        {
            type: 'select',
            label: 'Status',
            key: 'status',
            options: [
                { value: 'ativo', label: 'Ativas' },
                { value: 'inativo', label: 'Inativas' },
            ],
        },
        {
            type: 'select',
            label: 'Ordenar por',
            key: 'sortBy',
            options: [
                { value: 'name', label: 'Nome (A-Z)' },
                { value: 'escolas', label: 'Mais Escolas' },
                { value: 'status', label: 'Status' },
            ],
        },
    ], []);



    const filteredRotas = useMemo(() => {
        return rotas.filter(rota => {
            // Busca por palavra-chave
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                if (!(rota.nome.toLowerCase().includes(searchLower) ||
                      rota.descricao?.toLowerCase().includes(searchLower))) {
                    return false;
                }
            }
            
            // Filtro por status
            if (filters.status) {
                const matchesStatus = filters.status === 'ativo' ? rota.ativo : !rota.ativo;
                if (!matchesStatus) return false;
            }
            
            return true;
        }).sort((a, b) => {
            const sortBy = filters.sortBy || 'name';
            if (sortBy === 'escolas') return (b.total_escolas || 0) - (a.total_escolas || 0);
            if (sortBy === 'status') return Number(b.ativo) - Number(a.ativo);
            return a.nome.localeCompare(b.nome);
        });
    }, [rotas, filters]);

    const paginatedRotas = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return filteredRotas.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredRotas, page, rowsPerPage]);

    const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    useEffect(() => { setPage(0); }, [filters]);

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
        <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
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

            <PageContainer fullHeight>
                <PageBreadcrumbs
                    items={[
                        { label: 'Gestão de Rotas', icon: <RouteIcon fontSize="small" /> }
                    ]}
                />
                <PageHeader 
                    title="Gestão de Rotas de Entrega"
                />

                <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
                        <TextField
                            placeholder="Buscar rotas..."
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
                                )
                            }}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                startIcon={<FilterIcon />}
                                onClick={(e) => { setFilterAnchorEl(e.currentTarget); setFilterOpen(true); }}
                                size="small"
                            >
                                Filtros
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => abrirModalRota()}
                                startIcon={<AddIcon />}
                                size="small"
                                sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                            >
                                Nova Rota
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
                        Exibindo {filteredRotas.length} {filteredRotas.length === 1 ? 'rota' : 'rotas'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {[
                            { status: 'success', label: 'ATIVAS', count: filteredRotas.filter(r => r.ativo).length },
                            { status: 'default', label: 'INATIVAS', count: filteredRotas.filter(r => !r.ativo).length }
                        ].map((item) => (
                            <Box key={item.status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <StatusIndicator status={item.status} size="small" />
                                <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {item.label}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                                    {item.count}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

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
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
                        <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell width="40"></TableCell>
                                        <TableCell>Nome</TableCell>
                                        <TableCell>Descrição</TableCell>
                                        <TableCell align="center">Escolas</TableCell>
                                        <TableCell align="center">Status</TableCell>
                                        <TableCell align="center" width="200">Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedRotas.map((rota) => (
                                        <TableRow key={rota.id} hover>
                                            <TableCell>
                                                <Box 
                                                    sx={{ 
                                                        width: 12, 
                                                        height: 12, 
                                                        borderRadius: '50%', 
                                                        bgcolor: rota.cor,
                                                        boxShadow: `0 0 0 2px ${rota.cor}40`
                                                    }} 
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {rota.nome}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {rota.descricao || 'Sem descrição'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={rota.total_escolas || 0} size="small" color="primary" />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                                                    <StatusIndicator status={rota.ativo ? 'ativo' : 'inativo'} size="small" />
                                                    <Typography variant="body2" color={rota.ativo ? 'success.main' : 'text.disabled'}>
                                                        {rota.ativo ? 'Ativa' : 'Inativa'}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                    <Tooltip title="Gerenciar Escolas">
                                                        <IconButton 
                                                            size="small" 
                                                            color="primary"
                                                            onClick={() => navigate(`/gestao-rotas/${rota.id}/escolas`)}
                                                        >
                                                            <RouteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Editar">
                                                        <IconButton 
                                                            size="small" 
                                                            color="secondary"
                                                            onClick={() => abrirModalRota(rota)}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Excluir">
                                                        <IconButton 
                                                            size="small" 
                                                            color="error"
                                                            onClick={() => deletarRota(rota.id)}
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
                        <CompactPagination
                            count={filteredRotas.length}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                        />
                    </Box>
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
            </PageContainer>
        </Box>
    );
};

export default GestaoRotas;