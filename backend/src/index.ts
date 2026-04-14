import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import cors from "cors";

// Carregar variáveis de ambiente PRIMEIRO
dotenv.config();

import { config } from "./config/config";

// Importar middlewares
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter, loginLimiter } from './middleware/rateLimiter';
import { paginationMiddleware, validatePaginationParams } from './middleware/pagination';
import { balancedCompression } from './middleware/compression';
import monitoringRoutes from './modules/sistema/routes/monitoringRoutes';

// Importar rotas organizadas por módulos
import userRoutes from "./modules/usuarios/routes/userRoutes";
import adminUsuariosRoutes from "./modules/usuarios/routes/adminUsuariosRoutes";
import { ensureAdminTables } from "./modules/usuarios/controllers/adminUsuariosController";

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
import tipoRefeicaoRoutes from "./modules/cardapios/routes/tipoRefeicaoRoutes";
import produtoRoutes from "./modules/produtos/routes/produtoRoutes";
import produtoModalidadeRoutes from "./modules/estoque/routes/produtoModalidadeRoutes";

import estoqueCentralRoutes from "./modules/estoque/routes/estoqueCentralRoutes";
import estoqueEscolarRoutes from "./modules/estoque/routes/estoqueEscolarRoutes";
// import demandaRoutes from "./modules/estoque/routes/demandaRoutes"; // REMOVIDO - usar demandasRoutes do módulo demandas

import saldoContratosModalidadesRoutes from "./modules/contratos/routes/saldoContratosModalidadesRoutes";
import guiaRoutes from "./modules/guias/routes/guiaRoutes";
import entregaRoutes from "./modules/entregas/routes/entregaRoutes";
import rotaRoutes from "./modules/entregas/routes/rotaRoutes";
import compraRoutes from "./modules/compras/routes/compraRoutes";
import faturamentoRoutes from "./modules/faturamentos/routes/faturamentoRoutes";
import demandasRoutes from "./modules/demandas/routes/demandaRoutes";
import recebimentoRoutes from "./modules/recebimentos/routes/recebimentoRoutes";
import instituicaoRoutes from "./modules/sistema/routes/instituicao";
import pnaeRoutes from "./modules/sistema/routes/pnaeRoutes";
import nutricionistaRoutes from "./modules/nutricao/routes/nutricionistaRoutes";
import planejamentoComprasRoutes from "./modules/compras/routes/planejamentoComprasRoutes";
import periodosRoutes from "./modules/sistema/routes/periodosRoutes";
import escolaPortalRoutes from "./modules/escolas/routes/escolaPortalRoutes";
import calendarioLetivoRoutes from "./modules/sistema/routes/calendarioLetivoRoutes";
import tacoRoutes from "./modules/nutricao/routes/tacoRoutes";
import gruposIngredientesRoutes from "./modules/nutricao/routes/gruposIngredientesRoutes";
import solicitacoesAlimentosRoutes from "./modules/solicitacoes/routes/solicitacoesAlimentosRoutes";
import dashboardRoutes from "./modules/sistema/routes/dashboardRoutes";
import notificacoesRoutes from "./modules/sistema/routes/notificacoesRoutes";
import disparosNotificacaoRoutes from "./modules/sistema/routes/disparosNotificacaoRoutes";
import unidadeMedidaRoutes from "./modules/unidades/routes/unidadeMedidaRoutes";
import debugEnvRoutes from "./routes/debug-env";

import { createServer } from 'http';
import { initRedis } from "./config/redis";
import { createGuiaTables, createEssentialTables } from "./modules/guias/models/Guia";

// Módulo de gás removido



// Importar rotas preservadas do sistema escolar


// Importar configuração do banco de dados baseada no ambiente
const db = process.env.VERCEL === '1' ? require("./database-vercel") : require("./database");

// Normalizar CORS origins — remover entradas não-string para segurança
const rawOrigin = config.backend.cors.origin;
const allowedOrigins = Array.isArray(rawOrigin)
  ? rawOrigin.filter((o): o is string => typeof o === 'string')
  : [String(rawOrigin)];

