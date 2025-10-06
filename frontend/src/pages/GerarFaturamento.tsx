import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    IconButton,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Stepper,
    Step,
    StepLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    ExpandMore as ExpandMoreIcon,
    Receipt as ReceiptIcon,
    Calculate as CalculateIcon,
    Send as SendIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import faturamentoService from '../services/faturamento';
import pedidosService from '../services/pedidos';
import type { FaturamentoPrevia, ContratoCalculado, ItemCalculado } from '../types/faturamento';
import type { PedidoDetalhado } from '../types/pedido';
import { formatarMoeda, formatarData } from '../utils/dateUtils';

function GerarFaturamento() {
    const { pedidoId } = useParams<{ pedidoId: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [pedido, setPedido] = useState<PedidoDetalhado | null>(null);
    const [previa, setPrevia] = useState<FaturamentoPrevia | null>(null);
    const [observacoes, setObservacoes] = useState('');
    const [erro, setErro] = useState('');
    const [etapaAtual, setEtapaAtual] = useState(0);
    const [dialogConfirmacao, setDialogConfirmacao] = useState(false);
    const [modalDivisaoItem, setModalDivisaoItem] = useState(false);
    const [itemSelecionado, setItemSelecionado] = useState<ItemCalculado | null>(null);

    const etapas = ['Carregar Dados', 'Calcular Prévia', 'Confirmar', 'Gerar Faturamento'];

    useEffect(() => {
        carregarDados();
    }, [pedidoId]);

    const carregarDados = async () => {
        try {
            setCarregando(true);
            setErro('');

            const pedidoData = await pedidosService.buscarPorId(Number(pedidoId));
            setPedido(pedidoData);
            setEtapaAtual(1);

            // Verificar se o pedido pode gerar faturamento
            if (pedidoData.status === 'rascunho') {
                setErro('Não é possível gerar faturamento para pedidos em rascunho');
                return;
            }

            // Calcular prévia automaticamente
            await calcularPrevia();

        } catch (error: any) {
            console.error('Erro ao carregar dados:', error);
            setErro(error.response?.data?.message || 'Erro ao carregar dados do pedido');
        } finally {
            setCarregando(false);
        }
    };

    const calcularPrevia = async () => {
        try {
            setLoading(true);
            setErro('');

            const previaData = await faturamentoService.calcularPrevia(Number(pedidoId));
            setPrevia(previaData);
            setEtapaAtual(2);

        } catch (error: any) {
            console.error('Erro ao calcular prévia:', error);
            setErro(error.response?.data?.message || 'Erro ao calcular prévia do faturamento');
        } finally {
            setLoading(false);
        }
    };

    const confirmarGeracao = () => {
        setDialogConfirmacao(true);
    };

    const gerarFaturamento = async () => {
        try {
            setLoading(true);
            setErro('');
            setEtapaAtual(3);

            const resultado = await faturamentoService.gerar({
                pedido_id: Number(pedidoId),
                observacoes: observacoes || undefined
            });

            setDialogConfirmacao(false);

            // Redirecionar para o faturamento gerado
            navigate(`/faturamentos/${resultado.faturamento.id}`);

        } catch (error: any) {
            console.error('Erro ao gerar faturamento:', error);
            setErro(error.response?.data?.message || 'Erro ao gerar faturamento');
            setEtapaAtual(2); // Voltar para a etapa de confirmação
        } finally {
            setLoading(false);
        }
    };

    const formatarPercentual = (valor: number) => {
        return `${valor.toFixed(2)}%`;
    };

    const abrirModalDivisao = (item: ItemCalculado) => {
        setItemSelecionado(item);
        setModalDivisaoItem(true);
    };

    const fecharModalDivisao = () => {
        setModalDivisaoItem(false);
        setItemSelecionado(null);
    };

    if (carregando) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Carregando dados do pedido...</Typography>
            </Box>
        );
    }

    if (!pedido) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Pedido não encontrado</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={() => navigate(`/pedidos/${pedidoId}`)} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
                    Gerar Faturamento - Pedido {pedido.numero}
                </Typography>
                <Chip
                    label={pedido.status}
                    color={pedido.status === 'entregue' ? 'success' : 'primary'}
                />
            </Box>

            {/* Stepper */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stepper activeStep={etapaAtual} sx={{ mb: 2 }}>
                        {etapas.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                </CardContent>
            </Card>

            {erro && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
                    {erro}
                </Alert>
            )}

            {/* Informações do Pedido */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Informações do Pedido
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">Número</Typography>
                                <Typography variant="body1" fontWeight="bold">{pedido.numero}</Typography>
                            </Box>

                            <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">Data</Typography>
                                <Typography variant="body1">{formatarData(pedido.data_pedido)}</Typography>
                            </Box>

                            <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">Status</Typography>
                                <Typography variant="body1">{pedido.status}</Typography>
                            </Box>

                            <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">Valor Total</Typography>
                                <Typography variant="h6" color="primary">
                                    {formatarMoeda(pedido.valor_total)}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">Total de Itens</Typography>
                                <Typography variant="body1">{pedido.itens.length}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {previa && (
                    <>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        <CalculateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        Modalidades
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />

                                    {previa.modalidades.map((modalidade) => (
                                        <Box key={modalidade.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                            <Typography variant="body2" fontWeight="bold">
                                                {modalidade.nome}
                                            </Typography>
                                            {modalidade.codigo_financeiro && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Código: {modalidade.codigo_financeiro}
                                                </Typography>
                                            )}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                                <Typography variant="body2">
                                                    Repasse: {formatarMoeda(modalidade.valor_repasse)}
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold" color="primary">
                                                    {formatarPercentual(modalidade.percentual)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Resumo do Faturamento
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />

                                    <Box sx={{ mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">Contratos</Typography>
                                        <Typography variant="body1" fontWeight="bold">
                                            {previa.resumo.total_contratos}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">Fornecedores</Typography>
                                        <Typography variant="body1" fontWeight="bold">
                                            {previa.resumo.total_fornecedores}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">Modalidades</Typography>
                                        <Typography variant="body1" fontWeight="bold">
                                            {previa.resumo.total_modalidades}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">Total de Itens</Typography>
                                        <Typography variant="body1" fontWeight="bold">
                                            {previa.resumo.total_itens}
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Box sx={{ mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">Quantidade Total</Typography>
                                        <Typography variant="body1" fontWeight="bold">
                                            {previa.resumo.quantidade_total}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Valor Total</Typography>
                                        <Typography variant="h6" color="primary" fontWeight="bold">
                                            {formatarMoeda(previa.resumo.valor_total)}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Detalhamento por Contrato */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Detalhamento por Contrato e Modalidade
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />

                                    {previa.contratos.map((contrato: ContratoCalculado) => (
                                        <Accordion key={contrato.contrato_id} sx={{ mb: 2 }}>
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                    <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                                                        Contrato {contrato.contrato_numero} - {contrato.fornecedor_nome}
                                                    </Typography>
                                                    <Chip
                                                        label={`${contrato.itens.length} itens`}
                                                        size="small"
                                                        sx={{ mr: 2 }}
                                                    />
                                                    <Typography variant="body2" color="primary" fontWeight="bold">
                                                        {formatarMoeda(contrato.valor_total)}
                                                    </Typography>
                                                </Box>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                <TableContainer component={Paper} variant="outlined">
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Produto</TableCell>
                                                                <TableCell>Unidade</TableCell>
                                                                <TableCell align="right">Quantidade</TableCell>
                                                                <TableCell align="right">Preço Unit.</TableCell>
                                                                <TableCell align="right">Valor Total</TableCell>
                                                                <TableCell align="center">Divisão</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {contrato.itens.map((item: ItemCalculado) => (
                                                                <TableRow key={item.pedido_item_id}>
                                                                    <TableCell>{item.produto_nome}</TableCell>
                                                                    <TableCell>{item.unidade_medida}</TableCell>
                                                                    <TableCell align="right">{item.quantidade_original}</TableCell>
                                                                    <TableCell align="right">{formatarMoeda(item.preco_unitario)}</TableCell>
                                                                    <TableCell align="right">
                                                                        <Typography variant="body2" fontWeight="bold" color="primary">
                                                                            {formatarMoeda(item.valor_original)}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell align="center">
                                                                        <Button
                                                                            size="small"
                                                                            variant="outlined"
                                                                            startIcon={<VisibilityIcon />}
                                                                            onClick={() => abrirModalDivisao(item)}
                                                                        >
                                                                            Ver Divisão
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </AccordionDetails>
                                        </Accordion>
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Observações e Ações */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Observações do Faturamento
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />

                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        value={observacoes}
                                        onChange={(e) => setObservacoes(e.target.value)}
                                        placeholder="Observações sobre o faturamento (opcional)..."
                                        sx={{ mb: 3 }}
                                    />

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                        <Button
                                            variant="outlined"
                                            onClick={() => navigate(`/pedidos/${pedidoId}`)}
                                            disabled={loading}
                                        >
                                            Voltar ao Pedido
                                        </Button>

                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <Button
                                                variant="outlined"
                                                startIcon={<CalculateIcon />}
                                                onClick={calcularPrevia}
                                                disabled={loading}
                                            >
                                                Recalcular
                                            </Button>
                                            <Button
                                                variant="contained"
                                                startIcon={<SendIcon />}
                                                onClick={confirmarGeracao}
                                                disabled={loading}
                                            >
                                                Gerar Faturamento
                                            </Button>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </>
                )}
            </Grid>

            {/* Dialog de Confirmação */}
            <Dialog open={dialogConfirmacao} onClose={() => setDialogConfirmacao(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Confirmar Geração do Faturamento
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Tem certeza que deseja gerar o faturamento para o pedido <strong>{pedido.numero}</strong>?
                    </Typography>

                    {previa && (
                        <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Resumo do faturamento:
                            </Typography>
                            <Typography variant="body2">
                                • {previa.resumo.total_contratos} contratos de {previa.resumo.total_fornecedores} fornecedores
                            </Typography>
                            <Typography variant="body2">
                                • {previa.resumo.total_itens} itens divididos entre {previa.resumo.total_modalidades} modalidades
                            </Typography>
                            <Typography variant="body2">
                                • Valor total: <strong>{formatarMoeda(previa.resumo.valor_total)}</strong>
                            </Typography>
                        </Box>
                    )}

                    <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
                        Esta ação não pode ser desfeita. O faturamento será criado e poderá ser processado.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogConfirmacao(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={gerarFaturamento}
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? 'Gerando...' : 'Confirmar Geração'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Divisão por Modalidade */}
            <Dialog open={modalDivisaoItem} onClose={fecharModalDivisao} maxWidth="md" fullWidth>
                <DialogTitle>
                    Divisão por Modalidade
                    {itemSelecionado && (
                        <Typography variant="subtitle1" color="text.secondary">
                            {itemSelecionado.produto_nome}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    {itemSelecionado && (
                        <Box>
                            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">Informações do Item</Typography>
                                <Typography variant="body1">
                                    <strong>Produto:</strong> {itemSelecionado.produto_nome}
                                </Typography>
                                <Typography variant="body1">
                                    <strong>Unidade:</strong> {itemSelecionado.unidade_medida}
                                </Typography>
                                <Typography variant="body1">
                                    <strong>Quantidade Total:</strong> {itemSelecionado.quantidade_original}
                                </Typography>
                                <Typography variant="body1">
                                    <strong>Preço Unitário:</strong> {formatarMoeda(itemSelecionado.preco_unitario)}
                                </Typography>
                                <Typography variant="body1">
                                    <strong>Valor Total:</strong> {formatarMoeda(itemSelecionado.valor_original)}
                                </Typography>
                            </Box>

                            <Typography variant="h6" gutterBottom>
                                Divisão por Modalidade
                            </Typography>
                            
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: 'grey.50' }}>
                                            <TableCell>Modalidade</TableCell>
                                            <TableCell align="right">Quantidade</TableCell>
                                            <TableCell align="right">Percentual</TableCell>
                                            <TableCell align="right">Valor</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {itemSelecionado.divisoes.map((divisao, index) => (
                                            <TableRow key={index} hover>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {divisao.modalidade_nome}
                                                        </Typography>
                                                        {divisao.modalidade_codigo_financeiro && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                Código: {divisao.modalidade_codigo_financeiro}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={divisao.quantidade > 0 ? 'bold' : 'normal'}
                                                        color={divisao.quantidade > 0 ? 'primary' : 'text.secondary'}
                                                    >
                                                        {divisao.quantidade}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">
                                                        {formatarPercentual(divisao.percentual)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={divisao.valor > 0 ? 'bold' : 'normal'}
                                                        color={divisao.valor > 0 ? 'primary' : 'text.secondary'}
                                                    >
                                                        {formatarMoeda(divisao.valor)}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={fecharModalDivisao}>
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default GerarFaturamento;