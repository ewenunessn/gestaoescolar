import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Fab,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    InputAdornment,
    Divider,
    SwipeableDrawer,
    AppBar,
    Toolbar,
    Badge,
    Stack,
    Paper,
    Grid,
    Avatar,
    Slide,
    Collapse,
    ButtonGroup,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Search,
    Inventory,
    TrendingUp,
    TrendingDown,
    Warning,
    CheckCircle,
    Add,
    Remove,
    Refresh,
    ExitToApp,
    FilterList,
    Close,
    SwapHoriz,
    Assessment,
    History,
    Tune,
    LocalShipping,
    Restaurant,
    Settings,
    KeyboardArrowDown,
    KeyboardArrowUp,
    Sort,
    ArrowUpward,
    ArrowDownward,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import {
    listarEstoqueEscola,
    obterResumoEstoque,
    registrarMovimentacao,
    listarHistoricoEstoque,
    ItemEstoqueEscola,
    ResumoEstoque,
    HistoricoEstoque,
} from '../services/estoqueEscola';
import { obterSessaoGestor, limparSessaoGestor, verificarAcesso } from '../services/gestorEscola';

// Função para formatar números
const formatarQuantidade = (valor: number | string): string => {
    const num = parseFloat(valor.toString());
    if (isNaN(num)) return '0';
    if (num % 1 === 0) return num.toString();
    return num.toFixed(3).replace(/\.?0+$/, '');
};

