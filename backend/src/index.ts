import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { config } from "./config";

// Importar rotas organizadas por módulos
import userRoutes from "./modules/usuarios/routes/userRoutes";

// Importar rotas essenciais
import escolaRoutes from "./modules/escolas/routes/escolaRoutes";
import modalidadeRoutes from "./modules/cardapios/routes/modalidadeRoutes";
import escolaModalidadeRoutes from "./modules/guias/routes/escolaModalidadeRoutes";
import fornecedorRoutes from "./modules/contratos/routes/fornecedorRoutes";
import contratoRoutes from "./modules/contratos/routes/contratoRoutes";
import contratoProdutoRoutes from "./modules/contratos/routes/contratoProdutoRoutes";
import refeicaoRoutes from "./modules/cardapios/routes/refeicaoRoutes";
import refeicaoProdutoRoutes from "./modules/cardapios/routes/refeicaoProdutoRoutes";
import cardapioRoutes from "./modules/cardapios/routes/cardapioRoutes";
import produtoRoutes from "./modules/produtos/routes/produtoRoutes";
import produtoModalidadeRoutes from "./modules/estoque/routes/produtoModalidadeRoutes";

import estoqueCentralRoutes from "./modules/estoque/routes/estoqueCentralRoutes";
import estoqueEscolaRoutes from "./modules/estoque/routes/estoqueEscolaRoutes";
import gestorEscolaRoutes from "./modules/guias/routes/gestorEscolaRoutes";
import estoqueEscolarRoutes from "./modules/estoque/routes/estoqueEscolarRoutes";
import demandaRoutes from "./modules/estoque/routes/demandaRoutes";

import saldoContratosRoutes from "./modules/contratos/routes/saldoContratosRoutes";
import saldoContratosModalidadesRoutes from "./modules/contratos/routes/saldoContratosModalidadesRoutes";
import guiaRoutes from "./modules/guias/routes/guiaRoutes";
import entregaRoutes from "./modules/entregas/routes/entregaRoutes";
import rotaRoutes from "./modules/entregas/routes/rotaRoutes";
import pedidoRoutes from "./modules/pedidos/routes/pedidoRoutes";
import faturamentoRoutes from "./modules/pedidos/routes/faturamentoRoutes";
import demandasRoutes from "./modules/demandas/routes/demandaRoutes";
import tenantRoutes from "./routes/tenantRoutes";
import tenantConfigurationRoutes from "./routes/tenantConfigurationRoutes";
import tenantUserRoutes from "./routes/tenantUserRoutes";

import tenantPerformanceRoutes from "./routes/tenantPerformanceRoutes";
import tenantAuditRoutes from "./routes/tenantAuditRoutes";
import tenantProvisioningRoutes from "./routes/tenantProvisioningRoutes";
import tenantMonitoringRoutes from "./routes/tenantMonitoringRoutes";
import { createTenantBackupRoutes } from "./routes/tenantBackupRoutes";
import cacheRoutes from "./routes/cacheRoutes";

// Institution hierarchy routes
import institutionRoutes from "./routes/institutionRoutes";
import provisioningRoutes from "./routes/provisioningRoutes";
import systemAdminAuthRoutes from "./routes/systemAdminAuthRoutes";
import planRoutes from "./routes/planRoutes";

// Importar middleware de performance e auditoria
import { tenantPerformanceMonitor } from "./middleware/tenantPerformanceMiddleware";
import { tenantMiddleware } from "./middleware/tenantMiddleware";
import AuditMiddleware from "./middleware/auditMiddleware";
import { tenantRealtimeMonitoringService } from "./services/tenantRealtimeMonitoringService";
import { createServer } from 'http';
import { cacheMiddlewareStack } from "./middleware/cacheMiddleware";
import { initializeRedisCache } from "./config/redis";

// Módulo de gás removido



// Importar rotas preservadas do sistema escolar


// Importar configuração do banco de dados baseada no ambiente
const db = process.env.VERCEL === '1' ? require("./database-vercel") : require("./database");

dotenv.config();

const app = express();
const httpServer = createServer(app);
app.use(express.json());

