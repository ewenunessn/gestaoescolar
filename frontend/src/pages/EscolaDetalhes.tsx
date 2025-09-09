import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
  Tooltip,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Save,
  Cancel,
  LocationOn,
  School,
  Phone,
  Person,
  Business,
  CheckCircle,
  People,
  Category,
  Delete,
  Close,
  Add,
  Inventory,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  buscarEscola,
  editarEscola,
  deletarEscola,
  listarEscolaModalidades,
  adicionarEscolaModalidade,
  editarEscolaModalidade,
  removerEscolaModalidade,
} from '../services/escolas';
import { listarModalidades } from '../services/modalidades';
import LocationSelector from '../components/LocationSelector';
import { useTheme, useMediaQuery } from '@mui/material';

interface Escola {
  id: number;
  nome: string;
  codigo?: string;
  codigo_acesso: string;
  endereco?: string;
  municipio?: string;
  endereco_maps?: string;
  telefone?: string;
  email?: string;
  nome_gestor?: string;
  administracao?: 'municipal' | 'estadual' | 'federal' | 'particular';
  ativo: boolean;
  total_alunos?: number;
}

interface Modalidade {
  id: number;
  nome: string;
  descricao?: string;
}

interface EscolaModalidade {
  id: number;
  escola_id: number;
  modalidade_id: number;
  quantidade_alunos: number;
  modalidade_nome?: string;
}

const EscolaDetalhesPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Estados principais
  const [escola, setEscola] = useState<Escola | null>(null);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [associacoes, setAssociacoes] = useState<EscolaModalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados de edição
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    codigo_acesso: '',
    endereco: '',
    municipio: '',
    endereco_maps: '',
    telefone: '',
    email: '',
    nome_gestor: '',
    administracao: '' as 'municipal' | 'estadual' | 'federal' | 'particular' | '',
    ativo: true,
  });
  const [salvando, setSalvando] = useState(false);

  // Estados do modal de modalidade
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModalidade, setEditingModalidade] = useState<EscolaModalidade | null>(null);
  const [modalidadeForm, setModalidadeForm] = useState({
    modalidade_id: '',
    alunos: '',
  });
  const [salvandoModalidade, setSalvandoModalidade] = useState(false);

  // Estado do modal de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [escolaData, modalidadesData, associacoesData] = await Promise.all([
        buscarEscola(Number(id)),
        listarModalidades(),
        listarEscolaModalidades(),
      ]);

      setEscola(escolaData);
      setFormData({
        nome: escolaData.nome,
        codigo: escolaData.codigo || '',
        codigo_acesso: escolaData.codigo_acesso,
        endereco: escolaData.endereco || '',
        municipio: escolaData.municipio || '',
        endereco_maps: escolaData.endereco_maps || '',
        telefone: escolaData.telefone || '',
        email: escolaData.email || '',
        nome_gestor: escolaData.nome_gestor || '',
        administracao: escolaData.administracao || '',
        ativo: escolaData.ativo,
      });
      setModalidades(modalidadesData);

      // Filtrar associações desta escola e adicionar nome da modalidade
      const associacoesEscola = associacoesData
        .filter((a: any) => a.escola_id === Number(id))
        .map((a: any) => ({
          ...a,
          modalidade_nome: modalidadesData.find((m: Modalidade) => m.id === a.modalidade_id)?.nome || 'Modalidade não encontrada'
        }));

      setAssociacoes(associacoesEscola);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados da escola');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Função para salvar edição da escola
  const handleSaveEscola = async () => {
    try {
      setSalvando(true);

      // Preparar dados para envio, convertendo string vazia para null
      const dadosParaEnvio = {
        ...formData,
        administracao: formData.administracao === '' ? null : formData.administracao,
      };

      const escolaAtualizada = await editarEscola(Number(id), dadosParaEnvio);
      setEscola(escolaAtualizada);
      setEditando(false);
      setSuccessMessage('Escola atualizada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar escola:', err);
      setError('Erro ao salvar alterações da escola');
    } finally {
      setSalvando(false);
    }
  };

  // Função para excluir escola
  const handleDeleteEscola = async () => {
    try {
      await deletarEscola(Number(id));
      navigate('/escolas');
    } catch (err: any) {
      console.error('Erro ao excluir escola:', err);
      setError('Erro ao excluir escola');
      setDeleteDialogOpen(false);
    }
  };

  // Funções do modal de modalidade
  const openModalidadeModal = (associacao?: EscolaModalidade) => {
    if (associacao) {
      setEditingModalidade(associacao);
      setModalidadeForm({
        modalidade_id: associacao.modalidade_id.toString(),
        alunos: associacao.quantidade_alunos.toString(),
      });
    } else {
      setEditingModalidade(null);
      setModalidadeForm({
        modalidade_id: '',
        alunos: '',
      });
    }
    setModalOpen(true);
  };

  const closeModalidadeModal = () => {
    setModalOpen(false);
    setEditingModalidade(null);
    setModalidadeForm({
      modalidade_id: '',
      alunos: '',
    });
  };

  const handleSaveModalidade = async () => {
    try {
      setSalvandoModalidade(true);

      if (editingModalidade) {
        await editarEscolaModalidade(editingModalidade.id, {
          quantidade_alunos: Number(modalidadeForm.alunos),
        });
        setSuccessMessage('Modalidade atualizada com sucesso!');
      } else {
        await adicionarEscolaModalidade(
          Number(id),
          Number(modalidadeForm.modalidade_id),
          Number(modalidadeForm.alunos)
        );
        setSuccessMessage('Modalidade adicionada com sucesso!');
      }

      closeModalidadeModal();
      await loadData(); // Recarregar dados
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar modalidade:', err);
      setError('Erro ao salvar modalidade');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSalvandoModalidade(false);
    }
  };

  const handleDeleteModalidade = async (associacaoId: number) => {
    try {
      await removerEscolaModalidade(associacaoId);
      setSuccessMessage('Modalidade removida com sucesso!');
      await loadData(); // Recarregar dados
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao remover modalidade:', err);
      setError('Erro ao remover modalidade');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Calcular total de alunos
  const totalAlunos = associacoes.reduce((total, assoc) => total + assoc.quantidade_alunos, 0);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6b7280' }}>
            Carregando dados da escola...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error && !escola) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            onClick={loadData}
            sx={{ mr: 2 }}
          >
            Tentar Novamente
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/escolas')}
          >
            Voltar
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Mensagens */}
      {successMessage && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}>
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </Box>
      )}

      {error && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Voltar">
              <IconButton
                onClick={() => navigate('/escolas')}
                sx={{
                  bgcolor: '#f3f4f6',
                  '&:hover': { bgcolor: '#e5e7eb' },
                }}
              >
                <ArrowBack />
              </IconButton>
            </Tooltip>

            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
                {escola?.nome}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={escola?.ativo ? <School /> : <Cancel />}
                  label={escola?.ativo ? 'Ativa' : 'Inativa'}
                  size="small"
                  sx={{
                    bgcolor: escola?.ativo ? '#dcfce7' : '#fee2e2',
                    color: escola?.ativo ? '#059669' : '#dc2626',
                    fontWeight: 600,
                  }}
                />

                <Chip
                  label={`${totalAlunos} alunos`}
                  size="small"
                  sx={{
                    bgcolor: '#f0f9ff',
                    color: '#0369a1',
                    fontWeight: 600,
                  }}
                />

                {escola?.codigo_acesso && (
                  <Chip
                    label={`Código: ${escola.codigo_acesso}`}
                    size="small"
                    sx={{
                      bgcolor: '#fef3c7',
                      color: '#d97706',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      letterSpacing: '0.05em',
                    }}
                  />
                )}

                {escola?.codigo && (
                  <Chip
                    label={escola.codigo}
                    size="small"
                    sx={{
                      bgcolor: '#e0e7ff',
                      color: '#4338ca',
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {editando ? (
              <>
                <Button
                  startIcon={<Cancel />}
                  onClick={() => {
                    setEditando(false);
                    setFormData({
                      nome: escola?.nome || '',
                      codigo: escola?.codigo || '',
                      codigo_acesso: escola?.codigo_acesso || '',
                      endereco: escola?.endereco || '',
                      municipio: escola?.municipio || '',
                      endereco_maps: escola?.endereco_maps || '',
                      telefone: escola?.telefone || '',
                      email: escola?.email || '',
                      nome_gestor: escola?.nome_gestor || '',
                      administracao: escola?.administracao || '',
                      ativo: escola?.ativo || true,
                    });
                  }}
                  variant="outlined"
                  disabled={salvando}
                >
                  Cancelar
                </Button>
                <Button
                  startIcon={<Save />}
                  onClick={handleSaveEscola}
                  variant="contained"
                  color="success"
                  disabled={salvando || !formData.nome.trim()}
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  startIcon={<Edit />}
                  onClick={() => setEditando(true)}
                  variant="contained"
                  color="primary"
                >
                  Editar
                </Button>
                <Button
                  startIcon={<Inventory />}
                  onClick={() => navigate(`/escolas/${id}/estoque`)}
                  variant="contained"
                  sx={{
                    bgcolor: '#059669',
                    '&:hover': { bgcolor: '#047857' }
                  }}
                >
                  Estoque
                </Button>
                <Button
                  startIcon={<Delete />}
                  onClick={() => setDeleteDialogOpen(true)}
                  variant="contained"
                  color="error"
                >
                  Excluir
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Card de Dados da Escola */}
        <Card sx={{ mb: 3 }}>
          <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              {escola?.nome}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip
                icon={escola?.ativo ? <CheckCircle /> : <Cancel />}
                label={escola?.ativo ? 'Ativa' : 'Inativa'}
                size="small"
                sx={{
                  bgcolor: escola?.ativo ? 'success.main' : 'error.main',
                  color: 'white',
                }}
              />
              <Typography variant="body2">
                {totalAlunos} alunos • {associacoes.length} modalidades
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <School color="primary" />
                  Informações Básicas
                </Typography>

                <TextField
                  label="Nome da Escola"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  fullWidth
                  margin="normal"
                  disabled={!editando}
                  variant={editando ? 'outlined' : 'filled'}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                  <TextField
                    label="Código da Escola"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    margin="normal"
                    disabled={!editando}
                    variant={editando ? 'outlined' : 'filled'}
                    placeholder="Ex: ESC001"
                    helperText="Código interno da escola (opcional)"
                  />
                  <TextField
                    label="Código de Acesso"
                    value={formData.codigo_acesso}
                    onChange={(e) => setFormData({ ...formData, codigo_acesso: e.target.value })}
                    margin="normal"
                    disabled={!editando}
                    variant={editando ? 'outlined' : 'filled'}
                    placeholder="123456"
                    helperText="6 dígitos para acesso do gestor"
                    inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontFamily: 'monospace',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                      }
                    }}
                  />
                </Box>

                <TextField
                  label="Endereço"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  fullWidth
                  margin="normal"
                  multiline
                  rows={2}
                  disabled={!editando}
                  variant={editando ? 'outlined' : 'filled'}
                />

                <TextField
                  label="Município"
                  value={formData.municipio}
                  onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                  fullWidth
                  margin="normal"
                  disabled={!editando}
                  variant={editando ? 'outlined' : 'filled'}
                />
              </Box>

              <Box>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person color="primary" />
                  Contato e Gestão
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                  <TextField
                    label="Telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    margin="normal"
                    disabled={!editando}
                    variant={editando ? 'outlined' : 'filled'}
                    placeholder="(11) 99999-9999"
                  />
                  <TextField
                    label="E-mail"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    margin="normal"
                    disabled={!editando}
                    variant={editando ? 'outlined' : 'filled'}
                    placeholder="escola@exemplo.com"
                    type="email"
                  />
                </Box>

                <TextField
                  label="Nome do Gestor(a)"
                  value={formData.nome_gestor}
                  onChange={(e) => setFormData({ ...formData, nome_gestor: e.target.value })}
                  fullWidth
                  margin="normal"
                  disabled={!editando}
                  variant={editando ? 'outlined' : 'filled'}
                />

                <FormControl fullWidth margin="normal" disabled={!editando}>
                  <InputLabel>Administração</InputLabel>
                  <Select
                    value={formData.administracao}
                    onChange={(e) => setFormData({ ...formData, administracao: e.target.value as any })}
                    label="Administração"
                    variant={editando ? 'outlined' : 'filled'}
                  >
                    <MenuItem value="">Selecione...</MenuItem>
                    <MenuItem value="municipal">Municipal</MenuItem>
                    <MenuItem value="estadual">Estadual</MenuItem>
                    <MenuItem value="federal">Federal</MenuItem>
                    <MenuItem value="particular">Particular</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Localização no Maps"
                  value={formData.endereco_maps}
                  onChange={(e) => setFormData({ ...formData, endereco_maps: e.target.value })}
                  fullWidth
                  margin="normal"
                  disabled={!editando}
                  variant={editando ? 'outlined' : 'filled'}
                  placeholder="https://maps.google.com/..."
                />

                {editando && (
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
                )}
              </Box>
            </Box>
          </Box>
        </Card>

        {/* Card de Modalidades */}
        <Card>
          <Box sx={{ p: 3, bgcolor: 'secondary.main', color: 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People />
                Modalidades Associadas
              </Typography>
              <Button
                startIcon={<Add />}
                onClick={() => openModalidadeModal()}
                variant="contained"
                color="primary"
                size="small"
              >
                Adicionar
              </Button>
            </Box>
          </Box>

          <Box sx={{ p: 3 }}>
            {associacoes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Category sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Nenhuma modalidade cadastrada
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Adicione modalidades para esta escola
                </Typography>
                <Button
                  startIcon={<Add />}
                  onClick={() => openModalidadeModal()}
                  variant="contained"
                  color="primary"
                >
                  Adicionar Modalidade
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Modalidade</TableCell>
                      <TableCell align="center">Quantidade de Alunos</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {associacoes.map((associacao) => (
                      <TableRow key={associacao.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Category color="primary" />
                            <Typography>
                              {associacao.modalidade_nome}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${associacao.quantidade_alunos} alunos`}
                            color="primary"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="Editar">
                              <IconButton
                                size="small"
                                onClick={() => openModalidadeModal(associacao)}
                                color="primary"
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remover">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteModalidade(associacao.id)}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Card>

        {/* Modal de Modalidade */}
        <Dialog open={modalOpen} onClose={closeModalidadeModal} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingModalidade ? 'Editar Modalidade' : 'Adicionar Modalidade'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              {!editingModalidade && (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Modalidade</InputLabel>
                  <Select
                    value={modalidadeForm.modalidade_id}
                    onChange={(e) => setModalidadeForm({ ...modalidadeForm, modalidade_id: e.target.value })}
                    label="Modalidade"
                  >
                    {modalidades
                      .filter(modalidade => !associacoes.some(a => a.modalidade_id === modalidade.id))
                      .map(modalidade => (
                        <MenuItem key={modalidade.id} value={modalidade.id.toString()}>
                          {modalidade.nome}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}

              <TextField
                label="Quantidade de Alunos"
                type="number"
                value={modalidadeForm.alunos}
                onChange={(e) => setModalidadeForm({ ...modalidadeForm, alunos: e.target.value })}
                fullWidth
                margin="normal"
                inputProps={{ min: 1 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeModalidadeModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveModalidade}
              variant="contained"
              disabled={salvandoModalidade || !modalidadeForm.alunos.trim() || (!editingModalidade && !modalidadeForm.modalidade_id)}
            >
              {salvandoModalidade ? 'Salvando...' : (editingModalidade ? 'Atualizar' : 'Adicionar')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Confirmação de Exclusão */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja excluir a escola "{escola?.nome}"? Esta ação não pode ser desfeita.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDeleteEscola} variant="contained" color="error">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default EscolaDetalhesPage;