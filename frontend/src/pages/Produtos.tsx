import React, { useState, useMemo, useCallback, useEffect } from "react";
import StatusIndicator from "../components/StatusIndicator";
import PageHeader from "../components/PageHeader";
import PageContainer from "../components/PageContainer";
import TableFilter, { FilterField } from "../components/TableFilter";
import {
  importarProdutosLote,
  deletarProduto,
} from "../services/produtos";
import { 
  useProdutos, 
  useCriarProduto, 
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
  Collapse,
  Autocomplete,
  Chip,
  Checkbox,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Visibility,
  Inventory,
  Download,
  MoreVert,
  Upload,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import CompactPagination from '../components/CompactPagination';
import { useNavigate, useLocation } from "react-router-dom";
import { gerarModeloExcelProdutos } from '../utils/produtoImportUtils';

interface ProdutoForm {
  nome: string;
  unidade: string;
  descricao: string;
  categoria: string;
  tipo_processamento?: string;
  peso?: string;
  perecivel?: boolean;
  ativo: boolean;
}

const ProdutosPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Estados de filtros - NOVO SISTEMA
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // React Query hooks
  const { 
    data: produtos = [], 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useProdutos({ search: filters.search, categoria: filters.categoria });
  
  const { data: categorias = [] } = useCategoriasProdutos();
  const criarProdutoMutation = useCriarProduto();
  
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
    unidade: "",
    descricao: "",
    categoria: "",
    tipo_processamento: "",
    peso: "",
    perecivel: false,
    ativo: true,
  });
  
  // Estados de validação
  const [erroProduto, setErroProduto] = useState("");
  const [touched, setTouched] = useState<any>({});
  
  // Estados para controle de mudanças não salvas
  const [formDataInicial, setFormDataInicial] = useState<ProdutoForm | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados para seleção múltipla e exclusão em massa
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Função para refresh manual (React Query já gerencia o carregamento automaticamente)
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Funções de seleção múltipla
  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    setSelectedIds([]);
    setActionsMenuAnchor(null);
  }, []);

  const handleSelectAll = useCallback((checked: boolean, currentPageProdutos: any[]) => {
    if (checked) {
      setSelectedIds(currentPageProdutos.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  }, []);

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    setDeleteConfirmOpen(true);
  }, [selectedIds]);

  const selectedProdutos = useMemo(() => {
    return produtos.filter(p => selectedIds.includes(p.id));
  }, [produtos, selectedIds]);

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const results = await Promise.allSettled(selectedIds.map(id => deletarProduto(id)));
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;
      
      if (successCount > 0) {
        setSuccessMessage(`${successCount} produto(s) excluído(s) com sucesso!`);
      }
      
      if (failedCount > 0) {
        const failedProducts = selectedProdutos.filter((_, index) => results[index].status === 'rejected');
        const failedNames = failedProducts.map(p => p.nome).join(', ');
        setErroProduto(`${failedCount} produto(s) não puderam ser excluídos (${failedNames}). Eles podem estar sendo usados em contratos ou pedidos.`);
      }
      
      setSelectedIds([]);
      setSelectionMode(false);
      setDeleteConfirmOpen(false);
      refetch();
    } catch (error: any) {
      setErroProduto(error.message || 'Erro ao excluir produtos');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, selectedProdutos, refetch]);

  // Definir campos de filtro
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'select',
      label: 'Categoria',
      key: 'categoria',
      options: categorias.map(c => ({ value: c, label: c })),
    },
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' },
      ],
    },
  ], [categorias]);

  useEffect(() => {
    const state = location.state as { successMessage?: string } | undefined;
    if (state?.successMessage) {
      setSuccessMessage(state.successMessage);
      refetch();
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate, refetch]);

  // Extrair dados únicos para filtros (categorias já vem do hook useCategoriasProdutos)
  // Marcas agora são definidas nos contratos, não mais nos produtos

  // Filtrar e ordenar produtos
  const filteredProdutos = useMemo(() => {
    return produtos.filter(produto => {
      // Busca por palavra-chave
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!produto.nome.toLowerCase().includes(searchLower) &&
            !(produto.descricao || '').toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Filtro de categoria
      if (filters.categoria && produto.categoria !== filters.categoria) {
        return false;
      }

      // Filtro de status
      if (filters.status) {
        if (filters.status === 'ativo' && !produto.ativo) return false;
        if (filters.status === 'inativo' && produto.ativo) return false;
      }

      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [produtos, filters]);

  // Legenda de status
  const statusLegend = useMemo(() => {
    const ativosCount = filteredProdutos.filter(p => p.ativo).length;
    const inativosCount = filteredProdutos.filter(p => !p.ativo).length;
    
    return [
      { status: 'ativo', label: 'ATIVO', count: ativosCount },
      { status: 'inativo', label: 'INATIVO', count: inativosCount }
    ];
  }, [filteredProdutos]);

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
  }, [filters]);

  // Funções do modal
  const openModal = () => {
    const inicial = { nome: "", unidade: "", descricao: "", categoria: "", peso: "", ativo: true, perecivel: false, tipo_processamento: "" };
    setFormData(inicial);
    setFormDataInicial(JSON.parse(JSON.stringify(inicial)));
    setErroProduto("");
    setTouched({});
    setModalOpen(true);
  };
  
  const hasUnsavedChanges = () => {
    if (!formDataInicial) return false;
    return JSON.stringify(formData) !== JSON.stringify(formDataInicial);
  };
  
  const handleCloseModal = () => {
    if (hasUnsavedChanges()) {
      setConfirmClose(true);
    } else {
      closeModal();
    }
  };
  
  const confirmCloseModal = () => {
    setConfirmClose(false);
    closeModal();
  };
  
  const closeModal = () => {
    setModalOpen(false);
    setErroProduto("");
    setTouched({});
    setFormData({
      nome: "",
      unidade: "",
      descricao: "",
      categoria: "",
      tipo_processamento: "",
      peso: "",
      perecivel: false,
      ativo: true,
    });
  };

  const handleSave = async () => {
    // Validação
    if (!formData.nome.trim()) {
      setErroProduto("Nome do produto é obrigatório.");
      setTouched({ ...touched, nome: true });
      return;
    }
    
    if (!formData.unidade?.trim()) {
      setErroProduto("Unidade é obrigatória.");
      setTouched({ ...touched, unidade: true });
      return;
    }
    
    if (formData.peso && Number(formData.peso) <= 0) {
      setErroProduto("Peso deve ser maior que zero.");
      return;
    }
    
    try {
      setIsSaving(true);
      const novoProduto = await criarProdutoMutation.mutateAsync(formData);
      setSuccessMessage('Produto criado com sucesso!');
      closeModal();
      setTimeout(() => setSuccessMessage(null), 3000);
      navigate(`/produtos/${novoProduto.id}`);
    } catch (err: any) {
      console.error('Erro ao criar produto:', err);
      setErroProduto(err.message || 'Erro ao criar produto.');
    } finally {
      setIsSaving(false);
    }
  };

  // Funções de Importação/Exportação
  const handleImportProdutos = async (produtosImportacao: Array<Record<string, unknown>>) => {
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
        unidade: produto.unidade || '',
        descricao: produto.descricao || '',
        categoria: produto.categoria || '',
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

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 30 }, // nome
        { wch: 10 }, // unidade
        { wch: 35 }, // descricao
        { wch: 15 }, // categoria
        { wch: 25 }, // tipo_processamento
        { wch: 10 }, // perecivel
        { wch: 8 }   // ativo
      ];
      ws['!cols'] = colWidths;

      // Adicionar validação de dados
      if (!ws['!dataValidation']) ws['!dataValidation'] = [];
      
      // Validação para tipo_processamento (coluna E, linhas 2 em diante)
      for (let i = 2; i <= dadosExportacao.length + 1; i++) {
        ws['!dataValidation'].push({
          type: 'list',
          allowBlank: true,
          sqref: `E${i}`,
          formulas: ['"in natura,minimamente processado,processado,ultraprocessado"'],
          promptTitle: 'Tipo de Processamento',
          prompt: 'Selecione uma das opções',
          errorTitle: 'Valor Inválido',
          error: 'Escolha: in natura, minimamente processado, processado ou ultraprocessado'
        });
      }

      // Validação para perecivel (coluna F)
      for (let i = 2; i <= dadosExportacao.length + 1; i++) {
        ws['!dataValidation'].push({
          type: 'list',
          allowBlank: false,
          sqref: `F${i}`,
          formulas: ['"true,false"'],
          promptTitle: 'Perecível',
          prompt: 'Selecione true ou false',
          errorTitle: 'Valor Inválido',
          error: 'Escolha: true ou false'
        });
      }

      // Validação para ativo (coluna G)
      for (let i = 2; i <= dadosExportacao.length + 1; i++) {
        ws['!dataValidation'].push({
          type: 'list',
          allowBlank: false,
          sqref: `G${i}`,
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
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const nomeArquivo = `modelo_importacao_produtos_${dataAtual}.xlsx`;
      gerarModeloExcelProdutos(nomeArquivo);
      setActionsMenuAnchor(null);
    } catch (error) {
      console.error('Erro ao exportar modelo:', error);
      setError('Erro ao exportar modelo de importação.');
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      {successMessage && (<Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}><Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Box>)}
      <PageContainer fullHeight>
        <PageHeader 
          title="Produtos"
        />
        
        <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar produtos..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              size="small"
              sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setFilters(prev => ({ ...prev, search: '' }))}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectionMode ? (
                <>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                    {selectedIds.length} selecionado(s)
                  </Typography>
                  <Button 
                    variant="contained" color="delete" 
                    startIcon={<DeleteIcon />} 
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.length === 0}
                    size="small"
                  >
                    Deletar
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={handleToggleSelectionMode}
                    size="small"
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outlined" 
                    startIcon={<FilterIcon />} 
                    onClick={(e) => { setFilterAnchorEl(e.currentTarget); setFilterOpen(true); }} 
                    size="small"
                  >
                    Filtros
                  </Button>
                  <Button startIcon={<AddIcon />} onClick={openModal} variant="contained" color="add" size="small">Novo Produto</Button>
                  <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small"><MoreVert /></IconButton>
                </>
              )}
            </Box>
          </Box>
        </Card>

        <TableFilter
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={setFilters}
          fields={filterFields}
          initialValues={filters}
          showSearch={false}
          anchorEl={filterAnchorEl}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, px: 1 }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
            Exibindo {filteredProdutos.length} {filteredProdutos.length === 1 ? 'resultado' : 'resultados'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {statusLegend.map((item) => (
              <Box key={item.status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusIndicator status={item.status} size="small" />
                <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {item.label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                  {item.count}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
          ) : error ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={handleRefresh}>Tentar Novamente</Button></CardContent></Card>
          ) : filteredProdutos.length === 0 ? (
            <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><Inventory sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhum produto encontrado</Typography></CardContent></Card>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ flex: 1, minHeight: 0 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    {selectionMode && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.length > 0 && paginatedProdutos.every(p => selectedIds.includes(p.id))}
                          indeterminate={selectedIds.length > 0 && !paginatedProdutos.every(p => selectedIds.includes(p.id)) && paginatedProdutos.some(p => selectedIds.includes(p.id))}
                          onChange={(e) => handleSelectAll(e.target.checked, paginatedProdutos)}
                        />
                      </TableCell>
                    )}
                    <TableCell>Nome do Produto</TableCell>
                    <TableCell align="center">Unidade</TableCell>
                    <TableCell align="center">Categoria</TableCell>
                    {!selectionMode && <TableCell align="center" width="80">Ações</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedProdutos.map((produto) => {
                    const isInativo = !produto.ativo;
                    const isSelected = selectedIds.includes(produto.id);
                    return (
                    <TableRow 
                      key={produto.id} 
                      hover 
                      selected={isSelected}
                      sx={{ 
                        opacity: isInativo ? 0.5 : 1,
                        backgroundColor: isInativo ? 'action.hover' : 'inherit'
                      }}
                    >
                      {selectionMode && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(produto.id, e.target.checked)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIndicator status={produto.ativo ? 'ativo' : 'inativo'} size="small" />
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {produto.nome}
                              </Typography>
                              {isInativo && <Chip label="Inativo" size="small" color="default" />}
                            </Box>
                            {produto.descricao && <Typography variant="caption" color="text.secondary">{produto.descricao}</Typography>}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={produto.unidade || '-'} 
                          size="small" 
                          variant="outlined"
                          color={produto.unidade ? 'default' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">{produto.categoria || 'N/A'}</Typography>
                      </TableCell>
                      {!selectionMode && (
                        <TableCell align="center">
                          <Tooltip title="Ver Detalhes">
                            <IconButton size="small" onClick={() => navigate(`/produtos/${produto.id}`)} color="primary">
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <CompactPagination 
              count={filteredProdutos.length} 
              page={page} 
              onPageChange={handleChangePage} 
              rowsPerPage={rowsPerPage} 
              onRowsPerPageChange={handleChangeRowsPerPage} 
              rowsPerPageOptions={[10, 25, 50, 100]} 
            />
            </Box>
          )}
        </Box>
      </PageContainer>

      {/* Modal de Criação */}
      <Dialog 
        open={modalOpen} 
        onClose={handleCloseModal}
        maxWidth="md" 
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
            Novo Produto
          </Typography>
          <IconButton
            size="small"
            onClick={handleCloseModal}
            sx={{ color: 'text.secondary' }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {erroProduto && (
            <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                {erroProduto}
              </Typography>
            </Alert>
          )}
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField 
              label="Nome do Produto" 
              value={formData.nome} 
              onChange={(e) => {
                setFormData({ ...formData, nome: e.target.value });
                if (erroProduto) setErroProduto("");
              }}
              onBlur={() => setTouched({ ...touched, nome: true })}
              required 
              fullWidth 
              size="small"
              error={touched.nome && !formData.nome.trim()}
              helperText={touched.nome && !formData.nome.trim() ? "Campo obrigatório" : ""}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                label="Descrição" 
                value={formData.descricao} 
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} 
                multiline 
                rows={2} 
                sx={{ flex: 2 }} 
                size="small"
              />
              <Autocomplete
                freeSolo
                options={[
                  'Quilograma', 'Grama', 'Miligrama', 'Tonelada',
                  'Litro', 'Mililitro',
                  'Unidade', 'Dúzia', 'Caixa', 'Pacote', 'Fardo', 'Saco',
                  'Lata', 'Galão', 'Bandeja', 'Maço', 'Pote',
                  'Vidro', 'Sachê', 'Balde'
                ]}
                value={formData.unidade}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, unidade: newValue || '' });
                  if (newValue && erroProduto) setErroProduto("");
                }}
                onInputChange={(event, newInputValue) => {
                  setFormData({ ...formData, unidade: newInputValue });
                  if (newInputValue && erroProduto) setErroProduto("");
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Unidade" 
                    required
                    size="small"
                    error={touched.unidade && !formData.unidade?.trim()}
                    helperText={touched.unidade && !formData.unidade?.trim() ? "Campo obrigatório" : ""}
                    onBlur={() => setTouched({ ...touched, unidade: true })}
                  />
                )}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Autocomplete
                freeSolo
                options={categorias}
                value={formData.categoria}
                onChange={(event, newValue) => setFormData({ ...formData, categoria: newValue || '' })}
                onInputChange={(event, newInputValue) => setFormData({ ...formData, categoria: newInputValue })}
                renderInput={(params) => <TextField {...params} label="Categoria" size="small" />}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Peso (gramas)"
                type="number"
                value={formData.peso || ''}
                onChange={(e) => {
                  setFormData({ ...formData, peso: e.target.value });
                  if (erroProduto) setErroProduto("");
                }}
                helperText="Peso padrão em gramas"
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ flex: 1 }}
                size="small"
                error={formData.peso !== '' && Number(formData.peso) <= 0}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ flex: 1 }} size="small">
                <InputLabel>Tipo de Processamento</InputLabel>
                <Select 
                  value={formData.tipo_processamento || ''} 
                  onChange={(e) => setFormData({ ...formData, tipo_processamento: e.target.value })} 
                  label="Tipo de Processamento"
                >
                  <MenuItem value="">Nenhum</MenuItem>
                  <MenuItem value="in natura">In Natura</MenuItem>
                  <MenuItem value="minimamente processado">Minimamente Processado</MenuItem>
                  <MenuItem value="processado">Processado</MenuItem>
                  <MenuItem value="ultraprocessado">Ultraprocessado</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel 
                control={
                  <Switch 
                    checked={formData.perecivel || false} 
                    onChange={(e) => setFormData({ ...formData, perecivel: e.target.checked })} 
                    size="small"
                  />
                } 
                label={<Typography variant="body2">Produto Perecível</Typography>}
              />
              <FormControlLabel 
                control={
                  <Switch 
                    checked={formData.ativo} 
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} 
                    size="small"
                  />
                } 
                label={<Typography variant="body2">Produto Ativo</Typography>}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={handleCloseModal} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={isSaving || !formData.nome.trim() || !formData.unidade?.trim()}
          >
            {isSaving ? 'Salvando...' : 'Criar Produto'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog de confirmação para fechar */}
      <Dialog 
        open={confirmClose} 
        onClose={() => setConfirmClose(false)}
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
          <Button onClick={() => setConfirmClose(false)} variant="outlined" size="small">
            Continuar Editando
          </Button>
          <Button onClick={confirmCloseModal} color="delete" variant="contained" size="small">
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de Importação */}
      <ImportacaoProdutos open={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImportProdutos} />

      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)} PaperProps={{ sx: { borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', mt: 1 } }}>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); setImportModalOpen(true); }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Upload sx={{ fontSize: 18 }} /> <Typography>Importar em Lote</Typography></Box></MenuItem>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); handleExportarProdutos(); }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Download sx={{ fontSize: 18 }} /> <Typography>Exportar Excel</Typography></Box></MenuItem>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); handleExportarModelo(); }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Download sx={{ fontSize: 18 }} /> <Typography>Exportar Modelo</Typography></Box></MenuItem>
        <MenuItem onClick={handleToggleSelectionMode}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><DeleteIcon sx={{ fontSize: 18, color: 'error.main' }} /> <Typography color="error">Deletar Múltiplos</Typography></Box></MenuItem>
      </Menu>

      {/* Dialog de Confirmação de Exclusão em Massa */}
      <Dialog open={deleteConfirmOpen} onClose={() => !isDeleting && setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Tem certeza que deseja excluir {selectedIds.length} produto(s)?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
            Produtos que serão excluídos:
          </Typography>
          <Box sx={{ maxHeight: 200, overflowY: 'auto', bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
            {selectedProdutos.map(produto => (
              <Typography key={produto.id} variant="body2" sx={{ py: 0.5 }}>
                • {produto.nome}
              </Typography>
            ))}
          </Box>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta ação não pode ser desfeita!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="delete" disabled={isDeleting}>
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProdutosPage;
