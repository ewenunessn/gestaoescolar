import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Fab,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { agrupamentoMensalService } from '../../services/agrupamentoMensal';
import { AgrupamentoMensal, CriarAgrupamentoRequest } from '../../types/agrupamentoMensal';

interface ListaAgrupamentosProps {
  onSelectAgrupamento?: (agrupamento: AgrupamentoMensal) => void;
}

export const ListaAgrupamentos: React.FC<ListaAgrupamentosProps> = ({
  onSelectAgrupamento
}) => {
  const [agrupamentos, setAgrupamentos] = useState<AgrupamentoMensal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoAgrupamento, setNovoAgrupamento] = useState<CriarAgrupamentoRequest>({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    descricao: ''
  });
  const [criandoAgrupamento, setCriandoAgrupamento] = useState(false);

  useEffect(() => {
    carregarAgrupamentos();
  }, []);

  const carregarAgrupamentos = async () => {
    try {
      setLoading(true);
      setError(null);
      const dados = await agrupamentoMensalService.listarAgrupamentos();
      setAgrupamentos(dados);
    } catch (err) {
      setError('Erro ao carregar agrupamentos mensais');
      console.error('Erro ao carregar agrupamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarAgrupamento = async () => {
    try {
      setCriandoAgrupamento(true);
      const agrupamento = await agrupamentoMensalService.criarAgrupamento(novoAgrupamento);
      setAgrupamentos(prev => [agrupamento, ...prev]);
      setDialogOpen(false);
      setNovoAgrupamento({
        ano: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
        descricao: ''
      });
    } catch (err) {
      setError('Erro ao criar agrupamento mensal');
      console.error('Erro ao criar agrupamento:', err);
    } finally {
      setCriandoAgrupamento(false);
    }
  };



  const getStatusAgrupamento = (agrupamento: AgrupamentoMensal) => {
    const completos = agrupamento.fornecedores_completos || 0;
    const parciais = agrupamento.fornecedores_parciais || 0;
    const pendentes = agrupamento.fornecedores_pendentes || 0;
    
    if (completos === agrupamento.total_fornecedores) return 'COMPLETO';
    if (parciais > 0 || completos > 0) return 'PARCIAL';
    return 'PENDENTE';
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
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Agrupamentos Mensais
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Novo Agrupamento
        </Button>
      </Box>

      <Grid container spacing={3}>
        {agrupamentos.map((agrupamento) => {
          const status = getStatusAgrupamento(agrupamento);
          
          return (
            <Grid item xs={12} md={6} lg={4} key={agrupamento.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: onSelectAgrupamento ? 'pointer' : 'default',
                  '&:hover': onSelectAgrupamento ? {
                    boxShadow: 4,
                    transform: 'translateY(-2px)'
                  } : {}
                }}
                onClick={() => onSelectAgrupamento?.(agrupamento)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CalendarIcon color="primary" />
                      <Typography variant="h6">
                        {agrupamentoMensalService.getNomeMes(agrupamento.mes)} {agrupamento.ano}
                      </Typography>
                    </Box>
                    <Chip
                      label={agrupamentoMensalService.getStatusLabel(status)}
                      color={status === 'COMPLETO' ? 'success' : status === 'PARCIAL' ? 'warning' : 'error'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {agrupamento.descricao}
                  </Typography>

                  <Box mt={2}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Pedidos
                        </Typography>
                        <Typography variant="h6">
                          {agrupamento.total_pedidos}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Valor Total
                        </Typography>
                        <Typography variant="h6">
                          {agrupamentoMensalService.formatarValor(agrupamento.valor_total)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box mt={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Fornecedores ({agrupamento.total_fornecedores || 0})
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {(agrupamento.fornecedores_completos || 0) > 0 && (
                        <Chip
                          label={`${agrupamento.fornecedores_completos} Completos`}
                          color="success"
                          size="small"
                        />
                      )}
                      {(agrupamento.fornecedores_parciais || 0) > 0 && (
                        <Chip
                          label={`${agrupamento.fornecedores_parciais} Parciais`}
                          color="warning"
                          size="small"
                        />
                      )}
                      {(agrupamento.fornecedores_pendentes || 0) > 0 && (
                        <Chip
                          label={`${agrupamento.fornecedores_pendentes} Pendentes`}
                          color="error"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>



                  <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Criado em {agrupamentoMensalService.formatarData(agrupamento.data_criacao)}
                    </Typography>
                    {onSelectAgrupamento && (
                      <Tooltip title="Ver detalhes">
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAgrupamento(agrupamento);
                          }}
                        >
                          Detalhes
                        </Button>
                      </Tooltip>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {agrupamentos.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum agrupamento mensal encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Crie seu primeiro agrupamento para organizar pedidos por mês
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Criar Agrupamento
          </Button>
        </Box>
      )}

      {/* Dialog para criar novo agrupamento */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Novo Agrupamento Mensal</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Ano"
              type="number"
              value={novoAgrupamento.ano}
              onChange={(e) => setNovoAgrupamento(prev => ({
                ...prev,
                ano: parseInt(e.target.value)
              }))}
              fullWidth
            />
            <TextField
              label="Mês"
              select
              value={novoAgrupamento.mes}
              onChange={(e) => setNovoAgrupamento(prev => ({
                ...prev,
                mes: parseInt(e.target.value)
              }))}
              fullWidth
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                <MenuItem key={mes} value={mes}>
                  {agrupamentoMensalService.getNomeMes(mes)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Descrição (opcional)"
              value={novoAgrupamento.descricao}
              onChange={(e) => setNovoAgrupamento(prev => ({
                ...prev,
                descricao: e.target.value
              }))}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCriarAgrupamento}
            variant="contained"
            disabled={criandoAgrupamento}
          >
            {criandoAgrupamento ? <CircularProgress size={20} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};