const EstoqueEscolaMobile = () => {
    const navigate = useNavigate();
    const { escolaId } = useParams();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Estados principais
    const [itensEstoque, setItensEstoque] = useState<ItemEstoqueEscola[]>([]);
    const [resumo, setResumo] = useState<ResumoEstoque | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estados de filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [filterExpanded, setFilterExpanded] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'status'>('status');

    // Estados do modal de movimentação
    const [movimentacaoModalOpen, setMovimentacaoModalOpen] = useState(false);
    const [itemMovimentacao, setItemMovimentacao] = useState<ItemEstoqueEscola | null>(null);
    const [tipoMovimentacao, setTipoMovimentacao] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
    const [quantidadeMovimentacao, setQuantidadeMovimentacao] = useState('');
    const [motivoMovimentacao, setMotivoMovimentacao] = useState('');

    // Estados do histórico
    const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
    const [historico, setHistorico] = useState<HistoricoEstoque[]>([]);
    const [produtoHistoricoNome, setProdutoHistoricoNome] = useState<string>('');

    // Verificar autenticação
    useEffect(() => {
        const verificarAutenticacao = async () => {
            const sessao = obterSessaoGestor();

            if (!sessao) {
                navigate('/login-gestor');
                return;
            }

            if (escolaId && sessao.escola.id.toString() !== escolaId) {
                navigate('/login-gestor');
                return;
            }

            try {
                const acessoValido = await verificarAcesso(sessao.escola.id, sessao.codigo_acesso);
                if (!acessoValido) {
                    limparSessaoGestor();
                    navigate('/login-gestor');
                    return;
                }
            } catch (error) {
                console.error('Erro ao verificar acesso:', error);
                limparSessaoGestor();
                navigate('/login-gestor');
                return;
            }
        };

        verificarAutenticacao();
    }, [escolaId, navigate]);

    // Carregar dados
    const loadData = async () => {
        if (!escolaId) return;

        try {
            setLoading(true);
            setError(null);

            const [itensData, resumoData] = await Promise.all([
                listarEstoqueEscola(parseInt(escolaId)),
                obterResumoEstoque(parseInt(escolaId))
            ]);

            setItensEstoque(itensData);
            setResumo(resumoData);
        } catch (err: any) {
            console.error('Erro ao carregar dados:', err);
            setError('Erro ao carregar estoque. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [escolaId]);

    // Filtrar itens
    const filteredItens = useMemo(() => {
        const filtered = itensEstoque.filter(item => {
            const matchesSearch = item.produto_nome.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = !selectedStatus ||
                (selectedStatus === 'baixo' && item.status_estoque === 'baixo') ||
                (selectedStatus === 'normal' && item.status_estoque === 'normal') ||
                (selectedStatus === 'alto' && item.status_estoque === 'alto') ||
                (selectedStatus === 'sem_estoque' && item.status_estoque === 'sem_estoque');

            return matchesSearch && matchesStatus;
        });

        // Aplicar ordenação
        return filtered.sort((a, b) => {
            if (sortOrder === 'status') {
                // Definir prioridade dos status (menor número = maior prioridade)
                const getStatusPriority = (status: string) => {
                    switch (status) {
                        case 'sem_estoque': return 0;
                        case 'baixo': return 1;
                        case 'normal': return 2;
                        case 'alto': return 3;
                        default: return 4;
                    }
                };

                const priorityA = getStatusPriority(a.status_estoque);
                const priorityB = getStatusPriority(b.status_estoque);

                // Se as prioridades são diferentes, ordenar por prioridade
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                // Se as prioridades são iguais, ordenar alfabeticamente
                return a.produto_nome.localeCompare(b.produto_nome);
            } else if (sortOrder === 'asc') {
                // Ordenação crescente por nome
                return a.produto_nome.localeCompare(b.produto_nome);
            } else {
                // Ordenação decrescente por nome
                return b.produto_nome.localeCompare(a.produto_nome);
            }
        });
    }, [itensEstoque, searchTerm, selectedStatus, sortOrder]);

    // Funções de movimentação
    const abrirMovimentacao = (item: ItemEstoqueEscola) => {
        setItemMovimentacao(item);
        setTipoMovimentacao('entrada');
        setQuantidadeMovimentacao('');
        setMotivoMovimentacao('');
        setMovimentacaoModalOpen(true);
    };

    // Função para ver histórico
    const verHistorico = async (item: ItemEstoqueEscola) => {
        if (!escolaId) return;

        try {
            setLoading(true);
            const historicoData = await listarHistoricoEstoque(parseInt(escolaId), item.produto_id);
            setHistorico(historicoData);
            setProdutoHistoricoNome(item.produto_nome);
            setHistoricoModalOpen(true);
        } catch (err: any) {
            console.error('Erro ao carregar histórico:', err);
            setError('Erro ao carregar histórico.');
        } finally {
            setLoading(false);
        }
    };

    const salvarMovimentacao = async () => {
        if (!itemMovimentacao || !escolaId) return;

        try {
            const quantidade = parseFloat(quantidadeMovimentacao) || 0;
            if (quantidade < 0) {
                setError('Quantidade deve ser maior ou igual a zero.');
                return;
            }

            await registrarMovimentacao(parseInt(escolaId), {
                produto_id: itemMovimentacao.produto_id,
                tipo_movimentacao: tipoMovimentacao,
                quantidade,
                motivo: motivoMovimentacao || `${tipoMovimentacao} via mobile`,
                documento_referencia: '',
                usuario_id: 1
            });

            setSuccessMessage(`${tipoMovimentacao === 'entrada' ? 'Entrada' : tipoMovimentacao === 'saida' ? 'Saída' : 'Ajuste'} registrada com sucesso!`);
            setMovimentacaoModalOpen(false);
            await loadData();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Erro ao registrar movimentação:', err);
            setError('Erro ao registrar movimentação.');
        }
    };

    const handleLogout = () => {
        limparSessaoGestor();
        navigate('/login-gestor');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'sem_estoque': return 'error';
            case 'baixo': return 'warning';
            case 'alto': return 'info';
            default: return 'success';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sem_estoque': return <Warning />;
            case 'baixo': return <TrendingDown />;
            case 'alto': return <TrendingUp />;
            default: return <CheckCircle />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'sem_estoque': return 'Sem Estoque';
            case 'baixo': return 'Baixo';
            case 'alto': return 'Alto';
            default: return 'Normal';
        }
    };

    if (!escolaId) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">ID da escola não fornecido</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 10 }}>
            {/* Header moderno */}
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    bgcolor: 'white',
                    color: 'text.primary',
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Toolbar sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                            <Inventory />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary' }}>
                                Estoque
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Gestão inteligente
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                            onClick={() => setFilterExpanded(!filterExpanded)}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                        >
                            <Badge badgeContent={selectedStatus || sortOrder !== 'status' ? 1 : 0} color="error">
                                {filterExpanded ? <KeyboardArrowUp /> : <FilterList />}
                            </Badge>
                        </IconButton>
                        <IconButton
                            onClick={() => navigate(`/estoque-escola/${escolaId}`)}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                        >
                            <Assessment />
                        </IconButton>
                        <IconButton
                            onClick={handleLogout}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                        >
                            <ExitToApp />
                        </IconButton>
                    </Box>
                </Toolbar>

                {/* Barra de busca integrada */}
                <Box sx={{ px: 2, pb: 2 }}>
                    <TextField
                        fullWidth
                        placeholder="Buscar produtos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search sx={{ color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#f1f5f9',
                                borderRadius: 6,
                                border: 'none',
                                '& fieldset': { border: 'none' },
                                '&:hover fieldset': { border: 'none' },
                                '&.Mui-focused': {
                                    bgcolor: 'white',
                                    boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
                                    '& fieldset': {
                                        border: '2px solid',
                                        borderColor: 'primary.main'
                                    }
                                }
                            }
                        }}
                    />
                </Box>

                {/* Filtros expansíveis */}
                <Collapse in={filterExpanded}>
                    <Box sx={{ px: 2, pb: 2, bgcolor: '#f8fafc', borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 2, mt: 2 }}>
                            Filtrar por status
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            {[
                                { value: '', label: 'Todos' },
                                { value: 'sem_estoque', label: 'Sem Estoque' },
                                { value: 'baixo', label: 'Baixo' },
                                { value: 'normal', label: 'Normal' },
                                { value: 'alto', label: 'Alto' },
                            ].map((status) => (
                                <Chip
                                    key={status.value}
                                    label={status.label}
                                    onClick={() => setSelectedStatus(status.value)}
                                    variant={selectedStatus === status.value ? 'filled' : 'outlined'}
                                    color={selectedStatus === status.value ? 'primary' : 'default'}
                                    sx={{
                                        borderRadius: 6,
                                        fontWeight: 600,
                                        '&:hover': {
                                            transform: 'translateY(-1px)',
                                            boxShadow: 2
                                        }
                                    }}
                                />
                            ))}
                        </Stack>

                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                            Ordenação
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            <Chip
                                icon={<Sort />}
                                label="Por Status"
                                onClick={() => setSortOrder('status')}
                                variant={sortOrder === 'status' ? 'filled' : 'outlined'}
                                color={sortOrder === 'status' ? 'primary' : 'default'}
                                sx={{
                                    borderRadius: 6,
                                    fontWeight: 600,
                                    '&:hover': {
                                        transform: 'translateY(-1px)',
                                        boxShadow: 2
                                    }
                                }}
                            />
                            <Chip
                                icon={<ArrowUpward />}
                                label="A-Z"
                                onClick={() => setSortOrder('asc')}
                                variant={sortOrder === 'asc' ? 'filled' : 'outlined'}
                                color={sortOrder === 'asc' ? 'primary' : 'default'}
                                sx={{
                                    borderRadius: 6,
                                    fontWeight: 600,
                                    '&:hover': {
                                        transform: 'translateY(-1px)',
                                        boxShadow: 2
                                    }
                                }}
                            />
                            <Chip
                                icon={<ArrowDownward />}
                                label="Z-A"
                                onClick={() => setSortOrder('desc')}
                                variant={sortOrder === 'desc' ? 'filled' : 'outlined'}
                                color={sortOrder === 'desc' ? 'primary' : 'default'}
                                sx={{
                                    borderRadius: 6,
                                    fontWeight: 600,
                                    '&:hover': {
                                        transform: 'translateY(-1px)',
                                        boxShadow: 2
                                    }
                                }}
                            />
                        </Stack>

                        <Button
                            size="small"
                            onClick={() => {
                                setSelectedStatus('');
                                setSearchTerm('');
                                setSortOrder('status');
                            }}
                            sx={{
                                mt: 1,
                                borderRadius: 6,
                                textTransform: 'none',
                                fontWeight: 600
                            }}
                        >
                            Limpar filtros
                        </Button>
                    </Box>
                </Collapse>
            </AppBar>

            {/* Mensagens */}
            <Slide direction="down" in={!!successMessage} mountOnEnter unmountOnExit>
                <Alert
                    severity="success"
                    sx={{
                        m: 2,
                        borderRadius: 3,
                        fontWeight: 600
                    }}
                    onClose={() => setSuccessMessage(null)}
                >
                    {successMessage}
                </Alert>
            </Slide>

            {error && (
                <Alert
                    severity="error"
                    sx={{
                        m: 2,
                        borderRadius: 3,
                        fontWeight: 600
                    }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {/* Cards de resumo modernos */}
            {resumo && (
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={1.5}>
                        <Grid item xs={4}>
                            <Card
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    bgcolor: 'white',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    textAlign: 'center',
                                    p: 1.5,
                                    minHeight: 70,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    '&:hover': {
                                        boxShadow: 4,
                                        transform: 'translateY(-2px)'
                                    },
                                    transition: 'all 0.2s ease-in-out'
                                }}
                            >
                                <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5, fontSize: '1.5rem' }}>
                                    {resumo.total_produtos}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                                    Total
                                </Typography>
                            </Card>
                        </Grid>
                        <Grid item xs={4}>
                            <Card
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    bgcolor: 'white',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    textAlign: 'center',
                                    p: 1.5,
                                    minHeight: 70,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    '&:hover': {
                                        boxShadow: 4,
                                        transform: 'translateY(-2px)'
                                    },
                                    transition: 'all 0.2s ease-in-out'
                                }}
                            >
                                <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.main', mb: 0.5, fontSize: '1.5rem' }}>
                                    {resumo.produtos_com_estoque}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                                    Estoque
                                </Typography>
                            </Card>
                        </Grid>
                        <Grid item xs={4}>
                            <Card
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    bgcolor: 'white',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    textAlign: 'center',
                                    p: 1.5,
                                    minHeight: 70,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    '&:hover': {
                                        boxShadow: 4,
                                        transform: 'translateY(-2px)'
                                    },
                                    transition: 'all 0.2s ease-in-out'
                                }}
                            >
                                <Typography variant="h5" sx={{ fontWeight: 800, color: 'error.main', mb: 0.5, fontSize: '1.5rem' }}>
                                    {resumo.produtos_sem_estoque}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                                    Sem Estoque
                                </Typography>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* Loading */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress size={40} thickness={4} />
                </Box>
            )}

            {/* Lista de produtos moderna */}
            {!loading && (
                <Box sx={{ px: 2 }}>
                    <Stack spacing={2}>
                        {filteredItens.map((item) => (
                            <Card
                                key={item.id}
                                elevation={0}
                                sx={{
                                    borderRadius: 4,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'white',
                                    '&:hover': {
                                        boxShadow: 6,
                                        transform: 'translateY(-1px)'
                                    },
                                    transition: 'all 0.2s ease-in-out',
                                    borderLeft: `4px solid`,
                                    borderLeftColor:
                                        item.status_estoque === 'sem_estoque' ? 'error.main' :
                                            item.status_estoque === 'baixo' ? 'warning.main' :
                                                item.status_estoque === 'alto' ? 'info.main' : 'success.main'
                                }}
                            >
                                <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: '1rem',
                                                    color: 'text.primary',
                                                    mb: 0.5,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}
                                            >
                                                {item.produto_nome}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                                <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.4rem' }}>
                                                    {formatarQuantidade(item.quantidade_atual)}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                    {item.unidade_medida}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Chip
                                            icon={getStatusIcon(item.status_estoque)}
                                            label={getStatusLabel(item.status_estoque)}
                                            color={getStatusColor(item.status_estoque) as any}
                                            size="small"
                                            sx={{
                                                fontWeight: 600,
                                                borderRadius: 2,
                                                fontSize: '0.7rem',
                                                '& .MuiChip-icon': {
                                                    fontSize: '0.9rem'
                                                }
                                            }}
                                        />
                                    </Box>

                                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block', fontSize: '0.7rem' }}>
                                        Atualizado em {item.data_ultima_atualizacao 
                                    ? new Date(item.data_ultima_atualizacao).toLocaleDateString('pt-BR')
                                    : 'Nunca'
                                }
                                    </Typography>

                                    <Stack direction="row" spacing={1.5}>
                                        <Button
                                            variant="contained"
                                            startIcon={<SwapHoriz />}
                                            onClick={() => abrirMovimentacao(item)}
                                            sx={{
                                                flex: 1,
                                                py: 1.2,
                                                borderRadius: 2,
                                                fontWeight: 700,
                                                textTransform: 'none',
                                                fontSize: '0.85rem',
                                                boxShadow: 2,
                                                '&:hover': {
                                                    boxShadow: 4,
                                                    transform: 'translateY(-1px)'
                                                }
                                            }}
                                        >
                                            Movimentar
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<History />}
                                            onClick={() => verHistorico(item)}
                                            sx={{
                                                py: 1.2,
                                                px: 2,
                                                borderRadius: 2,
                                                fontWeight: 700,
                                                textTransform: 'none',
                                                fontSize: '0.85rem',
                                                borderWidth: 2,
                                                '&:hover': {
                                                    borderWidth: 2,
                                                    transform: 'translateY(-1px)',
                                                    boxShadow: 2
                                                }
                                            }}
                                        >
                                            {isMobile ? '' : 'Histórico'}
                                        </Button>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}

                        {filteredItens.length === 0 && !loading && (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Avatar sx={{ width: 80, height: 80, bgcolor: 'grey.100', mx: 'auto', mb: 2 }}>
                                    <Inventory sx={{ fontSize: 40, color: 'grey.400' }} />
                                </Avatar>
                                <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                    Nenhum produto encontrado
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                                    Tente ajustar os filtros de busca
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </Box>
            )}

            {/* FAB moderno */}
            <Fab
                color="primary"
                onClick={loadData}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    width: 64,
                    height: 64,
                    boxShadow: 6,
                    '&:hover': {
                        boxShadow: 12,
                        transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease-in-out'
                }}
            >
                <Refresh sx={{ fontSize: 28 }} />
            </Fab>

            {/* Modal de movimentação moderno */}
            <Dialog
                open={movimentacaoModalOpen}
                onClose={() => setMovimentacaoModalOpen(false)}
                fullWidth
                maxWidth="sm"
                fullScreen={isMobile}
                PaperProps={{
                    sx: {
                        borderRadius: isMobile ? 0 : 4,
                        m: isMobile ? 0 : 2
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1, pt: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <SwapHoriz />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                Movimentar Estoque
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                {itemMovimentacao?.produto_nome}
                            </Typography>
                        </Box>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Estoque atual: {formatarQuantidade(itemMovimentacao?.quantidade_atual || 0)} {itemMovimentacao?.unidade_medida}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={4}>
                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 700 }}>
                                Tipo de Movimentação
                            </Typography>
                            <ButtonGroup
                                orientation="vertical"
                                fullWidth
                                sx={{ gap: 1 }}
                            >
                                <Button
                                    startIcon={<LocalShipping />}
                                    onClick={() => setTipoMovimentacao('entrada')}
                                    variant={tipoMovimentacao === 'entrada' ? 'contained' : 'outlined'}
                                    color="success"
                                    sx={{
                                        py: 2,
                                        borderRadius: 3,
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        fontSize: '1rem',
                                        justifyContent: 'flex-start',
                                        '&:hover': {
                                            transform: 'scale(1.02)'
                                        }
                                    }}
                                >
                                    Recebimento (+)
                                </Button>
                                <Button
                                    startIcon={<Restaurant />}
                                    onClick={() => setTipoMovimentacao('saida')}
                                    variant={tipoMovimentacao === 'saida' ? 'contained' : 'outlined'}
                                    color="error"
                                    sx={{
                                        py: 2,
                                        borderRadius: 3,
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        fontSize: '1rem',
                                        justifyContent: 'flex-start',
                                        '&:hover': {
                                            transform: 'scale(1.02)'
                                        }
                                    }}
                                >
                                    Consumo (-)
                                </Button>
                                <Button
                                    startIcon={<Settings />}
                                    onClick={() => setTipoMovimentacao('ajuste')}
                                    variant={tipoMovimentacao === 'ajuste' ? 'contained' : 'outlined'}
                                    color="warning"
                                    sx={{
                                        py: 2,
                                        borderRadius: 3,
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        fontSize: '1rem',
                                        justifyContent: 'flex-start',
                                        '&:hover': {
                                            transform: 'scale(1.02)'
                                        }
                                    }}
                                >
                                    Ajuste (=)
                                </Button>
                            </ButtonGroup>
                        </Box>

                        <TextField
                            fullWidth
                            label={tipoMovimentacao === 'ajuste' ? 'Nova Quantidade Total' : 'Quantidade'}
                            type="number"
                            value={quantidadeMovimentacao}
                            onChange={(e) => setQuantidadeMovimentacao(e.target.value)}
                            placeholder={
                                tipoMovimentacao === 'entrada' ? 'Ex: 10 (quantidade a adicionar)' :
                                tipoMovimentacao === 'saida' ? 'Ex: 5 (quantidade a remover)' :
                                'Ex: 15 (nova quantidade total)'
                            }
                            InputProps={{
                                endAdornment: <InputAdornment position="end">{itemMovimentacao?.unidade_medida}</InputAdornment>,
                                sx: { fontSize: '1.2rem' }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    '&.Mui-focused': {
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderWidth: 2,
                                        }
                                    }
                                }
                            }}
                            helperText={
                                tipoMovimentacao === 'ajuste'
                                    ? `Estoque atual: ${formatarQuantidade(itemMovimentacao?.quantidade_atual || 0)} ${itemMovimentacao?.unidade_medida}`
                                    : undefined
                            }
                            autoFocus
                        />

                        <TextField
                            fullWidth
                            label="Motivo (opcional)"
                            value={motivoMovimentacao}
                            onChange={(e) => setMotivoMovimentacao(e.target.value)}
                            multiline
                            rows={3}
                            placeholder={
                                tipoMovimentacao === 'entrada' ? 'Ex: Entrega fornecedor, Doação...' :
                                    tipoMovimentacao === 'saida' ? 'Ex: Merenda escolar, Perda...' :
                                        'Ex: Correção de inventário, Contagem...'
                            }
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3
                                }
                            }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 2 }}>
                    <Button
                        onClick={() => setMovimentacaoModalOpen(false)}
                        sx={{
                            borderRadius: 3,
                            px: 4,
                            py: 1.5,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '1rem'
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={salvarMovimentacao}
                        variant="contained"
                        color={
                            tipoMovimentacao === 'entrada' ? 'success' :
                                tipoMovimentacao === 'saida' ? 'error' : 'warning'
                        }
                        startIcon={
                            tipoMovimentacao === 'entrada' ? <LocalShipping /> :
                                tipoMovimentacao === 'saida' ? <Restaurant /> : <Settings />
                        }
                        sx={{
                            borderRadius: 3,
                            px: 4,
                            py: 1.5,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '1rem',
                            boxShadow: 3,
                            '&:hover': {
                                boxShadow: 6
                            }
                        }}
                    >
                        {tipoMovimentacao === 'entrada' ? 'Registrar Recebimento' :
                            tipoMovimentacao === 'saida' ? 'Registrar Consumo' : 'Ajustar Estoque'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de histórico moderno */}
            <Dialog
                open={historicoModalOpen}
                onClose={() => setHistoricoModalOpen(false)}
                fullWidth
                maxWidth="sm"
                fullScreen={isMobile}
                PaperProps={{
                    sx: {
                        borderRadius: isMobile ? 0 : 4,
                        m: isMobile ? 0 : 2,
                        maxHeight: '90vh'
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1, pt: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <History />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                Histórico
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                {produtoHistoricoNome}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {historico.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <Avatar sx={{ width: 80, height: 80, bgcolor: 'grey.100', mx: 'auto', mb: 2 }}>
                                <History sx={{ fontSize: 40, color: 'grey.400' }} />
                            </Avatar>
                            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                Nenhuma movimentação encontrada
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                                Este produto ainda não possui histórico
                            </Typography>
                        </Box>
                    ) : (
                        <Stack spacing={2}>
                            {historico.map((mov, index) => (
                                <Card key={index} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Chip
                                                icon={
                                                    mov.tipo_movimentacao === 'entrada' ? <Add /> :
                                                        mov.tipo_movimentacao === 'saida' ? <Remove /> : <Settings />
                                                }
                                                label={
                                                    mov.tipo_movimentacao === 'entrada' ? 'Entrada' :
                                                        mov.tipo_movimentacao === 'saida' ? 'Saída' : 'Ajuste'
                                                }
                                                color={
                                                    mov.tipo_movimentacao === 'entrada' ? 'success' :
                                                        mov.tipo_movimentacao === 'saida' ? 'error' : 'warning'
                                                }
                                                sx={{
                                                    fontWeight: 700,
                                                    borderRadius: 2
                                                }}
                                            />
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                {new Date(mov.data_movimentacao).toLocaleDateString('pt-BR')}
                                            </Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                                {mov.tipo_movimentacao === 'entrada' ? '+' :
                                                    mov.tipo_movimentacao === 'saida' ? '-' : '='} {formatarQuantidade(mov.quantidade_movimentada)} {mov.unidade_medida}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                {formatarQuantidade(mov.quantidade_anterior || 0)} → {formatarQuantidade(mov.quantidade_posterior || 0)}
                                            </Typography>
                                        </Box>

                                        {mov.motivo && (
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 1 }}>
                                                {mov.motivo}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 2 }}>
                    <Button
                        onClick={() => setHistoricoModalOpen(false)}
                        variant="contained"
                        fullWidth
                        sx={{
                            borderRadius: 3,
                            py: 1.5,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '1rem'
                        }}
                    >
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EstoqueEscolaMobile;