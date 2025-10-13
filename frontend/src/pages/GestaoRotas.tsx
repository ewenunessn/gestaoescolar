import React, { useState, useEffect } from 'react';
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
    Avatar
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
    ArrowDownward as ArrowDownIcon
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
    const [rotas, setRotas] = useState<RotaEntrega[]>([]);
    const [escolas, setEscolas] = useState<any[]>([]);
    const [escolasDisponiveis, setEscolasDisponiveis] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados dos modais
    const [modalRotaAberto, setModalRotaAberto] = useState(false);
    const [modalEscolasAberto, setModalEscolasAberto] = useState(false);
    const [rotaEditando, setRotaEditando] = useState<RotaEntrega | null>(null);
    const [rotaSelecionada, setRotaSelecionada] = useState<RotaEntrega | null>(null);
    const [escolasRota, setEscolasRota] = useState<RotaEscola[]>([]);

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

    useEffect(() => {
        carregarDados();
    }, []);

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

    const carregarDados = async () => {
        try {
            setLoading(true);
            setError(null);

            const [rotasData, escolasData, escolasDisponiveisData] = await Promise.all([
                rotaService.listarRotas(),
                escolaService.listarEscolas(),
                rotaService.listarEscolasDisponiveis()
            ]);

            setRotas(rotasData);
            setEscolas(Array.isArray(escolasData) ? escolasData : []);
            setEscolasDisponiveis(escolasDisponiveisData);

        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            setError('Erro ao carregar dados das rotas');
        } finally {
            setLoading(false);
        }
    };

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

            await carregarDados();
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
            await carregarDados();
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

            await carregarDados();
            fecharModalEscolas();

        } catch (err) {
            console.error('Erro ao salvar escolas da rota:', err);
            setError('Erro ao salvar escolas da rota');
        } finally {
            setSalvando(false);
        }
    };

    if (loading && rotas.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="xl">
            <Box py={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                        <Typography variant="h4" component="h1" gutterBottom>
                            Gestão de Rotas de Entrega
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Crie rotas e defina manualmente quais escolas pertencem a cada equipe de entrega
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => abrirModalRota()}
                    >
                        Nova Rota
                    </Button>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={3}>
                    {rotas.map((rota) => (
                        <Grid item xs={12} md={6} lg={4} key={rota.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    border: `3px solid ${rota.cor}`,
                                    '&:hover': {
                                        boxShadow: 4,
                                        transform: 'translateY(-2px)',
                                        transition: 'all 0.2s'
                                    }
                                }}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                                        <Avatar sx={{ bgcolor: rota.cor }}>
                                            <RouteIcon />
                                        </Avatar>
                                        <Box flexGrow={1}>
                                            <Typography variant="h6" fontWeight="bold">
                                                {rota.nome}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {rota.descricao || 'Sem descrição'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                                        <SchoolIcon fontSize="small" color="action" />
                                        <Typography variant="body2">
                                            {rota.total_escolas || 0} escola(s) associada(s)
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Box display="flex" gap={1}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<SchoolIcon />}
                                            onClick={() => abrirModalEscolas(rota)}
                                            fullWidth
                                        >
                                            Gerenciar Escolas
                                        </Button>
                                        <Tooltip title="Editar Rota">
                                            <IconButton
                                                size="small"
                                                onClick={() => abrirModalRota(rota)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Remover Rota">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => deletarRota(rota.id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {rotas.length === 0 && (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <RouteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Nenhuma rota criada ainda
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Crie sua primeira rota de entrega para organizar as escolas por equipes
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => abrirModalRota()}
                        >
                            Criar Primeira Rota
                        </Button>
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


            </Box>
        </Container>
    );
};

export default GestaoRotas;