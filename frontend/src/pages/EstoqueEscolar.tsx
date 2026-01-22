import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Box, Typography, TextField, Button, Card, CardContent, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip, InputAdornment, FormControl,
    InputLabel, Select, MenuItem, Grid, IconButton, Tooltip, Menu, TablePagination,
    Collapse, Divider, Autocomplete,
} from '@mui/material';
import {
    Search, Inventory, Visibility, School, Assessment, CheckCircle, Warning,
    Refresh, Download, FilterList, MoreVert, RestartAlt, TuneRounded, ExpandLess, ExpandMore, Clear as ClearIcon,
    ViewList, ViewModule, SwapHoriz
} from '@mui/icons-material';
import * as ExcelJS from 'exceljs';
import {
    buscarEstoqueEscolarProduto, listarEstoqueEscolar, EstoqueEscolarProduto, resetEstoqueGlobal,
    buscarEstoqueMultiplosProdutos, buscarMatrizEstoque
} from '../services/estoqueEscolar';
import { useTenant } from '../context/TenantContext';
import { formatarQuantidade } from '../utils/formatters';
import { 
    useEstoqueEscolarResumo, 
    useMatrizEstoque, 
    useEstoqueProduto,
    useResetEstoqueGlobal,
    useEstoqueLoadingState,
    usePrefetchEstoque
} from '../hooks/queries/useEstoqueQueries';
import TenantInventoryFilter from '../components/TenantInventoryFilter';
import PageHeader from '../components/PageHeader';

// Interface
interface ProdutoComEstoque {
    id: number;
    nome: string;
    unidade: string;
    categoria?: string;
    total_quantidade: number;
    total_escolas_com_estoque: number;
    total_escolas: number;
}

