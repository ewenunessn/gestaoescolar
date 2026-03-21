import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, Grid, IconButton, InputLabel, MenuItem, Select, TextField, Typography, Chip, Menu,
  CircularProgress, Divider, Alert
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Delete as DeleteIcon, PictureAsPdf as PdfIcon, MoreVert as MoreIcon, Event as EventIcon, CalendarMonth as CalendarIcon, RestaurantMenu as RestaurantIcon } from '@mui/icons-material';
import { useToast } from '../hooks/useToast';
import { usePageTitle } from '../contexts/PageTitleContext';
import PageContainer from '../components/PageContainer';
import CalendarioCardapio from '../components/CalendarioCardapio';
import { useInstituicaoForPDF } from '../hooks/useInstituicao';
import { createPDFHeader, createPDFFooter, getDefaultPDFStyles } from '../utils/pdfUtils';
import {
  buscarCardapioModalidade, listarRefeicoesCardapio, adicionarRefeicaoDia,
  removerRefeicaoDia, CardapioModalidade, RefeicaoDia, TIPOS_REFEICAO, MESES
} from '../services/cardapiosModalidade';
import { listarRefeicoes } from '../services/refeicoes';
import { listarEventosPorMes, getLabelsEventos, getCoresEventos } from '../services/calendarioLetivo';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { DetalheDiaCardapioDialog } from '../components/DetalheDiaCardapioDialog';
import api from '../services/api';

