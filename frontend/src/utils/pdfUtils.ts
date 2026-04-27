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
  headerBg:   '#1f2937', // cabeçalho de tabela
  headerText: '#ffffff',
  stripe:     '#f8fafc', // linhas alternadas
  border:     '#525252', // bordas
  accent:     '#475569', // subtítulos / linhas secundárias
  dark:       '#111827', // totais / destaque
  divider:    '#525252',
  mutedBg:    '#f8fafc',
  panelBg:    '#f9fafb',
  subtle:     '#94a3b8',
  lightBar:   '#cbd5e1',
};

export type PdfPageOrientation = 'portrait' | 'landscape';
export type PdfPageMargins = [number, number, number, number];

const A4_SIZE = {
  portrait: { width: 595.28, height: 841.89 },
  landscape: { width: 841.89, height: 595.28 },
};

const DEFAULT_PAGE_MARGINS: Record<PdfPageOrientation, PdfPageMargins> = {
  portrait: [36, 34, 36, 58],
  landscape: [32, 28, 32, 52],
};

export const PAGE = {
  width: A4_SIZE.portrait.width,
  height: A4_SIZE.portrait.height,
  marginLeft: DEFAULT_PAGE_MARGINS.portrait[0],
  marginTop: DEFAULT_PAGE_MARGINS.portrait[1],
  marginRight: DEFAULT_PAGE_MARGINS.portrait[2],
  marginBottom: DEFAULT_PAGE_MARGINS.portrait[3],
  contentWidth: A4_SIZE.portrait.width - DEFAULT_PAGE_MARGINS.portrait[0] - DEFAULT_PAGE_MARGINS.portrait[2],
};

export const getDefaultPdfMargins = (orientation: PdfPageOrientation = 'portrait'): PdfPageMargins => (
  [...DEFAULT_PAGE_MARGINS[orientation]] as PdfPageMargins
);

export const getPdfPageMetrics = (
  orientation: PdfPageOrientation = 'portrait',
  pageMargins?: PdfPageMargins,
) => {
  const margins = pageMargins || getDefaultPdfMargins(orientation);
  const page = A4_SIZE[orientation];

  return {
    pageWidth: page.width,
    pageHeight: page.height,
    margins,
    contentWidth: page.width - margins[0] - margins[2],
    contentHeight: page.height - margins[1] - margins[3],
  };
};

let pdfMakePromise: Promise<any> | null = null;
const DESKTOP_DOWNLOAD_PATCHED = '__nutrilogDesktopDownloadPatched';

export interface SavedGeneratedFile {
  canceled: boolean;
  fileName: string;
  filePath?: string;
}

interface PdfDocumentLike {
  download: (fileName?: string, ...args: any[]) => void;
  getBase64: (callback: (data: string) => void) => void;
}

interface PdfMakeLike {
  createPdf: (docDefinition: any) => PdfDocumentLike;
}

interface PdfMakeFontRegistryLike extends Partial<PdfMakeLike> {
  vfs?: Record<string, any>;
  fonts?: Record<string, any>;
  addVirtualFileSystem?: (vfs: Record<string, any>) => void;
  addFonts?: (fonts: Record<string, any>) => void;
}

const DEFAULT_PDF_FONTS = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

const getPdfBase64 = (pdfDocument: PdfDocumentLike): Promise<string> => (
  new Promise((resolve, reject) => {
    try {
      pdfDocument.getBase64((data) => resolve(data));
    } catch (error) {
      reject(error);
    }
  })
);

export const savePdfDocument = async (
  pdfDocument: PdfDocumentLike,
  fileName: string,
): Promise<SavedGeneratedFile> => {
  const desktopShell = typeof window !== 'undefined' ? window.desktopShell : undefined;

  if (desktopShell?.isDesktop && desktopShell.saveGeneratedFile) {
    const data = await getPdfBase64(pdfDocument);
    return desktopShell.saveGeneratedFile({
      fileName,
      mimeType: 'application/pdf',
      data,
      encoding: 'base64',
    });
  }

  pdfDocument.download(fileName);
  return { canceled: false, fileName };
};

export const savePdfMakeDocument = async (
  pdfMake: PdfMakeLike,
  docDefinition: any,
  fileName: string,
): Promise<SavedGeneratedFile> => savePdfDocument(pdfMake.createPdf(docDefinition), fileName);

