import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import PageContainer from "../../../components/PageContainer";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import {
  Box, Typography, Button, Card, CardContent, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Chip, FormControlLabel, Switch, Paper, Grid, Stack, Autocomplete,
  FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip,
} from "@mui/material";
import {
  Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon,
  Cancel as CancelIcon, Inventory as InventoryIcon, Science as ScienceIcon,
  Fingerprint as FingerprintIcon, Notes as NotesIcon,
  AutoAwesome as AutoAwesomeIcon, ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import BuscarTacoDialog from "../../../components/BuscarTacoDialog";
import { mapearTacoParaComposicao, TacoAlimento } from "../../../services/taco";
import {
  produtoService, deletarProduto,
  buscarComposicaoNutricional, salvarComposicaoNutricional,
} from "../../../services/produtos";
import { useAtualizarProduto } from "../../../hooks/queries/useProdutoQueries";
import { useToast } from "../../../hooks/useToast";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";
import { toNum, formatarQuantidade } from "../../../utils/formatters";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import UnidadeMedidaSelect from "../../../components/UnidadeMedidaSelect";
import { useUnidadesMedida } from "../../../hooks/queries/useUnidadesMedidaQueries";

// --- Constantes ---

// Simple field wrapper components
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mb: 0.5, display: 'block' }}>{label}</Typography>
    {children}
  </Box>
);

const ValueText = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{children}</Typography>
);

const composicaoVazia = {
  produto_id: 0,
  calorias: "",
  proteinas: "",
  gorduras: "",
  carboidratos: "",
  fibras: "",
  calcio: "",
  ferro: "",
  vitamina_a: "",
  vitamina_c: "",
  sodio: "",
  gorduras_saturadas_g: "",
  gorduras_trans_g: "",
  colesterol: "",
  acucares: "",
};

// --- Subcomponentes de UI ---

const SectionPaper = ({ title, icon, children, actions }) => (
    <Paper sx={{ p: 1.5, borderRadius: "8px", boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
                {icon}
                <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: '0.95rem' }}>{title}</Typography>
            </Stack>
            {actions}
        </Box>
        <Box sx={{ flex: 1 }}>
            {children}
        </Box>
    </Paper>
);

