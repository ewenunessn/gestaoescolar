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
import {
  getUsuarios, criarUsuario, atualizarUsuario, excluirUsuario,
  getFuncoes, criarFuncao, atualizarFuncao, excluirFuncao,
  getModulos, getNiveis,
  Usuario, Funcao, Modulo, NivelPermissao,
} from "../services/adminUsuarios";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NIVEL_COLORS: Record<number, "default" | "info" | "warning" | "success"> = {
  0: "default", 1: "info", 2: "warning", 3: "success",
};

function NivelChip({ nivel, nome }: { nivel: number; nome: string }) {
  return <Chip label={nome} color={NIVEL_COLORS[nivel] ?? "default"} size="small" />;
}

// ─── Dialog: Usuário ─────────────────────────────────────────────────────────

interface UsuarioDialogProps {
  open: boolean;
  usuario?: Usuario | null;
  funcoes: Funcao[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

function UsuarioDialog({ open, usuario, funcoes, onClose, onSave }: UsuarioDialogProps) {
  const [form, setForm] = useState({ nome: "", email: "", senha: "", tipo: "usuario", funcao_id: "", ativo: true });
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (usuario) {
      setForm({ nome: usuario.nome, email: usuario.email, senha: "", tipo: usuario.tipo, funcao_id: String(usuario.funcao_id ?? ""), ativo: usuario.ativo });
    } else {
      setForm({ nome: "", email: "", senha: "", tipo: "usuario", funcao_id: "", ativo: true });
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
        {erro && <Alert severity="error">{erro}</Alert>}
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
  // mapa modulo_id -> nivel_permissao_id
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
        {erro && <Alert severity="error">{erro}</Alert>}
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
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  // Dialogs
  const [usuarioDialog, setUsuarioDialog] = useState<{ open: boolean; usuario?: Usuario | null }>({ open: false });
  const [funcaoDialog, setFuncaoDialog] = useState<{ open: boolean; funcao?: Funcao | null }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; tipo: "usuario" | "funcao"; id: number; nome: string } | null>(null);

  const carregar = async () => {
    setLoading(true);
    setErro("");
    try {
      const [u, f, m, n] = await Promise.all([getUsuarios(), getFuncoes(), getModulos(), getNiveis()]);
      setUsuarios(u);
      setFuncoes(f);
      setModulos(m);
      setNiveis(n);
    } catch (e: any) {
      setErro(e?.response?.data?.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleSaveUsuario = async (data: any) => {
    if (usuarioDialog.usuario) {
      await atualizarUsuario(usuarioDialog.usuario.id, data);
    } else {
      await criarUsuario(data);
    }
    await carregar();
  };

  const handleSaveFuncao = async (data: any) => {
    if (funcaoDialog.funcao) {
      await atualizarFuncao(funcaoDialog.funcao.id, data);
    } else {
      await criarFuncao(data);
    }
    await carregar();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.tipo === "usuario") await excluirUsuario(confirmDelete.id);
      else await excluirFuncao(confirmDelete.id);
      setConfirmDelete(null);
      await carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.message || "Erro ao excluir");
      setConfirmDelete(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <AdminPanelSettings color="primary" />
          <Typography variant="h5" fontWeight={700}>Gerenciamento de Usuários</Typography>
        </Box>

        {erro && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro("")}>{erro}</Alert>}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
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
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                  <Button variant="contained" startIcon={<Add />} onClick={() => setUsuarioDialog({ open: true, usuario: null })}>
                    Novo Usuário
                  </Button>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell>Nome</TableCell>
                        <TableCell>E-mail</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Função</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {usuarios.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                            Nenhum usuário cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                      {usuarios.map(u => (
                        <TableRow key={u.id} hover>
                          <TableCell>{u.nome}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={u.tipo === "admin" ? "Administrador" : "Usuário"}
                              color={u.tipo === "admin" ? "error" : "default"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{u.funcao_nome ?? <Typography variant="body2" color="text.secondary">—</Typography>}</TableCell>
                          <TableCell>
                            <Chip label={u.ativo ? "Ativo" : "Inativo"} color={u.ativo ? "success" : "default"} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => setUsuarioDialog({ open: true, usuario: u })}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton size="small" color="error" onClick={() => setConfirmDelete({ open: true, tipo: "usuario", id: u.id, nome: u.nome })}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
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
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                  <Button variant="contained" startIcon={<Add />} onClick={() => setFuncaoDialog({ open: true, funcao: null })}>
                    Nova Função
                  </Button>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {funcoes.length === 0 && (
                    <Paper variant="outlined" sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
                      Nenhuma função cadastrada
                    </Paper>
                  )}
                  {funcoes.map(f => (
                    <Paper key={f.id} variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Box>
                          <Typography fontWeight={600}>{f.nome}</Typography>
                          {f.descricao && <Typography variant="body2" color="text.secondary">{f.descricao}</Typography>}
                        </Box>
                        <Box>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => setFuncaoDialog({ open: true, funcao: f })}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton size="small" color="error" onClick={() => setConfirmDelete({ open: true, tipo: "funcao", id: f.id, nome: f.nome })}>
                              <Delete fontSize="small" />
                            </IconButton>
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
      </Box>

      {/* Dialogs */}
      <UsuarioDialog
        open={usuarioDialog.open}
        usuario={usuarioDialog.usuario}
        funcoes={funcoes}
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
          <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Excluir</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
