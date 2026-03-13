import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import CompactPagination from '../components/CompactPagination';
import {
  buscarRefeicao,
  editarRefeicao,
  deletarRefeicao,
  listarProdutosDaRefeicao,
  adicionarProdutoNaRefeicao,
  editarProdutoNaRefeicao,
  removerProdutoDaRefeicao,
} from "../services/refeicoes";
import { listarProdutos } from "../services/produtos";
import { useToast } from "../hooks/useToast";
import {
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Box,
  Card,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Autocomplete,
  Tabs,
  Tab,
  Grid,
  Divider,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Restaurant as RestaurantIcon,
  DragIndicator as DragIndicatorIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Description as DescriptionIcon,
  Timer as TimerIcon,
  LocalDining as LocalDiningIcon,
} from "@mui/icons-material";
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import PageContainer from '../components/PageContainer';
import StatusIndicator from '../components/StatusIndicator';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
}

interface RefeicaoProduto {
  id: number;
  produto_id: number;
  per_capita: number;
  tipo_medida: 'gramas' | 'unidades';
  ordem?: number;
  produto?: Produto;
}

interface SortableRowProps {
  assoc: RefeicaoProduto;
  onRemove: () => void;
  onPerCapitaChange: (value: number) => void;
  onTipoMedidaChange: (value: 'gramas' | 'unidades') => void;
}

