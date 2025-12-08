import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, TextField, Button, IconButton, Select, MenuItem,
    FormControl, InputLabel, Card, CircularProgress, Alert, FormControlLabel,
    Switch, Tooltip, Chip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
    Paper, Grid, Stack, CardContent
} from '@mui/material';
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    School as SchoolIcon,
    Person as PersonIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Inventory as InventoryIcon,
    People as PeopleIcon,
    Category as CategoryIcon,
    ReceiptLong as ReceiptLongIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    LocationOn as LocationOnIcon,
    VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import {
    buscarEscola, editarEscola, deletarEscola, listarEscolaModalidades,
    adicionarEscolaModalidade, editarEscolaModalidade, removerEscolaModalidade,
} from '../services/escolas';
import { listarModalidades } from '../services/modalidades';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
// Interfaces
interface Modalidade {
    id: number;
    nome: string;
}

interface Escola {
    id: number;
    nome: string;
    codigo?: string;
    codigo_acesso: string;
    endereco?: string;
    municipio?: string;
    telefone?: string;
    email?: string;
    nome_gestor?: string;
    administracao?: string;
    ativo: boolean;
}

interface EscolaModalidade {
    id: number;
    escola_id: number;
    modalidade_id: number;
    modalidade_nome: string;
    quantidade_alunos: number;
}

// --- Interfaces ---
// (As interfaces originais foram mantidas)

// --- Subcomponentes de UI ---

