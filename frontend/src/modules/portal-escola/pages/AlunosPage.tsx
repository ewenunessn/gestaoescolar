import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Box, Card, Typography, Grid, Button, Paper
} from "@mui/material";
import { 
  People as PeopleIcon, School as SchoolIcon, ArrowBack as ArrowBackIcon
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../../../components/StateFeedback";
import api from "../../../services/api";

export default function AlunosPage() {
  const navigate = useNavigate();

  const [escola, setEscola] = useState<any>(null);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [totalAlunos, setTotalAlunos] = useState(0);
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
      setModalidades(dashRes.data.data.modalidades || []);
      setTotalAlunos(dashRes.data.data.totalAlunos || 0);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setErro(error.response?.data?.message || 'Erro ao carregar dados da escola');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState
          title="Carregando alunos"
          description="Buscando dados de matrícula e modalidades da escola."
          minHeight="60vh"
        />
      </PageContainer>
    );
  }

  if (erro) {
    return (
      <PageContainer>
        <ErrorState
          title="Não foi possível carregar alunos"
          description={erro}
          actionLabel="Tentar novamente"
          onAction={carregarDados}
          minHeight="60vh"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Alunos e Modalidades"
        subtitle="Informações sobre alunos e modalidades da escola"
        breadcrumbs={[{ label: 'Portal Escola', path: '/portal-escola' }, { label: 'Alunos' }]}
      />

      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/portal-escola')}
        sx={{ mb: 3 }}
      >
        Voltar ao Portal
      </Button>

      {/* Informações da Escola */}
      <Card sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon sx={{ color: 'primary.main' }} />
          Informações da Escola
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Nome</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{escola?.nome}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Endereço</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{escola?.endereco || '-'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Telefone</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{escola?.telefone || '-'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Email</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{escola?.email || '-'}</Typography>
          </Grid>
        </Grid>
      </Card>

      {/* Total de Alunos */}
      <Card sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: 'primary.lighter' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PeopleIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Box>
              <Typography variant="body2" color="text.secondary">Total de Alunos</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {totalAlunos}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* Alunos por Modalidade */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon sx={{ color: 'primary.main' }} />
          Alunos por Modalidade
        </Typography>
        {modalidades.length === 0 ? (
          <EmptyState
            title="Nenhuma modalidade vinculada"
            description="Esta escola ainda não possui distribuição de alunos por modalidade."
            compact
          />
        ) : (
          <Grid container spacing={2}>
            {modalidades.map((mod, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    {mod.nome}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {mod.quantidade_alunos || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    alunos
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </PageContainer>
  );
}
