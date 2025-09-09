import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import {
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import SearchIcon from "@mui/icons-material/Search";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
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
  produto?: Produto;
}

interface DraggableProductProps {
  produto: Produto;
  onAdd?: () => void;
  onRemove?: () => void;
  perCapita?: number;
  tipoMedida?: 'gramas' | 'unidades';
  onPerCapitaChange?: (value: number) => void;
  onTipoMedidaChange?: (value: 'gramas' | 'unidades') => void;
  isDragging?: boolean;
}

interface DroppableZoneProps {
  id: string;
  children: React.ReactNode;
}

function DroppableZone({ id, children }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        flex: 1,
        overflow: "auto",
        px: 2,
        pb: 2,
        minHeight: 200,
        border: "2px dashed",
        borderRadius: 2,
        mx: 2,
        mb: 2,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        backgroundColor: isOver ? "rgba(25, 118, 210, 0.08)" : "transparent",
        borderColor: isOver ? "#1976d2" : "#e0e0e0",
        transform: isOver ? "scale(1.02)" : "scale(1)",
        boxShadow: isOver ? "0 4px 20px rgba(25, 118, 210, 0.15)" : "none",
        '&::before': isOver ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(45deg, rgba(25, 118, 210, 0.05) 25%, transparent 25%, transparent 75%, rgba(25, 118, 210, 0.05) 75%)',
          backgroundSize: '20px 20px',
          borderRadius: 2,
          pointerEvents: 'none',
        } : {},
      }}
    >
      {children}
    </Box>
  );
}

