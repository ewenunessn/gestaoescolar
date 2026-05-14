import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import cors from "cors";

// Carregar variÃ¡veis de ambiente PRIMEIRO
dotenv.config();

import { config } from "./config/config";

// Importar middlewares
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authenticatedUserLimiter, ipLimiter, loginLimiter } from './middleware/rateLimiter';
import { balancedCompression } from './middleware/compression';
import { apiResponseEnvelope } from './http/apiResponse';
import { registerOpenApiDocs } from './openapi/apiDocs';

import { requireAdmin } from "./middleware/adminMiddleware";
import { ensureAdminTables } from "./modules/usuarios/services/adminUsuariosSchema";
import { registerBffRoutes } from "./bff/registerBffRoutes";
import { gatewayClientChannelMiddleware } from "./gateway/clientChannel";
import { registerApiRoutes } from "./routes/registerApiRoutes";

import { createServer } from 'http';
import { initRedis } from "./config/redis";
import { createGuiaTables, createEssentialTables } from "./modules/guias/models/Guia";
import { buildEntregaIdempotencySchemaSql } from "./modules/entregas/models/entregaIdempotency";
import { ensureEstoqueLedgerSchema } from "./modules/estoque/services/estoqueSchemaService";

import db from "./database";
import { authenticateToken, optionalAuth } from './middleware/authMiddleware';

// Normalizar CORS origins â€” remover entradas nÃ£o-string para seguranÃ§a
const rawOrigin = config.backend.cors.origin;
const corsOrigin = typeof rawOrigin === 'boolean'
  ? rawOrigin
  : Array.isArray(rawOrigin)
    ? rawOrigin.filter((o): o is string => typeof o === 'string')
    : [String(rawOrigin)];

const corsOptions = {
  origin: corsOrigin,
  credentials: config.backend.cors.credentials,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 200
};

const app = express();

// CORS deve ser o PRIMEIRO middleware â€” antes de qualquer rota
app.use(cors(corsOptions));
// Responder OPTIONS imediatamente para preflight
app.options('*', cors(corsOptions));
app.use(apiResponseEnvelope);

// Rate limit por IP antes de JSON/auth para barrar abuso com baixo custo.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' || req.path === '/health') return next();
  return ipLimiter(req, res, next);
});

app.use(express.json({ limit: '10mb' }));
registerOpenApiDocs(app);

// Limite especifico para login nos aliases legados.
app.post(['/api/auth/login', '/api/usuarios/login'], loginLimiter);

