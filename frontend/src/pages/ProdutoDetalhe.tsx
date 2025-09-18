import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Chip, FormControlLabel, Switch, Paper, Grid, Stack
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon,
  Cancel as CancelIcon, Inventory as InventoryIcon, Science as ScienceIcon, 
  Fingerprint as FingerprintIcon, Notes as NotesIcon,
} from '@mui/icons-material';
import {
  buscarProduto, editarProduto, deletarProduto,
  buscarComposicaoNutricional, salvarComposicaoNutricional,
} from '../services/produtos';

// --- Constantes ---
const composicaoVazia = {
  valor_energetico_kcal: "", carboidratos_g: "", acucares_totais_g: "", acucares_adicionados_g: "",
  proteinas_g: "", gorduras_totais_g: "", gorduras_saturadas_g: "", gorduras_trans_g: "",
  fibra_alimentar_g: "", sodio_mg: "",
};

// --- Subcomponentes de UI ---

const PageHeader = ({ produto, onBack, isEditing, onEdit, onSave, onCancel, onDelete, isSaving }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>{isEditing ? 'Editar Produto' : produto?.nome}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ textTransform: 'none', color: 'text.secondary', p: 0 }}>Voltar para Produtos</Button>
                {!isEditing && <Chip label={produto?.ativo ? 'Ativo' : 'Inativo'} color={produto?.ativo ? 'success' : 'error'} size="small" variant="outlined" />}
                {!isEditing && produto?.categoria && <Chip label={produto.categoria} color="primary" size="small" variant="outlined" />}
            </Stack>
        </Box>
        <Stack direction="row" spacing={1}>
            {isEditing ? (
                <>
                    <Button startIcon={<CancelIcon />} onClick={onCancel} variant="outlined" disabled={isSaving}>Cancelar</Button>
                    <Button startIcon={<SaveIcon />} onClick={onSave} variant="contained" color="success" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
                </>
            ) : (
                <>
                    <Button startIcon={<EditIcon />} onClick={onEdit} variant="outlined">Editar</Button>
                    <Button startIcon={<DeleteIcon />} onClick={onDelete} variant="contained" color="error">Excluir</Button>
                </>
            )}
        </Stack>
    </Box>
);

const SectionPaper = ({ title, icon, children }) => (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
            {icon}
            <Typography variant="h6" fontWeight={600}>{title}</Typography>
        </Stack>
        {children}
    </Paper>
);

const InfoItem = ({ label, value }) => (
    <Box><Typography variant="caption" color="text.secondary" display="block">{label}</Typography><Typography variant="body2" fontWeight={500}>{value || 'Não informado'}</Typography></Box>
);

const ComposicaoNutricionalCard = ({ composicaoData, onSave, isSaving }) => {
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState(composicaoData);
    useEffect(() => { setFormData(composicaoData); }, [composicaoData]);

    const handleSave = () => { onSave(formData); setEditMode(false); };
    const handleCancel = () => { setFormData(composicaoData); setEditMode(false); };

    const campos = [
        { key: 'valor_energetico_kcal', label: 'Valor Energético', unit: 'kcal' }, { key: 'carboidratos_g', label: 'Carboidratos', unit: 'g' },
        { key: 'acucares_totais_g', label: 'Açúcares Totais', unit: 'g' }, { key: 'acucares_adicionados_g', label: 'Açúcares Adicionados', unit: 'g' },
        { key: 'proteinas_g', label: 'Proteínas', unit: 'g' }, { key: 'gorduras_totais_g', label: 'Gorduras Totais', unit: 'g' },
        { key: 'gorduras_saturadas_g', label: 'Gorduras Saturadas', unit: 'g' }, { key: 'gorduras_trans_g', label: 'Gorduras Trans', unit: 'g' },
        { key: 'fibra_alimentar_g', label: 'Fibra Alimentar', unit: 'g' }, { key: 'sodio_mg', label: 'Sódio', unit: 'mg' },
    ];

    return (
        <SectionPaper title="Composição Nutricional" icon={<ScienceIcon color="primary"/>}>
            {editMode ? (
                <Grid container spacing={2}>
                    {campos.map(c => <Grid item xs={12} sm={6} key={c.key}><TextField label={`${c.label} (${c.unit})`} value={formData[c.key] || ''} onChange={e => setFormData({ ...formData, [c.key]: e.target.value })} type="number" fullWidth size="small" /></Grid>)}
                    <Grid item xs={12}><Stack direction="row" spacing={1} justifyContent="flex-end"><Button onClick={handleCancel}>Cancelar</Button><Button onClick={handleSave} variant="contained" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button></Stack></Grid>
                </Grid>
            ) : (
                <>
                    <Grid container spacing={2}>
                        {campos.map(c => <Grid item xs={12} sm={6} md={4} key={c.key}><InfoItem label={c.label} value={formData[c.key] ? `${formData[c.key]} ${c.unit}` : ''} /></Grid>)}
                    </Grid>
                    <Box sx={{ mt: 2, textAlign: 'right' }}><Button onClick={() => setEditMode(true)}>Editar Composição</Button></Box>
                </>
            )}
        </SectionPaper>
    );
};