const EstoqueEscolarPage = () => {
    // Estados locais (declarar todos primeiro)
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tenantError, setTenantError] = useState<string | null>(null);
    const [modoVisualizacao, setModoVisualizacao] = useState<'produtos' | 'escolas'>('produtos');
    const [selectedProdutos, setSelectedProdutos] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoria, setSelectedCategoria] = useState('');
    const [sortBy, setSortBy] = useState('nome');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [hasActiveFilters, setHasActiveFilters] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(100);
    const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
    const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoComEstoque | null>(null);
    const [estoqueDetalhado, setEstoqueDetalhado] = useState<EstoqueEscolarProduto | null>(null);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);
    const [movimentacaoModalOpen, setMovimentacaoModalOpen] = useState(false);
    const [escolaSelecionada, setEscolaSelecionada] = useState<any>(null);
    const [tipoMovimentacao, setTipoMovimentacao] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
    const [quantidadeMovimentacao, setQuantidadeMovimentacao] = useState('');
    const [motivoMovimentacao, setMotivoMovimentacao] = useState('');
    const [documentoReferencia, setDocumentoReferencia] = useState('');
    const [loadingMovimentacao, setLoadingMovimentacao] = useState(false);
    
    // Estados para modal de detalhes por validade
    const [modalValidadeOpen, setModalValidadeOpen] = useState(false);
    const [dadosValidadeSelecionados, setDadosValidadeSelecionados] = useState<{
        escola: any;
        produto: any;
        lotes: any[];
    } | null>(null);
    const [loadingLotes, setLoadingLotes] = useState(false);
    
    // React Query hooks (usar após declarar estados)
    const { currentTenant, loading: tenantLoading, error: tenantContextError } = useTenant();
    const estoqueQuery = useEstoqueEscolarResumo();
    const matrizQuery = useMatrizEstoque(selectedProdutos.length > 0 ? selectedProdutos : undefined, 50);
    const resetMutation = useResetEstoqueGlobal();
    const { prefetchProduto, prefetchMatriz } = usePrefetchEstoque();

    // Enhanced error handling for tenant-specific errors
    const handleTenantError = useCallback((error: any) => {
        if (error?.response?.status === 403) {
            const errorCode = error?.response?.data?.code;
            if (errorCode === 'TENANT_OWNERSHIP_ERROR') {
                setTenantError('Você não tem permissão para acessar este recurso da organização.');
            } else if (errorCode === 'CROSS_TENANT_INVENTORY_ACCESS') {
                setTenantError('Acesso negado: operação entre organizações não permitida.');
            } else {
                setTenantError('Acesso negado: você não tem permissão para esta operação.');
            }
        } else if (error?.response?.status === 429 && error?.response?.data?.code === 'TENANT_INVENTORY_LIMIT_ERROR') {
            setTenantError('Limite de inventário da organização excedido.');
        } else if (error?.response?.data?.code === 'TENANT_CONTEXT_MISSING') {
            setTenantError('Contexto de organização não encontrado. Faça login novamente.');
        } else {
            setError(error?.message || 'Erro desconhecido');
        }
    }, []);

    // Check for tenant context errors
    useEffect(() => {
        if (tenantContextError) {
            setTenantError('Erro ao carregar contexto da organização. Tente fazer login novamente.');
        }
    }, [tenantContextError]);

    // Check for query errors and handle tenant-specific ones
    useEffect(() => {
        if (estoqueQuery.error) {
            handleTenantError(estoqueQuery.error);
        }
    }, [estoqueQuery.error, handleTenantError]);

    useEffect(() => {
        if (matrizQuery.error) {
            handleTenantError(matrizQuery.error);
        }
    }, [matrizQuery.error, handleTenantError]);

    // Função para formatar números de forma limpa
    // Usar a função utilitária de formatação
    const formatarNumero = formatarQuantidade;



    // Dados derivados do React Query
    const produtosComEstoque = (estoqueQuery.data?.produtos || []).map(produto => ({
        id: produto.produto_id,
        nome: produto.produto_nome,
        unidade: produto.unidade || 'kg', // Use contract unit or default
        categoria: produto.categoria,
        total_quantidade: produto.total_quantidade,
        total_escolas_com_estoque: produto.total_escolas_com_estoque,
        total_escolas: produto.total_escolas
    }));
    const dadosMatriz = matrizQuery.data?.escolas || [];
    const matrizCarregada = matrizQuery.data?.matriz_carregada || false;
    const loading = estoqueQuery.isLoading || tenantLoading;
    const loadingMatriz = matrizQuery.isLoading || tenantLoading;

    // Variáveis derivadas
    const loadingReset = resetMutation.isPending;

    // Função para refetch manual (se necessário)
    const refetchEstoque = useCallback(() => {
        estoqueQuery.refetch();
        if (modoVisualizacao === 'escolas') {
            matrizQuery.refetch();
        }
    }, [estoqueQuery, matrizQuery, modoVisualizacao]);

    // Prefetch da matriz quando necessário
    const loadDadosMatriz = useCallback(() => {
        if (modoVisualizacao === 'escolas' && !matrizCarregada) {
            prefetchMatriz(selectedProdutos.length > 0 ? selectedProdutos : undefined);
        }
    }, [modoVisualizacao, matrizCarregada, selectedProdutos, prefetchMatriz]);

    // Função para atualização manual (React Query faz isso automaticamente)
    const atualizarDadosIncrementais = useCallback(() => {
        console.log('🔄 Atualizando dados via React Query...');
        refetchEstoque();
    }, [refetchEstoque]);

    // React Query gerencia o carregamento automaticamente
    useEffect(() => {
        if (modoVisualizacao === 'escolas' && !matrizCarregada) {
            loadDadosMatriz();
        }
    }, [modoVisualizacao, matrizCarregada, loadDadosMatriz]);

    // Função para alternar modo de visualização
    const alternarVisualizacao = useCallback(() => {
        setModoVisualizacao(prev => prev === 'produtos' ? 'escolas' : 'produtos');
        setPage(0); // Reset pagination
        setSelectedProdutos([]); // Limpar produtos selecionados ao trocar modo
    }, []);

    // Lógica de UI
    const categorias = useMemo(() => [...new Set(produtosComEstoque.map(p => p.categoria).filter(Boolean))].sort(), [produtosComEstoque]);

    // Produtos filtrados para exibição na matriz (modo escolas)
    const produtosParaExibir = useMemo(() => {
        if (modoVisualizacao !== 'escolas') return produtosComEstoque.slice(0, 10);

        if (selectedProdutos.length === 0) {
            return produtosComEstoque.slice(0, 10); // Mostra os primeiros 10 se nenhum selecionado
        }

        return produtosComEstoque.filter(p => selectedProdutos.includes(p.id));
    }, [produtosComEstoque, selectedProdutos, modoVisualizacao]);

    useEffect(() => {
        setHasActiveFilters(!!(searchTerm || selectedCategoria || (modoVisualizacao === 'escolas' && selectedProdutos.length > 0)));
    }, [searchTerm, selectedCategoria, selectedProdutos, modoVisualizacao]);

    // Filtros e Paginação
    const filteredProdutos = useMemo(() => {
        return produtosComEstoque.filter(p =>
            p.nome.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (!selectedCategoria || p.categoria === selectedCategoria)
        ).sort((a, b) => a.nome.localeCompare(b.nome));
    }, [produtosComEstoque, searchTerm, selectedCategoria]);

    // Filtros para visualização por escolas
    const filteredEscolas = useMemo(() => {
        if (modoVisualizacao !== 'escolas') return [];

        return dadosMatriz.filter(escola =>
            escola.escola_nome.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => a.escola_nome.localeCompare(b.escola_nome));
    }, [dadosMatriz, searchTerm, modoVisualizacao]);

    const paginatedProdutos = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return filteredProdutos.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredProdutos, page, rowsPerPage]);

    const paginatedEscolas = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return filteredEscolas.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredEscolas, page, rowsPerPage]);

    const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);
    useEffect(() => setPage(0), [searchTerm, selectedCategoria, selectedProdutos]);

    const clearFilters = useCallback(() => {
        setSearchTerm('');
        setSelectedCategoria('');
        setSelectedProdutos([]);
    }, []);
    const toggleFilters = useCallback(() => setFiltersExpanded(!filtersExpanded), [filtersExpanded]);

    // Funções de Ações
    const handleResetEstoque = async () => {
        setResetModalOpen(false);
        
        resetMutation.mutate(undefined, {
            onSuccess: (result) => {
                console.log('Reset result:', result);
                const data = result?.data;
                const message = `Estoque global resetado com sucesso! ${data?.estoques_resetados || 0} estoques, ${data?.lotes_deletados || 0} lotes e ${data?.movimentacoes_deletadas || 0} movimentações foram removidos.`;
                setSuccessMessage(message);
                setTenantError(null); // Clear any previous tenant errors
            },
            onError: (err: any) => {
                console.error('Erro ao resetar estoque:', err);
                handleTenantError(err);
            }
        });
    };
    const exportarExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Estoque Escolar');

            // Cabeçalhos
            worksheet.columns = [
                { header: 'Produto', key: 'nome', width: 30 },
                { header: 'Categoria', key: 'categoria', width: 20 },
                { header: 'Unidade', key: 'unidade', width: 15 },
                { header: 'Quantidade Total', key: 'total_quantidade', width: 20 },
                { header: 'Escolas com Estoque', key: 'total_escolas_com_estoque', width: 25 },
                { header: 'Total de Escolas', key: 'total_escolas', width: 20 }
            ];

            // Dados
            filteredProdutos.forEach(produto => {
                worksheet.addRow({
                    nome: produto.nome,
                    categoria: produto.categoria || 'Sem categoria',
                    unidade: produto.unidade || 'kg', // Use contract unit or default
                    total_quantidade: produto.total_quantidade,
                    total_escolas_com_estoque: produto.total_escolas_com_estoque,
                    total_escolas: produto.total_escolas
                });
            });

            // Estilização do cabeçalho
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE3F2FD' }
            };

            // Gerar arquivo
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `estoque-escolar-${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao exportar Excel:', error);
            setError('Erro ao exportar planilha Excel.');
        }
    };

    const exportarDetalhesExcel = async () => {
        try {
            if (!estoqueDetalhado || !produtoSelecionado) {
                setError('Nenhum produto selecionado para exportar.');
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(`Detalhes - ${produtoSelecionado.nome}`);

            const thinBorder = {
                top: { style: 'thin' as const },
                left: { style: 'thin' as const },
                bottom: { style: 'thin' as const },
                right: { style: 'thin' as const }
            };

            // Título principal
            worksheet.mergeCells('A1:F1');
            const titleCell = worksheet.getCell('A1');
            titleCell.value = `RELATÓRIO DETALHADO DE ESTOQUE - ${produtoSelecionado.nome.toUpperCase()}`;
            titleCell.font = { bold: true, size: 14 };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getRow(1).height = 25;

            // Seção: INFORMAÇÕES DO PRODUTO
            worksheet.mergeCells('A3:F3');
            const infoHeader = worksheet.getCell('A3');
            infoHeader.value = 'INFORMAÇÕES DO PRODUTO';
            infoHeader.font = { bold: true, color: { argb: 'FF000000' } };
            infoHeader.alignment = { horizontal: 'center' };
            infoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
            infoHeader.border = thinBorder;

            worksheet.getRow(4).values = ['Produto:', produtoSelecionado.nome, '', 'Categoria:', produtoSelecionado.categoria || 'N/A'];
            worksheet.getRow(5).values = ['Unidade:', produtoSelecionado.unidade, '', 'Data do Relatório:', new Date().toLocaleDateString('pt-BR')];

            // Aplicar bordas à seção de informações
            for (let rowNum = 4; rowNum <= 5; rowNum++) {
                worksheet.getRow(rowNum).eachCell({ includeEmpty: true }, cell => {
                    cell.border = thinBorder;
                });
            }

            // Seção: RESUMO ESTATÍSTICO
            worksheet.mergeCells('A7:F7');
            const resumoHeader = worksheet.getCell('A7');
            resumoHeader.value = 'RESUMO ESTATÍSTICO';
            resumoHeader.font = { bold: true, color: { argb: 'FF000000' } };
            resumoHeader.alignment = { horizontal: 'center' };
            resumoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
            resumoHeader.border = thinBorder;

            worksheet.getRow(8).values = ['Total de Escolas:', estoqueDetalhado.total_escolas || 0, '', 'Escolas com Estoque:', estoqueDetalhado.total_escolas_com_estoque || 0];
            worksheet.getRow(9).values = ['Escolas sem Estoque:', (estoqueDetalhado.total_escolas || 0) - (estoqueDetalhado.total_escolas_com_estoque || 0), '', 'Quantidade Total:', `${estoqueDetalhado.total_quantidade || 0} ${produtoSelecionado.unidade}`];

            // Aplicar bordas à seção de resumo
            for (let rowNum = 8; rowNum <= 9; rowNum++) {
                worksheet.getRow(rowNum).eachCell({ includeEmpty: true }, cell => {
                    cell.border = thinBorder;
                });
            }

            // Seção: DISTRIBUIÇÃO POR ESCOLA
            worksheet.mergeCells('A11:F11');
            const distribuicaoHeader = worksheet.getCell('A11');
            distribuicaoHeader.value = 'DISTRIBUIÇÃO POR ESCOLA';
            distribuicaoHeader.font = { bold: true, color: { argb: 'FF000000' } };
            distribuicaoHeader.alignment = { horizontal: 'center' };
            distribuicaoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
            distribuicaoHeader.border = thinBorder;

            // Cabeçalhos da tabela principal
            const headerRow = worksheet.getRow(13);
            headerRow.values = ['Escola', 'Quantidade', 'Unidade', 'Status', 'Última Atualização', 'Observações'];
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
            headerRow.eachCell(cell => { cell.border = thinBorder; });

            // Definir larguras das colunas
            worksheet.columns = [
                { key: 'escola', width: 35 },
                { key: 'quantidade', width: 15 },
                { key: 'unidade', width: 12 },
                { key: 'status', width: 15 },
                { key: 'atualizacao', width: 20 },
                { key: 'obs', width: 30 }
            ];

            // Dados das escolas
            if (estoqueDetalhado.escolas && estoqueDetalhado.escolas.length > 0) {
                estoqueDetalhado.escolas.forEach((escola: any) => {
                    const row = worksheet.addRow([
                        escola.escola_nome,
                        escola.quantidade_atual || 0,
                        produtoSelecionado.unidade,
                        escola.quantidade_atual > 0 ? 'Com Estoque' : 'Sem Estoque',
                        escola.data_ultima_atualizacao ? new Date(escola.data_ultima_atualizacao).toLocaleDateString('pt-BR') : 'Nunca atualizado',
                        escola.observacoes || ''
                    ]);

                    // Itera sobre cada célula da linha para aplicar bordas e a cor de fundo condicionalmente
                    row.eachCell(cell => {
                        // 1. Aplica a borda a todas as células da linha
                        cell.border = thinBorder;

                        // 2. Aplica a cor de fundo SOMENTE se a condição for atendida
                        if (escola.quantidade_atual <= 0) {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFE8E8' } // Rosa claro para "Sem Estoque"
                            };
                        }
                    });
                });
            } else {
                const row = worksheet.addRow(['Nenhuma escola encontrada']);
                worksheet.mergeCells(`A${row.number}:F${row.number}`);
                row.getCell('A').alignment = { horizontal: 'center' };
                row.getCell('A').font = { italic: true };
            }

            // Gerar e baixar arquivo
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `detalhes-estoque-${produtoSelecionado.nome.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);

            setDetalhesModalOpen(false);
        } catch (error) {
            console.error('Erro ao exportar detalhes Excel:', error);
            setError('Erro ao exportar detalhes em Excel.');
        }
    };

    const verDetalhesEstoque = async (produto: ProdutoComEstoque) => {
        try {
            setLoadingDetalhes(true);
            setProdutoSelecionado(produto);
            setDetalhesModalOpen(true);
            const detalhes = await buscarEstoqueEscolarProduto(produto.id);
            setEstoqueDetalhado(detalhes);
            setTenantError(null); // Clear any previous tenant errors
        } catch (err: any) {
            console.error('Erro ao carregar detalhes do estoque:', err);
            handleTenantError(err);
        } finally {
            setLoadingDetalhes(false);
        }
    };

    // Função para buscar lotes por validade de um produto específico em uma escola
    const verDetalhesValidadeEstoque = async (escola: any, produto: any) => {
        // Evitar múltiplas chamadas simultâneas
        if (loadingLotes) {
            return;
        }

        try {
            setLoadingLotes(true);
            setModalValidadeOpen(true);
            setDadosValidadeSelecionados({
                escola,
                produto,
                lotes: []
            });

            // Usar o serviço de estoque existente
            const { listarEstoqueEscola } = await import('../services/estoqueEscola');
            const estoqueData = await listarEstoqueEscola(escola.escola_id);
            const itemEstoque = estoqueData?.find((item: any) => item.produto_id === produto.id);

            if (!itemEstoque) {
                throw new Error(`Produto "${produto.nome}" não encontrado no estoque da escola "${escola.escola_nome}"`);
            }
            
            let lotes = [];
            
            // Verificar se o item tem lotes específicos (propriedade pode não existir na interface)
            const itemComLotes = itemEstoque as any;
            
            if (itemComLotes?.lotes && itemComLotes.lotes.length > 0) {
                // Se tem lotes específicos, usar eles
                lotes = itemComLotes.lotes
                    .filter((lote: any) => lote.quantidade_atual > 0)
                    .map((lote: any) => ({
                        id: lote.id,
                        lote: lote.lote,
                        quantidade: lote.quantidade_atual,
                        data_validade: lote.data_validade,
                        data_fabricacao: lote.data_fabricacao,
                        status: lote.status
                    }));
            } else if (itemEstoque?.quantidade_atual > 0) {
                // Se não tem lotes, criar um "lote virtual" com os dados principais
                lotes = [{
                    id: 'principal',
                    lote: 'Estoque Principal',
                    quantidade: itemEstoque.quantidade_atual,
                    data_validade: (itemEstoque as any).data_validade || null,
                    data_fabricacao: itemEstoque.data_ultima_atualizacao,
                    status: 'ativo'
                }];
            }

            setDadosValidadeSelecionados({
                escola,
                produto,
                lotes
            });
        } catch (err: any) {
            console.error('Erro ao carregar detalhes de validade:', err);
            handleTenantError(err);
            setModalValidadeOpen(false);
        } finally {
            setLoadingLotes(false);
        }
    };

    // Componente de Filtros
    const FiltersContent = () => (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: '12px', p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.9rem' }}>Filtros Avançados</Typography>
                {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.8rem' }}>Limpar</Button>}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {modoVisualizacao === 'produtos' ? (
                    <FormControl sx={{ minWidth: 200 }} size="small">
                        <InputLabel>Categoria</InputLabel>
                        <Select value={selectedCategoria} onChange={(e) => setSelectedCategoria(e.target.value)} label="Categoria">
                            <MenuItem value="">Todas</MenuItem>
                            {categorias.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                    </FormControl>
                ) : (
                    <Autocomplete
                        multiple
                        options={produtosComEstoque}
                        getOptionLabel={(option) => option.nome}
                        value={produtosComEstoque.filter(p => selectedProdutos.includes(p.id))}
                        onChange={(event, newValue) => {
                            setSelectedProdutos(newValue.map(p => p.id));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Produtos para exibir"
                                placeholder="Selecione os produtos..."
                                size="small"
                            />
                        )}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip
                                    variant="outlined"
                                    label={option.nome}
                                    size="small"
                                    {...getTagProps({ index })}
                                />
                            ))
                        }
                        sx={{ minWidth: 300 }}
                        limitTags={3}
                        disableCloseOnSelect
                    />
                )}
            </Box>
        </Box>
    );

    // Show tenant loading state
    if (tenantLoading) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={60} />
                    <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
                        Carregando contexto da organização...
                    </Typography>
                </Box>
            </Box>
        );
    }

    // Show error if no tenant context
    if (!currentTenant && !tenantLoading) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        Contexto de organização não encontrado
                    </Alert>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Não foi possível identificar sua organização. Faça login novamente ou entre em contato com o suporte.
                    </Typography>
                    <Button 
                        variant="contained" 
                        onClick={() => window.location.reload()}
                        sx={{ mt: 2 }}
                    >
                        Recarregar Página
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
                <PageHeader 
                    title="Estoque Escolar"
                    totalCount={produtosComEstoque.length}
                    statusLegend={[]}
                />

                {/* Mensagem de Sucesso */}
                {successMessage && (
                    <Alert
                        severity="success"
                        sx={{ mb: 3 }}
                        onClose={() => setSuccessMessage(null)}
                    >
                        {successMessage}
                    </Alert>
                )}

                {/* Mensagem de Erro de Tenant */}
                {tenantError && (
                    <Alert
                        severity="error"
                        sx={{ mb: 3 }}
                        onClose={() => setTenantError(null)}
                    >
                        {tenantError}
                    </Alert>
                )}

                {/* Mensagem de Erro Geral */}
                {error && (
                    <Alert
                        severity="error"
                        sx={{ mb: 3 }}
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}
                <Card sx={{ borderRadius: '12px', p: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
                        <TextField
                            placeholder={modoVisualizacao === 'produtos' ? "Buscar produtos..." : "Buscar escolas..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            size="small"
                            sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                            InputProps={{
                                startAdornment: (<InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment>),
                                endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>)
                            }}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                startIcon={modoVisualizacao === 'produtos' ? <ViewModule /> : <ViewList />}
                                onClick={alternarVisualizacao}
                                size="small"
                            >
                                {modoVisualizacao === 'produtos' ? 'Ver por Escolas' : 'Ver por Produtos'}
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={atualizarDadosIncrementais}
                                size="small"
                                disabled={loadingMatriz}
                            >
                                {loadingMatriz ? 'Atualizando...' : 'Atualizar'}
                            </Button>
                            <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLess /> : <TuneRounded />} onClick={toggleFilters} size="small">Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />)}</Button>
                            <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small"><MoreVert /></IconButton>
                        </Box>
                    </Box>
                    <Collapse in={filtersExpanded} timeout={300}><Box sx={{ mb: 2 }}><FiltersContent /></Box></Collapse>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                            {modoVisualizacao === 'produtos'
                                ? `Mostrando ${Math.min((page * rowsPerPage) + 1, filteredProdutos.length)}-${Math.min((page + 1) * rowsPerPage, filteredProdutos.length)} de ${filteredProdutos.length} produtos`
                                : `Mostrando ${Math.min((page * rowsPerPage) + 1, filteredEscolas.length)}-${Math.min((page + 1) * rowsPerPage, filteredEscolas.length)} de ${filteredEscolas.length} escolas`
                            }
                        </Typography>
                        
                        {/* Legenda de validade para modo escolas */}
                        {modoVisualizacao === 'escolas' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    Validade:
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fef2f2' }} />
                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#dc2626' }}>
                                        Vencido
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fef3c7' }} />
                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#d97706' }}>
                                        ≤30 dias
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontStyle: 'italic' }}>
                                    • Duplo clique para detalhes
                                </Typography>
                            </Box>
                        )}
                        
                        {estoqueQuery.dataUpdatedAt && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                Última atualização: {new Date(estoqueQuery.dataUpdatedAt).toLocaleTimeString('pt-BR')}
                            </Typography>
                        )}
                    </Box>
                </Card>

                {(loading || loadingMatriz) ? (
                    <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <CircularProgress size={60} />
                        {loadingMatriz && (
                            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                                Carregando dados da matriz...
                            </Typography>
                        )}
                    </CardContent></Card>
                ) : (error || estoqueQuery.error || matrizQuery.error) ? (
                    <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error || estoqueQuery.error?.message || matrizQuery.error?.message}</Alert><Button variant="contained" onClick={refetchEstoque}>Tentar Novamente</Button></CardContent></Card>
                ) : (modoVisualizacao === 'produtos' ? filteredProdutos.length === 0 : filteredEscolas.length === 0) ? (
                    <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Inventory sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhum {modoVisualizacao === 'produtos' ? 'produto' : 'dado'} encontrado</Typography></CardContent></Card>
                ) : (
                    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
                        {modoVisualizacao === 'produtos' ? (
                            // Visualização por Produtos (original)
                            <>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ py: 1 }}>Produto</TableCell>
                                                <TableCell align="center" sx={{ py: 1 }}>Categoria</TableCell>
                                                <TableCell align="center" sx={{ py: 1 }}>Qtd. Total</TableCell>
                                                <TableCell align="center" sx={{ py: 1 }}>Escolas c/ Estoque</TableCell>
                                                <TableCell align="center" sx={{ py: 1 }}>Ações</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {paginatedProdutos.map((produto) => (
                                                <TableRow key={produto.id} hover>
                                                    <TableCell sx={{ py: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                            {produto.nome}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ py: 1 }}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {produto.categoria || '-'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ py: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', lineHeight: 1.2 }}>
                                                            {formatarNumero(produto.total_quantidade || 0)} {produto.unidade}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ py: 1 }}>
                                                        <Typography variant="body2">
                                                            {`${produto.total_escolas_com_estoque || 0} de ${produto.total_escolas || 0}`}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ py: 1 }}>
                                                        <Tooltip title="Ver Detalhes">
                                                            <IconButton size="small" onClick={() => verDetalhesEstoque(produto)} color="primary">
                                                                <Visibility fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <TablePagination component="div" count={filteredProdutos.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50, 100]} labelRowsPerPage="Itens por página:" />
                            </>
                        ) : (
                            // Visualização por Escolas (matriz)
                            <TableContainer sx={{
                                maxHeight: 'calc(100vh - 300px)',
                                minHeight: 400,
                                overflow: 'auto',
                                position: 'relative',
                                '& .MuiTableHead-root': {
                                    '& .MuiTableCell-root': {
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    }
                                }
                            }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{
                                                fontWeight: 'bold',
                                                bgcolor: '#2563eb !important',
                                                color: 'white !important',
                                                minWidth: 200,
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 100,
                                                borderBottom: '2px solid #1d4ed8',
                                                py: 1
                                            }}>
                                                Escola
                                            </TableCell>
                                            {produtosParaExibir.map((produto) => (
                                                <TableCell
                                                    key={produto.id}
                                                    align="center"
                                                    sx={{
                                                        fontWeight: 'bold',
                                                        bgcolor: '#2563eb !important',
                                                        color: 'white !important',
                                                        minWidth: 120,
                                                        fontSize: '0.75rem',
                                                        position: 'sticky',
                                                        top: 0,
                                                        zIndex: 100,
                                                        borderBottom: '2px solid #1d4ed8',
                                                        py: 1
                                                    }}
                                                >
                                                    {produto.nome}
                                                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                        ({produto.unidade})
                                                    </Typography>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedEscolas.map((escola) => (
                                            <TableRow key={escola.escola_id} hover>
                                                <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc', color: '#1e293b', py: 1 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                        {escola.escola_nome}
                                                    </Typography>
                                                </TableCell>
                                                {produtosParaExibir.map((produto) => {
                                                    const estoqueProduto = escola.produtos[produto.id];
                                                    const quantidade = estoqueProduto?.quantidade || 0;
                                                    const dataValidade = estoqueProduto?.data_validade;
                                                    
                                                    // Calcular status da validade
                                                    let statusValidade = 'normal';
                                                    let diasParaVencimento = null;
                                                    let corFundo = quantidade > 0 ? '#f0fdf4' : '#f8fafc';
                                                    let corTexto = quantidade > 0 ? '#059669' : '#64748b';
                                                    
                                                    if (dataValidade && quantidade > 0) {
                                                        const hoje = new Date();
                                                        hoje.setHours(0, 0, 0, 0);
                                                        const validade = new Date(dataValidade);
                                                        validade.setHours(0, 0, 0, 0);
                                                        
                                                        diasParaVencimento = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                                                        
                                                        if (diasParaVencimento < 0) {
                                                            statusValidade = 'vencido';
                                                            corFundo = '#fef2f2';
                                                            corTexto = '#dc2626';
                                                        } else if (diasParaVencimento <= 7) {
                                                            statusValidade = 'critico';
                                                            corFundo = '#fef3c7';
                                                            corTexto = '#d97706';
                                                        } else if (diasParaVencimento <= 30) {
                                                            statusValidade = 'atencao';
                                                            corFundo = '#fef3c7';
                                                            corTexto = '#d97706';
                                                        }
                                                    }

                                                    return (
                                                        <TableCell
                                                            key={produto.id}
                                                            align="center"
                                                            sx={{
                                                                bgcolor: corFundo,
                                                                color: corTexto,
                                                                py: 1,
                                                                position: 'relative',
                                                                cursor: quantidade > 0 ? 'pointer' : 'default',
                                                                '&:hover': quantidade > 0 ? {
                                                                    bgcolor: statusValidade === 'vencido' ? '#fecaca' :
                                                                             statusValidade === 'critico' || statusValidade === 'atencao' ? '#fed7aa' :
                                                                             '#dcfce7',
                                                                    transition: 'background-color 0.2s'
                                                                } : {}
                                                            }}
                                                            onDoubleClick={() => {
                                                                if (quantidade > 0) {
                                                                    verDetalhesValidadeEstoque(escola, produto);
                                                                }
                                                            }}
                                                        >
                                                            <Tooltip 
                                                                title={quantidade > 0 ? "Duplo clique para ver detalhes por validade" : ""} 
                                                                arrow
                                                                placement="top"
                                                            >
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            fontWeight: quantidade > 0 ? 600 : 400,
                                                                            fontSize: '0.875rem',
                                                                            lineHeight: 1.2
                                                                        }}
                                                                    >
                                                                        {formatarNumero(quantidade)}
                                                                    </Typography>
                                                                    
                                                                    {/* Indicador de validade sutil */}
                                                                    {dataValidade && quantidade > 0 && statusValidade !== 'normal' && (
                                                                        <Typography
                                                                            variant="caption"
                                                                            sx={{
                                                                                fontSize: '0.65rem',
                                                                                fontWeight: 500,
                                                                                opacity: 0.8,
                                                                                lineHeight: 1
                                                                            }}
                                                                        >
                                                                                    {statusValidade === 'vencido' ? 'Vencido' : 
                                                                             diasParaVencimento === 0 ? 'Vence hoje' :
                                                                             `${diasParaVencimento}d`}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Tooltip>
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {modoVisualizacao === 'escolas' && (
                            <TablePagination
                                component="div"
                                count={filteredEscolas.length}
                                page={page}
                                onPageChange={handleChangePage}
                                rowsPerPage={rowsPerPage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                                rowsPerPageOptions={[5, 10, 25, 50, 100]}
                                labelRowsPerPage="Escolas por página:"
                            />
                        )}
                    </Paper>
                )}
            </Box>

            {/* Modal de Detalhes */}
            <Dialog open={detalhesModalOpen} onClose={() => setDetalhesModalOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{
                    bgcolor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                }}>
                    <Inventory sx={{ color: '#4f46e5' }} />
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Detalhes do Estoque: {produtoSelecionado?.nome}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Distribuição por escola
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {loadingDetalhes ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                            <CircularProgress />
                        </Box>
                    ) : estoqueDetalhado ? (
                        <Box>
                            {/* Resumo */}
                            <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={4}>
                                        <Card sx={{ textAlign: 'center', p: 2 }}>
                                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#059669' }}>
                                                {estoqueDetalhado.total_quantidade || 0}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Total Geral ({produtoSelecionado?.unidade})
                                            </Typography>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Card sx={{ textAlign: 'center', p: 2 }}>
                                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#2563eb' }}>
                                                {estoqueDetalhado.total_escolas_com_estoque || 0}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Escolas com Estoque
                                            </Typography>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Card sx={{ textAlign: 'center', p: 2 }}>
                                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#dc2626' }}>
                                                {(estoqueDetalhado.total_escolas || 0) - (estoqueDetalhado.total_escolas_com_estoque || 0)}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Escolas sem Estoque
                                            </Typography>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Lista de Escolas */}
                            <Box sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Distribuição por Escola
                                </Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Escola</TableCell>
                                                <TableCell align="center">Quantidade</TableCell>
                                                <TableCell align="center">Status</TableCell>
                                                <TableCell>Última Atualização</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {estoqueDetalhado.escolas?.map((escola: any) => (
                                                <TableRow key={escola.escola_id} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {escola.escola_nome}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {formatarNumero(escola.quantidade_atual || 0)} {produtoSelecionado?.unidade}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={escola.quantidade_atual > 0 ? 'Com Estoque' : 'Sem Estoque'}
                                                            size="small"
                                                            color={escola.quantidade_atual > 0 ? 'success' : 'error'}
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {escola.data_ultima_atualizacao ?
                                                                new Date(escola.data_ultima_atualizacao).toLocaleDateString('pt-BR') :
                                                                'Nunca atualizado'
                                                            }
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )) || (
                                                    <TableRow>
                                                        <TableCell colSpan={4} align="center">
                                                            <Typography color="text.secondary">
                                                                Nenhum dado de escola encontrado
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                Erro ao carregar detalhes do estoque
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0' }}>
                    <Button
                        onClick={() => exportarDetalhesExcel()}
                        variant="contained"
                        startIcon={<Download />}
                        sx={{
                            mr: 1
                        }}
                        color="success"
                    >
                        Exportar Excel
                    </Button>
                    <Button
                        onClick={() => setDetalhesModalOpen(false)}
                        variant="outlined"
                    >
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Detalhes por Validade */}
            <Dialog 
                open={modalValidadeOpen} 
                onClose={() => setModalValidadeOpen(false)} 
                maxWidth="md" 
                fullWidth
            >
                <DialogTitle sx={{
                    bgcolor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                }}>
                    <Inventory sx={{ color: '#4f46e5' }} />
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Detalhes por Validade
                        </Typography>
                        {dadosValidadeSelecionados && (
                            <Typography variant="body2" color="text.secondary">
                                {dadosValidadeSelecionados.produto.nome} - {dadosValidadeSelecionados.escola.escola_nome}
                            </Typography>
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {loadingLotes ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                            <CircularProgress />
                            <Typography variant="body2" sx={{ ml: 2 }}>
                                Carregando detalhes...
                            </Typography>
                        </Box>
                    ) : dadosValidadeSelecionados ? (
                        <Box sx={{ p: 3 }}>
                            {dadosValidadeSelecionados.lotes.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography variant="h6" color="text.secondary">
                                        Nenhum estoque encontrado
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Este produto não possui estoque nesta escola.
                                    </Typography>
                                </Box>
                            ) : (
                                <>
                                    {/* Resumo */}
                                    <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Quantidade Total
                                                </Typography>
                                                <Typography variant="h5" sx={{ fontWeight: 600, color: '#059669' }}>
                                                    {dadosValidadeSelecionados.lotes.reduce((total, lote) => total + (Number(lote.quantidade) || 0), 0).toFixed(2)} {dadosValidadeSelecionados.produto.unidade}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Lotes/Grupos
                                                </Typography>
                                                <Typography variant="h5" sx={{ fontWeight: 600, color: '#2563eb' }}>
                                                    {dadosValidadeSelecionados.lotes.length}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Box>

                                    {/* Lista de Lotes */}
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                        Distribuição por Validade
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {dadosValidadeSelecionados.lotes
                                            .sort((a, b) => {
                                                // Ordenar por validade (mais próxima primeiro)
                                                if (!a.data_validade && !b.data_validade) return 0;
                                                if (!a.data_validade) return 1;
                                                if (!b.data_validade) return -1;
                                                return new Date(a.data_validade).getTime() - new Date(b.data_validade).getTime();
                                            })
                                            .map((lote, index) => {
                                                // Calcular status da validade
                                                let statusValidade = 'normal';
                                                let diasParaVencimento = null;
                                                let corCard = '#f0fdf4';
                                                let corTexto = '#059669';
                                                
                                                if (lote.data_validade) {
                                                    const hoje = new Date();
                                                    hoje.setHours(0, 0, 0, 0);
                                                    const validade = new Date(lote.data_validade);
                                                    validade.setHours(0, 0, 0, 0);
                                                    
                                                    diasParaVencimento = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                                                    
                                                    if (diasParaVencimento < 0) {
                                                        statusValidade = 'vencido';
                                                        corCard = '#fef2f2';
                                                        corTexto = '#dc2626';
                                                    } else if (diasParaVencimento <= 7) {
                                                        statusValidade = 'critico';
                                                        corCard = '#fef3c7';
                                                        corTexto = '#d97706';
                                                    } else if (diasParaVencimento <= 30) {
                                                        statusValidade = 'atencao';
                                                        corCard = '#fef3c7';
                                                        corTexto = '#d97706';
                                                    }
                                                }

                                                return (
                                                    <Card 
                                                        key={lote.id || index} 
                                                        sx={{ 
                                                            bgcolor: corCard,
                                                            border: `1px solid ${corTexto}20`,
                                                            borderLeft: `4px solid ${corTexto}`
                                                        }}
                                                    >
                                                        <CardContent sx={{ py: 2 }}>
                                                            <Grid container spacing={2} alignItems="center">
                                                                <Grid item xs={12} sm={4}>
                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                                        {lote.lote}
                                                                    </Typography>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        {lote.status === 'ativo' ? 'Ativo' : lote.status}
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={12} sm={3}>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Quantidade
                                                                    </Typography>
                                                                    <Typography variant="h6" sx={{ fontWeight: 600, color: corTexto }}>
                                                                        {Number(lote.quantidade).toFixed(2)} {dadosValidadeSelecionados.produto.unidade}
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={12} sm={3}>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Validade
                                                                    </Typography>
                                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                        {lote.data_validade ? 
                                                                            new Date(lote.data_validade).toLocaleDateString('pt-BR') : 
                                                                            'Sem validade'
                                                                        }
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={12} sm={2}>
                                                                    {lote.data_validade && (
                                                                        <Chip
                                                                            label={
                                                                                statusValidade === 'vencido' ? 'Vencido' :
                                                                                diasParaVencimento === 0 ? 'Vence hoje' :
                                                                                statusValidade === 'critico' ? `${diasParaVencimento} dias` :
                                                                                statusValidade === 'atencao' ? `${diasParaVencimento} dias` :
                                                                                'Normal'
                                                                            }
                                                                            size="small"
                                                                            sx={{
                                                                                bgcolor: corTexto + '20',
                                                                                color: corTexto,
                                                                                fontWeight: 600
                                                                            }}
                                                                        />
                                                                    )}
                                                                </Grid>
                                                            </Grid>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                    </Box>
                                </>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                Erro ao carregar detalhes
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0' }}>
                    <Button
                        onClick={() => setModalValidadeOpen(false)}
                        variant="outlined"
                    >
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Confirmação de Reset */}
            <Dialog
                open={resetModalOpen}
                onClose={() => setResetModalOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{
                    bgcolor: '#fef2f2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}>
                    <Warning />
                    Confirmar Reset do Estoque Global
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <strong>Atenção!</strong> Esta ação irá resetar o estoque de TODAS as escolas.
                    </Alert>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Você tem certeza que deseja resetar todo o estoque? Esta ação:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                        <li>Zerará todas as quantidades de estoque de todas as escolas</li>
                        <li>Criará um backup automático dos dados atuais</li>
                        <li>Registrará a operação no histórico</li>
                        <li><strong>NÃO PODE SER DESFEITA</strong></li>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        Recomendamos fazer esta operação apenas no início do ano letivo ou após inventário completo.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 1 }}>
                    <Button
                        onClick={() => setResetModalOpen(false)}
                        variant="outlined"
                        disabled={loadingReset}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleResetEstoque}
                        variant="contained"
                        color="error"
                        disabled={loadingReset}
                        sx={{
                            bgcolor: '#dc2626',
                            '&:hover': {
                                bgcolor: '#b91c1c'
                            }
                        }}
                    >
                        {loadingReset ? (
                            <>
                                <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                                Resetando...
                            </>
                        ) : (
                            'Confirmar Reset'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Menu de Ações */}
            <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
                <MenuItem onClick={() => { setActionsMenuAnchor(null); refetchEstoque(); }}><Refresh sx={{ mr: 1 }} /> Atualizar Resumo</MenuItem>
                <MenuItem onClick={() => { setActionsMenuAnchor(null); exportarExcel(); }}><Download sx={{ mr: 1 }} /> Exportar Lista</MenuItem>
                <Divider />
                <MenuItem onClick={() => { setActionsMenuAnchor(null); setResetModalOpen(true); }} sx={{ color: 'error.main' }}><RestartAlt sx={{ mr: 1 }} /> Resetar Estoques</MenuItem>
            </Menu>
        </Box>
    );
};

export default EstoqueEscolarPage;