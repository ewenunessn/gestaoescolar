import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Button,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Dashboard,
  Warning,
  Error,
  CheckCircle,
  Build,
  Refresh,
  CleaningServices,
  Assessment,
  Info,
  TrendingUp,
  Speed,
  BugReport
} from '@mui/icons-material';

import { pedidoIntegrityService, integrityUtils, SystemIntegrityReport } from '../services/pedidoIntegrityService';
import { useToast } from '../hooks/useToast';

interface PedidoIntegrityDashboardProps {
  onReportUpdate?: (report: SystemIntegrityReport) => void;
}

const PedidoIntegrityDashboard: React.FC<PedidoIntegrityDashboardProps> = ({
  onReportUpdate
}) => {
  const toast = useToast();
  const [report, setReport] = useState<SystemIntegrityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [cleanupDialog, setCleanupDialog] = useState(false);
  const [migrationDialog, setMigrationDialog] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [migrating, setMigrating] = useState(false);

  // Carregar relatório de integridade
  const loadIntegrityReport = async () => {
    setLoading(true);
    try {
      const systemReport = await pedidoIntegrityService.checkSystemIntegrity();
      setReport(systemReport);
      onReportUpdate?.(systemReport);

      // Carregar métricas de performance
      const metrics = await pedidoIntegrityService.getPerformanceMetrics();
      setPerformanceMetrics(metrics);

    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar relatório de integridade');
    } finally {
      setLoading(false);
    }
  };

  // Executar limpeza de dados órfãos
  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const result = await pedidoIntegrityService.cleanOrphanedData();
      
      toast.success(`Limpeza concluída: ${result.cleaned.pedidos} pedidos, ${result.cleaned.fornecedores} fornecedores, ${result.cleaned.itens} itens removidos`);
      
      setCleanupDialog(false);
      await loadIntegrityReport(); // Recarregar relatório
      
    } catch (error) {
      console.error('Erro na limpeza:', error);
      toast.error('Erro ao executar limpeza de dados');
    } finally {
      setCleaning(false);
    }
  };

  // Executar migração de integridade
  const handleMigration = async () => {
    setMigrating(true);
    try {
      const result = await pedidoIntegrityService.runIntegrityMigration();
      
      toast.success(`Migração concluída: ${result.details.join(', ')}`);
      
      setMigrationDialog(false);
      await loadIntegrityReport(); // Recarregar relatório
      
    } catch (error) {
      console.error('Erro na migração:', error);
      toast.error('Erro ao executar migração de integridade');
    } finally {
      setMigrating(false);
    }
  };

  // Carregar dados na inicialização
  useEffect(() => {
    loadIntegrityReport();
  }, []);

  if (loading && !report) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
        <Typography sx={{ ml: 2 }}>Carregando dashboard de integridade...</Typography>
      </Box>
    );
  }

  if (!report) {
    return (
      <Alert severity="error">
        <AlertTitle>Erro</AlertTitle>
        Não foi possível carregar o relatório de integridade.
        <Button onClick={loadIntegrityReport} sx={{ ml: 2 }}>
          Tentar Novamente
        </Button>
      </Alert>
    );
  }

  const { totalPedidos, pedidosComProblemas, estatisticas, recomendacoes } = report;
  const percentualProblemas = totalPedidos > 0 ? (pedidosComProblemas / totalPedidos) * 100 : 0;
  const scoreGeral = Math.max(0, 100 - percentualProblemas);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Dashboard sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Dashboard de Integridade
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<Refresh />}
            onClick={loadIntegrityReport}
            disabled={loading}
            variant="outlined"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
          
          <Button
            startIcon={<CleaningServices />}
            onClick={() => setCleanupDialog(true)}
            variant="outlined"
            color="warning"
          >
            Limpeza
          </Button>
          
          <Button
            startIcon={<Build />}
            onClick={() => setMigrationDialog(true)}
            variant="outlined"
            color="info"
          >
            Migração
          </Button>
        </Box>
      </Box>

      {/* Cards de Resumo */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Assessment sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {totalPedidos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total de Pedidos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <BugReport sx={{ fontSize: 40, color: 'error.main' }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'error.main' }}>
                    {pedidosComProblemas}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Com Problemas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUp sx={{ fontSize: 40, color: integrityUtils.getScoreColor(scoreGeral) === 'success' ? 'success.main' : integrityUtils.getScoreColor(scoreGeral) === 'warning' ? 'warning.main' : 'error.main' }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {scoreGeral.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Score Geral
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Speed sx={{ fontSize: 40, color: 'info.main' }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {performanceMetrics?.averageValidationTime || 0}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tempo Médio
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráfico de Score Geral */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Score de Integridade Geral
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={scoreGeral}
              color={integrityUtils.getScoreColor(scoreGeral)}
              sx={{ flexGrow: 1, height: 12, borderRadius: 6 }}
            />
            <Typography variant="h6" sx={{ minWidth: 60 }}>
              {scoreGeral.toFixed(1)}%
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary">
            {scoreGeral >= 90 ? '✅ Sistema íntegro' : 
             scoreGeral >= 70 ? '⚠️ Alguns problemas detectados' : 
             '🔴 Problemas críticos encontrados'}
          </Typography>
        </CardContent>
      </Card>

      {/* Estatísticas de Problemas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Distribuição de Problemas
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Error color="error" />
                    <Typography>Críticos</Typography>
                  </Box>
                  <Chip 
                    label={estatisticas.problemasCriticos} 
                    color="error" 
                    size="small" 
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning color="warning" />
                    <Typography>Avisos</Typography>
                  </Box>
                  <Chip 
                    label={estatisticas.problemasAvisos} 
                    color="warning" 
                    size="small" 
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Info color="info" />
                    <Typography>Informativos</Typography>
                  </Box>
                  <Chip 
                    label={estatisticas.problemasInfo} 
                    color="info" 
                    size="small" 
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Problemas Mais Comuns
              </Typography>
              
              {performanceMetrics?.commonIssues ? (
                <List dense>
                  {performanceMetrics.commonIssues.map((issue: any, index: number) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Chip 
                          label={`${issue.percentage}%`} 
                          size="small" 
                          color="primary" 
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={issue.categoria}
                        secondary={`${issue.count} ocorrências`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhum problema comum identificado
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recomendações */}
      {recomendacoes.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Recomendações
            </Typography>
            
            <List>
              {recomendacoes.map((recomendacao, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CheckCircle color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={recomendacao} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Limpeza */}
      <Dialog open={cleanupDialog} onClose={() => setCleanupDialog(false)}>
        <DialogTitle>Limpeza de Dados Órfãos</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Esta operação irá remover dados órfãos do sistema:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><CleaningServices /></ListItemIcon>
              <ListItemText primary="Pedidos sem usuário válido" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CleaningServices /></ListItemIcon>
              <ListItemText primary="Fornecedores sem referência válida" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CleaningServices /></ListItemIcon>
              <ListItemText primary="Itens sem produto ou contrato válido" />
            </ListItem>
          </List>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta operação não pode ser desfeita. Certifique-se de ter um backup.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCleanup} 
            disabled={cleaning}
            variant="contained"
            color="warning"
          >
            {cleaning ? 'Limpando...' : 'Executar Limpeza'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Migração */}
      <Dialog open={migrationDialog} onClose={() => setMigrationDialog(false)}>
        <DialogTitle>Migração de Integridade</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Esta operação irá executar correções automáticas:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><Build /></ListItemIcon>
              <ListItemText primary="Recalcular subtotais de itens" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Build /></ListItemIcon>
              <ListItemText primary="Recalcular valores de fornecedores" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Build /></ListItemIcon>
              <ListItemText primary="Recalcular valores totais de pedidos" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Build /></ListItemIcon>
              <ListItemText primary="Atualizar scores de integridade" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMigrationDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleMigration} 
            disabled={migrating}
            variant="contained"
            color="info"
          >
            {migrating ? 'Executando...' : 'Executar Migração'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PedidoIntegrityDashboard;