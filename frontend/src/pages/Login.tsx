import React, { startTransition, useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  CircularProgress,
  IconButton,
  Fade,
} from "@mui/material";
import { Visibility, VisibilityOff, LoginOutlined } from "@mui/icons-material";
import { login } from "../services/auth";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      if (location.state?.email) setEmail(location.state.email);
    }
  }, [location.state]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    
    console.log('🔐 [LOGIN] Iniciando processo de login...');
    console.log('🔐 [LOGIN] localStorage antes do login:', {
      token: localStorage.getItem('token') ? 'EXISTE' : 'AUSENTE',
      user: localStorage.getItem('user') ? 'EXISTE' : 'AUSENTE'
    });
    
    try {
      const response = await login(email, senha);
      console.log('✅ [LOGIN] Resposta recebida do servidor');
      
      // Salvar token IMEDIATAMENTE
      const token = response.token;
      localStorage.setItem("token", token);
      console.log('💾 [LOGIN] Token salvo no localStorage');
      console.log('💾 [LOGIN] Token (primeiros 50 chars):', token.substring(0, 50));
      
      const payload = JSON.parse(atob(token.split(".")[1]));
      const userData = {
        id: payload.id,
        nome: response.nome,
        email: response.email || email,
        tipo: response.tipo,
        perfil: response.tipo,
        institution_id: payload.institution_id || response.institution_id,
        escola_id: payload.escola_id || response.escola_id,
        tipo_secretaria: payload.tipo_secretaria || response.tipo_secretaria || 'educacao',
        isSystemAdmin: payload.isSystemAdmin || response.isSystemAdmin || false,
      };
      
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("perfil", response.tipo);
      localStorage.setItem("nome", response.nome);
      console.log('💾 [LOGIN] Dados do usuário salvos:', { tipo: userData.tipo, escola_id: userData.escola_id });
      
      // Verificar se realmente foi salvo
      console.log('🔍 [LOGIN] Verificando localStorage após salvar:', {
        token: localStorage.getItem('token') ? `${localStorage.getItem('token')?.substring(0, 30)}...` : 'AUSENTE',
        user: localStorage.getItem('user') ? 'EXISTE' : 'AUSENTE'
      });
      
      // Disparar evento customizado para notificar outros componentes
      window.dispatchEvent(new Event('auth-changed'));
      console.log('📢 [LOGIN] Evento auth-changed disparado');

      // Determinar rota de redirecionamento
      const isEscolaUser = !!(userData.escola_id && userData.tipo !== 'admin' && !payload.isSystemAdmin);
      const redirectPath = isEscolaUser ? '/portal-escola' : '/dashboard';
      console.log('🔀 [LOGIN] Redirecionando para:', redirectPath);
      
      // CRÍTICO: Aguardar mais tempo para garantir que tudo está sincronizado
      // Isso é especialmente importante na Vercel onde o código minificado é mais rápido
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo de delay
      console.log('⏰ [LOGIN] Delay completado, redirecionando agora...');
      
      // Usar navigate do React Router ao invés de window.location
      // Isso evita reload completo e mantém o estado do React
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      console.error('❌ [LOGIN] Erro:', err);
      setErro(err.message || "E-mail ou senha incorretos");
    } finally {
      setLoading(false);
    }
  }

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      transition: "all 0.2s ease-in-out",
      bgcolor: "#ffffff",
      "& fieldset": { borderColor: "#e2e8f0" },
      "&:hover fieldset": { borderColor: "#3b82f6" },
      "&.Mui-focused fieldset": { borderColor: "#3b82f6", borderWidth: 2 },
    },
    "& .MuiInputBase-input": { fontSize: "0.95rem", py: 1.6 },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        // Gradiente moderno no fundo
        background: "radial-gradient(circle at top left, #1e293b 0%, #0f172a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Fade in={true} timeout={800}>
        <Box
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.98)",
            borderRadius: "28px",
            p: { xs: 4, sm: 6 },
            width: "100%",
            maxWidth: 440,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            textAlign: "center",
          }}
        >
          {/* Logo ou Ícone */}
          <Box
            sx={{
              width: 56,
              height: 56,
              bgcolor: "#eff6ff",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
              color: "#3b82f6",
            }}
          >
            <LoginOutlined sx={{ fontSize: 32 }} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 800, color: "#1e293b", mb: 1, letterSpacing: "-0.02em" }}>
            NutriLog
          </Typography>
          <Typography variant="body1" sx={{ color: "#64748b", mb: 4 }}>
            Acesse sua conta para continuar
          </Typography>

          {successMessage && <Alert severity="success" sx={{ mb: 3, borderRadius: "12px" }}>{successMessage}</Alert>}
          {erro && <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }}>{erro}</Alert>}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", ml: 1, mb: 0.5, display: "block", textTransform: "uppercase", fontSize: "0.7rem" }}>
                  E-mail institucional
                </Typography>
                <TextField
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  fullWidth
                  placeholder="exemplo@email.com"
                  required
                  sx={fieldSx}
                />
              </Box>

              <Box sx={{ textAlign: "left" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", ml: 1, mb: 0.5, display: "block", textTransform: "uppercase", fontSize: "0.7rem" }}>
                  Senha
                </Typography>
                <TextField
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  fullWidth
                  placeholder="••••••••"
                  required
                  sx={fieldSx}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(p => !p)} edge="end" sx={{ color: "#94a3b8" }}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  mt: 1,
                  py: 1.8,
                  borderRadius: "14px",
                  bgcolor: "#2563eb",
                  fontWeight: 700,
                  fontSize: "1rem",
                  textTransform: "none",
                  boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
                  transition: "all 0.2s",
                  "&:hover": { 
                    bgcolor: "#1d4ed8", 
                    boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)",
                    transform: "translateY(-1px)"
                  },
                  "&:active": { transform: "translateY(0)" }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Entrar na plataforma"}
              </Button>
            </Box>
          </form>
          
          <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mt: 4 }}>
            © {new Date().getFullYear()} NutriLog - Sistema de Gestão Nutricional
          </Typography>
        </Box>
      </Fade>
    </Box>
  );
}