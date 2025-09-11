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
    buscarEstoqueEscolarProduto, listarEstoqueEscolar, EstoqueEscolarProduto
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
    const handleResetEstoque = async () => { /* ... sua lógica de reset ... */ };
    const exportarExcel = async () => { /* ... sua lógica de exportação ... */ };
    
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TuneRounded sx={{ color: '#4f46e5' }} /><Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>Filtros Avançados</Typography></Box>
                {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: '#64748b', textTransform: 'none' }}>Limpar Tudo</Button>}
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
        <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
            {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
            <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
                <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <TextField placeholder="Buscar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} InputProps={{ startAdornment: (<InputAdornment position="start"><Search sx={{ color: '#64748b' }} /></InputAdornment>), endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>)}}/>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLess /> : <TuneRounded />} onClick={toggleFilters}>Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }}/>)}</Button>
                            <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} sx={{ border: '1px solid #d1d5db' }}><MoreVert /></IconButton>
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

            {/* Modal de Detalhes (sem alterações, pois já é complexo e funcional) */}
            <Dialog open={detalhesModalOpen} onClose={() => setDetalhesModalOpen(false)} maxWidth="lg" fullWidth>
                {/* ... seu código do modal de detalhes aqui ... */}
            </Dialog>

            {/* Modal de Reset (sem alterações) */}
            <Dialog open={resetModalOpen} onClose={() => !loadingReset && setResetModalOpen(false)} maxWidth="sm" fullWidth>
                {/* ... seu código do modal de reset aqui ... */}
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