const enhancePdfMakeForDesktopDownloads = (pdfMake: any) => {
  if (!pdfMake || pdfMake[DESKTOP_DOWNLOAD_PATCHED]) return pdfMake;

  const originalCreatePdf = pdfMake.createPdf.bind(pdfMake);
  pdfMake.createPdf = (...args: any[]) => {
    const pdfDocument = originalCreatePdf(...args);
    const originalDownload = pdfDocument.download?.bind(pdfDocument);

    if (originalDownload) {
      pdfDocument.download = (fileName = 'documento.pdf', ...downloadArgs: any[]) => {
        const desktopShell = typeof window !== 'undefined' ? window.desktopShell : undefined;
        if (desktopShell?.isDesktop && desktopShell.saveGeneratedFile) {
          return savePdfDocument(pdfDocument, fileName);
        }

        return originalDownload(fileName, ...downloadArgs);
      };
    }

    return pdfDocument;
  };

  Object.defineProperty(pdfMake, DESKTOP_DOWNLOAD_PATCHED, {
    value: true,
    enumerable: false,
  });

  return pdfMake;
};

// ─── Inicialização do pdfmake (importação dinâmica para Vite) ─────────────────

export const configurePdfMakeFonts = (
  pdfMake: PdfMakeFontRegistryLike,
  vfs: Record<string, any>,
) => {
  if (pdfMake.addVirtualFileSystem) {
    pdfMake.addVirtualFileSystem(vfs);
  } else {
    pdfMake.vfs = vfs;
  }

  if (pdfMake.addFonts) {
    pdfMake.addFonts(DEFAULT_PDF_FONTS);
  }

  pdfMake.fonts = {
    ...(pdfMake.fonts || {}),
    ...DEFAULT_PDF_FONTS,
  };

  return pdfMake;
};

