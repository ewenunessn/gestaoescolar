import api from '../services/api';
import { CardapioModalidade, RefeicaoDia, TIPOS_REFEICAO } from '../services/cardapiosModalidade';
import { dateUtils } from './dateUtils';

// Função para obter URL base da API
const getApiBaseUrl = () => {
  return process.env.NODE_ENV === 'production' 
    ? 'https://gestaoescolar-backend.vercel.app'
    : 'http://localhost:3000';
};

// Importação dinâmica para pdfmake
export const initPdfMake = async () => {
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default as any;
  
  (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts;
  return pdfMake;
};

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
    const response = await api.get('/instituicao');
    instituicao = response.data;
  } catch (err) {
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
      style: 'tableHeader',
      alignment: 'center',
      bold: true
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
            { text: `${dateUtils.getMonthName(cardapio.mes)} / ${cardapio.ano} - ${cardapio.modalidade_nome}`, style: 'subheader2', alignment: 'center' }
          ],
          width: '*'
        },
        { text: '', width: 60 }
      ],
      margin: [0, 0, 0, 10]
    });
  } else {
    headerContent.push({
      stack: [
        { text: instituicao?.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
        { text: `Cardapio - ${cardapio.nome}`, style: 'subheader', alignment: 'center' },
        { text: `${dateUtils.getMonthName(cardapio.mes)} / ${cardapio.ano} - ${cardapio.modalidade_nome}`, style: 'subheader2', alignment: 'center' }
      ]
    });
  }
  
  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [15, 60, 15, 30],
    header: {
      stack: headerContent,
      margin: [15, 10, 15, 0]
    },
    content: [
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
    ],
    styles: {
      header: { fontSize: 15, bold: true },
      subheader: { fontSize: 13, bold: true, margin: [0, 2, 0, 0] },
      subheader2: { fontSize: 10, margin: [0, 2, 0, 0] },
      tableHeader: { bold: true, fontSize: 9, fillColor: '#e3f2fd', alignment: 'center' }
    }
  };
  
  pdfMake.createPdf(docDefinition).download(`cardapio-${cardapio.mes}-${cardapio.ano}.pdf`);
};

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
            { text: `Relatorio de Frequencia - ${cardapio.nome}`, style: 'subheader', alignment: 'center' },
            { text: `${dateUtils.getMonthName(cardapio.mes)} / ${cardapio.ano} - ${cardapio.modalidade_nome}`, style: 'subheader2', alignment: 'center' }
          ],
          width: '*'
        },
        { text: '', width: 50 }
      ]
    });
  } else {
    headerContent.push({
      stack: [
        { text: instituicao?.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
        { text: `Relatorio de Frequencia - ${cardapio.nome}`, style: 'subheader', alignment: 'center' },
        { text: `${dateUtils.getMonthName(cardapio.mes)} / ${cardapio.ano} - ${cardapio.modalidade_nome}`, style: 'subheader2', alignment: 'center' }
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
};

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
    const docDefinition: any = {
      content: [
        { text: 'Nenhuma refeicao cadastrada neste periodo', alignment: 'center', margin: [0, 50, 0, 0] }
      ]
    };
    pdfMake.createPdf(docDefinition).download(`cardapio-detalhado-${cardapio.mes}-${cardapio.ano}.pdf`);
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
      { text: 'Data', style: 'tableHeader', alignment: 'center' },
      { text: 'Refeicao', style: 'tableHeader' },
      { text: 'Produtos e Per Capita', style: 'tableHeader' }
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
              text: `${dateUtils.getMonthName(cardapio.mes)}/${cardapio.ano} - ${cardapio.modalidade_nome} | Periodo: ${periodoForm.diaInicio} a ${periodoForm.diaFim}`, 
              style: 'subheader2', 
              alignment: 'center' 
            }
          ],
          width: '*'
        },
        { text: '', width: 50 }
      ]
    });
  } else {
    headerContent.push({
      stack: [
        { text: instituicao?.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
        { text: `Cardapio Detalhado - ${cardapio.nome}`, style: 'subheader', alignment: 'center' },
        { 
          text: `${dateUtils.getMonthName(cardapio.mes)}/${cardapio.ano} - ${cardapio.modalidade_nome} | Periodo: ${periodoForm.diaInicio} a ${periodoForm.diaFim}`, 
          style: 'subheader2', 
          alignment: 'center' 
        }
      ]
    });
  }
  
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
    ],
    styles: {
      header: { fontSize: 14, bold: true },
      subheader: { fontSize: 12, bold: true, margin: [0, 3, 0, 0] },
      subheader2: { fontSize: 9, margin: [0, 3, 0, 0] },
      tableHeader: { bold: true, fillColor: '#428bca', color: 'white', fontSize: 9 }
    }
  };
  
  pdfMake.createPdf(docDefinition).download(`cardapio-detalhado-${cardapio.mes}-${cardapio.ano}.pdf`);
};
