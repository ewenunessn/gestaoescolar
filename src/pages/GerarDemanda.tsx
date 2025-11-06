import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Grid,
  Card,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Modal,
  IconButton,
} from "@mui/material";
import {
  Calculate as CalculateIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import {
  gerarDemandaMensal,
  exportarDemandaExcel,
  DemandaItem,
  DemandaResumo,
  CardapioDisponivel,
  DetalheDemanda,
} from "../services/demanda";
import { listarEscolas } from "../services/escolas";
import { listarModalidades } from "../services/modalidades";

interface Escola {
  id: number;
  nome: string;
  total_alunos: number;
}

interface Modalidade {
  id: number;
  nome: string;
}

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: 800,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export default function GerarDemanda() {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [demanda, setDemanda] = useState<DemandaItem[]>([]);
  const [resumo, setResumo] = useState<DemandaResumo | null>(null);

  // State for modal
  const [modalAberto, setModalAberto] = useState(false);
  const [detalhesSelecionados, setDetalhesSelecionados] = useState<DetalheDemanda[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>("");


  // Filtros
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [escolasSelecionadas, setEscolasSelecionadas] = useState<number[]>([]);
  const [modalidadesSelecionadas, setModalidadesSelecionadas] = useState<
    number[]
  >([]);
  const [cardapiosSelecionados, setCardapiosSelecionados] = useState<number[]>(
    []
  );

  // Dados para os selects
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [cardapiosDisponiveis, setCardapiosDisponiveis] = useState<
    CardapioDisponivel[]
  >([]);

  const meses = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [escolasData, modalidadesData] = await Promise.all([
        listarEscolas(),
        listarModalidades(),
      ]);

      setEscolas(escolasData);
      setModalidades(modalidadesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setErro("Erro ao carregar dados iniciais");
    }
  };

  const handleGerarDemanda = async () => {
    if (!mes || !ano) {
      setErro("Mês e ano são obrigatórios");
      return;
    }

    setLoading(true);
    setErro("");

    try {
      const resultado = await gerarDemandaMensal({
        mes,
        ano,
        escola_ids:
          escolasSelecionadas.length > 0 ? escolasSelecionadas : undefined,
        modalidade_ids:
          modalidadesSelecionadas.length > 0
            ? modalidadesSelecionadas
            : undefined,
      });

      setDemanda(resultado.demanda);
      setResumo(resultado.resumo);
    } catch (error) {
      console.error("Erro ao gerar demanda:", error);
      setErro("Erro ao gerar demanda mensal");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarExcel = async () => {
    try {
      await exportarDemandaExcel({
        mes,
        ano,
        escola_ids:
          escolasSelecionadas.length > 0 ? escolasSelecionadas : undefined,
        modalidade_ids:
          modalidadesSelecionadas.length > 0
            ? modalidadesSelecionadas
            : undefined,
      });
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      setErro("Erro ao exportar demanda para Excel");
    }
  };

  const handleAbrirModal = (detalhes: DetalheDemanda[], produtoNome: string) => {
    setDetalhesSelecionados(detalhes);
    setProdutoSelecionado(produtoNome);
    setModalAberto(true);
  };

  const handleFecharModal = () => {
    setModalAberto(false);
    setDetalhesSelecionados([]);
    setProdutoSelecionado("");
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const formatarQuantidade = (quantidade: number) => {
    return quantidade.toFixed(2);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Cabeçalho */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            color: "#1a1a1a",
            mb: 1,
          }}
        >
          Gerar Demanda Mensal
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "#6b7280",
            fontFamily: "Inter, sans-serif",
            fontSize: "0.95rem",
          }}
        >
          Calcule automaticamente a demanda de produtos baseada nos cardápios,
          refeições, quantidade de alunos e frequências mensais.
        </Typography>
      </Box>

      {/* Filtros */}
      <Card
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: "12px",
          backgroundColor: "#fafafa",
          border: "1px solid #e8e8e8",
          boxShadow: "none",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            color: "#1a1a1a",
            mb: 2,
          }}
        >
          Filtros
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Mês</InputLabel>
              <Select
                value={mes}
                label="Mês"
                onChange={(e) => setMes(Number(e.target.value))}
              >
                {meses.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Ano</InputLabel>
              <Select
                value={ano}
                label="Ano"
                onChange={(e) => setAno(Number(e.target.value))}
              >
                {[2024, 2025, 2026].map((a) => (
                  <MenuItem key={a} value={a}>
                    {a}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Escolas</InputLabel>
              <Select
                multiple
                value={escolasSelecionadas}
                label="Escolas"
                onChange={(e) =>
                  setEscolasSelecionadas(e.target.value as number[])
                }
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => {
                      const escola = escolas.find((e) => e.id === value);
                      return (
                        <Chip
                          key={value}
                          label={escola?.nome || value}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {escolas.map((escola) => (
                  <MenuItem key={escola.id} value={escola.id}>
                    {escola.nome} ({escola.total_alunos} alunos)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Modalidades</InputLabel>
              <Select
                multiple
                value={modalidadesSelecionadas}
                label="Modalidades"
                onChange={(e) =>
                  setModalidadesSelecionadas(e.target.value as number[])
                }
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => {
                      const modalidade = modalidades.find(
                        (m) => m.id === value
                      );
                      return (
                        <Chip
                          key={value}
                          label={modalidade?.nome || value}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {modalidades.map((modalidade) => (
                  <MenuItem key={modalidade.id} value={modalidade.id}>
                    {modalidade.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={16} /> : <CalculateIcon />
            }
            onClick={handleGerarDemanda}
            disabled={loading}
            sx={{
              backgroundColor: "#4f46e5",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: "8px",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "#4338ca",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
              },
              "&:disabled": {
                backgroundColor: "#9ca3af",
              },
            }}
          >
            {loading ? "Gerando..." : "Gerar Demanda"}
          </Button>

          {demanda.length > 0 && (
            <>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExportarExcel}
                sx={{
                  backgroundColor: "#10b981",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: "8px",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "#059669",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                  },
                }}
              >
                Exportar Excel
              </Button>
            </>
          )}
        </Box>
      </Card>

      {erro && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {erro}
        </Alert>
      )}

      {/* Resumo */}
      {resumo && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              color: "#1a1a1a",
              mb: 2,
            }}
          >
            Resumo da Demanda
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  p: 3,
                  textAlign: "center",
                  borderRadius: "12px",
                  backgroundColor: "#fafafa",
                  border: "1px solid #e8e8e8",
                  boxShadow: "none",
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    color: "#4f46e5",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 700,
                    mb: 1,
                  }}
                >
                  {resumo.total_produtos}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#6b7280",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "0.875rem",
                  }}
                >
                  Total de Produtos
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  p: 3,
                  textAlign: "center",
                  borderRadius: "12px",
                  backgroundColor: "#fafafa",
                  border: "1px solid #e8e8e8",
                  boxShadow: "none",
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    color: "#10b981",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 700,
                    mb: 1,
                  }}
                >
                  {formatarMoeda(resumo.total_valor)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#6b7280",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "0.875rem",
                  }}
                >
                  Valor Total Estimado
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  p: 3,
                  textAlign: "center",
                  borderRadius: "12px",
                  backgroundColor: "#fafafa",
                  border: "1px solid #e8e8e8",
                  boxShadow: "none",
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    color: "#0ea5e9",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 700,
                    mb: 1,
                  }}
                >
                  {resumo.filtros.escolas || "Todas"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#6b7280",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "0.875rem",
                  }}
                >
                  Escolas Selecionadas
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tabela de Demanda */}
      {demanda.length > 0 && (
        <Card
          sx={{
            borderRadius: "12px",
            boxShadow: "none",
            border: "1px solid #e8e8e8",
            overflow: "hidden",
            backgroundColor: "#ffffff",
          }}
        >
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                color: "#1a1a1a",
                mb: 2,
              }}
            >
              Demanda Calculada - {meses.find((m) => m.value === mes)?.label}{" "}
              {ano}
            </Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                  <TableCell
                    sx={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "0.875rem",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Produto
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "0.875rem",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Unidade
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "0.875rem",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Quantidade
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "0.875rem",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Valor Total
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "0.875rem",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Detalhes
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {demanda.map((item) => (
                  <TableRow
                    key={item.produto_id}
                    sx={{
                      "&:hover": {
                        backgroundColor: "#f8fafc",
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        borderBottom: "1px solid #f1f5f9",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 600,
                          color: "#1f2937",
                        }}
                      >
                        {item.produto_nome}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        borderBottom: "1px solid #f1f5f9",
                        fontFamily: "Inter, sans-serif",
                        color: "#6b7280",
                      }}
                    >
                      {item.unidade}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 600,
                          color: "#1f2937",
                        }}
                      >
                        {formatarQuantidade(item.quantidade_total)}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 600,
                          color: "#10b981",
                        }}
                      >
                        {formatarMoeda(item.valor_total)}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <Button
                        onClick={() => handleAbrirModal(item.detalhes, item.produto_nome)}
                        size="small"
                      >
                        Ver Cálculos
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      <Modal
        open={modalAberto}
        onClose={handleFecharModal}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <Box sx={modalStyle}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography id="modal-title" variant="h6" component="h2">
              Detalhes do Cálculo para: {produtoSelecionado}
            </Typography>
            <IconButton onClick={handleFecharModal}>
              <CloseIcon />
            </IconButton>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Escola</TableCell>
                  <TableCell>Modalidade</TableCell>
                  <TableCell>Cardápio</TableCell>
                  <TableCell>Refeição</TableCell>
                  <TableCell align="right">Alunos</TableCell>
                  <TableCell align="right">Freq.</TableCell>
                  <TableCell align="right">Per Capita</TableCell>
                  <TableCell align="right">Calculado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detalhesSelecionados.map((detalhe, index) => (
                  <TableRow key={index}>
                    <TableCell>{detalhe.escola_nome}</TableCell>
                    <TableCell>{detalhe.modalidade_nome}</TableCell>
                    <TableCell>{detalhe.cardapio_nome}</TableCell>
                    <TableCell>{detalhe.refeicao_nome}</TableCell>
                    <TableCell align="right">
                      {detalhe.quantidade_alunos}
                    </TableCell>
                    <TableCell align="right">
                      {detalhe.frequencia_mensal}x
                    </TableCell>
                    <TableCell align="right">{detalhe.per_capita}g</TableCell>
                    <TableCell align="right">
                      {formatarQuantidade(detalhe.quantidade_calculada)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Modal>
    </Box>
  );
}