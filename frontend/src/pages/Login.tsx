import React, { startTransition } from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  CircularProgress,
  IconButton,
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
      localStorage.setItem("token", response.token);
      localStorage.setItem("perfil", response.tipo);
      localStorage.setItem("nome", response.nome);
      try {
        const payload = JSON.parse(atob(response.token.split(".")[1]));
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
        
        // Redirecionar: usuário com escola_id e não admin vai para portal-escola
        const isEscolaUser = !!(userData.escola_id && userData.tipo !== 'admin' && !payload.isSystemAdmin);
        const redirectPath = isEscolaUser ? '/portal-escola' : '/dashboard';
        startTransition(() => navigate(redirectPath));
      } catch {
        const userData = {
          id: response.id || 1,
          nome: response.nome,
          email: response.email || email,
          tipo: response.tipo,
          perfil: response.tipo,
          institution_id: response.institution_id,
          escola_id: response.escola_id,
          tipo_secretaria: response.tipo_secretaria || 'educacao',
        };
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Redirecionar: usuário com escola_id e não admin vai para portal-escola
        const isEscolaUserFallback = !!(userData.escola_id && userData.tipo !== 'admin');
        const redirectPath = isEscolaUserFallback ? '/portal-escola' : '/dashboard';
        startTransition(() => navigate(redirectPath));
      }
    } catch (err: any) {
      setErro(err.message || "E-mail ou senha incorretos");
    } finally {
      setLoading(false);
    }
  }

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px",
      bgcolor: "#f8fafc",
      "& fieldset": { borderColor: "#e2e8f0" },
      "&:hover fieldset": { borderColor: "#2563eb" },
      "&.Mui-focused fieldset": { borderColor: "#2563eb", borderWidth: 1.5 },
    },
    "& .MuiInputBase-input": { fontSize: "0.9rem", py: 1.4 },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#1a1d29",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      {/* Card branco */}
      <Box
        sx={{
          bgcolor: "#fff",
          borderRadius: "24px",
          p: { xs: 3, sm: 4 },
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
      >
        {/* Título */}
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "#0f172a", textAlign: "center", mb: 0.75 }}
        >
          Bem-vindo de volta
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "#94a3b8", textAlign: "center", mb: 3, fontSize: "0.85rem" }}
        >
          Faça login para acessar o NutriLog
        </Typography>

        {successMessage && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{successMessage}</Alert>}
        {erro && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{erro}</Alert>}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* E-mail */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569", mb: 0.5, display: "block" }}>
                E-mail
              </Typography>
              <TextField
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                fullWidth
                placeholder="Digite seu e-mail"
                required
                size="small"
                sx={fieldSx}
              />
            </Box>

            {/* Senha */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569", mb: 0.5, display: "block" }}>
                Senha
              </Typography>
              <TextField
                type={showPassword ? "text" : "password"}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                fullWidth
                placeholder="Digite sua senha"
                required
                size="small"
                sx={fieldSx}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(p => !p)} edge="end" sx={{ color: "#94a3b8" }}>
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Botão Entrar */}
            <Box sx={{ mt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.25,
                  borderRadius: "10px",
                  bgcolor: "#0f172a",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#1e293b", boxShadow: "none" },
                  "&:disabled": { bgcolor: "#cbd5e1" },
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Entrar"}
              </Button>
            </Box>
          </Box>
        </form>
      </Box>
    </Box>
  );
}
