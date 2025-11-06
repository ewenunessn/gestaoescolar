import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import demandasService from '../services/demandas';
import { listarEscolas } from '../services/escolas';
import { Demanda } from '../types/demanda';

export default function DemandaForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [escolas, setEscolas] = useState<any[]>([]);

  const [formData, setFormData] = useState<{
    escola_id: string;
    numero_oficio: string;
    data_solicitacao: string;
    objeto: string;
    descricao_itens: string;
    observacoes: string;
  }>({
    escola_id: '',
    numero_oficio: '',
    data_solicitacao: new Date().toISOString().split('T')[0],
    objeto: '',
    descricao_itens: '',
    observacoes: ''
  });

  useEffect(() => {
    carregarEscolas();
    if (id) {
      carregarDemanda();
    }
  }, [id]);



  const carregarEscolas = async () => {
    try {
      const data = await listarEscolas();
      setEscolas(data);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
    }
  };

  const carregarDemanda = async () => {
    try {
      setLoading(true);
      const demanda = await demandasService.buscarPorId(Number(id));
      setFormData({
        escola_id: demanda.escola_id.toString(),
        numero_oficio: demanda.numero_oficio,
        data_solicitacao: demanda.data_solicitacao,
        objeto: demanda.objeto,
        descricao_itens: demanda.descricao_itens,
        observacoes: demanda.observacoes || ''
      });
    } catch (error: any) {
      console.error('Erro ao carregar demanda:', error);
      setErro('Erro ao carregar demanda');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setErro('');

      const dados = {
        ...formData,
        escola_id: Number(formData.escola_id)
      };

      if (id) {
        await demandasService.atualizar(Number(id), dados);
      } else {
        await demandasService.criar(dados);
      }

      navigate('/demandas');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setErro(error.response?.data?.message || 'Erro ao salvar demanda');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/demandas')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {id ? 'Editar Demanda' : 'Nova Demanda'}
        </Typography>
      </Box>

      {erro && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
          {erro}
        </Alert>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Campos básicos - sempre visíveis */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Escola Solicitante</InputLabel>
                  <Select
                    value={formData.escola_id}
                    onChange={(e) => handleChange('escola_id', e.target.value)}
                    label="Escola Solicitante"
                  >
                    {escolas.map((escola) => (
                      <MenuItem key={escola.id} value={escola.id}>
                        {escola.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Número do Ofício"
                  value={formData.numero_oficio}
                  onChange={(e) => handleChange('numero_oficio', e.target.value)}
                  placeholder="Ex: 002/2025"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Data Solicitação à SEMED"
                  value={formData.data_solicitacao}
                  onChange={(e) => handleChange('data_solicitacao', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Objeto"
                  value={formData.objeto}
                  onChange={(e) => handleChange('objeto', e.target.value)}
                  placeholder="Ex: Aquisição de móveis e eletrodomésticos"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={4}
                  label="Descrição de Itens"
                  value={formData.descricao_itens}
                  onChange={(e) => handleChange('descricao_itens', e.target.value)}
                  placeholder="Ex: Aquisição de Fogão Industrial 6 (seis) bocas"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Observações"
                  value={formData.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                  placeholder="Informações adicionais (opcional)"
                />
              </Grid>



              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/demandas')}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