// --- Componente Principal ---
export default function ProdutoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [produto, setProduto] = useState<any>(null);
  const [composicao, setComposicao] = useState<any>(composicaoVazia);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingComp, setIsSavingComp] = useState(false);
  const [openExcluir, setOpenExcluir] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const prod = await buscarProduto(Number(id));
      setProduto(prod); setForm(prod);
      try {
        const comp = await buscarComposicaoNutricional(Number(id));
        setComposicao({ ...composicaoVazia, ...comp });
      } catch (error) {
        // Tratar erro 500 como "sem dados" - tabela pode não existir
        console.warn('Composição nutricional não encontrada:', error);
        setComposicao(composicaoVazia);
      }
    } catch { setError("Produto não encontrado"); } 
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const dataToSend = { ...form,
        fator_divisao: form.fator_divisao === "" ? null : Number(form.fator_divisao),
        peso: form.peso === "" ? null : Number(form.peso),
        validade_minima: form.validade_minima === "" ? null : Number(form.validade_minima),
        estoque_minimo: form.estoque_minimo === "" ? 10 : Number(form.estoque_minimo),
      };
      const atualizado = await editarProduto(Number(id), dataToSend);
      setProduto(atualizado); setIsEditing(false);
      setSuccessMessage('Produto atualizado com sucesso!');
    } catch { setError("Erro ao salvar alterações"); } 
    finally { setIsSaving(false); setTimeout(() => setSuccessMessage(null), 3000); }
  }, [id, form]);

  const handleSaveComposition = useCallback(async (compData) => {
    setIsSavingComp(true);
    try {
      const dataToSend = { ...Object.fromEntries(Object.entries(compData).map(([k, v]) => [k, v === "" ? null : Number(v)])) };
      await salvarComposicaoNutricional(Number(id), dataToSend);
      setSuccessMessage('Composição nutricional salva!');
    } catch (error) {
      console.error('Erro ao salvar composição nutricional:', error);
      setError("Erro ao salvar composição. Tabela pode não estar criada no banco.");
    } 
    finally { setIsSavingComp(false); setTimeout(() => setSuccessMessage(null), 3000); }
  }, [id]);

  const handleDelete = useCallback(async () => {
    try {
      await deletarProduto(Number(id));
      navigate("/produtos", { state: { successMessage: 'Produto excluído com sucesso!' } });
    } catch { setError("Erro ao excluir produto"); }
  }, [id, navigate]);
  
  const handleCancel = useCallback(() => { setIsEditing(false); setForm(produto); }, [produto]);

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: 'center', minHeight: '80vh' }}><CircularProgress size={60} /></Box>;
  if (error && !produto) return <Box sx={{ maxWidth: '1280px', mx: 'auto', p: 4 }}><Card><CardContent sx={{ textAlign: 'center', p: 4 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadData}>Tentar Novamente</Button></CardContent></Card></Box>;
  if (!produto) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {successMessage && <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 2 }}>{successMessage}</Alert>}
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

        <PageHeader produto={produto} onBack={() => navigate('/produtos')} isEditing={isEditing} onEdit={() => setIsEditing(true)} onSave={handleSave} onCancel={handleCancel} onDelete={() => setOpenExcluir(true)} isSaving={isSaving} />
        
        <Stack spacing={4}>
            {/* Seção de Identificação */}
            <SectionPaper title="Identificação do Produto" icon={<FingerprintIcon color="primary"/>}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        {isEditing ? <TextField label="Nome do Produto" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} fullWidth required /> : null}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        {isEditing ? <TextField label="Categoria" value={form.categoria || ""} onChange={e => setForm({ ...form, categoria: e.target.value })} fullWidth /> : <InfoItem label="Marca" value={produto.marca}/>}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        {isEditing ? <TextField label="Marca" value={form.marca || ""} onChange={e => setForm({ ...form, marca: e.target.value })} fullWidth /> : <InfoItem label="Tipo de Processamento" value={produto.tipo_processamento}/>}
                    </Grid>
                    <Grid item xs={12}>
                        {isEditing ? <TextField label="Tipo de Processamento" value={form.tipo_processamento || ""} onChange={e => setForm({ ...form, tipo_processamento: e.target.value })} fullWidth /> : null}
                    </Grid>
                    <Grid item xs={12}>
                        {isEditing && <FormControlLabel control={<Switch checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })}/>} label="Produto Ativo" />}
                    </Grid>
                </Grid>
            </SectionPaper>

            {/* Seção de Detalhes Físicos e Logísticos */}
            <SectionPaper title="Detalhes Físicos e Logísticos" icon={<InventoryIcon color="primary"/>}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        {isEditing ? <TextField label="Unidade" value={form.unidade || ""} onChange={e => setForm({ ...form, unidade: e.target.value })} fullWidth /> : <InfoItem label="Unidade" value={produto.unidade}/>}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        {isEditing ? <TextField label="Peso (gramas)" value={form.peso ?? ""} onChange={e => setForm({ ...form, peso: e.target.value })} type="number" fullWidth /> : <InfoItem label="Peso" value={produto.peso ? `${Math.round(produto.peso)}g` : ''}/>}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        {isEditing ? <TextField label="Fator de Divisão" value={form.fator_divisao ?? ""} onChange={e => setForm({ ...form, fator_divisao: e.target.value })} type="number" fullWidth /> : <InfoItem label="Fator de Divisão" value={produto.fator_divisao}/>}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        {isEditing ? <TextField label="Estoque Mínimo" value={form.estoque_minimo ?? ""} onChange={e => setForm({ ...form, estoque_minimo: e.target.value })} type="number" fullWidth /> : <InfoItem label="Estoque Mínimo" value={produto.estoque_minimo}/>}
                    </Grid>
                </Grid>
            </SectionPaper>

            {/* Seção de Descrição */}
            <SectionPaper title="Descrição" icon={<NotesIcon color="primary"/>}>
                {isEditing ? 
                    <TextField label="Descrição do Produto" value={form.descricao || ""} onChange={e => setForm({ ...form, descricao: e.target.value })} fullWidth multiline rows={4} />
                    :
                    <Typography variant="body2" color="text.secondary">{produto.descricao || 'Nenhuma descrição fornecida.'}</Typography>
                }
            </SectionPaper>

            <ComposicaoNutricionalCard composicaoData={composicao} onSave={handleSaveComposition} isSaving={isSavingComp} />
        </Stack>

        <Dialog open={openExcluir} onClose={() => setOpenExcluir(false)}>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogContent><Typography>Tem certeza que deseja excluir o produto "{produto.nome}"? Esta ação é irreversível.</Typography></DialogContent>
            <DialogActions><Button onClick={() => setOpenExcluir(false)}>Cancelar</Button><Button onClick={handleDelete} variant="contained" color="error">Excluir</Button></DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}