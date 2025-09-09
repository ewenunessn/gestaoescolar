import { useEffect, useState } from "react";
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
} from "@mui/material";
import {
  Search,
  Add,
  Info,
  Inventory,
  Category,
  CheckCircle,
  Cancel,
  Clear,
  FileDownload,
  MoreVert,
  Upload,
  Download,
  FilterList,
  ArrowUpward,
  ArrowDownward,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  unidade?: string;
  fator_divisao?: number;
  tipo_processamento?: string;
  categoria?: string;
  marca?: string;
  codigo_barras?: string;
  peso?: number;
  validade_minima?: number;
  imagem_url?: string;
  perecivel?: boolean;
  ativo: boolean;
}

interface ProdutoForm {
  nome: string;
  descricao: string;
  unidade: string;
  fator_divisao: string | number | null;
  tipo_processamento: string;
  categoria: string;
  marca: string;
  codigo_barras: string;
  peso: string | number | null;
  validade_minima: string | number | null;
  imagem_url: string;
  perecivel: boolean;
  ativo: boolean;
}

const produtoVazio: ProdutoForm = {
  nome: "",
  descricao: "",
  unidade: "",
  fator_divisao: "",
  tipo_processamento: "",
  categoria: "",
  marca: "",
  codigo_barras: "",
  peso: "",
  validade_minima: "",
  imagem_url: "",
  perecivel: false,
  ativo: true,
};