async function ensureProdutoComposicaoNutricionalTable() {
  const exists = await db.get(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    ['produto_composicao_nutricional']
  );
  if (!exists) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS produto_composicao_nutricional (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        energia_kcal DECIMAL(8,2),
        proteina_g DECIMAL(8,2),
        carboidratos_g DECIMAL(8,2),
        lipideos_g DECIMAL(8,2),
        fibra_alimentar_g DECIMAL(8,2),
        sodio_mg DECIMAL(8,2),
        acucares_g DECIMAL(8,2),
        gorduras_saturadas_g DECIMAL(8,2),
        gorduras_trans_g DECIMAL(8,2),
        colesterol_mg DECIMAL(8,2),
        calcio_mg DECIMAL(8,2),
        ferro_mg DECIMAL(8,2),
        vitamina_e_mg DECIMAL(8,2),
        vitamina_b1_mg DECIMAL(8,2),
        criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(produto_id)
      )
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_produto_composicao_produto_id 
      ON produto_composicao_nutricional(produto_id)
    `);
  }
}

// Gateway interno: identifica canal legado /api ou BFF por cliente.
app.use(gatewayClientChannelMiddleware);

// Auth opcional popula req.user quando houver JWT; rotas protegidas continuam exigindo authenticateToken.
app.use(optionalAuth);

// Rate limiting por usuario depois de JWT; cai para IP em rotas publicas.
app.use(['/api', '/bff'], (req, res, next) => {
  // NÃ£o aplicar rate limit em rotas de geraÃ§Ã£o (operaÃ§Ãµes longas e legÃ­timas)
  if (req.path.startsWith('/planejamento-compras/gerar')) return next();
  return authenticatedUserLimiter(req, res, next);
});

// Compressao precisa envolver handlers de rota, mas fica depois de rate limit/auth.
app.use(balancedCompression);

// Servir arquivos estÃ¡ticos
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
      environment: process.env.NODE_ENV || 'development'
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

// Endpoint operacional de banco restrito a administradores
app.get("/api/test-db", authenticateToken, requireAdmin, async (req, res) => {
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

registerBffRoutes(app);
registerApiRoutes(app);

// Rota raiz - informaÃ§Ãµes da API
app.get("/", (req, res) => {
  res.json({
    name: "Sistema de GestÃ£o Escolar API",
    version: "2.0.0",
    status: "online",
    database: "PostgreSQL",
    message: "API funcionando corretamente",
    endpoints: {
      health: "/health",
      documentation: "Rotas disponÃ­veis listadas abaixo"
    },
    availableRoutes: [
      "/api/usuarios", "/api/auth",
      "/api/escolas", "/api/modalidades", "/api/escola-modalidades",
      "/api/fornecedores", "/api/contratos", "/api/contrato-produtos",
      "/api/refeicoes", "/api/refeicao-produtos", "/api/refeicao-produto-modalidade",
      "/api/refeicao-calculos",
      "/api/cardapios", "/api/tipos-refeicao", "/api/nutricionistas",
      "/api/demandas",
      "/api/produtos", "/api/produto-modalidades", "/api/unidades-medida",
      "/api/estoque-central", "/api/estoque-escolar",
      "/api/saldo-contratos-modalidades",
      "/api/guias",
      "/api/entregas",
      "/api/compras", "/api/planejamento-compras",
      "/api/faturamentos",
      "/api/recebimentos",
      "/api/instituicao", "/api/pnae", "/api/periodos",
      "/api/escola-portal", "/api/calendario-letivo",
      "/api/taco", "/api/grupos-ingredientes",
      "/api/solicitacoes-alimentos",
      "/api/dashboard", "/api/notificacoes", "/api/disparos-notificacao",
      "/api/permissoes", "/api/admin",
      "/bff/web", "/bff/app", "/bff/portal", "/bff/chatbot"
    ],
    timestamp: new Date().toISOString()
  });
});

// Middleware para rotas nÃ£o encontradas (404)
app.use(notFoundHandler);

// Middleware global de tratamento de erros (deve ser o Ãºltimo)
app.use(errorHandler);

// Inicializar servidor
async function iniciarServidor() {
  try {
    // Testar conexÃ£o PostgreSQL
    console.log('ðŸ” Testando conexÃ£o PostgreSQL...');
    const conectado = await db.testConnection();

    if (conectado) {
      console.log('âœ… PostgreSQL conectado com sucesso!');

      // Verificar tabelas
      const tabelas = await db.query(`
        SELECT COUNT(*) as total 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      console.log(`ðŸ“Š Tabelas disponÃ­veis: ${tabelas.rows[0].total}`);

      console.log('âœ… Sistema configurado para usar SQL puro');

      // Initialize cache system
      console.log('ðŸ”§ Inicializando sistema de cache...');
      await initRedis();  // Tenta conectar ao Redis (fallback para memÃ³ria se falhar)

      // Inicializar mÃ³dulos
      console.log('ðŸ”§ Inicializando mÃ³dulos...');

      try {
        await createEssentialTables();
      } catch (e) {
        console.error('âš ï¸ Falha ao criar tabelas essenciais (continuando):', e);
      }

      try {
        await ensureAdminTables();
      } catch (e) {
        console.error('âš ï¸ Falha ao criar tabelas de admin (continuando):', e);
      }

      try {
        await createGuiaTables();
      } catch (e) {
        console.error('âš ï¸ Falha ao criar tabelas de guias (continuando):', e);
      }

      try {
        await ensureProdutoComposicaoNutricionalTable();
        await ensureEstoqueLedgerSchema();
        await db.query(buildEntregaIdempotencySchemaSql());
      } catch (e) {
        console.error('âš ï¸ Falha ao garantir tabela produto_composicao_nutricional (continuando):', e);
      }

      console.log('âœ… MÃ³dulos inicializados com sucesso!');

      console.log('âœ… ServiÃ§os simplificados inicializados');

      // Iniciar servidor com host/porta dinÃ¢micos e fallback
      const DEFAULT_PORT = 3000;
      const HOST = process.env.HOST || '0.0.0.0';
      const BASE_PORT = Number(process.env.PORT) || (config as any).port || DEFAULT_PORT;
      let currentPort = BASE_PORT;

      const startListening = (retries = 5) => {
        const server = createServer(app).listen(currentPort, HOST, () => {
          console.log(`ðŸš€ Servidor PostgreSQL rodando em ${HOST}:${currentPort}`);

          // Tratar CORS origins que pode ser array ou boolean
          const corsOrigins = Array.isArray(config.backend.cors.origin)
            ? config.backend.cors.origin.join(', ')
            : config.backend.cors.origin === true
              ? 'Qualquer origem (desenvolvimento)'
              : String(config.backend.cors.origin);

          console.log(`ðŸ“¡ CORS Origins: ${corsOrigins}`);
          console.log(`ðŸ˜ Banco: ${config.database.host}:${config.database.port}/${config.database.name}`);
          console.log(`ðŸŒ Ambiente: ${process.env.NODE_ENV || 'development'}`);
          console.log(`ðŸ”— Foreign Keys CASCADE: Ativas`);


        });
        server.once('error', (err: any) => {
          if (err && err.code === 'EADDRINUSE' && retries > 0) {
            console.warn(`âš ï¸ Porta ${currentPort} em uso. Tentando ${currentPort + 1}...`);
            currentPort += 1;
            setTimeout(() => startListening(retries - 1), 200);
          } else {
            console.error('âŒ Erro ao iniciar o servidor:', err);
            process.exit(1);
          }
        });
      };
      startListening();

    } else {
      console.error('âŒ Falha na conexÃ£o PostgreSQL');
      console.error('   Verifique se o PostgreSQL estÃ¡ rodando');
      console.error('   Verifique as credenciais em database-pg.js');
      process.exit(1);
    }

  } catch (error) {
    console.error('âŒ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
}

// Inicializar apenas se nÃ£o estiver no Vercel
if (process.env.VERCEL !== '1') {
  iniciarServidor();
}

// InicializaÃ§Ã£o de schema essencial para Vercel (unificado em um Ãºnico lugar)
if (process.env.VERCEL === '1') {
  (async function initVercelSchema() {
    try {
      await createEssentialTables();
      await createGuiaTables();
      await ensureProdutoComposicaoNutricionalTable();
      await ensureEstoqueLedgerSchema();
      await db.query(buildEntregaIdempotencySchemaSql());
      console.log('âœ… Schema essencial garantido (Vercel)');
    } catch (e) {
      console.error('âš ï¸ Falha ao inicializar schema (Vercel):', e);
    }
  })();
}

// Exportar app para Vercel e outros consumidores
export default app;