const PageHeader = ({ escola, totalAlunos, isEditing, onEdit, onSave, onCancel, onDelete, salvando }) => (
    <Card sx={{ p: 3, mb: 3, borderRadius: '12px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {escola?.nome}
                </Typography>
                <Chip label={escola?.ativo ? 'Ativa' : 'Inativa'} color={escola?.ativo ? 'success' : 'error'} size="small" />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {isEditing ? (
                        <>
                            <Button onClick={onCancel} variant="outlined" disabled={salvando} size="small">Cancelar</Button>
                            <Button onClick={onSave} variant="contained" color="success" disabled={salvando} size="small">
                                {salvando ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button startIcon={<EditIcon />} onClick={onEdit} variant="outlined" size="small">Editar</Button>
                            <Button startIcon={<DeleteIcon />} onClick={onDelete} variant="contained" color="error" size="small">Excluir</Button>
                        </>
                    )}
                </Box>
            </Box>
        </Box>
    </Card>
);

const InfoItem = ({ icon, label, value }) => (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        {icon}
        <Box>
            <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
            <Typography variant="body2" fontWeight={500}>{value || 'Não informado'}</Typography>
        </Box>
    </Stack>
);

const EscolaInfoCard = ({ isEditing, formData, setFormData, associacoes, totalAlunos, openModalidadeModal, handleDeleteModalidade }) => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Card de Informações da Escola */}
        <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, borderRadius: '12px', height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                    <SchoolIcon />
                    Informações da Escola
                </Typography>
                {isEditing ? (
                    <>
                        <TextField label="Nome da Escola" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} fullWidth margin="dense" required />
                        <TextField label="Código INEP" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} fullWidth margin="dense" helperText="Código do INEP (opcional)" />
                        <TextField label="Endereço" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} fullWidth margin="dense" multiline rows={2} />
                        <TextField label="Município" value={formData.municipio} onChange={(e) => setFormData({ ...formData, municipio: e.target.value })} fullWidth margin="dense" />
                        <TextField label="Código de Acesso (6 dígitos)" value={formData.codigo_acesso} onChange={(e) => setFormData({ ...formData, codigo_acesso: e.target.value.replace(/\D/g, '') })} fullWidth margin="dense" required inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }} helperText="Código numérico de 6 dígitos para acesso da escola" />
                        <TextField label="Telefone" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} fullWidth margin="dense" />
                        <TextField label="E-mail" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} type="email" fullWidth margin="dense" />
                        <TextField label="Nome do(a) Gestor(a)" value={formData.nome_gestor} onChange={(e) => setFormData({ ...formData, nome_gestor: e.target.value })} fullWidth margin="dense" />
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Administração</InputLabel>
                            <Select value={formData.administracao} onChange={(e) => setFormData({ ...formData, administracao: e.target.value as any })} label="Administração">
                                <MenuItem value=""><em>Nenhuma</em></MenuItem><MenuItem value="municipal">Municipal</MenuItem><MenuItem value="estadual">Estadual</MenuItem><MenuItem value="federal">Federal</MenuItem><MenuItem value="particular">Particular</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControlLabel control={<Switch checked={formData.ativo} onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} />} label="Escola Ativa" sx={{ mt: 1 }} />
                    </>
                ) : (
                    <>
                        <InfoItem icon={<SchoolIcon color="action" />} label="Código INEP" value={formData.codigo} />
                        <InfoItem icon={<LocationOnIcon color="action" />} label="Endereço" value={formData.endereco} />
                        <InfoItem icon={<LocationOnIcon color="action" />} label="Município" value={formData.municipio} />
                        <InfoItem icon={<VpnKeyIcon color="action" />} label="Código de Acesso" value={formData.codigo_acesso} />
                        <InfoItem icon={<PhoneIcon color="action" />} label="Telefone" value={formData.telefone} />
                        <InfoItem icon={<EmailIcon color="action" />} label="E-mail" value={formData.email} />
                        <InfoItem icon={<PersonIcon color="action" />} label="Gestor(a)" value={formData.nome_gestor} />
                        <InfoItem icon={<SchoolIcon color="action" />} label="Administração" value={formData.administracao} />
                    </>
                )}
            </Card>
        </Grid>

        {/* Card de Modalidades */}
        <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, borderRadius: '12px', height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                        <PeopleIcon />
                        Modalidades
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => openModalidadeModal()} color="success" size="small">
                        Adicionar
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <PeopleIcon color="action" />
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Total de Alunos</Typography>
                        <Typography variant="body2" fontWeight={500}>{totalAlunos}</Typography>
                    </Box>
                </Box>
                {associacoes.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="body2" color="text.secondary">Nenhuma modalidade</Typography>
                    </Box>
                ) : (
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                        {associacoes.map((assoc) => (
                            <Box key={assoc.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="body2">{assoc.modalidade_nome}</Typography>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Chip label={`${assoc.quantidade_alunos} alunos`} size="small" variant="outlined" />
                                    <Tooltip title="Editar">
                                        <IconButton size="small" onClick={() => openModalidadeModal(assoc)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Remover">
                                        <IconButton size="small" onClick={() => handleDeleteModalidade(assoc.id)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Card>
        </Grid>
    </Grid>
);

// --- Componente Principal ---
const EscolaDetalhesPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // (Estados principais e de edição mantidos)
    const [escola, setEscola] = useState<Escola | null>(null);
    const [modalidades, setModalidades] = useState<Modalidade[]>([]);
    const [associacoes, setAssociacoes] = useState<EscolaModalidade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    // (Estados de modais mantidos)
    const [modalOpen, setModalOpen] = useState(false);
    const [editingModalidade, setEditingModalidade] = useState<EscolaModalidade | null>(null);
    const [modalidadeForm, setModalidadeForm] = useState({ modalidade_id: '', alunos: '' });
    const [isSavingModalidade, setIsSavingModalidade] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const loadData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const [escolaData, modalidadesData, associacoesData] = await Promise.all([
                buscarEscola(Number(id)),
                listarModalidades(),
                listarEscolaModalidades(),
            ]);
            setEscola(escolaData);
            setFormData({
                nome: escolaData.nome || '', codigo: escolaData.codigo || '', codigo_acesso: escolaData.codigo_acesso || '',
                endereco: escolaData.endereco || '', municipio: escolaData.municipio || '', telefone: escolaData.telefone || '',
                email: escolaData.email || '', nome_gestor: escolaData.nome_gestor || '',
                administracao: escolaData.administracao || '', ativo: escolaData.ativo,
            });
            setModalidades(modalidadesData);
            const associacoesEscola = associacoesData
                .filter((a: any) => a.escola_id === Number(id))
                .map((a: any) => ({ ...a, modalidade_nome: modalidadesData.find((m: Modalidade) => m.id === a.modalidade_id)?.nome || 'N/A' }));
            setAssociacoes(associacoesEscola);
        } catch (err: any) { setError('Erro ao carregar dados da escola'); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSaveEscola = useCallback(async () => {
        setIsSaving(true);
        try {
            const dadosParaEnvio = { ...formData, administracao: formData.administracao === '' ? null : formData.administracao };
            const escolaAtualizada = await editarEscola(Number(id), dadosParaEnvio);
            setEscola(escolaAtualizada);
            setIsEditing(false);
            setSuccessMessage('Escola atualizada com sucesso!');
            // Invalidar cache do React Query
            queryClient.invalidateQueries({ queryKey: ['escolas'] });
        } catch (err: any) { setError('Erro ao salvar alterações da escola'); }
        finally { setIsSaving(false); setTimeout(() => setSuccessMessage(null), 3000); }
    }, [id, formData, queryClient]);

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
        if (escola) {
            setFormData({
                nome: escola.nome || '', codigo: escola.codigo || '', codigo_acesso: escola.codigo_acesso || '',
                endereco: escola.endereco || '', municipio: escola.municipio || '', telefone: escola.telefone || '',
                email: escola.email || '', nome_gestor: escola.nome_gestor || '',
                administracao: escola.administracao || '', ativo: escola.ativo,
            });
        }
    }, [escola]);

    const handleDeleteEscola = useCallback(async () => {
        try {
            await deletarEscola(Number(id));
            navigate('/escolas', { state: { successMessage: 'Escola excluída com sucesso!' } });
        } catch (err: any) { setError('Erro ao excluir escola'); setDeleteDialogOpen(false); }
    }, [id, navigate]);

    // (Funções de modalidade mantidas e otimizadas com useCallback)
    const openModalidadeModal = useCallback((associacao?: EscolaModalidade) => {
        setEditingModalidade(associacao || null);
        setModalidadeForm(associacao ? { modalidade_id: associacao.modalidade_id.toString(), alunos: associacao.quantidade_alunos.toString() } : { modalidade_id: '', alunos: '' });
        setModalOpen(true);
    }, []);

    const handleSaveModalidade = useCallback(async () => {
        setIsSavingModalidade(true);
        try {
            if (editingModalidade) {
                await editarEscolaModalidade(editingModalidade.id, { quantidade_alunos: Number(modalidadeForm.alunos) });
                setSuccessMessage('Modalidade atualizada com sucesso!');
            } else {
                await adicionarEscolaModalidade(Number(id), Number(modalidadeForm.modalidade_id), Number(modalidadeForm.alunos));
                setSuccessMessage('Modalidade adicionada com sucesso!');
            }
            setModalOpen(false);
            await loadData();
        } catch (err) { setError('Erro ao salvar modalidade'); }
        finally { setIsSavingModalidade(false); setTimeout(() => setSuccessMessage(null), 3000); }
    }, [editingModalidade, modalidadeForm, id, loadData]);

    const handleDeleteModalidade = useCallback(async (associacaoId: number) => {
        try {
            await removerEscolaModalidade(associacaoId);
            setSuccessMessage('Modalidade removida com sucesso!');
            await loadData();
        } catch (err) { setError('Erro ao remover modalidade'); }
        finally { setTimeout(() => setSuccessMessage(null), 3000); }
    }, [loadData]);

    const totalAlunos = useMemo(() => associacoes.reduce((total, assoc) => total + assoc.quantidade_alunos, 0), [associacoes]);

    if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: 'center', minHeight: '80vh' }}><CircularProgress size={60} /></Box>;
    if (error && !escola) return <Box sx={{ maxWidth: '1280px', mx: 'auto', p: 4 }}><Card><CardContent sx={{ textAlign: 'center', p: 4 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadData}>Tentar Novamente</Button></CardContent></Card></Box>;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
                <PageBreadcrumbs
                    items={[
                        { label: 'Escolas', path: '/escolas', icon: <SchoolIcon fontSize="small" /> },
                        { label: escola?.nome || 'Detalhes da Escola' }
                    ]}
                />
                {successMessage && <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 2 }}>{successMessage}</Alert>}
                {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

                <PageHeader
                    escola={escola} totalAlunos={totalAlunos} isEditing={isEditing}
                    onEdit={() => setIsEditing(true)} onSave={handleSaveEscola} onCancel={handleCancelEdit}
                    onDelete={() => setDeleteDialogOpen(true)}
                    salvando={isSaving}
                />

                <EscolaInfoCard
                    isEditing={isEditing}
                    formData={formData}
                    setFormData={setFormData}
                    associacoes={associacoes}
                    totalAlunos={totalAlunos}
                    openModalidadeModal={openModalidadeModal}
                    handleDeleteModalidade={handleDeleteModalidade}
                />



                <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>{editingModalidade ? 'Editar Modalidade' : 'Adicionar Modalidade'}</DialogTitle>
                    <DialogContent dividers>
                        {editingModalidade ? (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                                    Modalidade: {editingModalidade.modalidade_nome}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Editando a quantidade de alunos para esta modalidade
                                </Typography>
                            </Box>
                        ) : (
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel>Modalidade</InputLabel>
                                <Select value={modalidadeForm.modalidade_id} onChange={e => setModalidadeForm({ ...modalidadeForm, modalidade_id: e.target.value })} label="Modalidade">
                                    {modalidades.filter(m => !associacoes.some(a => a.modalidade_id === m.id)).map(m => (<MenuItem key={m.id} value={m.id.toString()}>{m.nome}</MenuItem>))}
                                </Select>
                            </FormControl>
                        )}
                        <TextField label="Quantidade de Alunos" type="number" value={modalidadeForm.alunos} onChange={e => setModalidadeForm({ ...modalidadeForm, alunos: e.target.value })} fullWidth margin="normal" inputProps={{ min: 1 }} />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveModalidade} variant="contained" disabled={isSavingModalidade || !modalidadeForm.alunos.trim() || (!editingModalidade && !modalidadeForm.modalidade_id)}>
                            {isSavingModalidade ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                    <DialogContent><Typography>Tem certeza que deseja excluir a escola "{escola?.nome}"? Esta ação não pode ser desfeita.</Typography></DialogContent>
                    <DialogActions><Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button><Button onClick={handleDeleteEscola} variant="contained" color="error">Excluir</Button></DialogActions>
                </Dialog>
            </Box>
        </Box>
    );
};

export default EscolaDetalhesPage;