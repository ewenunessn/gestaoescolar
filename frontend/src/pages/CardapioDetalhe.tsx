import React, { startTransition } from "react";
import { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  Link as RouterLink,
} from "react-router-dom";
import {
  buscarCardapio,
  criarCardapio,
  editarCardapio,
  deletarCardapio,
  listarCardapioRefeicoes,
  adicionarCardapioRefeicao,
  atualizarCardapioRefeicao,
  deletarCardapioRefeicao,
  calcularNecessidades,
  calcularCustoRefeicoes,
} from "../services/cardapios";
import { listarRefeicoes } from "../services/refeicoes";
import { formatDateForInput } from "../utils/dateUtils";
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
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
  Avatar,
  Stack,
  LinearProgress,
  Fade,
  Grow,
  Container,
  CardActionArea,
  Tooltip,
  Badge,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  CardActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import SchoolIcon from "@mui/icons-material/School";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import RemoveIcon from "@mui/icons-material/Remove";
import SearchIcon from "@mui/icons-material/Search";
import { listarModalidades } from "../services/modalidades";
import { useSafeData } from "../hooks/useSafeData";
import DownloadIcon from "@mui/icons-material/Download";
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

interface Refeicao {
  id: number;
  nome: string;
  descricao?: string;
  tipo: string;
  ativo: boolean;
}

interface CardapioRefeicao {
  id: number;
  refeicao_id: number;
  modalidade_id: number;
  frequencia_mensal: number;
  refeicao?: Refeicao;
}

interface DraggableRefeicaoProps {
  refeicao: Refeicao;
  onAdd?: () => void;
  onRemove?: () => void;
  frequencia?: number;
  onFrequenciaChange?: (value: number) => void;
  isDragging?: boolean;
  custoTotal?: number;
  onCustoClick?: () => void;
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

function DraggableRefeicao({
  refeicao,
  onAdd,
  onRemove,
  frequencia,
  onFrequenciaChange,
  isDragging,
  custoTotal,
  onCustoClick,
}: DraggableRefeicaoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({ id: refeicao.id });

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
        mb: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'grey.300',
        bgcolor: 'background.paper',
        cursor: 'grab',
        '&:hover': {
          bgcolor: 'grey.50',
          borderColor: 'primary.main',
        },
        '&:active': {
          cursor: 'grabbing',
        },
      }}
    >
      <DragIndicatorIcon sx={{ mr: 1, color: 'grey.400' }} />
      <ListItemText
        primary={refeicao.nome}
        secondary={
          <Box>
            {refeicao.descricao && (
              <Typography variant="body2" color="text.secondary">
                {refeicao.descricao}
              </Typography>
            )}
            {custoTotal !== undefined && (
              <Typography 
                variant="caption" 
                color="primary" 
                sx={{ 
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  '&:hover': {
                    opacity: 0.8
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onCustoClick?.();
                }}
              >
                Custo Total: R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            )}
          </Box>
        }
        primaryTypographyProps={{ fontWeight: 'medium' }}
      />
      {frequencia !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            type="number"
            value={frequencia}
            onChange={(e) => onFrequenciaChange?.(Number(e.target.value))}
            sx={{ width: 80 }}
            inputProps={{ min: 1, max: 31 }}
            onClick={(e) => e.stopPropagation()}
          />
          <Typography variant="caption">x/mês</Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            color="error"
          >
            <RemoveIcon />
          </IconButton>
        </Box>
      )}
      {onAdd && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          color="primary"
        >
          <AddIcon />
        </IconButton>
      )}
    </ListItem>
  );
}