function DraggableProduct({
  produto,
  onAdd,
  onRemove,
  perCapita,
  tipoMedida = 'gramas',
  onPerCapitaChange,
  onTipoMedidaChange,
  isDragging,
}: DraggableProductProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({ id: produto.id });

  const [localPerCapita, setLocalPerCapita] = useState(perCapita ? String(perCapita) : "");
  const [localTipoMedida, setLocalTipoMedida] = useState(tipoMedida);

  useEffect(() => {
    // Debug: verificar o valor recebido
    console.log('perCapita recebido:', perCapita, typeof perCapita);
    // Garantir que o valor não seja formatado automaticamente
    setLocalPerCapita(perCapita ? String(perCapita) : "");
  }, [perCapita]);

  useEffect(() => {
    setLocalTipoMedida(tipoMedida);
  }, [tipoMedida]);

  const handlePerCapitaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('handlePerCapitaChange - valor digitado:', value, typeof value);
    setLocalPerCapita(value);
  };

  const handlePerCapitaBlur = () => {
    console.log('handlePerCapitaBlur - localPerCapita antes:', localPerCapita, typeof localPerCapita);
    let numericValue = parseFloat(localPerCapita);
    console.log('handlePerCapitaBlur - numericValue:', numericValue, typeof numericValue);

    if (isNaN(numericValue)) {
      numericValue = 0;
      setLocalPerCapita("0");
    }
    
    // Limites diferentes para gramas e unidades
    const limite = localTipoMedida === 'unidades' ? 100 : 1000;
    numericValue = Math.max(0, Math.min(limite, numericValue));
    console.log('handlePerCapitaBlur - valor final enviado:', numericValue);

    onPerCapitaChange?.(numericValue);
  };

  const handleTipoMedidaChange = (event: any) => {
    const novoTipo = event.target.value as 'gramas' | 'unidades';
    setLocalTipoMedida(novoTipo);
    onTipoMedidaChange?.(novoTipo);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    scale: isDragging ? 1.05 : 1,
    transition: isDragging ? 'none' : 'all 0.2s ease',
    zIndex: isDragging ? 1000 : 1,
    boxShadow: isDragging ? '0 8px 25px rgba(0,0,0,0.15)' : 'none',
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        border: "1px solid #e0e0e0",
        borderRadius: 1,
        mb: 1,
        backgroundColor: "white",
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
      }}
    >
      <Box sx={{ mr: 1, display: "flex", alignItems: "center" }}>
        <DragIndicatorIcon color="action" />
      </Box>
      <ListItemText
        primary={produto.nome}
        secondary={produto.descricao}
      />
      {perCapita !== undefined && (
        <Box sx={{ mx: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            size="small"
            type="number"
            value={localPerCapita}
            onChange={handlePerCapitaChange}
            onBlur={handlePerCapitaBlur}
            sx={{ width: 80 }}
            placeholder="0"
            inputProps={{ 
              min: 0,
              max: localTipoMedida === 'unidades' ? 100 : 1000,
              step: localTipoMedida === 'unidades' ? 1 : 0.1
            }}
          />
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={localTipoMedida}
              onChange={handleTipoMedidaChange}
              displayEmpty
            >
              <MenuItem value="gramas">g</MenuItem>
              <MenuItem value="unidades">un</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
      <ListItemSecondaryAction>
        {onAdd && (
          <IconButton color="primary" onClick={onAdd}>
            <AddIcon />
          </IconButton>
        )}
        {onRemove && (
          <IconButton color="error" onClick={onRemove}>
            <RemoveIcon />
          </IconButton>
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default function RefeicaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [refeicao, setRefeicao] = useState<any>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [associacoes, setAssociacoes] = useState<RefeicaoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<any>({});
  const [salvando, setSalvando] = useState(false);
  const [openExcluir, setOpenExcluir] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [filtroDisponiveis, setFiltroDisponiveis] = useState("");
  const [filtroAdicionados, setFiltroAdicionados] = useState("");

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
          setErro("Refeição não encontrada");
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
        setErro("Erro ao carregar refeição. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const produtosDisponiveis = produtos
    .filter((produto) => !associacoes.some((assoc) => assoc.produto_id === produto.id))
    .filter((produto) => 
      produto.nome.toLowerCase().includes(filtroDisponiveis.toLowerCase())
    );

  const produtosAdicionados = associacoes
    .map((assoc) => ({
      ...assoc,
      produto: produtos.find((p) => p.id === assoc.produto_id),
    }))
    .filter((assoc) => assoc.produto)
    .filter((assoc) => 
      assoc.produto!.nome.toLowerCase().includes(filtroAdicionados.toLowerCase())
    );

  async function salvarEdicao() {
    setSalvando(true);
    try {
      const atualizado = await editarRefeicao(Number(id), form);
      setRefeicao(atualizado);
      setEditando(false);
    } catch {
      setErro("Erro ao salvar alterações");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirRefeicao() {
    try {
      await deletarRefeicao(Number(id));
      navigate("/refeicoes");
    } catch {
      setErro("Erro ao excluir refeição");
    }
  }

  async function adicionarProduto(produtoId: number) {
    try {
      await adicionarProdutoNaRefeicao(Number(id), produtoId, 100); // 100g padrão
      const novasAssociacoes = await listarProdutosDaRefeicao(Number(id));
      setAssociacoes(novasAssociacoes);
    } catch {
      setErro("Erro ao adicionar produto na refeição");
    }
  }

  async function removerProduto(assocId: number) {
    try {
      await removerProdutoDaRefeicao(assocId);
      const novasAssociacoes = await listarProdutosDaRefeicao(Number(id));
      setAssociacoes(novasAssociacoes);
    } catch {
      setErro("Erro ao remover produto da refeição");
    }
  }

  async function atualizarPerCapita(assocId: number, perCapita: number, tipoMedida?: 'gramas' | 'unidades') {
    try {
      await editarProdutoNaRefeicao(assocId, perCapita, tipoMedida);
      const novasAssociacoes = await listarProdutosDaRefeicao(Number(id));
      setAssociacoes(novasAssociacoes);
    } catch {
      setErro("Erro ao atualizar per capita");
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
      setErro("Erro ao atualizar tipo de medida");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
    document.body.style.overflow = 'hidden';
  }

  async function handleDragEnd(event: DragEndEvent) {
    document.body.style.overflow = 'auto';
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeProductId = active.id as number;
    const overContainer = over.id as string;

    // Se arrastar de disponíveis para adicionados
    if (overContainer === "adicionados") {
      const produto = produtos.find((p) => p.id === activeProductId);
      if (produto && !associacoes.some((a) => a.produto_id === produto.id)) {
        await adicionarProduto(activeProductId);
      }
    }

    // Se arrastar de adicionados para disponíveis
    if (overContainer === "disponiveis") {
      const assoc = associacoes.find((a) => a.produto_id === activeProductId);
      if (assoc) {
        await removerProduto(assoc.id);
      }
    }
  }

  if (loading) return <CircularProgress sx={{ mt: 4 }} />;
  if (erro) return <Alert severity="error">{erro}</Alert>;
  if (!refeicao) return null;

  const activeProduto = activeId
    ? produtos.find((p) => p.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box maxWidth={1200} mx="auto" mt={4} px={2}>
        <Button
          onClick={() => navigate("/refeicoes")}
          variant="outlined"
          sx={{ mb: 3 }}
        >
          Voltar para lista
        </Button>

        {/* Card Superior - Informações Básicas */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              {refeicao.nome}
            </Typography>
            {editando ? (
              <Box>
                <TextField
                  label="Nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  fullWidth
                  margin="normal"
                  required
                />
                <TextField
                  label="Descrição"
                  value={form.descricao}
                  onChange={(e) =>
                    setForm({ ...form, descricao: e.target.value })
                  }
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!form.ativo}
                      onChange={(e) =>
                        setForm({ ...form, ativo: e.target.checked })
                      }
                    />
                  }
                  label="Ativa"
                  sx={{ mt: 2 }}
                />
              </Box>
            ) : (
              <Box>
                <Typography variant="body1" paragraph>
                  {refeicao.descricao}
                </Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Chip
                    label={refeicao.ativo ? "Ativa" : "Inativa"}
                    color={refeicao.ativo ? "success" : "default"}
                    variant="outlined"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Criada em: {new Date(refeicao.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            )}
          </CardContent>
          <CardActions>
            {editando ? (
              <Box>
                <Button onClick={() => setEditando(false)} sx={{ mr: 1 }}>
                  Cancelar
                </Button>
                <Button
                  onClick={salvarEdicao}
                  variant="contained"
                  disabled={salvando}
                >
                  Salvar
                </Button>
              </Box>
            ) : (
              <Box>
                <Button
                  onClick={() => setEditando(true)}
                  variant="outlined"
                  startIcon={<EditIcon />}
                  sx={{ mr: 1 }}
                >
                  Editar
                </Button>
                <Button
                  onClick={() => setOpenExcluir(true)}
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                >
                  Excluir
                </Button>
              </Box>
            )}
          </CardActions>
        </Card>

        {/* Cards de Produtos */}
        <Grid container spacing={3}>
          {/* Card Produtos Disponíveis */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "600px", display: "flex", flexDirection: "column" }}>
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Produtos Disponíveis
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Arraste os produtos para adicionar à refeição
                </Typography>
                <TextField
                  size="small"
                  placeholder="Buscar produtos disponíveis..."
                  value={filtroDisponiveis}
                  onChange={(e) => setFiltroDisponiveis(e.target.value)}
                  sx={{ mb: 2, width: '100%' }}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                        <SearchIcon color="action" />
                      </Box>
                    ),
                  }}
                />
                <Divider />
              </CardContent>
              <DroppableZone id="disponiveis">
                <List>
                  {produtosDisponiveis.map((produto) => (
                    <DraggableProduct
                      key={produto.id}
                      produto={produto}
                      onAdd={() => adicionarProduto(produto.id)}
                      isDragging={activeId === produto.id}
                    />
                  ))}
                </List>
                {produtosDisponiveis.length === 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "text.secondary",
                    }}
                  >
                    <Typography>Todos os produtos foram adicionados</Typography>
                  </Box>
                )}
              </DroppableZone>
            </Card>
          </Grid>

          {/* Card Produtos Adicionados */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "600px", display: "flex", flexDirection: "column" }}>
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Produtos da Refeição
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Arraste para remover ou ajuste a quantidade per capita
                </Typography>
                <TextField
                  size="small"
                  placeholder="Buscar produtos da refeição..."
                  value={filtroAdicionados}
                  onChange={(e) => setFiltroAdicionados(e.target.value)}
                  sx={{ mb: 2, width: '100%' }}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                        <SearchIcon color="action" />
                      </Box>
                    ),
                  }}
                />
                <Divider />
              </CardContent>
              <DroppableZone id="adicionados">
                <List>
                  {produtosAdicionados.map((assoc) => (
                    <DraggableProduct
                      key={assoc.produto_id}
                      produto={assoc.produto!}
                      perCapita={assoc.per_capita}
                      tipoMedida={assoc.tipo_medida}
                      onPerCapitaChange={(value) => atualizarPerCapita(assoc.id, value)}
                      onTipoMedidaChange={(value) => atualizarTipoMedida(assoc.id, value)}
                      onRemove={() => removerProduto(assoc.id)}
                      isDragging={activeId === assoc.produto_id}
                    />
                  ))}
                </List>
                {produtosAdicionados.length === 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "text.secondary",
                    }}
                  >
                    <Typography>Nenhum produto adicionado</Typography>
                  </Box>
                )}
              </DroppableZone>
            </Card>
          </Grid>
        </Grid>

        {/* Modal de confirmação de exclusão */}
        <Dialog open={openExcluir} onClose={() => setOpenExcluir(false)}>
          <DialogTitle>Excluir Refeição</DialogTitle>
          <DialogContent>
            Tem certeza que deseja excluir esta refeição?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenExcluir(false)}>Cancelar</Button>
            <Button onClick={excluirRefeicao} color="error" variant="contained">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        <DragOverlay dropAnimation={null}>
          {activeProduto ? (
            <Paper
              sx={{
                p: 2,
                backgroundColor: "primary.main",
                color: "primary.contrastText",
                borderRadius: 2,
                boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                transform: 'rotate(3deg)',
                cursor: 'grabbing',
                minWidth: 200,
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              <Typography fontWeight="bold">{activeProduto.nome}</Typography>
              {activeProduto.descricao && (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {activeProduto.descricao}
                </Typography>
              )}
            </Paper>
          ) : null}
        </DragOverlay>
      </Box>
    </DndContext>
  );
}
