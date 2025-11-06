import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { emailjsConfig, validateEmailjsConfig } from '../config/emailjs.config';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Container,
  Grid,
  InputAdornment,
  Divider,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  School,
  Message,
  Send,
  ArrowBack
} from '@mui/icons-material';
import './InterestForm.css';

interface FormData {
  nome: string;
  email: string;
  telefone: string;
  escola: string;
  cargo: string;
  mensagem: string;
}

const InterestForm: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    telefone: '',
    escola: '',
    cargo: '',
    mensagem: ''
  });

  const handleChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validação básica
    if (!formData.nome || !formData.email || !formData.escola) {
      setError('Por favor, preencha os campos obrigatórios.');
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, insira um email válido.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verificar se o EmailJS está configurado
      if (!validateEmailjsConfig()) {
        setError('Sistema de email não configurado. Entre em contato conosco diretamente.');
        return;
      }

      // Preparar dados para o template
      const templateParams = {
        from_name: formData.nome,
        from_email: formData.email,
        phone: formData.telefone || 'Não informado',
        school: formData.escola,
        position: formData.cargo || 'Não informado',
        message: formData.mensagem || 'Nenhuma mensagem adicional',
        to_email: emailjsConfig.destinationEmail
      };

      // Enviar email usando EmailJS
      await emailjs.send(
        emailjsConfig.serviceId,
        emailjsConfig.templateId,
        templateParams,
        emailjsConfig.publicKey
      );
      
      setSuccess(true);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        escola: '',
        cargo: '',
        mensagem: ''
      });
    } catch (err) {
      console.error('Erro ao enviar email:', err);
      setError('Erro ao enviar formulário. Tente novamente ou entre em contato conosco diretamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 3,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              ✅ Interesse Registrado!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Obrigado pelo seu interesse! Entraremos em contato em breve para apresentar nossa solução.
            </Typography>
            <Button
              component={Link}
              to="/"
              variant="contained"
              startIcon={<ArrowBack />}
              sx={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
                }
              }}
            >
              Voltar ao Início
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <div className="interest-form-page">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper
          elevation={8}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: 'white',
              p: 4,
              textAlign: 'center'
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom>
              Demonstre seu Interesse
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Quer conhecer nossa plataforma de gestão escolar?
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, opacity: 0.8 }}>
              Preencha o formulário abaixo e nossa equipe entrará em contato para uma demonstração personalizada.
            </Typography>
          </Box>

          {/* Form */}
          <Box sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Nome */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome Completo *"
                    value={formData.nome}
                    onChange={handleChange('nome')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>

                {/* Email */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email *"
                    type="email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>

                {/* Telefone */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    value={formData.telefone}
                    onChange={handleChange('telefone')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>

                {/* Escola/Instituição */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Escola/Instituição *"
                    value={formData.escola}
                    onChange={handleChange('escola')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <School sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>

                {/* Cargo */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Cargo/Função"
                    value={formData.cargo}
                    onChange={handleChange('cargo')}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>

                {/* Mensagem */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Mensagem (opcional)"
                    multiline
                    rows={4}
                    value={formData.mensagem}
                    onChange={handleChange('mensagem')}
                    placeholder="Conte-nos mais sobre suas necessidades ou dúvidas..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                          <Message sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>

                {/* Error Alert */}
                {error && (
                  <Grid item xs={12}>
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                      {error}
                    </Alert>
                  </Grid>
                )}

                {/* Submit Button */}
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Send />}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
                      },
                      '&:disabled': {
                        background: 'rgba(0, 0, 0, 0.12)',
                      }
                    }}
                  >
                    {loading ? 'Enviando...' : 'Enviar Solicitação'}
                  </Button>
                </Grid>
              </Grid>
            </form>

            {/* Links adicionais */}
            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                component={Link}
                to="/"
                variant="text"
                startIcon={<ArrowBack />}
                sx={{ color: 'text.secondary' }}
              >
                Voltar ao Início
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </div>
  );
};

export default InterestForm;