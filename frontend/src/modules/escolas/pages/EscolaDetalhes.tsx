import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { desktopMono } from "../../../theme/theme";
import { useToast } from "../../../hooks/useToast";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import {
    Box, Typography, TextField, Button, IconButton, Select, MenuItem,
    FormControl, InputLabel, Card, CircularProgress, Alert, FormControlLabel,
    Switch, Tooltip, Chip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
    Paper, Grid, Stack, CardContent, Menu
} from "@mui/material";

// ── Design tokens (GitHub Dark Mode) ──────────────────────────────────────────────
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
    MoreVert as MoreVertIcon,
    ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import {
    buscarEscola, editarEscola, deletarEscola, listarEscolaModalidades,
    adicionarEscolaModalidade, editarEscolaModalidade, removerEscolaModalidade,
} from "../../../services/escolas";
import { modalidadeService } from "../../../services/modalidades";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
// Interfaces
interface Modalidade {
    id: number;
    nome: string;
}

interface Escola {
    id: number;
    nome: string;
    codigo?: string; // Código INEP (também usado para acesso ao sistema)
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
    created_at?: string;
    updated_at?: string;
}

// --- Interfaces ---
// (As interfaces originais foram mantidas)

// --- Subcomponentes de UI ---

const InfoItem = ({ icon, label, value }: {
    icon: React.ReactNode;
    label: string;
    value: string | undefined;
}) => (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {icon}
        <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.7rem", lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</Typography>
            <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>{value || 'Não informado'}</Typography>
        </Box>
    </Stack>
);

