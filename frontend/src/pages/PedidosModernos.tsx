import React, { useState, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
    Grid,
    Divider,
    Collapse,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Tooltip,
} from '@mui/material';
import {
    ShoppingCart,
    ExpandMore,
    ExpandLess,
    Visibility,
    Cancel,
    CheckCircle,
    FilterList,
    Refresh,
    MoreVert,
    LocalShipping,
    History,
    Delete,
    Warning,
    Edit,
    Print,
    FileDownload,
} from '@mui/icons-material';
import { usePedidos } from '../hooks/usePedidos';
import { useToast } from '../hooks/useToast';
import {
    PedidoModerno,
    PedidoStatus,
    PedidoFiltros,
    formatarStatusPedido,
    getCorStatus,
    formatarData,
    formatarPreco
} from '../types/pedidos';
import StatusItensPedido from '../components/StatusItensPedido';
import PedidoDetalhes from '../components/PedidoDetalhes';

const PedidosModernos: React.FC = () => {
    const toast = useToast();

    // Estados do componente
    const [filtros, setFiltros] = useState<PedidoFiltros>({});
    const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoModerno | null>(null);
    const [dialogDetalhes, setDialogDetalhes] = useState(false);
    const [dialogCancelamento, setDialogCancelamento] = useState(false);
    const [motivoCancelamento, setMotivoCancelamento] = useState('');
    const [dialogExclusao, setDialogExclusao] = useState(false);
    const [verificandoExclusao, setVerificandoExclusao] = useState(false);
    const [podeExcluir, setPodeExcluir] = useState<any>(null);
    const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [pedidoMenu, setPedidoMenu] = useState<PedidoModerno | null>(null);


    // Hook personalizado para gerenciar pedidos
    const {
        pedidos,
        loading,
        error,
        pagination,
        carregarPedidos,
        buscarPedido,
        cancelarPedido,
        confirmarPedido,
        verificarExclusao,
        excluirPedido,
        limparError,
        refetch
    } = usePedidos(filtros);

    // Handlers para ações
    const handleVerDetalhes = useCallback((pedido: PedidoModerno) => {
        setPedidoSelecionado(pedido);
        setDialogDetalhes(true);
    }, []);

    const handleCancelarPedido = useCallback(async () => {
        if (!pedidoSelecionado || !motivoCancelamento.trim()) {
            toast.warningRequired('Motivo do cancelamento');
            return;
        }

        try {
            await cancelarPedido(pedidoSelecionado.id, motivoCancelamento);
            toast.successUpdate('Pedido cancelado');
            setDialogCancelamento(false);
            setMotivoCancelamento('');
            setPedidoSelecionado(null);
            await refetch();
        } catch (error) {
            toast.errorSave('Erro ao cancelar pedido');
        }
    }, [pedidoSelecionado, motivoCancelamento, cancelarPedido, toast, refetch]);

    const handleConfirmarPedido = useCallback(async (pedido: PedidoModerno) => {
        try {
            await confirmarPedido(pedido.id);
            toast.successUpdate('Pedido confirmado');
            await refetch();
        } catch (error) {
            toast.errorSave('Erro ao confirmar pedido');
        }
    }, [confirmarPedido, toast, refetch]);

    const handleVerificarExclusao = useCallback(async (pedido: PedidoModerno) => {
        try {
            setVerificandoExclusao(true);
            setPedidoSelecionado(pedido);

            const resultado = await verificarExclusao(pedido.id);
            setPodeExcluir(resultado);
            setDialogExclusao(true);
        } catch (error) {
            toast.errorLoad('verificação de exclusão');
        } finally {
            setVerificandoExclusao(false);
        }
    }, [verificarExclusao, toast]);

    const handleExcluirPedido = useCallback(async () => {
        if (!pedidoSelecionado) return;

        try {
            await excluirPedido(pedidoSelecionado.id);
            toast.successUpdate('Pedido excluído com sucesso');
            setDialogExclusao(false);
            setPedidoSelecionado(null);
            setPodeExcluir(null);
            await refetch();
        } catch (error) {
            toast.errorSave('Erro ao excluir pedido');
        }
    }, [pedidoSelecionado, excluirPedido, toast, refetch]);

    const handleFiltroChange = useCallback((novosFiltros: Partial<PedidoFiltros>) => {
        const filtrosAtualizados = { ...filtros, ...novosFiltros, page: 1 };
        setFiltros(filtrosAtualizados);
        carregarPedidos(1, filtrosAtualizados);
    }, [filtros, carregarPedidos]);

    const handlePageChange = useCallback((page: number) => {
        carregarPedidos(page, filtros);
    }, [carregarPedidos, filtros]);

    const toggleCardExpansion = useCallback((pedidoId: number) => {
        setExpandedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pedidoId)) {
                newSet.delete(pedidoId);
            } else {
                newSet.add(pedidoId);
            }
            return newSet;
        });
    }, []);

    const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, pedido: PedidoModerno) => {
        setMenuAnchor(event.currentTarget);
        setPedidoMenu(pedido);
    }, []);

    const handleMenuClose = useCallback(() => {
        setMenuAnchor(null);
        setPedidoMenu(null);
    }, []);

    const handleCloseDetalhes = useCallback(() => {
        setDialogDetalhes(false);
        setPedidoSelecionado(null);
    }, []);

    // Memoized values para performance
    const statusOptions = useMemo(() => [
        { value: '', label: 'Todos os status' },
        { value: 'PENDENTE', label: 'Pendente' },
        { value: 'CONFIRMADO', label: 'Confirmado' },
        { value: 'ENTREGUE', label: 'Entregue' },
        { value: 'FATURADO', label: 'Faturado' },
        { value: 'CANCELADO', label: 'Cancelado' },
    ], []);



    const getStatusChip = useCallback((status: PedidoStatus) => (
        <Chip
            label={formatarStatusPedido(status)}
            size="small"
            sx={{
                bgcolor: getCorStatus(status),
                color: 'white',
                fontWeight: 500,
            }}
        />
    ), []);

    const canCancelPedido = useCallback((pedido: PedidoModerno) => {
        return pedido.status === 'PENDENTE' || pedido.status === 'CONFIRMADO';
    }, []);

    const canConfirmPedido = useCallback((pedido: PedidoModerno) => {
        return pedido.status === 'PENDENTE';
    }, []);

    const canDeletePedido = useCallback((pedido: PedidoModerno) => {
        return ['PENDENTE', 'CONFIRMADO', 'CANCELADO'].includes(pedido.status);
    }, []);

    if (loading && pedidos.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#1f2937', mb: 1 }}>
                    Meus Pedidos
                </Typography>
                <Typography variant="body1" sx={{ color: '#6b7280' }}>
                    Gerencie e acompanhe seus pedidos de alimentação escolar
                </Typography>
            </Box>

            {/* Filtros */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <FilterList sx={{ color: '#4f46e5' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Filtros
                        </Typography>
                        <Button
                            startIcon={<Refresh />}
                            onClick={() => handleFiltroChange({})}
                            size="small"
                        >
                            Limpar
                        </Button>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                select
                                fullWidth
                                label="Status"
                                value={filtros.status || ''}
                                onChange={(e) => handleFiltroChange({ status: e.target.value as PedidoStatus })}
                                size="small"
                            >
                                {statusOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>


                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                label="Data Início"
                                type="date"
                                value={filtros.data_inicio || ''}
                                onChange={(e) => handleFiltroChange({ data_inicio: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                label="Data Fim"
                                type="date"
                                value={filtros.data_fim || ''}
                                onChange={(e) => handleFiltroChange({ data_fim: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Error Alert */}
            {error && (
                <Alert 
                    severity={error.includes('Sessão expirada') ? 'warning' : 'error'} 
                    sx={{ mb: 3 }} 
                    onClose={limparError}
                    action={
                        error.includes('Sessão expirada') ? (
                            <Button 
                                color="inherit" 
                                size="small" 
                                onClick={() => {
                                    // Aqui você pode redirecionar para login ou mostrar modal de login
                                    console.log('Redirecionar para login');
                                    limparError();
                                }}
                            >
                                Fazer Login
                            </Button>
                        ) : undefined
                    }
                >
                    {error}
                </Alert>
            )}

            {/* Tabela de Pedidos */}
            {pedidos.length === 0 ? (
                <Card>
                    <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <ShoppingCart sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                            Nenhum pedido encontrado
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                            Seus pedidos aparecerão aqui quando forem criados
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <TableContainer component={Paper} sx={{ mt: 2, boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                    <Table sx={{ minWidth: 650 }} aria-label="tabela de pedidos">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Número do Pedido</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Tipo</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Itens</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Valor Total</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Data</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#374151', textAlign: 'center' }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pedidos.map((pedido) => (
                                <TableRow 
                                    key={pedido.id}
                                    sx={{ 
                                        '&:hover': { 
                                            backgroundColor: '#f9fafb',
                                            cursor: 'pointer'
                                        },
                                        '&:last-child td, &:last-child th': { border: 0 }
                                    }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                                            #{pedido.numero_pedido}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                            Alimentação Escolar
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={formatarStatusPedido(pedido.status)}
                                            size="small"
                                            sx={{
                                                backgroundColor: getCorStatus(pedido.status),
                                                color: 'white',
                                                fontWeight: 500,
                                                fontSize: '0.75rem'
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                            {pedido.total_itens || 0}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#059669' }}>
                                            {formatarPreco(pedido.valor_total)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                            {formatarData(pedido.data_criacao)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center' }}>
                                            <Tooltip title="Ver Detalhes">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleVerDetalhes(pedido)}
                                                    sx={{ color: '#3b82f6' }}
                                                >
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            
                                            {canCancelPedido(pedido) && (
                                                <Tooltip title="Cancelar Pedido">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            setPedidoSelecionado(pedido);
                                                            setDialogCancelamento(true);
                                                        }}
                                                        sx={{ color: '#ef4444' }}
                                                    >
                                                        <Cancel fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            
                                            <Tooltip title="Mais opções">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleMenuOpen(e, pedido)}
                                                    sx={{ color: '#6b7280' }}
                                                >
                                                    <MoreVert fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Paginação */}
            {pagination.totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Button
                        disabled={!pagination.hasPrev}
                        onClick={() => handlePageChange(pagination.page - 1)}
                    >
                        Anterior
                    </Button>

                    <Typography sx={{ mx: 2, alignSelf: 'center' }}>
                        Página {pagination.page} de {pagination.totalPages}
                    </Typography>

                    <Button
                        disabled={!pagination.hasNext}
                        onClick={() => handlePageChange(pagination.page + 1)}
                    >
                        Próxima
                    </Button>
                </Box>
            )}

            {/* Menu de Ações */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => {
                    handleMenuClose();
                    // Implementar edição do pedido
                    console.log('Editar pedido:', pedidoMenu?.id);
                }}>
                    <ListItemIcon>
                        <Edit fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Editar Pedido</ListItemText>
                </MenuItem>

                <MenuItem onClick={() => {
                    if (pedidoMenu) handleVerDetalhes(pedidoMenu);
                    handleMenuClose();
                }}>
                    <ListItemIcon>
                        <Visibility fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Ver Detalhes</ListItemText>
                </MenuItem>

                {pedidoMenu && canConfirmPedido(pedidoMenu) && (
                    <MenuItem onClick={() => {
                        if (pedidoMenu) handleConfirmarPedido(pedidoMenu);
                        handleMenuClose();
                    }}>
                        <ListItemIcon>
                            <CheckCircle fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Confirmar Pedido</ListItemText>
                    </MenuItem>
                )}

                <MenuItem onClick={() => {
                    handleMenuClose();
                    // Implementar histórico do pedido
                    console.log('Ver histórico:', pedidoMenu?.id);
                }}>
                    <ListItemIcon>
                        <History fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Ver Histórico</ListItemText>
                </MenuItem>

                <MenuItem onClick={() => {
                    handleMenuClose();
                    // Implementar impressão do pedido
                    console.log('Imprimir pedido:', pedidoMenu?.id);
                }}>
                    <ListItemIcon>
                        <Print fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Imprimir</ListItemText>
                </MenuItem>

                <MenuItem onClick={() => {
                    handleMenuClose();
                    // Implementar exportação do pedido
                    console.log('Exportar pedido:', pedidoMenu?.id);
                }}>
                    <ListItemIcon>
                        <FileDownload fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Exportar</ListItemText>
                </MenuItem>

                {pedidoMenu && canDeletePedido(pedidoMenu) && (
                    <MenuItem
                        onClick={() => {
                            if (pedidoMenu) handleVerificarExclusao(pedidoMenu);
                            handleMenuClose();
                        }}
                        sx={{ color: 'error.main' }}
                    >
                        <ListItemIcon>
                            <Delete fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText>Excluir Pedido</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {/* Dialog de Detalhes */}
            <Dialog
                open={dialogDetalhes}
                onClose={handleCloseDetalhes}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    sx: { height: '90vh' }
                }}
            >
                <DialogContent sx={{ p: 0 }}>
                    {pedidoSelecionado ? (
                        <PedidoDetalhes 
                            pedidoId={pedidoSelecionado.id}
                            onClose={handleCloseDetalhes}
                        />
                    ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                            <CircularProgress />
                            <Typography sx={{ ml: 2 }}>Carregando detalhes...</Typography>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog de Cancelamento */}
            <Dialog
                open={dialogCancelamento}
                onClose={() => setDialogCancelamento(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Cancelar Pedido #{pedidoSelecionado?.numero_pedido}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Motivo do cancelamento"
                        value={motivoCancelamento}
                        onChange={(e) => setMotivoCancelamento(e.target.value)}
                        placeholder="Descreva o motivo do cancelamento..."
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogCancelamento(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleCancelarPedido}
                        color="error"
                        variant="contained"
                        disabled={!motivoCancelamento.trim()}
                    >
                        Confirmar Cancelamento
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog de Confirmação de Exclusão */}
            <Dialog
                open={dialogExclusao}
                onClose={() => {
                    setDialogExclusao(false);
                    setPedidoSelecionado(null);
                    setPodeExcluir(null);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning color="error" />
                    Excluir Pedido #{pedidoSelecionado?.numero_pedido}
                </DialogTitle>
                <DialogContent>
                    {verificandoExclusao ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                            <CircularProgress size={24} />
                            <Typography>Verificando se o pedido pode ser excluído...</Typography>
                        </Box>
                    ) : podeExcluir ? (
                        <Box>
                            {podeExcluir.pode_excluir ? (
                                <Box>
                                    <Alert severity="warning" sx={{ mb: 2 }}>
                                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                                            Atenção! Esta ação não pode ser desfeita.
                                        </Typography>
                                        <Typography variant="body2">
                                            O pedido e todos os seus dados relacionados (fornecedores, itens, histórico) serão permanentemente removidos do sistema.
                                        </Typography>
                                    </Alert>

                                    <Typography variant="body1" sx={{ mb: 2 }}>
                                        Tem certeza que deseja excluir este pedido?
                                    </Typography>

                                    {podeExcluir.detalhes && (
                                        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                                Informações do pedido:
                                            </Typography>
                                            <Typography variant="body2">
                                                • Status: {podeExcluir.detalhes.status}
                                            </Typography>
                                            <Typography variant="body2">
                                                • Tem entregas: {podeExcluir.detalhes.tem_entregas ? 'Sim' : 'Não'}
                                            </Typography>
                                            <Typography variant="body2">
                                                • Tem confirmações: {podeExcluir.detalhes.tem_confirmacoes ? 'Sim' : 'Não'}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            ) : (
                                <Box>
                                    <Alert severity="error" sx={{ mb: 2 }}>
                                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                                            Este pedido não pode ser excluído
                                        </Typography>
                                        <Typography variant="body2">
                                            {podeExcluir.motivo}
                                        </Typography>
                                    </Alert>

                                    {podeExcluir.detalhes && (
                                        <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                                Detalhes:
                                            </Typography>
                                            <Typography variant="body2">
                                                • Status: {podeExcluir.detalhes.status}
                                            </Typography>
                                            <Typography variant="body2">
                                                • Tem entregas: {podeExcluir.detalhes.tem_entregas ? 'Sim' : 'Não'}
                                            </Typography>
                                            <Typography variant="body2">
                                                • Tem confirmações: {podeExcluir.detalhes.tem_confirmacoes ? 'Sim' : 'Não'}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Typography>Carregando informações...</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setDialogExclusao(false);
                            setPedidoSelecionado(null);
                            setPodeExcluir(null);
                        }}
                    >
                        Cancelar
                    </Button>
                    {podeExcluir?.pode_excluir && (
                        <Button
                            onClick={handleExcluirPedido}
                            color="error"
                            variant="contained"
                            startIcon={<Delete />}
                        >
                            Confirmar Exclusão
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PedidosModernos;