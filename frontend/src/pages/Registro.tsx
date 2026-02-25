import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  IconButton,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  School
} from '@mui/icons-material';
import { register } from '../services/auth';
import { useNavigate, Link } from 'react-router-dom';

interface FormData {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  perfil: string;
}

interface FormErrors {
  [key: string]: string;
}

const steps = ['Dados Pessoais', 'Credenciais', 'Informações Profissionais'];

const perfisDisponiveis = [
  { value: 'nutricionista', label: 'Nutricionista', icon: '🥗', description: 'Gerencia cardápios e refeições' },
  { value: 'comprador', label: 'Comprador', icon: '🛒', description: 'Realiza pedidos e compras' },
  { value: 'almoxarife', label: 'Almoxarife', icon: '📦', description: 'Controla estoque e recebimentos' },
  { value: 'gestor', label: 'Gestor', icon: '👔', description: 'Supervisiona operações gerais' },
  { value: 'operador', label: 'Operador', icon: '👤', description: 'Acesso básico ao sistema' }
];

export default function Registro() {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    perfil: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const navigate = useNavigate();

  // Validação de senha forte
  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial
    };
  };

  const passwordValidation = validatePassword(formData.senha);

  // Validação do formulário por etapa
  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 0: // Dados Pessoais
        if (!formData.nome.trim()) {
          newErrors.nome = 'Nome é obrigatório';
        } else if (formData.nome.trim().length < 2) {
          newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
        }

        if (!formData.email.trim()) {
          newErrors.email = 'E-mail é obrigatório';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'E-mail inválido';
        }


        break;

      case 1: // Credenciais
        if (!formData.senha) {
          newErrors.senha = 'Senha é obrigatória';
        } else if (!passwordValidation.isValid) {
          newErrors.senha = 'Senha não atende aos critérios de segurança';
        }

        if (!formData.confirmarSenha) {
          newErrors.confirmarSenha = 'Confirmação de senha é obrigatória';
        } else if (formData.senha !== formData.confirmarSenha) {
          newErrors.confirmarSenha = 'Senhas não coincidem';
        }
        break;

      case 2: // Informações Profissionais
        if (!formData.perfil) {
          newErrors.perfil = 'Perfil é obrigatório';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target.value;
    
    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setLoading(true);
    setErrors({});

    try {
      const userData = {
        nome: formData.nome.trim(),
        email: formData.email.trim().toLowerCase(),
        senha: formData.senha,
        perfil: formData.perfil
      };

      await register(userData);
      
      setSuccessMessage('Conta criada com sucesso! Redirecionando para o login...');
      
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Conta criada com sucesso! Faça login para continuar.',
            email: formData.email 
          }
        });
      }, 2000);

    } catch (error: any) {
      console.error('Erro no registro:', error);
      
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else if (error.message) {
        setErrors({ submit: error.message });
      } else {
        setErrors({ submit: 'Erro ao criar conta. Tente novamente.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Nome Completo"
              value={formData.nome}
              onChange={handleInputChange('nome')}
              error={!!errors.nome}
              helperText={errors.nome}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              label="E-mail"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={!!errors.email}
              helperText={errors.email}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              value={formData.senha}
              onChange={handleInputChange('senha')}
              error={!!errors.senha}
              helperText={errors.senha}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Indicador de força da senha */}
            {formData.senha && (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Critérios de Segurança:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { key: 'minLength', label: 'Mínimo 8 caracteres' },
                    { key: 'hasUpper', label: 'Letra maiúscula' },
                    { key: 'hasLower', label: 'Letra minúscula' },
                    { key: 'hasNumber', label: 'Número' },
                    { key: 'hasSpecial', label: 'Caractere especial' }
                  ].map(({ key, label }) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle 
                        sx={{ 
                          fontSize: 16, 
                          color: passwordValidation[key as keyof typeof passwordValidation] 
                            ? 'success.main' 
                            : 'grey.400' 
                        }} 
                      />
                      <Typography 
                        variant="body2" 
                        color={passwordValidation[key as keyof typeof passwordValidation] 
                          ? 'success.main' 
                          : 'text.secondary'
                        }
                      >
                        {label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Card>
            )}

            <TextField
              label="Confirmar Senha"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmarSenha}
              onChange={handleInputChange('confirmarSenha')}
              error={!!errors.confirmarSenha}
              helperText={errors.confirmarSenha}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" gutterBottom>
              Selecione seu Perfil
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
              {perfisDisponiveis.map((perfil) => (
                <Card
                  key={perfil.value}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: formData.perfil === perfil.value ? 2 : 1,
                    borderColor: formData.perfil === perfil.value ? 'primary.main' : 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                      boxShadow: 2
                    }
                  }}
                  onClick={() => handleInputChange('perfil')({ target: { value: perfil.value } })}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="h4">{perfil.icon}</Typography>
                      <Typography variant="h6">{perfil.label}</Typography>
                      {formData.perfil === perfil.value && (
                        <CheckCircle color="primary" sx={{ ml: 'auto' }} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {perfil.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {errors.perfil && (
              <Alert severity="error">{errors.perfil}</Alert>
            )}


          </Box>
        );

      default:
        return null;
    }
  };

  if (successMessage) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#f5f5f5"
      >
        <Paper elevation={3} sx={{ p: 4, maxWidth: 400, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="success.main">
            Sucesso!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {successMessage}
          </Typography>
          <LinearProgress sx={{ mt: 2 }} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f5f5f5"
      p={2}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, width: '100%' }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <School sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" gutterBottom>
            Criar Conta
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sistema de Gerenciamento de Alimentação Escolar
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Conteúdo do Step */}
        <Box sx={{ mb: 4 }}>
          {renderStepContent(activeStep)}
        </Box>

        {/* Erro geral */}
        {errors.submit && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.submit}
          </Alert>
        )}

        {/* Botões de navegação */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<ArrowBack />}
          >
            Voltar
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                size="large"
              >
                {loading ? 'Criando Conta...' : 'Criar Conta'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForward />}
                size="large"
              >
                Próximo
              </Button>
            )}
          </Box>
        </Box>

        {/* Link para login */}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Já possui uma conta?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: 'inherit', 
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
            >
              Fazer Login
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