export const initPdfMake = async () => {
  if (!pdfMakePromise) {
    pdfMakePromise = Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ]).then(([pdfMakeModule, pdfFonts]) => {
      const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;
      const vfs = (pdfFonts as any).default || pdfFonts;
      configurePdfMakeFonts(pdfMake, vfs);
      return enhancePdfMakeForDesktopDownloads(pdfMake);
    });
  }

  return pdfMakePromise;
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PdfDocOptions {
  instituicao: Instituicao | null;
  title: string;
  subtitle?: string;
  /** Conteúdo principal do documento (array de elementos pdfmake) */
  content: any[];
  /** Orientação da página (padrão: portrait) */
  orientation?: PdfPageOrientation;
  /** Mostrar assinatura do secretário no rodapé da última página */
  showSignature?: boolean;
  /** Estilos adicionais que se somam ao padrão */
  extraStyles?: Record<string, any>;
  /** Rodapé customizado (substitui o padrão) */
  customFooter?: (currentPage: number, pageCount: number) => any;
  /** Margens customizadas [left, top, right, bottom] (substitui o padrão) */
  pageMargins?: PdfPageMargins;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const v = import.meta.env.VITE_API_URL;
    if (v) return v.replace(/\/api$/, '');
    return import.meta.env.PROD
      ? 'https://gestaoescolar-backend.vercel.app'
      : 'http://localhost:3000';
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

export const buildHeader = (
  instituicao: Instituicao | null, 
  title: string, 
  subtitle?: string,
  orientation: PdfPageOrientation = 'portrait',
  pageMargins?: PdfPageMargins,
): any => {
  const nome = instituicao?.nome || 'Secretaria Municipal de Educação';
  const logoUrl = instituicao?.logo_url ? processImageUrl(instituicao.logo_url) : null;
  
  // Ajustar tamanhos para modo paisagem
  const isLandscape = orientation === 'landscape';
  const { contentWidth } = getPdfPageMetrics(orientation, pageMargins);
  const logoHeight = isLandscape ? 38 : 48;
  const logoWidth = isLandscape ? 112 : 120;
  const logoColumnWidth = logoUrl
    ? Math.min(isLandscape ? 150 : 142, Math.max(112, contentWidth * 0.28))
    : 0;
  const rightColumnWidth = Math.min(
    isLandscape ? 270 : 190,
    Math.max(isLandscape ? 210 : 155, contentWidth * 0.36),
  );
  const titleFontSize = isLandscape ? 14 : 15;
  const subtitleFontSize = isLandscape ? 9.5 : 10.5;
  const instFontSize = isLandscape ? 12.5 : 13.5;
  const deptFontSize = isLandscape ? 8.5 : 9.5;

  // Construir conteúdo da primeira célula (logo + linha vertical)
  const logoCell: any = logoUrl
    ? {
        columns: [
          { image: logoUrl, fit: [logoWidth, logoHeight] },
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
            margin: [10, 0, 0, 0],
          },
        ],
        columnGap: 2,
      }
    : { text: '' };

  // Segunda célula: informações da instituição
  const instCell: any = {
    stack: [
      { text: nome, fontSize: instFontSize, bold: true, color: PDF_COLORS.dark },
      ...(instituicao?.departamento
        ? [{ text: instituicao.departamento, fontSize: deptFontSize, color: PDF_COLORS.accent, margin: [0, 1, 0, 0] }]
        : []),
    ],
    margin: [logoUrl ? 12 : 0, 2, 8, 0],
  };

  // Terceira célula: rota e período
  const rightCell: any = {
    stack: [
      { text: title, fontSize: titleFontSize, bold: true, color: PDF_COLORS.headerBg, alignment: 'right', lineHeight: 1.05 },
      ...(subtitle ? [{ text: subtitle, fontSize: subtitleFontSize, color: PDF_COLORS.accent, alignment: 'right', margin: [0, 3, 0, 0], lineHeight: 1.1 }] : []),
    ],
    margin: [8, 2, 0, 0],
  };

  const body = logoUrl
    ? [[logoCell, instCell, rightCell]]
    : [[instCell, rightCell]];
  const widths = logoUrl
    ? [logoColumnWidth, '*', rightColumnWidth]
    : ['*', rightColumnWidth];

  return [
    {
      stack: [
        {
          canvas: [
            { type: 'rect', x: 0, y: 0, w: contentWidth * 0.58, h: 4, color: PDF_COLORS.headerBg },
            { type: 'rect', x: contentWidth * 0.58, y: 0, w: contentWidth * 0.27, h: 4, color: PDF_COLORS.accent },
            { type: 'rect', x: contentWidth * 0.85, y: 0, w: contentWidth * 0.15, h: 4, color: PDF_COLORS.lightBar },
          ],
          margin: [0, 0, 0, 8],
        },
        {
          table: {
            widths,
            body,
          },
          layout: {
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
            hLineWidth: () => 0,
            vLineWidth: () => 0,
          },
        },
      ],
      margin: [0, 0, 0, 10],
      unbreakable: true,
    },
    {
      canvas: [{
        type: 'line', x1: 0, y1: 0, x2: contentWidth, y2: 0,
        lineWidth: 1.2, lineColor: PDF_COLORS.headerBg,
      }],
      margin: [0, 0, 0, 12],
    },
  ];
};

// ─── Rodapé padrão (função pdfmake) ──────────────────────────────────────────

export const buildFooter = (
  instituicao: Instituicao | null,
  showSignature: boolean,
  totalPages: number,
  orientation: PdfPageOrientation = 'portrait',
  pageMargins?: PdfPageMargins,
) => (currentPage: number, pageCount: number): any => {
  const nome = instituicao?.nome || 'Sistema de Gestão de Alimentação Escolar';
  const endereco = instituicao?.endereco || '';
  const geradoEm = new Date().toLocaleDateString('pt-BR');
  const { contentWidth, margins } = getPdfPageMetrics(orientation, pageMargins);
  const horizontalMargin = [margins[0], 0, margins[2], 0];

  const footerItems: any[] = [
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: contentWidth, y2: 0, lineWidth: 0.4, lineColor: PDF_COLORS.divider }],
      margin: [margins[0], 0, margins[2], 5],
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
      margin: horizontalMargin,
    },
  ];

  footerItems[1].columns[1].text = `Gerado em ${geradoEm} - Pagina ${currentPage} de ${pageCount}`;
  footerItems[1].columns[1].color = '#94a3b8';

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
      margin: [margins[0], 8, margins[2], 0],
    });
  }

  return { stack: footerItems };
};

// ─── Estilos padrão ───────────────────────────────────────────────────────────

