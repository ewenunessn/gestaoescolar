import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, Grid, IconButton, InputLabel, MenuItem, Select, TextField, Typography, Chip, Menu,
  CircularProgress
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Delete as DeleteIcon, PictureAsPdf as PdfIcon, MoreVert as MoreIcon, DragIndicator as DragIcon } from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { usePageTitle } from '../contexts/PageTitleContext';
import PageContainer from '../components/PageContainer';
import { useInstituicaoForPDF } from '../hooks/useInstituicao';
import { createPDFHeader, createPDFFooter, getDefaultPDFStyles } from '../utils/pdfUtils';
import {
  buscarCardapioModalidade, listarRefeicoesCardapio, adicionarRefeicaoDia,
  removerRefeicaoDia, CardapioModalidade, RefeicaoDia, TIPOS_REFEICAO, MESES
} from '../services/cardapiosModalidade';
import { listarRefeicoes } from '../services/refeicoes';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { LoadingOverlay } from '../components/LoadingOverlay';

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
  const { success, error } = useNotification();
  const { setPageTitle } = usePageTitle();
  const { fetchInstituicaoForPDF } = useInstituicaoForPDF();

  const [cardapio, setCardapio] = useState<CardapioModalidade | null>(null);
  const [refeicoes, setRefeicoes] = useState<RefeicaoDia[]>([]);
  const [refeicoesDisponiveis, setRefeicoesDisponiveis] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openListDialog, setOpenListDialog] = useState(false);
  const [openDetalhesDialog, setOpenDetalhesDialog] = useState(false);
  const [openDetalhesDiaDialog, setOpenDetalhesDiaDialog] = useState(false);
  const [openPeriodoDialog, setOpenPeriodoDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [refeicaoDetalhes, setRefeicaoDetalhes] = useState<any>(null);
  const [produtosRefeicao, setProdutosRefeicao] = useState<any[]>([]);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [periodoForm, setPeriodoForm] = useState({
    diaInicio: 1,
    diaFim: 31
  });

  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requer movimento de 8px para iniciar o drag
      },
    })
  );
  const [formData, setFormData] = useState({
    refeicao_id: '',
    tipo_refeicao: '',
    observacao: ''
  });

  useEffect(() => {
    if (cardapioId) loadData();
  }, [cardapioId]);

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
      
      // Definir título da página
      if (cardapioData) {
        const mesNome = MESES[cardapioData.mes - 1];
        setPageTitle(`Cardápio ${mesNome}/${cardapioData.ano} - ${cardapioData.modalidade_nome}`);
      }
    } catch (err) {
      error('Erro ao carregar cardápio');
    }
  };

  const getCalendarioSemanas = () => {
    if (!cardapio) return [];
    
    const primeiroDia = new Date(cardapio.ano, cardapio.mes - 1, 1);
    const ultimoDia = new Date(cardapio.ano, cardapio.mes, 0).getDate();
    const diaSemanaInicio = primeiroDia.getDay(); // 0 = domingo
    
    const semanas: (number | null)[][] = [];
    let semanaAtual: (number | null)[] = [];
    
    // Preenche dias vazios antes do primeiro dia
    for (let i = 0; i < diaSemanaInicio; i++) {
      semanaAtual.push(null);
    }
    
    // Preenche os dias do mês
    for (let dia = 1; dia <= ultimoDia; dia++) {
      semanaAtual.push(dia);
      
      if (semanaAtual.length === 7) {
        semanas.push(semanaAtual);
        semanaAtual = [];
      }
    }
    
    // Preenche dias vazios após o último dia
    if (semanaAtual.length > 0) {
      while (semanaAtual.length < 7) {
        semanaAtual.push(null);
      }
      semanas.push(semanaAtual);
    }
    
    return semanas;
  };

  const getRefeicoesNoDia = (dia: number) => {
    return refeicoes.filter(r => r.dia === dia);
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
        
        // Buscar produtos da refeição
        const response = await fetch(`${getApiBaseUrl()}/api/refeicoes/${refeicaoId}/produtos`);
        if (response.ok) {
          const produtos = await response.json();
          setProdutosRefeicao(produtos);
        } else {
          setProdutosRefeicao([]);
        }
        
        setOpenDetalhesDialog(true);
      }
    } catch (err) {
      error('Erro ao carregar detalhes');
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
        const response = await fetch(`${getApiBaseUrl()}/api/instituicao`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          instituicao = await response.json();
        }
      } catch (err) {
        console.log('Não foi possível carregar informações da instituição');
      }
      
      const semanas = getCalendarioSemanas();
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
      success('PDF do calendário gerado!');
      setAnchorEl(null);
    } catch (err) {
      error('Erro ao gerar PDF do calendário');
      console.error(err);
    }
  };

  const exportarFrequenciaPDF = async () => {
    if (!cardapio) return;
    
    try {
      const pdfMake = await initPdfMake();
      
      // Buscar informações da instituição
      const instituicao = await fetchInstituicaoForPDF();
      
      // Agrupar por tipo e refeição
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
      
      // Para cada tipo de refeição
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
      success('PDF de frequência gerado!');
      setAnchorEl(null);
    } catch (err) {
      error('Erro ao gerar PDF de frequência');
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
        success('PDF gerado!');
        setOpenPeriodoDialog(false);
        return;
      }
      
      // Buscar produtos de todas as refeições
      const refeicoesComProdutos = await Promise.all(
        refeicoesNoPeriodo.map(async (ref) => {
          try {
            const response = await fetch(`${getApiBaseUrl()}/api/refeicoes/${ref.refeicao_id}/produtos`);
            const produtos = response.ok ? await response.json() : [];
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
            // Primeira refeição do dia
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
      success('PDF gerado com sucesso!');
      setOpenPeriodoDialog(false);
    } catch (err) {
      error('Erro ao gerar PDF');
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    setSalvando(true);
    try {
      if (!formData.refeicao_id || !formData.tipo_refeicao) {
        error('Selecione a refeição e o tipo');
        return;
      }

      await adicionarRefeicaoDia(parseInt(cardapioId!), {
        refeicao_id: parseInt(formData.refeicao_id),
        dia: diaSelecionado!,
        tipo_refeicao: formData.tipo_refeicao,
        observacao: formData.observacao || undefined
      });

      success('Refeição adicionada!');
      setOpenDialog(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Erro ao adicionar refeição');
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Remover esta refeição?')) {
      setExcluindo(true);
      try {
        await removerRefeicaoDia(id);
        success('Refeição removida!');
        loadData();
      } catch (err) {
        error('Erro ao remover refeição');
      } finally {
        setExcluindo(false);
      }
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Extrair IDs
    const refeicaoId = parseInt(active.id.split('-')[1]);
    const novoDia = parseInt(over.id.split('-')[1]);

    // Encontrar a refeição
    const refeicao = refeicoes.find(r => r.id === refeicaoId);
    if (!refeicao || refeicao.dia === novoDia) return;

    try {
      // Remover do dia antigo
      await removerRefeicaoDia(refeicaoId);
      
      // Adicionar no novo dia
      await adicionarRefeicaoDia(parseInt(cardapioId!), {
        refeicao_id: refeicao.refeicao_id,
        dia: novoDia,
        tipo_refeicao: refeicao.tipo_refeicao,
        observacao: refeicao.observacao || undefined
      });

      success(`Refeição movida para o dia ${novoDia}`);
      loadData();
    } catch (err: any) {
      error(err.message || 'Erro ao mover refeição');
      loadData(); // Recarregar para reverter mudanças visuais
    }
  };

  // Componente de refeição arrastável
  const DraggableRefeicao = ({ refeicao }: { refeicao: RefeicaoDia }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: `refeicao-${refeicao.id}`,
    });

    const style = {
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <Box
        ref={setNodeRef}
        style={style}
        sx={{
          p: 0.75,
          borderRadius: '8px',
          bgcolor: corTipoRefeicao[refeicao.tipo_refeicao] || '#ccc',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: 'all 0.2s',
          boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.12)',
          '&:hover': {
            transform: isDragging ? undefined : 'scale(1.02)',
            boxShadow: isDragging ? undefined : '0 2px 6px rgba(0,0,0,0.2)'
          }
        }}
      >
        <Box
          {...listeners}
          {...attributes}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flex: 1,
            minWidth: 0,
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' }
          }}
        >
          <DragIcon sx={{ fontSize: '1rem', opacity: 0.7 }} />
          <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', fontSize: '0.65rem', lineHeight: 1.3, opacity: 0.9 }}>
              {TIPOS_REFEICAO[refeicao.tipo_refeicao]}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontSize: '0.7rem',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 500
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetalhes(refeicao.refeicao_id);
              }}
            >
              {refeicao.refeicao_nome}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          sx={{
            color: 'white',
            p: 0.5,
            ml: 0.5,
            '&:hover': { bgcolor: 'rgba(0,0,0,0.2)' }
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(refeicao.id);
          }}
        >
          <DeleteIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Box>
    );
  };

  // Componente de dia que aceita drops
  const DroppableDay = ({ dia, children }: { dia: number; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `dia-${dia}`,
    });

    return (
      <Box
        ref={setNodeRef}
        sx={{
          height: '100%',
          border: isOver ? '2px dashed #1976d2' : 'none',
          borderRadius: '12px',
          bgcolor: isOver ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
          transition: 'all 0.2s'
        }}
      >
        {children}
      </Box>
    );
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <PageContainer>
        <Box display="flex" alignItems="center" mb={2}>
          <IconButton onClick={() => navigate('/cardapios')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box flex={1}>
            <Typography variant="h5">{cardapio?.nome}</Typography>
            <Typography variant="body2" color="textSecondary">
              {cardapio && `${MESES[cardapio.mes]} / ${cardapio.ano} - ${cardapio.modalidade_nome}`}
            </Typography>
          </Box>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} color="primary">
            <PdfIcon />
          </IconButton>
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
        </Box>

        {/* Cabeçalho dos dias da semana */}
        <Card sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden' }}>
          <Grid container spacing={0}>
            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((dia, index) => (
              <Grid item xs={12 / 7} key={dia}>
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    fontWeight: 700, 
                    py: 1.5,
                    bgcolor: index === 0 || index === 6 ? '#fff3e0' : '#e3f2fd',
                    borderRight: index < 6 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                    color: index === 0 || index === 6 ? '#e65100' : '#1565c0'
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', letterSpacing: '0.5px' }}>
                    {dia}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Card>

        {/* Calendário */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {getCalendarioSemanas().map((semana, semanaIndex) => (
            <Box key={semanaIndex}>
              <Grid container spacing={1}>
                {semana.map((dia, diaIndex) => {
                  if (dia === null) {
                    return (
                      <Grid item xs={12 / 7} key={`empty-${diaIndex}`}>
                        <Box 
                          sx={{ 
                            height: 140, 
                            bgcolor: '#f5f5f5', 
                            borderRadius: '12px',
                            border: '2px dashed #e0e0e0'
                          }} 
                        />
                      </Grid>
                    );
                  }

                  const refeicoesNoDia = getRefeicoesNoDia(dia);
                  const ehFimDeSemana = diaIndex === 0 || diaIndex === 6;
                  const hoje = new Date();
                  const ehHoje = cardapio && 
                    dia === hoje.getDate() && 
                    cardapio.mes === (hoje.getMonth() + 1) && 
                    cardapio.ano === hoje.getFullYear();

                  return (
                    <Grid item xs={12 / 7} key={dia}>
                      <DroppableDay dia={dia}>
                        <Card 
                          sx={{ 
                            cursor: 'pointer',
                            height: 140,
                            bgcolor: ehFimDeSemana ? '#fff8e1' : 'white',
                            border: ehHoje ? '3px solid #1976d2' : '1px solid #e0e0e0',
                            borderRadius: '12px',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': { 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              transform: 'translateY(-2px)',
                              borderColor: '#1976d2'
                            },
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'visible'
                          }}
                          onClick={() => handleOpenDialog(dia)}
                        >
                          {ehHoje && (
                            <Box 
                              sx={{ 
                                position: 'absolute',
                                top: -8,
                                right: 8,
                                bgcolor: '#1976d2',
                                color: 'white',
                                px: 1,
                                py: 0.3,
                                borderRadius: '12px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                zIndex: 1
                              }}
                            >
                              HOJE
                            </Box>
                          )}
                          <CardContent sx={{ p: 1, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', '&:last-child': { pb: 1 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontSize: '1.25rem', 
                                  fontWeight: 700,
                                  color: ehHoje ? '#1976d2' : (ehFimDeSemana ? '#e65100' : '#424242'),
                                  cursor: 'pointer',
                                  '&:hover': {
                                    textDecoration: 'underline'
                                  }
                                }}
                                onClick={(e) => handleOpenDetalhesDia(dia, e)}
                              >
                                {dia}
                              </Typography>
                              {refeicoesNoDia.length > 0 && (
                                <Chip 
                                  label={refeicoesNoDia.length} 
                                  size="small" 
                                  sx={{ 
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    bgcolor: '#e3f2fd',
                                    color: '#1976d2'
                                  }} 
                                />
                              )}
                            </Box>
                            
                            {refeicoesNoDia.length === 0 ? (
                              <Box 
                                sx={{ 
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '2px dashed #e0e0e0',
                                  borderRadius: '8px',
                                  bgcolor: 'rgba(0,0,0,0.02)',
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    borderColor: '#1976d2',
                                    bgcolor: 'rgba(25, 118, 210, 0.04)'
                                  }
                                }}
                              >
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontSize: '0.75rem',
                                    color: '#9e9e9e',
                                    fontWeight: 500
                                  }}
                                >
                                  + Adicionar refeição
                                </Typography>
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, overflow: 'hidden' }}>
                                {refeicoesNoDia.slice(0, 2).map((ref) => (
                                  <DraggableRefeicao key={ref.id} refeicao={ref} />
                                ))}
                                {refeicoesNoDia.length > 2 && (
                                  <Box 
                                    sx={{ 
                                      p: 0.75, 
                                      borderRadius: '8px',
                                      bgcolor: 'rgba(0,0,0,0.6)',
                                      color: 'white',
                                      textAlign: 'center',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                      '&:hover': { 
                                        bgcolor: 'rgba(0,0,0,0.8)',
                                        transform: 'scale(1.02)'
                                      }
                                    }}
                                    onClick={(e) => handleOpenListDialog(dia, e)}
                                  >
                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700 }}>
                                      Ver todas ({refeicoesNoDia.length})
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </DroppableDay>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))}
        </Box>
      </PageContainer>
    </Box>

      <DragOverlay>
        {activeId ? (
          <Box
            sx={{
              p: 0.75,
              borderRadius: '8px',
              bgcolor: '#1976d2',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              minWidth: 120,
              cursor: 'grabbing'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
              Movendo refeição...
            </Typography>
          </Box>
        ) : null}
      </DragOverlay>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Refeição - Dia {diaSelecionado}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Refeição</InputLabel>
              <Select 
                value={formData.refeicao_id} 
                onChange={(e) => setFormData({ ...formData, refeicao_id: e.target.value })} 
                label="Refeição"
              >
                {refeicoesDisponiveis.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.nome} {r.descricao && `- ${r.descricao}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Tipo de Refeição</InputLabel>
              <Select 
                value={formData.tipo_refeicao} 
                onChange={(e) => setFormData({ ...formData, tipo_refeicao: e.target.value })} 
                label="Tipo de Refeição"
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
              Selecione o período que deseja incluir no relatório. O PDF conterá todas as refeições 
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
        <DialogTitle>Refeições do Dia {diaSelecionado}</DialogTitle>
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

      {/* Dialog de detalhes da refeição */}
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
                  Composição da Refeição ({produtosRefeicao.length} {produtosRefeicao.length === 1 ? 'produto' : 'produtos'})
                </Typography>
                
                {produtosRefeicao.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Nenhum produto cadastrado nesta refeição
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
      {/* Dialog de detalhes do dia */}
      <Dialog 
        open={openDetalhesDiaDialog} 
        onClose={() => setOpenDetalhesDiaDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {diaSelecionado && cardapio && `${diaSelecionado} de ${MESES[cardapio.mes]}`}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {diaSelecionado && cardapio && new Date(cardapio.ano, cardapio.mes - 1, diaSelecionado).toLocaleDateString('pt-BR', { weekday: 'long' })}
              </Typography>
            </Box>
            <Chip 
              label={`${diaSelecionado && getRefeicoesNoDia(diaSelecionado).length} refeições`}
              color="primary"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {diaSelecionado && getRefeicoesNoDia(diaSelecionado).length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Nenhuma refeição cadastrada
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Clique no botão abaixo para adicionar a primeira refeição deste dia
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => {
                  setOpenDetalhesDiaDialog(false);
                  handleOpenDialog(diaSelecionado);
                }}
              >
                Adicionar Refeição
              </Button>
            </Box>
          ) : (
            <Box>
              {diaSelecionado && getRefeicoesNoDia(diaSelecionado).map((ref, index) => (
                <Box 
                  key={ref.id}
                  sx={{ 
                    borderBottom: index < getRefeicoesNoDia(diaSelecionado).length - 1 ? '1px solid #e0e0e0' : 'none'
                  }}
                >
                  <Box 
                    sx={{ 
                      p: 2,
                      bgcolor: 'white',
                      '&:hover': { bgcolor: '#fafafa' }
                    }}
                  >
                    {/* Cabeçalho da refeição */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 40,
                            borderRadius: '4px',
                            bgcolor: corTipoRefeicao[ref.tipo_refeicao] || '#ccc'
                          }}
                        />
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                            {ref.refeicao_nome}
                          </Typography>
                          <Chip
                            label={TIPOS_REFEICAO[ref.tipo_refeicao]}
                            size="small"
                            sx={{
                              bgcolor: corTipoRefeicao[ref.tipo_refeicao] || '#ccc',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 20
                            }}
                          />
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        color="delete"
                        onClick={() => {
                          setOpenDetalhesDiaDialog(false);
                          handleDelete(ref.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    {/* Observação */}
                    {ref.observacao && (
                      <Box sx={{ mb: 2, p: 1.5, bgcolor: '#fff3e0', borderRadius: '8px', borderLeft: '4px solid #ff9800' }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#e65100', display: 'block', mb: 0.5 }}>
                          Observação:
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {ref.observacao}
                        </Typography>
                      </Box>
                    )}

                    {/* Produtos da refeição */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#616161' }}>
                        Composição:
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {(() => {
                          const refeicaoCompleta = refeicoesDisponiveis.find(r => r.id === ref.refeicao_id);
                          if (!refeicaoCompleta) {
                            return (
                              <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                                Carregando produtos...
                              </Typography>
                            );
                          }
                          
                          // Aqui você pode buscar os produtos da refeição
                          return (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setOpenDetalhesDiaDialog(false);
                                handleOpenDetalhes(ref.refeicao_id);
                              }}
                              sx={{ alignSelf: 'flex-start' }}
                            >
                              Ver detalhes completos
                            </Button>
                          );
                        })()}
                      </Box>
                    </Box>

                    {/* Informações nutricionais (se disponível) */}
                    {(() => {
                      const refeicaoCompleta = refeicoesDisponiveis.find(r => r.id === ref.refeicao_id);
                      if (refeicaoCompleta && (refeicaoCompleta.calorias || refeicaoCompleta.proteinas || refeicaoCompleta.carboidratos)) {
                        return (
                          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#e8f5e9', borderRadius: '8px' }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#2e7d32', display: 'block', mb: 1 }}>
                              Informações Nutricionais:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                              {refeicaoCompleta.calorias && (
                                <Box>
                                  <Typography variant="caption" color="textSecondary">Calorias</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{refeicaoCompleta.calorias} kcal</Typography>
                                </Box>
                              )}
                              {refeicaoCompleta.proteinas && (
                                <Box>
                                  <Typography variant="caption" color="textSecondary">Proteínas</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{refeicaoCompleta.proteinas}g</Typography>
                                </Box>
                              )}
                              {refeicaoCompleta.carboidratos && (
                                <Box>
                                  <Typography variant="caption" color="textSecondary">Carboidratos</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{refeicaoCompleta.carboidratos}g</Typography>
                                </Box>
                              )}
                              {refeicaoCompleta.lipidios && (
                                <Box>
                                  <Typography variant="caption" color="textSecondary">Lipídios</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{refeicaoCompleta.lipidios}g</Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        );
                      }
                      return null;
                    })()}
                  </Box>
                </Box>
              ))}

              {/* Resumo nutricional do dia */}
              {diaSelecionado && (() => {
                const refeicoesComInfo = getRefeicoesNoDia(diaSelecionado)
                  .map(ref => refeicoesDisponiveis.find(r => r.id === ref.refeicao_id))
                  .filter(r => r && (r.calorias || r.proteinas || r.carboidratos));
                
                if (refeicoesComInfo.length > 0) {
                  const totalCalorias = refeicoesComInfo.reduce((sum, r) => sum + (parseFloat(r.calorias) || 0), 0);
                  const totalProteinas = refeicoesComInfo.reduce((sum, r) => sum + (parseFloat(r.proteinas) || 0), 0);
                  const totalCarboidratos = refeicoesComInfo.reduce((sum, r) => sum + (parseFloat(r.carboidratos) || 0), 0);
                  const totalLipidios = refeicoesComInfo.reduce((sum, r) => sum + (parseFloat(r.lipidios) || 0), 0);

                  return (
                    <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderTop: '2px solid #1976d2' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1565c0', mb: 1.5 }}>
                        📊 Total Nutricional do Dia
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: '8px' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                              {totalCalorias.toFixed(0)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">kcal</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: '8px' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                              {totalProteinas.toFixed(1)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">Proteínas (g)</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: '8px' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                              {totalCarboidratos.toFixed(1)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">Carboidratos (g)</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: '8px' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                              {totalLipidios.toFixed(1)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">Lipídios (g)</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  );
                }
                return null;
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5', borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setOpenDetalhesDiaDialog(false)}>
            Fechar
          </Button>
          {diaSelecionado && getRefeicoesNoDia(diaSelecionado).length > 0 && (
            <Button 
              variant="contained" 
              onClick={() => {
                setOpenDetalhesDiaDialog(false);
                handleOpenDialog(diaSelecionado);
              }}
            >
              Adicionar Refeição
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <LoadingOverlay 
        open={salvando || excluindo || loadingDetalhes}
        message={
          salvando ? 'Salvando refeição...' :
          excluindo ? 'Excluindo refeição...' :
          loadingDetalhes ? 'Carregando detalhes...' :
          'Processando...'
        }
      />
    </DndContext>
  );
};

export default CardapioCalendarioPage;
