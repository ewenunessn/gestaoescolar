import React from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Paper,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Button, // <-- ADICIONADO AQUI
} from "@mui/material";
import {
  School,
  Inventory,
  MenuBook,
  ShoppingCart,
  Storage,
  ArrowForward,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

// Array para configurar os atalhos de forma fácil
const quickActions = [
  {
    title: "Gerenciar Escolas",
    description: "Cadastre e edite escolas",
    icon: <School />,
    path: "/escolas",
    color: "primary.main",
  },
  {
    title: "Ver Produtos",
    description: "Consulte o catálogo de itens",
    icon: <Inventory />,
    path: "/produtos",
    color: "success.main",
  },
  {
    title: "Montar Cardápios",
    description: "Crie e planeje os cardápios",
    icon: <MenuBook />,
    path: "/cardapios",
    color: "secondary.main",
  },
  {
    title: "Estoque Central",
    description: "Acompanhe o estoque principal",
    icon: <Storage />,
    path: "/estoque-central",
    color: "warning.main",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const nomeUsuario = localStorage.getItem("nome") || "Usuário";
  const perfilUsuario = localStorage.getItem("perfil") || "N/A";

  return (
    <Box sx={{ p: 3 }}>
      {/* Cartão de Boas-Vindas */}
      <Card
        sx={{
          mb: 4,
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <CardContent sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)', fontSize: '2rem' }}>
            {nomeUsuario.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h5" component="h1" fontWeight={300}>
              Bem-vindo(a) de volta,
            </Typography>
            <Typography variant="h4" component="h1" fontWeight={600} sx={{ mb: 1 }}>
              {nomeUsuario}!
            </Typography>

          </Box>
        </CardContent>
      </Card>

      {/* Seção de Ações Rápidas */}
      <Box>
        <Typography variant="h5" fontWeight={600} color="text.primary" sx={{ mb: 3 }}>
          Ações Rápidas
        </Typography>
        <Grid container spacing={3}>
          {quickActions.map((action) => (
            <Grid item xs={12} sm={6} md={3} key={action.title}>
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                  }
                }}
              >
                <Box sx={{ p: 3, borderLeft: `4px solid ${action.color}`, borderRadius: '12px 0 0 12px' }}>
                  <ListItemIcon sx={{ color: action.color, mb: 1 }}>
                    {React.cloneElement(action.icon, { style: { fontSize: 32 } })}
                  </ListItemIcon>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ minHeight: '40px' }}>
                    {action.description}
                  </Typography>
                  <Button
                    endIcon={<ArrowForward />}
                    onClick={() => navigate(action.path)}
                    sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Acessar
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;