// Função para obter URL base da API
const getApiBaseUrl = () => {
  return process.env.NODE_ENV === 'production' 
    ? 'https://gestaoescolar-backend.vercel.app'
    : 'http://localhost:3000';
};
// Importação dinâmica para pdfmake (funciona melhor com Vite)
const initPdfMake = async () => {
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default as any;
  
  // Configurar fontes
  (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts;
  return pdfMake;
};

const CardapioCalendarioPage: React.FC = () => {
  const { cardapioId } = useParams<{ cardapioId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { setPageTitle } = usePageTitle();
  const { fetchInstituicaoForPDF } = useInstituicaoForPDF();

  const [cardapio, setCardapio] = useState<CardapioModalidade | null>(null);
  const [refeicoes, setRefeicoes] = useState<RefeicaoDia[]>([]);
  const [refeicoesDisponiveis, setRefeicoesDisponiveis] = useState<any[]>([]);
  const [eventosCalendario, setEventosCalendario] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openListDialog, setOpenListDialog] = useState(false);
  const [openDetalhesDialog, setOpenDetalhesDialog] = useState(false);
  const [openDetalhesDiaDialog, setOpenDetalhesDiaDialog] = useState(false);
  const [openPeriodoDialog, setOpenPeriodoDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [ano, setAno] = useState(0);
  const [mes, setMes] = useState(0);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [refeicaoDetalhes, setRefeicaoDetalhes] = useState<any>(null);
  const [produtosRefeicao, setProdutosRefeicao] = useState<any[]>([]);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [periodoForm, setPeriodoForm] = useState({
    diaInicio: 1,
    diaFim: 31
  });
  const [formData, setFormData] = useState({
    refeicao_id: '',
    tipo_refeicao: '',
    observacao: ''
  });

  useEffect(() => {
    if (cardapioId) loadData();
  }, [cardapioId]);

  useEffect(() => {
    if (cardapio) {
      setAno(cardapio.ano);
      setMes(cardapio.mes);
    }
  }, [cardapio]);

  const loadData = async () => {
    try {
      const [cardapioData, refeicoesData, refeicoesDisp] = await Promise.all([
        buscarCardapioModalidade(parseInt(cardapioId!)),
        listarRefeicoesCardapio(parseInt(cardapioId!)),
        listarRefeicoes()
      ]);
      setCardapio(cardapioData);
      setRefeicoes(refeicoesData);
      setRefeicoesDisponiveis(refeicoesDisp);
      
      // Carregar eventos do calendário letivo
      if (cardapioData) {
        try {
          const eventos = await listarEventosPorMes(0, cardapioData.ano, cardapioData.mes);
          setEventosCalendario(eventos);
        } catch (error) {
          console.error('Erro ao carregar eventos do calendário:', error);
          setEventosCalendario([]);
        }
      }
      
      // Definir título da página
      if (cardapioData) {
        const mesNome = MESES[cardapioData.mes - 1];
        setPageTitle(`Cardápio ${mesNome}/${cardapioData.ano} - ${cardapioData.modalidade_nome}`);
      }
    } catch (err) {
      toast.error('Erro ao carregar cardápio');
    }
  };

  const handleMesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const handleProximoMes = () => {
    if (mes === 12) {
      setMes(1);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
  };

  const handleDiaClick = (data: string) => {
    const dia = parseInt(data.split('-')[2]);
    setDiaSelecionado(dia);
    setOpenDetalhesDiaDialog(true);
  };

  const getRefeicoesNoDia = (dia: number) => {
    return refeicoes.filter(r => r.dia === dia);
  };

  const getEventosNoDia = (dia: number) => {
    if (!cardapio) return [];
    const dataStr = `${cardapio.ano}-${String(cardapio.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return eventosCalendario.filter(evento => {
      const dataInicio = evento.data_inicio.split('T')[0];
      const dataFim = evento.data_fim ? evento.data_fim.split('T')[0] : dataInicio;
      return dataStr >= dataInicio && dataStr <= dataFim;
    });
  };

  const handleOpenDialog = (dia: number) => {
    setDiaSelecionado(dia);
    setFormData({ refeicao_id: '', tipo_refeicao: '', observacao: '' });
    setOpenDialog(true);
  };

  const handleOpenDetalhesDia = async (dia: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDiaSelecionado(dia);
    setOpenDetalhesDiaDialog(true);
  };

  const handleOpenListDialog = (dia: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDiaSelecionado(dia);
    setOpenListDialog(true);
  };

  const handleOpenDetalhes = async (refeicaoId: number) => {
    try {
      setLoadingDetalhes(true);
      const refeicao = refeicoesDisponiveis.find(r => r.id === refeicaoId);
      if (refeicao) {
        setRefeicaoDetalhes(refeicao);
        
        // Buscar produtos da preparação
        const response = await api.get(`/refeicoes/${refeicaoId}/produtos`);
        setProdutosRefeicao(response.data || []);
        
        setOpenDetalhesDialog(true);
      }
    } catch (err) {
      toast.error('Erro ao carregar detalhes');
      setProdutosRefeicao([]);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const exportarCalendarioPDF = async () => {
    if (!cardapio) return;
    
    try {
      const pdfMake = await initPdfMake();
      
      // Buscar informações da instituição
      let instituicao = null;
      try {
        const response = await api.get('/instituicao');
        instituicao = response.data;
      } catch (err) {
        console.log('Não foi possível carregar informações da instituição');
      }
      
      // Gerar semanas do calendário para o PDF
      const getCalendarioSemanasParaPDF = () => {
        const primeiroDia = new Date(cardapio.ano, cardapio.mes - 1, 1);
        const ultimoDia = new Date(cardapio.ano, cardapio.mes, 0).getDate();
        const diaSemanaInicio = primeiroDia.getDay();
        
        const semanas: (number | null)[][] = [];
        let semanaAtual: (number | null)[] = [];
        
        for (let i = 0; i < diaSemanaInicio; i++) {
          semanaAtual.push(null);
        }
        
        for (let dia = 1; dia <= ultimoDia; dia++) {
          semanaAtual.push(dia);
          if (semanaAtual.length === 7) {
            semanas.push(semanaAtual);
            semanaAtual = [];
          }
        }
        
        if (semanaAtual.length > 0) {
          while (semanaAtual.length < 7) {
            semanaAtual.push(null);
          }
          semanas.push(semanaAtual);
        }
        
        return semanas;
      };
      
      const semanas = getCalendarioSemanasParaPDF();
      const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
      
      // Criar corpo da tabela do calendário
      const tableBody: any[] = [];
      
      // Cabeçalho dos dias
      tableBody.push(
        diasSemana.map(dia => ({
          text: dia,
          style: 'tableHeader',
          alignment: 'center'
        }))
      );
      
      // Semanas
      semanas.forEach(semana => {
        const row = semana.map(dia => {
          if (dia === null) {
            return { text: '', fillColor: '#e0e0e0' };
          }
          
          const refeicoesNoDia = getRefeicoesNoDia(dia);
          const content: any[] = [
            { text: dia.toString(), bold: true, fontSize: 11, margin: [0, 0, 0, 3] }
          ];
          
          refeicoesNoDia.slice(0, 3).forEach(ref => {
            content.push({
              text: `${TIPOS_REFEICAO[ref.tipo_refeicao]}: ${ref.refeicao_nome}`,
              fontSize: 7,
              margin: [0, 1, 0, 1]
            });
          });
          
          if (refeicoesNoDia.length > 3) {
            content.push({
              text: `+${refeicoesNoDia.length - 3} mais`,
              fontSize: 7,
              italics: true,
              color: '#666'
            });
          }
          
          return {
            stack: content,
            margin: 3
          };
        });
        
        tableBody.push(row);
      });
      
      // Criar cabeçalho com logo se disponível
      const headerContent: any[] = [];
      
      if (instituicao?.logo_url) {
        headerContent.push({
          columns: [
            {
              image: instituicao.logo_url.startsWith('data:') ? instituicao.logo_url : `${getApiBaseUrl()}${instituicao.logo_url}`,
              width: 60,
              height: 60
            },
            {
              stack: [
                { text: instituicao.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
                { text: `Cardapio - ${cardapio.nome}`, style: 'subheader', alignment: 'center' },
                { text: `${MESES[cardapio.mes]} / ${cardapio.ano} - ${cardapio.modalidade_nome}`, style: 'subheader2', alignment: 'center' }
              ],
              width: '*'
            },
            { text: '', width: 60 } // Espaço para balancear
          ],
          margin: [0, 0, 0, 10]
        });
      } else {
        headerContent.push({
          stack: [
            { text: instituicao?.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
            { text: `Cardapio - ${cardapio.nome}`, style: 'subheader', alignment: 'center' },
            { text: `${MESES[cardapio.mes]} / ${cardapio.ano} - ${cardapio.modalidade_nome}`, style: 'subheader2', alignment: 'center' }
          ]
        });
      }
      
      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 60, 20, 40],
        header: {
          stack: headerContent,
          margin: [20, 15, 20, 0]
        },
        content: [
          {
            table: {
              widths: Array(7).fill('*'),
              heights: (row: number) => row === 0 ? 20 : 80,
              body: tableBody
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => '#cccccc',
              vLineColor: () => '#cccccc'
            }
          }
        ],
        styles: {
          header: { fontSize: 16, bold: true },
          subheader: { fontSize: 14, bold: true, margin: [0, 3, 0, 0] },
          subheader2: { fontSize: 11, margin: [0, 3, 0, 0] },
          tableHeader: { bold: true, fontSize: 9, fillColor: '#e3f2fd' }
        }
      };
      
      pdfMake.createPdf(docDefinition).download(`cardapio-${cardapio.mes}-${cardapio.ano}.pdf`);
      toast.success('PDF do calendário gerado!');
      setAnchorEl(null);
    } catch (err) {
      toast.error('Erro ao gerar PDF do calendário');
      console.error(err);
    }
  };

  const exportarFrequenciaPDF = async () => {
    if (!cardapio) return;
    
    try {
      const pdfMake = await initPdfMake();
      
      // Buscar informações da instituição
      const instituicao = await fetchInstituicaoForPDF();
      
      // Agrupar por tipo e preparação
      const frequencia: Record<string, Record<string, number>> = {};
      
      refeicoes.forEach(ref => {
        if (!frequencia[ref.tipo_refeicao]) {
          frequencia[ref.tipo_refeicao] = {};
        }
        if (!frequencia[ref.tipo_refeicao][ref.refeicao_nome]) {
          frequencia[ref.tipo_refeicao][ref.refeicao_nome] = 0;
        }
        frequencia[ref.tipo_refeicao][ref.refeicao_nome]++;
      });
      
      const content: any[] = [];
      
      // Para cada tipo de preparação
      Object.entries(TIPOS_REFEICAO).forEach(([tipo, tipoNome]) => {
        if (frequencia[tipo]) {
          content.push({
            text: tipoNome,
            style: 'sectionHeader',
            margin: [0, content.length > 0 ? 15 : 0, 0, 5]
          });
          
          const tableBody: any[] = [
            [
              { text: 'Refeicao', style: 'tableHeader' },
              { text: 'Frequencia', style: 'tableHeader', alignment: 'center' }
            ]
          ];
          
          Object.entries(frequencia[tipo]).forEach(([nome, freq]) => {
            tableBody.push([
              { text: nome },
              { text: freq.toString(), alignment: 'center' }
            ]);
          });
          
          content.push({
            table: {
              widths: ['*', 80],
              body: tableBody
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#cccccc',
              vLineColor: () => '#cccccc'
            }
          });
        }
      });
      
      // Criar cabeçalho com logo se disponível
      const headerContent: any[] = [];
      
      if (instituicao?.logo_url) {
        headerContent.push({
          columns: [
            {
              image: instituicao.logo_url.startsWith('data:') ? instituicao.logo_url : `https://gestaoescolar-backend.vercel.app${instituicao.logo_url}`,
              width: 50,
              height: 50
            },
            {
              stack: [
                { text: instituicao.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
                { text: `Relatorio de Frequencia - ${cardapio.nome}`, style: 'subheader', alignment: 'center' },
                { text: `${MESES[cardapio.mes]} / ${cardapio.ano} - ${cardapio.modalidade_nome}`, style: 'subheader2', alignment: 'center' }
              ],
              width: '*'
            },
            { text: '', width: 50 } // Espaço para balancear
          ]
        });
      } else {
        headerContent.push({
          stack: [
            { text: instituicao?.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
            { text: `Relatorio de Frequencia - ${cardapio.nome}`, style: 'subheader', alignment: 'center' },
            { text: `${MESES[cardapio.mes]} / ${cardapio.ano} - ${cardapio.modalidade_nome}`, style: 'subheader2', alignment: 'center' }
          ]
        });
      }
      
      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 80, 40, 40],
        header: {
          stack: headerContent,
          margin: [40, 20, 40, 0]
        },
        content: content,
        styles: {
          header: { fontSize: 16, bold: true },
          subheader: { fontSize: 14, bold: true, margin: [0, 3, 0, 0] },
          subheader2: { fontSize: 11, margin: [0, 3, 0, 0] },
          sectionHeader: { fontSize: 12, bold: true },
          tableHeader: { bold: true, fillColor: '#428bca', color: 'white', fontSize: 10 }
        }
      };
      
      pdfMake.createPdf(docDefinition).download(`frequencia-cardapio-${cardapio.mes}-${cardapio.ano}.pdf`);
      toast.success('PDF de frequência gerado!');
      setAnchorEl(null);
    } catch (err) {
      toast.error('Erro ao gerar PDF de frequência');
      console.error(err);
    }
  };

  const handleOpenPeriodoDialog = () => {
    if (!cardapio) return;
    const ultimoDia = new Date(cardapio.ano, cardapio.mes, 0).getDate();
    setPeriodoForm({ diaInicio: 1, diaFim: ultimoDia });
    setOpenPeriodoDialog(true);
    setAnchorEl(null);
  };

  const exportarRelatorioDetalhado = async () => {
    if (!cardapio) return;
    
    try {
      const pdfMake = await initPdfMake();
      
      // Buscar informações da instituição
      const instituicao = await fetchInstituicaoForPDF();
      
      // Filtrar refeições do período
      const refeicoesNoPeriodo = refeicoes.filter(
        ref => ref.dia >= periodoForm.diaInicio && ref.dia <= periodoForm.diaFim
      ).sort((a, b) => {
        if (a.dia !== b.dia) return a.dia - b.dia;
        const ordem: Record<string, number> = {
          'cafe_manha': 1,
          'lanche_manha': 2,
          'almoco': 3,
          'lanche_tarde': 4,
          'jantar': 5
        };
        return (ordem[a.tipo_refeicao] || 99) - (ordem[b.tipo_refeicao] || 99);
      });
      
      if (refeicoesNoPeriodo.length === 0) {
        const docDefinition: any = {
          content: [
            { text: 'Nenhuma refeicao cadastrada neste periodo', alignment: 'center', margin: [0, 50, 0, 0] }
          ]
        };
        pdfMake.createPdf(docDefinition).download(`cardapio-detalhado-${cardapio.mes}-${cardapio.ano}.pdf`);
        toast.success('PDF gerado!');
        setOpenPeriodoDialog(false);
        return;
      }
      
      // Buscar produtos de todas as refeições
      const refeicoesComProdutos = await Promise.all(
        refeicoesNoPeriodo.map(async (ref) => {
          try {
            const response = await api.get(`/refeicoes/${ref.refeicao_id}/produtos`);
            const produtos = response.data || [];
            return { ...ref, produtos };
          } catch {
            return { ...ref, produtos: [] };
          }
        })
      );
      
      // Agrupar por dia
      const refeicoesAgrupadas: Record<number, typeof refeicoesComProdutos> = {};
      refeicoesComProdutos.forEach(ref => {
        if (!refeicoesAgrupadas[ref.dia]) {
          refeicoesAgrupadas[ref.dia] = [];
        }
        refeicoesAgrupadas[ref.dia].push(ref);
      });
      
      // Cores suaves alternadas para cada dia
      const coresDias = [
        '#f5faff', // Azul muito claro
        '#fffaf5', // Laranja muito claro
        '#f5fff0', // Verde muito claro
        '#fff5fa', // Rosa muito claro
        '#faf5ff', // Roxo muito claro
        '#fffff5', // Amarelo muito claro
        '#f5ffff', // Ciano muito claro
      ];
      
      const tableBody: any[] = [
        [
          { text: 'Data', style: 'tableHeader', alignment: 'center' },
          { text: 'Refeicao', style: 'tableHeader' },
          { text: 'Produtos e Per Capita', style: 'tableHeader' }
        ]
      ];
      
      Object.entries(refeicoesAgrupadas).sort(([a], [b]) => Number(a) - Number(b)).forEach(([dia, refs], diaIndex) => {
        const diaSemana = new Date(cardapio.ano, cardapio.mes - 1, Number(dia)).toLocaleDateString('pt-BR', { weekday: 'short' });
        const dataFormatada = `${String(dia).padStart(2, '0')}/${String(cardapio.mes).padStart(2, '0')}\n${diaSemana}`;
        const corDia = coresDias[diaIndex % coresDias.length];
        
        // Adicionar espaçamento entre dias (exceto no primeiro)
        if (diaIndex > 0) {
          tableBody.push([
            { text: '', colSpan: 3, border: [false, false, false, false], margin: [0, 1, 0, 1] },
            {},
            {}
          ]);
        }
        
        refs.forEach((ref, refIdx) => {
          const refeicaoInfo = `${ref.refeicao_nome}\n(${TIPOS_REFEICAO[ref.tipo_refeicao]})`;
          
          // Criar colunas de produtos (4 itens por coluna)
          let produtosContent: any;
          
          if (ref.produtos && ref.produtos.length > 0) {
            const colunas: any[] = [];
            
            for (let i = 0; i < ref.produtos.length; i += 4) {
              const grupo = ref.produtos.slice(i, i + 4);
              const itens = grupo.map((produto: any) => {
                const produtoNome = produto.produto?.nome || produto.produto_nome || 'Produto';
                const perCapita = parseFloat(String(produto.per_capita)).toString();
                const unidade = produto.tipo_medida === 'gramas' ? 'g' : 'un';
                return { text: `- ${produtoNome}: ${perCapita} ${unidade}`, fontSize: 8 };
              });
              
              colunas.push({
                stack: itens,
                width: '*'
              });
            }
            
            produtosContent = {
              columns: colunas,
              columnGap: 10
            };
          } else {
            produtosContent = {
              text: 'Sem produtos cadastrados',
              fontSize: 8,
              italics: true,
              color: '#999999'
            };
          }
          
          if (refIdx === 0) {
            // Primeira preparação do dia
            tableBody.push([
              { 
                text: dataFormatada, 
                rowSpan: refs.length,
                alignment: 'center',
                bold: true,
                fontSize: 9,
                fillColor: corDia,
                valign: 'middle'
              },
              { 
                text: refeicaoInfo,
                bold: true,
                fontSize: 9,
                fillColor: corDia,
                valign: 'middle'
              },
              {
                ...produtosContent,
                fillColor: corDia,
                valign: 'top'
              }
            ]);
          } else {
            // Refeições seguintes do mesmo dia
            tableBody.push([
              {},
              { 
                text: refeicaoInfo,
                bold: true,
                fontSize: 9,
                fillColor: corDia,
                valign: 'middle'
              },
              {
                ...produtosContent,
                fillColor: corDia,
                valign: 'top'
              }
            ]);
          }
        });
      });
      
      // Criar cabeçalho com logo se disponível
      const headerContent: any[] = [];
      
      if (instituicao?.logo_url) {
        headerContent.push({
          columns: [
            {
              image: instituicao.logo_url.startsWith('data:') ? instituicao.logo_url : `${getApiBaseUrl()}${instituicao.logo_url}`,
              width: 50,
              height: 50
            },
            {
              stack: [
                { text: instituicao.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
                { text: `Cardapio Detalhado - ${cardapio.nome}`, style: 'subheader', alignment: 'center' },
                { 
                  text: `${MESES[cardapio.mes]}/${cardapio.ano} - ${cardapio.modalidade_nome} | Periodo: ${periodoForm.diaInicio} a ${periodoForm.diaFim}`, 
                  style: 'subheader2', 
                  alignment: 'center' 
                }
              ],
              width: '*'
            },
            { text: '', width: 50 } // Espaço para balancear
          ]
        });
      } else {
        headerContent.push({
          stack: [
            { text: instituicao?.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
            { text: `Cardapio Detalhado - ${cardapio.nome}`, style: 'subheader', alignment: 'center' },
            { 
              text: `${MESES[cardapio.mes]}/${cardapio.ano} - ${cardapio.modalidade_nome} | Periodo: ${periodoForm.diaInicio} a ${periodoForm.diaFim}`, 
              style: 'subheader2', 
              alignment: 'center' 
            }
          ]
        });
      }
      
      // Criar rodapé com assinatura se disponível
      const footerContent = (currentPage: number, pageCount: number) => {
        const footerStack: any[] = [
          {
            text: `Pagina ${currentPage} de ${pageCount} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
            alignment: 'center',
            fontSize: 7,
            color: '#999999',
            margin: [0, 10, 0, 0]
          }
        ];
        
        if (instituicao?.secretario_nome && currentPage === pageCount) {
          footerStack.push({
            columns: [
              { text: '', width: '*' },
              {
                stack: [
                  { text: '_'.repeat(40), alignment: 'center', margin: [0, 20, 0, 5] },
                  { text: instituicao.secretario_nome, alignment: 'center', bold: true, fontSize: 10 },
                  { text: instituicao.secretario_cargo || 'Secretário(a) de Educação', alignment: 'center', fontSize: 9 }
                ],
                width: 200
              },
              { text: '', width: '*' }
            ],
            margin: [0, 20, 0, 0]
          });
        }
        
        return { stack: footerStack };
      };
      
      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [30, 70, 30, 60],
        header: {
          stack: headerContent,
          margin: [30, 15, 30, 0]
        },
        footer: footerContent,
        content: [
          {
            table: {
              widths: [60, 100, '*'],
              body: tableBody,
              heights: (rowIndex: number) => {
                // Ajusta altura das linhas com base no conteúdo
                if (rowIndex === 0) return 20; // Cabeçalho
                return 'auto'; // Altura automática para as outras linhas
              }
            },
            layout: {
              hLineWidth: (i: number, node: any) => 0.5,
              vLineWidth: (i: number, node: any) => 0.5,
              hLineColor: () => '#cccccc',
              vLineColor: () => '#cccccc',
              paddingLeft: () => 5,
              paddingRight: () => 5,
              paddingTop: () => 5,
              paddingBottom: () => 5
            }
          }
        ],
        styles: {
          header: { fontSize: 14, bold: true },
          subheader: { fontSize: 12, bold: true, margin: [0, 3, 0, 0] },
          subheader2: { fontSize: 9, margin: [0, 3, 0, 0] },
          tableHeader: { bold: true, fillColor: '#428bca', color: 'white', fontSize: 9 }
        }
      };
      
      pdfMake.createPdf(docDefinition).download(`cardapio-detalhado-${cardapio.mes}-${cardapio.ano}.pdf`);
      toast.success('PDF gerado com sucesso!');
      setOpenPeriodoDialog(false);
    } catch (err) {
      toast.error('Erro ao gerar PDF');
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    setSalvando(true);
    try {
      if (!formData.refeicao_id || !formData.tipo_refeicao) {
        toast.error('Selecione a preparação e o tipo');
        return;
      }

      await adicionarRefeicaoDia(parseInt(cardapioId!), {
        refeicao_id: parseInt(formData.refeicao_id),
        dia: diaSelecionado!,
        tipo_refeicao: formData.tipo_refeicao,
        observacao: formData.observacao || undefined
      });

      toast.success('Preparação adicionada!');
      setOpenDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar preparação');
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Remover esta preparação?')) {
      setExcluindo(true);
      try {
        await removerRefeicaoDia(id);
        toast.success('Preparação removida!');
        loadData();
      } catch (err) {
        toast.error('Erro ao remover preparação');
      } finally {
        setExcluindo(false);
      }
    }
  };

  const getDiaDaSemana = (diaSemana: number) => {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return dias[diaSemana];
  };

  const corTipoRefeicao: Record<string, string> = {
    cafe_manha: '#FFA726',
    lanche_manha: '#66BB6A',
    almoco: '#EF5350',
    lanche_tarde: '#42A5F5',
    jantar: '#AB47BC'
  };

  // Converter refeições para formato de eventos para o CalendarioMensal
  const refeicoesComoEventos = refeicoes.map(ref => {
    const dataStr = cardapio 
      ? `${cardapio.ano}-${String(cardapio.mes).padStart(2, '0')}-${String(ref.dia).padStart(2, '0')}`
      : '';
    
    return {
      id: ref.id,
      titulo: `${TIPOS_REFEICAO[ref.tipo_refeicao]}: ${ref.refeicao_nome}`,
      tipo_evento: 'refeicao',
      data_inicio: dataStr,
      data_fim: dataStr,
      cor: corTipoRefeicao[ref.tipo_refeicao] || '#ccc',
      descricao: ref.observacao || '',
      // Dados extras para uso interno
      _refeicao: ref
    };
  });

  // Combinar eventos do calendário letivo com refeições
  const todosEventos = [...eventosCalendario, ...refeicoesComoEventos];

  return (
    <>
      <PageContainer>
      {/* Header com botão voltar e ações */}
      <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate('/cardapios')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box flex={1}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>{cardapio?.nome}</Typography>
            <Typography variant="body2" color="textSecondary">
              {cardapio && `${MESES[cardapio.mes]} / ${cardapio.ano} - ${cardapio.modalidade_nome}`}
            </Typography>
          </Box>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} color="primary">
            <PdfIcon />
          </IconButton>
        </Box>

        <Grid container spacing={3}>
          {/* Coluna principal - Calendário */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ p: 3 }}>
              <CalendarioCardapio
                ano={ano}
                mes={mes}
                eventos={todosEventos}
                onMesAnterior={handleMesAnterior}
                onProximoMes={handleProximoMes}
                onDiaClick={handleDiaClick}
              />
            </Card>
          </Grid>

          {/* Coluna lateral - Informações */}
          <Grid item xs={12} lg={4}>
            {/* Card de resumo do cardápio */}
            <Card sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon />
                Resumo do Cardápio
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total de preparações
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {refeicoes.length}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Por tipo de preparação
                  </Typography>
                  {Object.entries(
                    refeicoes.reduce((acc, r) => {
                      acc[r.tipo_refeicao] = (acc[r.tipo_refeicao] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([tipo, count]) => (
                    <Box key={tipo} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2">
                        {TIPOS_REFEICAO[tipo]}
                      </Typography>
                      <Chip label={count} size="small" sx={{ bgcolor: corTipoRefeicao[tipo], color: 'white' }} />
                    </Box>
                  ))}
                </Box>
              </Box>
            </Card>

            {/* Card de eventos do calendário letivo */}
            {eventosCalendario.length > 0 && (
              <Card sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventIcon />
                  Eventos do Mês
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Object.entries(
                    eventosCalendario.reduce((acc, e) => {
                      acc[e.tipo_evento] = (acc[e.tipo_evento] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([tipo, count]) => {
                    const labels = getLabelsEventos();
                    return (
                      <Box key={tipo} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">
                          {labels[tipo as keyof typeof labels]}
                        </Typography>
                        <Chip label={String(count)} size="small" />
                      </Box>
                    );
                  })}
                </Box>
              </Card>
            )}
          </Grid>
        </Grid>

        {/* Menu de ações */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={exportarCalendarioPDF}>
            <PdfIcon sx={{ mr: 1 }} fontSize="small" />
            Exportar Calendário
          </MenuItem>
          <MenuItem onClick={exportarFrequenciaPDF}>
            <PdfIcon sx={{ mr: 1 }} fontSize="small" />
            Exportar Frequência
          </MenuItem>
          <MenuItem onClick={handleOpenPeriodoDialog}>
            <PdfIcon sx={{ mr: 1 }} fontSize="small" />
            Relatório Detalhado
          </MenuItem>
        </Menu>
      </PageContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Preparação - Dia {diaSelecionado}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Preparação</InputLabel>
              <Select 
                value={String(formData.refeicao_id || '')} 
                onChange={(e) => setFormData({ ...formData, refeicao_id: e.target.value })} 
                label="Preparação"
              >
                {refeicoesDisponiveis.map((r) => (
                  <MenuItem key={r.id} value={String(r.id)}>
                    {r.nome} {r.descricao && `- ${r.descricao}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Tipo de Preparação</InputLabel>
              <Select 
                value={String(formData.tipo_refeicao || '')} 
                onChange={(e) => setFormData({ ...formData, tipo_refeicao: e.target.value })} 
                label="Tipo de Preparação"
              >
                {Object.entries(TIPOS_REFEICAO).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField 
              label="Observação" 
              fullWidth 
              multiline 
              rows={2} 
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">Adicionar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de seleção de período */}
      <Dialog open={openPeriodoDialog} onClose={() => setOpenPeriodoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gerar Relatório Detalhado</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Selecione o período que deseja incluir no relatório. O PDF conterá todas as preparações 
              com seus produtos e per capita.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Dia Inicial"
                type="number"
                value={periodoForm.diaInicio}
                onChange={(e) => setPeriodoForm({ ...periodoForm, diaInicio: Number(e.target.value) })}
                fullWidth
                inputProps={{ 
                  min: 1, 
                  max: cardapio ? new Date(cardapio.ano, cardapio.mes, 0).getDate() : 31 
                }}
              />
              <TextField
                label="Dia Final"
                type="number"
                value={periodoForm.diaFim}
                onChange={(e) => setPeriodoForm({ ...periodoForm, diaFim: Number(e.target.value) })}
                fullWidth
                inputProps={{ 
                  min: 1, 
                  max: cardapio ? new Date(cardapio.ano, cardapio.mes, 0).getDate() : 31 
                }}
              />
            </Box>
            
            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Período selecionado:
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {periodoForm.diaInicio} a {periodoForm.diaFim} de {cardapio && MESES[cardapio.mes]} de {cardapio?.ano}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPeriodoDialog(false)}>Cancelar</Button>
          <Button 
            onClick={exportarRelatorioDetalhado} 
            variant="contained" 
            startIcon={<PdfIcon />}
            disabled={periodoForm.diaInicio > periodoForm.diaFim}
          >
            Gerar PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de lista completa */}
      <Dialog open={openListDialog} onClose={() => setOpenListDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Preparações do Dia {diaSelecionado}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {diaSelecionado && getRefeicoesNoDia(diaSelecionado).map((ref) => (
              <Box 
                key={ref.id}
                sx={{ 
                  p: 1.5, 
                  borderRadius: 1,
                  bgcolor: corTipoRefeicao[ref.tipo_refeicao] || '#ccc',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.9 }
                }}
                onClick={() => {
                  setOpenListDialog(false);
                  handleOpenDetalhes(ref.refeicao_id);
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {TIPOS_REFEICAO[ref.tipo_refeicao]}
                  </Typography>
                  <Typography variant="body2">
                    {ref.refeicao_nome}
                  </Typography>
                  {ref.observacao && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.9 }}>
                      {ref.observacao}
                    </Typography>
                  )}
                </Box>
                <IconButton 
                  size="small" 
                  sx={{ color: 'white' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(ref.id);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenListDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de detalhes da preparação */}
      <Dialog open={openDetalhesDialog} onClose={() => setOpenDetalhesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{refeicaoDetalhes?.nome}</Typography>
            <Chip 
              label={refeicaoDetalhes?.ativo ? 'Ativa' : 'Inativa'} 
              size="small" 
              color={refeicaoDetalhes?.ativo ? 'success' : 'default'} 
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingDetalhes ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Typography>Carregando...</Typography>
            </Box>
          ) : refeicaoDetalhes && (
            <Box sx={{ pt: 2 }}>
              {refeicaoDetalhes.descricao && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>Descrição</Typography>
                  <Typography variant="body1">{refeicaoDetalhes.descricao}</Typography>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mb: 1 }}>
                  Composição da Preparação ({produtosRefeicao.length} {produtosRefeicao.length === 1 ? 'produto' : 'produtos'})
                </Typography>
                
                {produtosRefeicao.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Nenhum produto cadastrado nesta preparação
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', bgcolor: '#f5f5f5', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid #e0e0e0' }}>
                      <Box sx={{ flex: 1, p: 1.5, borderRight: '1px solid #e0e0e0' }}>Produto</Box>
                      <Box sx={{ width: 120, p: 1.5, textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>Per Capita</Box>
                      <Box sx={{ width: 100, p: 1.5, textAlign: 'center' }}>Unidade</Box>
                    </Box>
                    {produtosRefeicao.map((produto, index) => (
                      <Box 
                        key={produto.id} 
                        sx={{ 
                          display: 'flex', 
                          borderBottom: index < produtosRefeicao.length - 1 ? '1px solid #e0e0e0' : 'none',
                          '&:hover': { bgcolor: '#fafafa' }
                        }}
                      >
                        <Box sx={{ flex: 1, p: 1.5, borderRight: '1px solid #e0e0e0' }}>
                          <Typography variant="body2">{produto.produto?.nome || produto.produto_nome}</Typography>
                        </Box>
                        <Box sx={{ width: 120, p: 1.5, textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {parseFloat(produto.per_capita).toString()}
                          </Typography>
                        </Box>
                        <Box sx={{ width: 100, p: 1.5, textAlign: 'center' }}>
                          <Chip 
                            label={produto.tipo_medida === 'gramas' ? 'Gramas' : 'Unidades'} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetalhesDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de detalhes do dia com preparações e eventos */}
      <DetalheDiaCardapioDialog
        open={openDetalhesDiaDialog}
        onClose={() => setOpenDetalhesDiaDialog(false)}
        diaSelecionado={diaSelecionado}
        cardapio={cardapio}
        refeicoesDia={diaSelecionado ? getRefeicoesNoDia(diaSelecionado) : []}
        eventosDia={diaSelecionado ? getEventosNoDia(diaSelecionado) : []}
        corTipoRefeicao={corTipoRefeicao}
        onAdicionarRefeicao={() => {
          setOpenDetalhesDiaDialog(false);
          handleOpenDialog(diaSelecionado);
        }}
        onExcluirRefeicao={(id) => {
          setOpenDetalhesDiaDialog(false);
          handleDelete(id);
        }}
        onVerDetalhes={(refeicaoId) => {
          setOpenDetalhesDiaDialog(false);
          handleOpenDetalhes(refeicaoId);
        }}
      />

      <LoadingOverlay 
        open={salvando || excluindo || loadingDetalhes}
        message={
          salvando ? 'Salvando preparação...' :
          excluindo ? 'Excluindo preparação...' :
          loadingDetalhes ? 'Carregando detalhes...' :
          'Processando...'
        }
      />
    </>
  );
};

export default CardapioCalendarioPage;
