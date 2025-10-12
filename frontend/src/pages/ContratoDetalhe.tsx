import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Autocomplete
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
  MenuBook as MenuBookIcon
} from "@mui/icons-material";

// --- Constantes e Funções Utilitárias (Fora do Componente) ---

const produtoVazio = { produto_id: "", quantidade: "", preco_unitario: "" };
const contratoVazio = { fornecedor_id: "", numero: "", data_inicio: "", data_fim: "", ativo: true };

const formatarData = (data: string) => new Date(data).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
const formatarMoeda = (valor: number = 0) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

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

// --- Subcomponentes de UI ---

const PageHeader = ({ onBack, onEdit, onDelete }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Detalhes do Contrato
            </Typography>
            <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ textTransform: 'none', color: 'text.secondary', p: 0, mt: 0.5 }}>
                Voltar para lista de contratos
            </Button>
        </Box>
        <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="primary" startIcon={<EditIcon />} onClick={onEdit}>
                Editar
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={onDelete}>
                Excluir
            </Button>
        </Stack>
    </Box>
);

const ContratoInfoCard = ({ contrato, fornecedor, valorTotal }) => {
  const status = getStatusContrato(contrato);
  return (
    <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', mb: 4 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <ReceiptLongIcon color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h5" component="div" fontWeight="600">
              Contrato #{contrato.numero}
            </Typography>
            <Chip label={status.status} color={status.color} size="small" variant="outlined" sx={{ mt: 0.5 }} />
          </Box>
        </Stack>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <BusinessIcon fontSize="small" color="action" />
                <Typography variant="body2"><strong>Fornecedor:</strong> {fornecedor?.nome || "N/A"}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <CalendarTodayIcon fontSize="small" color="action" />
                <Typography variant="body2"><strong>Vigência:</strong> {`${formatarData(contrato.data_inicio)} a ${formatarData(contrato.data_fim)}`}</Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5} sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 2, textAlign: 'center', width: { xs: '100%', md: 'auto' } }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>VALOR TOTAL DO CONTRATO</Typography>
              <Typography variant="h5" fontWeight="bold">{formatarMoeda(valorTotal)}</Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// --- Componente Principal ---

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Estados de dados
  const [contrato, setContrato] = useState<any>(null);
  const [fornecedor, setFornecedor] = useState<any>(null);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<any[]>([]);
  const [produtosContrato, setProdutosContrato] = useState<any[]>([]);
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  // Estados de Modais (Dialogs)
  const [dialogState, setDialogState] = useState({ produto: false, editarContrato: false, removerContrato: false, removerProduto: false });
  const [formProduto, setFormProduto] = useState<any>(produtoVazio);
  const [formContrato, setFormContrato] = useState<any>(contratoVazio);
  const [editandoProduto, setEditandoProduto] = useState<any | null>(null);
  const [removerId, setRemoverId] = useState<number | null>(null);
  const [dependenciasContrato, setDependenciasContrato] = useState<any>(null);
  const [forceDelete, setForceDelete] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);

  const valorTotalContrato = useMemo(() => 
    produtosContrato.reduce((total, produto) => total + (Number(produto.valor_total) || 0), 0),
    [produtosContrato]
  );

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
      setProdutosContrato(produtosMapeados);

    } catch (error: any) {
      setErro(error.message.includes('404') ? 'Contrato não encontrado.' : 'Erro ao carregar dados do contrato.');
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
    if (produto) {
      const produtoInfo = produtosDisponiveis.find(p => p.id === produto.produto_id);
      setProdutoSelecionado(produtoInfo || null);
      setFormProduto({ produto_id: produto.produto_id, quantidade: produto.quantidade, preco_unitario: produto.preco_unitario });
    } else {
      setProdutoSelecionado(null);
      setFormProduto(produtoVazio);
    }
    setDialogState(prev => ({ ...prev, produto: true }));
  };

  const salvarProduto = async () => {
    if (!formProduto.produto_id || !formProduto.quantidade || !formProduto.preco_unitario) { return setErro("Produto, quantidade e preço são obrigatórios."); }
    try {
      const payload = { contrato_id: Number(id), produto_id: formProduto.produto_id, quantidade_contratada: formProduto.quantidade, preco_unitario: formProduto.preco_unitario };
      if (editandoProduto) { await editarContratoProduto(editandoProduto.id, payload); } 
      else { await adicionarContratoProduto(payload); }
      setDialogState(prev => ({ ...prev, produto: false }));
      await carregarDados();
    } catch (error: any) { setErro(error.message || "Erro ao salvar produto."); }
  };

  const confirmarRemoverProduto = (id: number) => {
    setRemoverId(id);
    setDialogState(prev => ({ ...prev, removerProduto: true }));
  };

  const removerProdutoConfirmado = async () => {
    if (!removerId) return;
    try {
      await removerContratoProduto(removerId);
      setDialogState(prev => ({ ...prev, removerProduto: false }));
      setRemoverId(null);
      await carregarDados();
    } catch (error: any) { setErro(error.message || "Erro ao remover produto."); }
  };
  
  const abrirModalEditarContrato = () => {
    setFormContrato({ ...contrato, data_inicio: formatDateForInput(contrato.data_inicio), data_fim: formatDateForInput(contrato.data_fim) });
    setDialogState(prev => ({ ...prev, editarContrato: true }));
  };

  const salvarContratoEditado = async () => {
    if (!formContrato.numero || !formContrato.data_inicio || !formContrato.data_fim) { return setErro("Todos os campos obrigatórios devem ser preenchidos."); }
    if (new Date(formContrato.data_fim) <= new Date(formContrato.data_inicio)) { return setErro("A data de fim deve ser posterior à data de início."); }
    try {
      await editarContrato(contrato.id, formContrato);
      setDialogState(prev => ({ ...prev, editarContrato: false }));
      await carregarDados();
    } catch (error: any) { setErro(error.message || "Erro ao editar contrato."); }
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
      if (error.response?.data?.dependencias) { setDependenciasContrato(error.response.data); } 
      else { setErro(error.response?.data?.message || "Erro ao remover contrato."); }
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}><CircularProgress size={60} /></Box>;
  
  if (erro && !contrato) return (
    <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>
            <Button variant="contained" onClick={carregarDados}>Tentar Novamente</Button>
        </CardContent></Card>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        
        {erro && <Alert severity="error" onClose={() => setErro("")} sx={{ mb: 3 }}>{erro}</Alert>}

        <PageHeader onBack={() => navigate('/contratos')} onEdit={abrirModalEditarContrato} onDelete={confirmarRemoverContrato} />

        <ContratoInfoCard contrato={contrato} fornecedor={fornecedor} valorTotal={valorTotalContrato} />

        {/* --- Seção de Itens do Contrato --- */}
        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="600">Itens do Contrato ({produtosContrato.length})</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => abrirModalProduto()} color="success">
                    Adicionar Item
                </Button>
            </Box>
            {produtosContrato.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <MenuBookIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhum item encontrado</Typography>
                    <Typography variant="body2" color="text.secondary">Adicione o primeiro item a este contrato.</Typography>
                </Box>
            ) : (
                <TableContainer>
                    <Table>
                        <TableHead><TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Produto</TableCell><TableCell sx={{ fontWeight: 600 }}>Quantidade</TableCell><TableCell sx={{ fontWeight: 600 }}>Preço Unitário</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Valor Total</TableCell><TableCell sx={{ fontWeight: 600 }}>Saldo</TableCell><TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                            {produtosContrato.map((produto) => {
                                const produtoInfo = produtosDisponiveis.find(p => p.id === produto.produto_id);
                                return (
                                <TableRow key={produto.id} hover>
                                    <TableCell>{produtoInfo?.nome || `Produto #${produto.produto_id}`}</TableCell>
                                    <TableCell>{produto.quantidade}</TableCell>
                                    <TableCell>{formatarMoeda(produto.preco_unitario)}</TableCell>
                                    <TableCell>{formatarMoeda(produto.valor_total)}</TableCell>
                                    <TableCell><Chip label={produto.saldo} color={produto.saldo > 0 ? "success" : "error"} size="small" variant="outlined"/></TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Editar Item"><IconButton size="small" onClick={() => abrirModalProduto(produto)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                        <Tooltip title="Remover Item"><IconButton size="small" onClick={() => confirmarRemoverProduto(produto.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>

        {/* --- MODAIS / DIALOGS --- */}
        <Dialog open={dialogState.produto} onClose={() => setDialogState(p => ({...p, produto: false}))} fullWidth maxWidth="sm">
            <DialogTitle>{editandoProduto ? "Editar Item" : "Adicionar Item ao Contrato"}</DialogTitle>
            <DialogContent dividers>
                <Autocomplete
                  value={produtoSelecionado}
                  onChange={(_, newValue) => {
                    setProdutoSelecionado(newValue);
                    setFormProduto({ ...formProduto, produto_id: newValue?.id || "" });
                  }}
                  options={produtosDisponiveis}
                  getOptionLabel={(option) => option.nome}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box>
                        <Typography variant="body2">{option.nome}</Typography>
                        {option.categoria && (
                          <Typography variant="caption" color="text.secondary">
                            {option.categoria}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Produto *"
                      placeholder="Digite para pesquisar..."
                      required
                    />
                  )}
                  noOptionsText="Nenhum produto encontrado"
                  fullWidth
                  sx={{ mt: 2, mb: 2 }}
                />
                <TextField label="Quantidade Contratada *" type="number" value={formProduto.quantidade} onChange={e => setFormProduto({ ...formProduto, quantidade: e.target.value })} fullWidth sx={{ mb: 2 }} required inputProps={{ min: 0 }} />
                <TextField label="Preço Unitário *" type="number" value={formProduto.preco_unitario} onChange={e => setFormProduto({ ...formProduto, preco_unitario: e.target.value })} fullWidth required inputProps={{ min: 0, step: 0.01 }} />
            </DialogContent>
            <DialogActions><Button onClick={() => setDialogState(p => ({...p, produto: false}))}>Cancelar</Button><Button onClick={salvarProduto} variant="contained">{editandoProduto ? "Salvar" : "Adicionar"}</Button></DialogActions>
        </Dialog>
        
        <Dialog open={dialogState.editarContrato} onClose={() => setDialogState(p => ({...p, editarContrato: false}))} fullWidth maxWidth="sm">
            <DialogTitle>Editar Contrato</DialogTitle>
            <DialogContent dividers>
                <TextField label="Número do Contrato" value={formContrato.numero} onChange={e => setFormContrato({ ...formContrato, numero: e.target.value })} fullWidth sx={{ mt: 2, mb: 2 }} required />
                <TextField label="Data de Início" type="date" value={formContrato.data_inicio} onChange={e => setFormContrato({ ...formContrato, data_inicio: e.target.value })} fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} required />
                <TextField label="Data de Fim" type="date" value={formContrato.data_fim} onChange={e => setFormContrato({ ...formContrato, data_fim: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} required />
            </DialogContent>
            <DialogActions><Button onClick={() => setDialogState(p => ({...p, editarContrato: false}))}>Cancelar</Button><Button onClick={salvarContratoEditado} variant="contained">Salvar Alterações</Button></DialogActions>
        </Dialog>
        
        <Dialog open={dialogState.removerProduto} onClose={() => setDialogState(p => ({...p, removerProduto: false}))}><DialogTitle>Remover Item do Contrato</DialogTitle><DialogContent><Typography>Tem certeza que deseja remover este item do contrato?</Typography></DialogContent><DialogActions><Button onClick={() => setDialogState(p => ({...p, removerProduto: false}))}>Cancelar</Button><Button onClick={removerProdutoConfirmado} color="error" variant="contained">Remover</Button></DialogActions></Dialog>
        
        <Dialog open={dialogState.removerContrato} onClose={() => setDialogState(p => ({...p, removerContrato: false}))} fullWidth maxWidth="sm">
            <DialogTitle>Remover Contrato</DialogTitle>
            <DialogContent>
                {!dependenciasContrato ? (<Typography>Tem certeza que deseja remover este contrato? Esta ação é irreversível.</Typography>) : (
                    <Alert severity="warning" icon={<ErrorOutlineIcon />}>
                        <AlertTitle>Não é possível remover este contrato diretamente</AlertTitle>
                        {dependenciasContrato.message}
                        <Box component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
                            {dependenciasContrato.dependencias.produtos > 0 && <li>{dependenciasContrato.dependencias.produtos} itens de contrato</li>}
                            {dependenciasContrato.dependencias.pedidos_itens > 0 && <li>{dependenciasContrato.dependencias.pedidos_itens} itens de pedidos</li>}
                            {dependenciasContrato.dependencias.movimentacoes > 0 && <li>{dependenciasContrato.dependencias.movimentacoes} movimentações de estoque</li>}
                        </Box>
                        <FormControlLabel control={<Checkbox checked={forceDelete} onChange={e => setForceDelete(e.target.checked)} color="error" />} label="Sim, entendo os riscos e desejo forçar a exclusão de tudo." sx={{ mt: 2 }} />
                    </Alert>
                )}
            </DialogContent>
            <DialogActions><Button onClick={() => setDialogState(p => ({...p, removerContrato: false}))}>Cancelar</Button><Button onClick={removerContratoConfirmado} color="error" variant="contained" disabled={dependenciasContrato && !forceDelete}>Remover</Button></DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}