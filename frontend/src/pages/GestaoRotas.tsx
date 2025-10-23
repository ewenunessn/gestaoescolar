import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    ColorLens as ColorIcon,
    DragIndicator as DragIcon,
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
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { rotaService } from '../modules/entregas/services/rotaService';
import { escolaService } from '../services/escolaService';
import { RotaEntrega, RotaEscola, CreateRotaData } from '../modules/entregas/types/rota';

// Componente para item arrastável da escola
interface SortableEscolaItemProps {
    escola: RotaEscola;
    index: number;
    onRemove: (escola: any) => void;
}

const SortableEscolaItem: React.FC<SortableEscolaItemProps> = ({ escola, index, onRemove }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: escola.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            sx={{
                mb: 1,
                border: '2px solid',
                borderColor: isDragging ? 'primary.main' : 'grey.300',
                bgcolor: isDragging ? 'primary.50' : 'background.paper',
                cursor: isDragging ? 'grabbing' : 'grab',
                '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50',
                }
            }}
        >
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        {...attributes}
                        {...listeners}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'grab',
                            '&:active': { cursor: 'grabbing' }
                        }}
                    >
                        <DragIcon color="action" />
                    </Box>

                    <Chip
                        label={index + 1}
                        size="small"
                        color="primary"
                        sx={{ minWidth: 32, fontWeight: 'bold' }}
                    />

                    <Box flexGrow={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {escola.escola_nome}
                        </Typography>
                        {escola.escola_endereco && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                📍 {escola.escola_endereco}
                            </Typography>
                        )}
                    </Box>

                    <Tooltip title="Remover da rota">
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => onRemove({ id: escola.escola_id })}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </CardContent>
        </Card>
    );
};

