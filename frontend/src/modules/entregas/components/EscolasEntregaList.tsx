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
  CircularProgress,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  School as SchoolIcon,
  LocalShipping as DeliveryIcon,
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { EscolaEntrega, EstatisticasEntregas } from '../types';
import { entregaService } from '../services/entregaService';

interface EscolasEntregaListProps {
  onEscolaSelect: (escola: EscolaEntrega) => void;
  filtros: { guiaId?: number; rotaId?: number };
}

export const EscolasEntregaList: React.FC<EscolasEntregaListProps> = ({ onEscolaSelect, filtros }) => {
  const [escolas, setEscolas] = useState<EscolaEntrega[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasEntregas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    carregarDados();
  }, [filtros]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [escolasData, estatisticasData] = await Promise.all([
        entregaService.listarEscolas(filtros.guiaId, filtros.rotaId),
        entregaService.obterEstatisticas(filtros.guiaId, filtros.rotaId)
      ]);
      
      setEscolas(escolasData);
      setEstatisticas(estatisticasData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados das entregas');
    } finally {
      setLoading(false);
    }
  };

  const escolasFiltradas = escolas.filter(escola =>
    escola.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  const getStatusColor = (percentual: number) => {
    if (percentual === 100) return 'success';
    if (percentual >= 50) return 'warning';
    return 'error';
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
      {/* Estatísticas Gerais */}
      {estatisticas && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <SchoolIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{estatisticas.total_escolas}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Escolas
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <DeliveryIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{estatisticas.total_itens}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de Itens
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckIcon color="success" />
                  <Box>
                    <Typography variant="h6">{estatisticas.itens_entregues}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Entregues
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <PendingIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{estatisticas.itens_pendentes}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pendentes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtro */}
      <TextField
        fullWidth
        placeholder="Buscar escola..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Lista de Escolas */}
      <Grid container spacing={2}>
        {escolasFiltradas.map((escola) => (
          <Grid item xs={12} md={6} lg={4} key={escola.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
              onClick={() => onEscolaSelect(escola)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" component="h3" sx={{ flexGrow: 1 }}>
                    {escola.nome}
                  </Typography>
                  <Chip
                    label={`${escola.percentual_entregue}%`}
                    color={getStatusColor(escola.percentual_entregue)}
                    size="small"
                  />
                </Box>

                {escola.endereco && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {escola.endereco}
                  </Typography>
                )}

                {escola.telefone && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    📞 {escola.telefone}
                  </Typography>
                )}

                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">
                      Progresso das Entregas
                    </Typography>
                    <Typography variant="body2">
                      {escola.itens_entregues}/{escola.total_itens}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={escola.percentual_entregue}
                    color={getStatusColor(escola.percentual_entregue)}
                  />
                </Box>

                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<DeliveryIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEscolaSelect(escola);
                  }}
                >
                  Ver Itens para Entrega
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {escolasFiltradas.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            {filtro ? 'Nenhuma escola encontrada com esse filtro' : 'Nenhuma escola com itens para entrega'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};