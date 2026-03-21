import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import StatusIndicator from '../components/StatusIndicator';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import { DataTableAdvanced } from '../components/DataTableAdvanced';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
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
    FormControlLabel,
    Switch,
    Avatar,
    Tooltip,
    Chip,
    Popover,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Route as RouteIcon,
    FilterList as FilterIcon,
    Save as SaveIcon
} from '@mui/icons-material';

import { rotaService } from '../modules/entregas/services/rotaService';
import { RotaEntrega, CreateRotaData } from '../modules/entregas/types/rota';
import PageBreadcrumbs from '../components/PageBreadcrumbs';

const GestaoRotas: React.FC = () => {
    const navigate = useNavigate();

    const [rotas, setRotas] = useState<RotaEntrega[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estados dos modais
    const [modalRotaAberto, setModalRotaAberto] = useState(false);
    const [rotaEditando, setRotaEditando] = useState<RotaEntrega | null>(null);

    // Estados de filtros
    const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
    const [filters, setFilters] = useState<Record<string, any>>({});

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

    const filteredRotas = useMemo(() => {
        return rotas.filter(rota => {
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

    // Definir colunas da tabela
    const columns = useMemo<ColumnDef<RotaEntrega>[]>(() => [
        {
            accessorKey: 'cor',
            header: '',
            size: 40,
            enableSorting: false,
            cell: ({ row }) => (
                <Box 
                    sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: row.original.cor,
                        boxShadow: `0 0 0 2px ${row.original.cor}40`
                    }} 
                />
            )
        },
        {
            accessorKey: 'nome',
            header: 'Nome',
            size: 200,
            cell: ({ row }) => (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.original.nome}
                </Typography>
            )
        },
        {
            accessorKey: 'descricao',
            header: 'Descrição',
            size: 300,
            cell: ({ row }) => (
                <Typography variant="body2" color="text.secondary">
                    {row.original.descricao || 'Sem descrição'}
                </Typography>
            )
        },
        {
            accessorKey: 'total_escolas',
            header: 'Escolas',
            size: 100,
            align: 'center',
            cell: ({ row }) => (
                <Chip label={row.original.total_escolas || 0} size="small" color="primary" />
            )
        },
        {
            accessorKey: 'ativo',
            header: 'Status',
            size: 120,
            align: 'center',
            cell: ({ row }) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                    <StatusIndicator status={row.original.ativo ? 'ativo' : 'inativo'} size="small" />
                    <Typography variant="body2" color={row.original.ativo ? 'success.main' : 'text.disabled'}>
                        {row.original.ativo ? 'Ativa' : 'Inativa'}
                    </Typography>
                </Box>
            )
        },
        {
            id: 'actions',
            header: 'Ações',
            size: 200,
            align: 'center',
            enableSorting: false,
            cell: ({ row }) => (
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    <Tooltip title="Gerenciar Escolas">
                        <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => navigate(`/gestao-rotas/${row.original.id}/escolas`)}
                        >
                            <RouteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                        <IconButton 
                            size="small" 
                            color="secondary"
                            onClick={() => abrirModalRota(row.original)}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                        <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => deletarRota(row.original.id)}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            )
        }
    ], [navigate]);

    return (
        <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                <PageHeader title="Gestão de Rotas de Entrega" />

                {/* Legenda de Status */}
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
                ) : (
                    <DataTableAdvanced
                        data={filteredRotas}
                        columns={columns}
                        searchPlaceholder="Buscar rotas..."
                        emptyMessage="Nenhuma rota encontrada"
                        emptyIcon={<RouteIcon sx={{ fontSize: 48, opacity: 0.2 }} />}
                        actions={
                            <>
                                <Button
                                    variant="outlined"
                                    startIcon={<FilterIcon />}
                                    onClick={(e) => setFilterAnchorEl(e.currentTarget)}
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
                            </>
                        }
                    />
                )}

                {/* Popover de Filtros */}
                <Popover
                    open={Boolean(filterAnchorEl)}
                    anchorEl={filterAnchorEl}
                    onClose={() => setFilterAnchorEl(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Box sx={{ p: 2, minWidth: 250 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                            Filtros
                        </Typography>
                        
                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={filters.status || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                label="Status"
                            >
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="ativo">Ativas</MenuItem>
                                <MenuItem value="inativo">Inativas</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <InputLabel>Ordenar por</InputLabel>
                            <Select
                                value={filters.sortBy || 'name'}
                                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                                label="Ordenar por"
                            >
                                <MenuItem value="name">Nome (A-Z)</MenuItem>
                                <MenuItem value="escolas">Mais Escolas</MenuItem>
                                <MenuItem value="status">Status</MenuItem>
                            </Select>
                        </FormControl>

                        <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            onClick={() => {
                                setFilters({});
                                setFilterAnchorEl(null);
                            }}
                        >
                            Limpar Filtros
                        </Button>
                    </Box>
                </Popover>

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