export default function Produtos() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
  const [selectedTipoProcessamento, setSelectedTipoProcessamento] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);



  // Estados do modal de criação
  const [openNovo, setOpenNovo] = useState(false);
  const [formNovo, setFormNovo] = useState<ProdutoForm>(produtoVazio);
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  // Estados do modal de importação
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);



  // Carregar produtos
  const loadProdutos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listarProdutos();
      // Ensure data is always an array
      setProdutos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setError('Erro ao carregar produtos. Tente novamente.');
      setProdutos([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProdutos();
  }, []);

  // Detectar filtros ativos
  useEffect(() => {
    const hasFilters = searchTerm || selectedCategoria || selectedMarcas.length > 0 || selectedTipoProcessamento || selectedStatus;
    setHasActiveFilters(!!hasFilters);
  }, [searchTerm, selectedCategoria, selectedMarcas, selectedTipoProcessamento, selectedStatus]);

  // Extrair dados únicos para filtros
  const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort();
  const marcas = [...new Set(produtos.map(p => p.marca).filter(Boolean))].sort();
  const tiposProcessamento = [...new Set(produtos.map(p => p.tipo_processamento).filter(Boolean))].sort();

  // Filtrar e ordenar produtos
  const filteredProdutos = produtos.filter(produto => {
    const matchesSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.marca?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = !selectedCategoria || produto.categoria === selectedCategoria;
    const matchesMarca = selectedMarcas.length === 0 || (produto.marca && selectedMarcas.includes(produto.marca));
    const matchesTipoProcessamento = !selectedTipoProcessamento || produto.tipo_processamento === selectedTipoProcessamento;
    const matchesStatus = !selectedStatus ||
      (selectedStatus === 'ativo' && produto.ativo) ||
      (selectedStatus === 'inativo' && !produto.ativo);

    return matchesSearch && matchesCategoria && matchesMarca && matchesTipoProcessamento && matchesStatus;
  }).sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.nome.localeCompare(b.nome);
        break;
      case 'categoria':
        comparison = (a.categoria || '').localeCompare(b.categoria || '');
        break;
      case 'marca':
        comparison = (a.marca || '').localeCompare(b.marca || '');
        break;
      case 'status':
        comparison = Number(b.ativo) - Number(a.ativo);
        break;
      default:
        comparison = a.nome.localeCompare(b.nome);
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Produtos paginados
  const paginatedProdutos = filteredProdutos.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedCategoria, selectedMarcas, selectedTipoProcessamento, selectedStatus]);

  // Funções de paginação
  const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategoria('');
    setSelectedMarcas([]);
    setSelectedTipoProcessamento('');
    setSelectedStatus('');
    setSortBy('name');
  };

  // Funções para remover filtros individuais
  const removeSearchFilter = () => setSearchTerm('');
  const removeCategoriaFilter = () => setSelectedCategoria('');
  const removeMarcaFilter = (marca: string) => {
    setSelectedMarcas(prev => prev.filter(m => m !== marca));
  };
  const removeTipoProcessamentoFilter = () => setSelectedTipoProcessamento('');
  const removeStatusFilter = () => setSelectedStatus('');



  function abrirNovoProduto() {
    setFormNovo(produtoVazio);
    setOpenNovo(true);
  }
  function fecharNovoProduto() {
    setOpenNovo(false);
    setFormNovo(produtoVazio);
  }
  async function salvarNovoProduto() {
    setSalvandoNovo(true);
    try {
      // Preparar dados para envio, convertendo string vazia para null
      const dadosParaEnvio = {
        ...formNovo,
        fator_divisao: formNovo.fator_divisao === "" ? null : Number(formNovo.fator_divisao),
        peso: formNovo.peso === "" ? null : Number(formNovo.peso),
        validade_minima: formNovo.validade_minima === "" ? null : Number(formNovo.validade_minima),
      };

      const novo = await criarProduto(dadosParaEnvio);
      fecharNovoProduto();
      await loadProdutos();
      setSuccessMessage('Produto criado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
      navigate(`/produtos/${novo.id}`);
    } catch (err) {
      console.error('Erro ao criar produto:', err);
      setError("Erro ao criar produto");
    } finally {
      setSalvandoNovo(false);
    }
  }

  interface ResultadoImportacao {
    resultados: {
      insercoes?: number;
      atualizacoes?: number;
      sucesso?: number;
      erros?: number;
    };
  }

  // Função para importação em lote
  interface ProdutoImportacao {
    nome: string;
    [key: string]: any;
  }

  const handleImportProdutos = async (produtosImportacao: ProdutoImportacao[]) => {
    try {
      setLoading(true);

      // Mapear ProdutoImportacao para ImportarProdutoRequest
      const produtosParaImportar = produtosImportacao.map(produto => ({
        nome: produto.nome,
        unidade: produto.unidade || produto.unidade_medida || 'un', // Usar unidade ou unidade_medida, padrão 'un'
        categoria: produto.categoria,
        descricao: produto.descricao
      }));
      
      // Usar o endpoint otimizado de importação em lote
      const response = await importarProdutosLote(produtosParaImportar);
      // Adaptar a resposta para o formato esperado pela interface ResultadoImportacao
      const resultado: ResultadoImportacao = { 
        resultados: {
          insercoes: (response as any).insercoes || 0,
          atualizacoes: (response as any).atualizacoes || 0,
          sucesso: ((response as any).insercoes || 0) + ((response as any).atualizacoes || 0),
          erros: response.erros || 0
        } 
      };

      const { insercoes = 0, atualizacoes = 0 } = resultado.resultados;
      let mensagemSucesso = '';
      
      if (insercoes > 0 && atualizacoes > 0) {
        mensagemSucesso = `${insercoes} produtos inseridos e ${atualizacoes} atualizados com sucesso!`;
      } else if (insercoes > 0) {
        mensagemSucesso = `${insercoes} produtos inseridos com sucesso!`;
      } else if (atualizacoes > 0) {
        mensagemSucesso = `${atualizacoes} produtos atualizados com sucesso!`;
      } else {
        mensagemSucesso = 'Importação concluída!';
      }

      if (resultado.resultados.sucesso > 0) {
        setSuccessMessage(mensagemSucesso);
        await loadProdutos();
      }

      if (resultado.resultados.erros > 0) {
        setError(`${resultado.resultados.erros} produtos não puderam ser importados. Verifique os dados.`);
      }

      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    } catch (err) {
      console.error('Erro na importação em lote:', err);
      setError('Erro ao importar produtos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para exportar produtos para Excel
  const handleExportarProdutos = async () => {
    if (produtos.length === 0) {
      setError('Nenhum produto disponível para exportação.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setLoading(true);
      
      // Importar XLSX dinamicamente
      const XLSX = await import('xlsx');
      
      // Preparar dados para exportação no formato correto para importação
      const dadosExportacao = produtos.map((produto) => ({
        nome: produto.nome || '',
        unidade: produto.unidade || '',
        fator_divisao: produto.fator_divisao || '',
        tipo_processamento: produto.tipo_processamento || '',
        categoria: produto.categoria || '',
        marca: produto.marca || '',
        codigo_barras: produto.codigo_barras || '',
        peso: produto.peso || '',
        validade_minima: produto.validade_minima || '',
        imagem_url: produto.imagem_url || '',
        perecivel: produto.perecivel ? 'true' : 'false',
        ativo: produto.ativo ? 'true' : 'false'
      }));

      // Criar planilha principal
      const ws = XLSX.utils.json_to_sheet(dadosExportacao);
      
      // Definir largura das colunas
      ws['!cols'] = [
        { wch: 25 }, // nome
        { wch: 10 }, // unidade
        { wch: 12 }, // fator_divisao
        { wch: 18 }, // tipo_processamento
        { wch: 15 }, // categoria
        { wch: 15 }, // marca
        { wch: 15 }, // codigo_barras
        { wch: 8 },  // peso
        { wch: 15 }, // validade_minima
        { wch: 20 }, // imagem_url
        { wch: 10 }, // perecivel
        { wch: 8 }   // ativo
      ];

      // Criar workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

      // Gerar nome do arquivo com data/hora
      const agora = new Date();
      const dataFormatada = agora.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const horaFormatada = agora.toLocaleTimeString('pt-BR').replace(/:/g, '-');
      const nomeArquivo = `produtos_${dataFormatada}_${horaFormatada}.xlsx`;

      // Fazer download
      XLSX.writeFile(wb, nomeArquivo);

      setSuccessMessage(`${produtos.length} produtos exportados com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Erro na exportação:', error);
      setError('Erro ao exportar produtos. Tente novamente.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>


      {/* Mensagem de Sucesso */}
      {successMessage && (
        <Box
          sx={{
            position: 'fixed',
            top: 80,
            right: 20,
            zIndex: 9999,
          }}
        >
          <Alert
            severity="success"
            onClose={() => setSuccessMessage(null)}
            sx={{
              minWidth: 300,
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {successMessage}
          </Alert>
        </Box>
      )}

      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Controles */}
        <Card
          sx={{
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            p: 3,
            mb: 3,
          }}
        >
          {/* Primeira linha: Busca e botões de ação */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            {/* Barra de busca */}
            <TextField
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#9ca3af' }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Botão de Filtros */}
            <Button
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                color: hasActiveFilters ? '#059669' : '#6b7280',
                bgcolor: hasActiveFilters ? '#f0fdf4' : 'transparent',
                border: hasActiveFilters ? '1px solid #059669' : '1px solid #d1d5db',
                borderRadius: '8px',
                textTransform: 'none',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                '&:hover': {
                  bgcolor: hasActiveFilters ? '#dcfce7' : '#f9fafb',
                  borderColor: hasActiveFilters ? '#059669' : '#9ca3af',
                },
              }}
            >
              Filtros
            </Button>

            {/* Botões */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                startIcon={<Add />}
                onClick={abrirNovoProduto}
                sx={{
                  bgcolor: '#059669',
                  color: 'white',
                  textTransform: 'none',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  '&:hover': { bgcolor: '#047857' },
                }}
              >
                Novo Produto
              </Button>

              <IconButton
                onClick={(e) => setActionsMenuAnchor(e.currentTarget)}
                sx={{
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  color: '#6b7280',
                  '&:hover': {
                    bgcolor: '#f9fafb',
                    borderColor: '#9ca3af',
                  },
                }}
              >
                <MoreVert />
              </IconButton>
            </Box>

            {hasActiveFilters && (
              <Button
                startIcon={<Clear />}
                onClick={clearFilters}
                sx={{
                  color: '#ef4444',
                  textTransform: 'none',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </Box>

          {/* Filtros Avançados */}
          {showFilters && (
            <Box sx={{ mb: 3, p: 3, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#374151', fontWeight: 600 }}>
                Filtros Avançados
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Categoria */}
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={selectedCategoria}
                    onChange={(e) => setSelectedCategoria(e.target.value as string)}
                    label="Categoria"
                  >
                    <MenuItem value="">Todas as categorias</MenuItem>
                    {categorias.map(categoria => (
                      <MenuItem key={categoria} value={categoria}>{categoria}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Marca (Multi-select) */}
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Marca</InputLabel>
                  <Select
                    multiple
                    value={selectedMarcas}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedMarcas(typeof value === 'string' ? value.split(',') : value as string[]);
                    }}
                    input={<OutlinedInput label="Marca" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {marcas.map((marca) => (
                      <MenuItem key={marca} value={marca}>
                        <Checkbox checked={selectedMarcas.indexOf(marca) > -1} />
                        <ListItemText primary={marca} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Tipo de Processamento */}
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Tipo de Processamento</InputLabel>
                  <Select
                    value={selectedTipoProcessamento}
                    onChange={(e) => setSelectedTipoProcessamento(e.target.value as string)}
                    label="Tipo de Processamento"
                  >
                    <MenuItem value="">Todos os tipos</MenuItem>
                    {tiposProcessamento.map(tipo => (
                      <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Status */}
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as string)}
                    label="Status"
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="ativo">Ativos</MenuItem>
                    <MenuItem value="inativo">Inativos</MenuItem>
                  </Select>
                </FormControl>

                {/* Ordenação */}
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Ordenar por</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as string)}
                    label="Ordenar por"
                  >
                    <MenuItem value="name">Nome</MenuItem>
                    <MenuItem value="categoria">Categoria</MenuItem>
                    <MenuItem value="marca">Marca</MenuItem>
                    <MenuItem value="status">Status</MenuItem>
                  </Select>
                </FormControl>

                {/* Direção da Ordenação */}
                <Tooltip title={`Ordenação ${sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}`}>
                  <IconButton
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    sx={{
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: sortOrder === 'asc' ? '#059669' : '#dc2626',
                    }}
                  >
                    {sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}

          {/* Chips de Filtros Ativos */}
          {hasActiveFilters && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {searchTerm && (
                <Chip
                  label={`Busca: "${searchTerm}"`}
                  onDelete={removeSearchFilter}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
              {selectedCategoria && (
                <Chip
                  label={`Categoria: ${selectedCategoria}`}
                  onDelete={removeCategoriaFilter}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
              {selectedMarcas.map((marca) => (
                <Chip
                  key={marca}
                  label={`Marca: ${marca}`}
                  onDelete={() => removeMarcaFilter(marca)}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))}
              {selectedTipoProcessamento && (
                <Chip
                  label={`Tipo: ${selectedTipoProcessamento}`}
                  onDelete={removeTipoProcessamentoFilter}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
              {selectedStatus && (
                <Chip
                  label={`Status: ${selectedStatus === 'ativo' ? 'Ativos' : 'Inativos'}`}
                  onDelete={removeStatusFilter}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
          )}

          {/* Contador de Produtos */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography
              sx={{
                color: '#6b7280',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              Mostrando {paginatedProdutos.length} de {filteredProdutos.length} produtos
              {filteredProdutos.length !== produtos.length && (
                <Typography
                  component="span"
                  sx={{
                    color: '#4f46e5',
                    fontSize: '0.875rem',
                    ml: 1,
                    fontWeight: 500,
                  }}
                >
                  (filtrados de {produtos.length} total)
                </Typography>
              )}
            </Typography>
          </Box>
        </Card>

        {/* Tabela de Produtos */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : filteredProdutos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Inventory sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nenhum produto encontrado
            </Typography>
            <Typography color="text.secondary">
              Tente ajustar os filtros ou buscar por outros termos
            </Typography>
          </Box>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome do Produto</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Marca</TableCell>
                    <TableCell>Unidade</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedProdutos.map((produto) => (
                    <TableRow key={produto.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {produto.nome}
                          </Typography>
                          {produto.descricao && (
                            <Typography variant="body2" color="text.secondary">
                              {produto.descricao}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {produto.categoria ? (
                          <Chip
                            label={produto.categoria}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Não informado
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {produto.marca || 'Não informado'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {produto.unidade || 'Não informado'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={produto.ativo ? 'Ativo' : 'Inativo'}
                          color={produto.ativo ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalhes">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/produtos/${produto.id}`)}
                            color="primary"
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Paginação */}
            {filteredProdutos.length > 0 && (
              <TablePagination
                component="div"
                count={filteredProdutos.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Produtos por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                sx={{
                  borderTop: '1px solid #e5e7eb',
                  '& .MuiTablePagination-toolbar': {
                    paddingLeft: 2,
                    paddingRight: 2,
                  },
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                    color: '#6b7280',
                    fontSize: '0.875rem',
                  },
                }}
              />
            )}
          </Paper>
        )}
      </Box>

      {/* Modal de cadastro de novo produto */}
      <Dialog
        open={openNovo}
        onClose={fecharNovoProduto}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontWeight: 600,
            color: '#1f2937',
          }}
        >
          Novo Produto
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <TextField
              label="Nome do Produto"
              value={formNovo.nome}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, nome: e.target.value })}
              fullWidth
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="Categoria"
              value={formNovo.categoria}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, categoria: e.target.value })}
              fullWidth
              placeholder="cereais, carnes, laticínios, etc."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="Marca"
              value={formNovo.marca}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, marca: e.target.value })}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="Código de Barras"
              value={formNovo.codigo_barras}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, codigo_barras: e.target.value })}
              fullWidth
              placeholder="EAN/UPC"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="Unidade"
              value={formNovo.unidade}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, unidade: e.target.value })}
              fullWidth
              placeholder="kg, g, L, ml, unidade"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="Peso (gramas)"
              value={formNovo.peso}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, peso: e.target.value })}
              fullWidth
              type="number"
              placeholder="Peso em gramas"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="Validade Mínima (dias)"
              value={formNovo.validade_minima}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, validade_minima: e.target.value })}
              fullWidth
              type="number"
              placeholder="Dias de validade mínima"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="Fator de Divisão"
              value={formNovo.fator_divisao}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, fator_divisao: e.target.value })}
              fullWidth
              type="number"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <TextField
              label="Descrição"
              value={formNovo.descricao}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, descricao: e.target.value })}
              fullWidth
              multiline
              rows={2}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <TextField
              label="Tipo de Processamento"
              value={formNovo.tipo_processamento}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, tipo_processamento: e.target.value })}
              fullWidth
              placeholder="in natura, minimamente processado, processado, ultraprocessado"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <TextField
              label="URL da Imagem"
              value={formNovo.imagem_url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, imagem_url: e.target.value })}
              fullWidth
              placeholder="https://exemplo.com/imagem.jpg"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formNovo.perecivel}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, perecivel: e.target.checked })}
                  color="warning"
                />
              }
              label="Produto Perecível"
              sx={{
                '& .MuiFormControlLabel-label': {
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontWeight: 500,
                }
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formNovo.ativo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNovo({ ...formNovo, ativo: e.target.checked })}
                  color="primary"
                />
              }
              label="Produto Ativo"
              sx={{
                '& .MuiFormControlLabel-label': {
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontWeight: 500,
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={fecharNovoProduto}
            sx={{
              color: '#6b7280',
              textTransform: 'none',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={salvarNovoProduto}
            variant="contained"
            disabled={salvandoNovo || !formNovo.nome.trim()}
            sx={{
              bgcolor: '#4f46e5',
              textTransform: 'none',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              '&:hover': { bgcolor: '#4338ca' },
            }}
          >
            {salvandoNovo ? 'Criando...' : 'Criar Produto'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Importação em Lote */}
      <ImportacaoProdutos
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportProdutos}
      />

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
          onClick={() => {
            setActionsMenuAnchor(null);
            setImportModalOpen(true);
          }}
          sx={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            py: 1.5,
            px: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Upload sx={{ fontSize: 18, color: '#4f46e5' }} />
            <Typography>Importar em Lote</Typography>
          </Box>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setActionsMenuAnchor(null);
            handleExportarProdutos();
          }}
          sx={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            py: 1.5,
            px: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Download sx={{ fontSize: 18, color: '#059669' }} />
            <Typography>Exportar Excel</Typography>
          </Box>
        </MenuItem>
      </Menu>
    </Box>
  );
}