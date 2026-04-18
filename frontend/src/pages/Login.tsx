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
  Card,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
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
    
    try {
      const response = await login(email, senha);
      
      // Salvar token IMEDIATAMENTE
      const token = response.token;
      localStorage.setItem("token", token);
      
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
      
      // Disparar evento para notificar AuthContext da mudança de token
      window.dispatchEvent(new Event('auth-changed'));

      // Determinar rota de redirecionamento
      const isEscolaUser = !!(userData.escola_id && userData.tipo !== 'admin' && !payload.isSystemAdmin);
      const redirectPath = isEscolaUser ? '/portal-escola' : '/dashboard';
      
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      console.error('❌ [LOGIN] Erro:', err);
      setErro(err.message || "E-mail ou senha incorretos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#0d0d0d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(circle at 20% 50%, rgba(0, 191, 255, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(34, 197, 94, 0.06) 0%, transparent 50%)",
          pointerEvents: "none",
        },
      }}
    >
      <Fade in={true} timeout={800}>
        <Card
          sx={{
            bgcolor: "#181818",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.07)",
            p: { xs: 4, sm: 5 },
            width: "100%",
            maxWidth: 440,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 4,
            }}
          >
            <img 
              src="/nutrilog_logo_v2.svg" 
              alt="NutriLog" 
              style={{ 
                height: "80px",
                width: "auto"
              }} 
            />
          </Box>

          <Typography 
            variant="body2" 
            sx={{ 
              color: "#888", 
              mb: 4,
              fontSize: "0.875rem"
            }}
          >
            Sistema de Gestão Nutricional
          </Typography>

          {successMessage && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3, 
                borderRadius: "12px",
                bgcolor: "rgba(34, 197, 94, 0.12)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                color: "#22c55e",
                "& .MuiAlert-icon": { color: "#22c55e" }
              }}
            >
              {successMessage}
            </Alert>
          )}
          
          {erro && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                borderRadius: "12px",
                bgcolor: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                "& .MuiAlert-icon": { color: "#ef4444" }
              }}
            >
              {erro}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box sx={{ textAlign: "left" }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 600, 
                    color: "#888", 
                    ml: 0.5, 
                    mb: 0.75, 
                    display: "block",
                    fontSize: "0.75rem",
                    letterSpacing: "0.02em"
                  }}
                >
                  E-mail
                </Typography>
                <TextField
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  fullWidth
                  placeholder="exemplo@email.com"
                  required
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      bgcolor: "#0d0d0d",
                      color: "#f0f0f0",
                      "& fieldset": { 
                        borderColor: "rgba(255,255,255,0.07)" 
                      },
                      "&:hover fieldset": { 
                        borderColor: "rgba(255,255,255,0.12)" 
                      },
                      "&.Mui-focused fieldset": { 
                        borderColor: "#00bfff",
                        borderWidth: 1
                      },
                    },
                    "& .MuiInputBase-input": { 
                      fontSize: "0.875rem", 
                      py: 1.5,
                      "&::placeholder": {
                        color: "#666",
                        opacity: 1
                      }
                    },
                  }}
                />
              </Box>

              <Box sx={{ textAlign: "left" }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 600, 
                    color: "#888", 
                    ml: 0.5, 
                    mb: 0.75, 
                    display: "block",
                    fontSize: "0.75rem",
                    letterSpacing: "0.02em"
                  }}
                >
                  Senha
                </Typography>
                <TextField
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  fullWidth
                  placeholder="••••••••"
                  required
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      bgcolor: "#0d0d0d",
                      color: "#f0f0f0",
                      "& fieldset": { 
                        borderColor: "rgba(255,255,255,0.07)" 
                      },
                      "&:hover fieldset": { 
                        borderColor: "rgba(255,255,255,0.12)" 
                      },
                      "&.Mui-focused fieldset": { 
                        borderColor: "#00bfff",
                        borderWidth: 1
                      },
                    },
                    "& .MuiInputBase-input": { 
                      fontSize: "0.875rem", 
                      py: 1.5,
                      "&::placeholder": {
                        color: "#666",
                        opacity: 1
                      }
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          onClick={() => setShowPassword(p => !p)} 
                          edge="end" 
                          sx={{ color: "#666", "&:hover": { color: "#888" } }}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
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
                  py: 1.5,
                  borderRadius: "12px",
                  bgcolor: "#00bfff",
                  color: "#0d0d0d",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textTransform: "none",
                  boxShadow: "0 0 20px rgba(0, 191, 255, 0.3)",
                  transition: "all 0.2s",
                  "&:hover": { 
                    bgcolor: "#00a8e6",
                    boxShadow: "0 0 30px rgba(0, 191, 255, 0.4)",
                    transform: "translateY(-1px)"
                  },
                  "&:active": { 
                    transform: "translateY(0)" 
                  },
                  "&.Mui-disabled": {
                    bgcolor: "rgba(0, 191, 255, 0.3)",
                    color: "rgba(13, 13, 13, 0.5)"
                  }
                }}
              >
                {loading ? <CircularProgress size={20} sx={{ color: "#0d0d0d" }} /> : "Entrar"}
              </Button>
            </Box>
          </form>
          
          <Typography 
            variant="caption" 
            sx={{ 
              color: "#666", 
              display: "block", 
              mt: 4,
              fontSize: "0.7rem"
            }}
          >
            © {new Date().getFullYear()} NutriLog
          </Typography>
        </Card>
      </Fade>
    </Box>
  );
}