const corsOptions = {
  origin: allowedOrigins,
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
const httpServer = createServer(app);

// CORS deve ser o PRIMEIRO middleware — antes de qualquer rota
app.use(cors(corsOptions));
// Responder OPTIONS imediatamente para preflight
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));

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
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(produto_id)
      )
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_produto_composicao_produto_id 
      ON produto_composicao_nutricional(produto_id)
    `);
  }
}

// Middlewares de otimização
app.use(balancedCompression);  // Compressão de respostas
app.use(paginationMiddleware);  // Helpers de paginação
app.use(validatePaginationParams);  // Validação de parâmetros

// Rate limiting geral — excluir rotas de operações pesadas
app.use('/api', (req, res, next) => {
  // Não aplicar rate limit em rotas de geração (operações longas e legítimas)
  if (req.path.startsWith('/planejamento-compras/gerar')) return next();
  return generalLimiter(req, res, next);
});

// CORS já está configurado corretamente acima com as origens específicas
// Removido middleware que forçava '*' e conflitava com credentials: true

// Admin routes removed

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

// Endpoint temporário para debug de usuários
app.get("/api/debug/users", async (req, res) => {
  try {
    const result = await db.query('SELECT id, nome, email, tipo, ativo FROM usuarios LIMIT 5');
    res.json({
      success: true,
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});





// Registrar rotas essenciais
app.use("/api/usuarios", userRoutes);
app.use("/api/auth", userRoutes); // compatibilidade para login
app.use("/api/permissoes", require("./modules/sistema/routes/permissoesRoutes").default);
app.use("/api/admin", adminUsuariosRoutes);

// Registrar rotas essenciais
app.use("/api/escolas", escolaRoutes);
app.use("/api/modalidades", modalidadeRoutes);
app.use("/api/escola-modalidades", escolaModalidadeRoutes);
app.use("/api/fornecedores", fornecedorRoutes);
app.use("/api/contratos", contratoRoutes);
app.use("/api/contrato-produtos", contratoProdutoRoutes);

app.use("/api/refeicoes", refeicaoRoutes);
app.use("/api/refeicao-produtos", refeicaoProdutoRoutes);
app.use("/api/refeicao-produto-modalidade", require("./modules/nutricao/routes/refeicaoProdutoModalidadeRoutes").default);
app.use("/api", require("./modules/nutricao/routes/refeicaoCalculosRoutes").default); // Cálculos automáticos
app.use("/api/cardapios", cardapioRoutes);
app.use("/api/tipos-refeicao", tipoRefeicaoRoutes);
app.use("/api/nutricionistas", nutricionistaRoutes);
// app.use("/api/demandas", demandaRoutes); // REMOVIDO - rota duplicada, usar demandasRoutes
app.use("/api/produtos", produtoRoutes);
app.use("/api/produto-modalidades", produtoModalidadeRoutes);
app.use("/api/unidades-medida", unidadeMedidaRoutes);
app.use("/api/estoque-central", estoqueCentralRoutes);
app.use("/api/estoque-escolar", estoqueEscolarRoutes);

app.use("/api/saldo-contratos-modalidades", saldoContratosModalidadesRoutes);
app.use("/api/guias", guiaRoutes);
app.use("/api/entregas", entregaRoutes);
app.use("/api/entregas", rotaRoutes);
app.use("/api/compras", compraRoutes);
app.use("/api/faturamentos", faturamentoRoutes);
app.use("/api/demandas", demandasRoutes);
app.use("/api/recebimentos", recebimentoRoutes);
app.use("/api/instituicao", instituicaoRoutes);
app.use("/api/pnae", pnaeRoutes);
app.use("/api/planejamento-compras", planejamentoComprasRoutes);
app.use("/api/periodos", periodosRoutes);
app.use("/api/escola-portal", escolaPortalRoutes);
app.use("/api", calendarioLetivoRoutes);
app.use("/api/taco", tacoRoutes);
app.use("/api/grupos-ingredientes", gruposIngredientesRoutes);
app.use("/api/solicitacoes-alimentos", solicitacoesAlimentosRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notificacoes", notificacoesRoutes);
app.use("/api/disparos-notificacao", disparosNotificacaoRoutes);
app.use("/api", debugEnvRoutes); // Debug endpoint


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
      "/api/compras",
      "/api/refeicoes",
      "/api/cardapios",
      "/api/demanda",
      "/api/produtos",
      "/api/produtos-orm",
      "/api/produto-modalidades",


      "/api/estoque-moderno",
      
      "/api/performance",
      "/api/backup",
      "/api/test-db",
      "/health"
    ],
    timestamp: new Date().toISOString()
  });
});

// Middleware para rotas não encontradas (404)
app.use(notFoundHandler);

// Middleware global de tratamento de erros (deve ser o último)
app.use(errorHandler);

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
      await initRedis();  // Tenta conectar ao Redis (fallback para memória se falhar)

      // Inicializar módulos
      console.log('🔧 Inicializando módulos...');

      try {
        await createEssentialTables();
      } catch (e) {
        console.error('⚠️ Falha ao criar tabelas essenciais (continuando):', e);
      }

      try {
        await ensureAdminTables();
      } catch (e) {
        console.error('⚠️ Falha ao criar tabelas de admin (continuando):', e);
      }

      try {
        await createGuiaTables();
      } catch (e) {
        console.error('⚠️ Falha ao criar tabelas de guias (continuando):', e);
      }

      try {
        await ensureProdutoComposicaoNutricionalTable();
      } catch (e) {
        console.error('⚠️ Falha ao garantir tabela produto_composicao_nutricional (continuando):', e);
      }



      console.log('✅ Módulos inicializados com sucesso!');

      // Real-time monitoring service removed
      console.log('✅ Serviços simplificados inicializados');

      // Iniciar servidor com host/porta dinâmicos e fallback
      const HOST = process.env.HOST || '0.0.0.0';
      const BASE_PORT = Number(process.env.PORT) || (config as any).port || 3000;
      let currentPort = BASE_PORT;

      const startListening = (retries = 5) => {
        const server = httpServer.listen(currentPort, HOST, () => {
          console.log(`🚀 Servidor PostgreSQL rodando em ${HOST}:${currentPort}`);

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
        server.on('error', (err: any) => {
          if (err && err.code === 'EADDRINUSE' && retries > 0) {
            console.warn(`⚠️ Porta ${currentPort} em uso. Tentando ${currentPort + 1}...`);
            currentPort += 1;
            setTimeout(() => startListening(retries - 1), 200);
          } else {
            console.error('❌ Erro ao iniciar o servidor:', err);
            process.exit(1);
          }
        });
      };
      startListening();

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

// Inicialização de schema essencial para Vercel (unificado em um único lugar)
if (process.env.VERCEL === '1') {
  (async function initVercelSchema() {
    try {
      await createEssentialTables();
      await createGuiaTables();
      await ensureProdutoComposicaoNutricionalTable();
      console.log('✅ Schema essencial garantido (Vercel)');
    } catch (e) {
      console.error('⚠️ Falha ao inicializar schema (Vercel):', e);
    }
  })();
}

// Exportar app para Vercel e outros consumidores
export default app;
