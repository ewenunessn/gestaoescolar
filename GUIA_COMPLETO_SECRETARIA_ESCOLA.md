# Guia Completo: Sistema de Secretaria de Escola

## ✅ Concluído

1. ✅ Migração do banco de dados aplicada
   - Coluna `escola_id` adicionada
   - Coluna `tipo_secretaria` adicionada
   - Índice criado

2. ✅ Backend - Controller atualizado parcialmente
   - `listarUsuarios`: Atualizado com JOIN de escolas
   - `criarUsuario`: Atualizado com validações

3. ✅ Frontend - Service atualizado
   - Interface `Usuario` atualizada com novos campos

## ⏳ Pendente

### 1. Backend - Completar Controller (MANUAL)

**Arquivo:** `backend/src/modules/usuarios/controllers/adminUsuariosController.ts`

Na função `atualizarUsuario` (linha ~89), fazer as seguintes alterações:

```typescript
// LINHA 92 - Adicionar campos
const { nome, email, senha, tipo, funcao_id, ativo, escola_id, tipo_secretaria } = req.body;

// APÓS LINHA 101 - Adicionar validações
// Validar tipo_secretaria
if (tipo_secretaria && !['educacao', 'escola'].includes(tipo_secretaria)) {
  throw new ValidationError('tipo_secretaria deve ser "educacao" ou "escola"');
}

// Se tipo_secretaria é 'escola', escola_id é obrigatório
if (tipo_secretaria === 'escola' && !escola_id) {
  throw new ValidationError('escola_id é obrigatório para usuários de secretaria de escola');
}

// APÓS LINHA 111 - Adicionar sets
if (escola_id !== undefined) { sets.push(`escola_id = $${idx++}`); values.push(escola_id || null); }
if (tipo_secretaria !== undefined) { sets.push(`tipo_secretaria = $${idx++}`); values.push(tipo_secretaria); }

// LINHA 117 - Atualizar RETURNING
RETURNING id, nome, email, tipo, funcao_id, ativo, escola_id, tipo_secretaria, updated_at
```

### 2. Frontend - Atualizar Página de Gerenciamento

**Arquivo:** `frontend/src/pages/GerenciamentoUsuarios.tsx`

#### A. Atualizar UsuarioDialog (linha ~40)

Adicionar ao estado do formulário:
```typescript
const [form, setForm] = useState({ 
  nome: "", 
  email: "", 
  senha: "", 
  tipo: "usuario", 
  funcao_id: "", 
  ativo: true,
  tipo_secretaria: "educacao",  // NOVO
  escola_id: ""                  // NOVO
});
```

Adicionar ao useEffect (linha ~47):
```typescript
if (usuario) {
  setForm({ 
    nome: usuario.nome, 
    email: usuario.email, 
    senha: "", 
    tipo: usuario.tipo, 
    funcao_id: String(usuario.funcao_id ?? ""), 
    ativo: usuario.ativo,
    tipo_secretaria: usuario.tipo_secretaria || "educacao",  // NOVO
    escola_id: String(usuario.escola_id ?? "")               // NOVO
  });
}
```

Adicionar campos no DialogContent (após o campo "Função"):
```typescript
<FormControl fullWidth>
  <InputLabel>Tipo de Secretaria</InputLabel>
  <Select 
    value={form.tipo_secretaria} 
    label="Tipo de Secretaria" 
    onChange={e => setForm(f => ({ ...f, tipo_secretaria: e.target.value as 'educacao' | 'escola' }))}
  >
    <MenuItem value="educacao">Secretaria de Educação</MenuItem>
    <MenuItem value="escola">Secretaria de Escola</MenuItem>
  </Select>
</FormControl>

{form.tipo_secretaria === 'escola' && (
  <Autocomplete
    options={escolas}
    getOptionLabel={(option) => option.nome}
    value={escolas.find(e => e.id === Number(form.escola_id)) || null}
    onChange={(_, value) => setForm(f => ({ ...f, escola_id: value ? String(value.id) : "" }))}
    renderInput={(params) => (
      <TextField {...params} label="Escola" required />
    )}
  />
)}
```

#### B. Adicionar estado de escolas no componente principal (linha ~200)

```typescript
const [escolas, setEscolas] = useState<any[]>([]);

// No useEffect de carregar
useEffect(() => { 
  carregar();
  carregarEscolas();
}, []);

const carregarEscolas = async () => {
  try {
    const res = await api.get('/escolas');
    setEscolas(res.data);
  } catch (e) {
    console.error('Erro ao carregar escolas:', e);
  }
};
```

#### C. Passar escolas para o dialog (linha ~350)

```typescript
<UsuarioDialog
  open={usuarioDialog.open}
  usuario={usuarioDialog.usuario}
  funcoes={funcoes}
  escolas={escolas}  // NOVO
  onClose={() => setUsuarioDialog({ open: false })}
  onSave={handleSaveUsuario}
/>
```

#### D. Atualizar interface do dialog (linha ~30)

```typescript
interface UsuarioDialogProps {
  open: boolean;
  usuario?: Usuario | null;
  funcoes: Funcao[];
  escolas: any[];  // NOVO
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}
```

