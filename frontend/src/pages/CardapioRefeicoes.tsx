import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  listarCardapioRefeicoes,
  adicionarCardapioRefeicao,
  atualizarCardapioRefeicao,
  deletarCardapioRefeicao,
} from "../services/cardapios";
import { listarRefeicoes } from "../services/refeicoes";
import { listarModalidades } from "../services/modalidades";
import { buscarCardapio } from "../services/cardapios";
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
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Stack,
  Divider,
  Container,
  Fade,
  Grow,
  Tooltip,
  Badge,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import SchoolIcon from "@mui/icons-material/School";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

// Tipos para drag and drop
interface DragItem {
  id: number;
  index: number;
  type: string;
}

export default function CardapioRefeicoes() {
  const { cardapioId } = useParams();
  const navigate = useNavigate();
  const [refeicoes, setRefeicoes] = useState<any[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState<any>({
    refeicao_id: "",
    modalidade_id: "",
    frequencia_mensal: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [periodoDias, setPeriodoDias] = useState<number>(0);
  const [erroValidacao, setErroValidacao] = useState("");
  const location = useLocation();
  const modalidadeId = new URLSearchParams(location.search).get("modalidade");
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState<any>(null);
  const [cardapio, setCardapio] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);

  useEffect(() => {
    const idNum = Number(cardapioId);
    if (!cardapioId || isNaN(idNum) || idNum <= 0) {
      setErro("ID de cardápio inválido.");
      setLoading(false);
      return;
    }
    if (!modalidadeId) {
      setErro("Selecione uma modalidade para gerenciar as refeições.");
      setLoading(false);
      return;
    }
    async function fetchData() {
      setLoading(true);
      try {
        const [r, m, i, c] = await Promise.all([
          listarRefeicoes(),
          listarModalidades(),
          listarCardapioRefeicoes(idNum),
          buscarCardapio(idNum),
        ]);
        setRefeicoes(r);
        setModalidades(m);
        setCardapio(c);
        setModalidadeSelecionada(
          m.find((mod: any) => String(mod.id) === String(modalidadeId))
        );
        setItens(
          i.filter(
            (item: any) => String(item.modalidade_id) === String(modalidadeId)
          )
        );
        setPeriodoDias(Number(c.periodo_dias) || 0);
      } catch {
        setErro("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [cardapioId, modalidadeId]);

  // Filtrar refeições disponíveis (não adicionadas ainda)
  const refeicoesDisponiveis = refeicoes.filter(
    (r) =>
      !itens.some((item) => item.refeicao_id === r.id) &&
      (!modalidadeId ||
        String(r.modalidade_id) === String(modalidadeId) ||
        !r.modalidade_id)
  );

  function abrirNovo() {
    setForm({
      refeicao_id: "",
      modalidade_id: modalidadeId,
      frequencia_mensal: "",
    });
    setEditando(null);
    setErroValidacao("");
    setOpen(true);
  }

  function abrirEditar(item: any) {
    setForm({
      refeicao_id: item.refeicao_id,
      modalidade_id: item.modalidade_id,
      frequencia_mensal: item.frequencia_mensal,
    });
    setEditando(item);
    setErroValidacao("");
    setOpen(true);
  }

  function fechar() {
    setOpen(false);
    setEditando(null);
    setForm({ refeicao_id: "", modalidade_id: "", frequencia_mensal: "" });
    setErroValidacao("");
  }

  function validarFrequencia(frequencia: string) {
    const freq = Number(frequencia);
    if (!freq || isNaN(freq) || freq <= 0 || !Number.isInteger(freq)) {
      return "Frequência deve ser um número inteiro positivo.";
    }
    if (periodoDias && freq > periodoDias) {
      return `Frequência não pode ser maior que o período do cardápio (${periodoDias} dias).`;
    }
    return "";
  }

  function validarDuplicata(refeicaoId: string) {
    if (
      !editando &&
      itens.some((item) => String(item.refeicao_id) === String(refeicaoId))
    ) {
      return "Esta refeição já foi adicionada ao cardápio.";
    }
    return "";
  }

  async function salvar() {
    setSalvando(true);
    const idNum = Number(cardapioId);
    if (!cardapioId || isNaN(idNum) || idNum <= 0) {
      setErro("ID de cardápio inválido.");
      setSalvando(false);
      return;
    }

    // Validação dos dados antes de enviar
    if (!form.refeicao_id || !form.modalidade_id || !form.frequencia_mensal) {
      setErro("Todos os campos são obrigatórios.");
      setSalvando(false);
      return;
    }

    const erroFreq = validarFrequencia(form.frequencia_mensal);
    const erroDuplicata = validarDuplicata(form.refeicao_id);

    if (erroFreq) {
      setErroValidacao(erroFreq);
      setSalvando(false);
      return;
    }

    if (erroDuplicata) {
      setErroValidacao(erroDuplicata);
      setSalvando(false);
      return;
    }

    // Preparar dados para envio
    const dadosParaEnviar = {
      refeicao_id: Number(form.refeicao_id),
      modalidade_id: Number(form.modalidade_id),
      frequencia_mensal: Number(form.frequencia_mensal),
      cardapio_id: idNum,
    };

    console.log("Dados para adicionar refeição:", dadosParaEnviar);

    try {
      if (editando) {
        await atualizarCardapioRefeicao(editando.id, dadosParaEnviar);
      } else {
        await adicionarCardapioRefeicao(dadosParaEnviar);
      }
      const atualizados = await listarCardapioRefeicoes(idNum);
      setItens(
        atualizados.filter(
          (item: any) => String(item.modalidade_id) === String(modalidadeId)
        )
      );
      fechar();
    } catch (e: any) {
      console.error("Erro ao salvar refeição:", e);
      console.error("Detalhes do erro:", {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });

      let errorMessage = "Erro ao salvar item";

      if (e?.response?.status === 400) {
        errorMessage = e?.response?.data?.message || "Dados inválidos enviados";
      } else if (e?.response?.status === 404) {
        errorMessage = "Cardápio ou refeição não encontrado";
      } else if (e?.response?.status === 500) {
        errorMessage = "Erro interno do servidor";
      } else if (e?.message) {
        errorMessage = e.message;
      }

      setErro(errorMessage);
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: number) {
    const idNum = Number(cardapioId);
    if (!cardapioId || isNaN(idNum) || idNum <= 0) {
      setErro("ID de cardápio inválido.");
      return;
    }
    if (!window.confirm("Remover este item?")) return;
    try {
      await deletarCardapioRefeicao(idNum, id);
      const atualizados = await listarCardapioRefeicoes(idNum);
      setItens(
        atualizados.filter(
          (item: any) => String(item.modalidade_id) === String(modalidadeId)
        )
      );
    } catch {
      setErro("Erro ao remover item");
    }
  }

  // Funções de drag and drop
  const handleDragStart = (e: React.DragEvent, item: any, index: number) => {
    setDraggedItem({ id: item.id, index, type: "refeicao" });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (!draggedItem) return;

    const dragIndex = draggedItem.index;

    if (dragIndex === dropIndex) return;

    const newItens = [...itens];
    const draggedElement = newItens[dragIndex];

    // Remove o item da posição original
    newItens.splice(dragIndex, 1);

    // Insere o item na nova posição
    newItens.splice(dropIndex, 0, draggedElement);

    setItens(newItens);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (erro) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {erro}
        </Alert>
      </Container>
    );
  }

  if (!modalidadeId) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Selecione uma modalidade para gerenciar as refeições.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Tooltip title="Voltar para cardápio">
              <IconButton
                onClick={() => navigate(`/cardapios/${cardapioId}`)}
                sx={{
                  mr: 2,
                  bgcolor: "primary.main",
                  color: "white",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
            <Box>
              <Typography
                variant="h3"
                component="h1"
                fontWeight="700"
                color="primary.main"
                sx={{ mb: 1 }}
              >
                Refeições do Cardápio
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {cardapio?.nome} - {modalidadeSelecionada?.nome}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Chip
              icon={<RestaurantIcon />}
              label={`${itens.length} refeições configuradas`}
              color="primary"
              variant="filled"
              size="medium"
            />
            <Chip
              icon={<SchoolIcon />}
              label={modalidadeSelecionada?.nome || "Modalidade"}
              color="secondary"
              variant="outlined"
              size="medium"
            />
          </Box>
        </Box>
      </Fade>

      {/* Estatísticas */}
      <Grow in timeout={800}>
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: "100%",
                background: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)",
                color: "white",
                boxShadow: 4,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Avatar
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    width: 60,
                    height: 60,
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <RestaurantIcon fontSize="large" />
                </Avatar>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                  {itens.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Refeições Configuradas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: "100%",
                background: "linear-gradient(135deg, #2196f3 0%, #42a5f5 100%)",
                color: "white",
                boxShadow: 4,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Avatar
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    width: 60,
                    height: 60,
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <AddIcon fontSize="large" />
                </Avatar>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                  {refeicoesDisponiveis.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Refeições Disponíveis
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: "100%",
                background: "linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)",
                color: "white",
                boxShadow: 4,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Avatar
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    width: 60,
                    height: 60,
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    Σ
                  </Typography>
                </Avatar>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                  {itens.reduce(
                    (total, item) => total + item.frequencia_mensal,
                    0
                  )}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Frequência Total/Mês
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: "100%",
                background: "linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)",
                color: "white",
                boxShadow: 4,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Avatar
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    width: 60,
                    height: 60,
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    {periodoDias}
                  </Typography>
                </Avatar>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                  {periodoDias}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Período (dias)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grow>

      {/* Ações */}
      <Fade in timeout={1000}>
        <Card sx={{ mb: 6, borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" color="primary" fontWeight="bold">
                Ações Disponíveis
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={abrirNovo}
                size="large"
                sx={{ borderRadius: 2 }}
                disabled={refeicoesDisponiveis.length === 0}
              >
                Adicionar Refeição
              </Button>
            </Box>
            {refeicoesDisponiveis.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Todas as refeições disponíveis já foram adicionadas ao cardápio.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Fade>

      {/* Lista de Refeições com Drag and Drop */}
      <Fade in timeout={1200}>
        <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
          <Box
            sx={{
              p: 4,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    mr: 2,
                    width: 56,
                    height: 56,
                  }}
                >
                  <RestaurantIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    Refeições Configuradas
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Arraste e solte para reordenar
                  </Typography>
                </Box>
              </Box>
              <Badge badgeContent={itens.length} color="secondary">
                <DragIndicatorIcon fontSize="large" />
              </Badge>
            </Box>
          </Box>

          <CardContent sx={{ p: 4 }}>
            {itens.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Avatar
                  sx={{
                    bgcolor: "grey.100",
                    width: 100,
                    height: 100,
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  <RestaurantIcon sx={{ fontSize: 60, color: "grey.400" }} />
                </Avatar>
                <Typography variant="h5" color="text.secondary" mb={2}>
                  Nenhuma refeição configurada
                </Typography>
                <Typography color="text.secondary" mb={4}>
                  Adicione refeições para configurar o cardápio desta modalidade
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={abrirNovo}
                  size="large"
                  sx={{ borderRadius: 2 }}
                  disabled={refeicoesDisponiveis.length === 0}
                >
                  Adicionar Primeira Refeição
                </Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {itens.map((item, index) => {
                  const refeicao = refeicoes.find(
                    (r) => r.id === item.refeicao_id
                  );
                  const isDragging = draggedItem?.id === item.id;

                  return (
                    <Grow key={item.id} in timeout={600 + index * 100}>
                      <Card
                        sx={{
                          borderRadius: 3,
                          boxShadow: isDragging ? 6 : 2,
                          transform: isDragging ? "rotate(5deg)" : "none",
                          transition: "all 0.3s ease",
                          cursor: "grab",
                          "&:hover": {
                            boxShadow: 4,
                            transform: "translateY(-2px)",
                          },
                          "&:active": {
                            cursor: "grabbing",
                          },
                          opacity: isDragging ? 0.7 : 1,
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item, index)}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                flex: 1,
                              }}
                            >
                              <DragHandleIcon
                                sx={{ mr: 2, color: "text.secondary" }}
                              />
                              <Avatar
                                sx={{
                                  bgcolor: "primary.main",
                                  mr: 3,
                                  width: 50,
                                  height: 50,
                                }}
                              >
                                <RestaurantIcon />
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  variant="h6"
                                  fontWeight="bold"
                                  mb={1}
                                >
                                  {refeicao?.nome ||
                                    `Refeição ${item.refeicao_id}`}
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    alignItems: "center",
                                  }}
                                >
                                  <Chip
                                    label={`${item.frequencia_mensal}x por mês`}
                                    color="primary"
                                    variant="outlined"
                                    size="small"
                                  />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    • Posição {index + 1}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <Tooltip title="Editar refeição">
                                <IconButton
                                  color="primary"
                                  onClick={() => abrirEditar(item)}
                                  sx={{
                                    bgcolor: "primary.50",
                                    "&:hover": { bgcolor: "primary.100" },
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remover refeição">
                                <IconButton
                                  color="error"
                                  onClick={() => remover(item.id)}
                                  sx={{
                                    bgcolor: "error.50",
                                    "&:hover": { bgcolor: "error.100" },
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grow>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Fade>

      {/* Dialog de Adição/Edição */}
      <Dialog
        open={open}
        onClose={fechar}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            pb: 2,
            color: "primary.main",
            fontWeight: "bold",
          }}
        >
          <Avatar
            sx={{
              bgcolor: "primary.100",
              color: "primary.main",
              width: 60,
              height: 60,
              mx: "auto",
              mb: 2,
            }}
          >
            {editando ? (
              <EditIcon fontSize="large" />
            ) : (
              <AddIcon fontSize="large" />
            )}
          </Avatar>
          {editando ? "Editar Refeição" : "Adicionar Refeição"}
        </DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Refeição</InputLabel>
            <Select
              value={form.refeicao_id}
              label="Refeição"
              onChange={(e) => {
                setForm({ ...form, refeicao_id: e.target.value });
                setErroValidacao("");
              }}
              disabled={!!editando}
            >
              {(editando ? refeicoes : refeicoesDisponiveis).map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <RestaurantIcon sx={{ mr: 2, color: "primary.main" }} />
                    {r.nome}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={`Frequência Mensal (máx: ${periodoDias})`}
            value={form.frequencia_mensal}
            onChange={(e) => {
              setForm({ ...form, frequencia_mensal: e.target.value });
              setErroValidacao("");
            }}
            fullWidth
            margin="normal"
            type="number"
            required
            error={!!erroValidacao}
            helperText={
              erroValidacao ||
              `Quantas vezes por mês esta refeição será servida (máximo ${periodoDias})`
            }
            InputProps={{
              inputProps: { min: 1, max: periodoDias },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: "center", gap: 2 }}>
          <Button
            onClick={fechar}
            variant="outlined"
            size="large"
            sx={{ borderRadius: 2, minWidth: 120 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            variant="contained"
            disabled={salvando}
            size="large"
            sx={{ borderRadius: 2, minWidth: 120 }}
          >
            {salvando ? <CircularProgress size={24} /> : "Salvar"}
          </Button>
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
            borderRadius: 2,
            boxShadow: 4,
          }}
        >
          {erro}
        </Alert>
      )}
    </Container>
  );
}
