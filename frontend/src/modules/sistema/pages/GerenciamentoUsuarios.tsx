import React, { useState, useEffect } from "react";
import {
  Box, Tab, Tabs, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Alert, CircularProgress, Tooltip, Divider,
} from "@mui/material";
import {
  Add, Edit, Delete, People, AdminPanelSettings, Visibility,
  VisibilityOff, Lock,
} from "@mui/icons-material";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import {
  getUsuarios, criarUsuario, atualizarUsuario, excluirUsuario,
  getFuncoes, criarFuncao, atualizarFuncao, excluirFuncao,
  getModulos, getNiveis,
  Usuario, Funcao, Modulo, NivelPermissao,
} from "../../../services/adminUsuarios";
import api from "../../../services/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const NAVY = "#0f172a";
const GREEN = "#22c55e";

const NIVEL_COLORS: Record<number, "default" | "info" | "warning" | "success"> = {
  0: "default", 1: "info", 2: "warning", 3: "success",
};

function NivelChip({ nivel, nome }: { nivel: number; nome: string }) {
  return <Chip label={nome} color={NIVEL_COLORS[nivel] ?? "default"} size="small" sx={{ borderRadius: '3px', fontWeight: 500 }} />;
}

// ─── Dialog: Usuário ─────────────────────────────────────────────────────────

interface UsuarioDialogProps {
  open: boolean;
  usuario?: Usuario | null;
  funcoes: Funcao[];
  escolas: any[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

function UsuarioDialog({ open, usuario, funcoes, escolas, onClose, onSave }: UsuarioDialogProps) {
  const [form, setForm] = useState({ nome: "", email: "", senha: "", tipo: "usuario", funcao_id: "", ativo: true, tipo_secretaria: "educacao", escola_id: "" });
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (usuario) {
      setForm({ nome: usuario.nome, email: usuario.email, senha: "", tipo: usuario.tipo, funcao_id: String(usuario.funcao_id ?? ""), ativo: usuario.ativo, tipo_secretaria: usuario.tipo_secretaria || "educacao", escola_id: String(usuario.escola_id ?? "") });
    } else {
      setForm({ nome: "", email: "", senha: "", tipo: "usuario", funcao_id: "", ativo: true, tipo_secretaria: "educacao", escola_id: "" });
    }
    setErro("");
  }, [usuario, open]);