#### E. Atualizar tabela para exibir escola (linha ~280)

Adicionar coluna na TableHead:
```typescript
<TableCell>Escola</TableCell>
```

Adicionar célula na TableRow:
```typescript
<TableCell>
  {u.escola_nome ? (
    <Chip label={u.escola_nome} size="small" color="primary" variant="outlined" />
  ) : (
    <Typography variant="body2" color="text.secondary">—</Typography>
  )}
</TableCell>
```

### 3. Criar Página do Portal da Escola

**Arquivo:** `frontend/src/pages/PortalEscola.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, Grid, Chip } from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import api from '../services/api';

export default function PortalEscola() {
  const [escola, setEscola] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const res = await api.get('/escola-portal/dashboard');
      setEscola(res.data.data.escola);
      setStats(res.data.data.estatisticas);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box>Carregando...</Box>;

  return (
    <PageContainer>
      <PageHeader 
        title={escola?.nome || 'Portal da Escola'} 
        subtitle="Informações e gestão da sua escola"
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Total de Guias</Typography>
            <Typography variant="h4">{stats?.total_guias || 0}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Produtos</Typography>
            <Typography variant="h4">{stats?.total_produtos || 0}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Pendentes</Typography>
            <Typography variant="h4" color="warning.main">{stats?.pendentes || 0}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Entregues</Typography>
            <Typography variant="h4" color="success.main">{stats?.entregues || 0}</Typography>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon />
              Informações da Escola
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Nome</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{escola?.nome}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Código</Typography>
                <Typography variant="body1">{escola?.codigo || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Endereço</Typography>
                <Typography variant="body1">{escola?.endereco || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip 
                  label={escola?.ativo ? 'Ativa' : 'Inativa'} 
                  color={escola?.ativo ? 'success' : 'default'} 
                  size="small" 
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
```

### 4. Adicionar Rota no Frontend

**Arquivo:** `frontend/src/App.tsx`

Adicionar import:
```typescript
import PortalEscola from './pages/PortalEscola';
```

Adicionar rota:
```typescript
<Route path="/portal-escola" element={<PortalEscola />} />
```

### 5. Criar Controller do Portal da Escola

**Arquivo:** `backend/src/controllers/escolaPortalController.ts`

```typescript
import { Request, Response } from "express";
import db from "../database";
import { asyncHandler, ValidationError } from "../utils/errorHandler";

export const getDashboardEscola = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  if (!user.escola_id) {
    throw new ValidationError('Usuário não está associado a uma escola');
  }

  // Buscar dados da escola
  const escola = await db.query('SELECT * FROM escolas WHERE id = $1', [user.escola_id]);
  
  if (escola.rows.length === 0) {
    throw new ValidationError('Escola não encontrada');
  }

  // Buscar estatísticas
  const stats = await db.query(`
    SELECT 
      COUNT(DISTINCT ge.guia_id) as total_guias,
      COUNT(DISTINCT ge.produto_id) as total_produtos,
      SUM(CASE WHEN ge.status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
      SUM(CASE WHEN ge.status = 'entregue' THEN 1 ELSE 0 END) as entregues
    FROM guia_escola ge
    WHERE ge.escola_id = $1
  `, [user.escola_id]);

  res.json({
    success: true,
    data: {
      escola: escola.rows[0],
      estatisticas: stats.rows[0]
    }
  });
});
```

### 6. Criar Rotas do Portal da Escola

**Arquivo:** `backend/src/routes/escolaPortalRoutes.ts`

```typescript
import { Router } from 'express';
import * as escolaPortalController from '../controllers/escolaPortalController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', authMiddleware, escolaPortalController.getDashboardEscola);

export default router;
```

### 7. Registrar Rotas no App

**Arquivo:** `backend/src/app.ts`

Adicionar import:
```typescript
import escolaPortalRoutes from './routes/escolaPortalRoutes';
```

Adicionar rota:
```typescript
app.use('/api/escola-portal', escolaPortalRoutes);
```

## Testando a Implementação

### 1. Criar Usuário de Secretaria de Escola

```bash
# Via interface ou API
POST /api/admin/usuarios
{
  "nome": "Maria Silva",
  "email": "maria@escola1.com",
  "senha": "senha123",
  "tipo": "usuario",
  "tipo_secretaria": "escola",
  "escola_id": 1,
  "ativo": true
}
```

### 2. Fazer Login

```bash
POST /api/auth/login
{
  "email": "maria@escola1.com",
  "senha": "senha123"
}
```

### 3. Acessar Portal

```bash
GET /api/escola-portal/dashboard
Authorization: Bearer {token}
```

Deve retornar dados apenas da escola associada.

## Próximas Melhorias

1. Adicionar mais páginas no portal:
   - Guias de demanda da escola
   - Histórico de entregas
   - Cardápios

2. Implementar middleware de autorização automática

3. Adicionar filtros automáticos em todas as queries

4. Criar dashboard com gráficos

5. Adicionar notificações para a escola
