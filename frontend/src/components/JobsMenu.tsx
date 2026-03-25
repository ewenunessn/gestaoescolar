import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  LinearProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  PlaylistPlay as JobsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { listarJobs, Job } from '../services/planejamentoCompras';

export default function JobsMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    carregarJobs();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const carregarJobs = async () => {
    setLoading(true);
    try {
      const data = await listarJobs();
      setJobs(data);
    } catch (error) {
      console.error('Erro ao carregar jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Polling para jobs em processamento
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      const temJobProcessando = jobs.some(
        (job) => job.status === 'processando' || job.status === 'pendente'
      );
      if (temJobProcessando) {
        carregarJobs();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [open, jobs]);

  const jobsAtivos = jobs.filter(
    (job) => job.status === 'processando' || job.status === 'pendente'
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
        return <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />;
      case 'erro':
        return <ErrorIcon fontSize="small" sx={{ color: 'error.main' }} />;
      case 'processando':
        return <HourglassIcon fontSize="small" sx={{ color: 'primary.main' }} />;
      default:
        return <HourglassIcon fontSize="small" sx={{ color: 'warning.main' }} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'Concluído';
      case 'erro':
        return 'Erro';
      case 'processando':
        return 'Processando';
      case 'pendente':
        return 'Pendente';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'primary' | 'warning' | 'default' => {
    switch (status) {
      case 'concluido':
        return 'success';
      case 'erro':
        return 'error';
      case 'processando':
        return 'primary';
      case 'pendente':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'gerar_pedido':
        return 'Gerar Pedido';
      case 'gerar_guias':
        return 'Gerar Guias';
      default:
        return tipo;
    }
  };

  const formatarTempo = (dataStr: string) => {
    const data = new Date(dataStr);
    const agora = new Date();
    const diff = Math.floor((agora.getTime() - data.getTime()) / 1000);

    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    return `${Math.floor(diff / 86400)}d atrás`;
  };

  return (
    <>
      <Tooltip title="Processos em andamento">
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          <Badge badgeContent={jobsAtivos.length} color="primary">
            <JobsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            mt: 1,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Processos
          </Typography>
          <IconButton size="small" onClick={carregarJobs} disabled={loading}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider />

        {loading && jobs.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Carregando processos...
            </Typography>
          </Box>
        ) : jobs.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <JobsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Nenhum processo encontrado
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {jobs.map((job) => (
              <MenuItem
                key={job.id}
                sx={{
                  py: 1.5,
                  px: 2,
                  display: 'block',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ mt: 0.5 }}>{getStatusIcon(job.status)}</Box>
                  
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getTipoLabel(job.tipo)}
                      </Typography>
                      <Chip
                        label={getStatusLabel(job.status)}
                        size="small"
                        color={getStatusColor(job.status)}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>

                    {job.status === 'processando' && (
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Progresso
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {job.progresso}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={job.progresso}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    )}

                    {job.status === 'concluido' && job.resultado && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {job.tipo === 'gerar_pedido'
                          ? `Pedido ${job.resultado.numero} • ${job.resultado.total_itens} itens`
                          : `${job.resultado.total_produtos} produtos • ${job.resultado.total_escolas} escolas`}
                      </Typography>
                    )}

                    {job.status === 'erro' && job.erro && (
                      <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                        {job.erro}
                      </Typography>
                    )}

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {formatarTempo(job.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Box>
        )}
      </Menu>
    </>
  );
}