  const handleSave = async () => {
    setErro("");
    setLoading(true);
    try {
      const payload: any = { ...form, funcao_id: form.funcao_id ? Number(form.funcao_id) : null };
      if (!payload.senha) delete payload.senha;
      await onSave(payload);
      onClose();
    } catch (e: any) {
      setErro(e?.response?.data?.message || e.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{usuario ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        {erro && <Alert severity="error" sx={{ borderRadius: '6px' }}>{erro}</Alert>}
        <TextField label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} fullWidth required />
        <TextField label="E-mail" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} fullWidth required />
        <TextField
          label={usuario ? "Nova senha (deixe em branco para manter)" : "Senha"}
          type={showSenha ? "text" : "password"}
          value={form.senha}
          onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
          fullWidth
          required={!usuario}
          InputProps={{
            endAdornment: (
              <IconButton onClick={() => setShowSenha(s => !s)} edge="end">
                {showSenha ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            ),
          }}
        />
        <FormControl fullWidth>
          <InputLabel>Tipo</InputLabel>
          <Select value={form.tipo} label="Tipo" onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
            <MenuItem value="usuario">Usuário</MenuItem>
            <MenuItem value="admin">Administrador</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Função</InputLabel>
          <Select value={form.funcao_id} label="Função" onChange={e => setForm(f => ({ ...f, funcao_id: e.target.value }))}>
            <MenuItem value=""><em>Nenhuma</em></MenuItem>
            {funcoes.map(f => <MenuItem key={f.id} value={String(f.id)}>{f.nome}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Tipo de Secretaria</InputLabel>
          <Select
            value={form.tipo_secretaria}
            label="Tipo de Secretaria"
            onChange={e => setForm(f => ({ ...f, tipo_secretaria: e.target.value as 'educacao' | 'escola', escola_id: e.target.value === 'educacao' ? '' : f.escola_id }))}
          >
            <MenuItem value="educacao">Secretaria de Educação</MenuItem>
            <MenuItem value="escola">Secretaria de Escola</MenuItem>
          </Select>
        </FormControl>
        {form.tipo_secretaria === 'escola' && (
          <FormControl fullWidth>
            <InputLabel>Escola</InputLabel>
            <Select
              value={form.escola_id}
              label="Escola"
              onChange={e => setForm(f => ({ ...f, escola_id: e.target.value }))}
              required
            >
              <MenuItem value=""><em>Selecione uma escola</em></MenuItem>
              {(escolas || []).map(e => <MenuItem key={e.id} value={String(e.id)}>{e.nome}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        <FormControlLabel
          control={<Switch checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />}
          label="Usuário ativo"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Dialog: Função ──────────────────────────────────────────────────────────

interface FuncaoDialogProps {
  open: boolean;
  funcao?: Funcao | null;
  modulos: Modulo[];
  niveis: NivelPermissao[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

function FuncaoDialog({ open, funcao, modulos, niveis, onClose, onSave }: FuncaoDialogProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [perms, setPerms] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const nivelNenhum = niveis.find(n => n.nivel === 0);

  useEffect(() => {
    if (funcao) {
      setNome(funcao.nome);
      setDescricao(funcao.descricao ?? "");
      const map: Record<number, number> = {};
      funcao.permissoes.forEach(p => { map[p.modulo_id] = p.nivel_permissao_id; });
      setPerms(map);
    } else {
      setNome(""); setDescricao(""); setPerms({});
    }
    setErro("");
  }, [funcao, open]);

  const handleSave = async () => {
    setErro("");
    setLoading(true);
    try {
      const permissoes = Object.entries(perms)
        .filter(([, nid]) => nid && nid !== nivelNenhum?.id)
        .map(([mid, nid]) => ({ modulo_id: Number(mid), nivel_permissao_id: nid }));
      await onSave({ nome, descricao, permissoes });
      onClose();
    } catch (e: any) {
      setErro(e?.response?.data?.message || e.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{funcao ? "Editar Função" : "Nova Função"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        {erro && <Alert severity="error" sx={{ borderRadius: '6px' }}>{erro}</Alert>}
        <TextField label="Nome da Função" value={nome} onChange={e => setNome(e.target.value)} fullWidth required />
        <TextField label="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} fullWidth multiline rows={2} />
        <Divider />
        <Typography variant="subtitle2" color="text.secondary">Permissões por módulo</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>Módulo</TableCell>
                <TableCell>Nível de Acesso</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {modulos.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.nome}</TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <Select
                        value={perms[m.id] ?? (nivelNenhum?.id ?? "")}
                        onChange={e => setPerms(p => ({ ...p, [m.id]: Number(e.target.value) }))}
                      >
                        {niveis.map(n => (
                          <MenuItem key={n.id} value={n.id}>
                            <NivelChip nivel={n.nivel} nome={n.nome} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function GerenciamentoUsuarios() {
  const [tab, setTab] = useState(0);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [niveis, setNiveis] = useState<NivelPermissao[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [salvandoUsuario, setSalvandoUsuario] = useState(false);
  const [salvandoFuncao, setSalvandoFuncao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [usuarioDialog, setUsuarioDialog] = useState<{ open: boolean; usuario?: Usuario | null }>({ open: false });
  const [funcaoDialog, setFuncaoDialog] = useState<{ open: boolean; funcao?: Funcao | null }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; tipo: "usuario" | "funcao"; id: number; nome: string } | null>(null);

  const carregar = async () => {
    setLoading(true);
    setErro("");
    try {
      const [u, f, m, n, esc] = await Promise.all([
        getUsuarios(),
        getFuncoes(),
        getModulos(),
        getNiveis(),
        api.get('/escolas').then(res => res.data.data || res.data)
      ]);
      setUsuarios(u);
      setFuncoes(f);
      setModulos(m);
      setNiveis(n);
      setEscolas(Array.isArray(esc) ? esc : []);
    } catch (e: any) {
      setErro(e?.response?.data?.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleSaveUsuario = async (data: any) => {
    setSalvandoUsuario(true);
    try {
      if (usuarioDialog.usuario) await atualizarUsuario(usuarioDialog.usuario.id, data);
      else await criarUsuario(data);
      await carregar();
    } finally { setSalvandoUsuario(false); }
  };

  const handleSaveFuncao = async (data: any) => {
    setSalvandoFuncao(true);
    try {
      if (funcaoDialog.funcao) await atualizarFuncao(funcaoDialog.funcao.id, data);
      else await criarFuncao(data);
      await carregar();
    } finally { setSalvandoFuncao(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setExcluindo(true);
    try {
      if (confirmDelete.tipo === "usuario") await excluirUsuario(confirmDelete.id);
      else await excluirFuncao(confirmDelete.id);
      setConfirmDelete(null);
      await carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.message || "Erro ao excluir");
      setConfirmDelete(null);
    } finally { setExcluindo(false); }
  };

  const GreenButton = ({ startIcon, onClick, label }: { startIcon: React.ReactNode; onClick: () => void; label: string }) => (
    <Button
      variant="contained"
      startIcon={startIcon}
      onClick={onClick}
      sx={{
        borderRadius: '4px',
        textTransform: 'none',
        fontWeight: 600,
        bgcolor: GREEN,
        '&:hover': { bgcolor: '#16a34a' },
        fontSize: '0.82rem',
      }}
    >
      {label}
    </Button>
  );

  const SectionBar = ({ color, label }: { color: string; label: string }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
      <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: color }} />
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color }}>
        {label}
      </Typography>
    </Box>
  );

  return (
    <>
      {/* Navy header bar */}
      <Box
        sx={{
          mx: '-20px',
          mt: '-12px',
          mb: 3,
          px: '28px',
          py: 2.5,
          background: `linear-gradient(135deg, ${NAVY}, #1e293b)`,
          position: 'relative',
        }}
      >
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GREEN}44, transparent)` }} />
        <Typography sx={{ fontWeight: 800, fontSize: '1.55rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 1.2, letterSpacing: '-0.5px' }}>
          <AdminPanelSettings sx={{ color: GREEN }} />
          Gerenciamento de Usuários
        </Typography>
        <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          Gerencie usuários, funções e permissões do sistema
        </Typography>
      </Box>

      {erro && <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }} onClose={() => setErro("")}>{erro}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<People fontSize="small" />} iconPosition="start" label="Usuários" />
        <Tab icon={<Lock fontSize="small" />} iconPosition="start" label="Funções e Permissões" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* ── Aba Usuários ── */}
          {tab === 0 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <SectionBar color={GREEN} label="Usuários cadastrados" />
                <GreenButton startIcon={<Add />} onClick={() => setUsuarioDialog({ open: true, usuario: null })} label="Novo Usuário" />
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '6px', overflow: 'hidden' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>E-mail</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Função</TableCell>
                      <TableCell>Escola</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usuarios.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          Nenhum usuário cadastrado
                        </TableCell>
                      </TableRow>
                    )}
                    {usuarios.map(u => (
                      <TableRow key={u.id}>
                        <TableCell sx={{ fontWeight: 500 }}>{u.nome}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={u.tipo === "admin" ? "Administrador" : "Usuário"}
                            color={u.tipo === "admin" ? "error" : "default"}
                            size="small"
                            sx={{ borderRadius: '3px', fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          {u.funcao_nome ?? <Typography variant="body2" color="text.secondary">—</Typography>}
                        </TableCell>
                        <TableCell>
                          {u.escola_nome ? (
                            <Chip label={u.escola_nome} size="small" color="primary" variant="outlined" sx={{ borderRadius: '3px', fontWeight: 500 }} />
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={u.ativo ? "Ativo" : "Inativo"}
                            color={u.ativo ? "success" : "default"}
                            size="small"
                            sx={{ borderRadius: '3px', fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="Editar">
                              <IconButton
                                size="small"
                                onClick={() => setUsuarioDialog({ open: true, usuario: u })}
                                disabled={salvandoUsuario || excluindo}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setConfirmDelete({ open: true, tipo: "usuario", id: u.id, nome: u.nome })}
                                  disabled={salvandoUsuario || excluindo}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Aba Funções ── */}
          {tab === 1 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <SectionBar color="#6366f1" label="Funções e permissões" />
                <GreenButton startIcon={<Add />} onClick={() => setFuncaoDialog({ open: true, funcao: null })} label="Nova Função" />
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {funcoes.length === 0 && (
                  <Paper variant="outlined" sx={{ p: 4, textAlign: "center", color: "text.secondary", borderRadius: '6px' }}>
                    Nenhuma função cadastrada
                  </Paper>
                )}
                {funcoes.map(f => (
                  <Paper key={f.id} variant="outlined" sx={{ p: 2.5, borderRadius: '6px', transition: 'border-color 0.2s', '&:hover': { borderColor: '#6366f1' } }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                      <Box>
                        <Typography fontWeight={600}>{f.nome}</Typography>
                        {f.descricao && <Typography variant="body2" color="text.secondary">{f.descricao}</Typography>}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => setFuncaoDialog({ open: true, funcao: f })}
                            disabled={salvandoFuncao || excluindo}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setConfirmDelete({ open: true, tipo: "funcao", id: f.id, nome: f.nome })}
                              disabled={salvandoFuncao || excluindo}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {f.permissoes.length === 0
                        ? <Typography variant="caption" color="text.secondary">Sem permissões definidas</Typography>
                        : f.permissoes.map(p => (
                          <Chip
                            key={p.modulo_id}
                            label={`${p.modulo_nome}: ${p.nivel_nome}`}
                            color={NIVEL_COLORS[p.nivel] ?? "default"}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: '3px', fontWeight: 500 }}
                          />
                        ))
                      }
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Dialogs */}
      <UsuarioDialog
        open={usuarioDialog.open}
        usuario={usuarioDialog.usuario}
        funcoes={funcoes}
        escolas={escolas}
        onClose={() => setUsuarioDialog({ open: false })}
        onSave={handleSaveUsuario}
      />
      <FuncaoDialog
        open={funcaoDialog.open}
        funcao={funcaoDialog.funcao}
        modulos={modulos}
        niveis={niveis}
        onClose={() => setFuncaoDialog({ open: false })}
        onSave={handleSaveFuncao}
      />

      {/* Confirm Delete */}
      <Dialog open={!!confirmDelete?.open} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography>Deseja excluir <strong>{confirmDelete?.nome}</strong>? Esta ação não pode ser desfeita.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} disabled={excluindo}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={excluindo}>
            {excluindo ? <CircularProgress size={20} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      <LoadingOverlay
        open={salvandoUsuario || salvandoFuncao || excluindo}
        message={
          salvandoUsuario ? 'Salvando usuário...' :
          salvandoFuncao ? 'Salvando função...' :
          excluindo ? 'Excluindo...' :
          'Processando...'
        }
      />
    </>
  );
}