const EscolaInfoCard = ({ isEditing, formData, setFormData, associacoes, totalAlunos, openModalidadeModal, handleDeleteModalidade, formatDate, onSave, onCancel, salvando }: {
    isEditing: boolean;
    formData: any;
    setFormData: (data: any) => void;
    associacoes: EscolaModalidade[];
    totalAlunos: number;
    openModalidadeModal: (assoc?: EscolaModalidade) => void;
    handleDeleteModalidade: (id: number) => void;
    formatDate: (dateString: string | null | undefined) => string;
    onSave: () => void;
    onCancel: () => void;
    salvando: boolean;
}) => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Card de Informações da Escola */}
        <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 1, overflow: 'visible' }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'success.main' }}>
                                <SchoolIcon sx={{ fontSize: 20 }} />
                            </Box>
                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, color: 'text.secondary' }}>
                                Informações da Escola
                            </Typography>
                        </Box>
                        {isEditing && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button onClick={onCancel} variant="outlined" disabled={salvando} size="small" sx={{ minHeight: 28, fontSize: '0.75rem' }}>Cancelar</Button>
                                <Button onClick={onSave} variant="contained" color="add" disabled={salvando} size="small" sx={{ minHeight: 28, fontSize: '0.75rem', borderRadius: 1, textTransform: 'none' }}>
                                    {salvando ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </Box>
                        )}
                    </Box>
                    {isEditing ? (
                        <>
                            <TextField label="Nome da Escola" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} fullWidth size="small" sx={{ mb: 1 }} required />
                            <TextField label="Código INEP" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} fullWidth size="small" sx={{ mb: 1 }} helperText="Código do INEP - também usado para acesso ao sistema" />
                            <TextField label="Endereço" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} fullWidth size="small" sx={{ mb: 1 }} multiline rows={2} />
                            <TextField label="Município" value={formData.municipio} onChange={(e) => setFormData({ ...formData, municipio: e.target.value })} fullWidth size="small" sx={{ mb: 1 }} />
                            <TextField label="Telefone" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} fullWidth size="small" sx={{ mb: 1 }} />
                            <TextField label="E-mail" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} type="email" fullWidth size="small" sx={{ mb: 1 }} />
                            <TextField label="Nome do(a) Gestor(a)" value={formData.nome_gestor} onChange={(e) => setFormData({ ...formData, nome_gestor: e.target.value })} fullWidth size="small" sx={{ mb: 1 }} />
                            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                                <InputLabel>Administração</InputLabel>
                                <Select value={formData.administracao} onChange={(e) => setFormData({ ...formData, administracao: e.target.value as any })} label="Administração">
                                    <MenuItem value=""><em>Nenhuma</em></MenuItem><MenuItem value="municipal">Municipal</MenuItem><MenuItem value="estadual">Estadual</MenuItem><MenuItem value="federal">Federal</MenuItem><MenuItem value="particular">Particular</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControlLabel control={<Switch checked={formData.ativo} onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} size="small" />} label={<Typography variant="body2">Escola Ativa</Typography>} sx={{ mt: 0.5 }} />
                        </>
                    ) : (
                        <>
                            <InfoItem icon={<SchoolIcon fontSize="small" color="action" />} label="Código INEP" value={formData.codigo} />
                            <InfoItem icon={<LocationOnIcon fontSize="small" color="action" />} label="Endereço" value={formData.endereco} />
                            <InfoItem icon={<LocationOnIcon fontSize="small" color="action" />} label="Município" value={formData.municipio} />
                            <InfoItem icon={<PhoneIcon fontSize="small" color="action" />} label="Telefone" value={formData.telefone} />
                            <InfoItem icon={<EmailIcon fontSize="small" color="action" />} label="E-mail" value={formData.email} />
                            <InfoItem icon={<PersonIcon fontSize="small" color="action" />} label="Gestor(a)" value={formData.nome_gestor} />
                            <InfoItem icon={<SchoolIcon fontSize="small" color="action" />} label="Administração" value={formData.administracao} />
                        </>
                    )}
                </CardContent>
            </Card>
        </Grid>

        {/* Card de Modalidades */}
        <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 1, overflow: 'visible' }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'info.main' }}>
                                <CategoryIcon sx={{ fontSize: 20 }} />
                            </Box>
                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, color: 'text.secondary' }}>
                                Modalidades
                            </Typography>
                        </Box>
                        <Button variant="contained" color="add" startIcon={<AddIcon fontSize="small" />} onClick={() => openModalidadeModal()} size="small" sx={{ minHeight: 28, fontSize: '0.75rem', borderRadius: 1, textTransform: 'none' }}>
                            Adicionar
                        </Button>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'success.main' }}>
                            <PeopleIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Box sx={{ ml: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, lineHeight: 1.2 }}>Total de Alunos</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '1.55rem', fontFamily: desktopMono, lineHeight: 1.15, color: 'text.primary' }}>{totalAlunos}</Typography>
                        </Box>
                    </Box>
                    {associacoes.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 1.5 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>Nenhuma modalidade</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ maxHeight: 180, overflowY: 'auto' }}>
                            {associacoes.map((assoc) => (
                                <Box key={assoc.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>{assoc.modalidade_nome}</Typography>
                                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                                            Atualizado: {formatDate(assoc.updated_at)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                        <Chip label={`${assoc.quantidade_alunos} alunos`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => openModalidadeModal(assoc)} sx={{ p: 0.5 }}>
                                                <EditIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Remover">
                                            <IconButton size="small" onClick={() => handleDeleteModalidade(assoc.id)} color="delete" sx={{ p: 0.5 }}>
                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Grid>
    </Grid>
);

// --- Componente Principal ---
const EscolaDetalhesPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const toast = useToast();
    const { setPageTitle } = usePageTitle();

    // Função para formatar data
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'Nunca atualizado';
        
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch {
            return 'Data inválida';
        }
    };

    // (Estados principais e de edição mantidos)
    const [escola, setEscola] = useState<Escola | null>(null);
    const [modalidades, setModalidades] = useState<Modalidade[]>([]);
    const [associacoes, setAssociacoes] = useState<EscolaModalidade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    // (Estados de modais mantidos)
    const [modalOpen, setModalOpen] = useState(false);
    const [editingModalidade, setEditingModalidade] = useState<EscolaModalidade | null>(null);
    const [modalidadeForm, setModalidadeForm] = useState({ modalidade_id: '', alunos: '' });
    const [isSavingModalidade, setIsSavingModalidade] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    
    // Estado do menu de ações
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(menuAnchorEl);

    // Atualizar título da página
    useEffect(() => {
        if (escola) {
            setPageTitle(escola.nome);
        }
        return () => setPageTitle('');
    }, [escola, setPageTitle]);

    const loadData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const [escolaData, modalidadesData, associacoesData] = await Promise.all([
                buscarEscola(Number(id)),
                modalidadeService.listar(),
                listarEscolaModalidades(),
            ]);
            setEscola(escolaData);
            setFormData({
                nome: escolaData.nome || '', codigo: escolaData.codigo || '',
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
            toast.success('Sucesso!', 'Escola atualizada com sucesso!');
            // Invalidar cache do React Query
            queryClient.invalidateQueries({ queryKey: ['escolas'] });
        } catch (err: any) { setError('Erro ao salvar alterações da escola'); }
        finally { setIsSaving(false); }
    }, [id, formData, queryClient]);

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
        if (escola) {
            setFormData({
                nome: escola.nome || '', codigo: escola.codigo || '',
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
                toast.success('Sucesso!', 'Modalidade atualizada com sucesso!');
            } else {
                await adicionarEscolaModalidade(Number(id), Number(modalidadeForm.modalidade_id), Number(modalidadeForm.alunos));
                toast.success('Sucesso!', 'Modalidade adicionada com sucesso!');
            }
            setModalOpen(false);
            await loadData();
            // Invalidar cache de modalidades para atualizar contagem de alunos
            queryClient.invalidateQueries({ queryKey: ['modalidades'] });
        } catch (err) { setError('Erro ao salvar modalidade'); }
        finally { setIsSavingModalidade(false); }
    }, [editingModalidade, modalidadeForm, id, loadData, queryClient]);

    const handleDeleteModalidade = useCallback(async (associacaoId: number) => {
        try {
            await removerEscolaModalidade(associacaoId);
            toast.success('Sucesso!', 'Modalidade removida com sucesso!');
            await loadData();
            // Invalidar cache de modalidades para atualizar contagem de alunos
            queryClient.invalidateQueries({ queryKey: ['modalidades'] });
        } catch (err) { setError('Erro ao remover modalidade'); }
    }, [loadData, queryClient]);

    const totalAlunos = useMemo(() => associacoes.reduce((total, assoc) => total + assoc.quantidade_alunos, 0), [associacoes]);

    if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: 'center', minHeight: '80vh', bgcolor: 'background.default' }}><CircularProgress size={60} /></Box>;
    if (error && !escola) return <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}><PageContainer><Card><CardContent sx={{ textAlign: 'center', p: 4 }}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert><Button variant="contained" onClick={loadData}>Tentar Novamente</Button></CardContent></Card></PageContainer></Box>;

    return (
        <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: 'background.default', overflow: 'hidden' }}>
            <PageContainer fullHeight>
                {/* Seta + Breadcrumbs na mesma linha */}
                <PageHeader
                    onBack={() => navigate('/escolas')}
                    breadcrumbs={[
                        { label: 'Dashboard', path: '/dashboard' },
                        { label: 'Escolas', path: '/escolas' },
                        { label: escola?.nome || 'Detalhes' },
                    ]}
                    title={escola?.nome || 'Detalhes da Escola'}
                    subtitle="Informações e modalidades da escola"
                    action={
                        !isEditing && (
                            <IconButton onClick={(e) => setMenuAnchorEl(e.currentTarget)}>
                                <MoreVertIcon />
                            </IconButton>
                        )
                    }
                />
                <EscolaInfoCard
                    isEditing={isEditing}
                    formData={formData}
                    setFormData={setFormData}
                    associacoes={associacoes}
                    totalAlunos={totalAlunos}
                    openModalidadeModal={openModalidadeModal}
                    handleDeleteModalidade={handleDeleteModalidade}
                    formatDate={formatDate}
                    onSave={handleSaveEscola}
                    onCancel={handleCancelEdit}
                    salvando={isSaving}
                />

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
                <MenuItem onClick={() => { setMenuAnchorEl(null); setDeleteDialogOpen(true); }}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} color="error" />
                    <Typography color="error">Excluir</Typography>
                </MenuItem>
            </Menu>

            {/* Modais fora do PageContainer */}
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
                    <DialogActions><Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button><Button onClick={handleDeleteEscola} variant="contained" color="delete">Excluir</Button></DialogActions>
                </Dialog>

            <LoadingOverlay 
                open={isSaving || isSavingModalidade}
                message={
                    isSaving ? 'Salvando escola...' :
                    isSavingModalidade ? 'Salvando modalidade...' :
                    'Processando...'
                }
            />
        </PageContainer>
    </Box>
    );
};

export default EscolaDetalhesPage;
