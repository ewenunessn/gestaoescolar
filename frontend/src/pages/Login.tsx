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
  useTheme,
  useMediaQuery
} from "@mui/material";
import { Email, Lock, School, Login as LoginIcon } from "@mui/icons-material";
import { login } from "../services/auth";
import { useNavigate, useLocation, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Verificar se há mensagem de sucesso do registro
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      if (location.state?.email) {
        setEmail(location.state.email);
      }
    }
  }, [location.state]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const response = await login(email, senha);
      
      // Salvar token
      localStorage.setItem("token", response.token);
      localStorage.setItem("perfil", response.perfil);
      localStorage.setItem("nome", response.nome);
      
      // Extrair ID do token JWT e criar objeto user completo
      try {
        const tokenPayload = JSON.parse(atob(response.token.split('.')[1]));
        const user = {
          id: tokenPayload.id,
          nome: response.nome,
          perfil: response.perfil
        };
        localStorage.setItem("user", JSON.stringify(user));
        console.log('👤 Dados do usuário salvos:', user);
      } catch (tokenError) {
        console.error('❌ Erro ao extrair dados do token:', tokenError);
        // Fallback: criar user sem ID (será tratado no iniciarRecebimento)
        const user = {
          id: 1, // Fallback para admin
          nome: response.nome,
          perfil: response.perfil
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            maxWidth: isMobile ? '100%' : 450
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: 'white',
              p: isMobile ? 3 : 4,
              textAlign: 'center'
            }}
          >
            <School sx={{ fontSize: isMobile ? 40 : 48, mb: 2 }} />
            <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 600, mb: 1 }}>
              Login Administrativo
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, fontSize: isMobile ? '0.9rem' : '1rem' }}>
              Sistema de Gerenciamento de Alimentação Escolar
            </Typography>
          </Box>

          <CardContent sx={{ p: isMobile ? 3 : 4 }}>
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
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
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
                </Box>

                {/* Campo Senha */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                    Senha
                  </Typography>
                  <TextField
                    type="password"
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
                          <Lock sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
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
                  {loading ? "Entrando..." : "Entrar no Sistema"}
                </Button>
              </Box>
            </form>

            {/* Links adicionais */}
            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center' }}>
              {/* Link para registro */}
              <Typography variant="body2" color="text.secondary">
                Não possui uma conta?{' '}
                <Link 
                  to="/registro" 
                  style={{ 
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  Criar Conta
                </Link>
              </Typography>

              {/* Link para login de gestor */}
              <Typography variant="body2" color="text.secondary">
                É gestor de escola?{' '}
                <Link 
                  to="/login-gestor" 
                  style={{ 
                    color: theme.palette.secondary.main,
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  Acesso Gestor
                </Link>
              </Typography>
            </Box>

            {/* Informações adicionais */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Sistema destinado aos administradores e nutricionistas.
                <br />
                Para suporte técnico, entre em contato com a equipe de TI.
              </Typography>
            </Box>
          </CardContent>
        </Paper>
      </Container>
    </Box>
  );
}
