import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Container,
    Card,
    CardContent,
    Button,
    Grid,
    TextField,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Chip,
    Alert,
    CircularProgress,
    Avatar,
    Tooltip,
    InputAdornment,
    useTheme,
    useMediaQuery,
    Paper,
} from '@mui/material';
import {

    School as SchoolIcon,
    Route as RouteIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIcon,
    ArrowBack as ArrowBackIcon,
    Search as SearchIcon,
    Clear as ClearIcon
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
import { useParams, useNavigate } from 'react-router-dom';
import { rotaService } from '../modules/entregas/services/rotaService';
import { escolaService } from '../services/escolaService';
import { RotaEntrega, RotaEscola } from '../modules/entregas/types/rota';
import PageBreadcrumbs from '../components/PageBreadcrumbs';

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
            {...attributes}
            sx={{
                mb: 1,
                border: '1px solid',
                borderRadius: 0,
                borderColor: isDragging ? 'primary.main' : 'grey.300',
                bgcolor: isDragging ? 'primary.50' : 'background.paper',
                '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50',
                }
            }}
        >
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        {...listeners}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            flexGrow: 1,
                            cursor: isDragging ? 'grabbing' : 'grab',
                            '&:active': { cursor: 'grabbing' }
                        }}
                    >
                        <DragIcon color="action" />

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
                    </Box>

                    <Box
                        sx={{ 
                            pointerEvents: 'auto',
                            zIndex: 10,
                            position: 'relative'
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        <Tooltip title="Remover da rota">
                            <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('=== BOTÃO REMOVER CLICADO ===');
                                    console.log('Escola:', escola);
                                    console.log('Enviando para onRemove:', { id: escola.escola_id });
                                    onRemove({ id: escola.escola_id });
                                }}
                                sx={{ 
                                    '&:hover': {
                                        bgcolor: 'error.light'
                                    }
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

const GerenciarEscolasRota: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const { rotaId } = useParams<{ rotaId: string }>();

    const [rota, setRota] = useState<RotaEntrega | null>(null);
    const [escolas, setEscolas] = useState<any[]>([]);
    const [escolasDisponiveis, setEscolasDisponiveis] = useState<any[]>([]);
    const [escolasRota, setEscolasRota] = useState<RotaEscola[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [salvandoOperacao, setSalvandoOperacao] = useState<string | null>(null);

    const [filtroEscolas, setFiltroEscolas] = useState('');

    const inputPesquisaRef = React.useRef<HTMLInputElement>(null);

    // Sensores para drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const loadDados = useCallback(async () => {
        if (!rotaId) return;

        try {
            setLoading(true);
            setError(null);

            const [rotaData, escolasData, escolasRotaData] = await Promise.all([
                rotaService.obterRota(parseInt(rotaId)),
                escolaService.listarEscolas(),
                rotaService.listarEscolasRota(parseInt(rotaId))
            ]);

            setRota(rotaData);
            setEscolas(Array.isArray(escolasData) ? escolasData : []);
            setEscolasRota(escolasRotaData);
            // Todas as escolas estão sempre disponíveis para serem adicionadas a qualquer rota
            setEscolasDisponiveis(Array.isArray(escolasData) ? escolasData : []);

        } catch (err: any) {
            setError('Erro ao carregar dados da rota. Tente novamente.');
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    }, [rotaId]);

    useEffect(() => {
        loadDados();
    }, [loadDados]);

    // Atalho de teclado para focar no campo de pesquisa
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault();
                inputPesquisaRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const escolasDisponiveisFiltradas = escolasDisponiveis.filter(escola => {
        // Não mostrar escolas que já estão na rota atual
        const jaEstaNaRota = escolasRota.some(er => er.escola_id === escola.id);
        if (jaEstaNaRota) return false;

        // Aplicar filtro de busca
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

    const adicionarEscolaRota = async (escola: any) => {
        if (!rota) return;

        try {
            setSalvandoOperacao('Adicionando escola...');
            
            // Adicionar escola à rota no backend
            const novaOrdem = escolasRota.length + 1;
            await rotaService.adicionarEscolaRota(rota.id, escola.id, novaOrdem);

            // Atualizar estado local
            const novaEscolaRota: RotaEscola = {
                id: Date.now(), // ID temporário
                rota_id: rota.id,
                escola_id: escola.id,
                ordem: novaOrdem,
                created_at: new Date().toISOString(),
                escola_nome: escola.nome,
                escola_endereco: escola.endereco
            };

            setEscolasRota(prev => [...prev, novaEscolaRota]);
            // Não removemos a escola das disponíveis, pois ela pode estar em múltiplas rotas
            
            setSuccessMessage('Escola adicionada à rota com sucesso!');
        } catch (err) {
            console.error('Erro ao adicionar escola à rota:', err);
            setError('Erro ao adicionar escola à rota');
        } finally {
            setSalvandoOperacao(null);
        }
    };

    const removerEscolaRota = async (escola: any) => {
        console.log('=== FUNÇÃO REMOVER CHAMADA ===');
        console.log('Escola recebida:', escola);
        console.log('Rota atual:', rota);
        
        if (!rota) {
            console.log('Rota não encontrada, saindo da função');
            return;
        }

        try {
            setSalvandoOperacao('Removendo escola...');
            
            // Remover escola da rota no backend
            await rotaService.removerEscolaRota(rota.id, escola.id);

            // Atualizar estado local
            console.log('Escolas antes da remoção:', escolasRota);
            const novasEscolas = escolasRota.filter(er => er.escola_id !== escola.id);
            console.log('Escolas após filtro:', novasEscolas);
            
            const escolasReordenadas = novasEscolas.map((er, index) => ({
                ...er,
                ordem: index + 1
            }));

            console.log('Escolas reordenadas:', escolasReordenadas);
            setEscolasRota(escolasReordenadas);
            // Não adicionamos a escola de volta às disponíveis, pois ela sempre deve estar disponível

            // Atualizar ordem das escolas restantes no backend
            if (escolasReordenadas.length > 0) {
                const escolasOrdem = escolasReordenadas.map(escola => ({
                    escolaId: escola.escola_id,
                    ordem: escola.ordem
                }));
                await rotaService.atualizarOrdemEscolas(rota.id, escolasOrdem);
            }

            setSuccessMessage('Escola removida da rota com sucesso!');
        } catch (err: any) {
            console.error('Erro ao remover escola da rota:', err);
            console.error('Detalhes do erro:', err.response?.data || err.message);
            setError(`Erro ao remover escola da rota: ${err.response?.data?.message || err.message}`);
        } finally {
            setSalvandoOperacao(null);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id && rota) {
            let novasEscolas: RotaEscola[] = [];
            
            setEscolasRota((items) => {
                const escolasOrdenadas = [...items].sort((a, b) => a.ordem - b.ordem);
                const oldIndex = escolasOrdenadas.findIndex(item => item.id === active.id);
                const newIndex = escolasOrdenadas.findIndex(item => item.id === over?.id);

                const reorderedItems = arrayMove(escolasOrdenadas, oldIndex, newIndex);

                // Atualizar as ordens
                novasEscolas = reorderedItems.map((escola, idx) => ({
                    ...escola,
                    ordem: idx + 1
                }));

                return novasEscolas;
            });

            // Salvar nova ordem no backend
            try {
                setSalvandoOperacao('Atualizando ordem...');
                
                const escolasOrdem = novasEscolas.map(escola => ({
                    escolaId: escola.escola_id,
                    ordem: escola.ordem
                }));
                
                await rotaService.atualizarOrdemEscolas(rota.id, escolasOrdem);
                setSuccessMessage('Ordem das escolas atualizada com sucesso!');
            } catch (err) {
                console.error('Erro ao atualizar ordem das escolas:', err);
                setError('Erro ao atualizar ordem das escolas');
                // Recarregar dados em caso de erro
                loadDados();
            } finally {
                setSalvandoOperacao(null);
            }
        }
    };



    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (error && !rota) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 4 }}>
                <Container maxWidth="md">
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                    <Button variant="contained" onClick={loadDados}>Tentar Novamente</Button>
                </Container>
            </Box>
        );
    }

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

            <Container maxWidth="xl" sx={{ py: 4 }}>
                <PageBreadcrumbs 
                    items={[
                        { label: 'Gestão de Rotas', path: '/gestao-rotas', icon: <RouteIcon fontSize="small" /> },
                        { label: 'Gerenciar Escolas', icon: <SchoolIcon fontSize="small" /> }
                    ]}
                />

                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                    {rota && (
                        <>
                            <Avatar sx={{ bgcolor: rota.cor, width: 48, height: 48 }}>
                                <RouteIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    {rota.nome}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body1" color="text.secondary">
                                        Adicione escolas à rota e organize a ordem de visita. Uma escola pode estar em múltiplas rotas.
                                    </Typography>
                                    {salvandoOperacao && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircularProgress size={16} />
                                            <Typography variant="body2" color="primary">
                                                {salvandoOperacao}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        </>
                    )}
                </Box>



                {/* Conteúdo Principal */}
                <Grid container spacing={3}>
                    {/* Card de Escolas Disponíveis */}
                    <Grid item xs={12} lg={6}>
                        <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column', p: 3 }}>
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
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                    endAdornment: filtroEscolas && (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => setFiltroEscolas('')}
                                            >
                                                <ClearIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />

                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="body2" color="text.secondary">
                                    {filtroEscolas
                                        ? `${escolasDisponiveisFiltradas.length} escola(s) encontrada(s)`
                                        : 'Clique nas escolas para adicionar à rota (escolas podem estar em múltiplas rotas)'
                                    }
                                </Typography>
                                {filtroEscolas && escolasDisponiveisFiltradas.length > 0 && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={async () => {
                                            for (const escola of escolasDisponiveisFiltradas) {
                                                await adicionarEscolaRota(escola);
                                            }
                                            setFiltroEscolas('');
                                        }}
                                        sx={{ fontSize: '0.75rem' }}
                                    >
                                        Adicionar Todas ({escolasDisponiveisFiltradas.length})
                                    </Button>
                                )}
                            </Box>

                            <Box sx={{ 
                                flexGrow: 1, 
                                overflow: 'auto',
                                '&::-webkit-scrollbar': {
                                    width: '8px',
                                },
                                '&::-webkit-scrollbar-track': {
                                    background: '#f1f1f1',
                                    borderRadius: '4px',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    background: '#c1c1c1',
                                    borderRadius: '4px',
                                },
                                '&::-webkit-scrollbar-thumb:hover': {
                                    background: '#a8a8a8',
                                }
                            }}>
                                {escolasDisponiveisFiltradas.map((escola) => (
                                    <Card
                                        key={escola.id}
                                        sx={{
                                            mb: 1,
                                            cursor: 'pointer',
                                            border: '1px solid transparent',
                                            borderRadius: 0,
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
                                                    Todas as escolas já estão nesta rota
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                    Uma escola pode estar em múltiplas rotas, mas não duplicada na mesma rota
                                                </Typography>
                                            </>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Card de Escolas na Rota */}
                    <Grid item xs={12} lg={6}>
                        <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column', bgcolor: 'primary.50', p: 3 }}>
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
                            <Alert severity="success" sx={{ mb: 2, fontSize: '0.75rem' }}>
                                ✨ Todas as mudanças são salvas automaticamente! Clique e arraste para reordenar as escolas.
                            </Alert>

                            <Box sx={{ 
                                flexGrow: 1, 
                                overflow: 'auto',
                                '&::-webkit-scrollbar': {
                                    width: '8px',
                                },
                                '&::-webkit-scrollbar-track': {
                                    background: '#f1f1f1',
                                    borderRadius: '4px',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    background: '#c1c1c1',
                                    borderRadius: '4px',
                                },
                                '&::-webkit-scrollbar-thumb:hover': {
                                    background: '#a8a8a8',
                                }
                            }}>
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
                                            Clique nas escolas disponíveis para adicionar à rota
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default GerenciarEscolasRota;