import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Box, Card, Typography, Grid, CircularProgress, Alert, Chip, Button
} from "@mui/material";
import { 
  Restaurant as RestaurantIcon, ArrowBack as ArrowBackIcon, Print as PrintIcon
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import api from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import CardapioSemanalPortal from "../components/CardapioSemanalPortal";
import { carregarTiposRefeicao } from "../../../services/cardapiosModalidade";
import { gerarPDFTabela } from "../../../utils/cardapioPdfTabela";
import { buscarInstituicao } from "../../../services/instituicao";

export default function CardapioPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [cardapios, setCardapios] = useState<any[]>([]);
  const [tiposRefeicao, setTiposRefeicao] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useEffect(() => {
    carregarDados();
    carregarTiposRefeicao()
      .then(tipos => setTiposRefeicao(tipos))
      .catch(err => console.error('Erro ao carregar tipos de refeição:', err));
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const cardapiosRes = await api.get('/escola-portal/cardapios-semana');
      setCardapios(cardapiosRes.data.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar cardápios:', error);
      toast.error('Erro ao carregar cardápios');
    } finally {
      setLoading(false);
    }
  };

  const handleImprimirCardapio = async () => {
    if (cardapios.length === 0) {
      toast.error('Nenhum cardápio disponível para imprimir');
      return;
    }

    setGerandoPdf(true);
    try {
      // Obter os dias únicos que têm refeições
      const diasComRefeicoes = cardapios
        .filter(c => c.refeicoes && c.refeicoes.length > 0)
        .map(c => new Date(c.ano, c.mes - 1, c.dia))
        .sort((a, b) => a.getTime() - b.getTime());

      if (diasComRefeicoes.length === 0) {
        toast.error('Nenhuma refeição cadastrada para esta semana');
        return;
      }

      // Transformar os dados para o formato esperado pela função de PDF
      const refeicoes = cardapios.flatMap(c => 
        (c.refeicoes || []).map((ref: any) => ({
          id: ref.id,
          dia: c.dia,
          tipo_refeicao: ref.tipo_refeicao,
          refeicao_id: ref.id,
          refeicao_nome: ref.nome,
          cardapio_modalidade_id: c.id
        }))
      );

      // Pegar informações do primeiro cardápio
      const primeiroCardapio = cardapios[0];
      const cardapioInfo = {
        id: primeiroCardapio.id,
        nome: 'Cardápio Semanal',
        mes: primeiroCardapio.mes,
        ano: primeiroCardapio.ano,
        modalidades_nomes: primeiroCardapio.modalidades_nomes || ''
      };

      await gerarPDFTabela({
        diasSelecionadosCalendario: diasComRefeicoes,
        cardapio: cardapioInfo as any,
        refeicoes: refeicoes as any,
        fetchInstituicaoForPDF: buscarInstituicao
      });

      toast.success('PDF gerado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast.error(error.message || 'Erro ao gerar PDF do cardápio');
    } finally {
      setGerandoPdf(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Cardápio Semanal"
        subtitle="Visualize o cardápio da semana"
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Portal Escola' }, { label: 'Cardápio' }]}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/portal-escola')}
        >
          Voltar ao Portal
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handleImprimirCardapio}
          disabled={gerandoPdf || cardapios.length === 0}
        >
          {gerandoPdf ? 'Gerando PDF...' : 'Imprimir Cardápio Semanal'}
        </Button>
      </Box>

      {/* Cardápio do Dia */}
      <Card sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <RestaurantIcon sx={{ color: 'primary.main' }} />
          Cardápio de Hoje
        </Typography>
        
        {(() => {
          const hoje = new Date();
          const cardapioHoje = cardapios.find(c => {
            const dataCardapio = new Date(c.ano, c.mes - 1, c.dia);
            return dataCardapio.toDateString() === hoje.toDateString();
          });

          if (!cardapioHoje || !cardapioHoje.refeicoes || cardapioHoje.refeicoes.length === 0) {
            return (
              <Alert severity="info">
                Não há cardápio cadastrado para hoje.
              </Alert>
            );
          }

          // Agrupar refeições por tipo
          const refeicoesPorTipo: Record<string, any[]> = {};
          cardapioHoje.refeicoes.forEach((ref: any) => {
            const tipo = ref.tipo_refeicao || 'refeicao';
            if (!refeicoesPorTipo[tipo]) {
              refeicoesPorTipo[tipo] = [];
            }
            refeicoesPorTipo[tipo].push(ref);
          });

          // Filtrar apenas tipos que têm preparações
          const tiposComPreparacoes = Object.entries(refeicoesPorTipo).filter(
            ([_, refeicoes]) => refeicoes.length > 0
          );

          if (tiposComPreparacoes.length === 0) {
            return (
              <Alert severity="info">
                Não há preparações cadastradas para hoje.
              </Alert>
            );
          }

          return (
            <Grid container spacing={2}>
              {tiposComPreparacoes.map(([tipo, refeicoes]) => {
                const label = tiposRefeicao[tipo] || tipo;

                return (
                  <Grid item xs={12} sm={6} md={4} key={tipo}>
                    <Card sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: '8px', height: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <RestaurantIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {label}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {refeicoes.map((ref: any, idx: number) => (
                          <Chip
                            key={idx}
                            label={ref.nome}
                            size="small"
                            sx={{
                              bgcolor: 'white',
                              fontSize: '0.75rem',
                              height: 24,
                              justifyContent: 'flex-start',
                              '& .MuiChip-label': {
                                px: 1.5
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          );
        })()}
      </Card>

      {/* Cardápio Semanal */}
      <Card sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <RestaurantIcon sx={{ color: 'primary.main' }} />
          Cardápio da Semana
        </Typography>
        <CardapioSemanalPortal cardapios={cardapios} />
      </Card>
    </PageContainer>
  );
}
