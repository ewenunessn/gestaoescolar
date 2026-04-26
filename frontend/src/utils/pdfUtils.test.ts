import { describe, expect, it, vi, afterEach } from 'vitest';
import { configurePdfMakeFonts, savePdfDocument, savePdfMakeDocument } from './pdfUtils';

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
});
