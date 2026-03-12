import { Instituicao } from '../services/instituicao';

interface PDFHeaderOptions {
  instituicao: Instituicao | null;
  title: string;
  subtitle?: string;
  subtitle2?: string;
  logoSize?: { width: number; height: number };
}

export const createPDFHeader = (options: PDFHeaderOptions) => {
  const { instituicao, title, subtitle, subtitle2, logoSize = { width: 50, height: 50 } } = options;
  
  const headerContent: any[] = [];
  
  if (instituicao?.logo_url) {
    headerContent.push({
      columns: [
        {
          image: processImageUrl(instituicao.logo_url),
          width: logoSize.width,
          height: logoSize.height
        },
        {
          stack: [
            { text: instituicao.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
            { text: title, style: 'subheader', alignment: 'center' },
            ...(subtitle ? [{ text: subtitle, style: 'subheader2', alignment: 'center' }] : []),
            ...(subtitle2 ? [{ text: subtitle2, style: 'subheader3', alignment: 'center' }] : [])
          ],
          width: '*'
        },
        { text: '', width: logoSize.width } // Espaço para balancear
      ]
    });
  } else {
    headerContent.push({
      stack: [
        { text: instituicao?.nome || 'Secretaria Municipal de Educação', style: 'header', alignment: 'center' },
        { text: title, style: 'subheader', alignment: 'center' },
        ...(subtitle ? [{ text: subtitle, style: 'subheader2', alignment: 'center' }] : []),
        ...(subtitle2 ? [{ text: subtitle2, style: 'subheader3', alignment: 'center' }] : [])
      ]
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
        alignment: 'center',
        fontSize: 7,
        color: '#999999',
        margin: [0, 10, 0, 0]
      }
    ];
    
    if (showSignature && instituicao?.secretario_nome && currentPage === pageCount) {
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
};

export const getDefaultPDFStyles = () => ({
  header: { fontSize: 16, bold: true },
  subheader: { fontSize: 14, bold: true, margin: [0, 3, 0, 0] },
  subheader2: { fontSize: 12, margin: [0, 3, 0, 0] },
  subheader3: { fontSize: 10, margin: [0, 3, 0, 0] },
  tableHeader: { bold: true, fillColor: '#428bca', color: 'white', fontSize: 9 },
  sectionHeader: { fontSize: 12, bold: true }
});

// Função para obter a URL base da API
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    
    // Para outros ambientes, usar HTTPS
    return 'https://gestaoescolar-backend.vercel.app';
  }
  return 'http://localhost:3000';
};

// Função para processar URL de imagem de forma segura
const processImageUrl = (logoUrl: string): string => {
  if (!logoUrl) return '';
  
  // Se for base64, retornar diretamente
  if (logoUrl.startsWith('data:')) {
    return logoUrl;
  }
  
  // Se for URL relativa, construir URL completa
  if (logoUrl.startsWith('/')) {
    return `${getApiBaseUrl()}${logoUrl}`;
  }
  
  // Se for URL completa, garantir que seja HTTPS em produção
  if (logoUrl.startsWith('http://') && !logoUrl.includes('localhost')) {
    return logoUrl.replace('http://', 'https://');
  }
  
  return logoUrl;
};