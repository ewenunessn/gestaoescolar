import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import CompactPagination from '../components/CompactPagination';
import {
  buscarContrato,
  editarContrato,
  removerContrato,
  listarContratoProdutos,
  adicionarContratoProduto,
  editarContratoProduto,
  removerContratoProduto,
} from "../services/contratos";
import { listarFornecedores } from "../services/fornecedores";
import { listarProdutos } from "../services/produtos";
import { formatDateForInput } from "../utils/dateUtils";

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, CircularProgress, Alert, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Card, CardContent, Grid, Chip, Box, FormControl, InputLabel,
  Select, MenuItem, Checkbox, FormControlLabel, Stack, AlertTitle, Tooltip,
  Autocomplete, InputAdornment, Menu
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarTodayIcon,
  ReceiptLong as ReceiptLongIcon,
  ErrorOutline as ErrorOutlineIcon,
  ShoppingCart as ShoppingCartIcon,
  MenuBook,
  Description as DescriptionIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  MoreVert,
  Close as CloseIcon
} from "@mui/icons-material";
import PageBreadcrumbs from '../components/PageBreadcrumbs';

// --- Constantes e Funções Utilitárias (Fora do Componente) ---

const produtoVazio = { produto_id: "", quantidade: "", preco_unitario: "", marca: "", peso: "" };
const contratoVazio = { fornecedor_id: "", numero: "", data_inicio: "", data_fim: "", ativo: true };

const formatarData = (data: string) => new Date(data).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
const formatarMoeda = (valor: number = 0) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
const formatarNumero = (valor: number | string | null | undefined): string => {
  if (valor === null || valor === undefined || valor === '') return '';
  const num = typeof valor === 'string' ? parseFloat(valor) : valor;
  if (isNaN(num)) return '';
  return num % 1 === 0 ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '');
};

const getStatusContrato = (contrato: any) => {
  if (!contrato) return { status: "Desconhecido", color: "default" as const };
  const hoje = new Date();
  const inicio = new Date(contrato.data_inicio);
  const fim = new Date(contrato.data_fim);

  if (!contrato.ativo) return { status: "Inativo", color: "default" as const };
  if (hoje < inicio) return { status: "Pendente", color: "warning" as const };
  if (hoje > fim) return { status: "Expirado", color: "error" as const };
  return { status: "Ativo", color: "success" as const };
};

// --- Subcomponente de UI ---

const ContratoInfoCard = ({ contrato, fornecedor, valorTotal }) => {
  const status = getStatusContrato(contrato);
  
  const tipoLicitacaoLabel = {
    'pregao_eletronico': 'Pregão Eletrônico',
    'pregao_presencial': 'Pregão Presencial', 
    'chamada_publica_pnae': 'Chamada Pública PNAE',
    'dispensa_licitacao': 'Dispensa de Licitação',
    'inexigibilidade': 'Inexigibilidade',
    'concorrencia': 'Concorrência',
    'tomada_precos': 'Tomada de Preços',
    'convite': 'Convite',
    'pregao': 'Pregão Eletrônico',
    'chamada_publica_agricultura': 'Chamada Pública PNAE'
  };
  
  return (
    <Card sx={{ mb: 1.5 }}>
      <Box sx={{ p: 1.5 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 0.75 }}>
              Contrato #{contrato.numero}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BusinessIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                  <strong>Fornecedor:</strong> {fornecedor?.nome || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                  <strong>Vigência:</strong> {`${formatarData(contrato.data_inicio)} a ${formatarData(contrato.data_fim)}`}
                </Typography>
                <Chip 
                  label={status.status} 
                  color={status.color} 
                  size="small" 
                  sx={{ height: 18, fontSize: '0.65rem', ml: 0.5, color: status.color !== 'default' ? 'white' : undefined }} 
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DescriptionIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                  <strong>Modalidade:</strong> {
                    tipoLicitacaoLabel[contrato.tipo_licitacao] || 
                    tipoLicitacaoLabel['pregao_eletronico'] || 
                    'Pregão Eletrônico'
                  }
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ 
              p: 1.5, 
              bgcolor: 'primary.main', 
              color: 'white', 
              borderRadius: 1, 
              textAlign: 'center'
            }}>
              <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 500, letterSpacing: 0.5, fontSize: '0.7rem' }}>
                VALOR TOTAL
              </Typography>
              <Typography variant="h6" fontWeight="700" sx={{ mt: 0.25, fontSize: '1.1rem' }}>
                {formatarMoeda(valorTotal)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Card>
  );
};

