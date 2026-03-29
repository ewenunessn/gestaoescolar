import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Grid, TextField, Typography, Avatar,
  Alert, CircularProgress, Divider, IconButton, Tooltip
} from '@mui/material';
import { PhotoCamera as PhotoCameraIcon, Delete as DeleteIcon, Save as SaveIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import PageContainer from '../components/PageContainer';
import {
  buscarInstituicao,
  atualizarInstituicao,
  uploadLogoBase64,
  arquivoParaBase64,
  Instituicao,
  InstituicaoForm
} from '../services/instituicao';

const ConfiguracaoInstituicaoPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<InstituicaoForm>({
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    site: '',
    secretario_nome: '',
    secretario_cargo: 'Secretário(a) de Educação',
    departamento: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await buscarInstituicao();
      setInstituicao(data);
      setFormData({
        nome: data.nome || '',
        cnpj: data.cnpj || '',
        endereco: data.endereco || '',
        telefone: data.telefone || '',
        email: data.email || '',
        site: data.site || '',
        secretario_nome: data.secretario_nome || '',
        secretario_cargo: data.secretario_cargo || 'Secretário(a) de Educação',
        departamento: data.departamento || '',
      });
      
      if (data.logo_url) {
        setLogoPreview(data.logo_url);
      }
    } catch (err) {
      toast.toast.error('Erro ao carregar configurações da instituição');
      console.toast.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof InstituicaoForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.toast.error('Apenas imagens são permitidas (JPEG, PNG, GIF, SVG)');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    try {
      const base64 = await arquivoParaBase64(file);
      setLogoFile(file);
      setLogoPreview(base64);
    } catch (err) {
      toast.toast.error('Erro ao processar imagem');
      console.toast.error(err);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.toast.error('Nome da instituição é obrigatório');
      return;
    }

    try {
      setSaving(true);
      
      // Se há uma nova logo, fazer upload via base64
      if (logoFile && logoPreview) {
        await uploadLogoBase64(logoPreview);
      }
      
      // Atualizar dados da instituição
      const response = await atualizarInstituicao(formData);
      
      toast.toast.success(response.message);
      setInstituicao(response.instituicao);
      setLogoFile(null); // Limpar arquivo temporário
      
    } catch (err: any) {
      toast.toast.error(err.response?.data?.message || 'Erro ao salvar configurações');
      console.toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Configurações da Instituição
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Configure as informações da instituição que aparecerão nos documentos e relatórios gerados pelo sistema.
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Logo da Instituição */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Logo da Instituição
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={logoPreview || undefined}
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      bgcolor: 'grey.200',
                      border: '2px dashed',
                      borderColor: 'grey.300'
                    }}
                  >
                    {!logoPreview && <PhotoCameraIcon sx={{ fontSize: 40, color: 'grey.500' }} />}
                  </Avatar>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<PhotoCameraIcon />}
                      size="small"
                    >
                      Escolher Logo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                    </Button>
                    
                    {logoPreview && (
                      <Tooltip title="Remover logo">
                        <IconButton
                          size="small"
                          color="delete"
                          onClick={handleRemoveLogo}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  
                  <Typography variant="caption" color="textSecondary" textAlign="center">
                    Formatos aceitos: JPEG, PNG, GIF, SVG<br />
                    Tamanho máximo: 5MB
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Informações Básicas */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informações Básicas
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Nome da Instituição"
                      fullWidth
                      required
                      value={formData.nome}
                      onChange={handleInputChange('nome')}
                      placeholder="Ex: Secretaria Municipal de Educação"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="CNPJ"
                      fullWidth
                      value={formData.cnpj}
                      onChange={handleInputChange('cnpj')}
                      placeholder="00.000.000/0000-00"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Telefone"
                      fullWidth
                      value={formData.telefone}
                      onChange={handleInputChange('telefone')}
                      placeholder="(00) 0000-0000"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Endereço"
                      fullWidth
                      multiline
                      rows={2}
                      value={formData.endereco}
                      onChange={handleInputChange('endereco')}
                      placeholder="Endereço completo da instituição"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="E-mail"
                      fullWidth
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      placeholder="contato@secretaria.gov.br"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Site"
                      fullWidth
                      value={formData.site}
                      onChange={handleInputChange('site')}
                      placeholder="https://www.secretaria.gov.br"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Departamento / Setor"
                      fullWidth
                      value={formData.departamento}
                      onChange={handleInputChange('departamento')}
                      placeholder="Ex: Departamento de Alimentação Escolar"
                      helperText="Aparece abaixo do nome da instituição nos documentos PDF"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Responsável pela Secretaria */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Responsável pela Secretaria
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Informações do responsável que aparecerão na assinatura dos documentos oficiais.
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      label="Nome do Secretário(a)"
                      fullWidth
                      value={formData.secretario_nome}
                      onChange={handleInputChange('secretario_nome')}
                      placeholder="Nome completo do secretário de educação"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Cargo"
                      fullWidth
                      value={formData.secretario_cargo}
                      onChange={handleInputChange('secretario_cargo')}
                      placeholder="Secretário(a) de Educação"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Botões de Ação */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<PdfIcon />}
                onClick={() => navigate('/editor-templates-pdf')}
                size="large"
              >
                Editor de Templates PDF
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={saving}
                size="large"
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      {/* Informações sobre uso */}
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            Como essas informações são usadas:
          </Typography>
          <Typography variant="body2" component="div">
            • <strong>Logo:</strong> Aparece no cabeçalho dos relatórios PDF<br />
            • <strong>Nome e endereço:</strong> Identificação da instituição nos documentos<br />
            • <strong>Secretário:</strong> Nome e cargo para assinatura de documentos oficiais<br />
            • <strong>Contatos:</strong> Informações de contato nos relatórios
          </Typography>
        </Alert>
      </Box>
    </PageContainer>
  );
};

export default ConfiguracaoInstituicaoPage;