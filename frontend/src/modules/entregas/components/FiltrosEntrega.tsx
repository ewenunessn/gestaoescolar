import React, { useState, useEffect } from "react";
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
  Alert,
  TextField,
  FormControlLabel,
  Switch
} from "@mui/material";
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Route as RouteIcon,
  Assignment as GuiaIcon
} from "@mui/icons-material";
import { guiaService } from "../../../services/guiaService";
import { entregaService } from "../services/entregaService";
import { Rota } from "../types";

interface FiltrosEntregaProps {
  onFiltroChange: (filtros: {
    guiaId?: number;
    rotaId?: number;
    dataInicio?: string;
    dataFim?: string;
    somentePendentes?: boolean;
  }) => void;
  filtroAtivo: {
    guiaId?: number;
    rotaId?: number;
    dataInicio?: string;
    dataFim?: string;
    somentePendentes?: boolean;
  };
}

export const FiltrosEntrega: React.FC<FiltrosEntregaProps> = ({ onFiltroChange, filtroAtivo }) => {
  const [guias, setGuias] = useState<any[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar guias e rotas em paralelo
      const [guiasResponse, rotasData] = await Promise.all([
        guiaService.listarGuias(),
        entregaService.listarRotas()
      ]);

      // Processar guias
      const guiasData = guiasResponse?.data || guiasResponse;
      const guiasAbertas = Array.isArray(guiasData) 
        ? guiasData.filter((g: any) => g.status === 'aberta')
        : [];
      setGuias(guiasAbertas);
      
      // Processar rotas
      setRotas(rotasData);
      
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
      setError('Erro ao carregar dados iniciais');
    } finally {
      setLoading(false);
    }
  };

  const handleGuiaChange = (guiaId: number | '') => {
    const novoGuiaId = guiaId === '' ? undefined : guiaId;
    onFiltroChange({ ...filtroAtivo, guiaId: novoGuiaId, rotaId: undefined });
  };

  const handleRotaChange = (rotaId: number | '') => {
    const novoRotaId = rotaId === '' ? undefined : rotaId;
    onFiltroChange({ ...filtroAtivo, rotaId: novoRotaId });
  };

  const limparFiltros = () => {
    const hoje = new Date().toISOString().split('T')[0];
    onFiltroChange({ somentePendentes: false, dataFim: hoje, dataInicio: undefined });
  };

  const temFiltroAtivo = Boolean(
    filtroAtivo.guiaId ||
    filtroAtivo.rotaId ||
    filtroAtivo.dataInicio ||
    filtroAtivo.dataFim ||
    filtroAtivo.somentePendentes
  );

  const guiaSelecionada = guias.find(g => g.id === filtroAtivo.guiaId);
  const rotaSelecionada = rotas.find(r => r.id === filtroAtivo.rotaId);

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
                disabled={loading || rotas.length === 0}
              >
                <MenuItem value="">
                  <em>Todas as rotas</em>
                </MenuItem>
                {rotas.map((rota) => (
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
                      {rota.total_escolas && (
                        <Chip
                          label={`${rota.total_escolas} escolas`}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Data início"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={filtroAtivo.dataInicio || ''}
              onChange={(e) => onFiltroChange({ ...filtroAtivo, dataInicio: e.target.value || undefined })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Data fim"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={filtroAtivo.dataFim || ''}
              onChange={(e) => onFiltroChange({ ...filtroAtivo, dataFim: e.target.value || undefined })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(filtroAtivo.somentePendentes)}
                  onChange={(e) => onFiltroChange({ ...filtroAtivo, somentePendentes: e.target.checked })}
                />
              }
              label="Somente pendentes"
            />
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
              {filtroAtivo.dataInicio && (
                <Chip
                  label={`De: ${filtroAtivo.dataInicio.split('-').reverse().join('/')}`}
                  size="small"
                  onDelete={() => onFiltroChange({ ...filtroAtivo, dataInicio: undefined })}
                />
              )}
              {filtroAtivo.dataFim && (
                <Chip
                  label={`Até: ${filtroAtivo.dataFim.split('-').reverse().join('/')}`}
                  size="small"
                  onDelete={() => onFiltroChange({ ...filtroAtivo, dataFim: undefined })}
                />
              )}
              {filtroAtivo.somentePendentes && (
                <Chip
                  label="Pendentes"
                  color="warning"
                  size="small"
                  onDelete={() => onFiltroChange({ ...filtroAtivo, somentePendentes: false })}
                />
              )}
            </Box>
          </Grid>
        </Grid>

        {temFiltroAtivo && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
            <Typography variant="body2" color="primary">
              <strong>Filtro ativo:</strong> Exibindo apenas {' '}
              {guiaSelecionada && `itens da guia ${guiaSelecionada.mes}/${guiaSelecionada.ano}`}
              {guiaSelecionada && rotaSelecionada && ' na '}
              {rotaSelecionada && `rota "${rotaSelecionada.nome}"`}
              {(filtroAtivo.dataInicio || filtroAtivo.dataFim) && ' no período selecionado'}
              {filtroAtivo.somentePendentes && ' pendentes'}
              {!guiaSelecionada && !rotaSelecionada && !filtroAtivo.dataInicio && !filtroAtivo.dataFim && !filtroAtivo.somentePendentes && ' todos os itens'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
