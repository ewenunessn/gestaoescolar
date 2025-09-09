import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  Visibility,
  Refresh,
  ArrowBack,
  Delete
} from "@mui/icons-material";
import {
  getAlertas,
  atualizarAlertas,
  resolverAlerta,
  formatarData,
  getNivelAlertaColor,
  type AlertaEstoque
} from "../services/estoqueModernoService";
import { useToast } from "../hooks/useToast";

const EstoqueAlertas: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, warning } = useToast();
  
  // Estados
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [apenasNaoResolvidos, setApenasNaoResolvidos] = useState(true);
  
  // Modal de confirmação
  const [modalResolver, setModalResolver] = useState<{
    aberto: boolean;
    alerta: AlertaEstoque | null;
  }>({ aberto: false, alerta: null });

  useEffect(() => {
    carregarAlertas();
  }, [apenasNaoResolvidos]);

  const carregarAlertas = async () => {
    try {
      setLoading(true);
      const alertasData = await getAlertas(apenasNaoResolvidos);
      setAlertas(alertasData);
    } catch (error) {
      console.error("Erro ao carregar alertas:", error);
      error("Erro ao carregar alertas");
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarAlertas = async () => {
    try {
      await atualizarAlertas();
      await carregarAlertas();
      success("Alertas atualizados com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar alertas:", error);
      error("Erro ao atualizar alertas");
    }
  };

  const handleResolverAlerta = async (alerta: AlertaEstoque) => {
    setModalResolver({ aberto: true, alerta });
  };

  const confirmarResolverAlerta = async () => {
    if (!modalResolver.alerta) return;
    
    try {
      await resolverAlerta(modalResolver.alerta.id);
      setModalResolver({ aberto: false, alerta: null });
      await carregarAlertas();
      success("Alerta marcado como resolvido");
    } catch (error) {
      console.error("Erro ao resolver alerta:", error);
      error("Erro ao resolver alerta");
    }
  };

  // Filtrar alertas
  const alertasFiltrados = alertas.filter(alerta => {
    const matchTipo = filtroTipo === "" || alerta.tipo === filtroTipo;
    const matchNivel = filtroNivel === "" || alerta.nivel === filtroNivel;
    return matchTipo && matchNivel;
  });

  // Calcular estatísticas
  const estatisticas = {
    total: alertas.length,
    criticos: alertas.filter(a => a.nivel === 'critical').length,
    avisos: alertas.filter(a => a.nivel === 'warning').length,
    informativos: alertas.filter(a => a.nivel === 'info').length,
    vencidos: alertas.filter(a => a.tipo === 'vencido').length,
    vencimentoProximo: alertas.filter(a => a.tipo === 'vencimento_proximo').length,
    estoqueBaixo: alertas.filter(a => a.tipo === 'estoque_baixo').length
  };

  const getIconeNivel = (nivel: string) => {
    switch (nivel) {
      case 'critical':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'info':
        return <Info color="info" />;
      default:
        return <Info />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'vencimento_proximo':
        return 'Vencimento Próximo';
      case 'vencido':
        return 'Vencido';
      case 'estoque_baixo':
        return 'Estoque Baixo';
      case 'estoque_zerado':
        return 'Estoque Zerado';
      default:
        return tipo;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Cabeçalho */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate("/estoque-moderno")}>
          <ArrowBack />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Alertas de Estoque
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitoramento e gestão de alertas do sistema de estoque
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant={apenasNaoResolvidos ? "contained" : "outlined"}
            onClick={() => setApenasNaoResolvidos(!apenasNaoResolvidos)}
          >
            {apenasNaoResolvidos ? "Mostrar Todos" : "Apenas Pendentes"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleAtualizarAlertas}
          >
            Atualizar
          </Button>
        </Box>
      </Box>

      {/* Cards de estatísticas */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Error color="error" />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {estatisticas.criticos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Críticos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Warning color="warning" />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {estatisticas.avisos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avisos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Info color="info" />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {estatisticas.informativos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Informativos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold">
                {estatisticas.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total de Alertas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alertas críticos em destaque */}
      {estatisticas.criticos > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {estatisticas.criticos} alertas críticos requerem atenção imediata!
          </Typography>
          <Typography variant="body2">
            {estatisticas.vencidos > 0 && `${estatisticas.vencidos} produtos vencidos. `}
            Verifique os itens marcados como críticos na tabela abaixo.
          </Typography>
        </Alert>
      )}

      {/* Filtros */}
      <Box display="flex" gap={2} mb={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Tipo de Alerta</InputLabel>
          <Select
            value={filtroTipo}
            label="Tipo de Alerta"
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="vencimento_proximo">Vencimento Próximo</MenuItem>
            <MenuItem value="vencido">Vencido</MenuItem>
            <MenuItem value="estoque_baixo">Estoque Baixo</MenuItem>
            <MenuItem value="estoque_zerado">Estoque Zerado</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Nível</InputLabel>
          <Select
            value={filtroNivel}
            label="Nível"
            onChange={(e) => setFiltroNivel(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="critical">Crítico</MenuItem>
            <MenuItem value="warning">Aviso</MenuItem>
            <MenuItem value="info">Informativo</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Tabela de alertas */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Nível</TableCell>
              <TableCell>Produto</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Lote</TableCell>
              <TableCell>Data</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alertasFiltrados.map((alerta) => (
              <TableRow key={alerta.id}>
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    {getIconeNivel(alerta.nivel)}
                    <Chip
                      label={alerta.nivel.toUpperCase()}
                      size="small"
                      color={getNivelAlertaColor(alerta.nivel) as any}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {alerta.produto_nome}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getTipoLabel(alerta.tipo)}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {alerta.titulo}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {alerta.descricao}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {alerta.lote || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatarData(alerta.data_alerta)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" gap={1}>
                    <Tooltip title="Ver Produto">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/estoque-moderno/produtos/${alerta.produto_id}/lotes`)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    {!alerta.resolvido && (
                      <Tooltip title="Marcar como Resolvido">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleResolverAlerta(alerta)}
                        >
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {alertasFiltrados.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            {filtroTipo || filtroNivel ? 
              "Nenhum alerta encontrado com os filtros aplicados." : 
              apenasNaoResolvidos ? 
                "Nenhum alerta pendente. Parabéns!" :
                "Nenhum alerta registrado."
            }
          </Typography>
        </Box>
      )}

      {/* Modal de confirmação */}
      <Dialog 
        open={modalResolver.aberto} 
        onClose={() => setModalResolver({ aberto: false, alerta: null })}
      >
        <DialogTitle>Resolver Alerta</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja marcar este alerta como resolvido?
          </Typography>
          {modalResolver.alerta && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="subtitle2" fontWeight="bold">
                {modalResolver.alerta.titulo}
              </Typography>
              <Typography variant="body2">
                {modalResolver.alerta.descricao}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalResolver({ aberto: false, alerta: null })}>
            Cancelar
          </Button>
          <Button onClick={confirmarResolverAlerta} variant="contained" color="success">
            Resolver
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EstoqueAlertas;