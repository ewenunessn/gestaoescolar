import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Typography,
    IconButton,
    Alert,
    Divider,
    Autocomplete,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Clear as ClearIcon
} from '@mui/icons-material';
import pedidosService from '../services/pedidos';
import { ContratoProduto, PedidoDetalhado } from '../types/pedido';
import { formatarMoeda, formatarData } from '../utils/dateUtils';

const formatarNumero = (numero: number): string => {
    const numeroFormatado = parseFloat(numero.toString());
    return numeroFormatado % 1 === 0 ? numeroFormatado.toFixed(0) : numeroFormatado.toString();
};

interface ItemCompra {
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
    saldo_disponivel: number;
}

export default function CompraForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [carregando, setCarregando] = useState(isEdit);
    const [compra, setCompra] = useState<PedidoDetalhado | null>(null);
    const [produtosDisponiveis, setProdutosDisponiveis] = useState<ContratoProduto[]>([]);
    const [itens, setItens] = useState<ItemCompra[]>([]);
    const [observacoes, setObservacoes] = useState('');
    const [competenciaMesAno, setCompetenciaMesAno] = useState(() => {
        const hoje = new Date();
        return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    });
    const [erro, setErro] = useState('');

    // Diálogo inicial para nova compra
    const [dialogInicialOpen, setDialogInicialOpen] = useState(!isEdit);
    const [competenciaTemp, setCompetenciaTemp] = useState(() => {
        const hoje = new Date();
        return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    });
    const [observacoesTemp, setObservacoesTemp] = useState('');

    // Estados do diálogo de item
    const [dialogItemOpen, setDialogItemOpen] = useState(false);
    const [itemEditando, setItemEditando] = useState<number | null>(null);
    const [produtoSelecionado, setProdutoSelecionado] = useState<ContratoProduto | null>(null);
    const [quantidade, setQuantidade] = useState<number>(1);
    const [dataEntrega, setDataEntrega] = useState(() => {
        const data = new Date();
        data.setDate(data.getDate() + 7);
        return data.toISOString().split('T')[0];
    });
    const [observacoesItem, setObservacoesItem] = useState('');
    const [erroDialog, setErroDialog] = useState('');
    
    // Estados de validação e controle de mudanças
    const [touchedDialog, setTouchedDialog] = useState<any>({});
    const [formItemInicial, setFormItemInicial] = useState<any>(null);
    const [confirmCloseItem, setConfirmCloseItem] = useState(false);
    const [formCompraInicial, setFormCompraInicial] = useState<any>(null);
    const [confirmCloseCompra, setConfirmCloseCompra] = useState(false);

    useEffect(() => {
        if (isEdit) {
            carregarDados();
        } else {
            carregarProdutos();
        }
    }, [id]);

    const carregarProdutos = async () => {
        try {
            const produtosRes = await pedidosService.listarTodosProdutosDisponiveis();
            setProdutosDisponiveis(produtosRes);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            setErro('Erro ao carregar produtos');
        }
    };

    const carregarDados = async () => {
        try {
            setCarregando(true);
            const [produtosRes, compraRes] = await Promise.all([
                pedidosService.listarTodosProdutosDisponiveis(),
                pedidosService.buscarPorId(Number(id))
            ]);
            
            setProdutosDisponiveis(produtosRes);
            setCompra(compraRes);
            setObservacoes(compraRes.observacoes || '');
            setCompetenciaMesAno(compraRes.competencia_mes_ano || '');

            const itensConvertidos: ItemCompra[] = compraRes.itens.map(item => ({
                id: item.id,
                contrato_produto_id: item.contrato_produto_id,
                produto_nome: item.produto_nome || '',
                unidade: item.unidade || '',
                fornecedor_nome: item.fornecedor_nome || '',
                contrato_numero: item.contrato_numero || '',
                quantidade: parseFloat(item.quantidade) || 0,
                preco_unitario: parseFloat(item.preco_unitario) || 0,
                valor_total: parseFloat(item.valor_total) || 0,
                data_entrega_prevista: item.data_entrega_prevista ? item.data_entrega_prevista.split('T')[0] : '',
                observacoes: item.observacoes || '',
                saldo_disponivel: parseFloat((item as any).saldo_disponivel) || 0
            }));

            setItens(itensConvertidos);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setErro('Erro ao carregar dados');
        } finally {
            setCarregando(false);
        }
    };

    const handleCriarCompraInicial = async () => {
        if (!competenciaTemp) {
            setErro('Informe a competência');
            return;
        }

        try {
            setLoading(true);
            setErro('');

            const dados = {
                observacoes: observacoesTemp || undefined,
                competencia_mes_ano: competenciaTemp,
                itens: []
            };

            const compra = await pedidosService.criar(dados);
            navigate(`/compras/${compra.id}/editar`, { replace: true });
            setDialogInicialOpen(false);
            setCompetenciaMesAno(competenciaTemp);
            setObservacoes(observacoesTemp);
            
        } catch (error: any) {
            console.error('Erro ao criar compra:', error);
            setErro(error.response?.data?.message || 'Erro ao criar compra');
        } finally {
            setLoading(false);
        }
    };

    const abrirDialogAdicionar = () => {
        setItemEditando(null);
        setProdutoSelecionado(null);
        const formInicial = {
            produto: null,
            quantidade: 1,
            dataEntrega: (() => {
                const data = new Date();
                data.setDate(data.getDate() + 7);
                return data.toISOString().split('T')[0];
            })(),
            observacoes: ''
        };
        setQuantidade(1);
        setDataEntrega(formInicial.dataEntrega);
        setObservacoesItem('');
        setErroDialog('');
        setTouchedDialog({});
        setFormItemInicial(JSON.parse(JSON.stringify(formInicial)));
        setDialogItemOpen(true);
    };
    
    const hasUnsavedChangesItem = () => {
        if (!formItemInicial) return false;
        const current = {
            produto: produtoSelecionado,
            quantidade,
            dataEntrega,
            observacoes: observacoesItem
        };
        return JSON.stringify(current) !== JSON.stringify(formItemInicial);
    };
    
    const handleCloseItemDialog = () => {
        if (hasUnsavedChangesItem()) {
            setConfirmCloseItem(true);
        } else {
            setDialogItemOpen(false);
        }
    };
    
    const confirmCloseItemDialog = () => {
        setConfirmCloseItem(false);
        setDialogItemOpen(false);
    };

    const abrirDialogEditar = (index: number) => {
        const item = itens[index];
        setItemEditando(index);
        
        const produto = produtosDisponiveis.find(p => p.contrato_produto_id === item.contrato_produto_id);
        setProdutoSelecionado(produto || null);
        setQuantidade(item.quantidade);
        setDataEntrega(item.data_entrega_prevista);
        setObservacoesItem(item.observacoes || '');
        setErroDialog('');
        setDialogItemOpen(true);
    };

    const calcularValorItem = () => {
        if (!produtoSelecionado || !quantidade) return 0;
        return quantidade * produtoSelecionado.preco_unitario;
    };

    const validarQuantidade = (): boolean => {
        if (!produtoSelecionado) {
            setErroDialog('Selecione um produto');
            return false;
        }
        if (quantidade <= 0) {
            setErroDialog('Quantidade deve ser maior que zero');
            return false;
        }
        const saldoDisponivel = Number(produtoSelecionado.saldo_disponivel) || Number(produtoSelecionado.quantidade_contratada) || 0;
        if (quantidade > saldoDisponivel) {
            setErroDialog(`Quantidade não pode ser maior que o saldo disponível (${formatarNumero(saldoDisponivel)})`);
            return false;
        }
        if (!dataEntrega) {
            setErroDialog('Informe a data de entrega prevista');
            return false;
        }
        return true;
    };

    const handleAdicionarItem = () => {
        if (!validarQuantidade() || !produtoSelecionado) return;

        const novoItem: ItemCompra = {
            contrato_produto_id: produtoSelecionado.contrato_produto_id,
            produto_nome: produtoSelecionado.produto_nome,
            unidade: produtoSelecionado.unidade,
            fornecedor_nome: produtoSelecionado.fornecedor_nome,
            contrato_numero: produtoSelecionado.contrato_numero,
            quantidade: quantidade,
            preco_unitario: produtoSelecionado.preco_unitario,
            valor_total: calcularValorItem(),
            data_entrega_prevista: dataEntrega,
            observacoes: observacoesItem,
            saldo_disponivel: Number(produtoSelecionado.saldo_disponivel) || Number(produtoSelecionado.quantidade_contratada) || 0
        };

        setItens([...itens, novoItem]);
        setDialogItemOpen(false);
    };

    const handleAtualizarItem = () => {
        if (!validarQuantidade() || !produtoSelecionado || itemEditando === null) return;

        const novosItens = [...itens];
        novosItens[itemEditando] = {
            ...novosItens[itemEditando],
            quantidade: quantidade,
            valor_total: calcularValorItem(),
            data_entrega_prevista: dataEntrega,
            observacoes: observacoesItem
        };

        setItens(novosItens);
        setDialogItemOpen(false);
    };

    const removerItem = (index: number) => {
        setItens(itens.filter((_, i) => i !== index));
    };

    const calcularValorTotal = () => {
        return itens.reduce((total, item) => total + item.valor_total, 0);
    };

    const agruparPorFornecedor = () => {
        const grupos: { [key: string]: ItemCompra[] } = {};
        itens.forEach(item => {
            if (!grupos[item.fornecedor_nome]) {
                grupos[item.fornecedor_nome] = [];
            }
            grupos[item.fornecedor_nome].push(item);
        });
        return grupos;
    };

    const handleSalvar = async () => {
        if (itens.length === 0) {
            setErro('Adicione pelo menos um item à compra');
            return;
        }

        try {
            setLoading(true);
            setErro('');

            const dados = {
                observacoes: observacoes || undefined,
                competencia_mes_ano: competenciaMesAno,
                itens: itens.map(item => ({
                    id: item.id,
                    contrato_produto_id: item.contrato_produto_id,
                    quantidade: item.quantidade,
                    data_entrega_prevista: item.data_entrega_prevista,
                    observacoes: item.observacoes
                }))
            };

            await pedidosService.atualizar(Number(id), dados);
            navigate(`/compras/${id}`);
        } catch (error: any) {
            console.error('Erro ao salvar compra:', error);
            setErro(error.response?.data?.message || 'Erro ao salvar compra');
        } finally {
            setLoading(false);
        }
    };

    const gruposFornecedores = agruparPorFornecedor();
    const totalFornecedores = Object.keys(gruposFornecedores).length;

    // Diálogo inicial para criar nova compra
    if (dialogInicialOpen && !isEdit) {
        return (
            <Dialog 
                open={true} 
                maxWidth="sm" 
                fullWidth
                onClose={() => {
                    const hasChanges = competenciaTemp !== (() => {
                        const hoje = new Date();
                        return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
                    })() || observacoesTemp !== '';
                    
                    if (hasChanges) {
                        setConfirmCloseCompra(true);
                    } else {
                        navigate('/compras');
                    }
                }}
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        m: 0
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        Nova Compra
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => {
                            const hasChanges = competenciaTemp !== (() => {
                                const hoje = new Date();
                                return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
                            })() || observacoesTemp !== '';
                            
                            if (hasChanges) {
                                setConfirmCloseCompra(true);
                            } else {
                                navigate('/compras');
                            }
                        }}
                        sx={{ color: 'text.secondary' }}
                    >
                        <ClearIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2, pb: 1 }}>
                    {erro && (
                        <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }} onClose={() => setErro('')}>
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                                {erro}
                            </Typography>
                        </Alert>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Competência (Mês/Ano) *"
                            type="month"
                            value={competenciaTemp}
                            onChange={(e) => setCompetenciaTemp(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            helperText="Define o mês/ano de competência da compra"
                            required
                        />
                        <TextField
                            fullWidth
                            size="small"
                            label="Observações Gerais"
                            multiline
                            rows={3}
                            value={observacoesTemp}
                            onChange={(e) => setObservacoesTemp(e.target.value)}
                            placeholder="Observações que se aplicam a toda a compra..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                    <Button onClick={() => navigate('/compras')} sx={{ color: 'text.secondary' }}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleCriarCompraInicial}
                        variant="contained"
                        disabled={loading || !competenciaTemp}
                    >
                        {loading ? 'Criando...' : 'Criar Compra'}
                    </Button>
                </DialogActions>
                
                {/* Dialog de confirmação para fechar */}
                <Dialog 
                    open={confirmCloseCompra} 
                    onClose={() => setConfirmCloseCompra(false)}
                    maxWidth="xs"
                    PaperProps={{
                        sx: {
                            borderRadius: '12px',
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            m: 0,
                            zIndex: 1400
                        }
                    }}
                >
                    <DialogTitle sx={{ pb: 1 }}>
                        <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                            Descartar alterações?
                        </Typography>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 2, pb: 1 }}>
                        <Typography variant="body2">
                            Você tem alterações não salvas. Deseja realmente descartar essas alterações?
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                        <Button onClick={() => setConfirmCloseCompra(false)} variant="outlined" size="small">
                            Continuar Editando
                        </Button>
                        <Button onClick={() => navigate('/compras')} color="error" variant="contained" size="small">
                            Descartar
                        </Button>
                    </DialogActions>
                </Dialog>
            </Dialog>
        );
    }

    if (carregando) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Carregando...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'white' }}>
            {/* Cabeçalho */}
            <Box sx={{ 
                flexShrink: 0, 
                px: 3, 
                py: 2.5, 
                bgcolor: 'white',
                borderBottom: '1px solid #e9ecef'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => navigate(isEdit ? `/compras/${id}` : '/compras')} size="small">
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: '#212529' }}>
                            {isEdit ? `Compra ${compra?.numero}` : 'Nova Compra'}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                            variant="outlined"
                            onClick={() => navigate(isEdit ? `/compras/${id}` : '/compras')}
                            disabled={loading}
                            sx={{ 
                                textTransform: 'none',
                                borderColor: '#dee2e6',
                                color: '#495057',
                                '&:hover': {
                                    borderColor: '#adb5bd',
                                    bgcolor: '#f8f9fa'
                                }
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSalvar}
                            disabled={loading || itens.length === 0}
                            sx={{ textTransform: 'none' }}
                        >
                            {loading ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </Box>
                </Box>

                {/* Informações em linha */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
                    <TextField
                        size="small"
                        label="Competência"
                        type="month"
                        value={competenciaMesAno}
                        onChange={(e) => setCompetenciaMesAno(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 180 }}
                    />
                    <TextField
                        size="small"
                        label="Observações"
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Observações..."
                        sx={{ flex: 1 }}
                    />
                    <Box sx={{ display: 'flex', gap: 3, px: 2, borderLeft: '1px solid #dee2e6' }}>
                        <Box>
                            <Typography variant="caption" sx={{ color: '#6c757d', display: 'block' }}>Itens</Typography>
                            <Typography variant="body2" fontWeight="600" sx={{ color: '#212529' }}>{itens.length}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ color: '#6c757d', display: 'block' }}>Fornecedores</Typography>
                            <Typography variant="body2" fontWeight="600" sx={{ color: '#212529' }}>{totalFornecedores}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ color: '#6c757d', display: 'block' }}>Total</Typography>
                            <Typography variant="body2" fontWeight="600" color="primary">
                                {formatarMoeda(calcularValorTotal())}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {erro && (
                    <Alert severity="error" sx={{ mt: 2 }} onClose={() => setErro('')}>
                        {erro}
                    </Alert>
                )}
            </Box>

            {/* Área da Tabela */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: 3 }}>
                <Box sx={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'white',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    {/* Barra de ações da tabela */}
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        px: 3,
                        py: 2,
                        borderBottom: '1px solid #e9ecef'
                    }}>
                        <Typography variant="body2" sx={{ color: '#6c757d', fontSize: '0.875rem' }}>
                            {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={abrirDialogAdicionar}
                            sx={{ textTransform: 'none' }}
                        >
                            Adicionar item
                        </Button>
                    </Box>

                    {/* Tabela */}
                    <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Produto</TableCell>
                                    <TableCell>Fornecedor</TableCell>
                                    <TableCell align="right">Quantidade</TableCell>
                                    <TableCell align="center">Entrega</TableCell>
                                    <TableCell align="right">Preço Unit.</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                    <TableCell align="right">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {itens.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 8, border: 0 }}>
                                            <Typography variant="body2" sx={{ color: '#6c757d' }}>
                                                Nenhum item adicionado. Clique em "Adicionar item" para começar.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    itens.map((item, index) => (
                                        <TableRow 
                                            key={index} 
                                            hover
                                            sx={{ 
                                                bgcolor: 'white',
                                                '&:hover': { bgcolor: '#f8f9fa !important' },
                                                '&:last-child td': { borderBottom: 0 }
                                            }}
                                        >
                                            <TableCell sx={{ 
                                                py: 1.75, 
                                                px: 2, 
                                                borderBottom: '1px solid #f1f3f5',
                                                borderLeft: 0,
                                                borderRight: 0,
                                                borderTop: 0
                                            }}>
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: '#212529', fontSize: '0.875rem' }}>
                                                    {item.produto_nome}
                                                </Typography>
                                                {item.observacoes && (
                                                    <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                                                        {item.observacoes}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ 
                                                py: 1.75, 
                                                px: 2, 
                                                borderBottom: '1px solid #f1f3f5',
                                                borderLeft: 0,
                                                borderRight: 0,
                                                borderTop: 0
                                            }}>
                                                <Typography variant="body2" sx={{ color: '#212529', fontSize: '0.875rem' }}>
                                                    {item.fornecedor_nome}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                                                    {item.contrato_numero}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ 
                                                py: 1.75, 
                                                px: 2, 
                                                borderBottom: '1px solid #f1f3f5',
                                                borderLeft: 0,
                                                borderRight: 0,
                                                borderTop: 0
                                            }}>
                                                <Typography variant="body2" sx={{ color: '#212529', fontSize: '0.875rem' }}>
                                                    {formatarNumero(item.quantidade)} {item.unidade}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ 
                                                py: 1.75, 
                                                px: 2, 
                                                borderBottom: '1px solid #f1f3f5',
                                                borderLeft: 0,
                                                borderRight: 0,
                                                borderTop: 0
                                            }}>
                                                <Typography variant="body2" sx={{ color: '#212529', fontSize: '0.875rem' }}>
                                                    {formatarData(item.data_entrega_prevista)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ 
                                                py: 1.75, 
                                                px: 2, 
                                                borderBottom: '1px solid #f1f3f5',
                                                borderLeft: 0,
                                                borderRight: 0,
                                                borderTop: 0
                                            }}>
                                                <Typography variant="body2" sx={{ color: '#212529', fontSize: '0.875rem' }}>
                                                    {formatarMoeda(item.preco_unitario)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ 
                                                py: 1.75, 
                                                px: 2, 
                                                borderBottom: '1px solid #f1f3f5',
                                                borderLeft: 0,
                                                borderRight: 0,
                                                borderTop: 0
                                            }}>
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: '#212529', fontSize: '0.875rem' }}>
                                                    {formatarMoeda(item.valor_total)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ 
                                                py: 1.75, 
                                                px: 2, 
                                                borderBottom: '1px solid #f1f3f5',
                                                borderLeft: 0,
                                                borderRight: 0,
                                                borderTop: 0
                                            }}>
                                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => abrirDialogEditar(index)}
                                                        sx={{ 
                                                            color: '#6c757d', 
                                                            '&:hover': { 
                                                                color: '#495057',
                                                                bgcolor: 'rgba(0,0,0,0.04)'
                                                            } 
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => removerItem(index)}
                                                        sx={{ 
                                                            color: '#6c757d', 
                                                            '&:hover': { 
                                                                color: '#dc3545',
                                                                bgcolor: 'rgba(220,53,69,0.04)'
                                                            } 
                                                        }}
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
                </Box>
            </Box>

            {/* Diálogo Adicionar/Editar Item */}
            <Dialog 
                open={dialogItemOpen} 
                onClose={handleCloseItemDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        m: 0
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {itemEditando !== null ? 'Editar Item' : 'Adicionar Item'}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={handleCloseItemDialog}
                        sx={{ color: 'text.secondary' }}
                    >
                        <ClearIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2, pb: 1 }}>
                    {erroDialog && (
                        <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }} onClose={() => setErroDialog('')}>
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                                {erroDialog}
                            </Typography>
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Autocomplete
                            size="small"
                            value={produtoSelecionado}
                            onChange={(_, newValue) => {
                                setProdutoSelecionado(newValue);
                                setErroDialog('');
                            }}
                            options={produtosDisponiveis}
                            groupBy={(option) => option.fornecedor_nome}
                            getOptionLabel={(option) => `${option.produto_nome}`}
                            disabled={itemEditando !== null}
                            renderInput={(params) => (
                                <TextField 
                                    {...params} 
                                    label="Produto" 
                                    placeholder="Selecione..."
                                    required
                                />
                            )}
                            renderOption={(props, option) => {
                                const { key, ...otherProps } = props;
                                return (
                                    <li key={key} {...otherProps}>
                                        <Box sx={{ width: '100%', py: 0.5 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" fontWeight="500">
                                                    {option.produto_nome}
                                                </Typography>
                                                <Typography variant="caption" color="success.main" fontWeight="600">
                                                    Saldo: {formatarNumero(Number(option.saldo_disponivel) || Number(option.quantidade_contratada) || 0)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    {option.fornecedor_nome} • Contrato {option.contrato_numero}
                                                </Typography>
                                                <Typography variant="caption" color="primary">
                                                    {formatarMoeda(option.preco_unitario)}/{option.unidade}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </li>
                                );
                            }}
                        />

                        {produtoSelecionado && (
                            <Box sx={{ 
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1, 
                                p: 1.5, 
                                bgcolor: 'grey.50', 
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'grey.200'
                            }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">Saldo Disponível</Typography>
                                    <Typography variant="body2" fontWeight="600" color="success.main">
                                        {formatarNumero(Number(produtoSelecionado.saldo_disponivel) || Number(produtoSelecionado.quantidade_contratada) || 0)} {produtoSelecionado.unidade}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">Preço Unitário</Typography>
                                    <Typography variant="body2" fontWeight="600">
                                        {formatarMoeda(produtoSelecionado.preco_unitario)}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">Valor Total</Typography>
                                    <Typography variant="body2" fontWeight="600" color="primary">
                                        {formatarMoeda(calcularValorItem())}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField
                                size="small"
                                label="Quantidade"
                                type="number"
                                value={quantidade}
                                onChange={(e) => {
                                    setQuantidade(parseFloat(e.target.value) || 0);
                                    setErroDialog('');
                                }}
                                inputProps={{ min: 0, step: 1 }}
                                helperText={produtoSelecionado ? `Máx: ${formatarNumero(Number(produtoSelecionado.saldo_disponivel) || Number(produtoSelecionado.quantidade_contratada) || 0)}` : ''}
                                required
                            />

                            <TextField
                                size="small"
                                label="Data de Entrega"
                                type="date"
                                value={dataEntrega}
                                onChange={(e) => setDataEntrega(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                required
                            />
                        </Box>

                        <TextField
                            size="small"
                            label="Observações"
                            multiline
                            rows={2}
                            value={observacoesItem}
                            onChange={(e) => setObservacoesItem(e.target.value)}
                            placeholder="Observações específicas deste item..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                    <Button size="small" onClick={handleCloseItemDialog} sx={{ color: 'text.secondary' }}>
                        Cancelar
                    </Button>
                    <Button 
                        size="small"
                        onClick={itemEditando !== null ? handleAtualizarItem : handleAdicionarItem}
                        variant="contained"
                        disabled={!produtoSelecionado || quantidade <= 0}
                    >
                        {itemEditando !== null ? 'Atualizar' : 'Adicionar'}
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Dialog de confirmação para fechar item */}
            <Dialog 
                open={confirmCloseItem} 
                onClose={() => setConfirmCloseItem(false)}
                maxWidth="xs"
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        m: 0
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        Descartar alterações?
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 2, pb: 1 }}>
                    <Typography variant="body2">
                        Você tem alterações não salvas. Deseja realmente descartar essas alterações?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                    <Button onClick={() => setConfirmCloseItem(false)} variant="outlined" size="small">
                        Continuar Editando
                    </Button>
                    <Button onClick={confirmCloseItemDialog} color="error" variant="contained" size="small">
                        Descartar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
