import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  Category as CategoryIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import {
  gerarRelatorioAlunosModalidades,
  listarEscolas,
  RelatorioAlunosModalidadesFiltros,
} from "../../../services/escolas";
import { modalidadeService } from "../../../services/modalidades";

interface Escola {
  id: number;
  nome: string;
  ativo?: boolean;
}

interface Modalidade {
  id: number;
  nome: string;
  ativo?: boolean;
}

interface RelatorioAlunosModalidadesData {
  data_referencia: string;
  linhas: Array<{
    escola_id: number;
    escola_nome: string;
    modalidade_id: number;
    modalidade_nome: string;
    quantidade_alunos: number;
    vigente_de: string;
  }>;
  por_escola: Array<{
    escola_id: number;
    escola_nome: string;
    total_alunos: number;
    total_modalidades: number;
  }>;
  por_modalidade: Array<{
    modalidade_id: number;
    modalidade_nome: string;
    total_alunos: number;
    total_escolas: number;
  }>;
  total_geral: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(value || 0);
const formatDate = (value?: string) => {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

export default function RelatorioAlunosModalidades() {
  const navigate = useNavigate();
  const [dataReferencia, setDataReferencia] = useState(todayIso());
  const [escolaAtivo, setEscolaAtivo] = useState<'true' | 'false' | 'todas'>('true');
  const [escolaId, setEscolaId] = useState("");
  const [modalidadeId, setModalidadeId] = useState("");
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioAlunosModalidadesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const filtros = useMemo<RelatorioAlunosModalidadesFiltros>(() => ({
    data_referencia: dataReferencia,
    escola_ativo: escolaAtivo,
    escola_id: escolaId || undefined,
    modalidade_id: modalidadeId || undefined,
  }), [dataReferencia, escolaAtivo, escolaId, modalidadeId]);

  const escolasFiltradas = useMemo(() => {
    if (escolaAtivo === 'true') return escolas.filter((escola) => escola.ativo !== false);
    if (escolaAtivo === 'false') return escolas.filter((escola) => escola.ativo === false);
    return escolas;
  }, [escolas, escolaAtivo]);

  const carregarRelatorio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gerarRelatorioAlunosModalidades(filtros);
      setRelatorio(data);
    } catch (err) {
      setError("Erro ao carregar relatorio de alunos");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    let mounted = true;

    async function carregarBase() {
      try {
        const [escolasData, modalidadesData] = await Promise.all([
          listarEscolas(),
          modalidadeService.listar(),
        ]);

        if (!mounted) return;
        setEscolas(Array.isArray(escolasData) ? escolasData : []);
        setModalidades(Array.isArray(modalidadesData) ? modalidadesData.filter((m: Modalidade) => m.ativo !== false) : []);
      } catch {
        if (mounted) setError("Erro ao carregar filtros");
      }
    }

    carregarBase();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    carregarRelatorio();
  }, [carregarRelatorio]);

  useEffect(() => {
    if (escolaId && !escolasFiltradas.some((escola) => String(escola.id) === escolaId)) {
      setEscolaId("");
    }
  }, [escolaId, escolasFiltradas]);

