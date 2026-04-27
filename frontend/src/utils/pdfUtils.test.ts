import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  buildInfoPanel,
  buildPdfDoc,
  buildTable,
  configurePdfMakeFonts,
  getPdfPageMetrics,
  savePdfDocument,
  savePdfMakeDocument,
} from './pdfUtils';

describe('savePdfDocument', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'desktopShell', {
      value: undefined,
      configurable: true,
    });
  });

  it('uses the native desktop save dialog for generated PDFs', async () => {
    const saveGeneratedFile = vi.fn().mockResolvedValue({
      canceled: false,
      fileName: 'cardapio.pdf',
      filePath: 'C:\\Users\\Ewerton\\Desktop\\cardapio.pdf',
    });

    Object.defineProperty(window, 'desktopShell', {
      value: {
        isDesktop: true,
        saveGeneratedFile,
      },
      configurable: true,
    });

    const pdfDocument = {
      getBase64: vi.fn((callback: (data: string) => void) => callback('cGRmLWRhdGE=')),
      download: vi.fn(),
    };

    const result = await savePdfDocument(pdfDocument, 'cardapio.pdf');

    expect(saveGeneratedFile).toHaveBeenCalledWith({
      fileName: 'cardapio.pdf',
      mimeType: 'application/pdf',
      data: 'cGRmLWRhdGE=',
      encoding: 'base64',
    });
    expect(pdfDocument.download).not.toHaveBeenCalled();
    expect(result).toEqual({
      canceled: false,
      fileName: 'cardapio.pdf',
      filePath: 'C:\\Users\\Ewerton\\Desktop\\cardapio.pdf',
    });
  });

  it('saves pdfmake documents through the native desktop save dialog', async () => {
    const saveGeneratedFile = vi.fn().mockResolvedValue({
      canceled: false,
      fileName: 'relatorio.pdf',
      filePath: 'C:\\Users\\Ewerton\\Desktop\\relatorio.pdf',
    });

    Object.defineProperty(window, 'desktopShell', {
      value: {
        isDesktop: true,
        saveGeneratedFile,
      },
      configurable: true,
    });

    const pdfDocument = {
      getBase64: vi.fn((callback: (data: string) => void) => callback('cGRmLWRhdGE=')),
      download: vi.fn(),
    };
    const pdfMake = {
      createPdf: vi.fn(() => pdfDocument),
    };
    const docDefinition = { content: ['relatorio'] };

    const result = await savePdfMakeDocument(pdfMake, docDefinition, 'relatorio.pdf');

    expect(pdfMake.createPdf).toHaveBeenCalledWith(docDefinition);
    expect(saveGeneratedFile).toHaveBeenCalledWith({
      fileName: 'relatorio.pdf',
      mimeType: 'application/pdf',
      data: 'cGRmLWRhdGE=',
      encoding: 'base64',
    });
    expect(pdfDocument.download).not.toHaveBeenCalled();
    expect(result.filePath).toBe('C:\\Users\\Ewerton\\Desktop\\relatorio.pdf');
  });

  it('registers Roboto fonts in pdfmake virtual file system', () => {
    const addVirtualFileSystem = vi.fn();
    const pdfMake = {
      addVirtualFileSystem,
      fonts: {},
    };

    configurePdfMakeFonts(pdfMake, {
      'Roboto-Regular.ttf': 'regular-data',
      'Roboto-Medium.ttf': 'medium-data',
      'Roboto-Italic.ttf': 'italic-data',
      'Roboto-MediumItalic.ttf': 'medium-italic-data',
    });

    expect(addVirtualFileSystem).toHaveBeenCalledWith({
      'Roboto-Regular.ttf': 'regular-data',
      'Roboto-Medium.ttf': 'medium-data',
      'Roboto-Italic.ttf': 'italic-data',
      'Roboto-MediumItalic.ttf': 'medium-italic-data',
    });
    expect(pdfMake.fonts).toEqual({
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf',
      },
    });
  });

  it('builds document chrome using the real content width from margins', () => {
    const margins: [number, number, number, number] = [30, 30, 30, 50];
    const doc = buildPdfDoc({
      instituicao: null,
      title: 'Romaneio de Entrega',
      subtitle: '01/04/2026 a 27/04/2026',
      content: [],
      pageMargins: margins,
    });

    const metrics = getPdfPageMetrics('portrait', margins);
    const divider = doc.content[1].canvas[0];

    expect(doc.pageMargins).toEqual(margins);
    expect(divider.x2).toBeCloseTo(metrics.contentWidth, 2);
  });

  it('uses the same measured width in the default landscape footer', () => {
    const margins: [number, number, number, number] = [24, 28, 24, 52];
    const doc = buildPdfDoc({
      instituicao: null,
      title: 'Relatorio',
      content: [],
      orientation: 'landscape',
      pageMargins: margins,
    });

    const footer = doc.footer(1, 3);
    const metrics = getPdfPageMetrics('landscape', margins);

    expect(footer.stack[0].canvas[0].x2).toBeCloseTo(metrics.contentWidth, 2);
    expect(footer.stack[0].margin).toEqual([24, 0, 24, 5]);
  });

  it('builds professional info panels and tables with stable layout metadata', () => {
    const panel = buildInfoPanel([
      { label: 'Periodo', value: '01/04/2026 a 27/04/2026' },
      { label: 'Itens', value: 3 },
    ]);
    const table = buildTable(['Produto', 'Qtde'], [['Banana', '312']], ['*', 60], { compact: true });

    expect(panel.table.widths).toEqual(['*']);
    expect(panel.unbreakable).toBe(true);
    expect(table.table.headerRows).toBe(1);
    expect(table.table.keepWithHeaderRows).toBe(1);
    expect(table.table.body[0][0].fillColor).toBe('#1f2937');
  });
});