// --- Componente Principal ---

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Detectar de onde o usuário veio
  const fromFornecedor = searchParams.get('from') === 'fornecedor';
  const fornecedorId = searchParams.get('fornecedor_id');

  // Estados de dados
  const [contrato, setContrato] = useState<any>(null);
  const [fornecedor, setFornecedor] = useState<any>(null);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<any[]>([]);
  const [produtosContrato, setProdutosContrato] = useState<any[]>([]);
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Estados de Modais (Dialogs)
  const [dialogState, setDialogState] = useState({ produto: false, editarContrato: false, removerContrato: false, removerProduto: false });
  const [formProduto, setFormProduto] = useState<any>({ produto_id: "", quantidade: "", preco_unitario: "", unidade: "Kg" });
  const [formContrato, setFormContrato] = useState<any>(contratoVazio);
  const [editandoProduto, setEditandoProduto] = useState<any | null>(null);
  const [removerId, setRemoverId] = useState<number | null>(null);
  const [dependenciasContrato, setDependenciasContrato] = useState<any>(null);
  const [forceDelete, setForceDelete] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  
  // Estados de validação e erros dos dialogs
  const [erroProduto, setErroProduto] = useState("");
  const [erroContrato, setErroContrato] = useState("");
  const [erroRemoverProduto, setErroRemoverProduto] = useState("");
  const [touched, setTouched] = useState<any>({});
  
  // Estados para controle de mudanças não salvas
  const [formProdutoInicial, setFormProdutoInicial] = useState<any>(null);
  const [formContratoInicial, setFormContratoInicial] = useState<any>(null);
  const [confirmCloseDialog, setConfirmCloseDialog] = useState<'produto' | 'contrato' | null>(null);

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const valorTotalContrato = useMemo(() => 
    produtosContrato.reduce((total, produto) => total + (Number(produto.valor_total) || 0), 0),
    [produtosContrato]
  );

  // Filtrar produtos por busca
  const filteredProdutos = useMemo(() => {
    if (!searchTerm) return produtosContrato;
    
    const searchLower = searchTerm.toLowerCase();
    return produtosContrato.filter(produto => {
      const produtoInfo = produtosDisponiveis.find(p => p.id === produto.produto_id);
      const nome = produtoInfo?.nome?.toLowerCase() || '';
      const marca = produto.marca?.toLowerCase() || '';
      
      return nome.includes(searchLower) || marca.includes(searchLower);
    });
  }, [produtosContrato, searchTerm, produtosDisponiveis]);

  // Produtos paginados
  const paginatedProdutos = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const result = filteredProdutos.slice(startIndex, startIndex + rowsPerPage);
    console.log('📄 Paginação:', { page, rowsPerPage, startIndex, total: filteredProdutos.length, resultado: result.length });
    return result;
  }, [filteredProdutos, page, rowsPerPage]);

  // Funções de paginação
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Função para navegar de volta
  const handleVoltar = useCallback(() => {
    if (fromFornecedor && fornecedorId) {
      navigate(`/fornecedores/${fornecedorId}`);
    } else {
      navigate('/contratos');
    }
  }, [navigate, fromFornecedor, fornecedorId]);

  const carregarDados = useCallback(async () => {
    if (!id || isNaN(Number(id))) {
      setErro("ID do contrato inválido");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro("");
    try {
      const [contratoData, fornecedoresData, produtosData, produtosContratoData] = await Promise.all([
        buscarContrato(Number(id)),
        listarFornecedores(),
        listarProdutos(),
        listarContratoProdutos(Number(id))
      ]);

      setContrato(contratoData);
      setFornecedor(fornecedoresData.find(f => f.id === contratoData.fornecedor_id));
      setProdutosDisponiveis(produtosData);

      const produtosMapeados = produtosContratoData.map((p: any) => ({
        ...p,
        quantidade: p.quantidade_contratada ?? p.limite ?? 0,
        preco_unitario: p.preco_unitario ?? p.preco ?? 0,
        saldo: p.saldo ?? p.quantidade_contratada ?? p.limite ?? 0,
        valor_total: p.valor_total ?? ((p.quantidade_contratada ?? p.limite ?? 0) * (p.preco_unitario ?? p.preco ?? 0))
      }));
      
      console.log('📦 Produtos carregados:', produtosMapeados.length, produtosMapeados);
      setProdutosContrato(produtosMapeados);
      setPage(0); // Reset página ao carregar dados

    } catch (error: any) {
      console.error('❌ Erro ao carregar contrato:', error);
      
      // O interceptor já transforma o erro em uma mensagem amigável
      if (error.message) {
        // Se a mensagem contém "não encontrado", adiciona contexto de permissão
        if (error.message.toLowerCase().includes('não encontrado')) {
          setErro('Contrato não encontrado ou você não tem permissão para acessá-lo.');
        } else {
          setErro(error.message);
        }
      } else {
        setErro('Erro ao carregar dados do contrato.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Atalho Ctrl+A para adicionar item
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        abrirModalProduto();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const abrirModalProduto = (produto?: any) => {
    setEditandoProduto(produto || null);
    setErroProduto("");
    setTouched({});
    if (produto) {
      const produtoInfo = produtosDisponiveis.find(p => p.id === produto.produto_id);
      setProdutoSelecionado(produtoInfo || null);
      const formInicial = { 
        produto_id: produto.produto_id, 
        quantidade: produto.quantidade, 
        preco_unitario: produto.preco_unitario,
        marca: produto.marca || "",
        peso: produto.peso ? formatarNumero(produto.peso) : ""
      };
      setFormProduto(formInicial);
      setFormProdutoInicial(JSON.parse(JSON.stringify(formInicial)));
    } else {
      setProdutoSelecionado(null);
      setFormProduto(produtoVazio);
      setFormProdutoInicial(JSON.parse(JSON.stringify(produtoVazio)));
    }
    setDialogState(prev => ({ ...prev, produto: true }));
  };
  
  const hasUnsavedChangesProduto = () => {
    if (!formProdutoInicial) return false;
    return JSON.stringify(formProduto) !== JSON.stringify(formProdutoInicial);
  };
  
  const handleCloseProdutoDialog = () => {
    if (hasUnsavedChangesProduto()) {
      setConfirmCloseDialog('produto');
    } else {
      setDialogState(prev => ({ ...prev, produto: false }));
    }
  };
  
  const confirmCloseProdutoDialog = () => {
    setConfirmCloseDialog(null);
    setDialogState(prev => ({ ...prev, produto: false }));
  };

  const salvarProduto = async () => {
    // Validação
    if (!formProduto.produto_id || !formProduto.quantidade || !formProduto.preco_unitario) { 
      setErroProduto("Produto, quantidade e preço são obrigatórios.");
      setTouched({ produto_id: true, quantidade: true, preco_unitario: true });
      return;
    }
    
    if (Number(formProduto.quantidade) <= 0) {
      setErroProduto("Quantidade deve ser maior que zero.");
      return;
    }
    
    if (Number(formProduto.preco_unitario) <= 0) {
      setErroProduto("Preço unitário deve ser maior que zero.");
      return;
    }
    
    try {
      const payload = { 
        contrato_id: Number(id), 
        produto_id: Number(formProduto.produto_id), 
        quantidade_contratada: Number(formProduto.quantidade), 
        preco_unitario: Number(formProduto.preco_unitario),
        marca: formProduto.marca || "",
        peso: formProduto.peso ? Number(formProduto.peso.toString().replace(',', '.')) : null,
        ativo: true
      };
      
      if (editandoProduto) { await editarContratoProduto(editandoProduto.id, payload); } 
      else { await adicionarContratoProduto(payload); }
      setDialogState(prev => ({ ...prev, produto: false }));
      setErroProduto("");
      await carregarDados();
    } catch (error: any) { 
      setErroProduto(error.message || "Erro ao salvar produto.");
    }
  };

  const confirmarRemoverProduto = (id: number) => {
    setRemoverId(id);
    setErroRemoverProduto("");
    setDialogState(prev => ({ ...prev, removerProduto: true }));
  };

  const removerProdutoConfirmado = async () => {
    if (!removerId) return;
    try {
      await removerContratoProduto(removerId);
      setDialogState(prev => ({ ...prev, removerProduto: false }));
      setRemoverId(null);
      setErroRemoverProduto("");
      await carregarDados();
    } catch (error: any) { 
      setErroRemoverProduto(error.response?.data?.message || error.message || "Erro ao remover produto.");
    }
  };
  
  const abrirModalEditarContrato = () => {
    const formInicial = { ...contrato, data_inicio: formatDateForInput(contrato.data_inicio), data_fim: formatDateForInput(contrato.data_fim) };
    setFormContrato(formInicial);
    setFormContratoInicial(JSON.parse(JSON.stringify(formInicial)));
    setErroContrato("");
    setTouched({});
    setDialogState(prev => ({ ...prev, editarContrato: true }));
  };
  
  const hasUnsavedChangesContrato = () => {
    if (!formContratoInicial) return false;
    return JSON.stringify(formContrato) !== JSON.stringify(formContratoInicial);
  };
  
  const handleCloseContratoDialog = () => {
    if (hasUnsavedChangesContrato()) {
      setConfirmCloseDialog('contrato');
    } else {
      setDialogState(prev => ({ ...prev, editarContrato: false }));
    }
  };
  
  const confirmCloseContratoDialog = () => {
    setConfirmCloseDialog(null);
    setDialogState(prev => ({ ...prev, editarContrato: false }));
  };

  const salvarContratoEditado = async () => {
    // Validação
    if (!formContrato.numero || !formContrato.data_inicio || !formContrato.data_fim) { 
      setErroContrato("Todos os campos obrigatórios devem ser preenchidos.");
      setTouched({ numero: true, data_inicio: true, data_fim: true });
      return;
    }
    
    if (new Date(formContrato.data_fim) <= new Date(formContrato.data_inicio)) { 
      setErroContrato("A data de fim deve ser posterior à data de início.");
      return;
    }
    
    try {
      await editarContrato(contrato.id, formContrato);
      setDialogState(prev => ({ ...prev, editarContrato: false }));
      setErroContrato("");
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      await carregarDados();
    } catch (error: any) { 
      setErroContrato(error.message || "Erro ao editar contrato.");
    }
  };

  const confirmarRemoverContrato = () => {
    setDependenciasContrato(null);
    setForceDelete(false);
    setDialogState(prev => ({ ...prev, removerContrato: true }));
  };
  
  const removerContratoConfirmado = async () => {
    try {
      await removerContrato(contrato.id, forceDelete);
      setDialogState(prev => ({ ...prev, removerContrato: false }));
      navigate("/contratos");
    } catch (error: any) {
      setDialogState(prev => ({ ...prev, removerContrato: false }));
      if (error.response?.data?.dependencias) { 
        setDependenciasContrato(error.response.data); 
      } else { 
        setErro(error.response?.data?.message || "Erro ao remover contrato."); 
      }
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}><CircularProgress size={60} /></Box>;
  
  if (erro && !contrato) return (
    <PageContainer>
        <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>
            <Button variant="contained" onClick={carregarDados}>Tentar Novamente</Button>
        </CardContent></Card>
    </PageContainer>
  );

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      {successMessage && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}>
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>
        </Box>
      )}
      
      <PageContainer fullHeight>
        <PageHeader 
          title={contrato ? `Contrato ${contrato.numero}` : 'Contrato'}
        />
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <PageBreadcrumbs 
            items={[
              { label: 'Contratos', path: '/contratos', icon: <DescriptionIcon fontSize="small" /> },
              { label: contrato ? `Contrato ${contrato.numero}` : 'Carregando...' }
            ]}
            onBack={handleVoltar}
          />
          <IconButton 
            size="small" 
            onClick={(e) => setMenuAnchorEl(e.currentTarget)}
            sx={{ ml: 2 }}
          >
            <MoreVert />
          </IconButton>
        </Box>
        
        {erro && <Alert severity="error" onClose={() => setErro("")} sx={{ mb: 2 }}>{erro}</Alert>}

        <ContratoInfoCard contrato={contrato} fornecedor={fornecedor} valorTotal={valorTotalContrato} />

        {/* Legenda de Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
            Exibindo {filteredProdutos.length} {filteredProdutos.length === 1 ? 'resultado' : 'resultados'}
          </Typography>
          <Button 
            startIcon={<AddIcon />} 
            onClick={() => abrirModalProduto()} 
            variant="contained" 
            color="add" 
            size="small"
          >
            Adicionar Item
          </Button>
        </Box>

        {/* Tabela de Itens */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {produtosContrato.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <MenuBook sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                  Nenhum item encontrado
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Adicione o primeiro item a este contrato.
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={() => abrirModalProduto()}
                  color="add"
                >
                  Adicionar Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ height: 56, py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
                          {!searchOpen ? (
                            <>
                              <Typography variant="body2" fontWeight={600}>Produto</Typography>
                              <IconButton 
                                size="small" 
                                onClick={() => setSearchOpen(true)}
                                sx={{ ml: 'auto', p: 0.5 }}
                              >
                                <SearchIcon fontSize="small" />
                              </IconButton>
                            </>
                          ) : (
                            <TextField
                              placeholder="Buscar produto..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              size="small"
                              autoFocus
                              fullWidth
                              sx={{ 
                                '& .MuiOutlinedInput-root': { 
                                  height: 36,
                                  fontSize: '0.875rem',
                                  minHeight: 36
                                },
                                '& .MuiInputBase-input': {
                                  py: 0.75,
                                  fontSize: '0.875rem'
                                }
                              }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 18 }} />
                                  </InputAdornment>
                                ),
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => {
                                        setSearchTerm('');
                                        setSearchOpen(false);
                                      }}
                                      sx={{ p: 0.5 }}
                                    >
                                      <ClearIcon fontSize="small" />
                                    </IconButton>
                                  </InputAdornment>
                                ),
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ height: 56, py: 1 }}>Marca</TableCell>
                      <TableCell align="center" sx={{ height: 56, py: 1 }}>Peso</TableCell>
                      <TableCell align="center" sx={{ height: 56, py: 1 }}>Unidade</TableCell>
                      <TableCell align="center" sx={{ height: 56, py: 1 }}>Quantidade</TableCell>
                      <TableCell align="center" sx={{ height: 56, py: 1 }}>Preço Unitário</TableCell>
                      <TableCell align="center" sx={{ height: 56, py: 1 }}>Valor Total</TableCell>
                      <TableCell align="center" sx={{ height: 56, py: 1 }}>Saldo</TableCell>
                      <TableCell align="center" width="80" sx={{ height: 56, py: 1 }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedProdutos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                          <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                          <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5 }}>
                            Nenhum item encontrado
                          </Typography>
                          {searchTerm && (
                            <Typography variant="body2" color="text.secondary">
                              Tente buscar com outros termos
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedProdutos.map((produto) => {
                        const produtoInfo = produtosDisponiveis.find(p => p.id === produto.produto_id);
                        const isInativo = produto.ativo === false;
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
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {produtoInfo?.nome || `Produto #${produto.produto_id}`}
                                  </Typography>
                                  {isInativo && (
                                    <Chip label="Inativo" size="small" color="default" sx={{ mt: 0.5, height: 20 }} />
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" color="text.secondary">
                                {produto.marca || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" color="text.secondary">
                                {produto.peso ? `${formatarNumero(produto.peso)}g` : "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={produto.unidade || "-"} 
                                size="small" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">{produto.quantidade}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">{formatarMoeda(produto.preco_unitario)}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight={600} color="primary">
                                {formatarMoeda(produto.valor_total)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={produto.saldo} 
                                color={produto.saldo > 0 ? "success" : "error"} 
                                size="small"
                                sx={{ color: 'white' }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => abrirModalProduto(produto)} color="primary">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remover">
                                <IconButton size="small" onClick={() => confirmarRemoverProduto(produto.id)} color="delete">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <CompactPagination
                count={filteredProdutos.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Box>
          )}
        </Box>
      </PageContainer>

      {/* Modais fora do PageContainer */}
      {/* --- MODAIS / DIALOGS --- */}
      <Dialog 
        open={dialogState.produto} 
        onClose={handleCloseProdutoDialog}
        fullWidth 
        maxWidth="sm"
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
            {editandoProduto ? "Editar Item" : "Adicionar Item ao Contrato"}
          </Typography>
          <IconButton
            size="small"
            onClick={handleCloseProdutoDialog}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
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
          <Autocomplete
            value={produtoSelecionado}
            onChange={(_, newValue) => {
              setProdutoSelecionado(newValue);
              setFormProduto({ ...formProduto, produto_id: newValue?.id || "", peso: newValue?.peso ? formatarNumero(newValue.peso) : "" });
              if (newValue) {
                setTouched({ ...touched, produto_id: true });
                if (erroProduto) setErroProduto("");
              }
            }}
            options={produtosDisponiveis}
            getOptionLabel={(option) => option.nome}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box>
                  <Typography variant="body2">{option.nome}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.categoria && `${option.categoria} • `}
                    {option.unidade && `Unidade: ${option.unidade}`}
                    {option.peso && ` • Peso padrão: ${formatarNumero(option.peso)}g`}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Produto *"
                placeholder="Digite para pesquisar..."
                required
                size="small"
                error={touched.produto_id && !formProduto.produto_id}
                helperText={touched.produto_id && !formProduto.produto_id ? "Campo obrigatório" : ""}
                onBlur={() => setTouched({ ...touched, produto_id: true })}
              />
            )}
            noOptionsText="Nenhum produto encontrado"
            fullWidth
            sx={{ mb: 1.5 }}
          />
          {produtoSelecionado && (
            <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                <strong>Unidade:</strong> {produtoSelecionado.unidade || "-"}
                {produtoSelecionado.peso && <> • <strong>Peso padrão:</strong> {formatarNumero(produtoSelecionado.peso)}g</>}
              </Typography>
            </Alert>
          )}
          <TextField 
            label="Quantidade Contratada *" 
            type="number" 
            value={formProduto.quantidade} 
            onChange={e => {
              setFormProduto({ ...formProduto, quantidade: e.target.value });
              if (erroProduto) setErroProduto("");
            }}
            onBlur={() => setTouched({ ...touched, quantidade: true })}
            fullWidth 
            size="small"
            sx={{ mb: 1.5 }} 
            required 
            error={touched.quantidade && (!formProduto.quantidade || Number(formProduto.quantidade) <= 0)}
            helperText={touched.quantidade && (!formProduto.quantidade ? "Campo obrigatório" : Number(formProduto.quantidade) <= 0 ? "Deve ser maior que zero" : "")}
            inputProps={{ min: 0 }} 
          />
          <TextField 
            label="Marca" 
            value={formProduto.marca || ""} 
            onChange={e => setFormProduto({ ...formProduto, marca: e.target.value })} 
            fullWidth 
            size="small"
            sx={{ mb: 1.5 }} 
            placeholder="Ex: Tio João, Camil, etc." 
          />
          <TextField 
            label="Peso (gramas)" 
            type="number" 
            value={formProduto.peso || ""} 
            onChange={e => setFormProduto({ ...formProduto, peso: e.target.value })} 
            fullWidth 
            size="small"
            sx={{ mb: 1.5 }} 
            placeholder="Ex: 1000 para 1kg" 
            helperText="Deixe vazio para usar o peso padrão do produto"
            inputProps={{ min: 0 }} 
          />
          <TextField 
            label="Preço Unitário *" 
            type="number" 
            value={formProduto.preco_unitario} 
            onChange={e => {
              setFormProduto({ ...formProduto, preco_unitario: e.target.value });
              if (erroProduto) setErroProduto("");
            }}
            onBlur={() => setTouched({ ...touched, preco_unitario: true })}
            fullWidth 
            size="small"
            required 
            error={touched.preco_unitario && (!formProduto.preco_unitario || Number(formProduto.preco_unitario) <= 0)}
            helperText={touched.preco_unitario && (!formProduto.preco_unitario ? "Campo obrigatório" : Number(formProduto.preco_unitario) <= 0 ? "Deve ser maior que zero" : "")}
            inputProps={{ min: 0, step: 0.01 }} 
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={handleCloseProdutoDialog} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button onClick={salvarProduto} variant="contained">
            {editandoProduto ? "Salvar" : "Adicionar"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog de confirmação para fechar produto */}
      <Dialog 
        open={confirmCloseDialog === 'produto'} 
        onClose={() => setConfirmCloseDialog(null)}
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
          <Button onClick={() => setConfirmCloseDialog(null)} variant="outlined" size="small">
            Continuar Editando
          </Button>
          <Button onClick={confirmCloseProdutoDialog} color="delete" variant="contained" size="small">
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
        
        <Dialog 
          open={dialogState.editarContrato} 
          onClose={handleCloseContratoDialog}
          fullWidth 
          maxWidth="sm"
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
              Editar Contrato
            </Typography>
            <IconButton
              size="small"
              onClick={handleCloseContratoDialog}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 2, pb: 1 }}>
            {erroContrato && (
              <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  {erroContrato}
                </Typography>
              </Alert>
            )}
            <TextField 
              label="Número do Contrato" 
              value={formContrato.numero} 
              onChange={e => {
                setFormContrato({ ...formContrato, numero: e.target.value });
                if (erroContrato) setErroContrato("");
              }}
              onBlur={() => setTouched({ ...touched, numero: true })}
              fullWidth 
              size="small"
              sx={{ mb: 1.5 }} 
              required 
              error={touched.numero && !formContrato.numero}
              helperText={touched.numero && !formContrato.numero ? "Campo obrigatório" : ""}
            />
            <TextField 
              label="Data de Início" 
              type="date" 
              value={formContrato.data_inicio} 
              onChange={e => {
                setFormContrato({ ...formContrato, data_inicio: e.target.value });
                if (erroContrato) setErroContrato("");
              }}
              onBlur={() => setTouched({ ...touched, data_inicio: true })}
              fullWidth 
              size="small"
              sx={{ mb: 1.5 }} 
              InputLabelProps={{ shrink: true }} 
              required 
              error={touched.data_inicio && !formContrato.data_inicio}
              helperText={touched.data_inicio && !formContrato.data_inicio ? "Campo obrigatório" : ""}
            />
            <TextField 
              label="Data de Fim" 
              type="date" 
              value={formContrato.data_fim} 
              onChange={e => {
                setFormContrato({ ...formContrato, data_fim: e.target.value });
                if (erroContrato) setErroContrato("");
              }}
              onBlur={() => setTouched({ ...touched, data_fim: true })}
              fullWidth 
              size="small"
              sx={{ mb: 1.5 }} 
              InputLabelProps={{ shrink: true }} 
              required 
              error={touched.data_fim && !formContrato.data_fim}
              helperText={touched.data_fim && !formContrato.data_fim ? "Campo obrigatório" : ""}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Modalidade de Licitação</InputLabel>
              <Select
                value={formContrato.tipo_licitacao || 'pregao_eletronico'}
                label="Modalidade de Licitação"
                onChange={e => setFormContrato({ ...formContrato, tipo_licitacao: e.target.value })}
              >
                <MenuItem value="pregao_eletronico">Pregão Eletrônico</MenuItem>
                <MenuItem value="pregao_presencial">Pregão Presencial</MenuItem>
                <MenuItem value="chamada_publica_pnae">Chamada Pública PNAE</MenuItem>
                <MenuItem value="dispensa_licitacao">Dispensa de Licitação</MenuItem>
                <MenuItem value="inexigibilidade">Inexigibilidade</MenuItem>
                <MenuItem value="concorrencia">Concorrência</MenuItem>
                <MenuItem value="tomada_precos">Tomada de Preços</MenuItem>
                <MenuItem value="convite">Convite</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
            <Button onClick={handleCloseContratoDialog} sx={{ color: 'text.secondary' }}>
              Cancelar
            </Button>
            <Button onClick={salvarContratoEditado} variant="contained">
              Salvar Alterações
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Dialog de confirmação para fechar contrato */}
        <Dialog 
          open={confirmCloseDialog === 'contrato'} 
          onClose={() => setConfirmCloseDialog(null)}
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
            <Button onClick={() => setConfirmCloseDialog(null)} variant="outlined" size="small">
              Continuar Editando
            </Button>
            <Button onClick={confirmCloseContratoDialog} color="delete" variant="contained" size="small">
              Descartar
            </Button>
          </DialogActions>
        </Dialog>
        
        <Dialog 
          open={dialogState.removerProduto} 
          onClose={() => setDialogState(p => ({...p, removerProduto: false}))}
          fullWidth
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
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              Remover Item do Contrato
            </Typography>
            <IconButton
              size="small"
              onClick={() => setDialogState(p => ({...p, removerProduto: false}))}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 2, pb: 1 }}>
            {erroRemoverProduto && (
              <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  {erroRemoverProduto}
                </Typography>
              </Alert>
            )}
            <Typography variant="body2">
              Tem certeza que deseja remover este item do contrato?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
            <Button onClick={() => setDialogState(p => ({...p, removerProduto: false}))} sx={{ color: 'text.secondary' }}>
              Cancelar
            </Button>
            <Button onClick={removerProdutoConfirmado} color="delete" variant="contained">
              Remover
            </Button>
          </DialogActions>
        </Dialog>
        
        <Dialog 
          open={dialogState.removerContrato} 
          onClose={() => setDialogState(p => ({...p, removerContrato: false}))} 
          fullWidth 
          maxWidth="sm"
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
              Remover Contrato
            </Typography>
            <IconButton
              size="small"
              onClick={() => setDialogState(p => ({...p, removerContrato: false}))}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 2, pb: 1 }}>
            {!dependenciasContrato ? (
              <Typography variant="body2">
                Tem certeza que deseja remover este contrato? Esta ação é irreversível.
              </Typography>
            ) : (
              <Alert severity="warning" icon={<ErrorOutlineIcon />} sx={{ fontSize: '0.875rem' }}>
                <AlertTitle sx={{ fontSize: '0.9375rem' }}>Não é possível remover este contrato diretamente</AlertTitle>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {dependenciasContrato.message}
                </Typography>
                <Box component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
                  {dependenciasContrato.dependencias.produtos > 0 && <li>{dependenciasContrato.dependencias.produtos} itens de contrato</li>}
                  {dependenciasContrato.dependencias.pedidos_itens > 0 && <li>{dependenciasContrato.dependencias.pedidos_itens} itens de pedidos</li>}
                  {dependenciasContrato.dependencias.movimentacoes > 0 && <li>{dependenciasContrato.dependencias.movimentacoes} movimentações de estoque</li>}
                </Box>
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={forceDelete} 
                      onChange={e => setForceDelete(e.target.checked)} 
                      color="delete"
                      size="small"
                    />
                  } 
                  label={
                    <Typography variant="body2">
                      Sim, entendo os riscos e desejo forçar a exclusão de tudo.
                    </Typography>
                  }
                  sx={{ mt: 2 }} 
                />
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
            <Button onClick={() => setDialogState(p => ({...p, removerContrato: false}))} sx={{ color: 'text.secondary' }}>
              Cancelar
            </Button>
            <Button 
              onClick={removerContratoConfirmado} 
              color="delete" variant="contained" 
              disabled={dependenciasContrato && !forceDelete}
            >
              Remover
            </Button>
          </DialogActions>
        </Dialog>

        {/* Menu de Ações */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
          PaperProps={{
            sx: {
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              mt: 1
            }
          }}
        >
          <MenuItem 
            onClick={() => {
              setMenuAnchorEl(null);
              abrirModalEditarContrato();
            }}
          >
            <EditIcon sx={{ mr: 1.5, fontSize: 18 }} />
            Editar Contrato
          </MenuItem>
          <MenuItem 
            onClick={() => {
              setMenuAnchorEl(null);
              confirmarRemoverContrato();
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1.5, fontSize: 18 }} />
            Excluir Contrato
          </MenuItem>
        </Menu>
    </Box>
  );
}
