import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Calculate as CalculateIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Restaurant as RestaurantIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as AttachMoneyIcon,
} from "@mui/icons-material";
import { 
  gerarDemandaMensal, 
  gerarDemandaMultiplosCardapios,
  listarCardapiosDisponiveis,
  exportarDemandaMensal,
  exportarDemandaExcel, 
  DemandaItem, 
  DemandaResumo,
  CardapioDisponivel 
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

export default function GerarDemanda() {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [demanda, setDemanda] = useState<DemandaItem[]>([]);
  const [resumo, setResumo] = useState<DemandaResumo | null>(null);
  
  // Filtros
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [escolasSelecionadas, setEscolasSelecionadas] = useState<number[]>([]);
  const [modalidadesSelecionadas, setModalidadesSelecionadas] = useState<number[]>([]);
  const [cardapiosSelecionados, setCardapiosSelecionados] = useState<number[]>([]);
  const [modoAvancado, setModoAvancado] = useState(false);
  
  // Dados para os selects
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [cardapiosDisponiveis, setCardapiosDisponiveis] = useState<CardapioDisponivel[]>([]);

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
        listarModalidades()
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
        escola_ids: escolasSelecionadas.length > 0 ? escolasSelecionadas : undefined,
        modalidade_ids: modalidadesSelecionadas.length > 0 ? modalidadesSelecionadas : undefined,
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

  const handleExportar = async (formato: 'json' | 'csv') => {
    try {
      await exportarDemandaMensal({
        mes,
        ano,
        escola_ids: escolasSelecionadas.length > 0 ? escolasSelecionadas : undefined,
        modalidade_ids: modalidadesSelecionadas.length > 0 ? modalidadesSelecionadas : undefined,
        formato,
      });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      setErro("Erro ao exportar demanda");
    }
  };

  const handleExportarExcel = async () => {
    try {
      await exportarDemandaExcel({
        mes,
        ano,
        escola_ids: escolasSelecionadas.length > 0 ? escolasSelecionadas : undefined,
        modalidade_ids: modalidadesSelecionadas.length > 0 ? modalidadesSelecionadas : undefined,
      });
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      setErro("Erro ao exportar demanda para Excel");
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarQuantidade = (quantidade: number) => {
    return quantidade.toFixed(2);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gerar Demanda Mensal
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Calcule automaticamente a demanda de produtos baseada nos cardápios, 
        refeições, quantidade de alunos e frequências mensais.
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
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
                onChange={(e) => setEscolasSelecionadas(e.target.value as number[])}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const escola = escolas.find(e => e.id === value);
                      return (
                        <Chip key={value} label={escola?.nome || value} size="small" />
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
                onChange={(e) => setModalidadesSelecionadas(e.target.value as number[])}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const modalidade = modalidades.find(m => m.id === value);
                      return (
                        <Chip key={value} label={modalidade?.nome || value} size="small" />
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

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<CalculateIcon />}
            onClick={handleGerarDemanda}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : "Gerar Demanda"}
          </Button>

          {demanda.length > 0 && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<DownloadIcon />}
                onClick={handleExportarExcel}
              >
                Exportar Excel
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportar('csv')}
              >
                Exportar CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportar('json')}
              >
                Exportar JSON
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {erro && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {erro}
        </Alert>
      )}

      {/* Resumo */}
      {resumo && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShoppingCartIcon color="primary" />
                  <Box>
                    <Typography variant="h4">{resumo.total_produtos}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Produtos
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>



          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoneyIcon color="warning" />
                  <Box>
                    <Typography variant="h4">{formatarMoeda(resumo.total_valor)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Valor Total
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon color="info" />
                  <Box>
                    <Typography variant="h4">{resumo.filtros.escolas || "Todas"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Escolas
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabela de Demanda */}
      {demanda.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Demanda Calculada - {meses.find(m => m.value === mes)?.label} {ano}
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell>Unidade</TableCell>
                  <TableCell align="right">Quantidade</TableCell>
                  <TableCell align="right">Valor Total</TableCell>
                  <TableCell align="center">Detalhes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {demanda.map((item) => (
                  <TableRow key={item.produto_id}>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {item.produto_nome}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.unidade_medida}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {formatarQuantidade(item.quantidade_total)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {formatarMoeda(item.valor_total)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2">
                            Ver Cálculos ({item.detalhes.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
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
                              {item.detalhes.map((detalhe, index) => (
                                <TableRow key={index}>
                                  <TableCell>{detalhe.escola_nome}</TableCell>
                                  <TableCell>{detalhe.modalidade_nome}</TableCell>
                                  <TableCell>{detalhe.cardapio_nome}</TableCell>
                                  <TableCell>{detalhe.refeicao_nome}</TableCell>
                                  <TableCell align="right">{detalhe.quantidade_alunos}</TableCell>
                                  <TableCell align="right">{detalhe.frequencia_mensal}x</TableCell>
                                  <TableCell align="right">{detalhe.per_capita}g</TableCell>
                                  <TableCell align="right">
                                    {formatarQuantidade(detalhe.quantidade_calculada)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionDetails>
                      </Accordion>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
}