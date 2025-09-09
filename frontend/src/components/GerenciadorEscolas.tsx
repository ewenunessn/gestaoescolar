import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Chip
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add,
  School,
  LocationOn,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import { useEscolas, useEscolasActions, Escola } from '../contexts/EscolasContext';

// Componente de status customizado para a tabela
const StatusChip = React.memo(({ ativo }: { ativo: boolean }) => (
  <Chip
    label={ativo ? 'Ativa' : 'Inativa'}
    size="small"
    color={ativo ? 'success' : 'default'}
    variant="outlined"
    icon={ativo ? <CheckCircle /> : <Cancel />}
  />
));

const GerenciadorEscolas: React.FC = () => {
  const { escolas, loading, error } = useEscolas();
  const { adicionarEscola, atualizarEscola, limparError } = useEscolasActions();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [escolaEditando, setEscolaEditando] = useState<Escola | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    municipio: '',
    telefone: '',
    nome_gestor: '',
    administracao: '' as 'municipal' | 'estadual' | 'federal' | 'particular' | '',

    ativo: true
  });

  const handleAbrirDialog = useCallback((escola?: Escola) => {
    if (escola) {
      setEscolaEditando(escola);
      setFormData({
        nome: escola.nome,
        endereco: escola.endereco || '',
        municipio: escola.municipio || '',
        telefone: escola.telefone || '',
        nome_gestor: escola.nome_gestor || '',
        administracao: escola.administracao || '',

        ativo: escola.ativo
      });
    } else {
      setEscolaEditando(null);
      setFormData({
        nome: '',
        endereco: '',
        municipio: '',
        telefone: '',
        nome_gestor: '',
        administracao: '',

        ativo: true
      });
    }
    setDialogAberto(true);
  }, []);

  const handleFecharDialog = useCallback(() => {
    setDialogAberto(false);
    setEscolaEditando(null);
    setFormData({
      nome: '',
      endereco: '',
      municipio: '',
      telefone: '',
      nome_gestor: '',
      administracao: '',

      ativo: true
    });
  }, []);

  const handleSalvar = useCallback(async () => {
    if (!formData.nome.trim()) return;

    try {
      const dadosEscola = {
        nome: formData.nome.trim(),
        endereco: formData.endereco.trim() || undefined,
        municipio: formData.municipio.trim() || undefined,
        telefone: formData.telefone.trim() || undefined,
        nome_gestor: formData.nome_gestor.trim() || undefined,
        administracao: formData.administracao || undefined,

        ativo: formData.ativo
      };

      if (escolaEditando) {
        await atualizarEscola({
          ...escolaEditando,
          ...dadosEscola
        });
      } else {
        await adicionarEscola(dadosEscola);
      }

      handleFecharDialog();
    } catch (error) {
      console.error('Erro ao salvar escola:', error);
    }
  }, [formData, escolaEditando, atualizarEscola, adicionarEscola, handleFecharDialog]);

  const handleToggleStatus = useCallback(async (escola: Escola) => {
    try {
      await atualizarEscola({
        ...escola,
        ativo: !escola.ativo
      });
    } catch (error) {
      console.error('Erro ao alterar status da escola:', error);
    }
  }, [atualizarEscola]);

  // Memoizar cálculos de estatísticas para evitar recálculos desnecessários
  const estatisticas = useMemo(() => {
    const ativas = escolas.filter(e => e.ativo);
    const inativas = escolas.filter(e => !e.ativo);

    return {
      total: escolas.length,
      ativas: ativas.length,
      inativas: inativas.length,
      escolasAtivas: ativas,
      escolasInativas: inativas
    };
  }, [escolas]);

  // Configuração das colunas do DataGrid
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'nome',
      headerName: 'Nome da Escola',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <School color="primary" fontSize="small" />
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        </Box>
      )
    },
    {
      field: 'endereco',
      headerName: 'Endereço',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOn color="action" fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            {params.value || 'Não informado'}
          </Typography>
        </Box>
      )
    },
    {
      field: 'municipio',
      headerName: 'Município',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value || 'Não informado'}
        </Typography>
      )
    },
    {
      field: 'ativo',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StatusChip ativo={params.value} />
          <Switch
            checked={params.value}
            onChange={() => handleToggleStatus(params.row as Escola)}
            size="small"
            color="primary"
          />
        </Box>
      )
    }
  ], [handleToggleStatus]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <Typography>Carregando escolas...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header com estatísticas */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            🏫 Gerenciador de Escolas
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleAbrirDialog()}
          >
            Nova Escola
          </Button>
        </Box>

        {/* Estatísticas */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <School sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {estatisticas.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Escolas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {estatisticas.ativas}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Escolas Ativas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Cancel sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {estatisticas.inativas}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Escolas Inativas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={limparError}>
            {error}
          </Alert>
        )}
      </Box>

      {/* Tabela de escolas com paginação */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 Lista de Escolas
          </Typography>

          {estatisticas.total === 0 ? (
            <Alert severity="info">
              Nenhuma escola cadastrada. Clique em "Nova Escola" para começar.
            </Alert>
          ) : (
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={escolas}
                columns={columns}
                loading={loading}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25 }
                  }
                }}
                disableRowSelectionOnClick
                sx={{
                  '& .MuiDataGrid-row': {
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog para adicionar/editar escola */}
      <Dialog open={dialogAberto} onClose={handleFecharDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {escolaEditando ? `Editar ${escolaEditando.nome}` : 'Nova Escola'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Nome da Escola"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              fullWidth
              margin="normal"
              required
              placeholder="Ex: Escola Municipal João Silva"
            />
            <TextField
              label="Endereço"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              fullWidth
              margin="normal"
              placeholder="Ex: Rua das Flores, 123 - Centro"
            />
            <TextField
              label="Município"
              value={formData.municipio}
              onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
              fullWidth
              margin="normal"
              placeholder="Ex: São Paulo"
            />
            <TextField
              label="Telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              fullWidth
              margin="normal"
              placeholder="Ex: (11) 1234-5678"
            />
            <TextField
              label="Nome do Gestor"
              value={formData.nome_gestor}
              onChange={(e) => setFormData({ ...formData, nome_gestor: e.target.value })}
              fullWidth
              margin="normal"
              placeholder="Ex: João Silva"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Administração</InputLabel>
              <Select
                value={formData.administracao}
                onChange={(e) => setFormData({ ...formData, administracao: e.target.value as any })}
                label="Administração"
              >
                <MenuItem value="municipal">Municipal</MenuItem>
                <MenuItem value="estadual">Estadual</MenuItem>
                <MenuItem value="federal">Federal</MenuItem>
                <MenuItem value="particular">Particular</MenuItem>
              </Select>
            </FormControl>



            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                />
              }
              label="Escola Ativa"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharDialog}>
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            variant="contained"
            disabled={!formData.nome.trim()}
          >
            {escolaEditando ? 'Salvar' : 'Criar Escola'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GerenciadorEscolas;