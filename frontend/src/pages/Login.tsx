import React, { useEffect, useMemo, useState } from "react";
import {
  alpha,
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  Fade,
  FormControlLabel,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  DeleteOutline,
  EmailOutlined,
  LockOutlined,
  LoginOutlined,
  ShieldOutlined,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";

import { NutriLogLogo } from "../components/layout/NutriLogLogo";
import { login } from "../services/auth";

const SAVED_EMAILS_KEY = "nutrilog:saved-login-emails";
const MAX_SAVED_EMAILS = 8;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const readSavedEmails = (): string[] => {
  try {
    const raw = localStorage.getItem(SAVED_EMAILS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const writeSavedEmails = (emails: string[]) => {
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(emails));
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saveUser, setSaveUser] = useState(false);
  const [savedEmails, setSavedEmails] = useState<string[]>(readSavedEmails);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const normalizedCurrentEmail = useMemo(() => normalizeEmail(email), [email]);

  useEffect(() => {
    setSenha("");
    setShowPassword(false);

    window.setTimeout(() => {
      setSenha("");
      const passwordInput = document.querySelector<HTMLInputElement>('input[name="nutrilog-login-password"]');
      if (passwordInput) passwordInput.value = "";
    }, 0);

    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      if (location.state?.email) setEmail(location.state.email);
    }
  }, [location.state]);

  useEffect(() => {
    if (normalizedCurrentEmail && savedEmails.includes(normalizedCurrentEmail)) {
      setSaveUser(true);
    }
  }, [normalizedCurrentEmail, savedEmails]);

  const saveEmailLocally = (value: string) => {
    const nextEmail = normalizeEmail(value);
    if (!nextEmail) return;

    const nextEmails = [
      nextEmail,
      ...savedEmails.filter((item) => item !== nextEmail),
    ].slice(0, MAX_SAVED_EMAILS);

    setSavedEmails(nextEmails);
    writeSavedEmails(nextEmails);
  };

  const removeSavedEmail = (value: string) => {
    const target = normalizeEmail(value);
    const nextEmails = savedEmails.filter((item) => item !== target);
    setSavedEmails(nextEmails);
    writeSavedEmails(nextEmails);

    if (normalizedCurrentEmail === target) {
      setSaveUser(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const response = await login(email, senha);

      if (saveUser) {
        saveEmailLocally(email);
      }

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
        tipo_secretaria: payload.tipo_secretaria || response.tipo_secretaria || "educacao",
        isSystemAdmin: payload.isSystemAdmin || response.isSystemAdmin || false,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("perfil", response.tipo);
      localStorage.setItem("nome", response.nome);

      window.dispatchEvent(new Event("auth-changed"));

      const isEscolaUser = !!(userData.escola_id && userData.tipo !== "admin" && !payload.isSystemAdmin);
      const redirectPath = isEscolaUser ? "/portal-escola" : "/dashboard";

      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setErro(err.message || "E-mail ou senha incorretos");
    } finally {
      setLoading(false);
    }
  }

  const fieldStyles = {
    "& .MuiOutlinedInput-root": {
      minHeight: 42,
      borderRadius: "7px",
      bgcolor: isDark ? alpha(theme.palette.common.white, 0.035) : theme.palette.background.default,
      color: "text.primary",
      transition: "border-color 0.18s ease, background-color 0.18s ease",
      "& fieldset": {
        borderColor: theme.palette.divider,
      },
      "&:hover fieldset": {
        borderColor: alpha(theme.palette.text.primary, isDark ? 0.22 : 0.18),
      },
      "&.Mui-focused fieldset": {
        borderColor: theme.palette.primary.main,
        borderWidth: 1,
      },
    },
    "& .MuiAutocomplete-inputRoot": {
      px: "10px !important",
      py: "0 !important",
    },
    "& .MuiInputAdornment-root": {
      height: 42,
      maxHeight: 42,
      my: 0,
    },
    "& .MuiInputBase-input": {
      fontSize: "0.875rem",
      py: "10px",
      bgcolor: "transparent",
      "&::placeholder": {
        color: theme.palette.text.secondary,
        opacity: 1,
      },
      "&:-webkit-autofill": {
        borderRadius: 0,
        WebkitBoxShadow: `0 0 0 100px ${isDark ? "#232323" : "#eeeeee"} inset`,
        WebkitTextFillColor: theme.palette.text.primary,
        caretColor: theme.palette.text.primary,
        transition: "background-color 9999s ease-out 0s",
      },
    },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 3 },
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: isDark
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.16)} 0%, transparent 34%), radial-gradient(circle at 82% 18%, ${alpha(theme.palette.info.main, 0.12)} 0%, transparent 34%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 34%), radial-gradient(circle at 82% 18%, ${alpha(theme.palette.primary.light, 0.18)} 0%, transparent 32%)`,
          pointerEvents: "none",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: { xs: 16, md: 28 },
          border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.07 : 0.06)}`,
          borderRadius: { xs: 3, md: 4 },
          pointerEvents: "none",
        },
      }}
    >
      <Fade in timeout={650}>
        <Card
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            width: "100%",
            maxWidth: 900,
            minHeight: { md: 520 },
            boxShadow: isDark
              ? "0 28px 70px rgba(0, 0, 0, 0.38)"
              : "0 22px 54px rgba(31, 36, 48, 0.13)",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "0.9fr 1fr" },
            overflow: "hidden",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              flexDirection: "column",
              justifyContent: "space-between",
              p: 4,
              borderRight: `1px solid ${theme.palette.divider}`,
              bgcolor: isDark
                ? alpha(theme.palette.common.white, 0.025)
                : alpha(theme.palette.primary.main, 0.055),
            }}
          >
            <Box>
              <NutriLogLogo />
              <Typography
                sx={{
                  mt: 5,
                  maxWidth: 280,
                  color: "text.primary",
                  fontSize: "1.55rem",
                  fontWeight: 760,
                  lineHeight: 1.16,
                  letterSpacing: 0,
                }}
              >
                Gestao alimentar com acesso rapido e seguro.
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 1.5, maxWidth: 300, color: "text.secondary", lineHeight: 1.6 }}
              >
                Salve apenas o e-mail neste dispositivo para acelerar proximos acessos.
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                color: "text.secondary",
                fontSize: "0.78rem",
              }}
            >
              <ShieldOutlined sx={{ fontSize: 18, color: "primary.main" }} />
              Senhas nunca sao armazenadas nesta tela.
            </Box>
          </Box>

          <Box
            sx={{
              p: { xs: 3, sm: 4, md: 5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                display: { xs: "flex", md: "none" },
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                mb: 4,
              }}
            >
              <NutriLogLogo />
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  boxShadow: `0 0 0 6px ${alpha(theme.palette.primary.main, 0.14)}`,
                  flexShrink: 0,
                }}
              />
            </Box>

            <Box sx={{ mb: 3.5 }}>
              <Typography
                component="h1"
                sx={{
                  color: "text.primary",
                  fontSize: { xs: "1.45rem", sm: "1.75rem" },
                  fontWeight: 760,
                  lineHeight: 1.12,
                  letterSpacing: 0,
                }}
              >
                Acesse sua conta
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 1,
                  lineHeight: 1.55,
                }}
              >
                Sistema de gestao da alimentacao escolar
              </Typography>
            </Box>

            {successMessage && (
              <Alert
                severity="success"
                sx={{
                  mb: 3,
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.success.main, isDark ? 0.16 : 0.1),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.24)}`,
                  color: "success.main",
                  "& .MuiAlert-icon": { color: "success.main" },
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
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.error.main, isDark ? 0.16 : 0.1),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.24)}`,
                  color: "error.main",
                  "& .MuiAlert-icon": { color: "error.main" },
                }}
              >
                {erro}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} autoComplete="off" sx={{ maxWidth: 380 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: "text.secondary",
                      ml: 0.5,
                      mb: 0.75,
                      display: "block",
                      fontSize: "0.75rem",
                      letterSpacing: 0,
                    }}
                  >
                    E-mail
                  </Typography>
                  <Autocomplete
                    freeSolo
                    options={savedEmails}
                    inputValue={email}
                    onInputChange={(_, value) => setEmail(value)}
                    onChange={(_, value) => {
                      if (typeof value === "string") setEmail(value);
                    }}
                    clearOnBlur={false}
                    noOptionsText="Nenhum usuario salvo"
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;

                      return (
                        <Box
                          component="li"
                          key={key}
                          {...optionProps}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            pr: "8px !important",
                          }}
                        >
                          <EmailOutlined sx={{ fontSize: 17, color: "text.secondary" }} />
                          <Typography sx={{ flex: 1, minWidth: 0, fontSize: "0.84rem" }} noWrap>
                            {option}
                          </Typography>
                          <Tooltip title="Remover usuario salvo">
                            <IconButton
                              size="small"
                              aria-label={`Remover ${option}`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={(event) => {
                                event.stopPropagation();
                                removeSavedEmail(option);
                              }}
                              sx={{ color: "text.secondary" }}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        type="email"
                        fullWidth
                        placeholder="exemplo@email.com"
                        required
                        sx={fieldStyles}
                        inputProps={{
                          ...params.inputProps,
                          autoComplete: "off",
                          name: "nutrilog-login-email",
                        }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start">
                                <EmailOutlined sx={{ color: "text.secondary", fontSize: 18 }} />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: "text.secondary",
                      ml: 0.5,
                      mb: 0.75,
                      display: "block",
                      fontSize: "0.75rem",
                      letterSpacing: 0,
                    }}
                  >
                    Senha
                  </Typography>
                  <TextField
                    type="text"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    fullWidth
                    placeholder="Digite sua senha"
                    required
                    sx={fieldStyles}
                    inputProps={{
                      autoComplete: "new-password",
                      name: "nutrilog-login-password",
                      style: {
                        WebkitTextSecurity: showPassword ? "none" : "disc",
                      } as React.CSSProperties,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined sx={{ color: "text.secondary", fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((p) => !p)}
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          size="small"
                          sx={{
                            width: 32,
                            height: 32,
                            mr: -0.25,
                            borderRadius: "6px",
                            color: "text.secondary",
                            bgcolor: "transparent",
                            border: 0,
                            "&:hover": {
                              color: "text.primary",
                              bgcolor: alpha(theme.palette.text.primary, isDark ? 0.08 : 0.05),
                            },
                          }}
                        >
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={saveUser}
                      onChange={(event) => setSaveUser(event.target.checked)}
                      size="small"
                      color="primary"
                    />
                  }
                  label="Salvar usuario neste dispositivo"
                  sx={{
                    alignSelf: "flex-start",
                    mt: -0.25,
                    color: "text.secondary",
                    "& .MuiFormControlLabel-label": {
                      fontSize: "0.8rem",
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  startIcon={!loading ? <LoginOutlined fontSize="small" /> : undefined}
                  sx={{
                    mt: 0.5,
                    py: 1.5,
                    borderRadius: 1.5,
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    textTransform: "none",
                    boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, isDark ? 0.22 : 0.18)}`,
                    transition: "transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease",
                    "&:hover": {
                      boxShadow: `0 16px 30px ${alpha(theme.palette.primary.main, isDark ? 0.28 : 0.24)}`,
                      transform: "translateY(-1px)",
                    },
                    "&:active": {
                      transform: "translateY(0)",
                    },
                  }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : "Entrar"}
                </Button>
              </Box>
            </Box>

            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                mt: 3.25,
                fontSize: "0.7rem",
              }}
            >
              (c) {new Date().getFullYear()} NutriLog
            </Typography>
          </Box>
        </Card>
      </Fade>
    </Box>
  );
}
