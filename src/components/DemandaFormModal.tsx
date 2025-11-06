import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Alert,
  IconButton,
  Autocomplete
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import demandasService from '../services/demandas';
import { listarEscolas } from '../services/escolas';

interface DemandaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  demandaId?: number;
}

export default function DemandaFormModal({ open, onClose, onSuccess, demandaId }: DemandaFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [escolas, setEscolas] = useState<any[]>([]);

  const [formData, setFormData] = useState<{
    escola_solicitante: string;
    numero_oficio: string;
    data_solicitacao: string;
    objeto: string;
    descricao_itens: string;
    observacoes: string;
  }>({
    escola_solicitante: '',
    numero_oficio: '',
    data_solicitacao: new Date().toISOString().split('T')[0],
    objeto: '',
    descricao_itens: '',
    observacoes: ''
  });

  useEffect(() => {
    if (open) {
      carregarEscolas();
      if (demandaId) {
        carregarDemanda();
      } else {
        resetForm();
      }
    }
  }, [open, demandaId]);

  const resetForm = () => {
    setFormData({
      escola_solicitante: '',
      numero_oficio: '',
      data_solicitacao: new Date().toISOString().split('T')[0],
      objeto: '',
      descricao_itens: '',
      observacoes: ''
    });
    setErro('');
  };

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
      const demanda = await demandasService.buscarPorId(demandaId!);
      
      // Converter a data para o formato YYYY-MM-DD esperado pelo input date
      const dataFormatada = demanda.data_solicitacao 
        ? new Date(demanda.data_solicitacao).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      console.log('Data original:', demanda.data_solicitacao);
      console.log('Data formatada:', dataFormatada);
      
      setFormData({
        escola_solicitante: demanda.escola_nome || '',
        numero_oficio: demanda.numero_oficio,
        data_solicitacao: dataFormatada,
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

      // Encontrar a escola selecionada ou usar o texto digitado
      const escolaSelecionada = escolas.find(escola => escola.nome === formData.escola_solicitante);
      
      const dados = {
        escola_id: escolaSelecionada?.id || null,
        escola_nome: formData.escola_solicitante,
        numero_oficio: formData.numero_oficio,
        data_solicitacao: formData.data_solicitacao,
        objeto: formData.objeto,
        descricao_itens: formData.descricao_itens,
        observacoes: formData.observacoes
      };

      if (demandaId) {
        await demandasService.atualizar(demandaId, dados);
      } else {
        await demandasService.criar(dados);
      }

      onSuccess();
      onClose();
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

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {demandaId ? 'Editar Demanda' : 'Nova Demanda'}
        <IconButton onClick={handleClose} disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {erro && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
              {erro}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={escolas.map(escola => escola.nome)}
                value={formData.escola_solicitante}
                onChange={(_, newValue) => {
                  handleChange('escola_solicitante', newValue || '');
                }}
                onInputChange={(_, newInputValue) => {
                  handleChange('escola_solicitante', newInputValue);
                }}
                disabled={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Escola Solicitante"
                    required
                    placeholder="Digite ou selecione uma escola"
                    helperText="Você pode digitar qualquer nome ou selecionar uma escola da lista"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Número do Ofício"
                value={formData.numero_oficio}
                onChange={(e) => handleChange('numero_oficio', e.target.value)}
                placeholder="Ex: 002/2025"
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleClose}
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
        </DialogActions>
      </form>
    </Dialog>
  );
}