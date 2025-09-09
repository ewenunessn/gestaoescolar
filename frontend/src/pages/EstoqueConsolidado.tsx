import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
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
    Chip,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    IconButton,
    Tooltip,
    useTheme,
    useMediaQuery,
    Menu,
} from '@mui/material';
import {
    Search,
    Inventory,
    Visibility,
    School,
    Assessment,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    Warning,
    Clear,
    Refresh,
    Download,
    FilterList,
    Sort,
    ArrowUpward,
    ArrowDownward,
    MoreVert,
    RestartAlt,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { listarProdutos } from '../services/produtos';
import {
    buscarEstoqueConsolidadoProduto,
    listarEstoqueConsolidado,
    EstoqueConsolidadoProduto,
    EstoqueConsolidadoResumo
} from '../services/estoqueConsolidado';

interface Produto {
    id: number;
    nome: string;
    descricao?: string;
    unidade: string;
    categoria?: string;
    ativo: boolean;
}

const EstoqueConsolidadoPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Estados principais
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estados de filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoria, setSelectedCategoria] = useState('');
    const [sortBy, setSortBy] = useState('nome');
    const [quantidadeMin, setQuantidadeMin] = useState('');
    const [quantidadeMax, setQuantidadeMax] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Estados do menu de ações
    const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

    // Estados do modal de reset
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [loadingReset, setLoadingReset] = useState(false);

    // Estados do modal de detalhes
    const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
    const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
    const [estoqueDetalhado, setEstoqueDetalhado] = useState<EstoqueConsolidadoProduto | null>(null);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);

    // Estados de filtros do modal
    const [filtroEscolaQuantidadeMin, setFiltroEscolaQuantidadeMin] = useState('');
    const [filtroEscolaQuantidadeMax, setFiltroEscolaQuantidadeMax] = useState('');
    const [filtroEscolaStatus, setFiltroEscolaStatus] = useState('');
    const [ordenacaoEscolas, setOrdenacaoEscolas] = useState<'nome' | 'quantidade'>('nome');
    const [ordemEscolas, setOrdemEscolas] = useState<'asc' | 'desc'>('asc');

    // Carregar produtos
    const loadProdutos = async () => {
        try {
            setLoading(true);
            setError(null);
            const produtosData = await listarProdutos();
            setProdutos(produtosData.filter(p => p.ativo));
        } catch (err: any) {
            console.error('Erro ao carregar produtos:', err);
            setError('Erro ao carregar produtos. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProdutos();
    }, []);

    // Extrair categorias únicas
    const categorias = [...new Set(produtos.map(produto => produto.categoria).filter(Boolean))];

    // Filtrar e ordenar produtos (agora com dados de estoque)
    const [produtosComEstoque, setProdutosComEstoque] = useState<any[]>([]);
    const [loadingEstoqueResumo, setLoadingEstoqueResumo] = useState(false);

    // Carregar resumo de estoque para todos os produtos
    const loadEstoqueResumo = async () => {
        try {
            setLoadingEstoqueResumo(true);

            // Usar o serviço de API igual aos outros módulos
            const estoqueData = await listarEstoqueConsolidado();

            // Mapear os dados da API para o formato esperado
            const produtosComDados = estoqueData.map((item: any) => ({
                id: item.produto_id,
                nome: item.produto_nome,
                descricao: item.produto_descricao,
                unidade: item.unidade,
                categoria: item.categoria,
                ativo: true,
                total_quantidade: item.total_quantidade,
                total_escolas_com_estoque: item.total_escolas_com_estoque,
                total_escolas: item.total_escolas
            }));

            setProdutosComEstoque(produtosComDados);
        } catch (err) {
            console.error('Erro ao carregar resumo de estoque:', err);
            setError('Erro ao carregar dados de estoque. Tente novamente.');
        } finally {
            setLoadingEstoqueResumo(false);
        }
    };

    useEffect(() => {
        if (produtos.length > 0) {
            loadEstoqueResumo();
        }
    }, [produtos]);

    // Função para resetar estoque global
    const handleResetEstoque = async () => {
        try {
            setLoadingReset(true);
            setError(null);

            // Importar apiWithRetry dinamicamente
            const { apiWithRetry } = await import('../services/api');
            
            const response = await apiWithRetry.post('/estoque-consolidado/reset');
            
            setSuccessMessage('Estoque resetado com sucesso! Backup criado automaticamente.');
            setTimeout(() => setSuccessMessage(null), 5000);
            
            // Recarregar dados
            await loadEstoqueResumo();
            
        } catch (err: any) {
            console.error('Erro ao resetar estoque:', err);
            setError('Erro ao resetar estoque. Tente novamente.');
        } finally {
            setLoadingReset(false);
            setResetModalOpen(false);
        }
    };

    // Filtrar e ordenar produtos
    const filteredProdutos = useMemo(() => {
        return produtosComEstoque.filter(produto => {
            const matchesSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                produto.categoria?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategoria = !selectedCategoria || produto.categoria === selectedCategoria;

            // Filtros de quantidade
            const quantidade = produto.total_quantidade || 0;
            const matchesQuantidadeMin = !quantidadeMin || quantidade >= parseFloat(quantidadeMin);
            const matchesQuantidadeMax = !quantidadeMax || quantidade <= parseFloat(quantidadeMax);

            return matchesSearch && matchesCategoria && matchesQuantidadeMin && matchesQuantidadeMax;
        }).sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'nome':
                    comparison = a.nome.localeCompare(b.nome);
                    break;
                case 'categoria':
                    comparison = (a.categoria || '').localeCompare(b.categoria || '');
                    break;
                case 'quantidade':
                    comparison = (a.total_quantidade || 0) - (b.total_quantidade || 0);
                    break;
                case 'escolas_com_estoque':
                    comparison = (a.total_escolas_com_estoque || 0) - (b.total_escolas_com_estoque || 0);
                    break;
                default:
                    comparison = a.nome.localeCompare(b.nome);
            }

            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }, [produtosComEstoque, searchTerm, selectedCategoria, quantidadeMin, quantidadeMax, sortBy, sortOrder]);

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategoria('');
        setQuantidadeMin('');
        setQuantidadeMax('');
        setSortBy('nome');
        setSortOrder('asc');
    };

    // Função para alternar ordem de classificação
    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    // Função para exportar Excel com formatação avançada usando ExcelJS
    const exportarExcel = async () => {
        try {
            if (!estoqueDetalhado) return;

            // Criar workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Estoque por Escola');

            // Configurar larguras das colunas
            worksheet.columns = [
                { width: 35 }, // Escola
                { width: 12 }, // Quantidade
                { width: 10 }, // Unidade
                { width: 15 }, // Status
                { width: 20 }  // Última Atualização
            ];

            // Adicionar título (mesclado)
            worksheet.mergeCells('A1:E1');
            const tituloCell = worksheet.getCell('A1');
            tituloCell.value = `Estoque Escolas - ${estoqueDetalhado.produto_nome}`;
            tituloCell.font = {
                size: 14,
                bold: true,
                color: { argb: 'FFFFFF' }
            };
            tituloCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '4472C4' }
            };
            tituloCell.alignment = {
                horizontal: 'center',
                vertical: 'middle'
            };
            tituloCell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // Adicionar cabeçalhos
            const cabecalhos = ['Escola', 'Quantidade', 'Unidade', 'Status', 'Última Atualização'];
            const headerRow = worksheet.getRow(2);

            cabecalhos.forEach((cabecalho, index) => {
                const cell = headerRow.getCell(index + 1);
                cell.value = cabecalho;
                cell.font = {
                    bold: true,
                    color: { argb: 'FFFFFF' }
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '70AD47' }
                };
                cell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle'
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // Adicionar dados das escolas com formatação baseada no status
            escolasFiltradas.forEach((escola, index) => {
                const rowIndex = index + 3;
                const row = worksheet.getRow(rowIndex);

                // Definir valores das células
                row.getCell(1).value = escola.escola_nome;
                row.getCell(2).value = escola.quantidade_atual;
                row.getCell(3).value = escola.unidade;
                row.getCell(4).value = getStatusLabel(escola.status_estoque);
                row.getCell(5).value = escola.data_ultima_atualizacao 
                    ? new Date(escola.data_ultima_atualizacao).toLocaleDateString('pt-BR')
                    : 'Nunca atualizado';

                // Aplicar formatação baseada no status
                let corFundo = 'FFFFFF'; // Branco padrão
                let corTexto = '000000'; // Preto padrão

                switch (escola.status_estoque) {
                    case 'sem_estoque':
                        corFundo = 'FFE6E6'; // Rosa claro
                        corTexto = '8B0000'; // Vermelho escuro
                        break;
                    case 'baixo':
                        corFundo = 'FFF2CC'; // Amarelo claro
                        corTexto = 'B8860B'; // Dourado escuro
                        break;
                    case 'alto':
                        corFundo = 'E6F3FF'; // Azul claro
                        corTexto = '1E3A8A'; // Azul escuro
                        break;
                    case 'normal':
                        corFundo = 'E8F5E8'; // Verde claro
                        corTexto = '2D5016'; // Verde escuro
                        break;
                }

                // Aplicar formatação a todas as células da linha
                for (let col = 1; col <= 5; col++) {
                    const cell = row.getCell(col);
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: corFundo }
                    };
                    cell.font = {
                        color: { argb: corTexto }
                    };
                    cell.alignment = {
                        horizontal: col === 1 ? 'left' : 'center',
                        vertical: 'middle'
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }

                // Formatação especial para quantidade (negrito se > 0)
                if (escola.quantidade_atual > 0) {
                    row.getCell(2).font = {
                        bold: true,
                        color: { argb: corTexto }
                    };
                }
            });

            // Adicionar data de emissão
            const ultimaLinha = escolasFiltradas.length + 4;
            const emissaoCell = worksheet.getCell(`E${ultimaLinha}`);
            emissaoCell.value = `Emitido: ${new Date().toLocaleDateString('pt-BR')}`;
            emissaoCell.font = {
                italic: true,
                size: 10
            };
            emissaoCell.alignment = {
                horizontal: 'right'
            };

            // Gerar nome do arquivo
            const nomeArquivo = `estoque_${estoqueDetalhado.produto_nome.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

            // Salvar arquivo
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = nomeArquivo;
            link.click();
            window.URL.revokeObjectURL(url);

            setSuccessMessage('Relatório exportado com sucesso!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error('Erro ao exportar:', error);
            setError('Erro ao exportar relatório. Tente novamente.');
        }
    };

    // Função para ver detalhes do estoque
    const verDetalhesEstoque = async (produto: Produto) => {
        try {
            setLoadingDetalhes(true);
            setProdutoSelecionado(produto);
            setDetalhesModalOpen(true);

            // Limpar filtros do modal
            setFiltroEscolaQuantidadeMin('');
            setFiltroEscolaQuantidadeMax('');
            setFiltroEscolaStatus('');
            setOrdenacaoEscolas('nome');
            setOrdemEscolas('asc');

            // Usar o serviço de API igual aos outros módulos
            const estoqueDetalhado = await buscarEstoqueConsolidadoProduto(produto.id);
            setEstoqueDetalhado(estoqueDetalhado);
        } catch (err: any) {
            console.error('Erro ao carregar detalhes do estoque:', err);
            setError('Erro ao carregar detalhes do estoque. Tente novamente.');
        } finally {
            setLoadingDetalhes(false);
        }
    };

    // Filtrar escolas no modal
    const escolasFiltradas = useMemo(() => {
        if (!estoqueDetalhado) return [];

        return estoqueDetalhado.escolas.filter(escola => {
            const quantidade = escola.quantidade_atual;
            const matchesQuantidadeMin = !filtroEscolaQuantidadeMin || quantidade >= parseFloat(filtroEscolaQuantidadeMin);
            const matchesQuantidadeMax = !filtroEscolaQuantidadeMax || quantidade <= parseFloat(filtroEscolaQuantidadeMax);
            const matchesStatus = !filtroEscolaStatus || escola.status_estoque === filtroEscolaStatus;

            return matchesQuantidadeMin && matchesQuantidadeMax && matchesStatus;
        }).sort((a, b) => {
            let comparison = 0;

            if (ordenacaoEscolas === 'nome') {
                comparison = a.escola_nome.localeCompare(b.escola_nome);
            } else {
                comparison = a.quantidade_atual - b.quantidade_atual;
            }

            return ordemEscolas === 'desc' ? -comparison : comparison;
        });
    }, [estoqueDetalhado, filtroEscolaQuantidadeMin, filtroEscolaQuantidadeMax, filtroEscolaStatus, ordenacaoEscolas, ordemEscolas]);

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
            case 'sem_estoque': return <Warning />;
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

    const formatarQuantidade = (valor: number): string => {
        const num = parseFloat(valor.toString());
        if (isNaN(num)) return '0';

        if (num % 1 === 0) {
            return num.toString();
        }

        return num.toFixed(3).replace(/\.?0+$/, '');
    };

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
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: '#1f2937', mb: 1 }}>
                        Estoque das Escolas
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Visualize o estoque de cada produto em todas as escolas
                    </Typography>
                </Box>

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
                            <Button
                                startIcon={<Refresh />}
                                onClick={loadProdutos}
                                sx={{
                                    bgcolor: '#4f46e5',
                                    color: 'white',
                                    textTransform: 'none',
                                    '&:hover': { bgcolor: '#4338ca' },
                                }}
                            >
                                Atualizar
                            </Button>

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
                        <FormControl sx={{ minWidth: 200 }}>
                            <InputLabel>Categoria</InputLabel>
                            <Select
                                value={selectedCategoria}
                                onChange={(e) => setSelectedCategoria(e.target.value)}
                                label="Categoria"
                            >
                                <MenuItem value="">Todas as categorias</MenuItem>
                                {categorias.map(categoria => (
                                    <MenuItem key={categoria} value={categoria}>{categoria}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Quantidade Mínima"
                            type="number"
                            value={quantidadeMin}
                            onChange={(e) => setQuantidadeMin(e.target.value)}
                            sx={{ minWidth: 150 }}
                            size="small"
                            InputProps={{
                                startAdornment: <InputAdornment position="start">≥</InputAdornment>
                            }}
                        />

                        <TextField
                            label="Quantidade Máxima"
                            type="number"
                            value={quantidadeMax}
                            onChange={(e) => setQuantidadeMax(e.target.value)}
                            sx={{ minWidth: 150 }}
                            size="small"
                            InputProps={{
                                startAdornment: <InputAdornment position="start">≤</InputAdornment>
                            }}
                        />

                        <FormControl sx={{ minWidth: 150 }}>
                            <InputLabel>Ordenar por</InputLabel>
                            <Select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                label="Ordenar por"
                            >
                                <MenuItem value="nome">Nome</MenuItem>
                                <MenuItem value="categoria">Categoria</MenuItem>
                                <MenuItem value="quantidade">Quantidade Total</MenuItem>
                                <MenuItem value="escolas_com_estoque">Escolas c/ Estoque</MenuItem>
                            </Select>
                        </FormControl>

                        <Tooltip title={`Ordenação ${sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}`}>
                            <IconButton
                                onClick={toggleSortOrder}
                                sx={{
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    color: sortOrder === 'asc' ? '#059669' : '#dc2626',
                                }}
                            >
                                {sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
                            </IconButton>
                        </Tooltip>

                        <Typography sx={{ color: '#6b7280', ml: 'auto' }}>
                            {filteredProdutos.length} de {produtosComEstoque.length} produtos
                        </Typography>
                    </Box>
                </Card>

                {/* Tabela */}
                {loading ? (
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 6 }}>
                            <CircularProgress size={60} sx={{ mb: 2 }} />
                            <Typography variant="h6" sx={{ color: '#6b7280' }}>
                                Carregando produtos...
                            </Typography>
                        </CardContent>
                    </Card>
                ) : filteredProdutos.length === 0 ? (
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 6 }}>
                            <Inventory sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
                            <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                                Nenhum produto encontrado
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                                Tente ajustar os filtros ou adicionar novos produtos
                            </Typography>
                        </CardContent>
                    </Card>
                ) : (
                    <TableContainer component={Paper} sx={{ borderRadius: '12px' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Produto</TableCell>
                                    <TableCell>Categoria</TableCell>
                                    <TableCell align="center">Quantidade Total</TableCell>
                                    <TableCell align="center">Escolas c/ Estoque</TableCell>
                                    <TableCell align="center">Unidade</TableCell>
                                    <TableCell align="center">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredProdutos.map((produto) => (
                                    <TableRow key={produto.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {produto.nome}
                                            </Typography>
                                            {produto.descricao && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {produto.descricao}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {produto.categoria ? (
                                                <Chip label={produto.categoria} size="small" variant="outlined" />
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">-</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {formatarQuantidade(produto.total_quantidade || 0)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {produto.total_escolas_com_estoque || 0}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    / {produto.total_escolas || 0}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={produto.unidade}
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
                                            <Tooltip title="Ver Estoque nas Escolas">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => verDetalhesEstoque(produto)}
                                                    color="primary"
                                                >
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            {/* Modal de Detalhes do Estoque */}
            <Dialog
                open={detalhesModalOpen}
                onClose={() => setDetalhesModalOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Assessment color="primary" />
                        <Box>
                            <Typography variant="h6">Estoque por Escola</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {produtoSelecionado?.nome}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {loadingDetalhes ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <CircularProgress size={40} sx={{ mb: 2 }} />
                            <Typography variant="body2" color="text.secondary">
                                Carregando estoque das escolas...
                            </Typography>
                        </Box>
                    ) : estoqueDetalhado ? (
                        <>
                            {/* Resumo */}
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={4}>
                                    <Card sx={{ bgcolor: '#f0f9ff', p: 2 }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Quantidade Total
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {formatarQuantidade(estoqueDetalhado.total_quantidade)} {estoqueDetalhado.unidade}
                                        </Typography>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Card sx={{ bgcolor: '#f0fdf4', p: 2 }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Escolas com Estoque
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {estoqueDetalhado.total_escolas_com_estoque} de {estoqueDetalhado.total_escolas}
                                        </Typography>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Card sx={{ bgcolor: '#fefce8', p: 2 }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Categoria
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {estoqueDetalhado.categoria || 'Sem categoria'}
                                        </Typography>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Filtros das Escolas */}
                            <Card sx={{ p: 2, mb: 3, bgcolor: '#f8fafc' }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                    Filtros das Escolas
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <TextField
                                        label="Quantidade Mín."
                                        type="number"
                                        value={filtroEscolaQuantidadeMin}
                                        onChange={(e) => setFiltroEscolaQuantidadeMin(e.target.value)}
                                        size="small"
                                        sx={{ minWidth: 120 }}
                                    />
                                    <TextField
                                        label="Quantidade Máx."
                                        type="number"
                                        value={filtroEscolaQuantidadeMax}
                                        onChange={(e) => setFiltroEscolaQuantidadeMax(e.target.value)}
                                        size="small"
                                        sx={{ minWidth: 120 }}
                                    />
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>Status</InputLabel>
                                        <Select
                                            value={filtroEscolaStatus}
                                            onChange={(e) => setFiltroEscolaStatus(e.target.value)}
                                            label="Status"
                                        >
                                            <MenuItem value="">Todos</MenuItem>
                                            <MenuItem value="sem_estoque">Sem Estoque</MenuItem>
                                            <MenuItem value="baixo">Estoque Baixo</MenuItem>
                                            <MenuItem value="normal">Normal</MenuItem>
                                            <MenuItem value="alto">Estoque Alto</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>Ordenar por</InputLabel>
                                        <Select
                                            value={ordenacaoEscolas}
                                            onChange={(e) => setOrdenacaoEscolas(e.target.value as 'nome' | 'quantidade')}
                                            label="Ordenar por"
                                        >
                                            <MenuItem value="nome">Nome</MenuItem>
                                            <MenuItem value="quantidade">Quantidade</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Tooltip title={`Ordem ${ordemEscolas === 'asc' ? 'Crescente' : 'Decrescente'}`}>
                                        <IconButton
                                            onClick={() => setOrdemEscolas(prev => prev === 'asc' ? 'desc' : 'asc')}
                                            size="small"
                                            sx={{
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                color: ordemEscolas === 'asc' ? '#059669' : '#dc2626',
                                            }}
                                        >
                                            {ordemEscolas === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            setFiltroEscolaQuantidadeMin('');
                                            setFiltroEscolaQuantidadeMax('');
                                            setFiltroEscolaStatus('');
                                            setOrdenacaoEscolas('nome');
                                            setOrdemEscolas('asc');
                                        }}
                                        sx={{ color: '#6b7280' }}
                                    >
                                        Limpar
                                    </Button>
                                    <Typography variant="body2" sx={{ color: '#6b7280', ml: 'auto' }}>
                                        {escolasFiltradas.length} de {estoqueDetalhado?.escolas.length || 0} escolas
                                    </Typography>
                                </Box>
                            </Card>

                            {/* Tabela de Escolas */}
                            <TableContainer component={Paper} sx={{ borderRadius: '8px' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Escola</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 600 }}>Quantidade</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 600 }}>Status</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 600 }}>Última Atualização</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {escolasFiltradas.map((escola) => (
                                            <TableRow key={escola.escola_id} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <School sx={{ fontSize: 18, color: '#6b7280' }} />
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                            {escola.escola_nome}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {formatarQuantidade(escola.quantidade_atual)} {escola.unidade}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        icon={getStatusIcon(escola.status_estoque)}
                                                        label={getStatusLabel(escola.status_estoque)}
                                                        size="small"
                                                        color={getStatusColor(escola.status_estoque) as any}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                        {escola.data_ultima_atualizacao 
                                                            ? new Date(escola.data_ultima_atualizacao).toLocaleDateString('pt-BR')
                                                            : 'Nunca atualizado'
                                                        }
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Warning sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
                            <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                                Erro ao carregar dados
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                                Não foi possível carregar o estoque deste produto
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button
                        startIcon={<Download />}
                        onClick={exportarExcel}
                        variant="contained"
                        sx={{
                            bgcolor: '#059669',
                            '&:hover': { bgcolor: '#047857' }
                        }}
                    >
                        Exportar
                    </Button>
                    <Button onClick={() => setDetalhesModalOpen(false)} variant="outlined">
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>

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
                    onClick={async () => {
                        setActionsMenuAnchor(null);
                        // Exportar lista de produtos com formatação avançada
                        try {
                            const workbook = new ExcelJS.Workbook();
                            const worksheet = workbook.addWorksheet('Produtos Consolidado');

                            // Configurar larguras das colunas
                            worksheet.columns = [
                                { width: 35 }, // Produto
                                { width: 15 }, // Categoria
                                { width: 10 }, // Unidade
                                { width: 15 }, // Quantidade Total
                                { width: 20 }  // Escolas com Estoque
                            ];

                            // Adicionar título
                            worksheet.mergeCells('A1:E1');
                            const tituloCell = worksheet.getCell('A1');
                            tituloCell.value = 'Relatório de Estoque das Escolas por Produto';
                            tituloCell.font = {
                                size: 14,
                                bold: true,
                                color: { argb: 'FFFFFF' }
                            };
                            tituloCell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: '4472C4' }
                            };
                            tituloCell.alignment = {
                                horizontal: 'center',
                                vertical: 'middle'
                            };
                            tituloCell.border = {
                                top: { style: 'thin' },
                                left: { style: 'thin' },
                                bottom: { style: 'thin' },
                                right: { style: 'thin' }
                            };

                            // Adicionar cabeçalhos
                            const cabecalhos = ['Produto', 'Categoria', 'Unidade', 'Quantidade Total', 'Escolas com Estoque'];
                            const headerRow = worksheet.getRow(2);

                            cabecalhos.forEach((cabecalho, index) => {
                                const cell = headerRow.getCell(index + 1);
                                cell.value = cabecalho;
                                cell.font = {
                                    bold: true,
                                    color: { argb: 'FFFFFF' }
                                };
                                cell.fill = {
                                    type: 'pattern',
                                    pattern: 'solid',
                                    fgColor: { argb: '70AD47' }
                                };
                                cell.alignment = {
                                    horizontal: 'center',
                                    vertical: 'middle'
                                };
                                cell.border = {
                                    top: { style: 'thin' },
                                    left: { style: 'thin' },
                                    bottom: { style: 'thin' },
                                    right: { style: 'thin' }
                                };
                            });

                            // Adicionar dados dos produtos
                            filteredProdutos.forEach((produto, index) => {
                                const rowIndex = index + 3;
                                const row = worksheet.getRow(rowIndex);

                                row.getCell(1).value = produto.nome;
                                row.getCell(2).value = produto.categoria || '';
                                row.getCell(3).value = produto.unidade;
                                row.getCell(4).value = formatarQuantidade(produto.total_quantidade || 0);
                                row.getCell(5).value = `${produto.total_escolas_com_estoque || 0} de ${produto.total_escolas || 0}`;

                                // Aplicar formatação alternada
                                const corFundo = index % 2 === 0 ? 'F8F9FA' : 'FFFFFF';

                                for (let col = 1; col <= 5; col++) {
                                    const cell = row.getCell(col);
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: corFundo }
                                    };
                                    cell.alignment = {
                                        horizontal: col === 1 ? 'left' : 'center',
                                        vertical: 'middle'
                                    };
                                    cell.border = {
                                        top: { style: 'thin' },
                                        left: { style: 'thin' },
                                        bottom: { style: 'thin' },
                                        right: { style: 'thin' }
                                    };
                                }
                            });

                            // Adicionar data de emissão
                            const ultimaLinha = filteredProdutos.length + 4;
                            const emissaoCell = worksheet.getCell(`E${ultimaLinha}`);
                            emissaoCell.value = `Emitido: ${new Date().toLocaleDateString('pt-BR')}`;
                            emissaoCell.font = {
                                italic: true,
                                size: 10
                            };
                            emissaoCell.alignment = {
                                horizontal: 'right'
                            };

                            // Salvar arquivo
                            const nomeArquivo = `produtos_estoque_consolidado_${new Date().toISOString().slice(0, 10)}.xlsx`;
                            const buffer = await workbook.xlsx.writeBuffer();
                            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = nomeArquivo;
                            link.click();
                            window.URL.revokeObjectURL(url);

                            setSuccessMessage('Lista de produtos exportada com sucesso!');
                            setTimeout(() => setSuccessMessage(null), 3000);
                        } catch (error) {
                            console.error('Erro ao exportar:', error);
                            setError('Erro ao exportar lista. Tente novamente.');
                        }
                    }}
                    sx={{ py: 1.5, px: 2 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Download sx={{ fontSize: 18, color: '#059669' }} />
                        <Typography>Exportar Lista</Typography>
                    </Box>
                </MenuItem>
                
                <MenuItem
                    onClick={() => {
                        setActionsMenuAnchor(null);
                        setResetModalOpen(true);
                    }}
                    sx={{ py: 1.5, px: 2 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <RestartAlt sx={{ fontSize: 18, color: '#dc2626' }} />
                        <Typography>Resetar Movimentações e Estoques</Typography>
                    </Box>
                </MenuItem>
            </Menu>

            {/* Modal de Confirmação de Reset */}
            <Dialog
                open={resetModalOpen}
                onClose={() => !loadingReset && setResetModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    }
                }}
            >
                <DialogTitle sx={{ 
                    pb: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    color: '#dc2626'
                }}>
                    <RestartAlt />
                    Resetar Movimentações e Estoques
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            ⚠️ Esta ação irá:
                        </Typography>
                        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                            <li>Criar um backup completo de todas as movimentações</li>
                            <li>Criar um backup do estoque atual de todas as escolas</li>
                            <li>Zerar todas as movimentações de estoque</li>
                            <li>Zerar todos os estoques das escolas</li>
                        </Box>
                    </Alert>
                    
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Os backups serão salvos automaticamente no banco de dados com timestamp atual.
                        Esta operação <strong>não pode ser desfeita</strong> através da interface.
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                        Tem certeza que deseja continuar?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={() => setResetModalOpen(false)}
                        disabled={loadingReset}
                        variant="outlined"
                        sx={{ minWidth: 100 }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleResetEstoque}
                        disabled={loadingReset}
                        variant="contained"
                        color="error"
                        sx={{ minWidth: 120 }}
                        startIcon={loadingReset ? <CircularProgress size={16} /> : <RestartAlt />}
                    >
                        {loadingReset ? 'Resetando...' : 'Resetar Tudo'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EstoqueConsolidadoPage;