interface PdfQrFooterOptions {
  instituicao: Instituicao | null;
  qrCodeDataUrl?: string | null;
  qrLabel?: string;
  footerNote?: string;
  orientation?: PdfPageOrientation;
  pageMargins?: PdfPageMargins;
}

export const buildQrFooter = ({
  instituicao,
  qrCodeDataUrl,
  qrLabel,
  footerNote,
  orientation = 'portrait',
  pageMargins,
}: PdfQrFooterOptions) => (currentPage: number, pageCount: number): any => {
  const nome = instituicao?.nome || 'Sistema de Gestao de Alimentacao Escolar';
  const endereco = instituicao?.endereco || '';
  const geradoEm = new Date().toLocaleDateString('pt-BR');
  const { contentWidth, margins } = getPdfPageMetrics(orientation, pageMargins);
  const noteText = footerNote || (qrCodeDataUrl
    ? 'QR Code para uso no app'
    : 'Documento gerado pelo sistema');
  const columns: any[] = [
    {
      stack: [
        { text: nome, fontSize: 7, bold: true, color: PDF_COLORS.dark },
        ...(endereco ? [{ text: endereco, fontSize: 6, color: PDF_COLORS.accent, margin: [0, 1, 0, 0] }] : []),
        { text: `Gerado em ${geradoEm} - Pagina ${currentPage} de ${pageCount}`, fontSize: 6, color: PDF_COLORS.subtle, margin: [0, 2, 0, 0] },
      ],
      alignment: 'left',
      width: '*',
    },
    {
      text: noteText,
      fontSize: 6.5,
      color: PDF_COLORS.subtle,
      alignment: 'center',
      width: 170,
      margin: [8, 11, 8, 0],
    },
  ];

  if (qrCodeDataUrl) {
    columns.push({
      stack: [
        { image: qrCodeDataUrl, width: 56, height: 56, alignment: 'right' },
        { text: qrLabel || 'QR Code', fontSize: 6, alignment: 'right', margin: [0, 2, 0, 0], color: PDF_COLORS.accent },
      ],
      alignment: 'right',
      width: 66,
    });
  }

  return {
    stack: [
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: contentWidth, y2: 0, lineWidth: 0.6, lineColor: PDF_COLORS.divider }],
        margin: [margins[0], 0, margins[2], 5],
      },
      {
        columns,
        margin: [margins[0], 0, margins[2], 0],
      },
    ],
  };
};

export const getDefaultPDFStyles = (): Record<string, any> => ({
  // Cabeçalho
  instNome:     { fontSize: 14, bold: true, color: '#1565c0' },
  instEndereco: { fontSize: 8,  color: '#666666' },
  docTitle:     { fontSize: 13, bold: true },
  docSubtitle:  { fontSize: 10, color: '#444444' },
  // Conteúdo
  sectionTitle: { fontSize: 12, bold: true, margin: [0, 10, 0, 4] },
  tableHeader:  { bold: true, fillColor: PDF_COLORS.headerBg, color: PDF_COLORS.headerText, fontSize: 8.5 },
  tableCell:    { fontSize: 8.5, color: PDF_COLORS.dark },
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
  pageMargins,
}: PdfDocOptions): any => {
  const resolvedMargins = pageMargins || getDefaultPdfMargins(orientation);

  return {
  pageOrientation: orientation,
  pageMargins: resolvedMargins,
  content: [
    ...buildHeader(instituicao, title, subtitle, orientation, resolvedMargins),
    ...content,
  ],
  footer: customFooter || buildFooter(instituicao, showSignature, 0, orientation, resolvedMargins),
  styles: { ...getDefaultPDFStyles(), ...extraStyles },
  defaultStyle: { fontSize: 10, font: 'Roboto' },
  };
};

// ─── Helpers de tabela padrão ─────────────────────────────────────────────────

/** Cria um layout de tabela no estilo DataTable do sistema (cabeçalho cinza claro, bordas sutis) */
export interface PdfInfoPanelItem {
  label: string;
  value: string | number | null | undefined;
}

