import React, { useEffect, useRef, useState } from "react";
import {
  Box, Button, Typography, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Chip,
} from "@mui/material";
import { Save as SaveIcon, Refresh as ResetIcon } from "@mui/icons-material";
import { useToast } from "../../../hooks/useToast";
import { buscarInstituicao, salvarTemplatePDF } from "../../../services/instituicao";
import { usePageTitle } from "../../../contexts/PageTitleContext";

type PdfDesignerTemplate = {
  basePdf: unknown;
  schemas: Array<Array<Record<string, unknown>>>;
};

type PdfDesignerPluginMap = Record<string, unknown>;

type PdfDesignerInstance = {
  destroy: () => void;
  getTemplate: () => PdfDesignerTemplate;
  updateTemplate: (template: PdfDesignerTemplate) => void;
};

type PdfDesignerConstructor = new (config: {
  domContainer: HTMLDivElement;
  template: PdfDesignerTemplate;
  plugins: PdfDesignerPluginMap;
  options?: {
    font?: Record<string, { data: string; fallback?: boolean }>;
  };
}) => PdfDesignerInstance;

type PdfDesignerAssets = {
  Designer: PdfDesignerConstructor;
  blankPdf: unknown;
  plugins: PdfDesignerPluginMap;
};

let pdfDesignerAssetsPromise: Promise<PdfDesignerAssets> | null = null;

const carregarAssetsPdfDesigner = async (): Promise<PdfDesignerAssets> => {
  if (!pdfDesignerAssetsPromise) {
    pdfDesignerAssetsPromise = Promise.all([
      import("@pdfme/ui"),
      import("@pdfme/common"),
      import("@pdfme/schemas"),
    ]).then(([uiModule, commonModule, schemasModule]) => {
      const plugins = {
        text: schemasModule.text,
        image: schemasModule.image,
        line: schemasModule.line,
        rectangle: schemasModule.rectangle,
        ellipse: schemasModule.ellipse,
        table: schemasModule.table,
        ...schemasModule.barcodes,
      };

      return {
        Designer: uiModule.Designer as PdfDesignerConstructor,
        blankPdf: commonModule.BLANK_PDF,
        plugins,
      };
    });
  }

  return pdfDesignerAssetsPromise;
};

const TEMPLATES_DISPONIVEIS = [
  { id: 'guia_entrega', label: 'Guia de Entrega', descricao: 'Cabecalho da guia de entrega por escola' },
  { id: 'comprovante', label: 'Comprovante de Entrega', descricao: 'Comprovante de entrega assinado' },
  { id: 'romaneio', label: 'Romaneio', descricao: 'Romaneio de entrega por rota' },
  { id: 'cabecalho_padrao', label: 'Cabecalho Padrao', descricao: 'Cabecalho padrao para todos os documentos' },
];

const VARIAVEIS: Record<string, string[]> = {
  guia_entrega: ['escola_nome', 'escola_endereco', 'rota_nome', 'rota_numero', 'total_alunos', 'mes_ano', 'inst_nome', 'inst_departamento', 'inst_logo'],
  comprovante: ['escola_nome', 'numero_comprovante', 'data_entrega', 'entregador', 'recebedor', 'inst_nome', 'inst_logo'],
  romaneio: ['rota_nome', 'data_inicio', 'data_fim', 'inst_nome', 'inst_logo'],
  cabecalho_padrao: ['inst_nome', 'inst_departamento', 'inst_logo', 'inst_secretario', 'inst_cargo'],
};

const criarTemplateBase = (nome: string, blankPdf: unknown): PdfDesignerTemplate => ({
  basePdf: blankPdf,
  schemas: [[
    {
      name: 'inst_nome',
      type: 'text',
      position: { x: 60, y: 10 },
      width: 130,
      height: 10,
      fontSize: 12,
      fontColor: '#1a202c',
      fontName: 'Helvetica',
      alignment: 'left',
      content: '{inst_nome}',
    },
    {
      name: 'inst_departamento',
      type: 'text',
      position: { x: 60, y: 22 },
      width: 130,
      height: 8,
      fontSize: 9,
      fontColor: '#4a5568',
      fontName: 'Helvetica',
      alignment: 'left',
      content: '{inst_departamento}',
    },
    {
      name: 'titulo',
      type: 'text',
      position: { x: 10, y: 38 },
      width: 190,
      height: 8,
      fontSize: 11,
      fontColor: '#1a202c',
      fontName: 'Helvetica',
      alignment: 'center',
      content: nome.replace(/_/g, ' ').toUpperCase(),
    },
    {
      name: 'linha_divisoria',
      type: 'line',
      position: { x: 10, y: 48 },
      width: 190,
      height: 0.5,
      color: '#2d3748',
    },
  ]],
});

