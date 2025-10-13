import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Grid,
  Alert
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Route as RouteIcon,
  Assignment as GuiaIcon
} from '@mui/icons-material';
import { guiaService } from '../../../services/guiaService';
import { rotaService } from '../services/rotaService';
import { RotaComEntregas } from '../types/rota';

interface FiltrosEntregaProps {
  onFiltroChange: (guiaId?: number, rotaId?: number) => void;
  filtroAtivo: { guiaId?: number; rotaId?: number };
}

export const FiltrosEntrega: React.FC<FiltrosEntregaProps> = ({ onFiltroChange, filtroAtivo }) => {
  const [guias, setGuias] = useState<any[]>([]);
  const [rotasComEntregas, setRotasComEntregas] = useState<RotaComEntregas[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    // Recarregar rotas quando a guia mudar
    if (filtroAtivo.guiaId) {
      carregarRotasComEntregas(filtroAtivo.guiaId);
    } else {
      carregarRotasComEntregas();
    }
  }, [filtroAtivo.guiaId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar guias abertas
      const guiasResponse = await guiaService.listarGuias();
      const guiasData = guiasResponse?.data || guiasResponse;
      const guiasAbertas = Array.isArray(guiasData) 
        ? guiasData.filter(g => g.status === 'aberta')
        : [];
      
      setGuias(guiasAbertas);
      
      // Carregar rotas com entregas
      await carregarRotasComEntregas();
      
    } catch (err) {
      console.error('Erro ao carregar dados dos filtros:', err);
      setError('Erro ao carregar dados dos filtros');
    } finally {
      setLoading(false);
    }
  };

  const carregarRotasComEntregas = async (guiaId?: number) => {
    try {
      const rotasData = await rotaService.listarRotasComEntregas(guiaId);
      setRotasComEntregas(rotasData);
    } catch (err) {
      console.error('Erro ao carregar rotas com entregas:', err);
    }
  };

  const handleGuiaChange = (guiaId: number | '') => {
    const novoGuiaId = guiaId === '' ? undefined : guiaId;
    onFiltroChange(novoGuiaId, undefined); // Reset rota quando mudar guia
  };

  const handleRotaChange = (rotaId: number | '') => {
    const novoRotaId = rotaId === '' ? undefined : rotaId;
    onFiltroChange(filtroAtivo.guiaId, novoRotaId);
  };

  const limparFiltros = () => {
    onFiltroChange(undefined, undefined);
  };

  const temFiltroAtivo = filtroAtivo.guiaId || filtroAtivo.rotaId;

  const guiaSelecionada = guias.find(g => g.id === filtroAtivo.guiaId);
  const rotaSelecionada = rotasComEntregas.find(r => r.id === filtroAtivo.rotaId);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FilterIcon color="primary" />
          <Typography variant="h6">
            Filtros de Entrega
          </Typography>
          {temFiltroAtivo && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={limparFiltros}
              color="error"
              variant="outlined"
            >
              Limpar Filtros
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Guia de Demanda</InputLabel>
              <Select
                value={filtroAtivo.guiaId || ''}
                onChange={(e) => handleGuiaChange(e.target.value as number | '')}
                label="Guia de Demanda"
                disabled={loading}
              >
                <MenuItem value="">
                  <em>Todas as guias</em>
                </MenuItem>
                {guias.map((guia) => (
                  <MenuItem key={guia.id} value={guia.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <GuiaIcon fontSize="small" />
                      {guia.mes}/{guia.ano}
                      {guia.observacao && ` - ${guia.observacao}`}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Rota de Entrega</InputLabel>
              <Select
                value={filtroAtivo.rotaId || ''}
                onChange={(e) => handleRotaChange(e.target.value as number | '')}
                label="Rota de Entrega"
                disabled={loading || rotasComEntregas.length === 0}
              >
                <MenuItem value="">
                  <em>Todas as rotas</em>
                </MenuItem>
                {rotasComEntregas.map((rota) => (
                  <MenuItem key={rota.id} value={rota.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: rota.cor
                        }}
                      />
                      <RouteIcon fontSize="small" />
                      {rota.nome}
                      <Chip
                        label={`${rota.total_escolas} escolas`}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {guiaSelecionada && (
                <Chip
                  label={`Guia: ${guiaSelecionada.mes}/${guiaSelecionada.ano}`}
                  color="primary"
                  size="small"
                  onDelete={() => handleGuiaChange('')}
                />
              )}
              {rotaSelecionada && (
                <Chip
                  label={`Rota: ${rotaSelecionada.nome}`}
                  color="secondary"
                  size="small"
                  onDelete={() => handleRotaChange('')}
                  sx={{
                    backgroundColor: rotaSelecionada.cor,
                    color: 'white',
                    '& .MuiChip-deleteIcon': {
                      color: 'white'
                    }
                  }}
                />
              )}
            </Box>
          </Grid>
        </Grid>

        {rotasComEntregas.length === 0 && filtroAtivo.guiaId && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Nenhuma rota de entrega foi planejada para esta guia ainda.
          </Alert>
        )}

        {temFiltroAtivo && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
            <Typography variant="body2" color="primary">
              <strong>Filtro ativo:</strong> Exibindo apenas {' '}
              {guiaSelecionada && `itens da guia ${guiaSelecionada.mes}/${guiaSelecionada.ano}`}
              {guiaSelecionada && rotaSelecionada && ' na '}
              {rotaSelecionada && `rota "${rotaSelecionada.nome}"`}
              {!guiaSelecionada && !rotaSelecionada && 'todos os itens'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};