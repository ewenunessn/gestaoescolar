# Painel Administrativo - Gestão de Instituições

Painel isolado para gerenciar instituições, tenants e usuários do sistema principal.

## 🚀 Instalação

```bash
cd admin-panel
npm install
```

## 🏃 Executar

```bash
npm run dev
```

O painel estará disponível em: http://localhost:5174

## 🔐 Login

**Credenciais de teste:**
- Email: admin@empresa.com
- Senha: admin123

## 🌐 Deploy para Produção

### ⚡ Pronto para Deploy!

**✅ Não precisa editar código!** Configure apenas via Vercel Dashboard:

**Passos:**
1. **Deploy no Vercel**:
   - Root Directory: `admin-panel`
   - Framework: Vite

2. **Environment Variable**:
   - `VITE_API_URL` = `https://seu-backend.vercel.app/api`

3. **Configurar CORS no Backend**:
   ```env
   CORS_ORIGIN=https://admin-panel-xxx.vercel.app
   ```

📖 **Guia Completo**: [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)  
⚡ **Guia Rápido**: [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)

## 📋 Funcionalidades

- ✅ Dashboard com estatísticas
- ✅ Listar instituições
- ✅ Criar nova instituição (provisionamento completo)
- ✅ Ver detalhes da instituição
- ✅ Gerenciar tenants
- ✅ Gerenciar usuários
- ✅ Filtros e busca

## 🏗️ Estrutura

```
admin-panel/
├── src/
│   ├── components/
│   │   ├── Layout.tsx          # Layout principal
│   │   └── ProtectedRoute.tsx  # Proteção de rotas
│   ├── contexts/
│   │   └── AuthContext.tsx     # Contexto de autenticação
│   ├── pages/
│   │   ├── Login.tsx           # Página de login
│   │   ├── Dashboard.tsx       # Dashboard
│   │   ├── Institutions.tsx    # Lista de instituições
│   │   ├── CreateInstitution.tsx  # Criar instituição
│   │   └── InstitutionDetail.tsx  # Detalhes da instituição
│   ├── services/
│   │   ├── api.ts              # Cliente HTTP
│   │   └── institutionService.ts  # Serviço de instituições
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

## 📝 Uso

### 1. Criar Nova Instituição

1. Acesse "Instituições" no menu
2. Clique em "Nova Instituição"
3. Preencha os dados:
   - **Instituição**: Nome, slug, CNPJ, etc.
   - **Tenant Inicial**: Nome e slug do primeiro tenant
   - **Admin**: Dados do usuário administrador
4. Clique em "Criar Instituição"

Isso criará automaticamente:
- A instituição
- O tenant inicial
- O usuário administrador
- Vínculos entre todos

### 2. Ver Detalhes

Clique em qualquer instituição para ver:
- Estatísticas (tenants, usuários, escolas)
- Lista de tenants
- Lista de usuários

### 3. Filtrar e Buscar

Na lista de instituições:
- Use a busca para filtrar por nome ou slug
- Use o filtro de status (Ativo, Pendente, etc.)

## 🎨 Personalização

### Cores

Edite `src/index.css` para alterar o tema.

### Autenticação

Por padrão, usa autenticação simples. Para produção:

1. Edite `src/contexts/AuthContext.tsx`
2. Implemente autenticação real com JWT
3. Conecte com seu backend de autenticação

## 🚀 Deploy

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

### Deploy em Vercel

```bash
vercel
```

## 🔒 Segurança

**IMPORTANTE**: Este painel deve ser:
- Hospedado em domínio separado
- Protegido com autenticação forte
- Acessível apenas pela sua equipe
- Com HTTPS obrigatório em produção

## 📦 Dependências

- React 18
- React Router 6
- Axios
- Lucide React (ícones)
- Vite

## 🤝 Integração com Backend

O painel se conecta aos endpoints:

- `POST /api/provisioning/complete` - Criar instituição completa
- `GET /api/institutions` - Listar instituições
- `GET /api/institutions/:id` - Detalhes da instituição
- `GET /api/institutions/:id/stats` - Estatísticas
- `GET /api/institutions/:id/tenants` - Tenants da instituição
- `GET /api/institutions/:id/users` - Usuários da instituição

## 📱 Responsivo

O painel é totalmente responsivo e funciona em:
- Desktop
- Tablet
- Mobile

## 🐛 Troubleshooting

### Erro de CORS

Configure o CORS no backend para aceitar requisições do painel:

```typescript
// backend/src/index.ts
app.use(cors({
  origin: ['http://localhost:5174', 'https://admin.seudominio.com']
}));
```

### Erro de Autenticação

Verifique se o token está sendo enviado corretamente:

```typescript
// src/services/api.ts
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```
