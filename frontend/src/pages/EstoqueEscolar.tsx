import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Box, Typography, TextField, Button, Card, CardContent, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip, InputAdornment, FormControl,
    InputLabel, Select, MenuItem, Grid, IconButton, Tooltip, Menu, TablePagination,
    Collapse, Divider,
} from '@mui/material';
import {
    Search, Inventory, Visibility, School, Assessment, CheckCircle, Warning,
    Refresh, Download, FilterList, MoreVert, RestartAlt, TuneRounded, ExpandLess, ExpandMore, Clear as ClearIcon
} from '@mui/icons-material';
import * as ExcelJS from 'exceljs';
import {
    buscarEstoqueEscolarProduto, listarEstoqueEscolar, EstoqueEscolarProduto, resetEstoqueGlobal
} from '../services/estoqueEscolar';

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
    // Estados principais
    const [produtosComEstoque, setProdutosComEstoque] = useState<ProdutoComEstoque[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estados de filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoria, setSelectedCategoria] = useState('');
    const [sortBy, setSortBy] = useState('nome');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [hasActiveFilters, setHasActiveFilters] = useState(false);

    // Estados de paginação
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    // Estados de modais e menus
    const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [loadingReset, setLoadingReset] = useState(false);
    const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
    const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoComEstoque | null>(null);
    const [estoqueDetalhado, setEstoqueDetalhado] = useState<EstoqueEscolarProduto | null>(null);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);

    // Carregar dados
    const loadEstoque = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const estoqueData = await listarEstoqueEscolar();
            const produtosFormatados = estoqueData.map((item: any) => ({
                id: item.produto_id,
                nome: item.produto_nome,
                unidade: item.unidade,
                categoria: item.categoria,
                total_quantidade: item.total_quantidade,
                total_escolas_com_estoque: item.total_escolas_com_estoque,
                total_escolas: item.total_escolas
            }));
            setProdutosComEstoque(produtosFormatados);
        } catch (err) {
            setError('Erro ao carregar dados de estoque. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEstoque();
    }, [loadEstoque]);

    // Lógica de UI
    const categorias = useMemo(() => [...new Set(produtosComEstoque.map(p => p.categoria).filter(Boolean))].sort(), [produtosComEstoque]);
    useEffect(() => { setHasActiveFilters(!!(searchTerm || selectedCategoria)); }, [searchTerm, selectedCategoria]);

    // Filtros e Paginação
    const filteredProdutos = useMemo(() => {
        return produtosComEstoque.filter(p => 
            p.nome.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (!selectedCategoria || p.categoria === selectedCategoria)
        ).sort((a, b) => a.nome.localeCompare(b.nome));
    }, [produtosComEstoque, searchTerm, selectedCategoria]);

    const paginatedProdutos = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return filteredProdutos.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredProdutos, page, rowsPerPage]);

    const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);
    useEffect(() => setPage(0), [searchTerm, selectedCategoria]);

    const clearFilters = useCallback(() => { setSearchTerm(''); setSelectedCategoria(''); }, []);
    const toggleFilters = useCallback(() => setFiltersExpanded(!filtersExpanded), [filtersExpanded]);

    // Funções de Ações
    const handleResetEstoque = async () => {
        try {
            setLoadingReset(true);
            setError(null);
            setResetModalOpen(false);
            
            const result = await resetEstoqueGlobal();
            
            if (result.success) {
                setSuccessMessage(`Estoque global resetado com sucesso! ${result.data.estoques_resetados} itens foram resetados.`);
                await loadEstoque(); // Recarregar os dados
            } else {
                throw new Error(result.message || 'Erro ao resetar estoque');
            }
            
        } catch (err: any) {
            console.error('Erro ao resetar estoque:', err);
            setError('Erro ao resetar estoque global. Tente novamente.');
        } finally {
            setLoadingReset(false);
        }
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
                    unidade: produto.unidade,
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
            infoHeader.font = { bold: true, color: { argb: 'FF000000'} };
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
            resumoHeader.font = { bold: true, color: { argb: 'FF000000'} };
            resumoHeader.alignment = { horizontal: 'center' };
            resumoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
            resumoHeader.border = thinBorder;
            
            worksheet.getRow(8).values = ['Total de Escolas:', estoqueDetalhado.resumo?.total_escolas || 0, '', 'Escolas com Estoque:', estoqueDetalhado.resumo?.escolas_com_estoque || 0];
            worksheet.getRow(9).values = ['Escolas sem Estoque:', estoqueDetalhado.resumo?.escolas_sem_estoque || 0, '', 'Quantidade Total:', `${estoqueDetalhado.resumo?.quantidade_total || 0} ${produtoSelecionado.unidade}`];
            
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
        } catch (err) {
            setError('Erro ao carregar detalhes do estoque.');
        } finally {
            setLoadingDetalhes(false);
        }
    };
    
    // Componente de Filtros
    const FiltersContent = () => (
        <Box sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '16px', p: 3, border: '1px solid rgba(148, 163, 184, 0.1)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TuneRounded sx={{ color: 'primary.main' }} /><Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>Filtros Avançados</Typography></Box>
                {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: 'text.secondary', textTransform: 'none' }}>Limpar Tudo</Button>}
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Categoria</InputLabel>
                    <Select value={selectedCategoria} onChange={(e) => setSelectedCategoria(e.target.value)} label="Categoria">
                        <MenuItem value="">Todas</MenuItem>
                        {categorias.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
                <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>Estoque Escolar</Typography>
                
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
                <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <TextField placeholder="Buscar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} InputProps={{ startAdornment: (<InputAdornment position="start"><Search sx={{ color: '#64748b' }} /></InputAdornment>), endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>)}}/>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLess /> : <TuneRounded />} onClick={toggleFilters}>Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }}/>)}</Button>
                            <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)}><MoreVert /></IconButton>
                        </Box>
                    </Box>
                    <Collapse in={filtersExpanded} timeout={400}><Box sx={{ mb: 3 }}><FiltersContent /></Box></Collapse>
                    <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>{`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredProdutos.length)}-${Math.min((page + 1) * rowsPerPage, filteredProdutos.length)} de ${filteredProdutos.length} produtos`}</Typography>
                </Card>

                {loading ? (
                    <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
                ) : error ? (
                    <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadEstoque}>Tentar Novamente</Button></CardContent></Card>
                ) : filteredProdutos.length === 0 ? (
                    <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Inventory sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} /><Typography variant="h6" sx={{ color: '#6b7280' }}>Nenhum produto encontrado</Typography></CardContent></Card>
                ) : (
                    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow><TableCell>Produto</TableCell><TableCell>Categoria</TableCell><TableCell align="center">Qtd. Total</TableCell><TableCell align="center">Escolas c/ Estoque</TableCell><TableCell align="center">Ações</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {paginatedProdutos.map((produto) => (
                                        <TableRow key={produto.id} hover>
                                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{produto.nome}</Typography></TableCell>
                                            <TableCell>{produto.categoria ? <Chip label={produto.categoria} size="small" variant="outlined" /> : '-'}</TableCell>
                                            <TableCell align="center"><Typography variant="body2" sx={{ fontWeight: 600 }}>{`${produto.total_quantidade || 0} ${produto.unidade}`}</Typography></TableCell>
                                            <TableCell align="center"><Typography variant="body2">{`${produto.total_escolas_com_estoque || 0} de ${produto.total_escolas || 0}`}</Typography></TableCell>
                                            <TableCell align="center"><Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => verDetalhesEstoque(produto)} color="primary"><Visibility fontSize="small" /></IconButton></Tooltip></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination component="div" count={filteredProdutos.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Itens por página:" />
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
                                                {estoqueDetalhado.resumo?.quantidade_total || 0}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Total Geral ({produtoSelecionado?.unidade})
                                            </Typography>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Card sx={{ textAlign: 'center', p: 2 }}>
                                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#2563eb' }}>
                                                {estoqueDetalhado.resumo?.escolas_com_estoque || 0}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Escolas com Estoque
                                            </Typography>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Card sx={{ textAlign: 'center', p: 2 }}>
                                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#dc2626' }}>
                                                {estoqueDetalhado.resumo?.escolas_sem_estoque || 0}
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
                                                             {escola.quantidade_atual || 0} {produtoSelecionado?.unidade}
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
                <MenuItem onClick={() => { setActionsMenuAnchor(null); loadEstoque(); }}><Refresh sx={{ mr: 1 }} /> Atualizar Resumo</MenuItem>
                <MenuItem onClick={() => { setActionsMenuAnchor(null); exportarExcel(); }}><Download sx={{ mr: 1 }} /> Exportar Lista</MenuItem>
                <Divider />
                <MenuItem onClick={() => { setActionsMenuAnchor(null); setResetModalOpen(true); }} sx={{ color: 'error.main' }}><RestartAlt sx={{ mr: 1 }} /> Resetar Estoques</MenuItem>
            </Menu>
        </Box>
    );
};

export default EstoqueEscolarPage;