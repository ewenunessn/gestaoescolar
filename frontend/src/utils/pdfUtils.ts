/**
 * pdfUtils.ts — Utilitários de PDF padronizados para todo o sistema.
 *
 * Tecnologia escolhida: pdfmake (já usada na maioria dos módulos).
 * Motivo: declarativa, suporta cabeçalho/rodapé nativo em todas as páginas,
 * logo, tabelas complexas e estilos — mais fácil de manter que jsPDF imperativo.
 *
 * Como usar:
 *   const pdfMake = await initPdfMake();
 *   const doc = buildPdfDoc({ instituicao, title: 'Meu Relatório', content: [...] });
 *   pdfMake.createPdf(doc).download('arquivo.pdf');
 */

import { Instituicao } from '../services/instituicao';

// ─── Cores padrão do sistema (mesmas usadas em CompraDetalhe, CardapioCalendario) ─
export const PDF_COLORS = {
  headerBg:   '#2d3748', // cabeçalho de tabela
  headerText: '#ffffff',
  stripe:     '#f7f8fa', // linhas alternadas
  border:     '#e2e8f0', // bordas
  accent:     '#4a5568', // subtítulos / linhas secundárias
  dark:       '#1a202c', // totais / destaque
  divider:    '#e2e8f0',
};

// ─── Inicialização do pdfmake (importação dinâmica para Vite) ─────────────────

export const initPdfMake = async () => {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFonts = await import('pdfmake/build/vfs_fonts');
  const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;
  // vfs_fonts 0.3.x exporta as fontes diretamente no objeto raiz
  const vfs = (pdfFonts as any).default || pdfFonts;
  pdfMake.vfs = vfs;
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  };
  return pdfMake;
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PdfDocOptions {
  instituicao: Instituicao | null;
  title: string;
  subtitle?: string;
  /** Conteúdo principal do documento (array de elementos pdfmake) */
  content: any[];
  /** Orientação da página (padrão: portrait) */
  orientation?: 'portrait' | 'landscape';
  /** Mostrar assinatura do secretário no rodapé da última página */
  showSignature?: boolean;
  /** Estilos adicionais que se somam ao padrão */
  extraStyles?: Record<string, any>;
  /** Rodapé customizado (substitui o padrão) */
  customFooter?: (currentPage: number, pageCount: number) => any;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:3000';
    return 'https://gestaoescolar-backend.vercel.app';
  }
  return 'http://localhost:3000';
};

const processImageUrl = (logoUrl: string): string => {
  if (!logoUrl) return '';
  if (logoUrl.startsWith('data:')) return logoUrl;
  if (logoUrl.startsWith('/')) return `${getApiBaseUrl()}${logoUrl}`;
  if (logoUrl.startsWith('http://') && !logoUrl.includes('localhost'))
    return logoUrl.replace('http://', 'https://');
  return logoUrl;
};

// ─── Cabeçalho padrão (bloco pdfmake) ────────────────────────────────────────

