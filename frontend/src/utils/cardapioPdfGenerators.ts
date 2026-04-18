import api from '../services/api';
import { buscarInstituicao } from '../services/instituicao';
import { CardapioModalidade, RefeicaoDia, TIPOS_REFEICAO } from '../services/cardapiosModalidade';
import { dateUtils } from './dateUtils';
import { initPdfMake, buildPdfDoc } from './pdfUtils';

// ─── Exportar Calendário PDF ──────────────────────────────────────────────────

interface ExportarCalendarioPDFParams {
  cardapio: CardapioModalidade;
  refeicoes: RefeicaoDia[];
  getRefeicoesNoDia: (dia: number) => RefeicaoDia[];
}

export const exportarCalendarioPDF = async ({ 
  cardapio, 
  refeicoes, 
  getRefeicoesNoDia 
}: ExportarCalendarioPDFParams) => {
  const pdfMake = await initPdfMake();
  
  let instituicao = null;
  try {
    instituicao = await buscarInstituicao();
  } catch (err) {
    console.warn('Não foi possível carregar dados da instituição para o PDF');
  }
  
  const getCalendarioSemanasParaPDF = () => {
    const primeiroDia = dateUtils.createDate(cardapio.ano, cardapio.mes, 1);
    const ultimoDia = dateUtils.getDaysInMonth(cardapio.ano, cardapio.mes);
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
  const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  
  const tableBody: any[] = [];
  
  tableBody.push(
    diasSemana.map(dia => ({
      text: dia,
      bold: true,
      fontSize: 9,
      fillColor: '#e3f2fd',
      alignment: 'center',
    }))
  );
  
  semanas.forEach(semana => {
    const row = semana.map(dia => {
      if (dia === null) {
        return { text: '', fillColor: '#f5f5f5' };
      }
      
      const refeicoesNoDia = getRefeicoesNoDia(dia);
      const content: any[] = [];
      
      content.push({
        text: dia.toString(),
        bold: true,
        fontSize: 12,
        margin: [0, 0, 0, 4]
      });
      
      refeicoesNoDia.slice(0, 3).forEach(ref => {
        content.push({
          text: [
            { text: `${TIPOS_REFEICAO[ref.tipo_refeicao]}: `, bold: true, fontSize: 7 },
            { text: ref.refeicao_nome, fontSize: 7 }
          ],
          margin: [0, 1, 0, 1]
        });
      });
      
      if (refeicoesNoDia.length > 3) {
        content.push({
          text: `+${refeicoesNoDia.length - 3} mais`,
          fontSize: 6,
          italics: true,
          color: '#888',
          margin: [0, 2, 0, 0]
        });
      }
      
      return {
        stack: content,
        margin: [4, 4, 4, 4]
      };
    });
    
    tableBody.push(row);
  });

  const calendarContent: any[] = [
    {
      table: {
        widths: Array(7).fill('*'),
        heights: (row: number) => row === 0 ? 18 : 75,
        body: tableBody
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 3,
        paddingRight: () => 3,
        paddingTop: () => 3,
        paddingBottom: () => 3
      }
    }
  ];

  const doc = buildPdfDoc({
    instituicao,
    title: `Cardápio - ${cardapio.nome}`,
    subtitle: `${dateUtils.getMonthName(cardapio.mes)} / ${cardapio.ano} - ${cardapio.modalidade_nome}`,
    content: calendarContent,
    orientation: 'landscape',
    pageMargins: [15, 30, 15, 50],
  });
  
  pdfMake.createPdf(doc).download(`cardapio-${cardapio.mes}-${cardapio.ano}.pdf`);
};

// ─── Exportar Frequência PDF ──────────────────────────────────────────────────

interface ExportarFrequenciaPDFParams {
  cardapio: CardapioModalidade;
  refeicoes: RefeicaoDia[];
  fetchInstituicaoForPDF: () => Promise<any>;
}

export const exportarFrequenciaPDF = async ({ 
  cardapio, 
  refeicoes, 
  fetchInstituicaoForPDF 
}: ExportarFrequenciaPDFParams) => {
  const pdfMake = await initPdfMake();
  const instituicao = await fetchInstituicaoForPDF();
  
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
  
  Object.entries(TIPOS_REFEICAO).forEach(([tipo, tipoNome]) => {
    if (frequencia[tipo]) {
      content.push({
        text: tipoNome,
        style: 'sectionTitle',
        margin: [0, content.length > 0 ? 15 : 0, 0, 5]
      });
      
      const tableBody: any[] = [
        [
          { text: 'Refeição', bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', margin: [6, 5, 6, 5] },
          { text: 'Frequência', bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [6, 5, 6, 5] }
        ]
      ];
      
      Object.entries(frequencia[tipo]).forEach(([nome, freq]) => {
        tableBody.push([
          { text: nome, fontSize: 8, color: '#212121', margin: [6, 4, 6, 4] },
          { text: freq.toString(), fontSize: 8, color: '#212121', alignment: 'center', margin: [6, 4, 6, 4] }
        ]);
      });
      
      content.push({
        table: {
          widths: ['*', 80],
          body: tableBody
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1.0 : 0.6),
          vLineWidth: () => 0.6,
          hLineColor: (i: number, node: any) => (i === 0 || i === node.table.body.length ? '#616161' : '#9E9E9E'),
          vLineColor: () => '#9E9E9E',
        },
        margin: [0, 4, 0, 8],
      });
    }
  });

  const doc = buildPdfDoc({
    instituicao,
    title: `Relatório de Frequência - ${cardapio.nome}`,
    subtitle: `${dateUtils.getMonthName(cardapio.mes)} / ${cardapio.ano} - ${cardapio.modalidade_nome}`,
    content,
    showSignature: !!instituicao?.secretario_nome,
  });
  
  pdfMake.createPdf(doc).download(`frequencia-cardapio-${cardapio.mes}-${cardapio.ano}.pdf`);
};

// ─── Exportar Relatório Detalhado PDF ─────────────────────────────────────────

interface ExportarRelatorioDetalhadoParams {
  cardapio: CardapioModalidade;
  refeicoes: RefeicaoDia[];
  periodoForm: { diaInicio: number; diaFim: number };
  fetchInstituicaoForPDF: () => Promise<any>;
}

export const exportarRelatorioDetalhado = async ({ 
  cardapio, 
  refeicoes, 
  periodoForm, 
  fetchInstituicaoForPDF 
}: ExportarRelatorioDetalhadoParams) => {
  const pdfMake = await initPdfMake();
  const instituicao = await fetchInstituicaoForPDF();
  
  const refeicoesNoPeriodo = refeicoes.filter(
    ref => ref.dia >= periodoForm.diaInicio && ref.dia <= periodoForm.diaFim
  ).sort((a, b) => {
    if (a.dia !== b.dia) return a.dia - b.dia;
    const ordem: Record<string, number> = {
      'cafe_manha': 1,
      'lanche': 2,
      'refeicao': 3,
      'ceia': 4,
      'lanche_manha': 2,
      'almoco': 3,
      'lanche_tarde': 2,
      'jantar': 4
    };
    return (ordem[a.tipo_refeicao] || 99) - (ordem[b.tipo_refeicao] || 99);
  });
  
  if (refeicoesNoPeriodo.length === 0) {
    const doc = buildPdfDoc({
      instituicao,
      title: `Cardápio Detalhado - ${cardapio.nome}`,
      subtitle: `${dateUtils.getMonthName(cardapio.mes)}/${cardapio.ano} - ${cardapio.modalidade_nome}`,
      content: [
        { text: 'Nenhuma refeição cadastrada neste período', alignment: 'center', margin: [0, 50, 0, 0] }
      ],
    });
    pdfMake.createPdf(doc).download(`cardapio-detalhado-${cardapio.mes}-${cardapio.ano}.pdf`);
    return;
  }
  
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
  
  const refeicoesAgrupadas: Record<number, typeof refeicoesComProdutos> = {};
  refeicoesComProdutos.forEach(ref => {
    if (!refeicoesAgrupadas[ref.dia]) {
      refeicoesAgrupadas[ref.dia] = [];
    }
    refeicoesAgrupadas[ref.dia].push(ref);
  });
  
  const coresDias = [
    '#f5faff', '#fffaf5', '#f5fff0', '#fff5fa', '#faf5ff', '#fffff5', '#f5ffff'
  ];
  
  const tableBody: any[] = [
    [
      { text: 'Data', bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [6, 5, 6, 5] },
      { text: 'Refeição', bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', margin: [6, 5, 6, 5] },
      { text: 'Produtos e Per Capita', bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', margin: [6, 5, 6, 5] }
    ]
  ];
  
  Object.entries(refeicoesAgrupadas).sort(([a], [b]) => Number(a) - Number(b)).forEach(([dia, refs], diaIndex) => {
    const diaSemana = dateUtils.getDayOfWeekNameShort(cardapio.ano, cardapio.mes, Number(dia));
    const dataFormatada = `${String(dia).padStart(2, '0')}/${String(cardapio.mes).padStart(2, '0')}\n${diaSemana}`;
    const corDia = coresDias[diaIndex % coresDias.length];
    
    if (diaIndex > 0) {
      tableBody.push([
        { text: '', colSpan: 3, border: [false, false, false, false], margin: [0, 1, 0, 1] },
        {},
        {}
      ]);
    }
    
    refs.forEach((ref, refIdx) => {
      const refeicaoInfo = `${ref.refeicao_nome}\n(${TIPOS_REFEICAO[ref.tipo_refeicao]})`;
      
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

  const detailedContent: any[] = [
    {
      table: {
        widths: [60, 100, '*'],
        body: tableBody,
        heights: (rowIndex: number) => {
          if (rowIndex === 0) return 20;
          return 'auto';
        }
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 5,
        paddingBottom: () => 5
      }
    }
  ];

  const doc = buildPdfDoc({
    instituicao,
    title: `Cardápio Detalhado - ${cardapio.nome}`,
    subtitle: `${dateUtils.getMonthName(cardapio.mes)}/${cardapio.ano} - ${cardapio.modalidade_nome} | Período: ${periodoForm.diaInicio} a ${periodoForm.diaFim}`,
    content: detailedContent,
    showSignature: !!instituicao?.secretario_nome,
    pageMargins: [30, 40, 30, 60],
  });
  
  pdfMake.createPdf(doc).download(`cardapio-detalhado-${cardapio.mes}-${cardapio.ano}.pdf`);
};
