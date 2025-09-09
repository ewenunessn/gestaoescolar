import React, { useState, useEffect, useMemo } from 'react';

// Função para formatar números sem zeros desnecessários
const formatarQuantidade = (valor: number | string): string => {
    const num = parseFloat(valor.toString());
    if (isNaN(num)) return '0';

    // Se for número inteiro, não mostrar decimais
    if (num % 1 === 0) {
        return num.toString();
    }

    // Se tiver decimais, mostrar apenas os necessários (máximo 3)
    return num.toFixed(3).replace(/\.?0+$/, '');
};
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
    Tooltip,
    Grid,
    LinearProgress,
    Menu,
} from '@mui/material';
import {
    Search,
    Inventory,
    TrendingUp,
    TrendingDown,
    Warning,
    CheckCircle,
    Edit,
    History,
    Refresh,
    Clear,
    MoreVert,
    Upload,
    Download,
    School,
    Assessment,
    Save,
    Cancel,
    SwapHoriz,
    Add as AddIcon,
    Remove,
    Tune,
    Logout,
    ExitToApp,
    RestartAlt,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import {
    listarEstoqueEscola,
    obterResumoEstoque,
    listarHistoricoEstoque,
    atualizarQuantidadeItem,
    atualizarLoteQuantidades,
    inicializarEstoqueEscola,
    registrarMovimentacao,
    ItemEstoqueEscola,
    ResumoEstoque,
    HistoricoEstoque,
} from '../services/estoqueEscola';
import { obterSessaoGestor, limparSessaoGestor, verificarAcesso } from '../services/gestorEscola';
import * as XLSX from 'xlsx';

const EstoqueEscolaPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const { escolaId } = useParams<{ escolaId: string }>();

    // Verificar autenticação no carregamento
    useEffect(() => {
        const verificarAutenticacao = async () => {
            const sessao = obterSessaoGestor();
            
            if (!sessao) {
                navigate('/login-gestor');
                return;
            }

            // Verificar se a escola da sessão corresponde à URL
            if (escolaId && sessao.escola.id.toString() !== escolaId) {
                navigate('/login-gestor');
                return;
            }

            // Verificar se o código ainda é válido
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

    // Estados principais
    const [itensEstoque, setItensEstoque] = useState<ItemEstoqueEscola[]>([]);
    const [resumo, setResumo] = useState<ResumoEstoque | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estados de filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [sortBy, setSortBy] = useState('produto_nome');

    // Estados do menu de ações
    const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

    // Estados do modal de edição
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [itemEditando, setItemEditando] = useState<ItemEstoqueEscola | null>(null);
    const [formEdit, setFormEdit] = useState({
        quantidade_atual: 0,
        quantidade_minima: 0,
        quantidade_maxima: 0,
        observacoes: '',
    });

    // Estados do histórico
    const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
    const [historico, setHistorico] = useState<HistoricoEstoque[]>([]);
    const [produtoHistorico, setProdutoHistorico] = useState<number | null>(null);

    // Estados para edição em lote
    const [modoEdicaoLote, setModoEdicaoLote] = useState(false);
    const [itensEditandoLote, setItensEditandoLote] = useState<{ [key: number]: { quantidade_atual: number, observacoes: string } }>({});

    // Estados do modal de movimentação
    const [movimentacaoModalOpen, setMovimentacaoModalOpen] = useState(false);
    const [itemMovimentacao, setItemMovimentacao] = useState<ItemEstoqueEscola | null>(null);
    const [salvandoMovimentacao, setSalvandoMovimentacao] = useState(false);
    const [formMovimentacao, setFormMovimentacao] = useState({
        tipo_movimentacao: 'entrada' as 'entrada' | 'saida' | 'ajuste',
        quantidade: 0,
        motivo: '',
        documento_referencia: '',
    });

    // Estados do modal de reset
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [motivoReset, setMotivoReset] = useState('');

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
            console.error('❌ ERRO LOADDATA:', err);
            console.error('❌ ERRO DETALHES:', {
                message: err.message,
                stack: err.stack,
                config: err.config?.url,
                response: err.response?.data
            });
            
            const timestamp = new Date().toLocaleString();
            const errorMsg = `ERRO (${timestamp}): ${err.message || 'Desconhecido'}\n\nURL: ${window.location.href}\nEscola: ${escolaId}\n\nLimpe o cache e tente novamente.`;
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [escolaId]);

    // Extrair dados únicos para filtros
    // const categorias = [...new Set(itensEstoque.map(item => item.categoria).filter(Boolean))];

    // Filtrar e ordenar itens
    const filteredItens = useMemo(() => {
        return itensEstoque.filter(item => {
            const matchesSearch = item.produto_nome.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = !selectedStatus ||
                (selectedStatus === 'baixo' && item.status_estoque === 'baixo') ||
                (selectedStatus === 'normal' && item.status_estoque === 'normal') ||
                (selectedStatus === 'alto' && item.status_estoque === 'alto') ||
                (selectedStatus === 'sem_estoque' && item.status_estoque === 'sem_estoque') ||
                (selectedStatus === 'com_estoque' && item.quantidade_atual > 0);

            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            switch (sortBy) {
                case 'produto_nome':
                    return a.produto_nome.localeCompare(b.produto_nome);
                case 'quantidade':
                    return b.quantidade_atual - a.quantidade_atual;
                case 'status':
                    const statusOrder = { 'baixo': 0, 'normal': 1, 'alto': 2 };
                    return statusOrder[a.status_estoque] - statusOrder[b.status_estoque];
                default:
                    return a.produto_nome.localeCompare(b.produto_nome);
            }
        });
    }, [itensEstoque, searchTerm, selectedStatus, sortBy]);

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedStatus('');
        setSortBy('produto_nome');
    };

    // Funções de edição
    const abrirEdicao = (item: ItemEstoqueEscola) => {
        setItemEditando(item);
        setFormEdit({
            quantidade_atual: item.quantidade_atual,
            quantidade_minima: item.quantidade_minima || 0,
            quantidade_maxima: item.quantidade_maxima || 0,
            observacoes: item.observacoes || '',
        });
        setEditModalOpen(true);
    };

    const salvarEdicao = async () => {
        if (!itemEditando) return;

        try {
            await atualizarQuantidadeItem(itemEditando.id, {
                ...formEdit,
                usuario_id: 1 // TODO: pegar do contexto de usuário
            });

            setSuccessMessage('Quantidade atualizada com sucesso!');
            setEditModalOpen(false);
            await loadData();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Erro ao atualizar:', err);
            setError('Erro ao atualizar quantidade. Tente novamente.');
        }
    };

    // Função para ver histórico
    const verHistorico = async (produtoId: number, produtoNome: string) => {
        if (!escolaId) return;

        try {
            setLoading(true);
            const historicoData = await listarHistoricoEstoque(parseInt(escolaId), produtoId);
            setHistorico(historicoData);
            setProdutoHistorico(produtoId);
            setHistoricoModalOpen(true);
        } catch (err: any) {
            console.error('Erro ao carregar histórico:', err);
            setError('Erro ao carregar histórico. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Funções de movimentação
    const abrirMovimentacao = (item: ItemEstoqueEscola) => {
        setItemMovimentacao(item);
        setSalvandoMovimentacao(false);
        setFormMovimentacao({
            tipo_movimentacao: 'entrada',
            quantidade: 0,
            motivo: '',
            documento_referencia: '',
        });
        setMovimentacaoModalOpen(true);
    };

    const salvarMovimentacao = async () => {
        if (!itemMovimentacao || !escolaId || salvandoMovimentacao) return;

        try {
            setSalvandoMovimentacao(true);

            await registrarMovimentacao(parseInt(escolaId), {
                produto_id: itemMovimentacao.produto_id,
                ...formMovimentacao,
                usuario_id: 1 // TODO: pegar do contexto de usuário
            });

            setSuccessMessage(`Movimentação de ${formMovimentacao.tipo_movimentacao} registrada com sucesso!`);
            setMovimentacaoModalOpen(false);
            await loadData();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Erro ao registrar movimentação:', err);

            // Tratar erros específicos
            if (err.response?.status === 409) {
                setError('Operação já foi realizada. Evite clicar múltiplas vezes no botão.');
            } else if (err.response?.status === 400) {
                setError(err.response.data.message || 'Dados inválidos para a movimentação.');
            } else if (err.response?.status === 404) {
                setError('Item não encontrado no estoque da escola.');
            } else {
                setError('Erro ao registrar movimentação. Tente novamente.');
            }
        } finally {
            setSalvandoMovimentacao(false);
        }
    };

    // Função para inicializar estoque
    const handleInicializarEstoque = async () => {
        if (!escolaId) return;

        try {
            setLoading(true);
            const novosItens = await inicializarEstoqueEscola(parseInt(escolaId));
            if (novosItens.length > 0) {
                setSuccessMessage(`Estoque inicializado com ${novosItens.length} novos produtos!`);
            } else {
                setSuccessMessage('Estoque já estava inicializado!');
            }
            await loadData();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Erro ao inicializar:', err);
            setError('Erro ao inicializar estoque. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Funções para edição em lote
    const iniciarEdicaoLote = () => {
        setModoEdicaoLote(true);
        const itensInicial = {};
        filteredItens.forEach(item => {
            itensInicial[item.id] = {
                quantidade_atual: item.quantidade_atual,
                observacoes: item.observacoes || ''
            };
        });
        setItensEditandoLote(itensInicial);
    };

    const cancelarEdicaoLote = () => {
        setModoEdicaoLote(false);
        setItensEditandoLote({});
    };

    const salvarEdicaoLote = async () => {
        if (!escolaId) return;

        try {
            setLoading(true);

            // Preparar itens para atualização (apenas os que foram modificados)
            const itensParaAtualizar = [];

            for (const [itemId, dadosEdicao] of Object.entries(itensEditandoLote)) {
                const itemOriginal = itensEstoque.find(item => item.id === parseInt(itemId));
                if (itemOriginal &&
                    (itemOriginal.quantidade_atual !== dadosEdicao.quantidade_atual ||
                        (itemOriginal.observacoes || '') !== dadosEdicao.observacoes)) {
                    itensParaAtualizar.push({
                        produto_id: itemOriginal.produto_id,
                        quantidade_atual: dadosEdicao.quantidade_atual,
                        observacoes: dadosEdicao.observacoes
                    });
                }
            }

            if (itensParaAtualizar.length > 0) {
                await atualizarLoteQuantidades(parseInt(escolaId), itensParaAtualizar, 1); // TODO: pegar usuário do contexto
                setSuccessMessage(`${itensParaAtualizar.length} itens atualizados com sucesso!`);
                await loadData();
            } else {
                setSuccessMessage('Nenhuma alteração detectada.');
            }

            setModoEdicaoLote(false);
            setItensEditandoLote({});
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Erro ao salvar lote:', err);
            setError('Erro ao salvar alterações. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const atualizarItemLote = (itemId: number, campo: 'quantidade_atual' | 'observacoes', valor: any) => {
        setItensEditandoLote(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [campo]: campo === 'quantidade_atual' ? parseFloat(valor) || 0 : valor
            }
        }));
    };

    // Função para exportar
    const handleExportar = async () => {
        try {
            const dadosExportacao = filteredItens.map(item => ({
                'Produto': item.produto_nome,
                'Quantidade': item.quantidade_atual,
                'Unidade': item.unidade,
                'Quantidade Mínima': item.quantidade_minima || 0,
                'Quantidade Máxima': item.quantidade_maxima || 0,
                'Status': getStatusLabel(item.status_estoque),
                'Última Atualização': new Date(item.data_ultima_atualizacao).toLocaleString('pt-BR'),
                'Observações': item.observacoes || ''
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(dadosExportacao);

            ws['!cols'] = [
                { wch: 30 }, // Produto
                { wch: 12 }, // Quantidade
                { wch: 10 }, // Unidade
                { wch: 15 }, // Quantidade Mínima
                { wch: 15 }, // Quantidade Máxima
                { wch: 10 }, // Status
                { wch: 20 }, // Última Atualização
                { wch: 30 }  // Observações
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Estoque');

            const nomeArquivo = `estoque_escola_${escolaId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, nomeArquivo);

            setSuccessMessage('Estoque exportado com sucesso!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Erro ao exportar:', err);
            setError('Erro ao exportar estoque. Tente novamente.');
        }
    };

    // Função para resetar estoque com backup
    const handleResetarEstoque = () => {
        setResetModalOpen(true);
    };

    const confirmarResetEstoque = async () => {
        if (!escolaId) return;

        try {
            setLoading(true);
            setResetModalOpen(false);
            
            const response = await fetch(`/api/estoque-escola/escola/${escolaId}/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    usuario_id: 1, // TODO: pegar do contexto de usuário
                    motivo: motivoReset || 'Reset manual do estoque'
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao resetar estoque');
            }

            const result = await response.json();
            
            if (result.success) {
                setSuccessMessage(`Estoque resetado com sucesso! Backup criado: ${result.data.backup_nome}`);
                await loadData(); // Recarregar os dados
            } else {
                throw new Error(result.message || 'Erro ao resetar estoque');
            }
            
        } catch (err: any) {
            console.error('Erro ao resetar estoque:', err);
            setError('Erro ao resetar estoque. Tente novamente.');
        } finally {
            setLoading(false);
            setMotivoReset('');
        }
    };

    // Função para fazer logout
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
            case 'sem_estoque': return <Remove />;
            case 'baixo': return <TrendingDown />;
            case 'alto': return <TrendingUp />;
            default: return <CheckCircle />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'sem_estoque': return 'Sem Estoque';
            case 'baixo': return 'Estoque Baixo';
            case 'alto': return 'Estoque Alto';
            case 'normal': return 'Normal';
            default: return status;
        }
    };

    if (!escolaId) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">ID da escola não fornecido</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
            {/* Mensagens */}
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
                {/* Header */}
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1f2937', mb: 1 }}>
                            Estoque da Escola
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {itensEstoque.length > 0 && itensEstoque[0].escola_nome}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {/* Botão Versão Mobile */}
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<Assessment />}
                            onClick={() => navigate(`/estoque-escola-mobile/${escolaId}`)}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 3,
                                py: 1,
                                '&:hover': {
                                    backgroundColor: 'primary.main',
                                    color: 'white',
                                }
                            }}
                        >
                            Versão Mobile
                        </Button>
                        
                        {/* Botão de Sair */}
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<ExitToApp />}
                            onClick={handleLogout}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 3,
                                py: 1,
                                '&:hover': {
                                    backgroundColor: 'error.main',
                                    color: 'white',
                                }
                            }}
                        >
                            Sair do Sistema
                        </Button>
                    </Box>
                </Box>

                {/* Cards de Resumo */}
                {resumo && (
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Inventory sx={{ fontSize: 40, color: '#4f46e5' }} />
                                        <Box>
                                            <Typography variant="h6">{resumo.total_produtos}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Total de Produtos
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <CheckCircle sx={{ fontSize: 40, color: '#059669' }} />
                                        <Box>
                                            <Typography variant="h6">{resumo.produtos_com_estoque}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Com Estoque
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Warning sx={{ fontSize: 40, color: '#ef4444' }} />
                                        <Box>
                                            <Typography variant="h6">{resumo.produtos_sem_estoque}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Sem Estoque
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                    </Grid>
                )}

                {/* Controles */}
                <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', p: 3, mb: 3 }}>
                    {/* Primeira linha: Busca e botões */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <TextField
                            placeholder="Buscar produtos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: '#9ca3af' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            {modoEdicaoLote ? (
                                <>
                                    <Button
                                        startIcon={<Save />}
                                        onClick={salvarEdicaoLote}
                                        sx={{
                                            bgcolor: '#059669',
                                            color: 'white',
                                            textTransform: 'none',
                                            '&:hover': { bgcolor: '#047857' },
                                        }}
                                    >
                                        Salvar Lote
                                    </Button>
                                    <Button
                                        startIcon={<Cancel />}
                                        onClick={cancelarEdicaoLote}
                                        variant="outlined"
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Cancelar
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        startIcon={<Edit />}
                                        onClick={iniciarEdicaoLote}
                                        sx={{
                                            bgcolor: '#8b5cf6',
                                            color: 'white',
                                            textTransform: 'none',
                                            '&:hover': { bgcolor: '#7c3aed' },
                                        }}
                                    >
                                        Editar Lote
                                    </Button>
                                    <Button
                                        startIcon={<Refresh />}
                                        onClick={loadData}
                                        sx={{
                                            bgcolor: '#4f46e5',
                                            color: 'white',
                                            textTransform: 'none',
                                            '&:hover': { bgcolor: '#4338ca' },
                                        }}
                                    >
                                        Atualizar
                                    </Button>
                                </>
                            )}

                            <IconButton
                                onClick={(e) => setActionsMenuAnchor(e.currentTarget)}
                                sx={{
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    color: '#6b7280',
                                    '&:hover': { bgcolor: '#f9fafb', borderColor: '#9ca3af' },
                                }}
                            >
                                <MoreVert />
                            </IconButton>

                            <Button
                                startIcon={<Clear />}
                                onClick={clearFilters}
                                sx={{ color: '#4f46e5', textTransform: 'none' }}
                            >
                                Limpar Filtros
                            </Button>
                        </Box>
                    </Box>

                    {/* Segunda linha: Filtros */}
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                        <FormControl sx={{ minWidth: 150 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                label="Status"
                            >
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="com_estoque">Com Estoque</MenuItem>
                                <MenuItem value="sem_estoque">Sem Estoque</MenuItem>
                                <MenuItem value="baixo">Estoque Baixo</MenuItem>
                                <MenuItem value="alto">Estoque Alto</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl sx={{ minWidth: 150 }}>
                            <InputLabel>Ordenar por</InputLabel>
                            <Select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                label="Ordenar por"
                            >
                                <MenuItem value="produto_nome">Nome</MenuItem>
                                <MenuItem value="quantidade">Quantidade</MenuItem>
                                <MenuItem value="status">Status</MenuItem>
                            </Select>
                        </FormControl>

                        <Typography sx={{ color: '#6b7280', ml: 'auto' }}>
                            {filteredItens.length} de {itensEstoque.length} produtos
                        </Typography>
                    </Box>
                </Card>

                {/* Tabela */}
                {loading ? (
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 6 }}>
                            <CircularProgress size={60} sx={{ mb: 2 }} />
                            <Typography variant="h6" sx={{ color: '#6b7280' }}>
                                Carregando estoque...
                            </Typography>
                        </CardContent>
                    </Card>
                ) : filteredItens.length === 0 ? (
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 6 }}>
                            <Inventory sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
                            <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                                Nenhum produto encontrado
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#9ca3af', mb: 3 }}>
                                Tente ajustar os filtros ou inicializar o estoque
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<Refresh />}
                                onClick={handleInicializarEstoque}
                                disabled={loading}
                                sx={{
                                    backgroundColor: '#4f46e5',
                                    '&:hover': { backgroundColor: '#4338ca' }
                                }}
                            >
                                {loading ? 'Inicializando...' : 'Inicializar Estoque'}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <TableContainer component={Paper} sx={{ borderRadius: '12px' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Produto</TableCell>
                                    <TableCell align="center">Quantidade</TableCell>
                                    <TableCell align="center">Unidade</TableCell>
                                    <TableCell align="center">Mín/Máx</TableCell>
                                    <TableCell align="center">Status</TableCell>
                                    <TableCell align="center">Última Atualização</TableCell>
                                    {modoEdicaoLote && <TableCell>Observações</TableCell>}
                                    <TableCell align="center">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredItens.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {item.produto_nome}
                                            </Typography>
                                            {item.produto_descricao && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.produto_descricao}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            {modoEdicaoLote ? (
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    value={itensEditandoLote[item.id]?.quantidade_atual || 0}
                                                    onChange={(e) => atualizarItemLote(item.id, 'quantidade_atual', e.target.value)}
                                                    sx={{ width: 100 }}
                                                />
                                            ) : (
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {formatarQuantidade(item.quantidade_atual)}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={item.unidade} 
                                                size="small" 
                                                variant="outlined"
                                                sx={{ 
                                                    minWidth: 60,
                                                    bgcolor: '#f3f4f6',
                                                    borderColor: '#d1d5db'
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color="text.secondary">
                                                {item.quantidade_minima || 0} / {item.quantidade_maxima || 0}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                icon={getStatusIcon(item.status_estoque)}
                                                label={getStatusLabel(item.status_estoque)}
                                                size="small"
                                                color={getStatusColor(item.status_estoque) as any}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color="text.secondary">
                                                {item.data_ultima_atualizacao 
                                            ? new Date(item.data_ultima_atualizacao).toLocaleDateString('pt-BR')
                                            : 'Nunca atualizado'
                                        }
                                            </Typography>
                                        </TableCell>
                                        {modoEdicaoLote && (
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    placeholder="Observações..."
                                                    value={itensEditandoLote[item.id]?.observacoes || ''}
                                                    onChange={(e) => atualizarItemLote(item.id, 'observacoes', e.target.value)}
                                                    sx={{ width: 200 }}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell align="center">
                                            {!modoEdicaoLote && (
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                                    <Tooltip title="Movimentação">
                                                        <IconButton size="small" onClick={() => abrirMovimentacao(item)} color="primary">
                                                            <SwapHoriz fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Ver Histórico">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => verHistorico(item.produto_id, item.produto_nome)}
                                                        >
                                                            <History fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            {/* Menu de Ações */}
            <Menu
                anchorEl={actionsMenuAnchor}
                open={Boolean(actionsMenuAnchor)}
                onClose={() => setActionsMenuAnchor(null)}
                PaperProps={{
                    sx: {
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                        mt: 1,
                        minWidth: 200,
                    }
                }}
            >
                <MenuItem
                    onClick={() => {
                        setActionsMenuAnchor(null);
                        handleInicializarEstoque();
                    }}
                    sx={{ py: 1.5, px: 2 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Refresh sx={{ fontSize: 18, color: '#4f46e5' }} />
                        <Typography>Inicializar Estoque</Typography>
                    </Box>
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        setActionsMenuAnchor(null);
                        handleExportar();
                    }}
                    sx={{ py: 1.5, px: 2 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Download sx={{ fontSize: 18, color: '#059669' }} />
                        <Typography>Exportar Excel</Typography>
                    </Box>
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        setActionsMenuAnchor(null);
                        handleResetarEstoque();
                    }}
                    sx={{ py: 1.5, px: 2 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <RestartAlt sx={{ fontSize: 18, color: '#dc2626' }} />
                        <Typography sx={{ color: '#dc2626' }}>Resetar Estoque</Typography>
                    </Box>
                </MenuItem>
            </Menu>

            {/* Modal de Edição */}
            <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Editar Quantidade - {itemEditando?.produto_nome}</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            label="Quantidade Atual"
                            type="number"
                            value={formEdit.quantidade_atual}
                            onChange={(e) => setFormEdit({ ...formEdit, quantidade_atual: parseFloat(e.target.value) || 0 })}
                            fullWidth
                            InputProps={{
                                endAdornment: <InputAdornment position="end">{itemEditando?.unidade}</InputAdornment>
                            }}
                        />
                        <TextField
                            label="Quantidade Mínima"
                            type="number"
                            value={formEdit.quantidade_minima}
                            onChange={(e) => setFormEdit({ ...formEdit, quantidade_minima: parseFloat(e.target.value) || 0 })}
                            fullWidth
                        />
                        <TextField
                            label="Quantidade Máxima"
                            type="number"
                            value={formEdit.quantidade_maxima}
                            onChange={(e) => setFormEdit({ ...formEdit, quantidade_maxima: parseFloat(e.target.value) || 0 })}
                            fullWidth
                        />
                        <TextField
                            label="Observações"
                            value={formEdit.observacoes}
                            onChange={(e) => setFormEdit({ ...formEdit, observacoes: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setEditModalOpen(false)}>Cancelar</Button>
                    <Button onClick={salvarEdicao} variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Movimentação */}
            <Dialog open={movimentacaoModalOpen} onClose={() => setMovimentacaoModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SwapHoriz color="primary" />
                        <Box>
                            <Typography variant="h6">Movimentação de Estoque</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {itemMovimentacao?.produto_nome}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Informações atuais */}
                        <Card sx={{ bgcolor: '#f8fafc', p: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Quantidade atual em estoque
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {formatarQuantidade(itemMovimentacao?.quantidade_atual || 0)} {itemMovimentacao?.unidade}
                            </Typography>
                        </Card>

                        {/* Tipo de movimentação */}
                        <FormControl fullWidth>
                            <InputLabel>Tipo de Movimentação</InputLabel>
                            <Select
                                value={formMovimentacao.tipo_movimentacao}
                                onChange={(e) => setFormMovimentacao({
                                    ...formMovimentacao,
                                    tipo_movimentacao: e.target.value as 'entrada' | 'saida' | 'ajuste'
                                })}
                                label="Tipo de Movimentação"
                            >
                                <MenuItem value="entrada">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AddIcon sx={{ color: '#059669' }} />
                                        <Typography>Entrada</Typography>
                                    </Box>
                                </MenuItem>
                                <MenuItem value="saida">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Remove sx={{ color: '#dc2626' }} />
                                        <Typography>Saída</Typography>
                                    </Box>
                                </MenuItem>
                                <MenuItem value="ajuste">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Tune sx={{ color: '#8b5cf6' }} />
                                        <Typography>Ajuste</Typography>
                                    </Box>
                                </MenuItem>
                            </Select>
                        </FormControl>

                        {/* Quantidade */}
                        <TextField
                            label={formMovimentacao.tipo_movimentacao === 'ajuste' ? 'Nova Quantidade' : 'Quantidade'}
                            type="number"
                            value={formMovimentacao.quantidade}
                            onChange={(e) => setFormMovimentacao({
                                ...formMovimentacao,
                                quantidade: parseFloat(e.target.value) || 0
                            })}
                            fullWidth
                            required
                            InputProps={{
                                endAdornment: <InputAdornment position="end">{itemMovimentacao?.unidade}</InputAdornment>
                            }}
                            helperText={
                                formMovimentacao.tipo_movimentacao === 'ajuste'
                                    ? 'Informe a quantidade final que deve ficar no estoque'
                                    : `Informe a quantidade a ser ${formMovimentacao.tipo_movimentacao === 'entrada' ? 'adicionada' : 'removida'}`
                            }
                        />

                        {/* Preview da operação */}
                        {formMovimentacao.quantidade > 0 && itemMovimentacao && (
                            <Card sx={{ bgcolor: '#f0f9ff', p: 2 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Resultado da operação:
                                </Typography>
                                <Typography variant="body1">
                                    {formatarQuantidade(itemMovimentacao.quantidade_atual)}
                                    {formMovimentacao.tipo_movimentacao === 'entrada' && ` + ${formatarQuantidade(formMovimentacao.quantidade)}`}
                                    {formMovimentacao.tipo_movimentacao === 'saida' && ` - ${formatarQuantidade(formMovimentacao.quantidade)}`}
                                    {formMovimentacao.tipo_movimentacao === 'ajuste' && ` → ${formatarQuantidade(formMovimentacao.quantidade)}`}
                                    {' = '}
                                    <strong>
                                        {formMovimentacao.tipo_movimentacao === 'entrada'
                                            ? formatarQuantidade(parseFloat(itemMovimentacao.quantidade_atual) + parseFloat(formMovimentacao.quantidade))
                                            : formMovimentacao.tipo_movimentacao === 'saida'
                                                ? formatarQuantidade(parseFloat(itemMovimentacao.quantidade_atual) - parseFloat(formMovimentacao.quantidade))
                                                : formatarQuantidade(formMovimentacao.quantidade)
                                        } {itemMovimentacao.unidade}
                                    </strong>
                                </Typography>
                            </Card>
                        )}

                        {/* Motivo */}
                        <TextField
                            label="Motivo"
                            value={formMovimentacao.motivo}
                            onChange={(e) => setFormMovimentacao({ ...formMovimentacao, motivo: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Descreva o motivo da movimentação..."
                        />

                        {/* Documento de referência */}
                        <TextField
                            label="Documento de Referência"
                            value={formMovimentacao.documento_referencia}
                            onChange={(e) => setFormMovimentacao({ ...formMovimentacao, documento_referencia: e.target.value })}
                            fullWidth
                            placeholder="Ex: NF 12345, Pedido 678, etc."
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button
                        onClick={() => setMovimentacaoModalOpen(false)}
                        disabled={salvandoMovimentacao}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={salvarMovimentacao}
                        variant="contained"
                        disabled={!formMovimentacao.quantidade || formMovimentacao.quantidade <= 0 || salvandoMovimentacao}
                        sx={{
                            bgcolor: formMovimentacao.tipo_movimentacao === 'entrada' ? '#059669' :
                                formMovimentacao.tipo_movimentacao === 'saida' ? '#dc2626' : '#8b5cf6',
                            '&:hover': {
                                bgcolor: formMovimentacao.tipo_movimentacao === 'entrada' ? '#047857' :
                                    formMovimentacao.tipo_movimentacao === 'saida' ? '#b91c1c' : '#7c3aed'
                            }
                        }}
                    >
                        {salvandoMovimentacao ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} color="inherit" />
                                Salvando...
                            </Box>
                        ) : (
                            `Registrar ${formMovimentacao.tipo_movimentacao}`
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Histórico */}
            <Dialog open={historicoModalOpen} onClose={() => setHistoricoModalOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <History color="primary" />
                        <Box>
                            <Typography variant="h6">Histórico de Movimentações</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {historico.length > 0 && historico[0].produto_nome}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {historico.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <History sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
                            <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                                Nenhuma movimentação encontrada
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                                Este produto ainda não possui histórico de movimentações
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} sx={{ borderRadius: '8px' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Data/Hora</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>Anterior</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>Movimentado</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>Posterior</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Motivo</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Documento</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {historico.map((mov, index) => (
                                        <TableRow key={mov.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {new Date(mov.data_movimentacao).toLocaleDateString('pt-BR')}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(mov.data_movimentacao).toLocaleTimeString('pt-BR')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={mov.tipo_movimentacao.toUpperCase()}
                                                    size="small"
                                                    variant="outlined"
                                                    color={
                                                        mov.tipo_movimentacao === 'entrada' ? 'success' :
                                                            mov.tipo_movimentacao === 'saida' ? 'error' : 'warning'
                                                    }
                                                    icon={
                                                        mov.tipo_movimentacao === 'entrada' ? <AddIcon fontSize="small" /> :
                                                            mov.tipo_movimentacao === 'saida' ? <Remove fontSize="small" /> :
                                                                <Tune fontSize="small" />
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2">
                                                    {formatarQuantidade(mov.quantidade_anterior)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: mov.tipo_movimentacao === 'entrada' ? '#059669' :
                                                            mov.tipo_movimentacao === 'saida' ? '#dc2626' : '#8b5cf6'
                                                    }}
                                                >
                                                    {mov.tipo_movimentacao === 'entrada' ? '+' :
                                                        mov.tipo_movimentacao === 'saida' ? '-' : ''}
                                                    {formatarQuantidade(mov.quantidade_movimentada)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {formatarQuantidade(mov.quantidade_posterior)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {mov.motivo || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {mov.documento_referencia || '-'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setHistoricoModalOpen(false)} variant="outlined">
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Confirmação de Reset */}
            <Dialog 
                open={resetModalOpen} 
                onClose={() => setResetModalOpen(false)}
                maxWidth="sm" 
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <RestartAlt sx={{ color: '#dc2626' }} />
                        <Typography variant="h6" sx={{ color: '#dc2626' }}>
                            Confirmar Reset do Estoque
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
                            ⚠️ ATENÇÃO: Esta ação irá:
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                                Zerar todas as quantidades do estoque desta escola
                            </Typography>
                            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                                Criar um backup automático dos dados atuais
                            </Typography>
                            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                                Registrar a operação no histórico de movimentações
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 600 }}>
                            Esta ação NÃO pode ser desfeita!
                        </Typography>
                    </Box>
                    
                    <TextField
                        fullWidth
                        label="Motivo do Reset (opcional)"
                        multiline
                        rows={3}
                        value={motivoReset}
                        onChange={(e) => setMotivoReset(e.target.value)}
                        placeholder="Ex: Início do ano letivo, correção de inventário, etc."
                        sx={{ mb: 2 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 1 }}>
                    <Button
                        onClick={() => {
                            setResetModalOpen(false);
                            setMotivoReset('');
                        }}
                        variant="outlined"
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={confirmarResetEstoque}
                        variant="contained"
                        color="error"
                        disabled={loading}
                        sx={{
                            bgcolor: '#dc2626',
                            '&:hover': {
                                bgcolor: '#b91c1c'
                            }
                        }}
                    >
                        {loading ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} color="inherit" />
                                Resetando...
                            </Box>
                        ) : (
                            'Confirmar Reset'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EstoqueEscolaPage;