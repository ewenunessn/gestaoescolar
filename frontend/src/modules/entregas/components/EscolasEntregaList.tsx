import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Chip,
  Popover,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Grid,
  Checkbox,
} from "@mui/material";
import QRCode from "qrcode";
import {
  School as SchoolIcon,
  LocalShipping as DeliveryIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  PictureAsPdf as PdfIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Route as RouteIcon,
  Assignment as GuiaIcon,
  CheckBox as CheckBoxIcon,
} from "@mui/icons-material";
import { ColumnDef } from "@tanstack/react-table";
import { EscolaEntrega, EstatisticasEntregas, Rota } from "../types";
import { entregaService } from "../services/entregaService";
import { guiaService } from "../../../services/guiaService";
import { buscarInstituicao, Instituicao } from "../../../services/instituicao";
import { formatarQuantidade } from "../../../utils/formatters";
import { DataTableAdvanced } from "../../../components/DataTableAdvanced";
import { initPdfMake, buildPdfDoc, buildTable } from "../../../utils/pdfUtils";
import api from "../../../services/api";

interface EscolasEntregaListProps {
  onEscolaSelect: (escola: EscolaEntrega) => void;
  filtros: {
    guiaId?: number;
    rotaId?: number;
    dataInicio?: string;
    dataFim?: string;
    somentePendentes?: boolean;
  };
  onFiltroChange: (filtros: {
    guiaId?: number;
    rotaId?: number;
    dataInicio?: string;
    dataFim?: string;
    somentePendentes?: boolean;
  }) => void;
}

