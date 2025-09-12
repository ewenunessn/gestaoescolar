import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  listarProdutos,
  criarProduto,
  importarProdutosLote,
} from "../services/produtos";
import ImportacaoProdutos from '../components/ImportacaoProdutos';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Chip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Tooltip,
  Paper,
  Menu,
  TablePagination,
  Checkbox,
  OutlinedInput,
  ListItemText,
  Collapse,
  Divider,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Info,
  Inventory,
  Download,
  MoreVert,
  Upload,
  TuneRounded,
  ExpandMore,
  ExpandLess,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';

// Interfaces
interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  unidade?: string;
  categoria?: string;
  marca?: string;
  codigo_barras?: string;
  peso?: number;
  validade_minima?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  imagem_url?: string;
  preco_referencia?: number;
  estoque_minimo?: number;
  ativo: boolean;
}

interface ProdutoForm {
  nome: string;
  descricao: string;
  unidade: string;
  categoria: string;
  marca: string;
  codigo_barras?: string;
  peso?: number;
  validade_minima?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  imagem_url?: string;
  preco_referencia?: number;
  estoque_minimo?: number;
  ativo: boolean;
}

const ProdutosPage = () => {
  const navigate = useNavigate();

  // Estados principais
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estados do modal
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProdutoForm>({
    nome: "",
    descricao: "",
    unidade: "",
    categoria: "",
    marca: "",
    ativo: true,
  });

  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Carregar produtos
  const loadProdutos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listarProdutos();
      setProdutos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Erro ao carregar produtos. Tente novamente.');
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProdutos();
  }, [loadProdutos]);

  // Detectar filtros ativos
  useEffect(() => {
    const hasFilters = !!(searchTerm || selectedCategoria || selectedMarcas.length > 0 || selectedStatus);
    setHasActiveFilters(hasFilters);
  }, [searchTerm, selectedCategoria, selectedMarcas, selectedStatus]);

  // Extrair dados únicos para filtros
  const categorias = useMemo(() => [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort(), [produtos]);
  const marcas = useMemo(() => [...new Set(produtos.map(p => p.marca).filter(Boolean))].sort(), [produtos]);

  // Filtrar e ordenar produtos
  const filteredProdutos = useMemo(() => {
    return produtos.filter(produto => {
      const matchesSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategoria = !selectedCategoria || produto.categoria === selectedCategoria;
      const matchesMarca = selectedMarcas.length === 0 || (produto.marca && selectedMarcas.includes(produto.marca));
      const matchesStatus = !selectedStatus ||
        (selectedStatus === 'ativo' && produto.ativo) ||
        (selectedStatus === 'inativo' && !produto.ativo);
      return matchesSearch && matchesCategoria && matchesMarca && matchesStatus;
    }).sort((a, b) => {
      // Lógica de ordenação
      return a.nome.localeCompare(b.nome);
    });
  }, [produtos, searchTerm, selectedCategoria, selectedMarcas, selectedStatus, sortBy]);

  // Produtos paginados
  const paginatedProdutos = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredProdutos.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredProdutos, page, rowsPerPage]);
  
  // Funções de paginação
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);
  
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedCategoria, selectedMarcas, selectedStatus, sortBy]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategoria('');
    setSelectedMarcas([]);
    setSelectedStatus('');
    setSortBy('name');
  }, []);

  const toggleFilters = useCallback(() => setFiltersExpanded(!filtersExpanded), [filtersExpanded]);

  // Componente de conteúdo dos filtros
  const FiltersContent = () => (
    <Box sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '16px', p: 3, border: '1px solid rgba(148, 163, 184, 0.1)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TuneRounded sx={{ color: '#4f46e5' }} /><Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>Filtros Avançados</Typography></Box>
        {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: '#64748b', textTransform: 'none' }}>Limpar Tudo</Button>}
      </Box>
      <Divider sx={{ mb: 3 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
        <FormControl fullWidth><InputLabel>Categoria</InputLabel><Select value={selectedCategoria} onChange={(e) => setSelectedCategoria(e.target.value)} label="Categoria"><MenuItem value="">Todas</MenuItem>{categorias.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel>Marcas</InputLabel><Select multiple value={selectedMarcas} onChange={(e) => setSelectedMarcas(e.target.value as string[])} input={<OutlinedInput label="Marcas" />} renderValue={(selected) => selected.join(', ')}>{marcas.map(m => <MenuItem key={m} value={m}><Checkbox checked={selectedMarcas.includes(m)} />{m}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel>Status</InputLabel><Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} label="Status"><MenuItem value="">Todos</MenuItem><MenuItem value="ativo">Ativos</MenuItem><MenuItem value="inativo">Inativos</MenuItem></Select></FormControl>
        <FormControl fullWidth><InputLabel>Ordenar por</InputLabel><Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Ordenar por"><MenuItem value="name">Nome</MenuItem><MenuItem value="categoria">Categoria</MenuItem><MenuItem value="marca">Marca</MenuItem></Select></FormControl>
      </Box>
    </Box>
  );

  // Funções do modal
  const openModal = () => {
    setFormData({ nome: "", descricao: "", unidade: "", categoria: "", marca: "", ativo: true });
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const novoProduto = await criarProduto(formData);
      setSuccessMessage('Produto criado com sucesso!');
      closeModal();
      await loadProdutos();
      setTimeout(() => setSuccessMessage(null), 3000);
      navigate(`/produtos/${novoProduto.id}`);
    } catch (err) {
      setError("Erro ao salvar produto. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Funções de Importação/Exportação
  const handleImportProdutos = async (produtosImportacao: any[]) => {
    // Implementação da importação...
  };

  const handleExportarProdutos = () => {
    try {
      // Preparar dados para exportação compatível com importação
      const dadosExportacao = filteredProdutos.map(produto => ({
        nome: produto.nome,
        descricao: produto.descricao || '',
        categoria: produto.categoria || '',
        marca: produto.marca || '',
        codigo_barras: produto.codigo_barras || '',
        unidade: produto.unidade || '',
        peso: produto.peso || 0,
        validade_minima: produto.validade_minima || 0,
        fator_divisao: produto.fator_divisao || 1,
        tipo_processamento: produto.tipo_processamento || '',
        imagem_url: produto.imagem_url || '',
        preco_referencia: produto.preco_referencia || 0,
        estoque_minimo: produto.estoque_minimo || 10,
        ativo: produto.ativo
      }));

      if (dadosExportacao.length === 0) {
        setError('Nenhum produto para exportar.');
        return;
      }

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dadosExportacao);

      // Ajustar largura das colunas para compatibilidade
      const colWidths = [
        { wch: 30 }, // nome
        { wch: 35 }, // descricao
        { wch: 15 }, // categoria
        { wch: 15 }, // marca
        { wch: 15 }, // codigo_barras
        { wch: 12 }, // unidade
        { wch: 8 },  // peso
        { wch: 12 }, // validade_minima
        { wch: 12 }, // fator_divisao
        { wch: 18 }, // tipo_processamento
        { wch: 25 }, // imagem_url
        { wch: 12 }, // preco_referencia
        { wch: 12 }, // estoque_minimo
        { wch: 8 }   // ativo
      ];
      ws['!cols'] = colWidths;

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

      // Gerar nome do arquivo com data
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const nomeArquivo = `produtos_exportacao_${dataAtual}.xlsx`;

      // Fazer download do arquivo
      XLSX.writeFile(wb, nomeArquivo);

      // Fechar menu de ações
      setActionsMenuAnchor(null);
    } catch (error) {
      console.error('Erro ao exportar produtos:', error);
      setError('Erro ao exportar produtos para Excel.');
    }
  };

  const handleExportarModelo = () => {
    try {
      // Criar modelo com headers e exemplo
      const headers = [
        'nome', 'descricao', 'categoria', 'marca', 'codigo_barras', 
        'unidade', 'peso', 'validade_minima', 'fator_divisao', 
        'tipo_processamento', 'imagem_url', 'preco_referencia', 
        'estoque_minimo', 'ativo'
      ];

      const exemplo = [
        'Arroz Branco Tipo 1',
        'Arroz branco polido, tipo 1, classe longo fino',
        'Cereais',
        'Tio João',
        '7891234567890',
        'kg',
        1000,
        365,
        1,
        'processado',
        '',
        5.50,
        50,
        true
      ];

      // Criar worksheet com headers e exemplo
      const ws = XLSX.utils.aoa_to_sheet([headers, exemplo]);

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 30 }, // nome
        { wch: 35 }, // descricao
        { wch: 15 }, // categoria
        { wch: 15 }, // marca
        { wch: 15 }, // codigo_barras
        { wch: 12 }, // unidade
        { wch: 8 },  // peso
        { wch: 12 }, // validade_minima
        { wch: 12 }, // fator_divisao
        { wch: 18 }, // tipo_processamento
        { wch: 25 }, // imagem_url
        { wch: 12 }, // preco_referencia
        { wch: 12 }, // estoque_minimo
        { wch: 8 }   // ativo
      ];
      ws['!cols'] = colWidths;

      // Criar workbook e adicionar worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Importacao');

      // Adicionar segunda aba com instruções
      const instrucoes = [
        ['INSTRUÇÕES PARA IMPORTAÇÃO DE PRODUTOS'],
        [''],
        ['Campo', 'Descrição', 'Obrigatório', 'Exemplo'],
        ['nome', 'Nome do produto', 'SIM', 'Arroz Branco'],
        ['descricao', 'Descrição detalhada do produto', 'NÃO', 'Arroz branco tipo 1'],
        ['categoria', 'Categoria do produto', 'NÃO', 'Cereais'],
        ['marca', 'Marca do produto', 'NÃO', 'Tio João'],
        ['codigo_barras', 'Código de barras (8-14 dígitos)', 'NÃO', '7891234567890'],
        ['unidade', 'Unidade de medida', 'NÃO', 'kg'],
        ['peso', 'Peso em gramas', 'NÃO', '1000'],
        ['validade_minima', 'Validade mínima em dias', 'NÃO', '365'],
        ['fator_divisao', 'Fator de divisão', 'NÃO', '1'],
        ['tipo_processamento', 'Tipo: in natura, processado, etc', 'NÃO', 'processado'],
        ['imagem_url', 'URL da imagem do produto', 'NÃO', ''],
        ['preco_referencia', 'Preço de referência', 'NÃO', '5.50'],
        ['estoque_minimo', 'Estoque mínimo', 'NÃO', '50'],
        ['ativo', 'Produto ativo (true/false)', 'NÃO', 'true'],
        [''],
        ['NOTAS:'],
        ['- Preencha apenas os campos necessários'],
        ['- Use valores numéricos para peso, validade_minima, etc'],
        ['- Use true ou false para o campo ativo'],
        ['- O sistema identificará produtos existentes pelo nome e fará atualização']
      ];

      const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoes);
      wsInstrucoes['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'Instruções');

      // Gerar nome do arquivo
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const nomeArquivo = `modelo_importacao_produtos_${dataAtual}.xlsx`;

      // Fazer download do arquivo
      XLSX.writeFile(wb, nomeArquivo);

      // Fechar menu de ações
      setActionsMenuAnchor(null);
    } catch (error) {
      console.error('Erro ao exportar modelo:', error);
      setError('Erro ao exportar modelo de importação.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#1e293b' }}>Produtos</Typography>

        <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TextField placeholder="Buscar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#64748b' }} /></InputAdornment>), endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>)}}/>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLess /> : <TuneRounded />} onClick={toggleFilters}>Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }}/>)}</Button>
              <Button startIcon={<AddIcon />} onClick={openModal} sx={{ bgcolor: '#059669', color: 'white', '&:hover': { bgcolor: '#047857' } }}>Novo Produto</Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} sx={{ border: '1px solid #d1d5db' }}><MoreVert /></IconButton>
            </Box>
          </Box>
          <Collapse in={filtersExpanded} timeout={400}><Box sx={{ mb: 3 }}><FiltersContent /></Box></Collapse>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>{`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredProdutos.length)}-${Math.min((page + 1) * rowsPerPage, filteredProdutos.length)} de ${filteredProdutos.length} produtos`}</Typography>
        </Card>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadProdutos}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredProdutos.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Inventory sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} /><Typography variant="h6" sx={{ color: '#6b7280' }}>Nenhum produto encontrado</Typography></CardContent></Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table stickyHeader>
                <TableHead><TableRow><TableCell>Nome do Produto</TableCell><TableCell>Categoria</TableCell><TableCell>Marca</TableCell><TableCell>Status</TableCell><TableCell align="center">Ações</TableCell></TableRow></TableHead>
                <TableBody>
                  {paginatedProdutos.map((produto) => (
                    <TableRow key={produto.id} hover>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{produto.nome}</Typography>{produto.descricao && <Typography variant="caption" color="text.secondary">{produto.descricao}</Typography>}</TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{produto.categoria || 'N/A'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{produto.marca || 'N/A'}</Typography></TableCell>
                      <TableCell><Chip label={produto.ativo ? 'Ativo' : 'Inativo'} size="small" color={produto.ativo ? 'success' : 'error'} variant="outlined" /></TableCell>
                      <TableCell align="center"><Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => navigate(`/produtos/${produto.id}`)} color="primary"><Info fontSize="small" /></IconButton></Tooltip></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={filteredProdutos.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Itens por página:" />
          </Paper>
        )}
      </Box>

      {/* Modal de Criação */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Novo Produto</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField label="Nome do Produto" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
            <TextField label="Descrição" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} multiline rows={2} />
            <Box sx={{ display: 'flex', gap: 2 }}><TextField label="Categoria" value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} sx={{ flex: 1 }} /><TextField label="Marca" value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} sx={{ flex: 1 }} /></Box>
            <FormControlLabel control={<Switch checked={formData.ativo} onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} />} label="Produto Ativo" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={closeModal} sx={{ color: '#6b7280' }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={isSaving || !formData.nome.trim()} sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>{isSaving ? 'Salvando...' : 'Criar Produto'}</Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de Importação */}
      <ImportacaoProdutos open={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImportProdutos} />

      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)} PaperProps={{ sx: { borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', mt: 1 } }}>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); setImportModalOpen(true); }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Upload sx={{ fontSize: 18 }} /> <Typography>Importar em Lote</Typography></Box></MenuItem>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); handleExportarProdutos(); }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Download sx={{ fontSize: 18 }} /> <Typography>Exportar Excel</Typography></Box></MenuItem>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); handleExportarModelo(); }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Download sx={{ fontSize: 18 }} /> <Typography>Exportar Modelo</Typography></Box></MenuItem>
      </Menu>
    </Box>
  );
};

export default ProdutosPage;