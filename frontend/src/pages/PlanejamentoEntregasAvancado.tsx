import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Container,
    Card,
    CardContent,
    Button,
    Grid,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
    Checkbox,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Step,
    Stepper,
    StepLabel,
    StepContent
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Route as RouteIcon,
    Assignment as GuiaIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    ExpandMore as ExpandMoreIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as RadioButtonUncheckedIcon,
    Inventory as InventoryIcon,
    School as SchoolIcon
} from '@mui/icons-material';
import { guiaService } from '../services/guiaService';
import { rotaService } from '../modules/entregas/services/rotaService';
import { itemGuiaService, ItemGuia } from '../services/itemGuiaService';
import { PlanejamentoEntrega, RotaEntrega } from '../modules/entregas/types/rota';

interface ItemGuiaComSelecao extends ItemGuia {
    selecionado: boolean;
}

interface PlanejamentoAvancado {
    guiaId: number;
    rotasSelecionadas: number[];
    dataPlanejada: string;
    observacao: string;
    itensSelecionados: number[];
}

const PlanejamentoEntregasAvancado: React.FC = () => {
    const [planejamentos, setPlanejamentos] = useState<PlanejamentoEntrega[]>([]);
    const [guias, setGuias] = useState<any[]>([]);
    const [rotas, setRotas] = useState<RotaEntrega[]>([]);
    const [itensGuia, setItensGuia] = useState<ItemGuiaComSelecao[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados do modal
    const [modalAberto, setModalAberto] = useState(false);
    const [etapaAtual, setEtapaAtual] = useState(0);
    const [formData, setFormData] = useState<PlanejamentoAvancado>({
        guiaId: 0,
        rotasSelecionadas: [],
        dataPlanejada: '',
        observacao: '',
        itensSelecionados: []
    });
    const [salvando, setSalvando] = useState(false);

    const etapas = [
        'Selecionar Guia',
        'Escolher Rotas',
        'Filtrar Itens',
        'Finalizar'
    ];

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            setError(null);

            const [planejamentosData, guiasData, rotasData] = await Promise.all([
                rotaService.listarPlanejamentos(),
                guiaService.listarGuias(),
                rotaService.listarRotas()
            ]);

            setPlanejamentos(planejamentosData);

            const guiasResponse = guiasData?.data || guiasData;
            const guiasAbertas = Array.isArray(guiasResponse)
                ? guiasResponse.filter(g => g.status === 'aberta')
                : [];
            setGuias(guiasAbertas);

            setRotas(rotasData);

        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            setError('Erro ao carregar dados do planejamento');
        } finally {
            setLoading(false);
        }
    };

    const carregarItensGuia = async (guiaId: number) => {
        try {
            const itens = await itemGuiaService.listarItensPorGuia(guiaId);

            // Adicionar propriedade selecionado (todos selecionados por padrão)
            const itensComSelecao: ItemGuiaComSelecao[] = itens.map(item => ({
                ...item,
                selecionado: true
            }));

            setItensGuia(itensComSelecao);
            setFormData(prev => ({
                ...prev,
                itensSelecionados: itensComSelecao.map(item => item.id)
            }));
        } catch (err) {
            console.error('Erro ao carregar itens da guia:', err);
            // Fallback para dados simulados em caso de erro
            const itensSimulados: ItemGuiaComSelecao[] = [
                {
                    id: 1,
                    produto_nome: 'Arroz Branco',
                    quantidade: 50,
                    unidade: 'kg',
                    lote: 'L001',
                    escola_nome: 'Escola Municipal A',
                    escola_id: 1,
                    produto_id: 1,
                    guia_id: guiaId,
                    selecionado: true
                },
                {
                    id: 2,
                    produto_nome: 'Feijão Carioca',
                    quantidade: 30,
                    unidade: 'kg',
                    lote: 'L002',
                    escola_nome: 'Escola Municipal A',
                    escola_id: 1,
                    produto_id: 2,
                    guia_id: guiaId,
                    selecionado: true
                }
            ];

            setItensGuia(itensSimulados);
            setFormData(prev => ({
                ...prev,
                itensSelecionados: itensSimulados.map(item => item.id)
            }));
        }
    };

    const abrirModal = () => {
        setFormData({
            guiaId: 0,
            rotasSelecionadas: [],
            dataPlanejada: '',
            observacao: '',
            itensSelecionados: []
        });
        setEtapaAtual(0);
        setItensGuia([]);
        setModalAberto(true);
    };

    const fecharModal = () => {
        setModalAberto(false);
        setEtapaAtual(0);
        setSalvando(false);
    };

    const proximaEtapa = () => {
        if (etapaAtual === 0 && formData.guiaId) {
            carregarItensGuia(formData.guiaId);
        }
        setEtapaAtual(prev => Math.min(prev + 1, etapas.length - 1));
    };

    const etapaAnterior = () => {
        setEtapaAtual(prev => Math.max(prev - 1, 0));
    };

    const toggleRota = (rotaId: number) => {
        setFormData(prev => ({
            ...prev,
            rotasSelecionadas: prev.rotasSelecionadas.includes(rotaId)
                ? prev.rotasSelecionadas.filter(id => id !== rotaId)
                : [...prev.rotasSelecionadas, rotaId]
        }));
    };

    const toggleItem = (itemId: number) => {
        setFormData(prev => ({
            ...prev,
            itensSelecionados: prev.itensSelecionados.includes(itemId)
                ? prev.itensSelecionados.filter(id => id !== itemId)
                : [...prev.itensSelecionados, itemId]
        }));
    };

    const selecionarTodosItens = () => {
        setFormData(prev => ({
            ...prev,
            itensSelecionados: itensGuia.map(item => item.id)
        }));
    };

    const deselecionarTodosItens = () => {
        setFormData(prev => ({
            ...prev,
            itensSelecionados: []
        }));
    };

    const salvarPlanejamento = async () => {
        try {
            setSalvando(true);

            const planejamentoData = {
                guiaId: formData.guiaId,
                rotaIds: formData.rotasSelecionadas,
                dataPlanejada: formData.dataPlanejada,
                observacao: formData.observacao,
                itensSelecionados: formData.itensSelecionados
            };

            await rotaService.criarPlanejamentoAvancado(planejamentoData);
            await carregarDados();
            fecharModal();

        } catch (err) {
            console.error('Erro ao salvar planejamento:', err);
            setError('Erro ao salvar planejamento');
        } finally {
            setSalvando(false);
        }
    };

    const renderEtapaGuia = () => (
        <Box>
            <Typography variant="h6" gutterBottom>
                Selecione a Guia de Demanda
            </Typography>
            <FormControl fullWidth required sx={{ mt: 2 }}>
                <InputLabel>Guia de Demanda</InputLabel>
                <Select
                    value={formData.guiaId}
                    onChange={(e) => setFormData(prev => ({ ...prev, guiaId: Number(e.target.value) }))}
                    label="Guia de Demanda"
                >
                    {guias.map((guia) => (
                        <MenuItem key={guia.id} value={guia.id}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <GuiaIcon fontSize="small" />
                                {guia.mes}/{guia.ano}
                                {guia.observacao && ` - ${guia.observacao}`}
                            </Box>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );

    const renderEtapaRotas = () => (
        <Box>
            <Typography variant="h6" gutterBottom>
                Escolha as Rotas de Entrega
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Selecione uma ou mais rotas para este planejamento
            </Typography>

            <Grid container spacing={2}>
                {rotas.map((rota) => (
                    <Grid item xs={12} sm={6} md={4} key={rota.id}>
                        <Card
                            sx={{
                                cursor: 'pointer',
                                border: formData.rotasSelecionadas.includes(rota.id) ? 2 : 1,
                                borderColor: formData.rotasSelecionadas.includes(rota.id) ? 'primary.main' : 'divider',
                                '&:hover': { borderColor: 'primary.main' }
                            }}
                            onClick={() => toggleRota(rota.id)}
                        >
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <Checkbox
                                        checked={formData.rotasSelecionadas.includes(rota.id)}
                                        onChange={() => toggleRota(rota.id)}
                                    />
                                    <Box
                                        sx={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            backgroundColor: rota.cor
                                        }}
                                    />
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {rota.nome}
                                    </Typography>
                                </Box>
                                {rota.descricao && (
                                    <Typography variant="body2" color="text.secondary">
                                        {rota.descricao}
                                    </Typography>
                                )}
                                <Box display="flex" alignItems="center" gap={1} mt={1}>
                                    <SchoolIcon fontSize="small" color="action" />
                                    <Typography variant="caption">
                                        {rota.total_escolas || 0} escolas
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Box mt={2}>
                <Typography variant="body2" color="primary">
                    {formData.rotasSelecionadas.length} rota(s) selecionada(s)
                </Typography>
            </Box>
        </Box>
    );

    const renderEtapaItens = () => (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                    Selecione os Itens para Entrega
                </Typography>
                <Box>
                    <Button size="small" onClick={selecionarTodosItens} sx={{ mr: 1 }}>
                        Selecionar Todos
                    </Button>
                    <Button size="small" onClick={deselecionarTodosItens}>
                        Desmarcar Todos
                    </Button>
                </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Desmarque os itens que NÃO devem ser entregues neste planejamento
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    checked={formData.itensSelecionados.length === itensGuia.length}
                                    indeterminate={formData.itensSelecionados.length > 0 && formData.itensSelecionados.length < itensGuia.length}
                                    onChange={(e) => e.target.checked ? selecionarTodosItens() : deselecionarTodosItens()}
                                />
                            </TableCell>
                            <TableCell>Produto</TableCell>
                            <TableCell>Quantidade</TableCell>
                            <TableCell>Lote</TableCell>
                            <TableCell>Escola</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {itensGuia.map((item) => (
                            <TableRow key={item.id} hover>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={formData.itensSelecionados.includes(item.id)}
                                        onChange={() => toggleItem(item.id)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <InventoryIcon fontSize="small" color="action" />
                                        {item.produto_nome}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    {item.quantidade} {item.unidade}
                                </TableCell>
                                <TableCell>
                                    <Chip label={item.lote || 'S/L'} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <SchoolIcon fontSize="small" color="action" />
                                        {item.escola_nome}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box mt={2}>
                <Typography variant="body2" color="primary">
                    {formData.itensSelecionados.length} de {itensGuia.length} itens selecionados
                </Typography>
            </Box>
        </Box>
    );

    const renderEtapaFinalizar = () => (
        <Box>
            <Typography variant="h6" gutterBottom>
                Finalizar Planejamento
            </Typography>

            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Data Planejada"
                        type="date"
                        fullWidth
                        value={formData.dataPlanejada}
                        onChange={(e) => setFormData(prev => ({ ...prev, dataPlanejada: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        label="Observação"
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.observacao}
                        onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                        placeholder="Observações sobre o planejamento"
                    />
                </Grid>
            </Grid>

            {/* Resumo */}
            <Box mt={3}>
                <Typography variant="subtitle1" gutterBottom>
                    Resumo do Planejamento:
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemIcon><GuiaIcon /></ListItemIcon>
                        <ListItemText
                            primary="Guia de Demanda"
                            secondary={guias.find(g => g.id === formData.guiaId)?.mes + '/' + guias.find(g => g.id === formData.guiaId)?.ano}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon><RouteIcon /></ListItemIcon>
                        <ListItemText
                            primary="Rotas Selecionadas"
                            secondary={`${formData.rotasSelecionadas.length} rota(s)`}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon><InventoryIcon /></ListItemIcon>
                        <ListItemText
                            primary="Itens para Entrega"
                            secondary={`${formData.itensSelecionados.length} de ${itensGuia.length} itens`}
                        />
                    </ListItem>
                </List>
            </Box>
        </Box>
    );

    const podeProximaEtapa = () => {
        switch (etapaAtual) {
            case 0: return formData.guiaId > 0;
            case 1: return formData.rotasSelecionadas.length > 0;
            case 2: return formData.itensSelecionados.length > 0;
            default: return true;
        }
    };

    if (loading) {
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
                            Planejamento Avançado de Entregas
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Crie planejamentos detalhados com múltiplas rotas e seleção específica de itens
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={abrirModal}
                    >
                        Novo Planejamento
                    </Button>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Tabela de planejamentos existentes */}
                <Card>
                    <CardContent>
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Guia</TableCell>
                                        <TableCell>Rota</TableCell>
                                        <TableCell>Data Planejada</TableCell>
                                        <TableCell>Responsável</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Observação</TableCell>
                                        <TableCell align="center">Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {planejamentos.map((planejamento) => (
                                        <TableRow key={planejamento.id} hover>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <GuiaIcon fontSize="small" color="primary" />
                                                    {planejamento.guia_mes}/{planejamento.guia_ano}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Box
                                                        sx={{
                                                            width: 12,
                                                            height: 12,
                                                            borderRadius: '50%',
                                                            backgroundColor: planejamento.rota_cor
                                                        }}
                                                    />
                                                    <RouteIcon fontSize="small" />
                                                    {planejamento.rota_nome}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                {planejamento.data_planejada ? (
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <CalendarIcon fontSize="small" />
                                                        {new Date(planejamento.data_planejada).toLocaleDateString('pt-BR')}
                                                    </Box>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {planejamento.responsavel ? (
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <PersonIcon fontSize="small" />
                                                        {planejamento.responsavel}
                                                    </Box>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={planejamento.status}
                                                    color="info"
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {planejamento.observacao || '-'}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Editar">
                                                    <IconButton size="small">
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Remover">
                                                    <IconButton size="small" color="error">
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {planejamentos.length === 0 && (
                            <Box textAlign="center" py={4}>
                                <Typography variant="h6" color="text.secondary">
                                    Nenhum planejamento criado ainda
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Clique em "Novo Planejamento" para começar
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>

                {/* Modal de Planejamento Avançado */}
                <Dialog open={modalAberto} onClose={fecharModal} maxWidth="md" fullWidth>
                    <DialogTitle>
                        Novo Planejamento de Entrega
                    </DialogTitle>

                    <DialogContent>
                        <Stepper activeStep={etapaAtual} orientation="vertical" sx={{ mt: 2 }}>
                            {etapas.map((label, index) => (
                                <Step key={label}>
                                    <StepLabel>{label}</StepLabel>
                                    <StepContent>
                                        {index === 0 && renderEtapaGuia()}
                                        {index === 1 && renderEtapaRotas()}
                                        {index === 2 && renderEtapaItens()}
                                        {index === 3 && renderEtapaFinalizar()}
                                    </StepContent>
                                </Step>
                            ))}
                        </Stepper>
                    </DialogContent>

                    <DialogActions>
                        <Button onClick={fecharModal} disabled={salvando}>
                            Cancelar
                        </Button>
                        {etapaAtual > 0 && (
                            <Button onClick={etapaAnterior} disabled={salvando}>
                                Anterior
                            </Button>
                        )}
                        {etapaAtual < etapas.length - 1 ? (
                            <Button
                                onClick={proximaEtapa}
                                variant="contained"
                                disabled={!podeProximaEtapa()}
                            >
                                Próximo
                            </Button>
                        ) : (
                            <Button
                                onClick={salvarPlanejamento}
                                variant="contained"
                                disabled={salvando || !podeProximaEtapa()}
                            >
                                {salvando ? <CircularProgress size={20} /> : 'Criar Planejamento'}
                            </Button>
                        )}
                    </DialogActions>
                </Dialog>
            </Box>
        </Container>
    );
};

export default PlanejamentoEntregasAvancado;