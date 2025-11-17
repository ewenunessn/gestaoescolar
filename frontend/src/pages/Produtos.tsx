import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  importarProdutosLote,
} from "../services/produtos";
import { 
  useProdutos, 
  useCriarProduto, 
  useAtualizarProduto, 
  useExcluirProduto,
  useCategoriasProdutos 
} from "../hooks/queries";
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
  peso?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  perecivel?: boolean;
  ativo: boolean;
}

interface ProdutoForm {
  nome: string;
  descricao: string;
  unidade: string;
  categoria: string;
  marca: string;
  peso?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  perecivel?: boolean;
  ativo: boolean;
}

const ProdutosPage = () => {
  const navigate = useNavigate();

  // Estados de filtros (devem vir antes dos hooks que os usam)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // React Query hooks
  const { 
    data: produtos = [], 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useProdutos({ search: searchTerm, categoria: selectedCategoria });
  
  const { data: categorias = [] } = useCategoriasProdutos();
  const criarProdutoMutation = useCriarProduto();
  const atualizarProdutoMutation = useAtualizarProduto();
  const excluirProdutoMutation = useExcluirProduto();
  
  // Estados locais
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const error = queryError?.message || null;

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

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

  // Função para refresh manual (React Query já gerencia o carregamento automaticamente)
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Detectar filtros ativos
  useEffect(() => {
    const hasFilters = !!(searchTerm || selectedCategoria || selectedMarcas.length > 0 || selectedStatus);
    setHasActiveFilters(hasFilters);
  }, [searchTerm, selectedCategoria, selectedMarcas, selectedStatus]);

  // Extrair dados únicos para filtros (categorias já vem do hook useCategoriasProdutos)
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
    <Box sx={{ bgcolor: 'background.paper', borderRadius: '12px', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.9rem' }}>Filtros Avançados</Typography>
        {hasActiveFilters && <Button size="small" onClick={clearFilters} sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.8rem' }}>Limpar</Button>}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
        <FormControl fullWidth size="small"><InputLabel>Categoria</InputLabel><Select value={selectedCategoria} onChange={(e) => setSelectedCategoria(e.target.value)} label="Categoria"><MenuItem value="">Todas</MenuItem>{categorias.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth size="small"><InputLabel>Marcas</InputLabel><Select multiple value={selectedMarcas} onChange={(e) => setSelectedMarcas(e.target.value as string[])} input={<OutlinedInput label="Marcas" />} renderValue={(selected) => selected.join(', ')}>{marcas.map(m => <MenuItem key={m} value={m}><Checkbox checked={selectedMarcas.includes(m)} />{m}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} label="Status"><MenuItem value="">Todos</MenuItem><MenuItem value="ativo">Ativos</MenuItem><MenuItem value="inativo">Inativos</MenuItem></Select></FormControl>
        <FormControl fullWidth size="small"><InputLabel>Ordenar por</InputLabel><Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Ordenar por"><MenuItem value="name">Nome</MenuItem><MenuItem value="categoria">Categoria</MenuItem><MenuItem value="marca">Marca</MenuItem></Select></FormControl>
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
      const novoProduto = await criarProdutoMutation.mutateAsync(formData);
      setSuccessMessage('Produto criado com sucesso!');
      closeModal();
      setTimeout(() => setSuccessMessage(null), 3000);
      navigate(`/produtos/${novoProduto.id}`);
    } catch (err) {
      console.error('Erro ao criar produto:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Funções de Importação/Exportação
  const handleImportProdutos = async (produtosImportacao: any[]) => {
    try {
      setLoading(true);
      const response = await importarProdutosLote(produtosImportacao);
      
      setSuccessMessage(`Importação concluída: ${response.resultados.insercoes} inseridos, ${response.resultados.atualizacoes} atualizados`);
      refetch(); // Recarregar dados após importação
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError('Erro ao importar produtos. Verifique os dados e tente novamente.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleExportarProdutos = () => {
    try {
      // Preparar dados para exportação compatível com importação
      const dadosExportacao = filteredProdutos.map(produto => ({
        nome: produto.nome,
        descricao: produto.descricao || '',
        categoria: produto.categoria || '',
        marca: produto.marca || '',
        unidade: produto.unidade || '',
        peso: produto.peso || 0,
        fator_divisao: produto.fator_divisao || 1,
        tipo_processamento: produto.tipo_processamento || '',
        perecivel: produto.perecivel || false,
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
        { wch: 12 }, // unidade
        { wch: 8 },  // peso
        { wch: 12 }, // fator_divisao
        { wch: 25 }, // tipo_processamento (aumentado para caber o texto)
        { wch: 10 }, // perecivel
        { wch: 8 }   // ativo
      ];
      ws['!cols'] = colWidths;

      // Adicionar validação de dados para tipo_processamento (coluna H)
      // Adicionar validação para perecivel (coluna I) e ativo (coluna J)
      if (!ws['!dataValidation']) ws['!dataValidation'] = [];
      
      // Validação para tipo_processamento (coluna H, linhas 2 em diante)
      for (let i = 2; i <= dadosExportacao.length + 1; i++) {
        ws['!dataValidation'].push({
          type: 'list',
          allowBlank: true,
          sqref: `H${i}`,
          formulas: ['"in natura,minimamente processado,processado,ultraprocessado"'],
          promptTitle: 'Tipo de Processamento',
          prompt: 'Selecione uma das opções',
          errorTitle: 'Valor Inválido',
          error: 'Escolha: in natura, minimamente processado, processado ou ultraprocessado'
        });
      }

      // Validação para perecivel (coluna I)
      for (let i = 2; i <= dadosExportacao.length + 1; i++) {
        ws['!dataValidation'].push({
          type: 'list',
          allowBlank: false,
          sqref: `I${i}`,
          formulas: ['"true,false"'],
          promptTitle: 'Perecível',
          prompt: 'Selecione true ou false',
          errorTitle: 'Valor Inválido',
          error: 'Escolha: true ou false'
        });
      }

      // Validação para ativo (coluna J)
      for (let i = 2; i <= dadosExportacao.length + 1; i++) {
        ws['!dataValidation'].push({
          type: 'list',
          allowBlank: false,
          sqref: `J${i}`,
          formulas: ['"true,false"'],
          promptTitle: 'Ativo',
          prompt: 'Selecione true ou false',
          errorTitle: 'Valor Inválido',
          error: 'Escolha: true ou false'
        });
      }

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
        'nome', 'descricao', 'categoria', 'marca', 
        'unidade', 'peso', 'fator_divisao', 
        'tipo_processamento', 'perecivel', 'ativo'
      ];

      const exemplo = [
        'Arroz Branco Tipo 1',
        'Arroz branco polido, tipo 1, classe longo fino',
        'Cereais',
        'Tio João',
        'kg',
        1000,
        1,
        'processado',
        false,
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
        { wch: 12 }, // unidade
        { wch: 8 },  // peso
        { wch: 12 }, // fator_divisao
        { wch: 25 }, // tipo_processamento (aumentado)
        { wch: 10 }, // perecivel
        { wch: 8 }   // ativo
      ];
      ws['!cols'] = colWidths;

      // Adicionar validação de dados para facilitar o preenchimento
      if (!ws['!dataValidation']) ws['!dataValidation'] = [];
      
      // Validação para tipo_processamento (coluna H, linhas 2 a 100)
      ws['!dataValidation'].push({
        type: 'list',
        allowBlank: true,
        sqref: 'H2:H100',
        formulas: ['"in natura,minimamente processado,processado,ultraprocessado"'],
        promptTitle: 'Tipo de Processamento',
        prompt: 'Selecione uma das opções',
        errorTitle: 'Valor Inválido',
        error: 'Escolha: in natura, minimamente processado, processado ou ultraprocessado'
      });

      // Validação para perecivel (coluna I, linhas 2 a 100)
      ws['!dataValidation'].push({
        type: 'list',
        allowBlank: false,
        sqref: 'I2:I100',
        formulas: ['"true,false"'],
        promptTitle: 'Perecível',
        prompt: 'Selecione true ou false',
        errorTitle: 'Valor Inválido',
        error: 'Escolha: true ou false'
      });

      // Validação para ativo (coluna J, linhas 2 a 100)
      ws['!dataValidation'].push({
        type: 'list',
        allowBlank: false,
        sqref: 'J2:J100',
        formulas: ['"true,false"'],
        promptTitle: 'Ativo',
        prompt: 'Selecione true ou false',
        errorTitle: 'Valor Inválido',
        error: 'Escolha: true ou false'
      });

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
        ['unidade', 'Unidade de medida (kg, litro, unidade, etc)', 'NÃO', 'kg'],
        ['peso', 'Peso em gramas', 'NÃO', '1000'],
        ['fator_divisao', 'Fator de divisão', 'NÃO', '1'],
        ['tipo_processamento', 'Tipo: in natura, minimamente processado, processado, ultraprocessado', 'NÃO', 'processado'],
        ['perecivel', 'Produto perecível (true/false)', 'NÃO', 'false'],
        ['ativo', 'Produto ativo (true/false)', 'NÃO', 'true'],
        [''],
        ['NOTAS:'],
        ['- Preencha apenas os campos necessários'],
        ['- Use valores numéricos para peso e fator_divisao'],
        ['- Use true ou false para os campos perecivel e ativo'],
        ['- O sistema identificará produtos existentes pelo nome e fará atualização']
      ];

      const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoes);
      wsInstrucoes['!cols'] = [{ wch: 15 }, { wch: 50 }, { wch: 10 }, { wch: 20 }];
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>Produtos</Typography>

        <Card sx={{ borderRadius: '12px', p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField placeholder="Buscar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>), endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>)}}/>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'} startIcon={filtersExpanded ? <ExpandLess /> : <TuneRounded />} onClick={toggleFilters} size="small">Filtros{hasActiveFilters && !filtersExpanded && (<Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }}/>)}</Button>
              <Button startIcon={<AddIcon />} onClick={openModal} variant="contained" color="success" size="small">Novo Produto</Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small"><MoreVert /></IconButton>
            </Box>
          </Box>
          <Collapse in={filtersExpanded} timeout={300}><Box sx={{ mb: 2 }}><FiltersContent /></Box></Collapse>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredProdutos.length)}-${Math.min((page + 1) * rowsPerPage, filteredProdutos.length)} de ${filteredProdutos.length} produtos`}</Typography>
        </Card>

        {loading ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
        ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={handleRefresh}>Tentar Novamente</Button></CardContent></Card>
        ) : filteredProdutos.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Inventory sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhum produto encontrado</Typography></CardContent></Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table stickyHeader size="small">
                <TableHead><TableRow><TableCell sx={{ py: 1 }}>Nome do Produto</TableCell><TableCell sx={{ py: 1 }}>Categoria</TableCell><TableCell sx={{ py: 1 }}>Marca</TableCell><TableCell sx={{ py: 1 }}>Status</TableCell><TableCell align="center" sx={{ py: 1 }}>Ações</TableCell></TableRow></TableHead>
                <TableBody>
                  {paginatedProdutos.map((produto) => (
                    <TableRow key={produto.id} hover sx={{ '& td': { py: 0.75 } }}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{produto.nome}</Typography>{produto.descricao && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{produto.descricao}</Typography>}</TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>{produto.categoria || 'N/A'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>{produto.marca || 'N/A'}</Typography></TableCell>
                      <TableCell><Chip label={produto.ativo ? 'Ativo' : 'Inativo'} size="small" color={produto.ativo ? 'success' : 'error'} sx={{ height: '20px', fontSize: '0.75rem' }} /></TableCell>
                      <TableCell align="center"><Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => navigate(`/produtos/${produto.id}`)} color="primary"><Info fontSize="small" /></IconButton></Tooltip></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={filteredProdutos.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Itens por página:" />
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
          <Button onClick={closeModal} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={isSaving || !formData.nome.trim()}>{isSaving ? 'Salvando...' : 'Criar Produto'}</Button>
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