const EditableField = ({ 
  label, 
  value, 
  field, 
  editingField, 
  formValue,
  onEdit, 
  onSave, 
  onCancel, 
  onChange,
  isSaving,
  type = 'text',
  options = null,
  helperText = null,
  multiline = false,
  rows = 1,
  autocompleteOptions = null,
}) => {
  const isEditing = editingField === field;
  
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem', lineHeight: 1.2, mb: 0.5 }}>
        {label}
      </Typography>
      {isEditing ? (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
          {options ? (
            <FormControl fullWidth size="small">
              <Select 
                value={formValue || ''} 
                onChange={(e) => onChange(field, e.target.value)}
                sx={{ fontSize: '0.8125rem' }}
              >
                {options.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : autocompleteOptions ? (
            <Autocomplete
              freeSolo
              fullWidth
              size="small"
              options={autocompleteOptions}
              value={formValue || ''}
              onChange={(event, newValue) => onChange(field, newValue || '')}
              onInputChange={(event, newInputValue) => onChange(field, newInputValue)}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  size="small"
                  sx={{ fontSize: '0.8125rem' }}
                />
              )}
            />
          ) : (
            <TextField 
              value={formValue || ''} 
              onChange={(e) => onChange(field, e.target.value)}
              type={type}
              size="small"
              fullWidth
              multiline={multiline}
              rows={rows}
              helperText={helperText}
              sx={{ 
                '& .MuiInputBase-input': { 
                  fontSize: '0.8125rem'
                }
              }}
              autoFocus
            />
          )}
          <IconButton 
            size="small" 
            onClick={() => onSave(field)}
            disabled={isSaving}
            sx={{ p: 0.5, mt: multiline ? 0 : 0.5 }}
          >
            <SaveIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => onCancel(field)}
            sx={{ p: 0.5, mt: multiline ? 0 : 0.5 }}
          >
            <CancelIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem', flex: 1 }}>
            {value || 'Não informado'}
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => onEdit(field)}
            sx={{ p: 0.5, opacity: 0.6, '&:hover': { opacity: 1 } }}
          >
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

const ComposicaoNutricionalCard = ({ composicaoData, onSave, isSaving, onCarregarTaco }) => {
    const [editingField, setEditingField] = useState<string | null>(null);
    const [formData, setFormData] = useState(composicaoData);
    useEffect(() => { setFormData(composicaoData); }, [composicaoData]);

    const handleSave = (key: string) => { 
        onSave(formData); 
        setEditingField(null);
    };
    const handleCancel = () => { 
        setFormData(composicaoData); 
        setEditingField(null); 
    };

    const campos = [
        { key: 'calorias', label: 'Energia', unit: 'kcal' },
        { key: 'proteinas', label: 'Proteínas', unit: 'g' },
        { key: 'gorduras', label: 'Lipídios', unit: 'g' },
        { key: 'carboidratos', label: 'Carboidratos', unit: 'g' },
        { key: 'fibras', label: 'Fibra Alimentar', unit: 'g' },
        { key: 'calcio', label: 'Cálcio', unit: 'mg' },
        { key: 'ferro', label: 'Ferro', unit: 'mg' },
        { key: 'vitamina_a', label: 'Retinol (Vit. A)', unit: 'mcg' },
        { key: 'vitamina_c', label: 'Vitamina C', unit: 'mg' },
        { key: 'sodio', label: 'Sódio', unit: 'mg' },
        { key: 'colesterol', label: 'Colesterol', unit: 'mg' },
        { key: 'gorduras_saturadas_g', label: 'Gord. Saturadas', unit: 'g' },
    ];

    return (
        <SectionPaper 
            title="Composição Nutricional" 
            icon={<ScienceIcon color="primary" fontSize="small" />}
        >
            {/* Botão discreto para carregar da TACO */}
            <Box sx={{ mb: 1 }}>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                    onClick={onCarregarTaco}
                    sx={{
                        fontSize: '0.7rem',
                        py: 0.25,
                        px: 1,
                        borderColor: 'divider',
                        color: 'text.secondary',
                        '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                    }}
                >
                    Carregar da TACO
                </Button>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {campos.map(c => (
                    <Box key={c.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', flex: 1 }}>
                            {c.label}
                        </Typography>
                        {editingField === c.key ? (
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                                <TextField 
                                    value={formData[c.key] || ''} 
                                    onChange={e => setFormData({ ...formData, [c.key]: e.target.value })} 
                                    type="number" 
                                    size="small"
                                    sx={{ 
                                        width: 80,
                                        '& .MuiInputBase-input': { 
                                            py: 0.5, 
                                            px: 1, 
                                            fontSize: '0.75rem',
                                            textAlign: 'right'
                                        }
                                    }}
                                    autoFocus
                                />
                                <Typography variant="caption" sx={{ fontSize: '0.7rem', minWidth: 30 }}>
                                    {c.unit}
                                </Typography>
                                <IconButton 
                                    size="small" 
                                    onClick={() => handleSave(c.key)}
                                    disabled={isSaving}
                                    sx={{ p: 0.25 }}
                                >
                                    <SaveIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    onClick={handleCancel}
                                    sx={{ p: 0.25 }}
                                >
                                    <CancelIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'flex-end' }}>
                                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem', minWidth: 50, textAlign: 'right' }}>
                                    {formData[c.key] || '-'}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.7rem', minWidth: 30, color: 'text.secondary' }}>
                                    {formData[c.key] ? c.unit : ''}
                                </Typography>
                                <IconButton 
                                    size="small" 
                                    onClick={() => setEditingField(c.key)}
                                    sx={{ p: 0.25, opacity: 0.6, '&:hover': { opacity: 1 } }}
                                >
                                    <EditIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                ))}
            </Box>
        </SectionPaper>
    );
};

// --- Componente Principal ---
export default function ProdutoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = usePageTitle();
  const toast = useToast();

  const [produto, setProduto] = useState<any>(null);
  const [composicao, setComposicao] = useState<any>(composicaoVazia);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingComp, setIsSavingComp] = useState(false);
  const [openExcluir, setOpenExcluir] = useState(false);
  const queryClient = useQueryClient();
  const atualizarProdutoMutation = useAtualizarProduto();

  // Estado do dialog TACO
  const [tacoDialogOpen, setTacoDialogOpen] = useState(false);

  // Atualizar título da página
  useEffect(() => {
    if (produto) {
      setPageTitle(produto.nome);
    }
    return () => setPageTitle('');
  }, [produto, setPageTitle]);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const prod = await produtoService.buscarPorId(Number(id));
      setProduto(prod); 
      // Garantir que o formulário seja inicializado com todos os dados do produto
      setForm({
        nome: prod.nome || '',
        descricao: prod.descricao || '',
        categoria: prod.categoria || '',
        tipo_processamento: prod.tipo_processamento || '',
        validade_minima: prod.validade_minima || '',
        imagem_url: prod.imagem_url || '',
        perecivel: prod.perecivel || false,
        ativo: prod.ativo !== undefined ? prod.ativo : true,
        estoque_minimo: prod.estoque_minimo || 0,
        fator_correcao: prod.fator_correcao || 1.0,
        indice_coccao: prod.indice_coccao || 1.0,
        unidade_distribuicao: prod.unidade_distribuicao || '',
        peso: prod.peso || '',
      });
      try {
        const comp = await buscarComposicaoNutricional(Number(id));
        if (comp) setComposicao({ ...composicaoVazia, ...comp });
      } catch (error) {
        console.warn('Composição nutricional não encontrada:', error);
        setComposicao(composicaoVazia);
      }
    } catch { 
      toast.error("Produto não encontrado"); 
    } 
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = useCallback(async () => {
    if (!form.nome?.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSend: any = {
        nome: form.nome.trim(),
        descricao: form.descricao || '',
        categoria: form.categoria || '',
        tipo_processamento: form.tipo_processamento || '',
        validade_minima: form.validade_minima ? Number(form.validade_minima) : null,
        imagem_url: form.imagem_url || '',
        perecivel: form.perecivel || false,
        ativo: form.ativo !== undefined ? form.ativo : true,
        estoque_minimo: form.estoque_minimo ? Number(form.estoque_minimo) : 0,
        fator_correcao: form.fator_correcao ? Number(form.fator_correcao) : 1.0,
        indice_coccao: form.indice_coccao ? Number(form.indice_coccao) : 1.0,
        unidade_distribuicao: form.unidade_distribuicao || '',
        unidade_medida_id: form.unidade_medida_id || null,
        peso: form.peso ? Number(form.peso) : null,
      };

      const atualizado = await atualizarProdutoMutation.mutateAsync({ id: Number(id), data: dataToSend });
      setProduto(atualizado);
      setIsEditing(false);
      toast.success('Produto atualizado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  }, [id, form, atualizarProdutoMutation, toast]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    // Restaurar form com dados do produto
    setForm({
      nome: produto.nome || '',
      descricao: produto.descricao || '',
      categoria: produto.categoria || '',
      tipo_processamento: produto.tipo_processamento || '',
      validade_minima: produto.validade_minima || '',
      imagem_url: produto.imagem_url || '',
      perecivel: produto.perecivel || false,
      ativo: produto.ativo !== undefined ? produto.ativo : true,
      estoque_minimo: produto.estoque_minimo || 0,
      fator_correcao: produto.fator_correcao || 1.0,
      indice_coccao: produto.indice_coccao || 1.0,
      unidade_distribuicao: produto.unidade_distribuicao || '',
      peso: produto.peso || '',
    });
  }, [produto]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setForm({
      nome: produto.nome || '',
      descricao: produto.descricao || '',
      categoria: produto.categoria || '',
      tipo_processamento: produto.tipo_processamento || '',
      validade_minima: produto.validade_minima || '',
      imagem_url: produto.imagem_url || '',
      perecivel: produto.perecivel || false,
      ativo: produto.ativo !== undefined ? produto.ativo : true,
      estoque_minimo: produto.estoque_minimo || 0,
      fator_correcao: produto.fator_correcao || 1.0,
      indice_coccao: produto.indice_coccao || 1.0,
      unidade_distribuicao: produto.unidade_distribuicao || '',
      peso: produto.peso || '',
    });
  }, [produto]);

  const handleSaveComposition = useCallback(async (compData, nomeAlimento?: string) => {
    setIsSavingComp(true);
    try {
      const dataToSend = { ...Object.fromEntries(Object.entries(compData).map(([k, v]) => [k, v === "" ? null : Number(v)])) };
      const resultado = await salvarComposicaoNutricional(Number(id), dataToSend);
      setComposicao({ ...composicaoVazia, ...resultado });
      toast.success(nomeAlimento ? `Composição carregada da TACO: ${nomeAlimento}` : 'Composição nutricional salva!');
    } catch (error) {
      console.error('Erro ao salvar Composição nutricional:', error);
      toast.error("Erro ao salvar Composição nutricional.");
    } finally {
      setIsSavingComp(false);
    }
  }, [id]);

  const handleTacoSelect = useCallback(async (composicaoTaco: any, nomeAlimento: string, alimento: TacoAlimento) => {
    // Salvar composição nutricional
    await handleSaveComposition(composicaoTaco, nomeAlimento);
    
    // Atualizar e salvar categoria automaticamente
    if (alimento.categoria && alimento.categoria !== produto.categoria) {
      setForm((prev: any) => ({
        ...prev,
        categoria: alimento.categoria,
      }));
      
      try {
        const dataToSend: any = {
          nome: produto.nome,
          descricao: produto.descricao,
          categoria: alimento.categoria,
          tipo_processamento: produto.tipo_processamento,
          validade_minima: produto.validade_minima,
          imagem_url: produto.imagem_url,
          perecivel: produto.perecivel,
          ativo: produto.ativo,
          estoque_minimo: produto.estoque_minimo,
          fator_correcao: produto.fator_correcao,
          indice_coccao: produto.indice_coccao,
          unidade_distribuicao: produto.unidade_distribuicao,
          peso: produto.peso,
        };
        
        const atualizado = await atualizarProdutoMutation.mutateAsync({ id: Number(id), data: dataToSend });
        setProduto(atualizado);
        toast.success(`Categoria atualizada: ${alimento.categoria}`);
      } catch (err: any) {
        console.error('Erro ao salvar categoria:', err);
        toast.error('Erro ao salvar categoria automaticamente');
      }
    }
  }, [handleSaveComposition, produto, id, atualizarProdutoMutation, toast]);

  const handleDelete = useCallback(async () => {
    try {
      await deletarProduto(Number(id));
      navigate("/produtos", { state: { successMessage: 'Produto excluído com sucesso!' } });
    } catch { 
      toast.error("Erro ao excluir produto"); 
    }
  }, [id, navigate]);

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: 'center', minHeight: '80vh' }}><CircularProgress size={60} /></Box>;
  if (!produto) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PageContainer>
        {/* Seta + Breadcrumbs + Botões de ação */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton size="small" onClick={() => navigate('/produtos')} sx={{ mr: 0.5, p: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <PageBreadcrumbs
              items={[
                { label: 'Produtos', path: '/produtos', icon: <InventoryIcon fontSize="small" /> },
                { label: produto?.nome || 'Detalhes do Produto' }
              ]}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isEditing ? (
              <>
                <Button variant="outlined" startIcon={<EditIcon />} onClick={handleStartEdit} size="small">
                  Editar
                </Button>
                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setOpenExcluir(true)} size="small">
                  Excluir
                </Button>
              </>
            ) : (
              <>
                <Button variant="outlined" onClick={handleCancel} size="small">
                  Cancelar
                </Button>
                <Button variant="contained" onClick={handleSave} disabled={isSaving || !form.nome?.trim()} startIcon={isSaving ? <CircularProgress size={16} /> : null} size="small">
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            )}
          </Box>
        </Box>
        
        {/* Título do produto */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.5px' }}>
            {produto.nome}
          </Typography>
          <Chip label={produto.categoria || 'Sem categoria'} size="small" variant="outlined" sx={{ borderRadius: '4px' }} />
          <Chip label={produto.ativo ? 'Ativo' : 'Inativo'} size="small" color={produto.ativo ? 'success' : 'default'} variant="outlined" sx={{ borderRadius: '4px' }} />
        </Box>
        
        <Grid container spacing={2}>
          {/* Primeira linha - Identificação e Composição lado a lado */}
          <Grid item xs={12} md={6}>
            {/* Seção de Identificação */}
            <SectionPaper
              title="Identificação do Produto"
              icon={<FingerprintIcon color="primary" fontSize="small" />}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Nome */}
                <Field label="Nome">
                  {isEditing ? (
                    <TextField fullWidth size="small" value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} required error={!form.nome?.trim()} helperText={!form.nome?.trim() ? 'Obrigatório' : ''} />
                  ) : <ValueText>{produto.nome}</ValueText>}
                </Field>

                {/* Unidade de Distribuição */}
                <Field label="Unidade de Distribuição">
                  {isEditing ? (
                    <UnidadeMedidaSelect value={form.unidade_medida_id || produto.unidade_medida_id} onChange={uid => setForm({ ...form, unidade_medida_id: uid })} size="small" label="" />
                  ) : <ValueText>{produto.unidade_distribuicao || 'Não informado'}</ValueText>}
                </Field>

                {/* Categoria */}
                <Field label="Categoria">
                  {isEditing ? (
                    <TextField fullWidth size="small" value={form.categoria || ''} onChange={e => setForm({ ...form, categoria: e.target.value })} helperText="Pode ser preenchida ao carregar da TACO" />
                  ) : <ValueText>{produto.categoria || '-'}</ValueText>}
                </Field>

                {/* Tipo de Processamento */}
                <Field label="Tipo de Processamento">
                  {isEditing ? (
                    <FormControl fullWidth size="small">
                      <Select value={form.tipo_processamento || ''} onChange={e => setForm({ ...form, tipo_processamento: e.target.value })}>
                        <MenuItem value="">Nenhum</MenuItem>
                        <MenuItem value="in natura">In Natura</MenuItem>
                        <MenuItem value="minimamente processado">Minimamente Processado</MenuItem>
                        <MenuItem value="ingrediente culinário">Ingrediente Culinário</MenuItem>
                        <MenuItem value="processado">Processado</MenuItem>
                        <MenuItem value="ultraprocessado">Ultraprocessado</MenuItem>
                      </Select>
                    </FormControl>
                  ) : <ValueText>{produto.tipo_processamento || '-'}</ValueText>}
                </Field>

                {/* Estoque Mínimo */}
                <Field label="Estoque Mínimo">
                  {isEditing ? (
                    <TextField fullWidth size="small" type="number" value={form.estoque_minimo || 0} onChange={e => setForm({ ...form, estoque_minimo: Number(e.target.value) })} inputProps={{ min: 0 }} />
                  ) : <ValueText>{produto.estoque_minimo || '0'}</ValueText>}
                </Field>

                {/* Validade Mínima */}
                <Field label="Validade Mínima (dias)">
                  {isEditing ? (
                    <TextField fullWidth size="small" type="number" value={form.validade_minima || ''} onChange={e => setForm({ ...form, validade_minima: e.target.value ? Number(e.target.value) : '' })} inputProps={{ min: 0 }} helperText="Dias mínimos de validade" />
                  ) : <ValueText>{produto.validade_minima ? `${produto.validade_minima} dias` : '-'}</ValueText>}
                </Field>

                {/* Peso */}
                <Field label="Peso (gramas)">
                  {isEditing ? (
                    <TextField fullWidth size="small" type="number" value={form.peso || ''} onChange={e => setForm({ ...form, peso: e.target.value ? Number(e.target.value) : '' })} helperText="Peso da embalagem em gramas" />
                  ) : <ValueText>{produto.peso ? `${produto.peso}g` : '-'}</ValueText>}
                </Field>

                {/* Fator de Correção */}
                <Field label="Fator de Correção">
                  {isEditing ? (
                    <TextField fullWidth size="small" type="number" value={form.fator_correcao || 1} onChange={e => setForm({ ...form, fator_correcao: Number(e.target.value) })} inputProps={{ step: 0.01, min: 1 }} helperText="Perda no pré-preparo. Sempre ≥ 1.0" />
                  ) : <ValueText>{produto.fator_correcao ? formatarQuantidade(produto.fator_correcao) : '1'}</ValueText>}
                </Field>

                {/* Índice de Cocção */}
                <Field label="Índice de Cocção">
                  {isEditing ? (
                    <TextField fullWidth size="small" type="number" value={form.indice_coccao || 1} onChange={e => setForm({ ...form, indice_coccao: Number(e.target.value) })} inputProps={{ step: 0.01, min: 0 }} helperText=">1 ganha peso, <1 perde" />
                  ) : <ValueText>{produto.indice_coccao ? formatarQuantidade(produto.indice_coccao) : '1'}</ValueText>}
                </Field>

                {/* Status */}
                <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Status</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.perecivel || false}
                          onChange={e => setForm({ ...form, perecivel: e.target.checked })}
                          size="small"
                          disabled={!isEditing}
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>Perecível</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.ativo !== undefined ? form.ativo : true}
                          onChange={e => setForm({ ...form, ativo: e.target.checked })}
                          size="small"
                          disabled={!isEditing}
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>Ativo</Typography>}
                    />
                  </Box>
                </Box>
              </Box>
            </SectionPaper>
          </Grid>

          {/* Composição Nutricional - mesma altura */}
          <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <ComposicaoNutricionalCard
                composicaoData={composicao}
                onSave={handleSaveComposition}
                isSaving={isSavingComp}
                onCarregarTaco={() => setTacoDialogOpen(true)}
              />
            </Box>
          </Grid>

          {/* Descrição */}
          <Grid item xs={12}>
            <SectionPaper title="Descrição" icon={<NotesIcon color="primary" fontSize="small" />}>
              {isEditing ? (
                <TextField fullWidth multiline rows={3} value={form.descricao || ''} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição detalhada do produto" />
              ) : (
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{produto.descricao || 'Nenhuma descrição fornecida.'}</Typography>
              )}
            </SectionPaper>
          </Grid>
        </Grid>
      </PageContainer>

      {/* Dialog TACO - Composição nutricional E categoria */}
      <BuscarTacoDialog
        open={tacoDialogOpen}
        onClose={() => setTacoDialogOpen(false)}
        onSelect={(composicaoTaco, nomeAlimento, alimento) => {
          handleTacoSelect(composicaoTaco, nomeAlimento, alimento);
        }}
        initialQuery={form.nome || produto?.nome}
      />

      {/* Modal fora do PageContainer */}
      <Dialog open={openExcluir} onClose={() => setOpenExcluir(false)}>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogContent><Typography>Tem certeza que deseja excluir o produto "{produto.nome}"? Esta ação é irreversível.</Typography></DialogContent>
            <DialogActions><Button onClick={() => setOpenExcluir(false)}>Cancelar</Button><Button onClick={handleDelete} variant="contained" color="delete">Excluir</Button></DialogActions>
        </Dialog>

      <LoadingOverlay 
        open={isSaving || isSavingComp || atualizarProdutoMutation.isPending}
        message={
          isSaving ? 'Salvando produto...' :
          isSavingComp ? 'Salvando Composição nutricional...' :
          atualizarProdutoMutation.isPending ? 'Atualizando produto...' :
          'Processando...'
        }
      />
    </Box>
  );
}