  return (
    <Box sx={{ minHeight: "calc(100vh - 56px)", bgcolor: "background.default" }}>
      <PageContainer>
        <PageHeader
          title="Relatorio de Alunos por Modalidade"
          subtitle="Totais por escola, por modalidade e relacao detalhada na data selecionada"
          onBack={() => navigate("/modalidades/gerenciar-alunos")}
          breadcrumbs={[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Modalidades", path: "/modalidades" },
            { label: "Relatorio de Alunos" },
          ]}
          action={
            <Button
              variant="contained"
              size="small"
              startIcon={<RefreshIcon fontSize="small" />}
              onClick={carregarRelatorio}
              disabled={loading}
              sx={{ borderRadius: 1, textTransform: "none" }}
            >
              Atualizar
            </Button>
          }
        />

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Card sx={{ borderRadius: 1, mb: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2}>
                <TextField
                  label="Data de referencia"
                  type="date"
                  value={dataReferencia}
                  onChange={(event) => setDataReferencia(event.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status da escola</InputLabel>
                  <Select value={escolaAtivo} label="Status da escola" onChange={(event) => setEscolaAtivo(event.target.value as 'true' | 'false' | 'todas')}>
                    <MenuItem value="true">Ativas</MenuItem>
                    <MenuItem value="todas">Todas</MenuItem>
                    <MenuItem value="false">Inativas</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Escola</InputLabel>
                  <Select value={escolaId} label="Escola" onChange={(event) => setEscolaId(event.target.value)}>
                    <MenuItem value="">Todas</MenuItem>
                    {escolasFiltradas.map((escola) => (
                      <MenuItem key={escola.id} value={String(escola.id)}>
                        {escola.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Modalidade</InputLabel>
                  <Select value={modalidadeId} label="Modalidade" onChange={(event) => setModalidadeId(event.target.value)}>
                    <MenuItem value="">Todas</MenuItem>
                    {modalidades.map((modalidade) => (
                      <MenuItem key={modalidade.id} value={String(modalidade.id)}>
                        {modalidade.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AssessmentIcon fontSize="small" />}
                  onClick={carregarRelatorio}
                  disabled={loading}
                  sx={{ borderRadius: 1, textTransform: "none", minHeight: 40 }}
                >
                  Gerar
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {loading && !relatorio ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 260 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 1 }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <PeopleIcon color="primary" />
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 0 }}>
                          Total geral
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {formatNumber(relatorio?.total_geral || 0)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 1 }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <SchoolIcon color="success" />
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 0 }}>
                          Escolas
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {formatNumber(relatorio?.por_escola.length || 0)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 1 }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <CategoryIcon color="info" />
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 0 }}>
                          Modalidades
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {formatNumber(relatorio?.por_modalidade.length || 0)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Card sx={{ borderRadius: 1 }}>
              <Tabs value={tab} onChange={(_, next) => setTab(next)} sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
                <Tab label="Por escola" />
                <Tab label="Por modalidade" />
                <Tab label="Relacao detalhada" />
              </Tabs>

              {tab === 0 && (
                <TableContainer sx={{ maxHeight: "52vh" }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Escola</TableCell>
                        <TableCell align="right">Modalidades</TableCell>
                        <TableCell align="right">Total de alunos</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(relatorio?.por_escola || []).map((row) => (
                        <TableRow key={row.escola_id} hover>
                          <TableCell>{row.escola_nome}</TableCell>
                          <TableCell align="right">{formatNumber(row.total_modalidades)}</TableCell>
                          <TableCell align="right">
                            <Chip size="small" label={formatNumber(row.total_alunos)} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {tab === 1 && (
                <TableContainer sx={{ maxHeight: "52vh" }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Modalidade</TableCell>
                        <TableCell align="right">Escolas</TableCell>
                        <TableCell align="right">Total de alunos</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(relatorio?.por_modalidade || []).map((row) => (
                        <TableRow key={row.modalidade_id} hover>
                          <TableCell>{row.modalidade_nome}</TableCell>
                          <TableCell align="right">{formatNumber(row.total_escolas)}</TableCell>
                          <TableCell align="right">
                            <Chip size="small" label={formatNumber(row.total_alunos)} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {tab === 2 && (
                <TableContainer sx={{ maxHeight: "52vh" }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Escola</TableCell>
                        <TableCell>Modalidade</TableCell>
                        <TableCell>Vigente desde</TableCell>
                        <TableCell align="right">Alunos</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(relatorio?.linhas || []).map((row) => (
                        <TableRow key={`${row.escola_id}-${row.modalidade_id}`} hover>
                          <TableCell>{row.escola_nome}</TableCell>
                          <TableCell>{row.modalidade_nome}</TableCell>
                          <TableCell>{formatDate(row.vigente_de)}</TableCell>
                          <TableCell align="right">{formatNumber(row.quantidade_alunos)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </>
        )}
      </PageContainer>
    </Box>
  );
}