export default function CardapioDetalhe() {
  const { id } = useParams();
  const location = useLocation();
  const isNovo = location.pathname.endsWith("/novo");
  const navigate = useNavigate();
  const { safeString, safeDate } = useSafeData();
  
  // Estados principais
  const [cardapio, setCardapio] = useState<any>(isNovo ? {} : null);
  const [loading, setLoading] = useState(!isNovo);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [editando, setEditando] = useState(isNovo);
  const [salvando, setSalvando] = useState(false);
  const [openExcluir, setOpenExcluir] = useState(false);
  
  // Estados do formulário
  const [form, setForm] = useState<any>(
    isNovo
      ? {
          nome: "",
          descricao: "",
          periodo_dias: "",
          data_inicio: "",
          data_fim: "",
          modalidade_id: "",
          ativo: true,
        }
      : {}
  );
  
  // Estados das refeições
  const [refeicoesDisponiveis, setRefeicoesDisponiveis] = useState<Refeicao[]>([]);
  const [refeicoesAdicionadas, setRefeicoesAdicionadas] = useState<CardapioRefeicao[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [custosRefeicoes, setCustosRefeicoes] = useState<any[]>([]);
  const [modalDetalheCusto, setModalDetalheCusto] = useState<any>(null);
  
  // Estados de filtros
  const [filtroDisponiveis, setFiltroDisponiveis] = useState("");
  const [filtroAdicionadas, setFiltroAdicionadas] = useState("");
  
  // Estados do drag and drop
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeRefeicao, setActiveRefeicao] = useState<Refeicao | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Funções auxiliares
  const formatarData = (data: string) => {
    if (!data) return "";
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const calcularDiasRestantes = (dataFim: string) => {
    if (!dataFim) return 0;
    const hoje = new Date();
    const fim = new Date(dataFim);
    const diffTime = fim.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calcularProgresso = (dataInicio: string, dataFim: string) => {
    if (!dataInicio || !dataFim) return 0;
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const hoje = new Date();
    
    if (hoje < inicio) return 0;
    if (hoje > fim) return 100;
    
    const totalDias = fim.getTime() - inicio.getTime();
    const diasDecorridos = hoje.getTime() - inicio.getTime();
    return (diasDecorridos / totalDias) * 100;
  };

  // Filtros
  const refeicoesDisponiveisFiltradas = refeicoesDisponiveis.filter((refeicao) =>
    refeicao.nome.toLowerCase().includes(filtroDisponiveis.toLowerCase()) ||
    (refeicao.descricao && refeicao.descricao.toLowerCase().includes(filtroDisponiveis.toLowerCase()))
  );

  const refeicoesAdicionadasFiltradas = refeicoesAdicionadas.filter((assoc) =>
    assoc.refeicao?.nome.toLowerCase().includes(filtroAdicionadas.toLowerCase()) ||
    (assoc.refeicao?.descricao && assoc.refeicao.descricao.toLowerCase().includes(filtroAdicionadas.toLowerCase()))
  );

  // Carregar dados iniciais
  useEffect(() => {
    async function fetchModalidades() {
      try {
        const modalidadesData = await listarModalidades();
        setModalidades(modalidadesData);
      } catch (error) {
        console.error("Erro ao carregar modalidades:", error);
      }
    }
    fetchModalidades();
  }, []);

  useEffect(() => {
    if (!isNovo && id) {
      fetchData();
    }
  }, [id, isNovo]);

  // Resetar estados quando a URL muda (especialmente de /novo para /id)
  useEffect(() => {
    console.log('URL mudou - isNovo:', isNovo, 'id:', id);
    
    if (isNovo) {
      // Modo de criação
      setCardapio({});
      setForm({
        nome: "",
        descricao: "",
        periodo_dias: "",
        data_inicio: "",
        data_fim: "",
        modalidade_id: "",
        ativo: true,
      });
      setEditando(true);
      setLoading(false);
    } else {
      // Modo de visualização/edição
      setEditando(false);
      if (id) {
        setLoading(true);
      }
    }
    
    setErro("");
  }, [isNovo, id]);

  useEffect(() => {
    async function fetchRefeicoes() {
      try {
        const refeicoesData = await listarRefeicoes();
        setRefeicoesDisponiveis(refeicoesData.filter(r => r.ativo));
      } catch (error) {
        console.error("Erro ao carregar refeições:", error);
      }
    }
    fetchRefeicoes();
  }, []);

  async function fetchData() {
    if (!id) return;
    
    setLoading(true);
    try {
      const idNum = parseInt(id);
      const [cardapioData, refeicoesCardapioData] = await Promise.all([
        buscarCardapio(idNum),
        listarCardapioRefeicoes(idNum)
      ]);
      
      if (!cardapioData) {
        throw new Error("Cardápio não encontrado");
      }
      
      setCardapio(cardapioData);
      setForm({
        ...cardapioData,
        data_inicio: formatDateForInput(cardapioData.data_inicio),
        data_fim: formatDateForInput(cardapioData.data_fim)
      });
      
      console.log('Refeições do cardápio carregadas:', refeicoesCardapioData);
      console.log('Quantidade de refeições:', refeicoesCardapioData?.length || 0);
      
      // Log detalhado da primeira refeição para debug
      if (refeicoesCardapioData && refeicoesCardapioData.length > 0) {
        console.log('Primeira refeição:', refeicoesCardapioData[0]);
        console.log('Objeto refeicao:', refeicoesCardapioData[0].refeicao);
      }
      
      setRefeicoesAdicionadas(refeicoesCardapioData || []);
      
      // Carregar custos das refeições se houver refeições adicionadas
      if (refeicoesCardapioData && refeicoesCardapioData.length > 0) {
        await fetchCustosRefeicoes(idNum);
      }
    } catch (error) {
      console.error("Erro ao carregar cardápio:", error);
      setErro("Cardápio não encontrado");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustosRefeicoes(cardapioId: number) {
    try {
      const response = await calcularCustoRefeicoes(cardapioId);
      // A API retorna { data: { refeicoes: [...] } }
      const custosData = response?.refeicoes || [];
      setCustosRefeicoes(Array.isArray(custosData) ? custosData : []);
    } catch (error) {
      console.error("Erro ao carregar custos das refeições:", error);
      setCustosRefeicoes([]); // Set empty array on error
    }
  }

  // Funções de manipulação
  const salvarEdicao = async () => {
    setSalvando(true);
    setErro(""); // Limpar erro anterior
    
    try {
      // Validações no frontend
      if (!form.nome?.trim()) {
        throw new Error("Nome é obrigatório");
      }
      if (!form.data_inicio) {
        throw new Error("Data de início é obrigatória");
      }
      if (!form.data_fim) {
        throw new Error("Data de fim é obrigatória");
      }

      const dadosParaEnviar = {
        nome: form.nome.trim(),
        descricao: form.descricao?.trim() || null,
        periodo_dias: form.periodo_dias ? parseInt(form.periodo_dias) : 30,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        ativo: form.ativo !== false,
        // Incluir modalidade_id apenas na criação, não na edição
        ...(isNovo && { modalidade_id: form.modalidade_id || null })
      };

      if (isNovo) {
        const novoCardapio = await criarCardapio(dadosParaEnviar);
        console.log('Novo cardápio criado:', novoCardapio);
        console.log('ID do cardápio:', novoCardapio?.id);
        console.log('Tipo do ID:', typeof novoCardapio?.id);
        
        if (novoCardapio && novoCardapio.id) {
          const targetUrl = `/cardapios/${novoCardapio.id}`;
          console.log('Navegando para:', targetUrl);
          navigate(targetUrl);
        } else {
          console.error('Cardápio criado mas sem ID:', novoCardapio);
          setErro("Cardápio criado mas houve erro na navegação");
        }
      } else {
        const cardapioAtualizado = await editarCardapio(parseInt(id!), dadosParaEnviar);
        setCardapio(cardapioAtualizado);
        setEditando(false);
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao salvar cardápio";
      setErro(errorMessage);
      
      // Se for erro de validação do backend, não navegar
      if (errorMessage.includes("obrigatório")) {
        return;
      }
    } finally {
      setSalvando(false);
    }
  };

  const excluirCardapio = async () => {
    try {
      await deletarCardapio(parseInt(id!));
      navigate("/cardapios");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setErro("Erro ao excluir cardápio");
    }
    setOpenExcluir(false);
  };

  const adicionarRefeicao = async (refeicaoId: number) => {
    if (!cardapio?.id) return;
    
    // Verificar se a refeição já está adicionada
    const jaAdicionada = refeicoesAdicionadas.some(item => 
      item.refeicao_id === refeicaoId && 
      item.modalidade_id === cardapio.modalidade_id
    );
    
    if (jaAdicionada) {
      setErro("Esta refeição já está adicionada ao cardápio");
      // Limpar erro após 3 segundos
      setTimeout(() => setErro(""), 3000);
      return;
    }
    
    try {
      const dadosParaEnviar = {
        cardapio_id: cardapio.id,
        refeicao_id: refeicaoId,
        modalidade_id: cardapio.modalidade_id,
        frequencia_mensal: 1
      };
      
      console.log('Adicionando refeição - dados:', dadosParaEnviar);
      console.log('Cardápio atual:', cardapio);
      
      const novaAssociacao = await adicionarCardapioRefeicao(dadosParaEnviar);
      
      // Buscar dados da refeição
      const refeicao = refeicoesDisponiveis.find(r => r.id === refeicaoId);
      if (refeicao) {
        setRefeicoesAdicionadas(prev => [...prev, {
          ...novaAssociacao,
          refeicao
        }]);
        
        // Mostrar mensagem de sucesso
        setSucesso(`Refeição "${refeicao.nome}" adicionada com sucesso!`);
        setTimeout(() => setSucesso(""), 3000);
      }
      
      // Limpar qualquer erro anterior
      setErro("");
    } catch (error: any) {
      console.error("Erro ao adicionar refeição:", error);
      
      // Verificar se é erro de duplicação
      if (error.response?.data?.code === "ALREADY_EXISTS") {
        setErro("Esta refeição já está adicionada ao cardápio");
      } else {
        setErro("Erro ao adicionar refeição");
      }
      
      // Limpar erro após 3 segundos
      setTimeout(() => setErro(""), 3000);
    }
  };

  const removerRefeicao = async (associacaoId: number) => {
    try {
      if (!id) {
        setErro("ID do cardápio não encontrado");
        return;
      }
      await deletarCardapioRefeicao(parseInt(id), associacaoId);
      setRefeicoesAdicionadas(prev => prev.filter(r => r.id !== associacaoId));
    } catch (error) {
      console.error("Erro ao remover refeição:", error);
      setErro("Erro ao remover refeição");
    }
  };

  const atualizarFrequencia = async (associacaoId: number, novaFrequencia: number) => {
    try {
      // Encontrar a associação atual para pegar a modalidade_id
      const associacaoAtual = refeicoesAdicionadas.find(r => r.id === associacaoId);
      if (!associacaoAtual) {
        throw new Error("Associação não encontrada");
      }

      await atualizarCardapioRefeicao(associacaoId, {
        modalidade_id: associacaoAtual.modalidade_id,
        frequencia_mensal: novaFrequencia
      });
      
      setRefeicoesAdicionadas(prev => prev.map(r => 
        r.id === associacaoId 
          ? { ...r, frequencia_mensal: novaFrequencia }
          : r
      ));
    } catch (error) {
      console.error("Erro ao atualizar frequência:", error);
      setErro("Erro ao atualizar frequência");
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as number);
    
    const refeicao = refeicoesDisponiveis.find(r => r.id === active.id) ||
                     refeicoesAdicionadas.find(r => r.refeicao_id === active.id)?.refeicao;
    setActiveRefeicao(refeicao || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setActiveRefeicao(null);
      return;
    }

    const activeRefeicaoId = active.id as number;
    const overId = over.id as string;

    // Se soltar em "adicionadas"
    if (overId === "adicionadas") {
      // Verificar se a refeição já está adicionada
      const jaAdicionada = refeicoesAdicionadas.some(r => r.refeicao_id === activeRefeicaoId);
      
      if (jaAdicionada) {
        // Se já está adicionada e foi solta no mesmo container, cancelar a remoção (não fazer nada)
        // Isso permite que o usuário "cancele" uma remoção acidental
        console.log("Refeição já adicionada - cancelando ação (mantendo no cardápio)");
      } else if (refeicoesDisponiveis.some(r => r.id === activeRefeicaoId)) {
        // Se está disponível e não foi adicionada, adicionar
        adicionarRefeicao(activeRefeicaoId);
      }
    }
    
    // Se soltar em "disponiveis" e a refeição está adicionada
    if (overId === "disponiveis" && refeicoesAdicionadas.some(r => r.refeicao_id === activeRefeicaoId)) {
      const associacao = refeicoesAdicionadas.find(r => r.refeicao_id === activeRefeicaoId);
      if (associacao) {
        removerRefeicao(associacao.id);
      }
    }

    setActiveId(null);
    setActiveRefeicao(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (erro && !isNovo) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{erro}</Alert>
      </Container>
    );
  }

  const modalidadeAtual = modalidades.find(m => m.id === (cardapio?.modalidade_id || form.modalidade_id));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Botão Voltar */}
        <Button
          component={RouterLink}
          to="/cardapios"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          Voltar para Cardápios
        </Button>

        {/* Card de Informações do Cardápio */}
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {editando ? (
              <Box>
                <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
                  {isNovo ? "Novo Cardápio" : "Editar Cardápio"}
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Nome do Cardápio"
                      value={form.nome || ""}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Modalidade"
                      select
                      value={form.modalidade_id || ""}
                      onChange={(e) => setForm({ ...form, modalidade_id: e.target.value })}
                      fullWidth
                      required
                      disabled={!isNovo} // Desabilitar durante edição
                      helperText={!isNovo ? "A modalidade não pode ser alterada após a criação" : ""}
                    >
                      {modalidades.map((modalidade) => (
                        <MenuItem key={modalidade.id} value={modalidade.id}>
                          {modalidade.nome}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Descrição"
                      value={form.descricao || ""}
                      onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                      fullWidth
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Período (dias)"
                      type="number"
                      value={form.periodo_dias || ""}
                      onChange={(e) => setForm({ ...form, periodo_dias: e.target.value })}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Data de Início"
                      type="date"
                      value={form.data_inicio || ""}
                      onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Data de Fim"
                      type="date"
                      value={form.data_fim || ""}
                      onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!form.ativo}
                          onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                        />
                      }
                      label="Ativo"
                    />
                  </Grid>
                  {erro && (
                    <Grid item xs={12}>
                      <Alert severity="error">{erro}</Alert>
                    </Grid>
                  )}
                  {sucesso && (
                    <Grid item xs={12}>
                      <Alert severity="success">{sucesso}</Alert>
                    </Grid>
                  )}
                </Grid>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                  <Box>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {cardapio?.nome}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                      <Chip
                        label={modalidadeAtual?.nome || "Modalidade não encontrada"}
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={cardapio?.ativo ? "Ativo" : "Inativo"}
                        color={cardapio?.ativo ? "success" : "error"}
                        variant="filled"
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      onClick={() => setEditando(true)}
                      startIcon={<EditIcon />}
                      variant="contained"
                      color="primary"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => setOpenExcluir(true)}
                      startIcon={<DeleteIcon />}
                      variant="outlined"
                      color="error"
                    >
                      Excluir
                    </Button>
                  </Box>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarTodayIcon color="primary" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Período
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {cardapio?.periodo_dias} dias
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTimeIcon color="primary" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Vigência
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {formatarData(cardapio?.data_inicio)} - {formatarData(cardapio?.data_fim)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUpIcon color="primary" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Progresso
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {calcularProgresso(cardapio?.data_inicio, cardapio?.data_fim).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RestaurantIcon color="primary" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Refeições
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {refeicoesAdicionadas.length}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
          
          {editando && (
            <CardActions sx={{ px: 4, pb: 4 }}>
              <Button onClick={() => setEditando(false)} sx={{ mr: 1 }}>
                Cancelar
              </Button>
              <Button
                onClick={salvarEdicao}
                variant="contained"
                disabled={salvando}
              >
                {salvando ? <CircularProgress size={24} /> : "Salvar"}
              </Button>
            </CardActions>
          )}
        </Card>

        {/* Cards de Refeições - Só mostra se não estiver editando e não for novo */}
        {!editando && !isNovo && (
          <Grid container spacing={3}>
            {/* Card Refeições Disponíveis */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: "600px", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Refeições Disponíveis
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Arraste as refeições para adicionar ao cardápio
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Buscar refeições disponíveis..."
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
                    {refeicoesDisponiveisFiltradas
                      .filter(refeicao => !refeicoesAdicionadas.some(r => r.refeicao_id === refeicao.id))
                      .map((refeicao) => (
                        <DraggableRefeicao
                          key={refeicao.id}
                          refeicao={refeicao}
                          onAdd={() => adicionarRefeicao(refeicao.id)}
                          isDragging={activeId === refeicao.id}
                        />
                      ))}
                  </List>
                  {refeicoesDisponiveisFiltradas.filter(refeicao => !refeicoesAdicionadas.some(r => r.refeicao_id === refeicao.id)).length === 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "text.secondary",
                      }}
                    >
                      <Typography>Todas as refeições foram adicionadas</Typography>
                    </Box>
                  )}
                </DroppableZone>
              </Card>
            </Grid>

            {/* Card Refeições Adicionadas */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: "600px", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Refeições do Cardápio
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Arraste para remover ou ajuste a frequência mensal
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Buscar refeições do cardápio..."
                    value={filtroAdicionadas}
                    onChange={(e) => setFiltroAdicionadas(e.target.value)}
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
                <DroppableZone id="adicionadas">
                  <List>
                    {refeicoesAdicionadasFiltradas.map((assoc) => (
                      <DraggableRefeicao
                        key={assoc.refeicao_id}
                        refeicao={assoc.refeicao!}
                        frequencia={assoc.frequencia_mensal}
                        onFrequenciaChange={(value) => atualizarFrequencia(assoc.id, value)}
                        onRemove={() => removerRefeicao(assoc.id)}
                        isDragging={activeId === assoc.refeicao_id}
                        custoTotal={custosRefeicoes?.find(c => c.refeicao_id === assoc.refeicao_id)?.custo_total_refeicao}
                        onCustoClick={() => {
                          const refeicaoComCusto = custosRefeicoes?.find(c => c.refeicao_id === assoc.refeicao_id);
                          if (refeicaoComCusto) {
                            setModalDetalheCusto(refeicaoComCusto);
                          }
                        }}
                      />
                    ))}
                  </List>
                  {refeicoesAdicionadasFiltradas.length === 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "text.secondary",
                      }}
                    >
                      <Typography>Nenhuma refeição adicionada</Typography>
                    </Box>
                  )}
                </DroppableZone>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Modal de confirmação de exclusão */}
        <Dialog open={openExcluir} onClose={() => setOpenExcluir(false)}>
          <DialogTitle>Excluir Cardápio</DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja excluir o cardápio "{cardapio?.nome}"?
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenExcluir(false)}>Cancelar</Button>
            <Button onClick={excluirCardapio} color="error" variant="contained">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Detalhamento do Custo */}
        <Dialog 
          open={!!modalDetalheCusto} 
          onClose={() => setModalDetalheCusto(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" component="div">
              Detalhamento do Custo - {modalDetalheCusto?.refeicao_nome}
            </Typography>
          </DialogTitle>
          <DialogContent>
            {modalDetalheCusto && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Modalidade: {modalidadeAtual?.nome} | Total de Alunos: {modalDetalheCusto.total_alunos_modalidade}
                </Typography>
                
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Unidade</TableCell>
                      <TableCell align="right">Qtd. per capita</TableCell>
                      <TableCell align="right">Qtd. Calculada (kg)</TableCell>
                      <TableCell align="right">Preço Unitário</TableCell>
                      <TableCell align="right">Custo por Aluno</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modalDetalheCusto.produtos?.map((produto, index) => (
                      <TableRow key={index}>
                        <TableCell>{produto.produto_nome}</TableCell>
                        <TableCell>{produto.unidade_medida}</TableCell>
                        <TableCell align="right">{produto.per_capita}</TableCell>
                        <TableCell align="right">
                          {produto.unidade_medida === 'unidade' 
                            ? `${(modalDetalheCusto.total_alunos_modalidade * produto.per_capita).toFixed(3)} ${produto.unidade_medida}`
                            : `${(modalDetalheCusto.total_alunos_modalidade * produto.per_capita / 1000).toFixed(3)} kg`
                          }
                        </TableCell>
                        <TableCell align="right">R$ {produto.preco_unitario?.toFixed(2)}</TableCell>
                        <TableCell align="right">R$ {produto.custo_por_aluno_produto?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">
                    <strong>Custo por Aluno:</strong> R$ {modalDetalheCusto.custo_por_aluno?.toFixed(2)}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Frequência Mensal:</strong> {modalDetalheCusto.frequencia_mensal}x
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="h6" color="primary.contrastText" align="center">
                    <strong>Custo Total da Refeição: R$ {modalDetalheCusto.custo_total_refeicao?.toFixed(2)}</strong>
                  </Typography>
                  <Typography variant="caption" color="primary.contrastText" align="center" display="block">
                    (Custo por aluno × Total de alunos × Frequência mensal)
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalDetalheCusto(null)}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Feedback de Erro */}
        {erro && (
          <Alert
            severity="error"
            sx={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
            onClose={() => setErro("")}
          >
            {erro}
          </Alert>
        )}

        <DragOverlay dropAnimation={null}>
          {activeRefeicao ? (
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
              <Typography fontWeight="bold">{activeRefeicao.nome}</Typography>
              {activeRefeicao.descricao && (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {activeRefeicao.descricao}
                </Typography>
              )}
            </Paper>
          ) : null}
        </DragOverlay>
      </Container>
    </DndContext>
  );
}
