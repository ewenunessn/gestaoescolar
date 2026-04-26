import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
  Button,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassIcon,
} from '@mui/icons-material';
import { Job, buscarStatusJob as buscarStatusJobPadrao } from '../services/planejamentoCompras';

interface JobProgressModalProps {
  open: boolean;
  jobId: number | null;
  onClose: () => void;
  onComplete?: (resultado: any) => void;
  buscarStatus?: (jobId: number) => Promise<Job>;
}

export const JobProgressModal: React.FC<JobProgressModalProps> = ({
  open,
  jobId,
  onClose,
  onComplete,
  buscarStatus,
}) => {
  const [job, setJob] = useState<Job | null>(null);
  const [polling, setPolling] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const completedRef = useRef(false); // Flag para evitar múltiplas chamadas


  useEffect(() => {
    if (!open || !jobId) {
      setPolling(false);
      completedRef.current = false;
      return;
    }

    setPolling(true);
    setFetchError(null);
    completedRef.current = false;
    let intervalId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const fetchJobStatus = async () => {
      try {
        const jobData = await (buscarStatus ?? buscarStatusJobPadrao)(jobId);
        setJob(jobData);
        setFetchError(null);

        // Parar polling se job terminou
        if (jobData.status === 'concluido' || jobData.status === 'erro') {
          if (intervalId) clearInterval(intervalId);
          setPolling(false);

          if (jobData.status === 'concluido' && onComplete && !completedRef.current) {
            completedRef.current = true;
            onComplete(jobData.resultado);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar status do job:', error);
        setFetchError(error instanceof Error ? error.message : 'Erro ao buscar status do job');
        setPolling(false);
      }
    };

    // Buscar imediatamente
    fetchJobStatus();

    // Polling a cada 2 segundos
    intervalId = setInterval(() => {
      if (!isCancelled) {
        fetchJobStatus();
      }
    }, 2000);

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [open, jobId, buscarStatus]); // Removido polling das dependências

  const formatarTempo = (segundos?: number): string => {
    if (!segundos) return '--';
    
    if (segundos < 60) {
      return `${segundos}s`;
    }
    
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}m ${segs}s`;
  };

  const getStatusIcon = () => {
    if (fetchError) return <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />;
    if (!job) return <CircularProgress size={48} />;

    switch (job.status) {
      case 'concluido':
        return <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />;
      case 'erro':
        return <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />;
      case 'processando':
        return <CircularProgress size={48} />;
      default:
        return <HourglassIcon sx={{ fontSize: 48, color: 'warning.main' }} />;
    }
  };

  const getStatusText = () => {
    if (fetchError) return 'Erro ao consultar status';
    if (!job) return 'Carregando...';

    const isPedido = job.tipo === 'gerar_pedido';
    const isGuia = job.tipo === 'gerar_guias';

    switch (job.status) {
      case 'pendente':
        return 'Aguardando processamento...';
      case 'processando':
        if (isPedido) return 'Processando pedido...';
        if (isGuia) return 'Processando guias de demanda...';
        return 'Processando...';
      case 'concluido':
        if (isPedido) return 'Pedido gerado com sucesso!';
        if (isGuia) return 'Guias geradas com sucesso!';
        return 'Processamento concluído!';
      case 'erro':
        if (isPedido) return 'Erro ao gerar pedido';
        if (isGuia) return 'Erro ao gerar guias';
        return 'Erro no processamento';
      default:
        return job.status;
    }
  };

  const handleClose = () => {
    if (job?.status === 'processando') {
      // Não permitir fechar enquanto processa
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {job?.status === 'concluido' 
          ? 'Geração Concluída' 
          : job?.tipo === 'gerar_pedido' 
            ? 'Gerando Pedido' 
            : 'Gerando Guias de Demanda'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: 2 }}>
          {/* Ícone de status */}
          <Box>{getStatusIcon()}</Box>

          {/* Texto de status */}
          <Typography variant="h6" textAlign="center">
            {getStatusText()}
          </Typography>

          {/* Barra de progresso */}
          {job && job.status !== 'erro' && (
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Progresso
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {job.progresso}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={job.progresso} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          {/* Tempo estimado */}
          {job && job.status === 'processando' && job.tempo_estimado !== undefined && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <HourglassIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Tempo estimado: {formatarTempo(job.tempo_estimado)}
              </Typography>
            </Box>
          )}

          {fetchError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {fetchError}
            </Alert>
          )}

          {/* Resultado */}
          {job?.status === 'concluido' && job.resultado && (
            <Alert severity="success" sx={{ width: '100%' }}>
              {job.tipo === 'gerar_pedido' ? (
                <>
                  <Typography variant="body2" fontWeight="bold">
                    Pedido {job.resultado.numero} criado!
                  </Typography>
                  <Typography variant="body2">
                    {job.resultado.total_itens} itens • R$ {job.resultado.valor_total?.toFixed(2) || '0.00'}
                  </Typography>
                  {job.resultado.produtos_sem_contrato?.length > 0 && (
                    <Typography variant="caption" color="warning.main">
                      {job.resultado.produtos_sem_contrato.length} produtos sem contrato não incluídos
                    </Typography>
                  )}
                </>
              ) : (
                <>
                  <Typography variant="body2">
                    {job.resultado.total_produtos} produtos processados
                  </Typography>
                  <Typography variant="body2">
                    {job.resultado.total_itens} itens criados
                  </Typography>
                  <Typography variant="body2">
                    {job.resultado.total_escolas} escolas atendidas
                  </Typography>
                </>
              )}
            </Alert>
          )}

          {/* Erro */}
          {job?.status === 'erro' && (
            <Alert severity="error" sx={{ width: '100%' }}>
              <Typography variant="body2">{job.erro || 'Erro desconhecido'}</Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        {job?.status === 'processando' ? (
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, px: 2 }}>
            Aguarde o processamento terminar...
          </Typography>
        ) : (
          <Button onClick={handleClose} variant="contained">
            Fechar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
