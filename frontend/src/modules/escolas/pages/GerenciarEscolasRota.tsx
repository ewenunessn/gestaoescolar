import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Typography,
    Button,
    TextField,
    IconButton,
    Chip,
    Alert,
    CircularProgress,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Checkbox,
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    Close as CloseIcon,
    ArrowBack as ArrowBackIcon,
    Route as RouteIcon
} from "@mui/icons-material";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useParams, useNavigate } from "react-router-dom";
import { rotaService } from "../../entregas/services/rotaService";
import { listarEscolas } from "../../../services/escolas";
import { RotaEntrega, RotaEscola } from "../../entregas/types/rota";
import { DataTable } from "../../../components/DataTable";
import PageHeader from "../../../components/PageHeader";
import PageContainer from "../../../components/PageContainer";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";

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
        position: 'relative' as const,
        zIndex: isDragging ? 999 : 'auto',
    };

    return (
        <Box
            ref={setNodeRef}
            style={style}
            sx={{
                display: 'grid',
                gridTemplateColumns: '40px 60px 1fr 2fr 150px 60px',
                gap: 2,
                p: 2,
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: isDragging ? 'primary.main' : 'divider',
                alignItems: 'center',
                transition: 'all 0.2s',
                '&:last-child': {
                    borderBottom: 'none'
                },
                '&:hover': {
                    bgcolor: 'action.hover',
                    '& .remove-btn': { opacity: 1, visibility: 'visible' },
                    '& .drag-handle': { color: 'text.primary' }
                }
            }}
        >
            {/* Drag Handle */}
            <Box
                {...attributes}
                {...listeners}
                className="drag-handle"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    color: 'action.disabled',
                    transition: 'color 0.2s',
                }}
            >
                <DragIcon fontSize="small" />
            </Box>

            {/* Ordem */}
            <Typography 
                variant="body2" 
                sx={{ 
                    fontWeight: 600, 
                    color: 'primary.main',
                    textAlign: 'center',
                    userSelect: 'none'
                }}
            >
                {index + 1}
            </Typography>

            {/* Nome da Escola */}
            <Typography variant="body2" fontWeight="600" noWrap>
                {escola.escola_nome}
            </Typography>

            {/* Endereço */}
            <Typography variant="body2" color="text.secondary" noWrap>
                {escola.escola_endereco || '-'}
            </Typography>

            {/* Município */}
            <Typography variant="body2" color="text.secondary" noWrap>
                {escola.escola_municipio || '-'}
            </Typography>

            {/* Ações */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <IconButton
                    size="small"
                    className="remove-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove({ id: escola.escola_id });
                    }}
                    sx={{ 
                        opacity: 0,
                        visibility: 'hidden',
                        transition: 'all 0.2s',
                        color: 'text.secondary',
                        '&:hover': {
                            color: 'error.main',
                            bgcolor: 'error.lighter'
                        }
                    }}
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Box>
        </Box>
    );
};

