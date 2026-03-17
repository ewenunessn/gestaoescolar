import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import PageContainer from '../components/PageContainer';
import { usePageTitle } from '../contexts/PageTitleContext';
import {
  Box, Typography, Button, Card, CardContent, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Chip, FormControlLabel, Switch, Paper, Grid, Stack, Autocomplete,
  FormControl, InputLabel, Select, MenuItem, IconButton, Menu
} from '@mui/material';
import {
  Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon,
  Cancel as CancelIcon, Inventory as InventoryIcon, Science as ScienceIcon, 
  Fingerprint as FingerprintIcon, Notes as NotesIcon, MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import {
  buscarProduto, deletarProduto,
  buscarComposicaoNutricional, salvarComposicaoNutricional,
} from '../services/produtos';
import { useAtualizarProduto } from '../hooks/queries/useProdutoQueries';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import { toNum } from '../utils/formatters';
import { LoadingOverlay } from '../components/LoadingOverlay';

// --- Constantes ---
const composicaoVazia = {
  produto_id: 0,
  proteinas: "",
  gorduras: "",
  carboidratos: "",
  calcio: "",
  ferro: "",
  vitamina_a: "",
  vitamina_c: "",
  sodio: ""
};

// --- Subcomponentes de UI ---

const SectionPaper = ({ title, icon, children, actions }) => (
    <Paper sx={{ p: 1.5, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
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

const InfoItem = ({ label, value }) => (
    <Box sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>{label}</Typography>
        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>{value || 'Não informado'}</Typography>
    </Box>
);

const ComposicaoNutricionalCard = ({ composicaoData, onSave, isSaving }) => {
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
        { key: 'proteinas', label: 'Proteínas', unit: 'g' },
        { key: 'gorduras', label: 'Lipídios', unit: 'g' },
        { key: 'carboidratos', label: 'Carboidratos', unit: 'g' },
        { key: 'calcio', label: 'Cálcio', unit: 'mg' },
        { key: 'ferro', label: 'Ferro', unit: 'mg' },
        { key: 'vitamina_a', label: 'Retinol (Vit. A)', unit: 'mcg' },
        { key: 'vitamina_c', label: 'Vitamina C', unit: 'mg' },
        { key: 'sodio', label: 'Sódio', unit: 'mg' }
    ];

    return (
        <SectionPaper 
            title="Composição Nutricional" 
            icon={<ScienceIcon color="primary" fontSize="small" />}
        >
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
  const queryClient = useQueryClient();
  const atualizarProdutoMutation = useAtualizarProduto();
  
  // Estado do menu de ações
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  // Atualizar título da página
  useEffect(() => {
    if (produto) {
      setPageTitle(produto.nome);
    }
    return () => setPageTitle('');
  }, [produto, setPageTitle]);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const prod = await buscarProduto(Number(id));
      setProduto(prod); 
      // Garantir que o formulário seja inicializado com todos os dados do produto
      setForm({
        nome: prod.nome || '',
        unidade: prod.unidade || '',
        descricao: prod.descricao || '',
        categoria: prod.categoria || '',
        tipo_processamento: prod.tipo_processamento || '',
        peso: prod.peso || '',
        fator_correcao: prod.fator_correcao || 1.0,
        perecivel: prod.perecivel || false,
        ativo: prod.ativo !== undefined ? prod.ativo : true
      });
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
      // Validar apenas se campos obrigatórios não estão vazios
      if (!form.nome?.trim()) {
        setError('Nome do produto não pode estar vazio');
        setIsSaving(false);
        return;
      }
      
      if (!form.unidade?.trim()) {
        setError('Unidade do produto não pode estar vazia');
        setIsSaving(false);
        return;
      }
      
      const dataToSend: any = {
        nome: form.nome.trim(),
        unidade: form.unidade.trim(), // Aceita qualquer texto
        descricao: form.descricao,
        categoria: form.categoria,
        tipo_processamento: form.tipo_processamento,
        peso: form.peso ? Number(form.peso) : null,
        fator_correcao: form.fator_correcao ? Number(form.fator_correcao) : 1.0,
        perecivel: form.perecivel,
        ativo: form.ativo
      };
      const atualizado = await atualizarProdutoMutation.mutateAsync({ id: Number(id), data: dataToSend });
      setProduto(atualizado); 
      setIsEditing(false);
      setSuccessMessage('Produto atualizado com sucesso!');
    } catch (err: any) { 
      console.error('Erro ao salvar produto:', err);
      setError(err?.response?.data?.message || err?.message || "Erro ao salvar alterações"); 
    } 
    finally { 
      setIsSaving(false); 
      setTimeout(() => setSuccessMessage(null), 3000); 
    }
  }, [id, form, atualizarProdutoMutation]);

  const handleSaveComposition = useCallback(async (compData) => {
    setIsSavingComp(true);
    try {
      console.log('📤 Enviando composição:', compData);
      const dataToSend = { ...Object.fromEntries(Object.entries(compData).map(([k, v]) => [k, v === "" ? null : Number(v)])) };
      console.log('📤 Dados processados:', dataToSend);
      
      const resultado = await salvarComposicaoNutricional(Number(id), dataToSend);
      console.log('✅ Resposta do servidor:', resultado);
      
      // Usar a resposta do servidor diretamente ao invés de recarregar
      setComposicao({ ...composicaoVazia, ...resultado });
      
      setSuccessMessage('Composição nutricional salva!');
    } catch (error) {
      console.error('❌ Erro ao salvar composição nutricional:', error);
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
  
  const handleCancel = useCallback(() => { 
    setIsEditing(false); 
    // Restaurar dados originais do produto
    setForm({
      nome: produto.nome || '',
      unidade: produto.unidade || '',
      descricao: produto.descricao || '',
      categoria: produto.categoria || '',
      tipo_processamento: produto.tipo_processamento || '',
      peso: produto.peso || '',
      fator_correcao: produto.fator_correcao || 1.0,
      perecivel: produto.perecivel || false,
      ativo: produto.ativo !== undefined ? produto.ativo : true
    });
  }, [produto]);

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: 'center', minHeight: '80vh' }}><CircularProgress size={60} /></Box>;
  if (error && !produto) return <PageContainer><Card><CardContent sx={{ textAlign: 'center', p: 4 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadData}>Tentar Novamente</Button></CardContent></Card></PageContainer>;
  if (!produto) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PageContainer>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <PageBreadcrumbs 
            items={[
              { label: 'Produtos', path: '/produtos', icon: <InventoryIcon fontSize="small" /> },
              { label: produto?.nome || 'Detalhes do Produto' }
            ]}
          />
          {!isEditing && (
            <IconButton 
              size="small" 
              onClick={(e) => setMenuAnchorEl(e.currentTarget)}
              sx={{ ml: 2 }}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>
        
        {successMessage && <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 1.5, py: 0.5 }}>{successMessage}</Alert>}
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1.5, py: 0.5 }}>{error}</Alert>}
        
        <Grid container spacing={2}>
          {/* Primeira linha - Identificação e Composição lado a lado */}
          <Grid item xs={12} md={6}>
            {/* Seção de Identificação */}
            <SectionPaper 
              title="Identificação do Produto" 
              icon={<FingerprintIcon color="primary" fontSize="small" />}
              actions={isEditing && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button onClick={handleCancel} variant="outlined" disabled={isSaving} size="small" sx={{ minHeight: 28, fontSize: '0.75rem' }}>Cancelar</Button>
                  <Button onClick={handleSave} variant="contained" color="add" disabled={isSaving} size="small" sx={{ minHeight: 28, fontSize: '0.75rem' }}>
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </Box>
              )}
            >
                {isEditing ? (
                    <Grid container spacing={1.5}>
                        <Grid item xs={12}>
                            <TextField label="Nome do Produto" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} fullWidth required size="small" />
                        </Grid>
                        <Grid item xs={12}>
                            <Autocomplete
                                freeSolo
                                options={[
                                    'Quilograma', 'Grama', 'Miligrama', 'Tonelada',
                                    'Litro', 'Mililitro',
                                    'Unidade', 'Dúzia', 'Caixa', 'Pacote', 'Fardo', 'Saco',
                                    'Lata', 'Galão', 'Bandeja', 'Maço', 'Pote',
                                    'Vidro', 'Sachê', 'Balde'
                                ]}
                                value={form.unidade || ''}
                                onChange={(event, newValue) => setForm({ ...form, unidade: newValue || '' })}
                                onInputChange={(event, newInputValue) => setForm({ ...form, unidade: newInputValue })}
                                renderInput={(params) => (
                                    <TextField 
                                        {...params} 
                                        label="Unidade" 
                                        required
                                        size="small"
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField label="Categoria" value={form.categoria || ""} onChange={e => setForm({ ...form, categoria: e.target.value })} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Peso (gramas)"
                                type="number"
                                value={form.peso || ''}
                                onChange={e => setForm({ ...form, peso: e.target.value })}
                                fullWidth
                                size="small"
                                helperText="Peso padrão do produto em gramas"
                                inputProps={{ min: 0, step: 0.01 }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Fator de Correção"
                                type="number"
                                value={form.fator_correcao || 1.0}
                                onChange={e => {
                                    const value = e.target.value.replace(',', '.'); // Aceita vírgula e converte para ponto
                                    const parsed = parseFloat(value);
                                    setForm({ ...form, fator_correcao: isNaN(parsed) ? 1.0 : parsed });
                                }}
                                fullWidth
                                size="small"
                                helperText="Fator para calcular per capita líquido. Ex: 1.15 (batata descascada), 2.5 (arroz cru→cozido)"
                                inputProps={{ min: 1.0, max: 3.0, step: 0.001 }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Tipo de Processamento</InputLabel>
                                <Select 
                                    value={form.tipo_processamento || ""} 
                                    onChange={e => setForm({ ...form, tipo_processamento: e.target.value })}
                                    label="Tipo de Processamento"
                                >
                                    <MenuItem value="">Nenhum</MenuItem>
                                    <MenuItem value="in natura">In Natura</MenuItem>
                                    <MenuItem value="minimamente processado">Minimamente Processado</MenuItem>
                                    <MenuItem value="processado">Processado</MenuItem>
                                    <MenuItem value="ultraprocessado">Ultraprocessado</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <FormControlLabel 
                                    control={<Switch checked={form.perecivel || false} onChange={e => setForm({ ...form, perecivel: e.target.checked })} size="small" />} 
                                    label={<Typography variant="body2">Produto Perecível</Typography>}
                                />
                                <FormControlLabel 
                                    control={<Switch checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} size="small" />} 
                                    label={<Typography variant="body2">Produto Ativo</Typography>}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                ) : (
                    <Grid container spacing={1.5}>
                        <Grid item xs={12}>
                            <InfoItem label="Nome" value={produto.nome}/>
                        </Grid>
                        <Grid item xs={12}>
                            <InfoItem label="Unidade" value={produto.unidade || '-'}/>
                        </Grid>
                        <Grid item xs={12}>
                            <InfoItem label="Categoria" value={produto.categoria}/>
                        </Grid>
                        <Grid item xs={12}>
                            <InfoItem label="Peso" value={produto.peso ? `${produto.peso}g` : '-'}/>
                        </Grid>
                        <Grid item xs={12}>
                            <InfoItem 
                                label="Fator de Correção" 
                                value={produto.fator_correcao 
                                    ? `${toNum(produto.fator_correcao).toFixed(3)}` 
                                    : '1.000'}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <InfoItem label="Tipo de Processamento" value={produto.tipo_processamento}/>
                        </Grid>
                        <Grid item xs={12}>
                            <InfoItem label="Perecível" value={produto.perecivel ? 'Sim' : 'Não'}/>
                        </Grid>
                    </Grid>
                )}
            </SectionPaper>
          </Grid>

          {/* Composição Nutricional - mesma altura */}
          <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <ComposicaoNutricionalCard composicaoData={composicao} onSave={handleSaveComposition} isSaving={isSavingComp} />
            </Box>
          </Grid>

          {/* Segunda linha - Descrição ocupando toda a largura */}
          <Grid item xs={12}>
            <SectionPaper title="Descrição" icon={<NotesIcon color="primary" fontSize="small" />}>
                {isEditing ? 
                    <TextField label="Descrição do Produto" value={form.descricao || ""} onChange={e => setForm({ ...form, descricao: e.target.value })} fullWidth multiline rows={3} size="small" />
                    :
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>{produto.descricao || 'Nenhuma descrição fornecida.'}</Typography>
                }
            </SectionPaper>
          </Grid>
        </Grid>
      </PageContainer>

      {/* Menu de ações */}
      <Menu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={() => setMenuAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { setMenuAnchorEl(null); setIsEditing(true); }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem onClick={() => { setMenuAnchorEl(null); setOpenExcluir(true); }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} color="error" />
          <Typography color="error">Excluir</Typography>
        </MenuItem>
      </Menu>

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
          isSavingComp ? 'Salvando composição nutricional...' :
          atualizarProdutoMutation.isPending ? 'Atualizando produto...' :
          'Processando...'
        }
      />
    </Box>
  );
}
