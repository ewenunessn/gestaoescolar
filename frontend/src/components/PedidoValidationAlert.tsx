import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  Refresh,
  Build,
  Visibility
} from '@mui/icons-material';

// Interfaces para validação
interface ValidationIssue {
  tipo: 'CRITICO' | 'AVISO' | 'INFO';
  categoria: 'DADOS' | 'REFERENCIA' | 'CALCULO' | 'CONSISTENCIA';
  descricao: string;
  campo?: string;
  valorEsperado?: any;
  valorEncontrado?: any;
  sugestaoCorrecao?: string;
}

interface ValidationReport {
  pedidoId: number;
  numeroPedido: string;
  status: string;
  problemas: ValidationIssue[];
  score: number;
  recomendacoes: string[];
}

interface PedidoValidationAlertProps {
  pedidoId?: number;
  onValidationComplete?: (report: ValidationReport) => void;
  autoValidate?: boolean;
  showDetails?: boolean;
}

const PedidoValidationAlert: React.FC<PedidoValidationAlertProps> = ({
  pedidoId,
  onValidationComplete,
  autoValidate = false,
  showDetails = true
}) => {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fixingIssues, setFixingIssues] = useState(false);

  // Executar validação
  const validatePedido = async () => {
    if (!pedidoId) return;

    setLoading(true);
    try {
      // Chamar API de verificação de integridade
      const response = await fetch(`/api/pedidos-modernos/${pedidoId}/integrity-check`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const validationReport = await response.json();
        setReport(validationReport.data);
        onValidationComplete?.(validationReport.data);
      } else {
        console.error('Erro ao validar pedido:', response.statusText);
      }
    } catch (error) {
      console.error('Erro ao validar pedido:', error);
    } finally {
      setLoading(false);
    }
  };

  // Tentar corrigir problemas automaticamente
  const autoFixIssues = async () => {
    if (!pedidoId || !report) return;

    setFixingIssues(true);
    try {
      const response = await fetch(`/api/pedidos-modernos/${pedidoId}/auto-fix`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Correção automática:', result);
        
        // Revalidar após correção
        await validatePedido();
      }
    } catch (error) {
      console.error('Erro na correção automática:', error);
    } finally {
      setFixingIssues(false);
    }
  };

  // Validação automática na montagem
  useEffect(() => {
    if (autoValidate && pedidoId) {
      validatePedido();
    }
  }, [pedidoId, autoValidate]);

  // Obter ícone baseado no tipo de problema
  const getIssueIcon = (tipo: ValidationIssue['tipo']) => {
    switch (tipo) {
      case 'CRITICO':
        return <Error color="error" />;
      case 'AVISO':
        return <Warning color="warning" />;
      case 'INFO':
        return <Info color="info" />;
      default:
        return <Info />;
    }
  };

  // Obter cor baseada no score
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  // Obter severidade do alerta baseada no score
  const getAlertSeverity = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  // Contar problemas por tipo
  const countIssuesByType = (problemas: ValidationIssue[]) => {
    return problemas.reduce((acc, problema) => {
      acc[problema.tipo] = (acc[problema.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <CircularProgress size={24} />
        <Typography>Validando integridade do pedido...</Typography>
      </Box>
    );
  }

  if (!report) {
    return (
      <Box sx={{ p: 2 }}>
        <Button
          startIcon={<Refresh />}
          onClick={validatePedido}
          variant="outlined"
          size="small"
        >
          Validar Integridade
        </Button>
      </Box>
    );
  }

  const { problemas, score, recomendacoes } = report;
  const issueCounts = countIssuesByType(problemas);
  const hasIssues = problemas.length > 0;

  return (
    <>
      <Alert 
        severity={getAlertSeverity(score)}
        sx={{ mb: 2 }}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {hasIssues && (
              <Button
                size="small"
                startIcon={<Build />}
                onClick={autoFixIssues}
                disabled={fixingIssues}
                color="inherit"
              >
                {fixingIssues ? 'Corrigindo...' : 'Corrigir'}
              </Button>
            )}
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={validatePedido}
              color="inherit"
            >
              Revalidar
            </Button>
            {showDetails && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                color="inherit"
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </Box>
        }
      >
        <AlertTitle>
          Integridade do Pedido - Score: {score}/100
        </AlertTitle>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={score}
            color={getScoreColor(score)}
            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
          />
          <Typography variant="body2" sx={{ minWidth: 50 }}>
            {score}%
          </Typography>
        </Box>

        {hasIssues ? (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {issueCounts.CRITICO && (
              <Chip
                icon={<Error />}
                label={`${issueCounts.CRITICO} Críticos`}
                color="error"
                size="small"
              />
            )}
            {issueCounts.AVISO && (
              <Chip
                icon={<Warning />}
                label={`${issueCounts.AVISO} Avisos`}
                color="warning"
                size="small"
              />
            )}
            {issueCounts.INFO && (
              <Chip
                icon={<Info />}
                label={`${issueCounts.INFO} Informações`}
                color="info"
                size="small"
              />
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            <Typography>Nenhum problema encontrado</Typography>
          </Box>
        )}
      </Alert>

      {/* Detalhes expandidos */}
      <Collapse in={expanded}>
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          {problemas.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Problemas Encontrados
              </Typography>
              
              <List dense>
                {problemas.map((problema, index) => (
                  <ListItem key={index} sx={{ pl: 0 }}>
                    <ListItemIcon>
                      {getIssueIcon(problema.tipo)}
                    </ListItemIcon>
                    <ListItemText
                      primary={problema.descricao}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Categoria: {problema.categoria}
                          </Typography>
                          {problema.campo && (
                            <Typography variant="caption" display="block">
                              Campo: {problema.campo}
                            </Typography>
                          )}
                          {problema.valorEsperado !== undefined && (
                            <Typography variant="caption" display="block">
                              Esperado: {problema.valorEsperado} | Encontrado: {problema.valorEncontrado}
                            </Typography>
                          )}
                          {problema.sugestaoCorrecao && (
                            <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                              Sugestão: {problema.sugestaoCorrecao}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {recomendacoes.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>
                Recomendações
              </Typography>
              
              <List dense>
                {recomendacoes.map((recomendacao, index) => (
                  <ListItem key={index} sx={{ pl: 0 }}>
                    <ListItemIcon>
                      <CheckCircle color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={recomendacao} />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              startIcon={<Visibility />}
              onClick={() => setDetailsOpen(true)}
              size="small"
              variant="outlined"
            >
              Ver Relatório Completo
            </Button>
          </Box>
        </Box>
      </Collapse>

      {/* Dialog com relatório completo */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Relatório de Integridade - Pedido #{report.numeroPedido}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Resumo
            </Typography>
            <Typography>Status: {report.status}</Typography>
            <Typography>Score de Integridade: {score}/100</Typography>
            <Typography>Total de Problemas: {problemas.length}</Typography>
          </Box>

          {problemas.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Detalhes dos Problemas
              </Typography>
              {problemas.map((problema, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {getIssueIcon(problema.tipo)}
                    <Chip label={problema.tipo} size="small" />
                    <Chip label={problema.categoria} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {problema.descricao}
                  </Typography>
                  {problema.sugestaoCorrecao && (
                    <Typography variant="body2" color="text.secondary">
                      💡 {problema.sugestaoCorrecao}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {recomendacoes.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Recomendações
              </Typography>
              {recomendacoes.map((recomendacao, index) => (
                <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                  • {recomendacao}
                </Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Fechar
          </Button>
          <Button
            startIcon={<Build />}
            onClick={autoFixIssues}
            disabled={fixingIssues || problemas.length === 0}
            variant="contained"
          >
            {fixingIssues ? 'Corrigindo...' : 'Corrigir Problemas'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PedidoValidationAlert;