// Configuração CORS usando config.json
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    console.log('🔍 CORS Check - Origin:', origin);
    
    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS: Permitido (sem origin)');
      return callback(null, true);
    }
    
    // Em desenvolvimento, permitir qualquer origem
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ CORS: Permitido (desenvolvimento)');
      return callback(null, true);
    }
    
    // Sempre permitir domínios Vercel
    if (origin.includes('.vercel.app')) {
      console.log('✅ CORS: Permitido (Vercel)');
      return callback(null, true);
    }
    
    // Em produção, verificar lista de origens permitidas
    const allowedOrigins = config.backend.cors.origin;
    if (Array.isArray(allowedOrigins)) {
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
          // Suporte para wildcards como *.vercel.app
          const pattern = allowedOrigin.replace(/\*/g, '.*').replace(/\./g, '\\.');
          return new RegExp(`^${pattern}$`).test(origin);
        }
        return allowedOrigin === origin;
      });
      
      if (isAllowed) {
        console.log('✅ CORS: Permitido (lista)');
      } else {
        console.log('❌ CORS: Bloqueado - Origin não está na lista permitida');
        console.log('   Origens permitidas:', allowedOrigins);
      }
      
      return callback(null, isAllowed);
    }
    
    const allowed = allowedOrigins === true || allowedOrigins === origin;
    console.log(allowed ? '✅ CORS: Permitido' : '❌ CORS: Bloqueado');
    return callback(null, allowed);
  },
  credentials: config.backend.cors.credentials,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
    "X-Tenant-ID",
    "X-Tenant-Subdomain",
    "X-Tenant-Domain"
  ],
  exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
  maxAge: 86400, // 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// CORS já está configurado corretamente acima com as origens específicas
// Removido middleware que forçava '*' e conflitava com credentials: true

// Import admin data routes
import adminDataRoutes from "./routes/adminDataRoutes";

// System admin routes (BEFORE tenant middleware - no tenant required)
app.use("/api/system-admin/auth", systemAdminAuthRoutes);
app.use("/api/system-admin/data", adminDataRoutes);
app.use("/api/institutions", institutionRoutes);
app.use("/api/provisioning", provisioningRoutes);
app.use("/api/plans", planRoutes);

// Middleware de tenant (deve vir antes das outras rotas)
app.use(tenantMiddleware({ 
  required: false, 
  fallbackToDefault: true,
  skipPaths: ['/health', '/api/test-db', '/api/performance', '/']
}));

// Middleware de monitoramento de performance
app.use(tenantPerformanceMonitor.monitor());

// Middleware de auditoria (deve vir após o tenant middleware)
app.use(AuditMiddleware.auditLogger());

// Cache middleware stack
app.use(cacheMiddlewareStack);



// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await db.testConnection();
    
    // Detectar URL baseado no ambiente
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
    const apiUrl = isVercel 
      ? 'https://gestaoescolar-backend.vercel.app'
      : (config as any).apiUrl || 'http://localhost:3000';
    
    res.json({
      status: "ok",
      database: "PostgreSQL",
      dbConnection: "connected",
      timestamp: new Date().toISOString(),
      apiUrl,
      environment: process.env.NODE_ENV || 'development',
      debug: {
        nodeEnv: process.env.NODE_ENV,
        jwtSecretFromEnv: process.env.JWT_SECRET ? 'Configurado' : 'Não configurado',
        vercelEnv: process.env.VERCEL,
        jwtEnvKeys: Object.keys(process.env).filter(key => key.includes('JWT'))
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "PostgreSQL",
      dbConnection: "error",
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Endpoint de teste PostgreSQL
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as current_time, version()');
    res.json({
      success: true,
      message: "PostgreSQL funcionando!",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro no PostgreSQL",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});





// Registrar rotas essenciais
app.use("/api/usuarios", userRoutes);
app.use("/api/auth", userRoutes); // compatibilidade para login

// Registrar rotas essenciais
app.use("/api/escolas", escolaRoutes);
app.use("/api/modalidades", modalidadeRoutes);
app.use("/api/escola-modalidades", escolaModalidadeRoutes);
app.use("/api/fornecedores", fornecedorRoutes);
app.use("/api/contratos", contratoRoutes);
app.use("/api/contrato-produtos", contratoProdutoRoutes);

app.use("/api/refeicoes", refeicaoRoutes);
app.use("/api/refeicao-produtos", refeicaoProdutoRoutes);
app.use("/api/cardapios", cardapioRoutes);
app.use("/api/demandas", demandaRoutes);
app.use("/api/produtos", produtoRoutes);
app.use("/api/produto-modalidades", produtoModalidadeRoutes);
app.use("/api/estoque-central", estoqueCentralRoutes);
app.use("/api/estoque-escola", estoqueEscolaRoutes);
app.use("/api/gestor-escola", gestorEscolaRoutes);
app.use("/api/estoque-escolar", estoqueEscolarRoutes);

app.use("/api/saldo-contratos", saldoContratosRoutes);
app.use("/api/saldo-contratos-modalidades", saldoContratosModalidadesRoutes);
app.use("/api/guias", guiaRoutes);
app.use("/api/entregas", entregaRoutes);
app.use("/api/entregas", rotaRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/faturamentos", faturamentoRoutes);
app.use("/api/demandas", demandasRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api", tenantConfigurationRoutes);
app.use("/api/tenant-users", tenantUserRoutes);
app.use("/api/performance", tenantPerformanceRoutes);
app.use("/api/audit", tenantAuditRoutes);
app.use("/api/provisioning", tenantProvisioningRoutes);
app.use("/api/monitoring", tenantMonitoringRoutes);
app.use("/api/backup", createTenantBackupRoutes(db.pool));
app.use("/api/cache", cacheRoutes);
app.use("/api/configuracoes", require("./routes/configuracaoRoutes").default);

// Institution hierarchy routes already registered before tenant middleware

// Rotas de gás removidas



// Rotas preservadas do sistema escolar




// Rota raiz - informações da API
app.get("/", (req, res) => {
  res.json({
    name: "Sistema de Gestão Escolar API",
    version: "2.0.0",
    status: "online",
    database: "PostgreSQL",
    message: "API funcionando corretamente",
    endpoints: {
      health: "/health",
      database_test: "/api/test-db",
      performance: "/api/performance",
      documentation: "Rotas disponíveis listadas abaixo"
    },
    availableRoutes: [
      "/api/usuarios",
      "/api/auth",
      "/api/escolas",
      "/api/modalidades",
      "/api/escola-modalidades",

      "/api/fornecedores",
      "/api/contratos",
      "/api/contrato-produtos",
      "/api/pedidos",
      "/api/refeicoes",
      "/api/cardapios",
      "/api/demanda",
      "/api/produtos",
      "/api/produtos-orm",
      "/api/produto-modalidades",


      "/api/estoque-moderno",
      "/api/estoque-escolar",
      "/api/tenants",
      "/api/performance",
      "/api/backup",
      "/api/test-db",
      "/health"
    ],
    timestamp: new Date().toISOString()
  });
});

// Middleware para rotas não encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Rota não encontrada",
    path: req.originalUrl,
    message: "Sistema migrado para PostgreSQL - apenas rotas essenciais ativas",
    suggestion: "Acesse '/' para ver todas as rotas disponíveis",
    availableRoutes: [
      "/api/usuarios",
      "/api/auth",
      "/api/escolas",
      "/api/modalidades",
      "/api/escola-modalidades",

      "/api/fornecedores",
      "/api/contratos",
      "/api/contrato-produtos",
      "/api/pedidos",
      "/api/refeicoes",
      "/api/cardapios",
      "/api/demanda",
      "/api/produtos",
      "/api/produtos-orm",
      "/api/produto-modalidades",


      "/api/estoque-moderno",
      "/api/estoque-escolar",
      "/api/backup",
      "/api/test-db",
      "/health"
    ],
  });
});

// Middleware global de erro
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Erro global:", err);
  res.status(500).json({
    error: "Erro interno do servidor",
    details: err.message,
    database: "PostgreSQL"
  });
});

// Inicializar servidor
async function iniciarServidor() {
  try {
    // Testar conexão PostgreSQL
    console.log('🔍 Testando conexão PostgreSQL...');
    const conectado = await db.testConnection();

    if (conectado) {
      console.log('✅ PostgreSQL conectado com sucesso!');

      // Verificar tabelas
      const tabelas = await db.query(`
        SELECT COUNT(*) as total 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      console.log(`📊 Tabelas disponíveis: ${tabelas.rows[0].total}`);

      // ORM removido - usando SQL puro
      console.log('✅ Sistema configurado para usar SQL puro');

      // Initialize cache system
      console.log('🔧 Inicializando sistema de cache...');
      await initializeRedisCache();

      // Inicializar módulos
      console.log('🔧 Inicializando módulos...');
      const { initEstoqueCentral } = await import('./modules/estoque/controllers/estoqueCentralController');
      await initEstoqueCentral();



      console.log('✅ Módulos inicializados com sucesso!');

      // Initialize real-time monitoring service
      console.log('🔄 Inicializando serviço de monitoramento em tempo real...');
      tenantRealtimeMonitoringService.initialize(httpServer);

      // Iniciar servidor
      httpServer.listen(config.backend.port, config.backend.host, () => {
        console.log(`🚀 Servidor PostgreSQL rodando em ${config.backend.host}:${config.backend.port}`);

        // Tratar CORS origins que pode ser array ou boolean
        const corsOrigins = Array.isArray(config.backend.cors.origin)
          ? config.backend.cors.origin.join(', ')
          : config.backend.cors.origin === true
            ? 'Qualquer origem (desenvolvimento)'
            : String(config.backend.cors.origin);

        console.log(`📡 CORS Origins: ${corsOrigins}`);
        console.log(`🐘 Banco: ${config.database.host}:${config.database.port}/${config.database.name}`);
        console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Foreign Keys CASCADE: Ativas`);
      });

    } else {
      console.error('❌ Falha na conexão PostgreSQL');
      console.error('   Verifique se o PostgreSQL está rodando');
      console.error('   Verifique as credenciais em database-pg.js');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
}

// Inicializar apenas se não estiver no Vercel
if (process.env.VERCEL !== '1') {
  iniciarServidor();
}

// Exportar app para Vercel (deve vir depois da configuração)
export default app;

// Para compatibilidade CommonJS
module.exports = app;