function SortableRow({ assoc, onRemove, onPerCapitaChange, onTipoMedidaChange }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assoc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [localPerCapita, setLocalPerCapita] = useState(String(assoc.per_capita || ''));

  useEffect(() => {
    // Formatar para remover zeros desnecessários
    const formatted = assoc.per_capita ? parseFloat(String(assoc.per_capita)).toString() : '';
    setLocalPerCapita(formatted);
  }, [assoc.per_capita]);

  const handlePerCapitaBlur = () => {
    let numericValue = parseFloat(localPerCapita);
    if (isNaN(numericValue)) {
      numericValue = 0;
    }
    const limite = assoc.tipo_medida === 'unidades' ? 100 : 1000;
    numericValue = Math.max(0, Math.min(limite, numericValue));
    
    // Formatar para remover zeros desnecessários (ex: 100.0 vira 100, mas 100.5 fica 100.5)
    const formatted = parseFloat(numericValue.toString()).toString();
    setLocalPerCapita(formatted);
    onPerCapitaChange(numericValue);
  };

  return (
    <TableRow ref={setNodeRef} style={style} hover>
      <TableCell sx={{ width: 50, cursor: 'grab' }} {...attributes} {...listeners}>
        <DragIndicatorIcon color="action" />
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {assoc.produto?.nome}
        </Typography>
      </TableCell>
      <TableCell align="center" sx={{ width: 150 }}>
        <TextField
          size="small"
          type="number"
          value={localPerCapita}
          onChange={(e) => setLocalPerCapita(e.target.value)}
          onBlur={handlePerCapitaBlur}
          sx={{ width: 100 }}
          inputProps={{
            min: 0,
            max: assoc.tipo_medida === 'unidades' ? 100 : 1000,
            step: assoc.tipo_medida === 'unidades' ? 1 : 0.1
          }}
        />
      </TableCell>
      <TableCell align="center" sx={{ width: 120 }}>
        <FormControl size="small" fullWidth>
          <Select
            value={assoc.tipo_medida}
            onChange={(e) => onTipoMedidaChange(e.target.value as 'gramas' | 'unidades')}
          >
            <MenuItem value="gramas">Gramas</MenuItem>
            <MenuItem value="unidades">Unidades</MenuItem>
          </Select>
        </FormControl>
      </TableCell>
      <TableCell align="center" sx={{ width: 100 }}>
        <Tooltip title="Remover">
          <IconButton size="small" color="error" onClick={onRemove}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

export default function RefeicaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [refeicao, setRefeicao] = useState<any>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [associacoes, setAssociacoes] = useState<RefeicaoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<any>({});
  const [salvando, setSalvando] = useState(false);
  const [openExcluir, setOpenExcluir] = useState(false);
  const [tabAtiva, setTabAtiva] = useState(0); // 0 = Ingredientes, 1 = Ficha Técnica
  
  // Autocomplete
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  
  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const ref = await buscarRefeicao(Number(id));
        if (!ref) {
          toast.error('Erro', 'Refeição não encontrada');
          navigate('/refeicoes');
          return;
        }
        setRefeicao(ref);
        setForm(ref);
        const [produtosData, associacoesData] = await Promise.all([
          listarProdutos(),
          listarProdutosDaRefeicao(Number(id)),
        ]);
        setProdutos(produtosData);
        setAssociacoes(associacoesData);
      } catch (error) {
        console.error("Erro ao buscar refeição:", error);
        toast.error('Erro ao carregar', 'Não foi possível carregar a refeição. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const produtosDisponiveis = produtos.filter(
    (produto) => !associacoes.some((assoc) => assoc.produto_id === produto.id)
  );

  async function salvarEdicao() {
    setSalvando(true);
    try {
      const atualizado = await editarRefeicao(Number(id), form);
      setRefeicao(atualizado);
      setEditando(false);
      toast.success('Sucesso!', 'Refeição atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['refeicoes'] });
    } catch {
      toast.error('Erro ao salvar', 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluirRefeicao() {
    try {
      await deletarRefeicao(Number(id));
      toast.success('Sucesso!', 'Refeição excluída com sucesso!');
      navigate("/refeicoes");
    } catch {
      toast.error('Erro ao excluir', 'Não foi possível excluir a refeição.');
    }
  }

  async function adicionarProduto() {
    if (!selectedProduto) return;
    
    try {
      await adicionarProdutoNaRefeicao(Number(id), selectedProduto.id, 100);
      const novasAssociacoes = await listarProdutosDaRefeicao(Number(id));
      setAssociacoes(novasAssociacoes);
      setSelectedProduto(null);
      toast.success('Sucesso!', 'Produto adicionado à refeição!');
    } catch {
      toast.error('Erro ao adicionar', 'Não foi possível adicionar o produto.');
    }
  }

  async function removerProduto(assocId: number) {
    try {
      await removerProdutoDaRefeicao(assocId);
      const novasAssociacoes = await listarProdutosDaRefeicao(Number(id));
      setAssociacoes(novasAssociacoes);
      toast.success('Sucesso!', 'Produto removido da refeição!');
    } catch {
      toast.error('Erro ao remover', 'Não foi possível remover o produto.');
    }
  }

  async function atualizarPerCapita(assocId: number, perCapita: number) {
    try {
      const assoc = associacoes.find(a => a.id === assocId);
      if (assoc) {
        await editarProdutoNaRefeicao(assocId, perCapita, assoc.tipo_medida);
        const novasAssociacoes = await listarProdutosDaRefeicao(Number(id));
        setAssociacoes(novasAssociacoes);
      }
    } catch {
      toast.error('Erro ao atualizar', 'Não foi possível atualizar o per capita.');
    }
  }

  async function atualizarTipoMedida(assocId: number, tipoMedida: 'gramas' | 'unidades') {
    try {
      const assoc = associacoes.find(a => a.id === assocId);
      if (assoc) {
        await editarProdutoNaRefeicao(assocId, assoc.per_capita, tipoMedida);
        const novasAssociacoes = await listarProdutosDaRefeicao(Number(id));
        setAssociacoes(novasAssociacoes);
      }
    } catch {
      toast.error('Erro ao atualizar', 'Não foi possível atualizar o tipo de medida.');
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setAssociacoes((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  const paginatedAssociacoes = associacoes.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!refeicao) return null;

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      <PageContainer fullHeight>
        <PageBreadcrumbs 
          items={[
            { label: 'Refeições', path: '/refeicoes', icon: <RestaurantIcon fontSize="small" /> },
            { label: refeicao?.nome || 'Detalhes da Refeição' }
          ]}
        />

        {/* Informações da Refeição */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            {editando ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  size="small"
                  required
                />
                <TextField
                  label="Descrição"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  size="small"
                  multiline
                  rows={2}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!form.ativo}
                      onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                    />
                  }
                  label="Ativa"
                />
              </Box>
            ) : (
              <>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {refeicao.nome}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {refeicao.descricao}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <StatusIndicator status={refeicao.ativo ? 'ativo' : 'inativo'} size="small" />
                  <Typography variant="body2" color="text.secondary">
                    {refeicao.ativo ? 'Ativa' : 'Inativa'}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {editando ? (
              <>
                <Button
                  onClick={() => setEditando(false)}
                  startIcon={<CancelIcon />}
                  size="small"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={salvarEdicao}
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={salvando}
                  size="small"
                >
                  Salvar
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setEditando(true)}
                  variant="outlined"
                  startIcon={<EditIcon />}
                  size="small"
                >
                  Editar
                </Button>
                <Button
                  onClick={() => setOpenExcluir(true)}
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                  size="small"
                >
                  Excluir
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabAtiva} onChange={(e, newValue) => setTabAtiva(newValue)}>
            <Tab label="Ingredientes" icon={<RestaurantIcon />} iconPosition="start" />
            <Tab label="Ficha Técnica" icon={<DescriptionIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab 0: Ingredientes */}
        {tabAtiva === 0 && (
          <>
            {/* Adicionar Produto */}
            <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Autocomplete
                  options={produtosDisponiveis}
                  getOptionLabel={(option) => option.nome}
                  value={selectedProduto}
                  onChange={(_, newValue) => setSelectedProduto(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Selecione um produto"
                      placeholder="Digite para buscar..."
                      size="small"
                    />
                  )}
                  sx={{ flex: 1 }}
                  noOptionsText="Nenhum produto disponível"
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={adicionarProduto}
                  disabled={!selectedProduto}
                  size="small"
                  sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, whiteSpace: 'nowrap' }}
                >
                  Adicionar
                </Button>
              </Box>
            </Card>

            {/* Tabela de Produtos */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, px: 1 }}>
              <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
                Exibindo {associacoes.length} {associacoes.length === 1 ? 'produto' : 'produtos'}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {associacoes.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <RestaurantIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Nenhum produto adicionado
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Use o campo acima para adicionar produtos à refeição
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 50 }}></TableCell>
                            <TableCell>Produto</TableCell>
                            <TableCell align="center" sx={{ width: 150 }}>Per Capita</TableCell>
                            <TableCell align="center" sx={{ width: 120 }}>Unidade</TableCell>
                            <TableCell align="center" sx={{ width: 100 }}>Ações</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <SortableContext
                            items={paginatedAssociacoes.map(a => a.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {paginatedAssociacoes.map((assoc) => (
                              <SortableRow
                                key={assoc.id}
                                assoc={assoc}
                                onRemove={() => removerProduto(assoc.id)}
                                onPerCapitaChange={(value) => atualizarPerCapita(assoc.id, value)}
                                onTipoMedidaChange={(value) => atualizarTipoMedida(assoc.id, value)}
                              />
                            ))}
                          </SortableContext>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </DndContext>
                  <CompactPagination
                    count={associacoes.length}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                  />
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Tab 1: Ficha Técnica */}
        {tabAtiva === 1 && (
          <Card sx={{ borderRadius: '12px', p: 3 }}>
            {editando ? (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Informações Gerais
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Categoria</InputLabel>
                    <Select
                      value={form.categoria || ''}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      label="Categoria"
                    >
                      <MenuItem value="Prato Principal">Prato Principal</MenuItem>
                      <MenuItem value="Acompanhamento">Acompanhamento</MenuItem>
                      <MenuItem value="Sobremesa">Sobremesa</MenuItem>
                      <MenuItem value="Lanche">Lanche</MenuItem>
                      <MenuItem value="Bebida">Bebida</MenuItem>
                      <MenuItem value="Salada">Salada</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    label="Tempo de Preparo (min)"
                    type="number"
                    fullWidth
                    size="small"
                    value={form.tempo_preparo_minutos || ''}
                    onChange={(e) => setForm({ ...form, tempo_preparo_minutos: e.target.value })}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    label="Rendimento (porções)"
                    type="number"
                    fullWidth
                    size="small"
                    value={form.rendimento_porcoes || ''}
                    onChange={(e) => setForm({ ...form, rendimento_porcoes: e.target.value })}
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Modo de Preparo"
                    fullWidth
                    multiline
                    rows={6}
                    size="small"
                    value={form.modo_preparo || ''}
                    onChange={(e) => setForm({ ...form, modo_preparo: e.target.value })}
                    placeholder="Descreva o passo a passo do preparo..."
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Utensílios Necessários"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={form.utensílios || ''}
                    onChange={(e) => setForm({ ...form, utensílios: e.target.value })}
                    placeholder="Ex: Panela grande, colher de pau, escorredor..."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
                    Informação Nutricional (por porção)
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Calorias (kcal)"
                    type="number"
                    fullWidth
                    size="small"
                    value={form.calorias_por_porcao || ''}
                    onChange={(e) => setForm({ ...form, calorias_por_porcao: e.target.value })}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Proteínas (g)"
                    type="number"
                    fullWidth
                    size="small"
                    value={form.proteinas_g || ''}
                    onChange={(e) => setForm({ ...form, proteinas_g: e.target.value })}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Carboidratos (g)"
                    type="number"
                    fullWidth
                    size="small"
                    value={form.carboidratos_g || ''}
                    onChange={(e) => setForm({ ...form, carboidratos_g: e.target.value })}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Lipídios/Gorduras (g)"
                    type="number"
                    fullWidth
                    size="small"
                    value={form.lipidios_g || ''}
                    onChange={(e) => setForm({ ...form, lipidios_g: e.target.value })}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Fibras (g)"
                    type="number"
                    fullWidth
                    size="small"
                    value={form.fibras_g || ''}
                    onChange={(e) => setForm({ ...form, fibras_g: e.target.value })}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Sódio (mg)"
                    type="number"
                    fullWidth
                    size="small"
                    value={form.sodio_mg || ''}
                    onChange={(e) => setForm({ ...form, sodio_mg: e.target.value })}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
                    Custo e Observações
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Custo por Porção (R$)"
                    type="number"
                    fullWidth
                    size="small"
                    value={form.custo_por_porcao || ''}
                    onChange={(e) => setForm({ ...form, custo_por_porcao: e.target.value })}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Observações Técnicas"
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    value={form.observacoes_tecnicas || ''}
                    onChange={(e) => setForm({ ...form, observacoes_tecnicas: e.target.value })}
                    placeholder="Observações do nutricionista sobre a preparação..."
                  />
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Informações Gerais
                  </Typography>
                </Grid>

                {refeicao.categoria && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Categoria</Typography>
                    <Chip label={refeicao.categoria} size="small" color="primary" sx={{ mt: 0.5 }} />
                  </Grid>
                )}

                {refeicao.tempo_preparo_minutos && (
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Tempo de Preparo</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <TimerIcon fontSize="small" color="action" />
                      <Typography variant="body1">{refeicao.tempo_preparo_minutos} minutos</Typography>
                    </Box>
                  </Grid>
                )}

                {refeicao.rendimento_porcoes && (
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Rendimento</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <LocalDiningIcon fontSize="small" color="action" />
                      <Typography variant="body1">{refeicao.rendimento_porcoes} porções</Typography>
                    </Box>
                  </Grid>
                )}

                {refeicao.modo_preparo && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Modo de Preparo</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                      {refeicao.modo_preparo}
                    </Typography>
                  </Grid>
                )}

                {refeicao.utensílios && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Utensílios Necessários</Typography>
                    <Typography variant="body1">{refeicao.utensílios}</Typography>
                  </Grid>
                )}

                {(refeicao.calorias_por_porcao || refeicao.proteinas_g || refeicao.carboidratos_g) && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="h6" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
                        Informação Nutricional (por porção)
                      </Typography>
                    </Grid>

                    {refeicao.calorias_por_porcao && (
                      <Grid item xs={6} md={2}>
                        <Typography variant="body2" color="text.secondary">Calorias</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{refeicao.calorias_por_porcao} kcal</Typography>
                      </Grid>
                    )}

                    {refeicao.proteinas_g && (
                      <Grid item xs={6} md={2}>
                        <Typography variant="body2" color="text.secondary">Proteínas</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{refeicao.proteinas_g}g</Typography>
                      </Grid>
                    )}

                    {refeicao.carboidratos_g && (
                      <Grid item xs={6} md={2}>
                        <Typography variant="body2" color="text.secondary">Carboidratos</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{refeicao.carboidratos_g}g</Typography>
                      </Grid>
                    )}

                    {refeicao.lipidios_g && (
                      <Grid item xs={6} md={2}>
                        <Typography variant="body2" color="text.secondary">Lipídios</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{refeicao.lipidios_g}g</Typography>
                      </Grid>
                    )}

                    {refeicao.fibras_g && (
                      <Grid item xs={6} md={2}>
                        <Typography variant="body2" color="text.secondary">Fibras</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{refeicao.fibras_g}g</Typography>
                      </Grid>
                    )}

                    {refeicao.sodio_mg && (
                      <Grid item xs={6} md={2}>
                        <Typography variant="body2" color="text.secondary">Sódio</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{refeicao.sodio_mg}mg</Typography>
                      </Grid>
                    )}
                  </>
                )}

                {(refeicao.custo_por_porcao || refeicao.observacoes_tecnicas) && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="h6" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
                        Custo e Observações
                      </Typography>
                    </Grid>

                    {refeicao.custo_por_porcao && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Custo por Porção</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                          R$ {parseFloat(refeicao.custo_por_porcao).toFixed(2)}
                        </Typography>
                      </Grid>
                    )}

                    {refeicao.observacoes_tecnicas && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Observações Técnicas</Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                          {refeicao.observacoes_tecnicas}
                        </Typography>
                      </Grid>
                    )}
                  </>
                )}

                {!refeicao.categoria && !refeicao.modo_preparo && !refeicao.calorias_por_porcao && (
                  <Grid item xs={12}>
                    <Box textAlign="center" py={6}>
                      <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        Ficha técnica não preenchida
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Clique em "Editar" para adicionar informações da ficha técnica
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </Card>
        )}
      </PageContainer>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={openExcluir} onClose={() => setOpenExcluir(false)}>
        <DialogTitle>Excluir Refeição</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir esta refeição? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExcluir(false)}>Cancelar</Button>
          <Button onClick={excluirRefeicao} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