const buildHeader = (instituicao: Instituicao | null, title: string, subtitle?: string): any => {
  const nome = instituicao?.nome || 'Secretaria Municipal de Educação';
  const logoUrl = instituicao?.logo_url ? processImageUrl(instituicao.logo_url) : null;
  const logoHeight = 48;

  // Construir conteúdo da primeira célula (logo + linha vertical)
  const logoCell: any = logoUrl
    ? {
        columns: [
          { image: logoUrl, fit: [120, logoHeight] },
          {
            canvas: [{
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 0,
              y2: logoHeight,
              lineWidth: 1.5,
              lineColor: PDF_COLORS.headerBg,
            }],
            width: 1.5,
            margin: [8, 0, 0, 0],
          },
        ],
        columnGap: 0,
      }
    : { text: '' };

  // Segunda célula: informações da instituição
  const instCell: any = {
    stack: [
      { text: nome, fontSize: 12, bold: true, color: PDF_COLORS.dark },
      ...(instituicao?.departamento
        ? [{ text: instituicao.departamento, fontSize: 8, color: PDF_COLORS.accent, margin: [0, 1, 0, 0] }]
        : []),
    ],
    margin: [12, 0, 0, 0],
  };

  // Terceira célula: rota e período
  const rightCell: any = {
    stack: [
      { text: title, fontSize: 14, bold: true, color: PDF_COLORS.headerBg, alignment: 'right' },
      { text: 'Guia de Entrega', fontSize: 10, bold: true, alignment: 'right', margin: [0, 4, 0, 0] },
      ...(subtitle ? [{ text: subtitle, fontSize: 9, color: PDF_COLORS.accent, alignment: 'right' }] : []),
    ],
  };

  return [
    {
      table: {
        widths: [logoUrl ? 130 : 0, '*', 160],
        body: [[logoCell, instCell, rightCell]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 8],
    },
    {
      canvas: [{
        type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
        lineWidth: 1.5, lineColor: PDF_COLORS.headerBg,
      }],
    },
    { text: '', margin: [0, 6, 0, 0] },
  ];
};

// ─── Rodapé padrão (função pdfmake) ──────────────────────────────────────────

const buildFooter = (
  instituicao: Instituicao | null,
  showSignature: boolean,
  totalPages: number
) => (currentPage: number, pageCount: number): any => {
  const nome = instituicao?.nome || 'Sistema de Gestão de Alimentação Escolar';
  const endereco = instituicao?.endereco || '';
  const geradoEm = new Date().toLocaleDateString('pt-BR');

  const footerItems: any[] = [
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.4, lineColor: PDF_COLORS.divider }],
      margin: [40, 0, 40, 4],
    },
    {
      columns: [
        {
          stack: [
            { text: nome, fontSize: 7, color: '#a0aec0' },
            ...(endereco ? [{ text: endereco, fontSize: 6, color: '#cbd5e0', margin: [0, 1, 0, 0] }] : []),
          ],
          alignment: 'left'
        },
        { text: `Gerado em ${geradoEm} · Página ${currentPage} de ${pageCount}`, fontSize: 7, color: '#a0aec0', alignment: 'right' },
      ],
      margin: [40, 0, 40, 0],
    },
  ];

  if (showSignature && instituicao?.secretario_nome && currentPage === pageCount) {
    footerItems.push({
      columns: [
        { text: '', width: '*' },
        {
          stack: [
            { text: '_'.repeat(40), alignment: 'center', margin: [0, 16, 0, 4] },
            { text: instituicao.secretario_nome, alignment: 'center', bold: true, fontSize: 9 },
            { text: instituicao.departamento || 'Secretaria Municipal de Educação', alignment: 'center', fontSize: 8 },
          ],
          width: 200,
        },
        { text: '', width: '*' },
      ],
      margin: [40, 8, 40, 0],
    });
  }

  return { stack: footerItems };
};

// ─── Estilos padrão ───────────────────────────────────────────────────────────

export const getDefaultPDFStyles = (): Record<string, any> => ({
  // Cabeçalho
  instNome:     { fontSize: 14, bold: true, color: '#1565c0' },
  instEndereco: { fontSize: 8,  color: '#666666' },
  docTitle:     { fontSize: 13, bold: true },
  docSubtitle:  { fontSize: 10, color: '#444444' },
  // Conteúdo
  sectionTitle: { fontSize: 12, bold: true, margin: [0, 10, 0, 4] },
  tableHeader:  { bold: true, fillColor: '#1565c0', color: 'white', fontSize: 9 },
  tableCell:    { fontSize: 9 },
  // Legado (mantido para compatibilidade com módulos existentes)
  header:       { fontSize: 16, bold: true },
  subheader:    { fontSize: 14, bold: true, margin: [0, 3, 0, 0] },
  subheader2:   { fontSize: 12, margin: [0, 3, 0, 0] },
  subheader3:   { fontSize: 10, margin: [0, 3, 0, 0] },
  sectionHeader:{ fontSize: 12, bold: true },
});

// ─── Função principal: monta o docDefinition completo ────────────────────────

/**
 * Monta um docDefinition pdfmake com cabeçalho e rodapé padrão da instituição.
 *
 * @example
 * const pdfMake = await initPdfMake();
 * const doc = buildPdfDoc({
 *   instituicao,
 *   title: 'Itens para Entrega',
 *   subtitle: `Escola: ${escola.nome}`,
 *   content: [
 *     { text: 'Seção', style: 'sectionTitle' },
 *     { table: { ... } }
 *   ]
 * });
 * pdfMake.createPdf(doc).download('arquivo.pdf');
 */
export const buildPdfDoc = ({
  instituicao,
  title,
  subtitle,
  content,
  orientation = 'portrait',
  showSignature = false,
  extraStyles = {},
  customFooter,
}: PdfDocOptions): any => ({
  pageOrientation: orientation,
  pageMargins: [40, 40, 40, 60],
  content: [
    ...buildHeader(instituicao, title, subtitle),
    ...content,
  ],
  footer: customFooter || buildFooter(instituicao, showSignature, 0),
  styles: { ...getDefaultPDFStyles(), ...extraStyles },
  defaultStyle: { fontSize: 10, font: 'Roboto' },
});

