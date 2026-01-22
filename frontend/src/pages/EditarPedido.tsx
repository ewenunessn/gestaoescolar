import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
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
    Divider,
    Autocomplete,
    Chip,
    Popover,
    Badge
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Send as SendIcon,
    Comment as CommentIcon
} from '@mui/icons-material';
import pedidosService from '../services/pedidos';
import { ContratoProduto, PedidoDetalhado } from '../types/pedido';
import { formatarMoeda } from '../utils/dateUtils';

// Função para formatar números removendo zeros desnecessários
const formatarNumero = (numero: number): string => {
    const numeroFormatado = parseFloat(numero.toString());
    // Se for número inteiro, não mostra decimais
    return numeroFormatado % 1 === 0 ? numeroFormatado.toFixed(0) : numeroFormatado.toString();
};

interface ItemPedido {
    id?: number;
    contrato_produto_id: number;
    produto_nome: string;
    unidade: string;
    fornecedor_nome: string;
    contrato_numero: string;
    quantidade: number;
    preco_unitario: number;
    valor_total: number;
    data_entrega_prevista: string;
    observacoes?: string;
    saldo_disponivel?: number;
}

export default function EditarPedido() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [pedido, setPedido] = useState<PedidoDetalhado | null>(null);
    const [produtosDisponiveis, setProdutosDisponiveis] = useState<ContratoProduto[]>([]);
    const [produtoSelecionado, setProdutoSelecionado] = useState<ContratoProduto | null>(null);

    const [observacoes, setObservacoes] = useState('');
    const [itens, setItens] = useState<ItemPedido[]>([]);
    const [erro, setErro] = useState('');

    // Estado para o popover de observações
    const [obsAnchorEl, setObsAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [obsItemIndex, setObsItemIndex] = useState<number | null>(null);
    const [obsTemp, setObsTemp] = useState('');

    // Data padrão: 7 dias a partir de hoje
    const getDataPadrao = () => {
        const data = new Date();
        data.setDate(data.getDate() + 7);
        return data.toISOString().split('T')[0];
    };

    useEffect(() => {
        carregarDados();
    }, [id]);

    const carregarDados = async () => {
        try {
            setCarregando(true);
            const [pedidoRes, produtosRes] = await Promise.all([
                pedidosService.buscarPorId(Number(id)),
                pedidosService.listarTodosProdutosDisponiveis()
            ]);

            setPedido(pedidoRes);
            setProdutosDisponiveis(produtosRes);
            setObservacoes(pedidoRes.observacoes || '');

            // Converter itens do pedido para formato de edição
            const itensConvertidos: ItemPedido[] = pedidoRes.itens.map(item => ({
                id: item.id,
                contrato_produto_id: item.contrato_produto_id,
                produto_nome: item.produto_nome || '',
                unidade: item.unidade || '',
                fornecedor_nome: item.fornecedor_nome || '',
                contrato_numero: item.contrato_numero || '',
                quantidade: parseFloat(item.quantidade) || 0, // Remove zeros desnecessários
                preco_unitario: parseFloat(item.preco_unitario) || 0, // Garantir que é número
                valor_total: parseFloat(item.valor_total) || 0, // Garantir que é número
                data_entrega_prevista: item.data_entrega_prevista || getDataPadrao(),
                observacoes: item.observacoes || '',
                saldo_disponivel: parseFloat((item as any).saldo_disponivel) || 0
            }));

            setItens(itensConvertidos);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setErro('Erro ao carregar dados do pedido');
        } finally {
            setCarregando(false);
        }
    };

    const adicionarProduto = () => {
        if (!produtoSelecionado) {
            setErro('Selecione um produto');
            return;
        }

        // Verificar se o produto já foi adicionado
        const produtoJaAdicionado = itens.find(item => item.contrato_produto_id === produtoSelecionado.contrato_produto_id);
        if (produtoJaAdicionado) {
            setErro('Este produto já foi adicionado ao pedido');
            return;
        }

        const novoItem: ItemPedido = {
            contrato_produto_id: produtoSelecionado.contrato_produto_id,
            produto_nome: produtoSelecionado.produto_nome,
            unidade: produtoSelecionado.unidade,
            fornecedor_nome: produtoSelecionado.fornecedor_nome,
            contrato_numero: produtoSelecionado.contrato_numero,
            quantidade: 1,
            preco_unitario: produtoSelecionado.preco_unitario,
            valor_total: produtoSelecionado.preco_unitario,
            data_entrega_prevista: getDataPadrao(),
            observacoes: '',
            saldo_disponivel: produtoSelecionado.saldo_disponivel || produtoSelecionado.quantidade_contratada
        };

        setItens([...itens, novoItem]);
        setProdutoSelecionado(null);
        setErro('');
    };

    const removerItem = (index: number) => {
        setItens(itens.filter((_, i) => i !== index));
    };

    const atualizarQuantidade = (index: number, quantidade: number) => {
        const novosItens = [...itens];
        novosItens[index].quantidade = quantidade;
        novosItens[index].valor_total = quantidade * novosItens[index].preco_unitario;
        setItens(novosItens);
    };

    const atualizarDataEntrega = (index: number, data: string) => {
        const novosItens = [...itens];
        novosItens[index].data_entrega_prevista = data;
        setItens(novosItens);
    };

    const atualizarObservacoes = (index: number, observacoes: string) => {
        const novosItens = [...itens];
        novosItens[index].observacoes = observacoes;
        setItens(novosItens);
    };

    const abrirObservacoes = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
        setObsAnchorEl(event.currentTarget);
        setObsItemIndex(index);
        setObsTemp(itens[index].observacoes || '');
    };

    const fecharObservacoes = () => {
        setObsAnchorEl(null);
        setObsItemIndex(null);
        setObsTemp('');
    };

    const salvarObservacoes = () => {
        if (obsItemIndex !== null) {
            atualizarObservacoes(obsItemIndex, obsTemp);
        }
        fecharObservacoes();
    };

    const obsPopoverOpen = Boolean(obsAnchorEl);

    const calcularValorTotal = () => {
        return itens.reduce((total, item) => {
            const valor = parseFloat(item.valor_total) || 0;
            return total + valor;
        }, 0);
    };

    const agruparPorFornecedor = () => {
        const grupos: { [key: string]: ItemPedido[] } = {};
        itens.forEach(item => {
            if (!grupos[item.fornecedor_nome]) {
                grupos[item.fornecedor_nome] = [];
            }
            grupos[item.fornecedor_nome].push(item);
        });
        return grupos;
    };

    const validarFormulario = () => {
        if (itens.length === 0) {
            setErro('Adicione pelo menos um item ao pedido');
            return false;
        }
        if (itens.some(item => item.quantidade <= 0)) {
            setErro('Todas as quantidades devem ser maiores que zero');
            return false;
        }
        if (itens.some(item => !item.data_entrega_prevista)) {
            setErro('Todos os itens devem ter data de entrega prevista');
            return false;
        }
        return true;
    };

    const handleSalvar = async (enviarPedido: boolean = false) => {
        if (!validarFormulario()) return;

        try {
            setLoading(true);
            setErro('');

            // Atualizar itens do pedido
            const itensParaEnviar = itens.map(item => ({
                contrato_produto_id: item.contrato_produto_id,
                quantidade: item.quantidade,
                data_entrega_prevista: item.data_entrega_prevista,
                observacoes: item.observacoes
            }));

            await pedidosService.atualizarItens(Number(id), itensParaEnviar);

            // Atualizar observações gerais
            await pedidosService.atualizar(Number(id), {
                observacoes: observacoes || undefined
            });

            // Se for para enviar o pedido (sair do rascunho)
            if (enviarPedido) {
                await pedidosService.atualizarStatus(Number(id), 'pendente');
            }

            // Redirecionar para detalhes
            navigate(`/pedidos/${id}`);
        } catch (error: any) {
            console.error('Erro ao salvar pedido:', error);
            setErro(error.response?.data?.message || 'Erro ao salvar pedido');
        } finally {
            setLoading(false);
        }
    };

    const gruposFornecedores = agruparPorFornecedor();
    const totalFornecedores = Object.keys(gruposFornecedores).length;

    if (carregando) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Carregando pedido...</Typography>
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

    if (pedido.status !== 'rascunho') {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning">
                    Apenas pedidos em rascunho podem ser editados.
                </Alert>
                <Button
                    variant="outlined"
                    onClick={() => navigate(`/pedidos/${id}`)}
                    sx={{ mt: 2 }}
                >
                    Voltar para Detalhes
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={() => navigate(`/pedidos/${id}`)} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1">
                    Editar Pedido {pedido.numero}
                </Typography>
                <Chip label="Rascunho" color="warning" sx={{ ml: 2 }} />
            </Box>

            {erro && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
                    {erro}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Adicionar Produtos
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={9}>
                                    <Autocomplete
                                        value={produtoSelecionado}
                                        onChange={(_, newValue) => setProdutoSelecionado(newValue)}
                                        options={produtosDisponiveis}
                                        groupBy={(option) => option.fornecedor_nome}
                                        getOptionLabel={(option) =>
                                            `${option.produto_nome} - ${option.fornecedor_nome} (${formatarMoeda(option.preco_unitario)}/${option.unidade})`
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Buscar produto"
                                                placeholder="Digite para buscar..."
                                            />
                                        )}
                                        renderOption={(props, option) => (
                                            <li {...props}>
                                                <Box>
                                                    <Typography variant="body2">
                                                        <strong>{option.produto_nome}</strong>
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {option.fornecedor_nome} - Contrato {option.contrato_numero} - {formatarMoeda(option.preco_unitario)}/{option.unidade}
                                                    </Typography>
                                                </Box>
                                            </li>
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={adicionarProduto}
                                        disabled={!produtoSelecionado}
                                    >
                                        Adicionar
                                    </Button>
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 3 }}>
                                <TextField
                                    fullWidth
                                    label="Observações Gerais do Pedido"
                                    multiline
                                    rows={2}
                                    value={observacoes}
                                    onChange={(e) => setObservacoes(e.target.value)}
                                    placeholder="Observações que se aplicam a todo o pedido..."
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Resumo
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>Total de Itens:</Typography>
                                <Typography fontWeight="bold">{itens.length}</Typography>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>Fornecedores:</Typography>
                                <Typography fontWeight="bold">{totalFornecedores}</Typography>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Valor Total:</Typography>
                                <Typography variant="h6" color="primary" fontWeight="bold">
                                    {formatarMoeda(calcularValorTotal())}
                                </Typography>
                            </Box>

                            {totalFornecedores > 0 && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Fornecedores no pedido:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {Object.keys(gruposFornecedores).map(fornecedor => (
                                            <Chip
                                                key={fornecedor}
                                                label={`${fornecedor} (${gruposFornecedores[fornecedor].length})`}
                                                size="small"
                                                color="primary"
                                            />
                                        ))}
                                    </Box>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Itens do Pedido
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Produto</TableCell>
                                            <TableCell>Fornecedor / Contrato</TableCell>
                                            <TableCell align="center">Unidade</TableCell>
                                            <TableCell align="center">Saldo Disponível</TableCell>
                                            <TableCell align="center" width="120">Quantidade</TableCell>
                                            <TableCell align="center" width="160">Data Entrega</TableCell>
                                            <TableCell align="center">Preço Unit.</TableCell>
                                            <TableCell align="center">Valor Total</TableCell>
                                            <TableCell align="center" width="100">Ações</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {itens.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">
                                                        Nenhum item no pedido
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            itens.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.produto_nome}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2">{item.fornecedor_nome}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Contrato {item.contrato_numero}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">{item.unidade}</TableCell>
                                                    <TableCell align="center">
                                                        <Typography variant="body2" color="primary" fontWeight="bold">
                                                            {formatarNumero(Number(item.saldo_disponivel) || 0)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                                        <TextField
                                                            type="number"
                                                            size="small"
                                                            value={item.quantidade}
                                                            onChange={(e) => atualizarQuantidade(index, parseFloat(e.target.value) || 0)}
                                                            inputProps={{ min: 0, step: 1 }}
                                                            fullWidth
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                                        <TextField
                                                            type="date"
                                                            size="small"
                                                            value={item.data_entrega_prevista}
                                                            onChange={(e) => atualizarDataEntrega(index, e.target.value)}
                                                            fullWidth
                                                            InputLabelProps={{ shrink: true }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {formatarMoeda(item.preco_unitario)}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography fontWeight="bold">
                                                            {formatarMoeda(item.valor_total)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => abrirObservacoes(e, index)}
                                                                color={item.observacoes ? 'primary' : 'default'}
                                                            >
                                                                <Badge 
                                                                    variant="dot" 
                                                                    color="primary" 
                                                                    invisible={!item.observacoes}
                                                                >
                                                                    <CommentIcon fontSize="small" />
                                                                </Badge>
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => removerItem(index)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Popover para observações */}
                            <Popover
                                open={obsPopoverOpen}
                                anchorEl={obsAnchorEl}
                                onClose={fecharObservacoes}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'center',
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'center',
                                }}
                            >
                                <Box sx={{ p: 2, width: 350 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Observações do Item
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        value={obsTemp}
                                        onChange={(e) => setObsTemp(e.target.value)}
                                        placeholder="Digite observações específicas para este item..."
                                        autoFocus
                                        sx={{ mb: 2 }}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                        <Button size="small" onClick={fecharObservacoes}>
                                            Cancelar
                                        </Button>
                                        <Button size="small" variant="contained" onClick={salvarObservacoes}>
                                            Salvar
                                        </Button>
                                    </Box>
                                </Box>
                            </Popover>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={() => navigate(`/pedidos/${id}`)}
                            disabled={loading}
                        >
                            Cancelar Edição
                        </Button>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                startIcon={<SaveIcon />}
                                onClick={() => handleSalvar(false)}
                                disabled={loading || itens.length === 0}
                            >
                                {loading ? 'Salvando...' : 'Salvar Rascunho'}
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<SendIcon />}
                                onClick={() => handleSalvar(true)}
                                disabled={loading || itens.length === 0}
                            >
                                {loading ? 'Enviando...' : 'Salvar e Enviar Pedido'}
                            </Button>
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}