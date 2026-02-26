import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Button,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  School as SchoolIcon,
  LocalShipping as DeliveryIcon,
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { EscolaEntrega, EstatisticasEntregas } from '../types';
import { entregaService } from '../services/entregaService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EscolasEntregaListProps {
  onEscolaSelect: (escola: EscolaEntrega) => void;
  filtros: {
    guiaId?: number;
    rotaId?: number;
    dataInicio?: string;
    dataFim?: string;
    somentePendentes?: boolean;
  };
}

export const EscolasEntregaList: React.FC<EscolasEntregaListProps> = ({ onEscolaSelect, filtros }) => {
  const [escolas, setEscolas] = useState<EscolaEntrega[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasEntregas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [gerandoPdfId, setGerandoPdfId] = useState<number | null>(null);

  useEffect(() => {
    carregarDados();
  }, [filtros]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [escolasData, estatisticasData] = await Promise.all([
        entregaService.listarEscolas(
          filtros.guiaId,
          filtros.rotaId,
          undefined,
          filtros.dataInicio,
          filtros.dataFim,
          filtros.somentePendentes
        ),
        entregaService.obterEstatisticas(
          filtros.guiaId,
          filtros.rotaId,
          undefined,
          filtros.dataInicio,
          filtros.dataFim,
          filtros.somentePendentes
        )
      ]);
      
      setEscolas(escolasData);
      setEstatisticas(estatisticasData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados das entregas');
    } finally {
      setLoading(false);
    }
  };

  const escolasFiltradas = escolas.filter(escola =>
    escola.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  const getStatusColor = (percentual: number) => {
    const valor = Number(percentual);
    if (Number.isNaN(valor)) return 'error';
    if (valor >= 100) return 'success';
    if (valor >= 50) return 'warning';
    return 'error';
  };

  const formatarData = (data?: string) => {
    if (!data) return '';
    const [ano, mes, dia] = data.split('T')[0].split('-');
    if (!ano || !mes || !dia) return data;
    return `${dia}/${mes}/${ano}`;
  };

  const formatarDataPdf = (data?: string) => {
    if (!data) return 'Sem data';
    const [ano, mes, dia] = data.split('T')[0].split('-');
    if (!ano || !mes || !dia) return data;
    return `${dia}/${mes}/${ano}`;
  };

  const gerarPdfEscola = async (escola: EscolaEntrega) => {
    try {
      setGerandoPdfId(escola.id);
      const itens = await entregaService.listarItensPorEscola(
        escola.id,
        filtros.guiaId,
        undefined,
        filtros.dataInicio,
        filtros.dataFim,
        filtros.somentePendentes
      );

      const grupos = new Map<string, { label: string; itens: typeof itens }>();
      itens.forEach((item) => {
        const chave = item.data_entrega ? item.data_entrega.split('T')[0] : 'sem-data';
        const label = item.data_entrega ? formatarDataPdf(item.data_entrega) : 'Sem data';
        if (!grupos.has(chave)) {
          grupos.set(chave, { label, itens: [] });
        }
        grupos.get(chave)!.itens.push(item);
      });

      const chavesOrdenadas = Array.from(grupos.keys()).sort((a, b) => {
        if (a === 'sem-data') return 1;
        if (b === 'sem-data') return -1;
        return a.localeCompare(b);
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      doc.setFontSize(14);
      doc.text('Itens para Entrega', 40, 40);
      doc.setFontSize(11);
      doc.text(`Escola: ${escola.nome}`, 40, 60);
      if (filtros.guiaId) {
        doc.text(`Guia: ${filtros.guiaId}`, 40, 78);
      }

      let startY = filtros.guiaId ? 92 : 78;
      chavesOrdenadas.forEach((chave) => {
        const grupo = grupos.get(chave);
        if (!grupo) return;
        doc.setFontSize(12);
        doc.text(`Data: ${grupo.label}`, 40, startY + 16);
        autoTable(doc, {
          startY: startY + 24,
          head: [[
            'Número',
            'Nome do item',
            'Unidade',
            'Quantidade',
            'Data de recebimento',
            'Assinatura'
          ]],
          body: grupo.itens.map((item) => ([
            String(item.id),
            item.produto_nome,
            item.unidade,
            String(item.quantidade),
            item.data_entrega ? formatarDataPdf(item.data_entrega) : '',
            ''
          ])),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [25, 118, 210] }
        });
        // @ts-ignore
        startY = (doc as any).lastAutoTable.finalY + 12;
      });

      doc.save(`itens-entrega-${escola.nome}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setError('Erro ao gerar PDF');
    } finally {
      setGerandoPdfId(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Estatísticas Gerais */}
      {estatisticas && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <SchoolIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{estatisticas.total_escolas}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Escolas
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <DeliveryIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{estatisticas.total_itens}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de Itens
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckIcon color="success" />
                  <Box>
                    <Typography variant="h6">{estatisticas.itens_entregues}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Entregues
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <PendingIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{estatisticas.itens_pendentes}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pendentes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtro */}
      <TextField
        fullWidth
        placeholder="Buscar escola..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Lista de Escolas */}
      <Grid container spacing={2}>
        {escolasFiltradas.map((escola) => (
          <Grid item xs={12} md={6} lg={4} key={escola.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
              onClick={() => onEscolaSelect(escola)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" component="h3" sx={{ flexGrow: 1 }}>
                    {escola.nome}
                  </Typography>
                  <Chip
                    label={`${escola.percentual_entregue}%`}
                    color={getStatusColor(escola.percentual_entregue)}
                    size="small"
                  />
                </Box>

                {escola.endereco && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {escola.endereco}
                  </Typography>
                )}

                {escola.telefone && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    📞 {escola.telefone}
                  </Typography>
                )}

                {escola.data_entrega && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Entrega: {formatarData(escola.data_entrega)}
                  </Typography>
                )}

                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">
                      Progresso das Entregas
                    </Typography>
                    <Typography variant="body2">
                      {escola.itens_entregues}/{escola.total_itens}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={escola.percentual_entregue}
                    color={getStatusColor(escola.percentual_entregue)}
                  />
                </Box>

                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<DeliveryIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEscolaSelect(escola);
                    }}
                  >
                    Ver Itens para Entrega
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<PdfIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      gerarPdfEscola(escola);
                    }}
                    disabled={gerandoPdfId === escola.id}
                  >
                    {gerandoPdfId === escola.id ? 'Gerando...' : 'Gerar PDF'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {escolasFiltradas.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            {filtro ? 'Nenhuma escola encontrada com esse filtro' : 'Nenhuma escola com itens para entrega'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
