import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, Grid, Chip, CircularProgress, Alert, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { School as SchoolIcon, Inventory as InventoryIcon, CheckCircle as CheckCircleIcon, Warning as WarningIcon, Restaurant as RestaurantIcon, Dashboard as DashboardIcon, Assignment as AssignmentIcon, Warehouse as WarehouseIcon } from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import ViewTabs from '../components/ViewTabs';
import api from '../services/api';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function PortalEscola() {
  const navigate = useNavigate();
  const [escola, setEscola] = useState<any>(null);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [cardapios, setCardapios] = useState<any[]>([]);
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [abaAtiva, setAbaAtiva] = useState(0); // 0 = Dashboard, 1 = Guia de Demanda, 2 = Cardápio

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setErro('');
      const [dashRes, cardapiosRes] = await Promise.all([
        api.get('/escola-portal/dashboard'),
        api.get('/escola-portal/cardapios-semana')
      ]);
      
      setEscola(dashRes.data.data.escola);
      setModalidades(dashRes.data.data.modalidades || []);
      setTotalAlunos(dashRes.data.data.totalAlunos || 0);
      setStats(dashRes.data.data.estatisticas);
      setCardapios(cardapiosRes.data.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setErro(error.response?.data?.message || 'Erro ao carregar dados da escola');
    } finally {
      setLoading(false);
    }
  };

  const modalidadesUnicas = Array.from(new Set(cardapios.map(c => c.modalidade_id)))
    .map(id => cardapios.find(c => c.modalidade_id === id))
    .filter(Boolean);

  const cardapiosFiltrados = modalidadesUnicas.length > 0
    ? cardapios.filter(c => c.modalidade_id === modalidadesUnicas[modalidadeSelecionada]?.modalidade_id)
    : [];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
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
        title={escola?.nome || 'Portal da Escola'} 
        subtitle="Informações e gestão da sua escola"
      />

      {/* ViewTabs para navegação */}
      <Box sx={{ mb: 3 }}>
        <ViewTabs
          value={abaAtiva}
          onChange={setAbaAtiva}
          tabs={[
            { value: 0, label: 'Dashboard', icon: <DashboardIcon /> },
            { value: 1, label: 'Guia de Demanda', icon: <AssignmentIcon /> },
            { value: 2, label: 'Cardápio', icon: <RestaurantIcon /> },
          ]}
        />
      </Box>

      {/* Conteúdo da aba Dashboard */}
      {abaAtiva === 0 && (
        <Grid container spacing={2}>
          {/* Cards de Estatísticas */}
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <InventoryIcon sx={{ color: 'primary.main' }} />
                <Typography variant="caption" color="text.secondary">Total de Guias</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats?.total_guias || 0}
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <InventoryIcon sx={{ color: 'info.main' }} />
                <Typography variant="caption" color="text.secondary">Produtos</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                {stats?.total_produtos || 0}
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WarningIcon sx={{ color: 'warning.main' }} />
                <Typography variant="caption" color="text.secondary">Pendentes</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                {stats?.pendentes || 0}
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon sx={{ color: 'success.main' }} />
                <Typography variant="caption" color="text.secondary">Entregues</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                {stats?.entregues || 0}
              </Typography>
            </Card>
          </Grid>

          {/* Informações da Escola */}
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3, borderRadius: '12px' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolIcon />
                Informações da Escola
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Nome</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {escola?.nome}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Código</Typography>
                  <Typography variant="body1">{escola?.codigo || '—'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Endereço</Typography>
                  <Typography variant="body1">{escola?.endereco || '—'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={escola?.ativo ? 'Ativa' : 'Inativa'} 
                    color={escola?.ativo ? 'success' : 'default'} 
                    size="small" 
                  />
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Alunos por Modalidade */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, borderRadius: '12px', height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Alunos por Modalidade
              </Typography>
              
              {/* Total de Alunos */}
              <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.lighter', borderRadius: '8px' }}>
                <Typography variant="body2" color="text.secondary">Total de Alunos</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {totalAlunos}
                </Typography>
              </Box>

              {/* Lista de Modalidades */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {modalidades.length > 0 ? (
                  modalidades.map((mod) => (
                    <Box 
                      key={mod.id} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: '8px'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {mod.nome}
                      </Typography>
                      <Chip 
                        label={mod.quantidade_alunos} 
                        size="small" 
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma modalidade cadastrada
                  </Typography>
                )}
              </Box>
            </Card>
          </Grid>

          {/* Informações Adicionais */}
          <Grid item xs={12}>
            <Card sx={{ p: 3, borderRadius: '12px', bgcolor: 'info.lighter' }}>
              <Typography variant="body2" color="info.dark">
                <strong>Bem-vindo ao Portal da Escola!</strong> Aqui você pode acompanhar as guias de demanda, 
                entregas e outras informações relacionadas à sua escola.
              </Typography>
            </Card>
          </Grid>

          {/* Botão para Estoque da Escola */}
          <Grid item xs={12}>
            <Card sx={{ p: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <WarehouseIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Estoque da Escola
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gerencie o estoque de produtos da sua escola
                    </Typography>
                  </Box>
                </Box>
                <Button 
                  variant="contained" 
                  size="large"
                  startIcon={<WarehouseIcon />}
                  onClick={() => navigate('/estoque-escola-portal')}
                >
                  Acessar Estoque
                </Button>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Conteúdo da aba Guia de Demanda */}
      {abaAtiva === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={{ p: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AssignmentIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">
                  Guias de Demanda
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Cards de resumo das guias */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: '8px' }}>
                      <Typography variant="body2" color="text.secondary">Total de Guias</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {stats?.total_guias || 0}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: '8px' }}>
                      <Typography variant="body2" color="text.secondary">Pendentes</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {stats?.pendentes || 0}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: '8px' }}>
                      <Typography variant="body2" color="text.secondary">Entregues</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {stats?.entregues || 0}
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                {/* Informação sobre as guias */}
                <Alert severity="info">
                  As guias de demanda contêm informações sobre os produtos que sua escola vai receber. 
                  Acompanhe o status de cada guia e os produtos solicitados.
                </Alert>

                {/* Placeholder para lista de guias */}
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Lista de guias será exibida aqui
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Conteúdo da aba Cardápio */}
      {abaAtiva === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={{ p: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <RestaurantIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">
                  Cardápio da Semana
                </Typography>
              </Box>

              {cardapios.length > 0 ? (
                <>
                  {/* Tabs de Modalidades */}
                  {modalidadesUnicas.length > 1 && (
                    <Tabs 
                      value={modalidadeSelecionada} 
                      onChange={(_, v) => setModalidadeSelecionada(v)}
                      sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                    >
                      {modalidadesUnicas.map((mod) => (
                        <Tab key={mod.modalidade_id} label={mod.modalidade_nome} />
                      ))}
                    </Tabs>
                  )}

                  {/* Tabela de Cardápios */}
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Dia</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Refeições</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cardapiosFiltrados.length > 0 ? (
                          cardapiosFiltrados.map((cardapio) => {
                            const data = new Date(cardapio.ano, cardapio.mes - 1, cardapio.dia);
                            const diaSemana = DIAS_SEMANA[data.getDay()];
                            const dataFormatada = data.toLocaleDateString('pt-BR');
                            
                            return (
                              <TableRow key={`${cardapio.id}-${cardapio.dia}`} hover>
                                <TableCell sx={{ fontWeight: 500 }}>{diaSemana}</TableCell>
                                <TableCell>{dataFormatada}</TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {cardapio.refeicoes && cardapio.refeicoes.length > 0 ? (
                                      cardapio.refeicoes.map((ref: any) => (
                                        <Chip 
                                          key={ref.id}
                                          label={ref.nome}
                                          size="small"
                                          sx={{ fontSize: '0.75rem' }}
                                        />
                                      ))
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">
                                        Sem refeições cadastradas
                                      </Typography>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                Nenhum cardápio cadastrado para esta semana
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Alert severity="info">
                  Nenhum cardápio cadastrado para esta semana
                </Alert>
              )}
            </Card>
          </Grid>
        </Grid>
      )}
    </PageContainer>
  );
}