const GerenciarEscolasRota: React.FC = () => {
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
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedSchools, setSelectedSchools] = useState<number[]>([]);

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
                listarEscolas(),
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
        } catch (err: any) {
            console.error('Erro ao adicionar escola à rota:', err);
            
            // Extrair mensagem de erro específica
            let errorMessage = 'Erro ao adicionar escola à rota';
            if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setSalvandoOperacao(null);
        }
    };

    const removerEscolaRota = async (escola: any) => {
        
        if (!rota) {
            return;
        }

        try {
            setSalvandoOperacao('Removendo escola...');
            
            // Remover escola da rota no backend
            await rotaService.removerEscolaRota(rota.id, escola.id);

            // Atualizar estado local
            const novasEscolas = escolasRota.filter(er => er.escola_id !== escola.id);
            
            const escolasReordenadas = novasEscolas.map((er, index) => ({
                ...er,
                ordem: index + 1
            }));

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



    const handleToggleSchool = (schoolId: number) => {
        setSelectedSchools(prev => {
            if (prev.includes(schoolId)) {
                return prev.filter(id => id !== schoolId);
            } else {
                return [...prev, schoolId];
            }
        });
    };

    const handleAddSelectedSchools = async () => {
        if (!rota) return;
        
        setSalvandoOperacao('Adicionando escolas...');
        try {
            let currentOrder = escolasRota.length;
            
            // Filter schools that are selected
            const schoolsToAdd = escolasDisponiveis.filter(s => selectedSchools.includes(s.id));
            
            for (const escola of schoolsToAdd) {
                currentOrder++;
                await rotaService.adicionarEscolaRota(rota.id, escola.id, currentOrder);
            }

            await loadDados();
            setSuccessMessage(`${schoolsToAdd.length} escolas adicionadas com sucesso!`);
            setOpenDialog(false);
            setSelectedSchools([]);
            setFiltroEscolas('');
        } catch (err: any) {
            console.error('Erro ao adicionar escolas:', err);
            
            // Extrair mensagem de erro específica
            let errorMessage = 'Erro ao adicionar escolas selecionadas';
            if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setSalvandoOperacao(null);
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
            <PageContainer>
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Button variant="contained" onClick={loadDados}>Tentar Novamente</Button>
            </PageContainer>
        );
    }

    return (
        <>
        <PageContainer>
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

            <PageBreadcrumbs
                items={[
                    { label: 'Dashboard', path: '/dashboard' },
                    { label: 'Gestão de Rotas', path: '/gestao-rotas', icon: <RouteIcon fontSize="small" /> },
                    { label: rota ? `Rota ${rota.nome}` : 'Gerenciar Escolas' }
                ]}
            />

            <PageHeader
                title={rota ? `Rota ${rota.nome}` : 'Gerenciar Escolas da Rota'}
                subtitle={`${escolasRota.length} ${escolasRota.length === 1 ? 'escola' : 'escolas'} na rota. Arraste para reordenar.`}
                breadcrumbs={[
                    { label: 'Dashboard', path: '/dashboard' },
                    { label: 'Entregas' },
                    { label: 'Gestão de Rotas', path: '/gestao-rotas' },
                    { label: rota ? `Rota ${rota.nome}` : 'Gerenciar Escolas' },
                ]}
            />

            {/* Botão de Voltar e Adicionar */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/gestao-rotas')}
                    sx={{ textTransform: 'none' }}
                >
                    Voltar para Rotas
                </Button>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {salvandoOperacao && (
                        <Chip 
                            size="small" 
                            label={salvandoOperacao} 
                            sx={{ bgcolor: 'transparent', border: '1px solid', borderColor: 'divider', color: 'text.secondary' }}
                            icon={<CircularProgress size={10} color="inherit" />} 
                        />
                    )}
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenDialog(true)}
                        sx={{ 
                            textTransform: 'none', 
                            borderRadius: 2,
                            px: 3,
                            py: 1,
                            fontWeight: 600,
                            bgcolor: '#059669',
                            '&:hover': { bgcolor: '#047857' }
                        }}
                    >
                        Adicionar Escolas
                    </Button>
                </Box>
            </Box>

                {/* Lista de Escolas na Rota com DataTable */}
                <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
                    {escolasRota.length > 0 ? (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={escolasRota.sort((a, b) => a.ordem - b.ordem).map(e => e.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <Box sx={{ 
                                    bgcolor: 'background.paper', 
                                    borderRadius: 2, 
                                    border: '1px solid', 
                                    borderColor: 'divider',
                                    overflow: 'hidden'
                                }}>
                                    {/* Cabeçalho da Tabela */}
                                    <Box sx={{ 
                                        display: 'grid',
                                        gridTemplateColumns: '40px 60px 1fr 2fr 150px 60px',
                                        gap: 2,
                                        p: 2,
                                        bgcolor: 'grey.50',
                                        borderBottom: '2px solid',
                                        borderColor: 'divider',
                                        fontWeight: 600
                                    }}>
                                        <Box /> {/* Drag handle */}
                                        <Typography variant="caption" fontWeight="600" color="text.secondary" textAlign="center">
                                            Ordem
                                        </Typography>
                                        <Typography variant="caption" fontWeight="600" color="text.secondary">
                                            Escola
                                        </Typography>
                                        <Typography variant="caption" fontWeight="600" color="text.secondary">
                                            Endereço
                                        </Typography>
                                        <Typography variant="caption" fontWeight="600" color="text.secondary">
                                            Município
                                        </Typography>
                                        <Typography variant="caption" fontWeight="600" color="text.secondary" textAlign="center">
                                            Ações
                                        </Typography>
                                    </Box>

                                    {/* Linhas da Tabela */}
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
                                </Box>
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <Box 
                            textAlign="center" 
                            py={8} 
                            sx={{ 
                                border: '1px dashed', 
                                borderColor: 'divider', 
                                borderRadius: 2,
                                bgcolor: 'background.paper'
                            }}
                        >
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                Nenhuma escola nesta rota.
                            </Typography>
                            <Button 
                                variant="outlined" 
                                startIcon={<AddIcon />}
                                onClick={() => setOpenDialog(true)}
                                sx={{ mt: 2, textTransform: 'none' }}
                            >
                                Adicionar Escolas
                            </Button>
                        </Box>
                    )}
                </Box>
            </PageContainer>

            {/* Dialog para Adicionar Escolas */}
            <Dialog 
                open={openDialog} 
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3, maxHeight: '80vh' }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography variant="h6" fontWeight="600">Adicionar Escolas</Typography>
                    <IconButton onClick={() => setOpenDialog(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '500px' }}>
                    <Box p={2} pb={1}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Buscar escola..."
                            value={filtroEscolas}
                            onChange={(e) => setFiltroEscolas(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: filtroEscolas && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setFiltroEscolas('')}>
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Box>
                    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                        {escolasDisponiveisFiltradas.length > 0 ? (
                            escolasDisponiveisFiltradas.map((escola) => (
                                <Box 
                                    key={escola.id}
                                    onClick={() => handleToggleSchool(escola.id)}
                                    sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        p: 2, 
                                        cursor: 'pointer',
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: selectedSchools.includes(escola.id) ? 'action.selected' : 'transparent',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                >
                                    <Checkbox 
                                        checked={selectedSchools.includes(escola.id)}
                                        onChange={() => handleToggleSchool(escola.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        sx={{ mr: 1 }}
                                    />
                                    <Box>
                                        <Typography variant="body2" fontWeight="500">
                                            {destacarTexto(escola.nome, filtroEscolas)}
                                        </Typography>
                                        {escola.endereco && (
                                            <Typography variant="caption" color="text.secondary">
                                                {destacarTexto(escola.endereco, filtroEscolas)}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            ))
                        ) : (
                            <Box textAlign="center" py={4} color="text.secondary">
                                <Typography variant="body2">
                                    {filtroEscolas 
                                        ? "Nenhuma escola encontrada"
                                        : "Todas as escolas disponíveis já foram adicionadas"
                                    }
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, ml: 1 }}>
                        {selectedSchools.length} selecionadas
                    </Typography>
                    <Button onClick={() => setOpenDialog(false)} color="inherit" sx={{ textTransform: 'none' }}>
                        Cancelar
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleAddSelectedSchools}
                        disabled={selectedSchools.length === 0}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        Adicionar Selecionadas
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default GerenciarEscolasRota;