export default function EditorTemplatesPDF() {
  const { setPageTitle, setBackPath } = usePageTitle();
  const toast = useToast();
  const designerRef = useRef<HTMLDivElement>(null);
  const designerInstance = useRef<PdfDesignerInstance | null>(null);

  const [templateSelecionado, setTemplateSelecionado] = useState('cabecalho_padrao');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [designerLoading, setDesignerLoading] = useState(true);
  const [instituicao, setInstituicao] = useState<any>(null);
  const [pdfAssets, setPdfAssets] = useState<PdfDesignerAssets | null>(null);

  useEffect(() => {
    setPageTitle('Editor de Templates PDF');
    setBackPath('/configuracao-instituicao');
    return () => setBackPath(null);
  }, [setBackPath, setPageTitle]);

  useEffect(() => {
    let ativo = true;

    buscarInstituicao()
      .then((inst) => {
        if (!ativo) return;
        setInstituicao(inst);
        setLoading(false);
      })
      .catch(() => {
        if (!ativo) return;
        setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    carregarAssetsPdfDesigner()
      .then((assets) => {
        if (!ativo) return;
        setPdfAssets(assets);
        setDesignerLoading(false);
      })
      .catch(() => {
        if (!ativo) return;
        setDesignerLoading(false);
        toast.error('Erro ao carregar editor de PDF');
      });

    return () => {
      ativo = false;
    };
  }, [toast]);

  useEffect(() => {
    if (loading || designerLoading || !designerRef.current || !pdfAssets) return;

    const templateSalvo = instituicao?.pdf_templates?.[templateSelecionado];
    const template = templateSalvo || criarTemplateBase(templateSelecionado, pdfAssets.blankPdf);

    designerInstance.current?.destroy();
    designerInstance.current = new pdfAssets.Designer({
      domContainer: designerRef.current,
      template,
      plugins: pdfAssets.plugins,
      options: {
        font: {
          Helvetica: { data: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2', fallback: true },
        },
      },
    });

    return () => {
      designerInstance.current?.destroy();
      designerInstance.current = null;
    };
  }, [designerLoading, instituicao, loading, pdfAssets, templateSelecionado]);

  const handleSalvar = async () => {
    if (!designerInstance.current) return;
    setSaving(true);

    try {
      const template = designerInstance.current.getTemplate();
      await salvarTemplatePDF(templateSelecionado, template);
      setInstituicao((prev: any) => ({
        ...prev,
        pdf_templates: { ...(prev?.pdf_templates || {}), [templateSelecionado]: template },
      }));
      toast.success('Template salvo com sucesso!');
    } catch {
      toast.error("Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  const handleResetar = () => {
    if (!designerInstance.current || !pdfAssets) return;
    designerInstance.current.updateTemplate(criarTemplateBase(templateSelecionado, pdfAssets.blankPdf));
  };

  const variaveis = VARIAVEIS[templateSelecionado] || [];
  const templateSalvo = !!instituicao?.pdf_templates?.[templateSelecionado];

  if (loading || designerLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'white', borderBottom: '1px solid #e9ecef', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Template</InputLabel>
          <Select
            value={templateSelecionado}
            label="Template"
            onChange={(e) => setTemplateSelecionado(e.target.value)}
          >
            {TEMPLATES_DISPONIVEIS.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                <Box>
                  <Typography variant="body2">{t.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{t.descricao}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {templateSalvo && <Chip label="Salvo" color="success" size="small" />}

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Variaveis:</Typography>
          {variaveis.map((v) => (
            <Chip
              key={v}
              label={`{${v}}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: 10, cursor: 'copy' }}
              onClick={() => navigator.clipboard?.writeText(`{${v}}`)}
            />
          ))}
        </Box>

        <Button size="small" startIcon={<ResetIcon />} onClick={handleResetar} color="warning">
          Resetar
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSalvar}
          disabled={saving}
        >
          Salvar Template
        </Button>
      </Box>

      <Alert severity="info" sx={{ mx: 2, mt: 1, py: 0.5 }}>
        Arraste elementos da barra lateral, redimensione e posicione livremente. Use as variaveis acima para inserir dados dinamicos. Clique numa variavel para copiar.
      </Alert>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', mt: 1 }}>
        <div ref={designerRef} style={{ width: '100%', height: '100%' }} />
      </Box>
    </Box>
  );
}
