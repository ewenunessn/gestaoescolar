import { CardapioModalidade, RefeicaoDia, TIPOS_REFEICAO } from '../services/cardapiosModalidade';
import { listarTiposRefeicao, formatarHorario } from '../services/tiposRefeicao';
import { dateUtils } from './dateUtils';
import { buildPdfDoc } from './pdfUtils';
import { initPdfMake } from './cardapioPdfGenerators';

interface GerarPDFTabelaParams {
  diasSelecionadosCalendario: Date[];
  cardapio: CardapioModalidade | null;
  refeicoes: RefeicaoDia[];
  fetchInstituicaoForPDF: () => Promise<any>;
}

export const gerarPDFTabela = async ({
  diasSelecionadosCalendario,
  cardapio,
  refeicoes,
  fetchInstituicaoForPDF
}: GerarPDFTabelaParams) => {
  if (diasSelecionadosCalendario.length === 0) {
    throw new Error('Selecione pelo menos um dia');
  }

  if (diasSelecionadosCalendario.length > 6) {
    throw new Error('Selecione no máximo 6 dias');
  }

  const pdfMake = await initPdfMake();
  const instituicao = await fetchInstituicaoForPDF();

  // Carregar tipos de refeição dinâmicos
  const tiposRefeicaoData = await listarTiposRefeicao(true);
  const tiposRefeicaoMap: Record<string, string> = {};
  const tiposHorariosMap: Record<string, string> = {};
  
  tiposRefeicaoData.forEach(tipo => {
    tiposRefeicaoMap[tipo.chave] = tipo.nome.toUpperCase();
    tiposHorariosMap[tipo.chave] = formatarHorario(tipo.horario) + 'H';
  });

  const datasOrdenadas = diasSelecionadosCalendario.sort((a, b) => a.getTime() - b.getTime());

  const tiposExistentes = new Set<string>();
  datasOrdenadas.forEach(data => {
    const dia = data.getDate();
    const refeicoesNoDia = refeicoes.filter(r => r.dia === dia);
    refeicoesNoDia.forEach(r => {
      if (tiposRefeicaoMap[r.tipo_refeicao]) {
        tiposExistentes.add(r.tipo_refeicao);
      }
    });
  });

  // Ordenar tipos pela ordem definida no banco
  const tiposOrdenados = tiposRefeicaoData
    .filter(tipo => tiposExistentes.has(tipo.chave))
    .sort((a, b) => a.ordem - b.ordem)
    .map(tipo => tipo.chave);

  if (tiposOrdenados.length === 0) {
    throw new Error('Nenhuma refeição encontrada nos dias selecionados');
  }

  const diasSemana = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
  
  const headerRow = [
    { 
      text: 'TIPO DE REFEIÇÃO',
      fillColor: '#556B2F',
      color: '#ffffff',
      bold: true,
      fontSize: 10,
      alignment: 'center',
      margin: [10, 12, 10, 12]
    },
    ...datasOrdenadas.map(data => ({
      text: [
        { text: `${diasSemana[data.getDay()]}\n`, bold: true },
        { text: `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}`, bold: true }
      ],
      fillColor: '#556B2F',
      color: '#ffffff',
      alignment: 'center',
      fontSize: 10,
      margin: [10, 12, 10, 12]
    }))
  ];

  const tableBody = [headerRow];

  for (const tipoKey of tiposOrdenados) {
    const row: any[] = [
      { 
        text: `${tiposRefeicaoMap[tipoKey]}\n${tiposHorariosMap[tipoKey]}`,
        fillColor: '#E8F5E9',
        bold: true,
        fontSize: 10,
        alignment: 'center',
        color: '#2E2E2E',
        margin: [10, 12, 10, 12],
        valign: 'middle'
      }
    ];

    for (const data of datasOrdenadas) {
      const dia = data.getDate();

      const refeicoesNoDia = refeicoes.filter(r => 
        r.dia === dia && r.tipo_refeicao === tipoKey
      );

      const preparacoes = refeicoesNoDia
        .map(r => r.refeicao_nome.toUpperCase())
        .join('\n\n');

      row.push({
        text: preparacoes || '',
        fillColor: '#F5F5F5',
        alignment: 'center',
        fontSize: 8,
        color: '#2E2E2E',
        bold: false,
        margin: [10, 10, 10, 10],
        valign: 'middle'
      });
    }

    tableBody.push(row);
  }

  const tableContent = {
    table: {
      headerRows: 1,
      widths: [100, ...Array(datasOrdenadas.length).fill('*')],
      body: tableBody
    },
    layout: {
      hLineWidth: () => 3,
      vLineWidth: () => 3,
      hLineColor: () => '#ffffff',
      vLineColor: () => '#ffffff',
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0
    }
  };

  const modalidades = (cardapio as any)?.modalidades_nomes || cardapio?.modalidade_nome || '';
  const subtitulo = modalidades 
    ? `${modalidades} - ${cardapio?.ano} - ${dateUtils.getMonthName(cardapio?.mes)?.toUpperCase()}`
    : `${cardapio?.ano} - ${dateUtils.getMonthName(cardapio?.mes)?.toUpperCase()}`;

  // Rodapé customizado com nutricionista e aviso
  const customFooter = (currentPage: number, pageCount: number) => {
    const nutricionista = cardapio?.nutricionista_nome;
    const crn = cardapio?.nutricionista_crn;
    
    return {
      stack: [
        {
          canvas: [{
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 755,
            y2: 0,
            lineWidth: 0.5,
            lineColor: '#cccccc'
          }],
          margin: [40, 0, 40, 8]
        },
        {
          columns: [
            {
              stack: [
                ...(nutricionista ? [
                  { text: 'Nutricionista Responsável:', fontSize: 7, bold: true, color: '#666666' },
                  { text: nutricionista, fontSize: 8, color: '#333333', margin: [0, 2, 0, 0] },
                  ...(crn ? [{ text: `CRN: ${crn}`, fontSize: 7, color: '#666666', margin: [0, 1, 0, 0] }] : [])
                ] : [])
              ],
              width: '*'
            },
            {
              stack: [
                { text: '* Cardápio sujeito a alterações', fontSize: 7, italics: true, color: '#999999', alignment: 'right' },
                { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, color: '#999999', alignment: 'right', margin: [0, 4, 0, 0] }
              ],
              width: 200
            }
          ],
          margin: [40, 0, 40, 0]
        }
      ]
    };
  };

  const doc = buildPdfDoc({
    instituicao,
    title: cardapio?.nome?.toUpperCase() || 'CARDÁPIO',
    subtitle: subtitulo,
    content: [tableContent],
    orientation: 'landscape',
    showSignature: false,
    customFooter,
    extraStyles: {
      tableHeader: {
        bold: true,
        fontSize: 10,
        alignment: 'center',
        color: 'white'
      },
      tipoRefeicao: {
        bold: true,
        fontSize: 10,
        alignment: 'center'
      },
      tableCell: {
        fontSize: 8,
        alignment: 'center'
      }
    }
  });

  pdfMake.createPdf(doc).download(
    `cardapio-${dateUtils.getMonthName(cardapio?.mes)}-${cardapio?.ano}.pdf`
  );
};
