import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Box, Card, Typography, Grid, CircularProgress, Alert, Paper, Avatar
} from "@mui/material";
import { 
  Restaurant as RestaurantIcon, 
  ShoppingCart as ShoppingCartIcon, Description as DescriptionIcon,
  Warehouse as WarehouseIcon, People as PeopleIcon
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import api from "../../../services/api";

interface CardOption {
  title: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

export default function PortalEscolaHome() {
  const navigate = useNavigate();

  const [escola, setEscola] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setErro('');
      const dashRes = await api.get('/escola-portal/dashboard');
      setEscola(dashRes.data.data.escola);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setErro(error.response?.data?.message || 'Erro ao carregar dados da escola');
    } finally {
      setLoading(false);
    }
  };

  const alimentacaoCards: CardOption[] = [
    {
      title: "Cardápio Semanal",
      icon: <RestaurantIcon sx={{ fontSize: 32 }} />,
      path: "/portal-escola/cardapio",
      color: "#1976d2"
    },
    {
      title: "Solicitações de Alimentos",
      icon: <ShoppingCartIcon sx={{ fontSize: 32 }} />,
      path: "/portal-escola/solicitacoes",
      color: "#2e7d32"
    }
  ];

  const documentosCards: CardOption[] = [
    {
      title: "Comprovantes de Entrega",
      icon: <DescriptionIcon sx={{ fontSize: 32 }} />,
      path: "/portal-escola/comprovantes",
      color: "#ed6c02"
    }
  ];

  const estoqueCards: CardOption[] = [
    {
      title: "Estoque da Escola",
      icon: <WarehouseIcon sx={{ fontSize: 32 }} />,
      path: "/estoque-escola-portal",
      color: "#9c27b0"
    }
  ];

  const informacoesCards: CardOption[] = [
    {
      title: "Alunos e Modalidades",
      icon: <PeopleIcon sx={{ fontSize: 32 }} />,
      path: "/portal-escola/alunos",
      color: "#0288d1"
    }
  ];

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  const renderCardSection = (title: string, icon: React.ReactNode, cards: CardOption[]) => (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        {icon}
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                borderRadius: 2,
                border: '2px solid',
                borderColor: 'divider',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                  borderColor: card.color
                }
              }}
              onClick={() => handleCardClick(card.path)}
            >
              <Avatar
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: `${card.color}15`,
                  color: card.color,
                  margin: '0 auto 12px'
                }}
              >
                {card.icon}
              </Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.95rem' }}>
                {card.title}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );

  if (loading) {
    return (
      <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (erro) {
    return (
      <PageContainer>
        <Alert severity="error">{erro}</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={`Portal da Escola - ${escola?.nome || ''}`}
        subtitle="Acesse as funcionalidades disponíveis para sua escola"
      />

      {renderCardSection(
        "Alimentação Escolar",
        <RestaurantIcon sx={{ color: 'primary.main', fontSize: 28 }} />,
        alimentacaoCards
      )}

      {renderCardSection(
        "Documentos",
        <DescriptionIcon sx={{ color: 'warning.main', fontSize: 28 }} />,
        documentosCards
      )}

      {renderCardSection(
        "Estoque",
        <WarehouseIcon sx={{ color: 'secondary.main', fontSize: 28 }} />,
        estoqueCards
      )}

      {renderCardSection(
        "Informações",
        <PeopleIcon sx={{ color: 'info.main', fontSize: 28 }} />,
        informacoesCards
      )}
    </PageContainer>
  );
}