export const buildInfoPanel = (
  items: PdfInfoPanelItem[],
  aside?: any,
): any => {
  const infoStack = items.map((item) => ({
    text: [
      { text: `${item.label}: `, bold: true, color: PDF_COLORS.dark },
      { text: String(item.value ?? '-'), color: PDF_COLORS.accent },
    ],
    fontSize: 8.5,
    margin: [0, 0, 0, 4],
  }));

  return {
    table: {
      widths: aside ? ['*', 96] : ['*'],
      body: [
        aside
          ? [
              { stack: infoStack },
              { stack: Array.isArray(aside) ? aside : [aside], alignment: 'center' },
            ]
          : [{ stack: infoStack }],
      ],
    },
    layout: {
      hLineWidth: () => 0.8,
      vLineWidth: () => 0.8,
      hLineColor: () => PDF_COLORS.border,
      vLineColor: () => PDF_COLORS.border,
      paddingLeft: () => 10,
      paddingRight: () => 10,
      paddingTop: () => 8,
      paddingBottom: () => 6,
      fillColor: () => PDF_COLORS.mutedBg,
    },
    margin: [0, 0, 0, 12],
    unbreakable: true,
  };
};

export const buildPdfMetadataBand = (
  items: PdfInfoPanelItem[],
  aside?: any,
  options?: { asideWidth?: number },
): any => {
  const columns = items.map((item) => ({
    stack: [
      {
        text: String(item.label).toUpperCase(),
        fontSize: 6.8,
        bold: true,
        color: PDF_COLORS.subtle,
      },
      {
        text: String(item.value ?? '-'),
        fontSize: 8.5,
        bold: true,
        color: PDF_COLORS.dark,
        margin: [0, 2, 0, 0],
      },
    ],
  }));

  const body = aside
    ? [[...columns, { stack: Array.isArray(aside) ? aside : [aside], alignment: 'right' }]]
    : [columns];

  return {
    table: {
      widths: aside ? [...items.map(() => '*'), options?.asideWidth || 104] : items.map(() => '*'),
      body,
    },
    layout: {
      hLineWidth: () => 0.8,
      vLineWidth: () => 0.5,
      hLineColor: () => PDF_COLORS.border,
      vLineColor: () => PDF_COLORS.border,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 7,
      paddingBottom: () => 7,
      fillColor: () => PDF_COLORS.mutedBg,
    },
    margin: [0, 0, 0, 12],
    unbreakable: true,
  };
};

export const buildPdfSectionTitle = (title: string, marginTop = 6): any => ({
  columns: [
    {
      width: 3,
      canvas: [{ type: 'rect', x: 0, y: 0, w: 3, h: 14, color: PDF_COLORS.accent }],
    },
    {
      width: '*',
      text: title.toUpperCase(),
      fontSize: 8,
      bold: true,
      color: PDF_COLORS.accent,
      margin: [7, 1, 0, 0],
    },
  ],
  columnGap: 0,
  margin: [0, marginTop, 0, 8],
});

export const buildTable = (
  headers: string[], 
  rows: any[][], 
  widths?: (string | number)[],
  options?: { compact?: boolean }
): any => {
  const compact = options?.compact || false;
  const headerMargin = compact ? [5, 4, 5, 4] : [7, 6, 7, 6];
  const cellMargin = compact ? [5, 3, 5, 3] : [7, 5, 7, 5];

  return {
    table: {
      headerRows: 1,
      keepWithHeaderRows: 1,
      widths: widths || headers.map(() => '*'),
      body: [
        // Cabeçalho: fundo grey.100 (#F5F5F5), texto bold, sem cor de destaque
        headers.map(h => ({
          text: h,
          bold: true,
          fontSize: compact ? 7.8 : 8.5,
          color: PDF_COLORS.headerText,
          fillColor: PDF_COLORS.headerBg,
          margin: headerMargin,
        })),
        // Linhas de dados: fundo branco, sem alternância (igual ao DataTable)
        ...rows.map((row, rowIndex) =>
          row.map(cell => ({
            text: String(cell ?? ''),
            fontSize: compact ? 7.8 : 8.5,
            color: PDF_COLORS.dark,
            fillColor: rowIndex % 2 === 1 ? PDF_COLORS.stripe : '#FFFFFF',
            margin: cellMargin,
            lineHeight: 1.15,
          }))
        ),
      ],
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1.1 : 0.55),
      vLineWidth: () => 0.55,
      hLineColor: () => PDF_COLORS.border,
      vLineColor: () => PDF_COLORS.border,
      fillColor: () => null,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 2, 0, 10],
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