const GestaoRotas: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [rotas, setRotas] = useState<RotaEntrega[]>([]);
    const [escolas, setEscolas] = useState<any[]>([]);
    const [escolasDisponiveis, setEscolasDisponiveis] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estados dos modais
    const [modalRotaAberto, setModalRotaAberto] = useState(false);
    const [modalEscolasAberto, setModalEscolasAberto] = useState(false);
    const [rotaEditando, setRotaEditando] = useState<RotaEntrega | null>(null);
    const [rotaSelecionada, setRotaSelecionada] = useState<RotaEntrega | null>(null);
    const [escolasRota, setEscolasRota] = useState<RotaEscola[]>([]);

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
    const [escolasSelecionadas, setEscolasSelecionadas] = useState<Set<number>>(new Set());
    const [salvando, setSalvando] = useState(false);
    const [filtroEscolas, setFiltroEscolas] = useState('');
    const inputPesquisaRef = React.useRef<HTMLInputElement>(null);

    // Cores predefinidas para as rotas
    const coresPredefinidas = [
        '#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#d32f2f',
        '#0288d1', '#689f38', '#fbc02d', '#512da8', '#c2185b',
        '#00796b', '#5d4037', '#455a64', '#e64a19', '#303f9f'
    ];

    // Sensores para drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const loadRotas = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [rotasData, escolasData, escolasDisponiveisData] = await Promise.all([
                rotaService.listarRotas(),
                escolaService.listarEscolas(),
                rotaService.listarEscolasDisponiveis()
            ]);

            setRotas(Array.isArray(rotasData) ? rotasData : []);
            setEscolas(Array.isArray(escolasData) ? escolasData : []);
            setEscolasDisponiveis(escolasDisponiveisData);
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

    // Atalho de teclado para focar no campo de pesquisa
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'f' && modalEscolasAberto) {
                event.preventDefault();
                inputPesquisaRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [modalEscolasAberto]);

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

    const abrirModalEscolas = async (rota: RotaEntrega) => {
        try {
            setRotaSelecionada(rota);
            setLoading(true);

            const [escolasRotaData, escolasDisponiveisData] = await Promise.all([
                rotaService.listarEscolasRota(rota.id),
                rotaService.listarEscolasDisponiveis()
            ]);

            setEscolasRota(escolasRotaData);
            setEscolasDisponiveis(escolasDisponiveisData);

            // Marcar escolas já associadas
            const escolasIds = new Set(escolasRotaData.map(er => er.escola_id));
            setEscolasSelecionadas(escolasIds);

            setModalEscolasAberto(true);
        } catch (err) {
            console.error('Erro ao carregar escolas da rota:', err);
            setError('Erro ao carregar escolas da rota');
        } finally {
            setLoading(false);
        }
    };

    const fecharModalEscolas = () => {
        setModalEscolasAberto(false);
        setRotaSelecionada(null);
        setEscolasRota([]);
        setEscolasSelecionadas(new Set());
        setFiltroEscolas('');
    };

    const escolasDisponiveisFiltradas = escolasDisponiveis.filter(escola => {
        if (!filtroEscolas.trim()) return true;

        const termo = filtroEscolas.toLowerCase().trim();
        return (
            escola.nome?.toLowerCase().includes(termo) ||
            escola.endereco?.toLowerCase().includes(termo) ||
            escola.modalidades?.toLowerCase().includes(termo)
        );
    });

    const destacarTexto = (texto: string, termo: string) => {
        if (!termo.trim()) return texto;

        const regex = new RegExp(`(${termo})`, 'gi');
        const partes = texto.split(regex);

        return partes.map((parte, index) =>
            regex.test(parte) ? (
                <Box component="span" key={index} sx={{ bgcolor: 'yellow', fontWeight: 'bold' }}>
                    {parte}
                </Box>
            ) : parte
        );
    };



    const toggleEscolaSelecao = (escolaId: number) => {
        const novasSelecoes = new Set(escolasSelecionadas);
        if (novasSelecoes.has(escolaId)) {
            novasSelecoes.delete(escolaId);
        } else {
            novasSelecoes.add(escolaId);
        }
        setEscolasSelecionadas(novasSelecoes);
    };

    const adicionarEscolaRota = (escola: any) => {
        if (!rotaSelecionada) return;

        // Adicionar escola à lista da rota com a próxima ordem disponível
        const novaOrdem = escolasRota.length + 1;
        const novaEscolaRota: RotaEscola = {
            id: Date.now(), // ID temporário
            rota_id: rotaSelecionada.id,
            escola_id: escola.id,
            ordem: novaOrdem,
            created_at: new Date().toISOString(),
            escola_nome: escola.nome,
            escola_endereco: escola.endereco
        };

        setEscolasRota(prev => [...prev, novaEscolaRota]);
        setEscolasSelecionadas(prev => new Set([...prev, escola.id]));

        // Remover escola da lista de disponíveis
        setEscolasDisponiveis(prev => prev.filter(e => e.id !== escola.id));
    };

    const removerEscolaRota = (escola: any) => {
        setEscolasRota(prev => {
            const novasEscolas = prev.filter(er => er.escola_id !== escola.id);
            // Reordenar as posições
            return novasEscolas.map((er, index) => ({
                ...er,
                ordem: index + 1
            }));
        });
        setEscolasSelecionadas(prev => {
            const novas = new Set(prev);
            novas.delete(escola.id);
            return novas;
        });

        // Adicionar escola de volta às disponíveis
        const escolaCompleta = escolas.find(e => e.id === escola.id);
        if (escolaCompleta) {
            setEscolasDisponiveis(prev => [...prev, escolaCompleta].sort((a, b) => a.nome.localeCompare(b.nome)));
        }
    };

    const moverEscola = (index: number, direcao: 'up' | 'down') => {
        const escolasOrdenadas = [...escolasRota].sort((a, b) => a.ordem - b.ordem);

        if (direcao === 'up' && index > 0) {
            // Trocar com o anterior
            [escolasOrdenadas[index], escolasOrdenadas[index - 1]] =
                [escolasOrdenadas[index - 1], escolasOrdenadas[index]];
        } else if (direcao === 'down' && index < escolasOrdenadas.length - 1) {
            // Trocar com o próximo
            [escolasOrdenadas[index], escolasOrdenadas[index + 1]] =
                [escolasOrdenadas[index + 1], escolasOrdenadas[index]];
        }

        // Atualizar as ordens
        const escolasAtualizadas = escolasOrdenadas.map((escola, idx) => ({
            ...escola,
            ordem: idx + 1
        }));

        setEscolasRota(escolasAtualizadas);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setEscolasRota((items) => {
                const escolasOrdenadas = [...items].sort((a, b) => a.ordem - b.ordem);
                const oldIndex = escolasOrdenadas.findIndex(item => item.id === active.id);
                const newIndex = escolasOrdenadas.findIndex(item => item.id === over?.id);

                const reorderedItems = arrayMove(escolasOrdenadas, oldIndex, newIndex);

                // Atualizar as ordens
                return reorderedItems.map((escola, idx) => ({
                    ...escola,
                    ordem: idx + 1
                }));
            });
        }
    };

    const salvarEscolasRotaOrdenadas = async () => {
        if (!rotaSelecionada) return;

        try {
            setSalvando(true);

            // Primeiro, remover todas as escolas da rota
            const escolasAtuaisResponse = await rotaService.listarEscolasRota(rotaSelecionada.id);
            for (const escolaAtual of escolasAtuaisResponse) {
                await rotaService.removerEscolaRota(rotaSelecionada.id, escolaAtual.escola_id);
            }

            // Depois, adicionar as escolas na ordem correta usando o método otimizado
            if (escolasRota.length > 0) {
                const escolasOrdenadas = [...escolasRota].sort((a, b) => a.ordem - b.ordem);

                // Primeiro adicionar todas as escolas
                for (const escolaRota of escolasOrdenadas) {
                    await rotaService.adicionarEscolaRota(
                        rotaSelecionada.id,
                        escolaRota.escola_id,
                        escolaRota.ordem
                    );
                }

                // Depois atualizar a ordem usando o método otimizado
                const escolasOrdem = escolasOrdenadas.map(escola => ({
                    escolaId: escola.escola_id,
                    ordem: escola.ordem
                }));

                await rotaService.atualizarOrdemEscolas(rotaSelecionada.id, escolasOrdem);
            }

            await loadRotas();
            setSuccessMessage('Escolas da rota atualizadas com sucesso!');
            fecharModalEscolas();

        } catch (err) {
            console.error('Erro ao salvar escolas da rota:', err);
            setError('Erro ao salvar escolas da rota');
        } finally {
            setSalvando(false);
        }
    };

    const FiltersContent = () => (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: '16px', p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
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
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth>
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
                    <FormControl fullWidth>
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
                <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>
                    Gestão de Rotas de Entrega
                </Typography>

                <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
                        <TextField
                            placeholder="Buscar rotas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
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
                                startIcon={<AddIcon />}
                                onClick={() => abrirModalRota()}
                                variant="contained"
                                color="success"
                            >
                                Nova Rota
                            </Button>
                            <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)}>
                                <MoreVert />
                            </IconButton>
                        </Box>
                    </Box>
                    <Collapse in={filtersExpanded} timeout={400}>
                        <Box sx={{ mb: 3 }}>
                            <FiltersContent />
                        </Box>
                    </Collapse>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
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
                                        <TableCell align="center">Cor</TableCell>
                                        <TableCell align="center">Total de Escolas</TableCell>
                                        <TableCell>Descrição</TableCell>
                                        <TableCell align="center">Status</TableCell>
                                        <TableCell align="center">Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedRotas.map((rota) => (
                                        <TableRow key={rota.id} hover>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar sx={{ bgcolor: rota.cor, width: 32, height: 32 }}>
                                                        <RouteIcon fontSize="small" />
                                                    </Avatar>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {rota.nome}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box
                                                    sx={{
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: '50%',
                                                        bgcolor: rota.cor,
                                                        mx: 'auto',
                                                        border: '2px solid #fff',
                                                        boxShadow: 1
                                                    }}
                                                />
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
                                                <Chip
                                                    label={rota.ativo ? 'Ativa' : 'Inativa'}
                                                    size="small"
                                                    color={rota.ativo ? 'success' : 'error'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                    <Tooltip title="Gerenciar Escolas">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => abrirModalEscolas(rota)}
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
                                <Typography variant="subtitle2" gutterBottom>
                                    Cor da Rota
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={1}>
                                    {coresPredefinidas.map((cor) => (
                                        <Box
                                            key={cor}
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                backgroundColor: cor,
                                                borderRadius: '50%',
                                                cursor: 'pointer',
                                                border: formRota.cor === cor ? '3px solid #000' : '2px solid #ddd',
                                                '&:hover': {
                                                    transform: 'scale(1.1)',
                                                    transition: 'transform 0.2s'
                                                }
                                            }}
                                            onClick={() => setFormRota(prev => ({ ...prev, cor }))}
                                        />
                                    ))}
                                </Box>
                                <TextField
                                    label="Cor personalizada"
                                    type="color"
                                    value={formRota.cor}
                                    onChange={(e) => setFormRota(prev => ({ ...prev, cor: e.target.value }))}
                                    sx={{ mt: 2, width: 100 }}
                                />
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

                {/* Modal de Escolas */}
                <Dialog open={modalEscolasAberto} onClose={fecharModalEscolas} maxWidth="lg" fullWidth>
                    <DialogTitle>
                        <Box display="flex" alignItems="center" gap={2}>
                            {rotaSelecionada && (
                                <>
                                    <Avatar sx={{ bgcolor: rotaSelecionada.cor }}>
                                        <RouteIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6">
                                            Gerenciar Escolas - {rotaSelecionada.nome}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Arraste escolas da lista disponível para a rota e organize a ordem de visita
                                        </Typography>
                                    </Box>
                                </>
                            )}
                        </Box>
                    </DialogTitle>

                    <DialogContent sx={{ height: '70vh' }}>
                        <Grid container spacing={2} sx={{ height: '100%' }}>
                            {/* Card de Escolas Disponíveis */}
                            <Grid item xs={12} md={6}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <CardContent sx={{ pb: 1 }}>
                                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                                            <SchoolIcon color="action" />
                                            <Typography variant="h6">
                                                Escolas Disponíveis
                                            </Typography>
                                            <Chip
                                                label={escolasDisponiveisFiltradas.length}
                                                size="small"
                                                color="default"
                                            />
                                            {filtroEscolas && (
                                                <Chip
                                                    label={`de ${escolasDisponiveis.length}`}
                                                    size="small"
                                                    variant="outlined"
                                                    color="primary"
                                                />
                                            )}
                                        </Box>

                                        <TextField
                                            fullWidth
                                            size="small"
                                            inputRef={inputPesquisaRef}
                                            placeholder="Pesquisar escolas... (Ctrl+F)"
                                            value={filtroEscolas}
                                            onChange={(e) => setFiltroEscolas(e.target.value)}
                                            sx={{ mb: 2 }}
                                            InputProps={{
                                                startAdornment: (
                                                    <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                                                        🔍
                                                    </Box>
                                                ),
                                                endAdornment: filtroEscolas && (
                                                    <Tooltip title="Limpar pesquisa">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setFiltroEscolas('')}
                                                            sx={{ p: 0.5 }}
                                                        >
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )
                                            }}
                                        />

                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="body2" color="text.secondary">
                                                {filtroEscolas
                                                    ? `${escolasDisponiveisFiltradas.length} escola(s) encontrada(s)`
                                                    : 'Clique nas escolas para adicionar à rota'
                                                }
                                            </Typography>
                                            {filtroEscolas && escolasDisponiveisFiltradas.length > 0 && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => {
                                                        escolasDisponiveisFiltradas.forEach(escola => {
                                                            adicionarEscolaRota(escola);
                                                        });
                                                        setFiltroEscolas('');
                                                    }}
                                                    sx={{ fontSize: '0.75rem' }}
                                                >
                                                    Adicionar Todas ({escolasDisponiveisFiltradas.length})
                                                </Button>
                                            )}
                                        </Box>
                                    </CardContent>

                                    <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, pb: 2 }}>
                                        {escolasDisponiveisFiltradas
                                            .map((escola) => (
                                                <Card
                                                    key={escola.id}
                                                    sx={{
                                                        mb: 1,
                                                        cursor: 'pointer',
                                                        border: '2px solid transparent',
                                                        position: 'relative',
                                                        '&:hover': {
                                                            borderColor: 'primary.main',
                                                            bgcolor: 'primary.50',
                                                            transform: 'translateX(4px)',
                                                            transition: 'all 0.2s',
                                                            '& .add-icon': {
                                                                opacity: 1
                                                            }
                                                        }
                                                    }}
                                                    onClick={() => adicionarEscolaRota(escola)}
                                                >
                                                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                        <Box display="flex" alignItems="center" gap={2}>
                                                            <Box flexGrow={1}>
                                                                <Typography variant="subtitle2" fontWeight="bold">
                                                                    {destacarTexto(escola.nome, filtroEscolas)}
                                                                </Typography>
                                                                {escola.endereco && (
                                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                        📍 {destacarTexto(escola.endereco, filtroEscolas)}
                                                                    </Typography>
                                                                )}
                                                                {escola.modalidades && (
                                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                        🎓 {destacarTexto(escola.modalidades, filtroEscolas)}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                            <AddIcon
                                                                className="add-icon"
                                                                sx={{
                                                                    opacity: 0.3,
                                                                    transition: 'opacity 0.2s',
                                                                    color: 'primary.main'
                                                                }}
                                                            />
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            ))}

                                        {escolasDisponiveisFiltradas.length === 0 && (
                                            <Box textAlign="center" py={4}>
                                                {filtroEscolas ? (
                                                    <>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Nenhuma escola encontrada para "{filtroEscolas}"
                                                        </Typography>
                                                        <Button
                                                            size="small"
                                                            onClick={() => setFiltroEscolas('')}
                                                            sx={{ mt: 1 }}
                                                        >
                                                            Limpar filtro
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Todas as escolas já estão associadas a alguma rota
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                            Uma escola não pode estar em duas rotas ao mesmo tempo
                                                        </Typography>
                                                    </>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                </Card>
                            </Grid>

                            {/* Card de Escolas na Rota */}
                            <Grid item xs={12} md={6}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'primary.50' }}>
                                    <CardContent sx={{ pb: 1 }}>
                                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                                            <RouteIcon color="primary" />
                                            <Typography variant="h6" color="primary">
                                                Escolas na Rota
                                            </Typography>
                                            <Chip
                                                label={escolasRota.length}
                                                size="small"
                                                color="primary"
                                            />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Ordem de visita - Arraste e solte para reordenar
                                        </Typography>
                                        <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                                            💡 Dica: Clique e arraste o ícone ⋮⋮ para reordenar as escolas na rota
                                        </Alert>
                                    </CardContent>

                                    <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, pb: 2 }}>
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <SortableContext
                                                items={escolasRota.sort((a, b) => a.ordem - b.ordem).map(e => e.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {escolasRota
                                                    .sort((a, b) => a.ordem - b.ordem)
                                                    .map((escolaRota, index) => (
                                                        <SortableEscolaItem
                                                            key={escolaRota.id}
                                                            escola={escolaRota}
                                                            index={index}
                                                            onRemove={removerEscolaRota}
                                                        />
                                                    ))}
                                            </SortableContext>
                                        </DndContext>

                                        {escolasRota.length === 0 && (
                                            <Box textAlign="center" py={4}>
                                                <RouteIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    Nenhuma escola na rota ainda
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Clique nas escolas disponíveis para adicionar
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Card>
                            </Grid>
                        </Grid>
                    </DialogContent>

                    <DialogActions>
                        <Button onClick={fecharModalEscolas} disabled={salvando}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={salvarEscolasRotaOrdenadas}
                            variant="contained"
                            disabled={salvando}
                            startIcon={salvando ? <CircularProgress size={20} /> : <SaveIcon />}
                        >
                            {salvando ? 'Salvando...' : `Salvar Rota (${escolasRota.length} escolas)`}
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