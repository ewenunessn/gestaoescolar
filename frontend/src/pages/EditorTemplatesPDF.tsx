import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Typography, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Chip,
} from '@mui/material';
import { Save as SaveIcon, Refresh as ResetIcon } from '@mui/icons-material';
import { Designer } from '@pdfme/ui';
import { BLANK_PDF } from '@pdfme/common';
import { text, image, line, rectangle, ellipse, table, barcodes } from '@pdfme/schemas';
import { useToast } from '../hooks/useToast';
import { buscarInstituicao, salvarTemplatePDF } from '../services/instituicao';
import { usePageTitle } from '../contexts/PageTitleContext';
import PageContainer from '../components/PageContainer';

// Templates disponíveis no sistema
const TEMPLATES_DISPONIVEIS = [
  { id: 'guia_entrega',   label: 'Guia de Entrega',       descricao: 'Cabeçalho da guia de entrega por escola' },
  { id: 'comprovante',    label: 'Comprovante de Entrega', descricao: 'Comprovante de entrega assinado' },
  { id: 'romaneio',       label: 'Romaneio',               descricao: 'Romaneio de entrega por rota' },
  { id: 'cabecalho_padrao', label: 'Cabeçalho Padrão',    descricao: 'Cabeçalho padrão para todos os documentos' },
];

// Variáveis dinâmicas disponíveis por template
const VARIAVEIS: Record<string, string[]> = {
  guia_entrega:    ['escola_nome', 'escola_endereco', 'rota_nome', 'rota_numero', 'total_alunos', 'mes_ano', 'inst_nome', 'inst_departamento', 'inst_logo'],
  comprovante:     ['escola_nome', 'numero_comprovante', 'data_entrega', 'entregador', 'recebedor', 'inst_nome', 'inst_logo'],
  romaneio:        ['rota_nome', 'data_inicio', 'data_fim', 'inst_nome', 'inst_logo'],
  cabecalho_padrao:['inst_nome', 'inst_departamento', 'inst_logo', 'inst_secretario', 'inst_cargo'],
};

// Template base padrão para novos templates
const templateBase = (nome: string) => ({
  basePdf: BLANK_PDF,
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
      content: `{inst_nome}`,
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
      content: `{inst_departamento}`,
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

const plugins = { text, image, line, rectangle, ellipse, table, ...barcodes };

export default function EditorTemplatesPDF() {
  const { setPageTitle, setBackPath } = usePageTitle();
  const toast = useToast();
  const designerRef = useRef<HTMLDivElement>(null);
  const designerInstance = useRef<Designer | null>(null);

  const [templateSelecionado, setTemplateSelecionado] = useState('cabecalho_padrao');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [instituicao, setInstituicao] = useState<any>(null);

  useEffect(() => {
    setPageTitle('Editor de Templates PDF');
    setBackPath('/configuracao-instituicao');
    return () => setBackPath(null);
  }, []);

  useEffect(() => {
    buscarInstituicao().then(inst => {
      setInstituicao(inst);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !designerRef.current) return;
    inicializarDesigner();
    return () => {
      designerInstance.current?.destroy();
      designerInstance.current = null;
    };
  }, [loading, templateSelecionado]);

  const inicializarDesigner = () => {
    if (!designerRef.current) return;
    designerInstance.current?.destroy();

    const templateSalvo = instituicao?.pdf_templates?.[templateSelecionado];
    const template = templateSalvo || templateBase(templateSelecionado);

    designerInstance.current = new Designer({
      domContainer: designerRef.current,
      template,
      plugins,
      options: {
        font: {
          Helvetica: { data: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2', fallback: true },
        },
      },
    });
  };

  const handleSalvar = async () => {
    if (!designerInstance.current) return;
    setSaving(true);
    try {
      const template = designerInstance.current.getTemplate();
      await salvarTemplatePDF(templateSelecionado, template);
      // Atualizar cache local
      setInstituicao((prev: any) => ({
        ...prev,
        pdf_templates: { ...(prev?.pdf_templates || {}), [templateSelecionado]: template },
      }));
      toast.success('Template salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const handleResetar = () => {
    if (!designerInstance.current) return;
    designerInstance.current.updateTemplate(templateBase(templateSelecionado));
  };

  const templateInfo = TEMPLATES_DISPONIVEIS.find(t => t.id === templateSelecionado);
  const variaveis = VARIAVEIS[templateSelecionado] || [];
  const templatSalvo = !!instituicao?.pdf_templates?.[templateSelecionado];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
      {/* Toolbar */}
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'white', borderBottom: '1px solid #e9ecef', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Template</InputLabel>
          <Select
            value={templateSelecionado}
            label="Template"
            onChange={e => setTemplateSelecionado(e.target.value)}
          >
            {TEMPLATES_DISPONIVEIS.map(t => (
              <MenuItem key={t.id} value={t.id}>
                <Box>
                  <Typography variant="body2">{t.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{t.descricao}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {templatSalvo && <Chip label="Salvo" color="success" size="small" />}

        <Box sx={{ flex: 1 }} />

        {/* Variáveis disponíveis */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Variáveis:</Typography>
          {variaveis.map(v => (
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
        Arraste elementos da barra lateral, redimensione e posicione livremente. Use as variáveis acima para inserir dados dinâmicos — clique numa variável para copiar.
      </Alert>

      {/* Designer */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', mt: 1 }}>
        <div ref={designerRef} style={{ width: '100%', height: '100%' }} />
      </Box>
    </Box>
  );
}
