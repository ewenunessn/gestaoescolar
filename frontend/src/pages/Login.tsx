import React, { startTransition } from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Divider,
  InputAdornment,
  Container,
  CardContent,
  CircularProgress,
  IconButton
} from "@mui/material";
import { Email, Lock, School, Login as LoginIcon, ArrowBack, Visibility, VisibilityOff } from "@mui/icons-material";
import { login } from "../services/auth";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { tenantService } from "../services/tenantService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tenantId, setTenantId] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();
  
  // Usar breakpoints fixos em vez do tema
  const isMobile = window.innerWidth < 600;
  const isSmall = window.innerWidth < 960;

  // Verificar se há mensagem de sucesso do registro
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      if (location.state?.email) {
        setEmail(location.state.email);
      }
    }

    // Try to resolve tenant from URL
    const resolveTenantFromUrl = async () => {
      try {
        const result = await tenantService.resolveTenant();
        if (result.tenant) {
          setTenantId(result.tenant.id);
        }
      } catch (error) {
        console.log('No tenant context found, proceeding with normal login');
      }
    };

    resolveTenantFromUrl();
  }, [location.state]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const response = await login(email, senha, tenantId || undefined);
      
      // Salvar token
      localStorage.setItem("token", response.token);
      localStorage.setItem("perfil", response.tipo); // Backend retorna 'tipo', não 'perfil'
      localStorage.setItem("nome", response.nome);
      
      // Salvar tenant principal
      if (response.tenant) {
        localStorage.setItem("currentTenantId", response.tenant.id);
        localStorage.setItem("currentTenant", response.tenant.name);
        console.log('🏢 Tenant principal salvo:', response.tenant);
      }
      
      // Salvar tenants disponíveis
      if (response.availableTenants) {
        localStorage.setItem("availableTenants", JSON.stringify(response.availableTenants));
        console.log('🏢 Tenants disponíveis salvos:', response.availableTenants);
      }
      
      // Extrair ID do token JWT e criar objeto user completo
      try {
        const tokenPayload = JSON.parse(atob(response.token.split('.')[1]));
        const user = {
          id: tokenPayload.id,
          nome: response.nome,
          perfil: response.tipo // Backend retorna 'tipo', não 'perfil'
        };
        localStorage.setItem("user", JSON.stringify(user));
        console.log('👤 Dados do usuário salvos:', user);
      } catch (tokenError) {
        console.error('❌ Erro ao extrair dados do token:', tokenError);
        // Fallback: criar user sem ID (será tratado no iniciarRecebimento)
        const user = {
          id: 1, // Fallback para admin
          nome: response.nome,
          perfil: response.tipo // Backend retorna 'tipo', não 'perfil'
        };
        localStorage.setItem("user", JSON.stringify(user));
      }
      
      startTransition(() => {
        navigate("/dashboard");
      });
    } catch (err: any) {
      console.log("Erro no login:", err);
      setErro(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSubmit(event as any);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
          background: `radial-gradient(circle at 25% 25%, rgba(37, 99, 235, 0.1) 0%, transparent 50%),
                       radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)`,
          zIndex: 0
        }}
      />

      {/* Header */}
      <Box sx={{ position: 'relative', zIndex: 2, p: isSmall ? 2 : 3 }}>
        <IconButton
          onClick={() => navigate('/')}
          sx={{
            color: '#2563eb',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
            },
            transition: 'all 0.3s ease'
          }}
        >
          <ArrowBack />
        </IconButton>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          position: 'relative',
          zIndex: 1
        }}
      >
      <Container maxWidth="lg" sx={{ height: '100%' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          height: '100%',
          gap: 4,
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          {/* Left Side - System Info */}
          {!isMobile && (
             <Box sx={{ 
               flex: 1, 
               display: 'flex', 
               flexDirection: 'column',
               justifyContent: 'space-between',
               pr: 4,
               height: '100%',
               minHeight: '600px'
             }}>
              {/* Header Section */}
               <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <School sx={{ fontSize: 48, color: '#2563eb', mr: 2 }} />
                    <Typography variant="h3" sx={{ 
                      fontWeight: 700, 
                      color: '#2563eb',
                      fontSize: { xs: '2rem', md: '2.5rem' }
                    }}>
                      GestãoEscolar
                    </Typography>
                  </Box>
                 <Typography variant="h6" sx={{ 
                   color: '#6b7280',
                   lineHeight: 1.6
                 }}>
                   Plataforma completa para administração e controle de estoque escolar
                 </Typography>
               </Box>
 
               {/* Features Section */}
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <School sx={{ color: 'white', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 0.5 }}>
                      Controle de Estoque
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      Gerencie produtos, lotes e movimentações em tempo real
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <LoginIcon sx={{ color: 'white', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 0.5 }}>
                      Acesso Seguro
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      Sistema com autenticação e controle de permissões
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Email sx={{ color: 'white', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 0.5 }}>
                      Relatórios Automáticos
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      Receba relatórios e alertas por email automaticamente
                    </Typography>
                  </Box>
                </Box>
               </Box>

               {/* Footer Section */}
               <Box sx={{ 
                 borderTop: '1px solid rgba(37, 99, 235, 0.1)',
                 pt: 3,
                 textAlign: 'center'
               }}>
                 <Typography variant="body2" sx={{ 
                   color: '#9ca3af',
                   mb: 2,
                   fontWeight: 500
                 }}>
                   Desenvolvido para escolas modernas
                 </Typography>
                 <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                   <Typography variant="caption" sx={{ color: '#6b7280' }}>
                     ✓ Seguro
                   </Typography>
                   <Typography variant="caption" sx={{ color: '#6b7280' }}>
                     ✓ Confiável
                   </Typography>
                   <Typography variant="caption" sx={{ color: '#6b7280' }}>
                     ✓ Eficiente
                   </Typography>
                 </Box>
               </Box>
             </Box>
           )}

          {/* Right Side - Login Form */}
          <Box sx={{ 
            flex: isMobile ? 1 : '0 0 450px',
            display: 'flex',
            justifyContent: 'center',
            width: isMobile ? '100%' : 'auto'
          }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: 450,
                py: 1
              }}
            >
          {/* Header */}
          <Box
            sx={{
              background: 'transparent',
              color: '#1f2937',
              p: isMobile ? 3 : 4,
              textAlign: 'center',
              borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
            }}
          >

            <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 600, mb: 1, color: '#1f2937' }}>
              Bem-vindo de volta
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', fontSize: isMobile ? '0.875rem' : '1rem' }}>
              Faça login para acessar o sistema
            </Typography>
          </Box>

          <CardContent sx={{ p: 3 }}>
            {/* Mensagem de sucesso do registro */}
            {successMessage && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {successMessage}
              </Alert>
            )}

            {erro && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {erro}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Campo E-mail */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#374151' }}>
                    E-mail
                  </Typography>
                  <TextField
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    fullWidth
                    placeholder="Digite seu e-mail"
                    variant="outlined"
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: '#6b7280' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(249, 250, 251, 0.8)',
                        border: '1px solid #e5e7eb',
                        '&:hover': {
                          borderColor: '#2563eb',
                        },
                        '&.Mui-focused': {
                          borderColor: '#2563eb',
                          boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
                        }
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none'
                      }
                    }}
                  />
                </Box>

                {/* Campo Senha */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#374151' }}>
                    Senha
                  </Typography>
                  <TextField
                    type={showPassword ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    onKeyPress={handleKeyPress}
                    fullWidth
                    placeholder="Digite sua senha"
                    variant="outlined"
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: '#6b7280' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                            sx={{ 
                              color: '#6b7280',
                              '&:hover': {
                                color: '#2563eb',
                                backgroundColor: 'rgba(37, 99, 235, 0.1)'
                              }
                            }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(249, 250, 251, 0.8)',
                        border: '1px solid #e5e7eb',
                        '&:hover': {
                          borderColor: '#2563eb',
                        },
                        '&.Mui-focused': {
                          borderColor: '#2563eb',
                          boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
                        }
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none'
                      }
                    }}
                  />
                </Box>

                {/* Botão de Login */}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)'
                    },
                    '&:disabled': {
                      background: 'rgba(0, 0, 0, 0.12)',
                      transform: 'none',
                      boxShadow: 'none'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {loading ? "Entrando..." : "Entrar no Sistema"}
                </Button>
              </Box>
            </form>

            {/* Informações adicionais */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.75rem', lineHeight: 1.5 }}>
                Sistema destinado aos administradores e nutricionistas.
                <br />
                Para suporte técnico, entre em contato com a equipe de TI.
              </Typography>
            </Box>
          </CardContent>
        </Paper>
      </Box>
    </Box>
  </Container>
  </Box>
</Box>
);
}
