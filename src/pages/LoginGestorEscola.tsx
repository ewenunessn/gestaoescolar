import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Autocomplete,
  CircularProgress,
  Container,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
  InputAdornment,
  Fade,
  Slide,
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import {
  School,
  Lock,
  Login,
  ArrowBack,
  Visibility,
  VisibilityOff,
  LocationOn,
  CheckCircle,
  SecurityOutlined
} from '@mui/icons-material';
import {
  listarEscolas,
  autenticarGestor,
  salvarSessaoGestor,
  obterSessaoGestor,
  type Escola
} from '../services/gestorEscola';

const LoginGestorEscola: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState<Escola | null>(null);
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingEscolas, setLoadingEscolas] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'escola' | 'codigo'>('escola');

  useEffect(() => {
    // Verificar se já existe uma sessão ativa
    const sessaoAtiva = obterSessaoGestor();
    if (sessaoAtiva) {
      navigate(`/estoque-escola/${sessaoAtiva.escola.id}`);
      return;
    }

    // Carregar lista de escolas
    carregarEscolas();
  }, [navigate]);

  const carregarEscolas = async () => {
    try {
      setLoadingEscolas(true);
      const escolasData = await listarEscolas();
      setEscolas(escolasData);
    } catch (err: any) {
      setError('Erro ao carregar lista de escolas');
      console.error('Erro ao carregar escolas:', err);
    } finally {
      setLoadingEscolas(false);
    }
  };

  const handleEscolaNext = () => {
    if (!escolaSelecionada) {
      setError('Por favor, selecione uma escola');
      return;
    }
    setError(null);
    setStep('codigo');
  };

  const handleLogin = async () => {
    if (!escolaSelecionada || !codigoAcesso.trim()) {
      setError('Por favor, complete todos os campos');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await autenticarGestor(escolaSelecionada.id, codigoAcesso.trim());

      if (response.success && response.data) {
        // Salvar sessão
        salvarSessaoGestor(response.data.escola, response.data.token, codigoAcesso.trim());

        // Redirecionar para o estoque da escola
        navigate(`/estoque-escola/${response.data.escola.id}`);
      } else {
        setError(response.message || 'Erro na autenticação');
      }
    } catch (err: any) {
      setError(err.message || 'Código de acesso inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (step === 'escola') {
        handleEscolaNext();
      } else {
        handleLogin();
      }
    }
  };

  const CustomTextField = ({ children, ...props }: any) => (
    <TextField
      {...props}
      fullWidth
      variant="outlined"
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 3,
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          border: '1.5px solid transparent',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            borderColor: 'rgba(29, 155, 240, 0.3)',
          },
          '&.Mui-focused': {
            backgroundColor: 'white',
            borderColor: '#1d9bf0',
            boxShadow: '0 0 0 4px rgba(29, 155, 240, 0.1)',
          }
        },
        '& .MuiOutlinedInput-notchedOutline': {
          border: 'none',
        },
        '& .MuiInputLabel-root': {
          color: 'rgba(0, 0, 0, 0.6)',
          fontSize: isSmall ? '0.9rem' : '1rem',
          '&.Mui-focused': {
            color: '#1d9bf0',
          }
        },
        ...props.sx
      }}
    >
      {children}
    </TextField>
  );

  const CustomButton = ({ children, ...props }: any) => (
    <Button
      {...props}
      sx={{
        borderRadius: 50,
        textTransform: 'none',
        fontWeight: 700,
        fontSize: isSmall ? '0.95rem' : '1rem',
        py: isSmall ? 1.2 : 1.5,
        px: isSmall ? 3 : 4,
        minHeight: isSmall ? 44 : 50,
        background: loading ? 'rgba(29, 155, 240, 0.5)' : '#1d9bf0',
        '&:hover': {
          background: loading ? 'rgba(29, 155, 240, 0.5)' : '#1a8cd8',
          transform: 'translateY(-1px)',
          boxShadow: '0 8px 25px rgba(29, 155, 240, 0.3)',
        },
        '&:disabled': {
          background: 'rgba(0, 0, 0, 0.12)',
        },
        transition: 'all 0.2s ease',
        ...props.sx
      }}
    >
      {children}
    </Button>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isMobile
          ? 'linear-gradient(180deg, #000 0%, #1a1a1a 100%)'
          : 'linear-gradient(135deg, #000 0%, #1a1a1a 50%, #000 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 25% 25%, rgba(29, 155, 240, 0.1) 0%, transparent 50%),
                       radial-gradient(circle at 75% 75%, rgba(120, 119, 198, 0.1) 0%, transparent 50%)`,
          zIndex: 0
        }}
      />

      {/* Header */}
      <Box sx={{ position: 'relative', zIndex: 2, p: isSmall ? 2 : 3 }}>
        <IconButton
          onClick={() => navigate('/login')}
          sx={{
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease',
            width: 44,
            height: 44
          }}
        >
          <ArrowBack />
        </IconButton>
      </Box>

      {/* Main Content */}
      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          px: isSmall ? 2 : 3
        }}
      >
        <Fade in timeout={800}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              width: '100%',
              maxWidth: 480,
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <Box sx={{ p: isSmall ? 4 : 5, textAlign: 'center' }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 2,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1d9bf0 0%, #7c77c6 100%)',
                  mb: 3
                }}
              >
                <School sx={{ fontSize: isSmall ? 28 : 32, color: 'white' }} />
              </Box>

              <Typography
                variant={isSmall ? "h5" : "h4"}
                sx={{
                  fontWeight: 800,
                  color: '#000',
                  mb: 1,
                  fontSize: isSmall ? '1.5rem' : '1.75rem'
                }}
              >
                Gestor Escolar
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontSize: isSmall ? '0.9rem' : '1rem',
                  mb: 1
                }}
              >
                Sistema de Gestão de Estoque
              </Typography>

              <Chip
                icon={<SecurityOutlined />}
                label="Acesso Restrito"
                size="small"
                sx={{
                  backgroundColor: 'rgba(29, 155, 240, 0.1)',
                  color: '#1d9bf0',
                  fontWeight: 600,
                  '& .MuiChip-icon': {
                    color: '#1d9bf0'
                  }
                }}
              />
            </Box>

            <Box sx={{ px: isSmall ? 4 : 5, pb: isSmall ? 4 : 5 }}>
              {error && (
                <Fade in>
                  <Alert
                    severity="error"
                    sx={{
                      mb: 3,
                      borderRadius: 3,
                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
                      border: '1px solid rgba(244, 67, 54, 0.2)',
                      '& .MuiAlert-icon': {
                        color: '#f44336'
                      }
                    }}
                  >
                    {error}
                  </Alert>
                </Fade>
              )}

              {step === 'escola' && (
                <Slide direction="up" in={step === 'escola'} timeout={400}>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 3,
                        fontWeight: 700,
                        color: '#000',
                        fontSize: isSmall ? '1.1rem' : '1.25rem'
                      }}
                    >
                      Selecione sua escola
                    </Typography>

                    <Autocomplete
                      options={escolas}
                      getOptionLabel={(option) => option.nome}
                      value={escolaSelecionada}
                      onChange={(_, newValue) => setEscolaSelecionada(newValue)}
                      loading={loadingEscolas}
                      onKeyPress={handleKeyPress}
                      renderInput={(params) => (
                        <CustomTextField
                          {...params}
                          placeholder="Digite o nome da sua escola..."
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <InputAdornment position="start">
                                <School sx={{ color: '#1d9bf0', fontSize: 22 }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <>
                                {loadingEscolas ? <CircularProgress size={20} sx={{ color: '#1d9bf0' }} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                          sx={{
                            '& .MuiInputBase-input': {
                              fontSize: isSmall ? '0.95rem' : '1rem',
                              py: isSmall ? 1.5 : 2
                            }
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box
                          component="li"
                          {...props}
                          sx={{
                            p: isSmall ? 2 : 2.5,
                            '&:hover': {
                              backgroundColor: 'rgba(29, 155, 240, 0.08)'
                            }
                          }}
                        >
                          <Stack spacing={0.5} sx={{ width: '100%' }}>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 600,
                                color: '#000',
                                fontSize: isSmall ? '0.9rem' : '1rem'
                              }}
                            >
                              {option.nome}
                            </Typography>
                            {option.endereco && (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <LocationOn sx={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.5)' }} />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(0, 0, 0, 0.6)',
                                    fontSize: isSmall ? '0.75rem' : '0.8rem'
                                  }}
                                >
                                  {option.endereco}
                                </Typography>
                              </Stack>
                            )}
                          </Stack>
                        </Box>
                      )}
                      slotProps={{
                        popper: {
                          sx: {
                            '& .MuiAutocomplete-listbox': {
                              maxHeight: isSmall ? 200 : 300,
                              '& .MuiAutocomplete-option': {
                                borderRadius: 2,
                                mx: 1,
                                my: 0.5
                              }
                            },
                            '& .MuiPaper-root': {
                              borderRadius: 3,
                              border: '1px solid rgba(0, 0, 0, 0.1)',
                              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
                            }
                          }
                        }
                      }}
                    />

                    <CustomButton
                      fullWidth
                      variant="contained"
                      onClick={handleEscolaNext}
                      disabled={!escolaSelecionada}
                      sx={{ mt: 4 }}
                    >
                      Continuar
                    </CustomButton>
                  </Box>
                </Slide>
              )}

              {step === 'codigo' && (
                <Slide direction="up" in={step === 'codigo'} timeout={400}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <IconButton
                        onClick={() => setStep('escola')}
                        size="small"
                        sx={{ mr: 1, color: 'rgba(0, 0, 0, 0.6)' }}
                      >
                        <ArrowBack fontSize="small" />
                      </IconButton>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: '#000',
                          fontSize: isSmall ? '1.1rem' : '1.25rem'
                        }}
                      >
                        Código de acesso
                      </Typography>
                    </Box>

                    {escolaSelecionada && (
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          backgroundColor: 'rgba(29, 155, 240, 0.08)',
                          border: '1px solid rgba(29, 155, 240, 0.2)',
                          mb: 3
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CheckCircle sx={{ fontSize: 18, color: '#1d9bf0' }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: '#1d9bf0',
                              fontSize: isSmall ? '0.85rem' : '0.9rem'
                            }}
                          >
                            {escolaSelecionada.nome}
                          </Typography>
                        </Stack>
                      </Box>
                    )}

                    <CustomTextField
                      placeholder="Digite o código de 6 dígitos"
                      value={codigoAcesso}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCodigoAcesso(e.target.value.replace(/\D/g, ''))}
                      onKeyPress={handleKeyPress}
                      type={showCode ? 'text' : 'password'}
                      inputProps={{
                        maxLength: 6,
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        style: {
                          textAlign: 'center',
                          fontSize: isSmall ? '1.2rem' : '1.4rem',
                          letterSpacing: '0.3em',
                          fontWeight: 700,
                          padding: isSmall ? '16px' : '20px'
                        }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: '#1d9bf0', fontSize: 22 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowCode(!showCode)}
                              size="small"
                              sx={{ color: 'rgba(0, 0, 0, 0.6)' }}
                            >
                              {showCode ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />

                    <Typography
                      variant="caption"
                      sx={{
                        mt: 2,
                        display: 'block',
                        textAlign: 'center',
                        color: 'rgba(0, 0, 0, 0.6)',
                        fontSize: isSmall ? '0.75rem' : '0.8rem'
                      }}
                    >
                      Solicite o código de acesso à administração da escola
                    </Typography>

                    <CustomButton
                      fullWidth
                      variant="contained"
                      onClick={handleLogin}
                      disabled={loading || codigoAcesso.length !== 6}
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Login />}
                      sx={{ mt: 4 }}
                    >
                      {loading ? 'Verificando...' : 'Acessar Sistema'}
                    </CustomButton>
                  </Box>
                </Slide>
              )}
            </Box>

            {/* Footer */}
            <Box sx={{ px: isSmall ? 4 : 5, pb: isSmall ? 4 : 5 }}>
              <Divider sx={{ mb: 3, backgroundColor: 'rgba(0, 0, 0, 0.08)' }} />

              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  color: 'rgba(0, 0, 0, 0.5)',
                  fontSize: isSmall ? '0.7rem' : '0.75rem',
                  lineHeight: 1.5,
                  mb: 2
                }}
              >
                Sistema destinado exclusivamente aos gestores das escolas.
                Para suporte técnico, entre em contato com a administração.
              </Typography>

              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(0, 0, 0, 0.6)',
                    fontSize: isSmall ? '0.8rem' : '0.85rem'
                  }}
                >
                  É administrador?{' '}
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => navigate('/login')}
                    sx={{
                      color: '#1d9bf0',
                      fontWeight: 700,
                      textTransform: 'none',
                      p: 0,
                      minWidth: 'auto',
                      fontSize: 'inherit',
                      '&:hover': {
                        backgroundColor: 'transparent',
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Login Administrativo
                  </Button>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default LoginGestorEscola;