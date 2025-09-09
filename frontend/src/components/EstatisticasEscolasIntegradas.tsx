import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Alert
} from '@mui/material';
import {
  School,
  Route,
  TrendingUp,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import { useEscolasIntegradas } from '../hooks/useEscolasIntegradas';

const EstatisticasEscolasIntegradas: React.FC = () => {
  const { estatisticas, escolasPorStatus, loading, error } = useEscolasIntegradas();

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Carregando estatísticas...</Typography>
        <LinearProgress sx={{ mt: 1 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Erro ao carregar dados: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        📊 Estatísticas Integradas - Escolas e Rotas
      </Typography>
      
      {/* Cards de estatísticas principais */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <School sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {estatisticas.total_escolas}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total de Escolas
              </Typography>
              <Chip
                size="small"
                label={`${estatisticas.escolas_ativas} ativas`}
                color="success"
                variant="outlined"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <Route sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {estatisticas.escolas_com_rota}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Com Rota Associada
              </Typography>
              <Chip
                size="small"
                label={`${estatisticas.percentual_cobertura}% cobertura`}
                color="info"
                variant="outlined"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {estatisticas.escolas_sem_rota}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sem Rota Associada
              </Typography>
              {estatisticas.escolas_sem_rota > 0 && (
                <Chip
                  size="small"
                  label="Requer atenção"
                  color="warning"
                  variant="outlined"
                  sx={{ mt: 1 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Barra de progresso da cobertura */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Cobertura de Rotas
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                Escolas com rota associada
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {estatisticas.percentual_cobertura}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={estatisticas.percentual_cobertura}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <CheckCircle sx={{ color: 'success.main', mb: 0.5 }} />
                <Typography variant="body2" fontWeight="bold">
                  {escolasPorStatus.com_rota.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Com Rota
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Warning sx={{ color: 'warning.main', mb: 0.5 }} />
                <Typography variant="body2" fontWeight="bold">
                  {escolasPorStatus.sem_rota.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sem Rota
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <School sx={{ color: 'text.secondary', mb: 0.5 }} />
                <Typography variant="body2" fontWeight="bold">
                  {escolasPorStatus.inativas.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Inativas
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Alertas e recomendações */}
      {estatisticas.escolas_sem_rota > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            ⚠️ Atenção necessária
          </Typography>
          <Typography variant="body2">
            Existem {estatisticas.escolas_sem_rota} escolas ativas sem rota associada. 
            Considere associá-las a rotas para melhorar a cobertura do sistema.
          </Typography>
        </Alert>
      )}

      {estatisticas.percentual_cobertura === 100 && (
        <Alert severity="success">
          <Typography variant="subtitle2" gutterBottom>
            ✅ Cobertura completa!
          </Typography>
          <Typography variant="body2">
            Todas as escolas ativas possuem rotas associadas. 
            O sistema está funcionando com cobertura total.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default EstatisticasEscolasIntegradas;