// ─── Helpers de tabela padrão ─────────────────────────────────────────────────

/** Cria um layout de tabela no estilo DataTable do sistema (cabeçalho cinza claro, bordas sutis) */
export const buildTable = (
  headers: string[], 
  rows: any[][], 
  widths?: (string | number)[],
  options?: { compact?: boolean }
): any => {
  const compact = options?.compact || false;
  const headerMargin = compact ? [4, 3, 4, 3] : [6, 5, 6, 5];
  const cellMargin = compact ? [4, 2, 4, 2] : [6, 4, 6, 4];

  return {
    table: {
      headerRows: 1,
      widths: widths || headers.map(() => '*'),
      body: [
        // Cabeçalho: fundo grey.100 (#F5F5F5), texto bold, sem cor de destaque
        headers.map(h => ({
          text: h,
          bold: true,
          fontSize: 8,
          color: '#212121',
          fillColor: '#F5F5F5',
          margin: headerMargin,
        })),
        // Linhas de dados: fundo branco, sem alternância (igual ao DataTable)
        ...rows.map(row =>
          row.map(cell => ({
            text: String(cell ?? ''),
            fontSize: 8,
            color: '#212121',
            fillColor: '#FFFFFF',
            margin: cellMargin,
          }))
        ),
      ],
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1.0 : 0.6),
      vLineWidth: () => 0.6,
      hLineColor: (i: number, node: any) => (i === 0 || i === node.table.body.length ? '#616161' : '#9E9E9E'),
      vLineColor: () => '#9E9E9E',
      fillColor: () => null,
    },
    margin: [0, 4, 0, 8],
  };
};

// ─── Legado: funções antigas mantidas para compatibilidade ───────────────────
// Os módulos que já usam createPDFHeader/createPDFFooter continuam funcionando.

interface PDFHeaderOptions {
  instituicao: Instituicao | null;
  title: string;
  subtitle?: string;
  subtitle2?: string;
  logoSize?: { width: number; height: number };
}

export const createPDFHeader = (options: PDFHeaderOptions) => {
  const { instituicao, title, subtitle, subtitle2, logoSize = { width: 120, height: 50 } } = options;
  const headerContent: any[] = [];
  if (instituicao?.logo_url) {
    headerContent.push({
      columns: [
        { image: processImageUrl(instituicao.logo_url), fit: [logoSize.width, logoSize.height] },
        {
          stack: [
            { text: instituicao.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
            { text: title, style: 'subheader', alignment: 'center' },
            ...(subtitle  ? [{ text: subtitle,  style: 'subheader2', alignment: 'center' }] : []),
            ...(subtitle2 ? [{ text: subtitle2, style: 'subheader3', alignment: 'center' }] : []),
          ],
          width: '*',
        },
        { text: '', width: logoSize.width },
      ],
    });
  } else {
    headerContent.push({
      stack: [
        { text: instituicao?.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
        { text: title, style: 'subheader', alignment: 'center' },
        ...(subtitle  ? [{ text: subtitle,  style: 'subheader2', alignment: 'center' }] : []),
        ...(subtitle2 ? [{ text: subtitle2, style: 'subheader3', alignment: 'center' }] : []),
      ],
    });
  }
  return headerContent;
};

interface PDFFooterOptions {
  instituicao: Instituicao | null;
  showSignature?: boolean;
  customText?: string;
}

export const createPDFFooter = (options: PDFFooterOptions) => {
  const { instituicao, showSignature = false, customText } = options;
  return (currentPage: number, pageCount: number) => {
    const footerStack: any[] = [
      {
        text: customText || `Pagina ${currentPage} de ${pageCount} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        alignment: 'center', fontSize: 7, color: '#999999', margin: [0, 10, 0, 0],
      },
    ];
    if (showSignature && instituicao?.secretario_nome && currentPage === pageCount) {
      footerStack.push({
        columns: [
          { text: '', width: '*' },
          {
            stack: [
              { text: '_'.repeat(40), alignment: 'center', margin: [0, 20, 0, 5] },
              { text: instituicao.secretario_nome, alignment: 'center', bold: true, fontSize: 10 },
              { text: instituicao.departamento || 'Secretaria Municipal de Educação', alignment: 'center', fontSize: 9 },
            ],
            width: 200,
          },
          { text: '', width: '*' },
        ],
        margin: [0, 20, 0, 0],
      });
    }
    return { stack: footerStack };
  };
};
