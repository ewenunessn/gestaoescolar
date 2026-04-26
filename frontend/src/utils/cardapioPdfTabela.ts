import { CardapioModalidade, RefeicaoDia, TIPOS_REFEICAO } from '../services/cardapiosModalidade';
import { listarTiposRefeicao, formatarHorario } from '../services/tiposRefeicao';
import { dateUtils } from './dateUtils';
import { buildPdfDoc, initPdfMake, savePdfMakeDocument } from './pdfUtils';
import QRCode from 'qrcode';

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
    throw new Error('Selecione no máximo 6 dias no total');
  }

  const pdfMake = await initPdfMake();
  const instituicao = await fetchInstituicaoForPDF();

  // Carregar tipos de refeição dinâmicos (serviço já retorna o array)
  const tiposRefeicaoArray = await listarTiposRefeicao(true);
  const tiposRefeicaoMap: Record<string, string> = {};
  const tiposHorariosMap: Record<string, string> = {};

  tiposRefeicaoArray.forEach(tipo => {
    tiposRefeicaoMap[tipo.chave] = tipo.nome.toUpperCase();
    tiposHorariosMap[tipo.chave] = formatarHorario(tipo.horario) + 'H';
  });

  const datasOrdenadas = diasSelecionadosCalendario.sort((a, b) => a.getTime() - b.getTime());

  const tiposExistentes = new Set<string>();
  datasOrdenadas.forEach(data => {
    const dia = data.getDate();
    const refeicoesNoDia = refeicoes.filter(r => String(r.dia) === String(dia));
    refeicoesNoDia.forEach(r => {
      if (tiposRefeicaoMap[r.tipo_refeicao]) {
        tiposExistentes.add(r.tipo_refeicao);
      }
    });
  });

  // Ordenar tipos pela ordem definida no banco
  const tiposOrdenados = tiposRefeicaoArray
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
    ? `${modalidades} - ${cardapio?.ano} - ${dateUtils.getMonthName(cardapio?.mes ?? 1)?.toUpperCase()}`
    : `${cardapio?.ano} - ${dateUtils.getMonthName(cardapio?.mes ?? 1)?.toUpperCase()}`;

  // Coletar IDs das refeições incluídas no PDF
  const refeicoesIds = new Set<number>();
  datasOrdenadas.forEach(data => {
    const dia = data.getDate();
    const refeicoesNoDia = refeicoes.filter(r => r.dia === dia);
    refeicoesNoDia.forEach(r => {
      refeicoesIds.add(r.refeicao_id);
    });
  });


  // Gerar dados para o QR code
  const qrData = {
    cardapioId: cardapio?.id,
    refeicoesIds: Array.from(refeicoesIds),
    mes: cardapio?.mes,
    ano: cardapio?.ano,
    dias: datasOrdenadas.map(d => d.getDate())
  };


  // Gerar URL completa
  const qrUrl = `${window.location.origin}/cardapio-publico?data=${encodeURIComponent(JSON.stringify(qrData))}`;

  // Gerar QR code como data URL
  let qrCodeDataUrl: string | null = null;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (qrError) {
    console.error('Erro ao gerar QR Code:', qrError);
    throw new Error('Falha ao gerar QR Code: ' + (qrError as Error).message);
  }

  // Verificar se o QR code foi gerado corretamente
  if (!qrCodeDataUrl || !qrCodeDataUrl.startsWith('data:image')) {
    console.error('QR Code inválido ou não gerado');
    throw new Error('Falha ao gerar QR Code');
  }

  // Rodapé customizado com nutricionista e aviso
  const customFooter = (currentPage: number, pageCount: number) => {
    const nutricionista = cardapio?.nutricionista_nome;
    const crn = cardapio?.nutricionista_crn;
    const dataHoraImpressao = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
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
                  { 
                    text: [
                      { text: 'Nutricionista Responsável: ', fontSize: 11, bold: true, color: '#666666' },
                      { text: nutricionista, fontSize: 11, color: '#333333' }
                    ]
                  },
                  ...(crn ? [{ text: `CRN: ${crn}`, fontSize: 10, color: '#666666', margin: [0, 2, 0, 0] }] : [])
                ] : []),
                { 
                  text: `Impresso em: ${dataHoraImpressao}`, 
                  fontSize: 9, 
                  color: '#999999', 
                  margin: [0, 4, 0, 0] 
                }
              ],
              width: '*'
            },
            {
              stack: [
                { text: '* Cardápio sujeito a alterações', fontSize: 10, italics: true, color: '#999999', alignment: 'right' },
                { text: `Página ${currentPage} de ${pageCount}`, fontSize: 10, color: '#999999', alignment: 'right', margin: [0, 4, 0, 0] }
              ],
              width: 200
            }
          ],
          margin: [40, 0, 40, 0]
        }
      ]
    };
  };


  // Criar conteúdo do QR Code
  const qrCodeContent = qrCodeDataUrl ? {
    columns: [
      { text: '', width: '*' },
      {
        stack: [
          {
            image: qrCodeDataUrl,
            width: 100,
            height: 100,
            alignment: 'right'
          },
          {
            text: 'Escaneie para ver as fichas técnicas',
            fontSize: 8,
            alignment: 'right',
            margin: [0, 4, 0, 0],
            color: '#666666'
          }
        ],
        width: 120,
        alignment: 'right'
      }
    ],
    margin: [0, 15, 0, 0]
  } : null;


  // Montar array de conteúdo
  const pdfContent: any[] = [tableContent];
  if (qrCodeContent) {
    pdfContent.push(qrCodeContent);
  } else {
  }

  const doc = buildPdfDoc({
    instituicao,
    title: cardapio?.nome?.toUpperCase() || 'CARDÁPIO',
    subtitle: subtitulo,
    content: pdfContent,
    orientation: 'landscape',
    showSignature: false,
    customFooter,
    extraStyles: {
      tableHeader: {
        bold: true,
        fontSize: 12,
        alignment: 'center',
        color: 'white'
      },
      tipoRefeicao: {
        bold: true,
        fontSize: 11,
        alignment: 'center'
      },
      tableCell: {
        fontSize: 10,
        alignment: 'center'
      }
    }
  });

  await savePdfMakeDocument(
    pdfMake,
    doc,
    `cardapio-${dateUtils.getMonthName(cardapio?.mes ?? 1)}-${cardapio?.ano}.pdf`,
  );
};