export const EscolasEntregaList: React.FC<EscolasEntregaListProps> = ({ 
  onEscolaSelect, 
  filtros,
  onFiltroChange 
}) => {
  const [escolas, setEscolas] = useState<EscolaEntrega[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasEntregas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gerandoPdfId, setGerandoPdfId] = useState<number | null>(null);
  const [gerandoPdfMultiplo, setGerandoPdfMultiplo] = useState(false);
  const [escolasSelecionadas, setEscolasSelecionadas] = useState<Set<number>>(new Set());
  const [modoSelecao, setModoSelecao] = useState(false);
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
  
  // Estados para filtros
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [guias, setGuias] = useState<any[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);

  useEffect(() => {
    buscarInstituicao().then(setInstituicao).catch(() => {});
    carregarDadosIniciais();
    carregarDados();
  }, [filtros]);

  const carregarDadosIniciais = async () => {
    try {
      const [guiasResponse, rotasData] = await Promise.all([
        guiaService.listarGuias(),
        entregaService.listarRotas()
      ]);

      const guiasData = guiasResponse?.data || guiasResponse;
      const guiasAbertas = Array.isArray(guiasData) 
        ? guiasData.filter((g: any) => g.status === 'aberta')
        : [];
      setGuias(guiasAbertas);
      setRotas(rotasData);
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
    }
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [escolasData, estatisticasData] = await Promise.all([
        entregaService.listarEscolas(
          filtros.guiaId,
          filtros.rotaId,
          undefined,
          filtros.dataInicio,
          filtros.dataFim,
          filtros.somentePendentes
        ),
        entregaService.obterEstatisticas(
          filtros.guiaId,
          filtros.rotaId,
          undefined,
          filtros.dataInicio,
          filtros.dataFim,
          filtros.somentePendentes
        )
      ]);
      
      setEscolas(escolasData);
      setEstatisticas(estatisticasData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados das entregas');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (percentual: number) => {
    const valor = Number(percentual);
    if (Number.isNaN(valor)) return 'error';
    if (valor >= 100) return 'success';
    if (valor >= 50) return 'warning';
    return 'error';
  };

  const formatarData = (data?: string) => {
    if (!data) return '';
    const [ano, mes, dia] = data.split('T')[0].split('-');
    if (!ano || !mes || !dia) return data;
    return `${dia}/${mes}/${ano}`;
  };
  
  const gerarPdfEscola = async (escola: EscolaEntrega) => {
    try {
      setGerandoPdfId(escola.id);
      
      // Buscar itens da escola
      const itens = await entregaService.listarItensPorEscola(
        escola.id,
        filtros.guiaId,
        undefined,
        filtros.dataInicio,
        filtros.dataFim,
        filtros.somentePendentes
      );

      console.log('📦 Itens carregados para PDF:', itens.length, itens);

      if (itens.length === 0) {
        setError('Nenhum item encontrado para esta escola');
        setGerandoPdfId(null);
        return;
      }

      // Extrair modalidades do snapshot do primeiro item
      // (todos os itens da mesma guia/escola têm o mesmo snapshot)
      let modalidades = '';
      let nomeEscola = escola.nome;
      let enderecoEscola = escola.endereco || '';
      let totalAlunos = escola.total_alunos;
      
      const primeiroItem = itens[0];
      if (primeiroItem.escola_modalidades && Array.isArray(primeiroItem.escola_modalidades)) {
        modalidades = primeiroItem.escola_modalidades
          .map((m: any) => m.modalidade_nome)
          .join(', ');
      }
      
      // Fallback: buscar modalidades diretamente da escola se snapshot não tiver
      if (!modalidades) {
        try {
          const escolaResp = await api.get(`/escolas/${escola.id}`);
          modalidades = escolaResp.data?.modalidades || '';
        } catch (error) {
          console.error('Erro ao buscar modalidades da escola:', error);
          modalidades = 'Não informado';
        }
      }
      
      if (!modalidades) modalidades = 'Não informado';
      
      // Usar dados do snapshot se disponíveis
      if (primeiroItem.escola_nome) {
        nomeEscola = primeiroItem.escola_nome;
      }
      if (primeiroItem.escola_endereco) {
        enderecoEscola = primeiroItem.escola_endereco;
      }
      if (primeiroItem.escola_total_alunos) {
        totalAlunos = primeiroItem.escola_total_alunos;
      }
      
      console.log('📚 Dados da escola (snapshot):', {
        nome: nomeEscola,
        endereco: enderecoEscola,
        totalAlunos,
        modalidades
      });

      // Gerar QR Code com o código da guia
      const codigoGuia = primeiroItem.codigo_guia || `GUIA-${primeiroItem.ano}-${String(primeiroItem.mes).padStart(2, '0')}-${String(primeiroItem.guia_id).padStart(5, '0')}`;

      let qrCodeDataUrl = '';
      try {
        qrCodeDataUrl = await QRCode.toDataURL(codigoGuia, {
          width: 120,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        console.log('✅ QR Code gerado com sucesso, tamanho:', qrCodeDataUrl.length);
      } catch (err) {
        console.error('❌ Erro ao gerar QR Code:', err);
        // Fallback: criar um data URL de imagem 1x1 transparente
        qrCodeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      }

      console.log('🔖 Código da guia:', codigoGuia);

      // Determinar mês/ano a partir dos itens ou filtro
      const mesAno = (() => {
        const item = itens[0];
        if (item?.mes && item?.ano) {
          const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
          return `MÊS: ${meses[item.mes - 1]}  ${item.ano}`;
        }
        if (filtros.dataInicio) {
          const d = new Date(filtros.dataInicio + 'T12:00:00');
          const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
          return `MÊS: ${meses[d.getMonth()]}  ${d.getFullYear()}`;
        }
        return '';
      })();

      // Ordenar itens por nome
      const itensOrdenados = [...itens].sort((a, b) => a.produto_nome.localeCompare(b.produto_nome));

      // Limitar a 25 itens por página
      const ITENS_POR_PAGINA = 25;
      const totalPaginas = Math.ceil(itensOrdenados.length / ITENS_POR_PAGINA);

      // Gerar páginas
      const paginas = [];
      for (let pagina = 0; pagina < totalPaginas; pagina++) {
        const inicio = pagina * ITENS_POR_PAGINA;
        const fim = Math.min(inicio + ITENS_POR_PAGINA, itensOrdenados.length);
        const itensPagina = itensOrdenados.slice(inicio, fim);
        const linhasVazias = ITENS_POR_PAGINA - itensPagina.length;

        // Preparar dados da tabela para esta página
        const headers = ['ID', 'ITEM', 'UND.', 'QTDE', 'DATA', 'RECEBEDOR'];
        const rows = [
          ...itensPagina.map((item, idx) => {
            // Pegar a data e recebedor do histórico mais recente (se houver)
            let dataEntregaFormatada = '';
            let recebedor = '';
            
            if (item.historico_entregas && item.historico_entregas.length > 0) {
              const ultimaEntrega = item.historico_entregas[item.historico_entregas.length - 1];
              dataEntregaFormatada = formatarData(ultimaEntrega.data_entrega);
              recebedor = ultimaEntrega.nome_quem_recebeu || '';
            } else if (item.entrega_confirmada && item.data_entrega) {
              // Fallback para campos diretos se não houver histórico
              dataEntregaFormatada = formatarData(item.data_entrega);
              recebedor = item.nome_quem_recebeu || '';
            }

            return [
              String(inicio + idx + 1).padStart(2, '0'),
              item.produto_nome,
              item.unidade || item.produto_unidade || '',
              formatarQuantidade(item.quantidade),
              dataEntregaFormatada,
              recebedor,
            ];
          }),
          ...Array.from({ length: linhasVazias }, (_, i) => [
            String(inicio + itensPagina.length + i + 1).padStart(2, '0'),
            '',
            '',
            '',
            '',
            '',
          ]),
        ];
        const widths = ['auto', 180, 'auto', 'auto', 'auto', '*'];

        paginas.push({ headers, rows, widths, numero: pagina + 1 });
      }

      // Informações adicionais para o cabeçalho
      const rotaLabel = escola.rota_nome ? escola.rota_nome.toUpperCase() : (filtros.rotaId ? `ROTA ${filtros.rotaId}` : 'SEM ROTA');
      const numLabel = escola.ordem_rota && escola.ordem_rota !== 999
        ? `Nº ${escola.ordem_rota}`
        : (escola.rota_id ? `Nº ${escola.rota_id}` : '');
      
      const rotaCompleta = `${rotaLabel} ${numLabel}`;

      // Dividir informações em duas colunas
      const infoEsquerda = [
        { label: 'Escola:', valor: nomeEscola.toUpperCase() },
        ...(enderecoEscola ? [{ label: 'Endereço:', valor: enderecoEscola }] : []),
      ];

      const infoDireita = [
        ...(totalAlunos ? [{ label: 'Total de Alunos:', valor: String(totalAlunos) }] : []),
        { label: 'Modalidades:', valor: modalidades },
      ];

      // Contar itens entregues e pendentes
      const itensEntregues = itensOrdenados.filter(item => {
        if (item.historico_entregas && item.historico_entregas.length > 0) return true;
        if (item.entrega_confirmada) return true;
        return false;
      }).length;
      const itensPendentes = itensOrdenados.length - itensEntregues;

      // Gerar conteúdo para cada página
      const allContent: any[] = [];
      
      paginas.forEach((pag, idx) => {
        if (idx > 0) {
          allContent.push({ text: '', pageBreak: 'before' });
        }

        allContent.push(
          // Informações em duas colunas (escola, dados) - sem código de barras
          {
            columns: [
              {
                stack: infoEsquerda.map(info => ({
                  text: [
                    { text: info.label + ' ', fontSize: 9, bold: true },
                    { text: info.valor, fontSize: 9 }
                  ],
                  margin: [0, 0, 0, 3]
                })),
                width: '*',
              },
              {
                stack: infoDireita.map(info => ({
                  text: [
                    { text: info.label + ' ', fontSize: 9, bold: true },
                    { text: info.valor, fontSize: 9 }
                  ],
                  margin: [0, 0, 0, 3]
                })),
                width: '*',
              }
            ],
            columnGap: 15,
            margin: [0, 0, 0, 8],
          },
          buildTable(pag.headers, pag.rows, pag.widths, { compact: true }),
          // Assinatura do recebedor centralizada
          {
            stack: [
              { canvas: [{ type: 'line', x1: 100, y1: 0, x2: 415, y2: 0, lineWidth: 0.8, lineColor: '#333' }], margin: [0, 40, 0, 6] },
              { text: 'Assinatura do Recebedor', fontSize: 9, alignment: 'center' },
            ],
            margin: [0, 30, 0, 0],
          }
        );
      });

      const pdfMake = await initPdfMake();
      const doc = buildPdfDoc({
        instituicao,
        title: rotaCompleta,
        subtitle: mesAno,
        content: allContent,
        showSignature: false,
        customFooter: (currentPage: number, pageCount: number) => {
          const geradoEm = new Date().toLocaleDateString('pt-BR');
          return {
            stack: [
              {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.4, lineColor: '#9ca3af' }],
                margin: [40, 0, 40, 4],
              },
              {
                columns: [
                  {
                    stack: [
                      { text: instituicao?.nome || 'Sistema de Gestão de Alimentação Escolar', fontSize: 7, color: '#374151' },
                      ...(instituicao?.endereco ? [{ text: instituicao.endereco, fontSize: 6, color: '#374151', margin: [0, 1, 0, 0] }] : []),
                      { text: `Gerado em ${geradoEm} · Página ${currentPage} de ${pageCount}`, fontSize: 6, color: '#374151', margin: [0, 2, 0, 0] },
                    ],
                    alignment: 'left',
                    width: '*'
                  },
                  {
                    stack: [
                      { image: qrCodeDataUrl, width: 60, height: 60, alignment: 'right' },
                      { text: codigoGuia, fontSize: 6, alignment: 'right', margin: [0, 2, 0, 0], color: '#374151' },
                    ],
                    alignment: 'right',
                    width: 70
                  },
                ],
                margin: [40, 0, 40, 0],
              },
            ]
          };
        },
      });
      pdfMake.createPdf(doc).download(`guia-entrega-${nomeEscola}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setError(`Erro ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGerandoPdfId(null);
    }
  };

  // Gerar PDF de múltiplas escolas - cada escola com seu próprio cabeçalho e rodapé
  const gerarPdfMultiplasEscolas = async () => {
    if (escolasSelecionadas.size === 0) {
      setError('Selecione ao menos uma escola');
      return;
    }

    try {
      setGerandoPdfMultiplo(true);
      const escolasParaPdf = escolas.filter(e => escolasSelecionadas.has(e.id));
      
      console.log(`📦 Gerando PDF para ${escolasParaPdf.length} escolas`);
      
      const pdfMake = await initPdfMake();
      const todasEscolas: any[] = [];
      const paginasPorEscola: number[] = []; // Rastrear quantas páginas cada escola tem

      // Para cada escola, gerar EXATAMENTE como na individual
      for (let escolaIdx = 0; escolaIdx < escolasParaPdf.length; escolaIdx++) {
        const escola = escolasParaPdf[escolaIdx];
        
        console.log(`📋 Processando escola ${escolaIdx + 1}/${escolasParaPdf.length}: ${escola.nome}`);
        
        // Buscar itens da escola
        const itens = await entregaService.listarItensPorEscola(
          escola.id,
          filtros.guiaId,
          undefined,
          filtros.dataInicio,
          filtros.dataFim,
          filtros.somentePendentes
        );

        console.log(`  ✓ ${itens.length} itens encontrados`);

        if (itens.length === 0) continue;

        // CÓDIGO IDÊNTICO À FUNÇÃO INDIVIDUAL
        let modalidades = '';
        let nomeEscola = escola.nome;
        let enderecoEscola = escola.endereco || '';
        let totalAlunos = escola.total_alunos;
        
        const primeiroItem = itens[0];
        if (primeiroItem.escola_modalidades && Array.isArray(primeiroItem.escola_modalidades)) {
          modalidades = primeiroItem.escola_modalidades
            .map((m: any) => m.modalidade_nome)
            .join(', ');
        }
        
        if (!modalidades) {
          try {
            const escolaResp = await api.get(`/escolas/${escola.id}`);
            modalidades = escolaResp.data?.modalidades || '';
          } catch (error) {
            console.error('Erro ao buscar modalidades da escola:', error);
            modalidades = 'Não informado';
          }
        }
        
        if (!modalidades) modalidades = 'Não informado';
        
        if (primeiroItem.escola_nome) nomeEscola = primeiroItem.escola_nome;
        if (primeiroItem.escola_endereco) enderecoEscola = primeiroItem.escola_endereco;
        if (primeiroItem.escola_total_alunos) totalAlunos = primeiroItem.escola_total_alunos;

        // Gerar QR Code
        const codigoGuia = primeiroItem.codigo_guia || `GUIA-${primeiroItem.ano}-${String(primeiroItem.mes).padStart(2, '0')}-${String(primeiroItem.guia_id).padStart(5, '0')}`;
        const qrCodeDataUrl = await QRCode.toDataURL(codigoGuia, {
          width: 120,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });

        // Determinar mês/ano
        const mesAno = (() => {
          const item = itens[0];
          if (item?.mes && item?.ano) {
            const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
            return `MÊS: ${meses[item.mes - 1]}  ${item.ano}`;
          }
          if (filtros.dataInicio) {
            const d = new Date(filtros.dataInicio + 'T12:00:00');
            const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
            return `MÊS: ${meses[d.getMonth()]}  ${d.getFullYear()}`;
          }
          return '';
        })();

        // Ordenar itens
        const itensOrdenados = [...itens].sort((a, b) => a.produto_nome.localeCompare(b.produto_nome));
        const ITENS_POR_PAGINA = 25;
        const totalPaginas = Math.ceil(itensOrdenados.length / ITENS_POR_PAGINA);

        // Informações adicionais
        const rotaLabel = escola.rota_nome ? escola.rota_nome.toUpperCase() : (filtros.rotaId ? `ROTA ${filtros.rotaId}` : 'SEM ROTA');
        const numLabel = escola.ordem_rota && escola.ordem_rota !== 999
          ? `Nº ${escola.ordem_rota}`
          : (escola.rota_id ? `Nº ${escola.rota_id}` : '');
        
        const rotaCompleta = `${rotaLabel} ${numLabel}`;

        const infoEsquerda = [
          { label: 'Escola:', valor: nomeEscola.toUpperCase() },
          ...(enderecoEscola ? [{ label: 'Endereço:', valor: enderecoEscola }] : []),
        ];

        const infoDireita = [
          ...(totalAlunos ? [{ label: 'Total de Alunos:', valor: String(totalAlunos) }] : []),
          { label: 'Modalidades:', valor: modalidades },
        ];

        // Gerar páginas
        const paginas = [];
        for (let pagina = 0; pagina < totalPaginas; pagina++) {
          const inicio = pagina * ITENS_POR_PAGINA;
          const fim = Math.min(inicio + ITENS_POR_PAGINA, itensOrdenados.length);
          const itensPagina = itensOrdenados.slice(inicio, fim);
          const linhasVazias = ITENS_POR_PAGINA - itensPagina.length;

          const headers = ['ID', 'ITEM', 'UND.', 'QTDE', 'DATA', 'RECEBEDOR'];
          const rows = [
            ...itensPagina.map((item, idx) => {
              let dataEntregaFormatada = '';
              let recebedor = '';
              
              if (item.historico_entregas && item.historico_entregas.length > 0) {
                const ultimaEntrega = item.historico_entregas[item.historico_entregas.length - 1];
                dataEntregaFormatada = formatarData(ultimaEntrega.data_entrega);
                recebedor = ultimaEntrega.nome_quem_recebeu || '';
              } else if (item.entrega_confirmada && item.data_entrega) {
                dataEntregaFormatada = formatarData(item.data_entrega);
                recebedor = item.nome_quem_recebeu || '';
              }

              return [
                String(inicio + idx + 1).padStart(2, '0'),
                item.produto_nome,
                item.unidade || item.produto_unidade || '',
                formatarQuantidade(item.quantidade),
                dataEntregaFormatada,
                recebedor,
              ];
            }),
            ...Array.from({ length: linhasVazias }, (_, i) => [
              String(inicio + itensPagina.length + i + 1).padStart(2, '0'),
              '', '', '', '', '',
            ]),
          ];
          const widths = ['auto', 180, 'auto', 'auto', 'auto', '*'];

          paginas.push({ headers, rows, widths });
        }

        // Gerar conteúdo para cada página
        const allContent: any[] = [];
        
        paginas.forEach((pag, idx) => {
          if (idx > 0) {
            allContent.push({ text: '', pageBreak: 'before' });
          }

          // Adicionar cabeçalho IGUAL ao buildHeader (mas sem usar buildPdfDoc)
          const logoUrl = instituicao?.logo_url ? (instituicao.logo_url.startsWith('data:') ? instituicao.logo_url : 
            (instituicao.logo_url.startsWith('/') ? `${window.location.protocol}//${window.location.hostname}:3000${instituicao.logo_url}` : instituicao.logo_url)) : null;
          
          const logoCell: any = logoUrl
            ? {
                columns: [
                  { image: logoUrl, fit: [120, 48] },
                  {
                    canvas: [{
                      type: 'line',
                      x1: 0,
                      y1: 0,
                      x2: 0,
                      y2: 48,
                      lineWidth: 1.5,
                      lineColor: '#2d3748',
                    }],
                    width: 1.5,
                    margin: [8, 0, 0, 0],
                  },
                ],
                columnGap: 0,
              }
            : { text: '' };

          const instCell: any = {
            stack: [
              { text: instituicao?.nome || 'Sistema de Gestão', fontSize: 14, bold: true, color: '#1a202c' },
              ...(instituicao?.departamento
                ? [{ text: instituicao.departamento, fontSize: 10, color: '#4a5568', margin: [0, 1, 0, 0] }]
                : []),
            ],
            margin: [12, 0, 0, 0],
          };

          const rightCell: any = {
            stack: [
              { text: rotaCompleta, fontSize: 16, bold: true, color: '#2d3748', alignment: 'right' },
              ...(mesAno ? [{ text: mesAno, fontSize: 12, color: '#4a5568', alignment: 'right', margin: [0, 2, 0, 0] }] : []),
            ],
          };

          allContent.push(
            // Cabeçalho (IGUAL ao buildHeader)
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
                lineWidth: 1.5, lineColor: '#2d3748',
              }],
            },
            { text: '', margin: [0, 6, 0, 0] },
            // Informações em duas colunas
            {
              columns: [
                {
                  stack: infoEsquerda.map(info => ({
                    text: [
                      { text: info.label + ' ', fontSize: 9, bold: true },
                      { text: info.valor, fontSize: 9 }
                    ],
                    margin: [0, 0, 0, 3]
                  })),
                  width: '*',
                },
                {
                  stack: infoDireita.map(info => ({
                    text: [
                      { text: info.label + ' ', fontSize: 9, bold: true },
                      { text: info.valor, fontSize: 9 }
                    ],
                    margin: [0, 0, 0, 3]
                  })),
                  width: '*',
                }
              ],
              columnGap: 15,
              margin: [0, 0, 0, 8],
            },
            buildTable(pag.headers, pag.rows, pag.widths, { compact: true }),
            // Assinatura
            {
              stack: [
                { canvas: [{ type: 'line', x1: 100, y1: 0, x2: 415, y2: 0, lineWidth: 0.8, lineColor: '#333' }], margin: [0, 40, 0, 6] },
                { text: 'Assinatura do Recebedor', fontSize: 9, alignment: 'center' },
              ],
              margin: [0, 30, 0, 0],
            }
          );
        });

        // Guardar dados desta escola
        todasEscolas.push({
          content: allContent,
          qrCodeDataUrl,
          codigoGuia,
          numPaginas: totalPaginas,
        });
        
        paginasPorEscola.push(totalPaginas);
      }

      if (todasEscolas.length === 0) {
        console.log('❌ Nenhuma escola processada');
        setError('Nenhum item encontrado para as escolas selecionadas');
        setGerandoPdfMultiplo(false);
        return;
      }

      console.log(`✅ Total de escolas processadas: ${todasEscolas.length}`);

      // Concatenar conteúdo de todas as escolas
      const allContent: any[] = [];
      todasEscolas.forEach((escolaData, idx) => {
        if (idx > 0) {
          allContent.push({ text: '', pageBreak: 'before' });
        }
        allContent.push(...escolaData.content);
      });

      // Criar documento com rodapé dinâmico por escola
      const doc = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 60],
        content: allContent,
        footer: (currentPage: number, pageCount: number) => {
          const geradoEm = new Date().toLocaleDateString('pt-BR');
          
          // Descobrir qual escola corresponde à página atual
          let paginaAcumulada = 0;
          let escolaAtual = todasEscolas[0];
          
          for (let i = 0; i < paginasPorEscola.length; i++) {
            if (currentPage <= paginaAcumulada + paginasPorEscola[i]) {
              escolaAtual = todasEscolas[i];
              break;
            }
            paginaAcumulada += paginasPorEscola[i];
          }
          
          return {
            stack: [
              {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.4, lineColor: '#9ca3af' }],
                margin: [40, 0, 40, 4],
              },
              {
                columns: [
                  {
                    stack: [
                      { text: instituicao?.nome || 'Sistema de Gestão de Alimentação Escolar', fontSize: 7, color: '#374151' },
                      ...(instituicao?.endereco ? [{ text: instituicao.endereco, fontSize: 6, color: '#374151', margin: [0, 1, 0, 0] }] : []),
                      { text: `Gerado em ${geradoEm} · Página ${currentPage} de ${pageCount}`, fontSize: 6, color: '#374151', margin: [0, 2, 0, 0] },
                    ],
                    alignment: 'left',
                    width: '*'
                  },
                  {
                    stack: [
                      { image: escolaAtual.qrCodeDataUrl, width: 60, height: 60, alignment: 'right' },
                      { text: escolaAtual.codigoGuia, fontSize: 6, alignment: 'right', margin: [0, 2, 0, 0], color: '#374151' },
                    ],
                    alignment: 'right',
                    width: 70
                  },
                ],
                margin: [40, 0, 40, 0],
              },
            ]
          };
        },
      };

      console.log('🎯 Gerando PDF...');
      pdfMake.createPdf(doc).download(`guias-entrega-multiplas.pdf`);
      console.log('✅ PDF gerado com sucesso!');
      
      // Limpar seleção
      setEscolasSelecionadas(new Set());
      setModoSelecao(false);
    } catch (err) {
      console.error('❌ Erro ao gerar PDF múltiplo:', err);
      setError(`Erro ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGerandoPdfMultiplo(false);
    }
  };

  // Handlers de seleção
  const toggleSelecaoEscola = (escolaId: number) => {
    const novaSelecao = new Set(escolasSelecionadas);
    if (novaSelecao.has(escolaId)) {
      novaSelecao.delete(escolaId);
    } else {
      novaSelecao.add(escolaId);
    }
    setEscolasSelecionadas(novaSelecao);
  };

  const selecionarTodas = () => {
    setEscolasSelecionadas(new Set(escolas.map(e => e.id)));
  };

  const limparSelecao = () => {
    setEscolasSelecionadas(new Set());
  };

  // Definir colunas da tabela
  const columns: ColumnDef<EscolaEntrega>[] = [
    // Coluna de checkbox quando em modo seleção
    ...(modoSelecao ? [{
      id: 'selecao',
      header: () => (
        <Checkbox
          checked={escolasSelecionadas.size === escolas.length && escolas.length > 0}
          indeterminate={escolasSelecionadas.size > 0 && escolasSelecionadas.size < escolas.length}
          onChange={(e) => e.target.checked ? selecionarTodas() : limparSelecao()}
        />
      ),
      size: 50,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <Checkbox
          checked={escolasSelecionadas.has(row.original.id)}
          onChange={() => toggleSelecaoEscola(row.original.id)}
        />
      ),
    }] as ColumnDef<EscolaEntrega>[] : []),
    {
      accessorKey: 'nome',
      header: 'Escola',
      size: 300,
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {row.original.nome}
          </Typography>
          {row.original.endereco && (
            <Typography variant="caption" color="text.secondary">
              {row.original.endereco}
            </Typography>
          )}
          {row.original.rota_nome && (
            <Typography variant="caption" color="primary.main" display="block">
              📍 {row.original.rota_nome}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      accessorKey: 'total_itens',
      header: 'Total Itens',
      size: 100,
      meta: { align: 'center' },
    },
    {
      accessorKey: 'itens_entregues',
      header: 'Entregues',
      size: 100,
      meta: { align: 'center' },
      cell: ({ getValue }) => (
        <Chip
          label={getValue() as number}
          color="success"
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: 'itens_pendentes',
      header: 'Pendentes',
      size: 100,
      meta: { align: 'center' },
      accessorFn: (row) => row.total_itens - row.itens_entregues,
      cell: ({ getValue }) => (
        <Chip
          label={getValue() as number}
          color={(getValue() as number) > 0 ? 'warning' : 'success'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      accessorKey: 'percentual_entregue',
      header: 'Progresso',
      size: 150,
      meta: { align: 'center' },
      cell: ({ getValue }) => (
        <Box sx={{ width: '100%' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography variant="caption">
              {String(getValue())}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Number(getValue()) || 0}
            color={getStatusColor(getValue() as number)}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      ),
    },
    {
      accessorKey: 'data_entrega',
      header: 'Data Entrega',
      size: 120,
      meta: { align: 'center' },
      cell: ({ getValue }) => (
        getValue() ? formatarData(getValue() as string) : '-'
      ),
    },
    {
      id: 'acoes',
      header: 'Ações',
      size: 150,
      meta: { align: 'center' },
      enableSorting: false,
      cell: ({ row }) => (
        <Box display="flex" gap={1}>
          <Tooltip title="Ver itens para entrega">
            <IconButton
              size="small"
              color="primary"
              onClick={() => onEscolaSelect(row.original)}
            >
              <ViewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Gerar PDF da guia">
            <span>
              <IconButton
                size="small"
                color="secondary"
                onClick={() => gerarPdfEscola(row.original)}
                disabled={gerandoPdfId === row.original.id}
              >
                {gerandoPdfId === row.original.id ? (
                  <CircularProgress size={16} />
                ) : (
                  <PdfIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Handlers de filtro
  const handleFilterOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleGuiaChange = (guiaId: number | '') => {
    const novoGuiaId = guiaId === '' ? undefined : guiaId;
    onFiltroChange({ ...filtros, guiaId: novoGuiaId, rotaId: undefined });
  };

  const handleRotaChange = (rotaId: number | '') => {
    const novoRotaId = rotaId === '' ? undefined : rotaId;
    onFiltroChange({ ...filtros, rotaId: novoRotaId });
  };

  const limparFiltros = () => {
    const hoje = new Date().toISOString().split('T')[0];
    onFiltroChange({ somentePendentes: false, dataFim: hoje, dataInicio: undefined });
  };

  const temFiltroAtivo = Boolean(
    filtros.guiaId ||
    filtros.rotaId ||
    filtros.dataInicio ||
    filtros.dataFim ||
    filtros.somentePendentes
  );

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* DataTable com estatísticas e filtros no toolbar */}
      <DataTableAdvanced
        title="Escolas para Entrega"
        data={escolas}
        columns={columns}
        loading={loading}
        searchPlaceholder="Buscar por escola, endereço ou rota..."
        emptyMessage="Nenhuma escola com itens para entrega encontrada"
        onFilterClick={handleFilterOpen}
        toolbarActions={
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* Botões de ação */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!modoSelecao ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CheckBoxIcon />}
                  onClick={() => setModoSelecao(true)}
                >
                  Selecionar Múltiplas
                </Button>
              ) : (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={gerandoPdfMultiplo ? <CircularProgress size={16} /> : <PdfIcon />}
                    onClick={gerarPdfMultiplasEscolas}
                    disabled={gerandoPdfMultiplo || escolasSelecionadas.size === 0}
                    color="secondary"
                  >
                    {gerandoPdfMultiplo ? 'Gerando...' : `Gerar PDF (${escolasSelecionadas.size})`}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setModoSelecao(false);
                      setEscolasSelecionadas(new Set());
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </Box>

            {/* Estatísticas */}
            {estatisticas && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', ml: 2, pl: 2, borderLeft: '1px solid #e0e0e0' }}>
                {[
                  { label: 'Escolas', value: estatisticas.total_escolas, color: 'text.secondary' },
                  { label: 'Total Itens', value: estatisticas.total_itens, color: 'text.secondary' },
                  { label: 'Entregues', value: estatisticas.itens_entregues, color: 'success.main' },
                  { label: 'Pendentes', value: estatisticas.itens_pendentes, color: 'warning.main' },
                ].map(stat => (
                  <Box key={stat.label} sx={{ textAlign: 'center', minWidth: 60 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', display: 'block' }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: stat.color, fontSize: '0.9rem' }}>
                      {stat.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        }
      />

      {/* Popover de Filtros */}
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 3, minWidth: 400 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <FilterIcon color="primary" />
              <Typography variant="h6">Filtros</Typography>
            </Box>
            {temFiltroAtivo && (
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={limparFiltros}
                color="error"
                variant="outlined"
              >
                Limpar
              </Button>
            )}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Guia de Demanda</InputLabel>
                <Select
                  value={filtros.guiaId || ''}
                  onChange={(e) => handleGuiaChange(e.target.value as number | '')}
                  label="Guia de Demanda"
                >
                  <MenuItem value="">
                    <em>Todas as guias</em>
                  </MenuItem>
                  {guias.map((guia) => (
                    <MenuItem key={guia.id} value={guia.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <GuiaIcon fontSize="small" />
                        {guia.mes}/{guia.ano}
                        {guia.observacao && ` - ${guia.observacao}`}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Rota de Entrega</InputLabel>
                <Select
                  value={filtros.rotaId || ''}
                  onChange={(e) => handleRotaChange(e.target.value as number | '')}
                  label="Rota de Entrega"
                  disabled={rotas.length === 0}
                >
                  <MenuItem value="">
                    <em>Todas as rotas</em>
                  </MenuItem>
                  {rotas.map((rota) => (
                    <MenuItem key={rota.id} value={rota.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: rota.cor
                          }}
                        />
                        <RouteIcon fontSize="small" />
                        {rota.nome}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Data início"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={filtros.dataInicio || ''}
                onChange={(e) => onFiltroChange({ ...filtros, dataInicio: e.target.value || undefined })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Data fim"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={filtros.dataFim || ''}
                onChange={(e) => onFiltroChange({ ...filtros, dataFim: e.target.value || undefined })}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(filtros.somentePendentes)}
                    onChange={(e) => onFiltroChange({ ...filtros, somentePendentes: e.target.checked })}
                  />
                }
                label="Somente pendentes"
              />
            </Grid>

            {/* Chips de filtros ativos */}
            {temFiltroAtivo && (
              <Grid item xs={12}>
                <Box display="flex" flexWrap="wrap" gap={1} pt={1}>
                  {filtros.guiaId && guias.find(g => g.id === filtros.guiaId) && (
                    <Chip
                      label={`Guia: ${guias.find(g => g.id === filtros.guiaId)?.mes}/${guias.find(g => g.id === filtros.guiaId)?.ano}`}
                      color="primary"
                      size="small"
                      onDelete={() => handleGuiaChange('')}
                    />
                  )}
                  {filtros.rotaId && rotas.find(r => r.id === filtros.rotaId) && (
                    <Chip
                      label={`Rota: ${rotas.find(r => r.id === filtros.rotaId)?.nome}`}
                      size="small"
                      onDelete={() => handleRotaChange('')}
                      sx={{
                        backgroundColor: rotas.find(r => r.id === filtros.rotaId)?.cor,
                        color: 'white',
                        '& .MuiChip-deleteIcon': { color: 'white' }
                      }}
                    />
                  )}
                  {filtros.dataInicio && (
                    <Chip
                      label={`De: ${filtros.dataInicio.split('-').reverse().join('/')}`}
                      size="small"
                      onDelete={() => onFiltroChange({ ...filtros, dataInicio: undefined })}
                    />
                  )}
                  {filtros.dataFim && (
                    <Chip
                      label={`Até: ${filtros.dataFim.split('-').reverse().join('/')}`}
                      size="small"
                      onDelete={() => onFiltroChange({ ...filtros, dataFim: undefined })}
                    />
                  )}
                  {filtros.somentePendentes && (
                    <Chip
                      label="Pendentes"
                      color="warning"
                      size="small"
                      onDelete={() => onFiltroChange({ ...filtros, somentePendentes: false })}
                    />
                  )}
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      </Popover>
    </Box>
  );
};