/**
 * Utilitário para geração de PDF de Ficha Técnica
 * Usado tanto no módulo de nutrição quanto no portal da escola
 */

import { Instituicao } from '../services/instituicao';
import { initPdfMake, buildPdfDoc, PDF_COLORS, savePdfMakeDocument } from './pdfUtils';

const toNum = (v: any): number => parseFloat(v) || 0;

export interface FichaTecnicaData {
  refeicao: {
    nome: string;
    descricao?: string;
    categoria?: string;
    tempo_preparo_minutos?: number;
    rendimento_porcoes?: number;
    modo_preparo?: string;
    utensilios?: string;
    observacoes_tecnicas?: string;
  };
  produtos: Array<{
    produto_nome: string;
    per_capita: number;
    per_capita_bruto?: number;
    tipo_medida: string;
    proteinas_porcao?: number;
    lipidios_porcao?: number;
    carboidratos_porcao?: number;
    calcio_porcao?: number;
    ferro_porcao?: number;
    vitamina_a_porcao?: number;
    vitamina_c_porcao?: number;
    sodio_porcao?: number;
  }>;
  modalidadeNome?: string;
  instituicao?: Instituicao | null;
}

export async function gerarPDFFichaTecnica(data: FichaTecnicaData) {
  const pdfMake = await initPdfMake();
  const { instituicao } = data;

  const { refeicao, produtos: ings, modalidadeNome } = data;

  // Totais
  const totalLiq = ings.reduce((s, i) => s + toNum(i.per_capita), 0);
  const totalBruto = ings.reduce((s, i) => s + toNum(i.per_capita_bruto ?? i.per_capita), 0);
  const totalProt = ings.reduce((s, i) => s + toNum(i.proteinas_porcao), 0);
  const totalLip = ings.reduce((s, i) => s + toNum(i.lipidios_porcao), 0);
  const totalCarb = ings.reduce((s, i) => s + toNum(i.carboidratos_porcao), 0);
  const totalCalcio = ings.reduce((s, i) => s + toNum(i.calcio_porcao), 0);
  const totalFerro = ings.reduce((s, i) => s + toNum(i.ferro_porcao), 0);
  const totalVitA = ings.reduce((s, i) => s + toNum(i.vitamina_a_porcao), 0);
  const totalVitC = ings.reduce((s, i) => s + toNum(i.vitamina_c_porcao), 0);
  const totalSodio = ings.reduce((s, i) => s + toNum(i.sodio_porcao), 0);
  const totalKcal = totalProt * 4 + totalCarb * 4 + totalLip * 9;
  const totalKj = totalKcal * 4.184;

  // Por 100g
  const f100 = totalLiq > 0 ? 100 / totalLiq : 0;
  const kcal100 = totalKcal * f100;
  const kj100 = kcal100 * 4.184;

  // Paleta neutra
  const C_HEADER = '#4a5568';
  const C_TOTAL = '#2d3748';
  const C_100G = '#4a5568';
  const C_STRIPE = '#f7f8fa';
  const C_BORDER = '#e2e8f0';

  // Helper: célula de dado
  const dc = (v: number, dec = 1, bg = '#ffffff') => ({
    text: v > 0 ? v.toFixed(dec) : '—',
    alignment: 'center' as const,
    fontSize: 7,
    fillColor: bg,
    color: v > 0 ? '#2d3748' : '#cbd5e0',
  });

  // Linha de totais helper
  const mkRow = (
    label: string,
    fill: string,
    liq: string,
    bruto: string,
    kcal: number,
    kj: number,
    prot: number,
    lip: number,
    carb: number,
    calcio: number,
    ferro: number,
    vita: number,
    vitc: number,
    sodio: number
  ): any[] => {
    const t = (v: string | number, dec?: number) => ({
      text: typeof v === 'number' ? (dec !== undefined ? v.toFixed(dec) : String(v)) : v,
      alignment: 'center' as const,
      bold: true,
      fontSize: 7,
      fillColor: fill,
      color: '#ffffff',
    });
    return [
      { text: label, bold: true, fontSize: 7, fillColor: fill, color: '#ffffff' },
      t(liq),
      t(bruto),
      t('g'),
      t(kcal, 0),
      t(kj, 0),
      t(prot, 1),
      t(lip, 1),
      t(carb, 1),
      t(calcio, 1),
      t(ferro, 2),
      t(vita, 1),
      t(vitc, 1),
      t(sodio, 1),
    ];
  };

  // Conteúdo específico da ficha técnica (preservado)
  const fichaContent: any[] = [
    // -- Subcabeçalho da ficha (nome da preparação) ---
    {
      columns: [
        {
          stack: [
            {
              text: 'Ficha Técnica DE PREPARAÇÃO',
              fontSize: 7.5,
              bold: true,
              color: '#718096',
              characterSpacing: 1,
            },
            {
              text: refeicao.nome,
              fontSize: 18,
              bold: true,
              color: '#1a202c',
              margin: [0, 2, 0, 0],
            },
            ...(modalidadeNome
              ? [
                  {
                    text: `Modalidade: ${modalidadeNome}`,
                    fontSize: 8.5,
                    bold: true,
                    color: '#38a169',
                    margin: [0, 3, 0, 0],
                  },
                ]
              : []),
            ...(refeicao.descricao
              ? [
                  {
                    text: refeicao.descricao,
                    fontSize: 8,
                    italics: true,
                    color: '#718096',
                    margin: [0, 2, 0, 0],
                  },
                ]
              : []),
          ],
          width: '*',
        },
        {
          stack: [
            ...(refeicao.categoria
              ? [
                  {
                    text: refeicao.categoria,
                    fontSize: 8,
                    bold: true,
                    color: '#4a5568',
                    alignment: 'right',
                  },
                ]
              : []),
            ...(refeicao.tempo_preparo_minutos
              ? [
                  {
                    text: `Preparo: ${refeicao.tempo_preparo_minutos} min`,
                    fontSize: 7.5,
                    color: '#718096',
                    alignment: 'right',
                    margin: [0, 4, 0, 0],
                  },
                ]
              : []),
            ...(refeicao.rendimento_porcoes
              ? [
                  {
                    text: `Rendimento: ${refeicao.rendimento_porcoes} porções`,
                    fontSize: 7.5,
                    color: '#718096',
                    alignment: 'right',
                    margin: [0, 2, 0, 0],
                  },
                ]
              : []),
          ],
          width: 130,
        },
      ],
      margin: [0, 0, 0, 10],
    },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 1.5, lineColor: '#e2e8f0' }],
      margin: [0, 0, 0, 12],
    },

    // -- Tabela principal ----------------------------------------
    {
      text: 'COMPOSIÇÃO NUTRICIONAL DOS INGREDIENTES',
      fontSize: 7.5,
      bold: true,
      color: '#718096',
      characterSpacing: 0.5,
      margin: [0, 0, 0, 5],
    },
    {
      table: {
        headerRows: 1,
        widths: ['*', 24, 26, 12, 24, 28, 24, 24, 24, 26, 22, 26, 24, 26],
        body: [
          [
            { text: 'Ingrediente', style: 'th' },
            { text: 'PC Líq.\n(g)', style: 'th' },
            { text: 'PC Bruto\n(g)', style: 'th' },
            { text: 'Un', style: 'th' },
            { text: 'kcal', style: 'th' },
            { text: 'kJ', style: 'th' },
            { text: 'Prot.\n(g)', style: 'th' },
            { text: 'Lip.\n(g)', style: 'th' },
            { text: 'Carb.\n(g)', style: 'th' },
            { text: 'Cálcio\n(mg)', style: 'th' },
            { text: 'Ferro\n(mg)', style: 'th' },
            { text: 'Vit. A\n(mcg)', style: 'th' },
            { text: 'Vit. C\n(mg)', style: 'th' },
            { text: 'Sódio\n(mg)', style: 'th' },
          ],
          ...ings.map((ing, idx) => {
            const bg = idx % 2 === 0 ? C_STRIPE : '#ffffff';
            const kcalIng =
              toNum(ing.proteinas_porcao) * 4 +
              toNum(ing.carboidratos_porcao) * 4 +
              toNum(ing.lipidios_porcao) * 9;
            const kjIng = kcalIng * 4.184;
            return [
              { text: ing.produto_nome, fontSize: 7, fillColor: bg, color: '#2d3748' },
              {
                text: toNum(ing.per_capita).toFixed(1),
                alignment: 'center',
                fontSize: 7,
                fillColor: bg,
                bold: true,
                color: '#2b6cb0',
              },
              {
                text: toNum(ing.per_capita_bruto ?? ing.per_capita).toFixed(1),
                alignment: 'center',
                fontSize: 7,
                fillColor: bg,
                color: '#4a5568',
              },
              {
                text:
                  ing.tipo_medida === 'gramas'
                    ? 'g'
                    : ing.tipo_medida === 'mililitros'
                    ? 'ml'
                    : 'un',
                alignment: 'center',
                fontSize: 7,
                fillColor: bg,
                color: '#718096',
              },
              dc(kcalIng, 0, bg),
              dc(kjIng, 0, bg),
              dc(toNum(ing.proteinas_porcao), 1, bg),
              dc(toNum(ing.lipidios_porcao), 1, bg),
              dc(toNum(ing.carboidratos_porcao), 1, bg),
              dc(toNum(ing.calcio_porcao), 1, bg),
              dc(toNum(ing.ferro_porcao), 2, bg),
              dc(toNum(ing.vitamina_a_porcao), 1, bg),
              dc(toNum(ing.vitamina_c_porcao), 1, bg),
              dc(toNum(ing.sodio_porcao), 1, bg),
            ];
          }),
          mkRow(
            'TOTAL Preparação',
            C_TOTAL,
            totalLiq.toFixed(1),
            totalBruto.toFixed(1),
            totalKcal,
            totalKj,
            totalProt,
            totalLip,
            totalCarb,
            totalCalcio,
            totalFerro,
            totalVitA,
            totalVitC,
            totalSodio
          ),
          mkRow(
            'POR 100g',
            C_100G,
            '100',
            '—',
            kcal100,
            kj100,
            totalProt * f100,
            totalLip * f100,
            totalCarb * f100,
            totalCalcio * f100,
            totalFerro * f100,
            totalVitA * f100,
            totalVitC * f100,
            totalSodio * f100
          ),
        ],
      },
      layout: {
        hLineWidth: (i: number, node: any) => {
          const n = node.table.body.length;
          return i === 0 || i === 1 || i === n - 2 || i === n ? 1 : 0.3;
        },
        vLineWidth: () => 0.3,
        hLineColor: (i: number, node: any) => {
          const n = node.table.body.length;
          return i === 0 || i === 1 || i === n - 2 || i === n ? '#a0aec0' : C_BORDER;
        },
        vLineColor: () => C_BORDER,
        paddingTop: () => 3,
        paddingBottom: () => 3,
        paddingLeft: (i: number) => (i === 0 ? 5 : 2),
        paddingRight: (i: number) => (i === 0 ? 5 : 2),
      },
      margin: [0, 0, 0, 16],
    },

    // -- Seção inferior: 2 colunas -------------------------------
    {
      columns: [
        ...(refeicao.modo_preparo
          ? [
              {
                stack: [
                  {
                    text: 'MODO DE PREPARO',
                    fontSize: 7.5,
                    bold: true,
                    color: '#718096',
                    characterSpacing: 0.5,
                    margin: [0, 0, 0, 4],
                  },
                  {
                    canvas: [
                      {
                        type: 'line',
                        x1: 0,
                        y1: 0,
                        x2: 250,
                        y2: 0,
                        lineWidth: 0.8,
                        lineColor: '#e2e8f0',
                      },
                    ],
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: refeicao.modo_preparo,
                    fontSize: 8,
                    color: '#4a5568',
                    lineHeight: 1.5,
                  },
                ],
                width: '*',
              },
            ]
          : [{ text: '', width: '*' }]),
        { width: 16, text: '' },
        {
          stack: [
            {
              text: 'INFORMAÇÕES',
              fontSize: 7.5,
              bold: true,
              color: '#718096',
              characterSpacing: 0.5,
              margin: [0, 0, 0, 4],
            },
            {
              canvas: [
                { type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: '#e2e8f0' },
              ],
              margin: [0, 0, 0, 5],
            },
            ...(refeicao.categoria
              ? [
                  {
                    columns: [
                      { text: 'Categoria', fontSize: 7.5, color: '#718096', width: 80 },
                      {
                        text: refeicao.categoria,
                        fontSize: 7.5,
                        bold: true,
                        color: '#2d3748',
                        width: '*',
                      },
                    ],
                    margin: [0, 0, 0, 3],
                  },
                ]
              : []),
            ...(refeicao.tempo_preparo_minutos
              ? [
                  {
                    columns: [
                      { text: 'Tempo de preparo', fontSize: 7.5, color: '#718096', width: 80 },
                      {
                        text: `${refeicao.tempo_preparo_minutos} minutos`,
                        fontSize: 7.5,
                        bold: true,
                        color: '#2d3748',
                        width: '*',
                      },
                    ],
                    margin: [0, 0, 0, 3],
                  },
                ]
              : []),
            ...(refeicao.rendimento_porcoes
              ? [
                  {
                    columns: [
                      { text: 'Rendimento', fontSize: 7.5, color: '#718096', width: 80 },
                      {
                        text: `${refeicao.rendimento_porcoes} porções`,
                        fontSize: 7.5,
                        bold: true,
                        color: '#2d3748',
                        width: '*',
                      },
                    ],
                    margin: [0, 0, 0, 3],
                  },
                ]
              : []),
            ...(modalidadeNome
              ? [
                  {
                    columns: [
                      { text: 'Modalidade', fontSize: 7.5, color: '#718096', width: 80 },
                      {
                        text: modalidadeNome,
                        fontSize: 7.5,
                        bold: true,
                        color: '#38a169',
                        width: '*',
                      },
                    ],
                    margin: [0, 0, 0, 3],
                  },
                ]
              : []),
            ...(refeicao.utensilios
              ? [
                  { text: 'Utensílios', fontSize: 7.5, color: '#718096', margin: [0, 4, 0, 2] },
                  { text: refeicao.utensilios, fontSize: 7.5, color: '#4a5568' },
                ]
              : []),
            ...(refeicao.observacoes_tecnicas
              ? [
                  { text: 'Observações', fontSize: 7.5, color: '#718096', margin: [0, 4, 0, 2] },
                  {
                    text: refeicao.observacoes_tecnicas,
                    fontSize: 7.5,
                    color: '#4a5568',
                    lineHeight: 1.4,
                  },
                ]
              : []),
          ],
          width: 220,
        },
      ],
    },
  ];

  const doc = buildPdfDoc({
    instituicao: instituicao || null,
    title: 'Ficha Técnica de Preparação',
    subtitle: refeicao.nome,
    content: fichaContent,
    pageMargins: [28, 36, 28, 56],
    extraStyles: {
      th: { bold: true, fontSize: 6.5, color: '#ffffff', fillColor: C_HEADER, alignment: 'center' },
    },
  });

  await savePdfMakeDocument(
    pdfMake,
    doc,
    `ficha-tecnica-${refeicao.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`,
  );
}

