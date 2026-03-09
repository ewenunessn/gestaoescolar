import React, { useState, useMemo, useCallback, useEffect } from "react";
import StatusIndicator from "../components/StatusIndicator";
import PageHeader from "../components/PageHeader";
import PageContainer from "../components/PageContainer";
import TableFilter, { FilterField } from "../components/TableFilter";
import {
  importarProdutosLote,
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
  TablePagination,
  Collapse,
  Autocomplete,
  Chip,
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
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from 'xlsx';

// Unidades de medida disponíveis
const UNIDADES_MEDIDA = [
  { value: 'UN', label: 'Unidade (UN)' },
  { value: 'KG', label: 'Quilograma (KG)' },
  { value: 'G', label: 'Grama (G)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'ML', label: 'Mililitro (ML)' },
  { value: 'DZ', label: 'Dúzia (DZ)' },
  { value: 'PCT', label: 'Pacote (PCT)' },
  { value: 'CX', label: 'Caixa (CX)' },
  { value: 'FD', label: 'Fardo (FD)' },
  { value: 'SC', label: 'Saco (SC)' },
];

interface ProdutoForm {
  nome: string;
  unidade: string;
  descricao: string;
  categoria: string;
  tipo_processamento?: string;
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
    descricao: "",
    categoria: "",
    tipo_processamento: "",
    perecivel: false,
    ativo: true,
  });

  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Função para refresh manual (React Query já gerencia o carregamento automaticamente)
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

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
    setFormData({ nome: "", unidade: "UN", descricao: "", categoria: "", ativo: true });
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setFormData({
      nome: "",
      descricao: "",
      categoria: "",
      tipo_processamento: "",
      perecivel: false,
      ativo: true,
    });
  };

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
        unidade: produto.unidade || 'UN',
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
      // Criar modelo com headers e exemplo
      const headers = [
        'nome', 'unidade', 'descricao', 'categoria', 
        'tipo_processamento', 'perecivel', 'ativo'
      ];

      const exemplo = [
        'Arroz Branco Tipo 1',
        'KG',
        'Arroz branco polido, tipo 1, classe longo fino',
        'Cereais',
        'processado',
        false,
        true
      ];

      // Criar worksheet com headers e exemplo
      const ws = XLSX.utils.aoa_to_sheet([headers, exemplo]);

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

      // Adicionar validação de dados para facilitar o preenchimento
      if (!ws['!dataValidation']) ws['!dataValidation'] = [];
      
      // Validação para tipo_processamento (coluna E, linhas 2 a 100)
      ws['!dataValidation'].push({
        type: 'list',
        allowBlank: true,
        sqref: 'E2:E100',
        formulas: ['"in natura,minimamente processado,processado,ultraprocessado"'],
        promptTitle: 'Tipo de Processamento',
        prompt: 'Selecione uma das opções',
        errorTitle: 'Valor Inválido',
        error: 'Escolha: in natura, minimamente processado, processado ou ultraprocessado'
      });

      // Validação para perecivel (coluna F, linhas 2 a 100)
      ws['!dataValidation'].push({
        type: 'list',
        allowBlank: false,
        sqref: 'F2:F100',
        formulas: ['"true,false"'],
        promptTitle: 'Perecível',
        prompt: 'Selecione true ou false',
        errorTitle: 'Valor Inválido',
        error: 'Escolha: true ou false'
      });

      // Validação para ativo (coluna G, linhas 2 a 100)
      ws['!dataValidation'].push({
        type: 'list',
        allowBlank: false,
        sqref: 'G2:G100',
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
        ['unidade', 'Unidade de medida (UN, KG, L, etc)', 'SIM', 'KG'],
        ['descricao', 'Descrição detalhada do produto', 'NÃO', 'Arroz branco tipo 1'],
        ['categoria', 'Categoria do produto', 'NÃO', 'Cereais'],
        ['tipo_processamento', 'Tipo: in natura, minimamente processado, processado, ultraprocessado', 'NÃO', 'processado'],
        ['perecivel', 'Produto perecível (true/false)', 'NÃO', 'false'],
        ['ativo', 'Produto ativo (true/false)', 'NÃO', 'true'],
        [''],
        ['NOTAS:'],
        ['- Preencha apenas os campos necessários'],
        ['- Use true ou false para os campos perecivel e ativo'],
        ['- O sistema identificará produtos existentes pelo nome e fará atualização'],
        ['- Unidades comuns: UN, KG, G, L, ML, DZ, PCT, CX, FD, SC']
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
              <Button 
                variant="outlined" 
                startIcon={<FilterIcon />} 
                onClick={(e) => { setFilterAnchorEl(e.currentTarget); setFilterOpen(true); }} 
                size="small"
              >
                Filtros
              </Button>
              <Button startIcon={<AddIcon />} onClick={openModal} variant="contained" color="success" size="small">Novo Produto</Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small"><MoreVert /></IconButton>
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
                    <TableCell>Nome do Produto</TableCell>
                    <TableCell align="center">Unidade</TableCell>
                    <TableCell align="center">Categoria</TableCell>
                    <TableCell align="center" width="80">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedProdutos.map((produto) => {
                    const isInativo = !produto.ativo;
                    return (
                    <TableRow 
                      key={produto.id} 
                      hover 
                      sx={{ 
                        opacity: isInativo ? 0.5 : 1,
                        backgroundColor: isInativo ? 'action.hover' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIndicator status={produto.ativo ? 'ativo' : 'inativo'} size="small" />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {produto.nome}
                              {isInativo && <Chip label="Inativo" size="small" color="default" sx={{ ml: 1 }} />}
                            </Typography>
                            {produto.descricao && <Typography variant="caption" color="text.secondary">{produto.descricao}</Typography>}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={produto.unidade || 'UN'} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">{produto.categoria || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver Detalhes">
                          <IconButton size="small" onClick={() => navigate(`/produtos/${produto.id}`)} color="primary">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ 
              borderTop: '1px solid #e9ecef',
              bgcolor: '#ffffff'
            }}>
              <TablePagination 
                component="div" 
                count={filteredProdutos.length} 
                page={page} 
                onPageChange={handleChangePage} 
                rowsPerPage={rowsPerPage} 
                onRowsPerPageChange={handleChangeRowsPerPage} 
                rowsPerPageOptions={[10, 25, 50, 100]} 
                labelRowsPerPage="Itens por página:" 
              />
            </Box>
            </Box>
          )}
        </Box>
      </PageContainer>

      {/* Modal de Criação */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Novo Produto</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField label="Nome do Produto" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required fullWidth />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Descrição" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} multiline rows={2} sx={{ flex: 2 }} />
              <Autocomplete
                value={formData.unidade}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, unidade: newValue || 'UN' });
                }}
                inputValue={formData.unidade}
                onInputChange={(event, newInputValue) => {
                  setFormData({ ...formData, unidade: newInputValue || 'UN' });
                }}
                options={UNIDADES_MEDIDA.map(u => u.value)}
                getOptionLabel={(option) => {
                  const unidade = UNIDADES_MEDIDA.find(u => u.value === option);
                  return unidade ? unidade.label : option;
                }}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Unidade"
                    required
                    helperText="Selecione ou digite"
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
                renderInput={(params) => <TextField {...params} label="Categoria" />}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Tipo de Processamento</InputLabel>
                <Select value={formData.tipo_processamento || ''} onChange={(e) => setFormData({ ...formData, tipo_processamento: e.target.value })} label="Tipo de Processamento">
                  <MenuItem value="">Nenhum</MenuItem>
                  <MenuItem value="in natura">In Natura</MenuItem>
                  <MenuItem value="minimamente processado">Minimamente Processado</MenuItem>
                  <MenuItem value="processado">Processado</MenuItem>
                  <MenuItem value="ultraprocessado">Ultraprocessado</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel control={<Switch checked={formData.perecivel || false} onChange={(e) => setFormData({ ...formData, perecivel: e.target.checked })} />} label="Produto Perecível" />
              <FormControlLabel control={<Switch checked={formData.ativo} onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} />} label="Produto Ativo" />
            </Box>
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
