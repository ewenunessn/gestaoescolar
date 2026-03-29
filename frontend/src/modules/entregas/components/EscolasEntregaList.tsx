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
import { buscarInstituicao, Instituicao } from '../../../services/instituicao';
import { formatarQuantidade } from '../../../utils/formatters';

// Inicialização local do pdfmake (mesmo padrão do CardapioCalendario que funciona)
const initPdfMakeLocal = async () => {
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default as any;
  (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts;
  return pdfMake;
};

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
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);

  useEffect(() => {
    buscarInstituicao().then(setInstituicao).catch(() => {});
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

      // Determinar mês/ano a partir dos itens ou filtro
      const mesAno = (() => {
        const item = itens[0];
        if (item?.mes && item?.ano) {
          const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
          return `MÊS: ${meses[item.mes - 1]}  ${item.ano}`;
        }
        if (filtros.dataInicio) {
          const d = new Date(filtros.dataInicio + 'T12:00:00');
          const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
          return `MÊS: ${meses[d.getMonth()]}  ${d.getFullYear()}`;
        }
        return '';
      })();

      // Ordenar itens por nome
      const itensOrdenados = [...itens].sort((a, b) => a.produto_nome.localeCompare(b.produto_nome));

      // Garantir mínimo de 25 linhas (linhas em branco para preenchimento)
      const MIN_LINHAS = 25;
      const linhasVazias = Math.max(0, MIN_LINHAS - itensOrdenados.length);

      // Corpo da tabela — estilo DataTable do sistema (cabeçalho grey.100, bordas sutis)
      const tableBody: any[][] = [
        // Cabeçalho
        [
          { text: 'ID',          bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [4,5,4,5] },
          { text: 'ITEM',        bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', margin: [6,5,6,5] },
          { text: 'UND. MEDIDA', bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [4,5,4,5] },
          { text: '1 ENTREGA',   bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [4,5,4,5] },
          { text: 'DATA',        bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [4,5,4,5] },
          { text: 'CONFIRMAÇÃO', bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [4,5,4,5] },
        ],
        // Itens
        ...itensOrdenados.map((item, idx) => [
          { text: String(idx + 1).padStart(2, '0'), fontSize: 8, alignment: 'center', fillColor: '#FFFFFF', margin: [4,4,4,4] },
          { text: item.produto_nome, fontSize: 8, fillColor: '#FFFFFF', margin: [6,4,6,4] },
          { text: item.unidade || item.produto_unidade || '', bold: true, fontSize: 8, alignment: 'center', fillColor: '#FFFFFF', margin: [4,4,4,4] },
          { text: formatarQuantidade(item.quantidade), fontSize: 8, alignment: 'center', fillColor: '#FFFFFF', margin: [4,4,4,4] },
          { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
          { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
        ]),
        // Linhas em branco
        ...Array.from({ length: linhasVazias }, (_, i) => [
          { text: String(itensOrdenados.length + i + 1).padStart(2, '0'), fontSize: 8, alignment: 'center', fillColor: '#FFFFFF', margin: [4,4,4,4] },
          { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [6,4,6,4] },
          { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
          { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
          { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
          { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
        ]),
      ];

      const tableLayout = {
        hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.4),
        vLineWidth: () => 0.4,
        hLineColor: (i: number, node: any) => (i === 0 || i === node.table.body.length ? '#BDBDBD' : '#E0E0E0'),
        vLineColor: () => '#E0E0E0',
        fillColor: () => null,
      };

      const logoUrl = instituicao?.logo_url ? (() => {
        const url = instituicao.logo_url;
        if (url.startsWith('data:')) return url;
        if (url.startsWith('/')) return `${window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://gestaoescolar-backend.vercel.app'}${url}`;
        return url;
      })() : null;

      const headerLeft: any = {
        columns: [
          ...(logoUrl ? [{ image: logoUrl, width: 50, height: 50, margin: [0, 0, 8, 0] }] : []),
          {
            stack: [
              { text: instituicao?.nome?.toUpperCase() || 'SECRETARIA MUNICIPAL DE EDUCAÇÃO', fontSize: 11, bold: true },
              { text: instituicao?.secretario_cargo?.toUpperCase() || 'DEPARTAMENTO DE ALIMENTAÇÃO ESCOLAR', fontSize: 8, color: '#555' },
            ],
            alignment: 'left',
          },
        ],
        width: '*',
      };

      const rotaLabel = escola.rota_nome ? escola.rota_nome.toUpperCase() : (filtros.rotaId ? `ROTA ${filtros.rotaId}` : 'SEM ROTA');
      const numLabel  = escola.ordem_rota && escola.ordem_rota !== 999
        ? `Nº ${escola.ordem_rota}`
        : (escola.rota_id ? `Nº ${escola.rota_id}` : '');

      const headerRight: any = {
        table: {
          widths: ['*', 50],
          body: [[
            { text: rotaLabel, bold: true, fontSize: 9, alignment: 'center', margin: [6, 6, 6, 6] },
            { text: numLabel,  bold: true, fontSize: 9, alignment: 'center', margin: [6, 6, 6, 6] },
          ]],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#333333',
          vLineColor: () => '#333333',
        },
        width: 160,
      };

      const pdfMake = await initPdfMakeLocal();

      const docDef: any = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [28, 28, 28, 36],
        content: [
          // Cabeçalho
          {
            columns: [headerLeft, headerRight],
            columnGap: 8,
            margin: [0, 0, 0, 4],
          },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 539, y2: 0, lineWidth: 1, lineColor: '#cccccc' }], margin: [0, 4, 0, 10] },

          // Nome da escola
          { text: escola.nome.toUpperCase(), fontSize: 13, bold: true, margin: [0, 0, 0, 6] },

          // Endereço | Total alunos | Mês
          {
            columns: [
              { text: escola.endereco ? `Nº ${escola.endereco.toUpperCase()}` : '', fontSize: 8, width: '*' },
              { text: `TOTAL DE ALUNOS:  ${escola.total_alunos ?? '—'}`, fontSize: 8, alignment: 'center', width: 160 },
              { text: mesAno, fontSize: 8, alignment: 'right', width: 140 },
            ],
            margin: [0, 0, 0, 6],
          },

          // Tabela
          {
            table: {
              headerRows: 1,
              widths: [22, '*', 60, 50, 50, 70],
              body: tableBody,
            },
            layout: tableLayout,
          },
        ],
        footer: (currentPage: number, pageCount: number) => ({
          columns: [
            { text: instituicao?.nome || 'NutriLog', fontSize: 7, color: '#a0aec0', margin: [28, 0, 0, 0] },
            { text: `Página ${currentPage} de ${pageCount} · Gerado em ${new Date().toLocaleDateString('pt-BR')}`, fontSize: 7, color: '#a0aec0', alignment: 'right', margin: [0, 0, 28, 0] },
          ],
        }),
        defaultStyle: { font: 'Roboto' },
      };

      // Verificar se existe template personalizado salvo para guia_entrega
      const templatePersonalizado = instituicao?.pdf_templates?.['guia_entrega'];

      if (templatePersonalizado) {
        // Usar @pdfme/generator com o template do editor visual
        const { generate } = await import('@pdfme/generator');
        const { text, image, line, rectangle, ellipse, table, barcodes } = await import('@pdfme/schemas');
        const plugins = { text, image, line, rectangle, ellipse, table, ...barcodes };

        // Montar inputs com as variáveis dinâmicas
        const inputs = [{
          inst_nome: instituicao?.nome || '',
          inst_departamento: instituicao?.departamento || '',
          inst_logo: instituicao?.logo_url || '',
          inst_secretario: instituicao?.secretario_nome || '',
          inst_cargo: instituicao?.secretario_cargo || '',
          escola_nome: escola.nome,
          escola_endereco: escola.endereco || '',
          rota_nome: rotaLabel,
          rota_numero: numLabel,
          total_alunos: String(escola.total_alunos ?? ''),
          mes_ano: mesAno,
        }];

        const pdf = await generate({ template: templatePersonalizado, inputs, plugins });
        const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `guia-entrega-${escola.nome}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback: layout padrão com pdfmake
      await new Promise<void>((resolve, reject) => {
        pdfMake.createPdf(docDef).getBlob((blob: Blob) => {
          try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `guia-entrega-${escola.nome}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setError(`Erro ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`);
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
                    value={Number(escola.percentual_entregue) || 0}
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
