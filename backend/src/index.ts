import express from "express";
import path from "path";
import fs from "fs";
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
import estoqueEscolarRoutes from "./modules/estoque/routes/estoqueEscolarRoutes";
// import demandaRoutes from "./modules/estoque/routes/demandaRoutes"; // REMOVIDO - usar demandasRoutes do módulo demandas

import saldoContratosModalidadesRoutes from "./modules/contratos/routes/saldoContratosModalidadesRoutes";
import guiaRoutes from "./modules/guias/routes/guiaRoutes";
import entregaRoutes from "./modules/entregas/routes/entregaRoutes";
import rotaRoutes from "./modules/entregas/routes/rotaRoutes";
import pedidoRoutes from "./modules/pedidos/routes/pedidoRoutes";
import faturamentoRoutes from "./modules/pedidos/routes/faturamentoRoutes";
import demandasRoutes from "./modules/demandas/routes/demandaRoutes";

import { createServer } from 'http';
import { initializeRedisCache } from "./config/redis";
import { createGuiaTables, createEssentialTables } from "./modules/guias/models/Guia";

// Módulo de gás removido



// Importar rotas preservadas do sistema escolar


// Importar configuração do banco de dados baseada no ambiente
const db = process.env.VERCEL === '1' ? require("./database-vercel") : require("./database");

dotenv.config();

const app = express();
const httpServer = createServer(app);
app.use(express.json());

async function ensureProdutoComposicaoNutricionalTable() {
  const sqlPath = path.join(__dirname, "migrations", "create_produto_composicao_nutricional.sql");
  if (fs.existsSync(sqlPath)) {
    const sql = fs.readFileSync(sqlPath, "utf8");
    await db.query(sql);
  }

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
    "Access-Control-Request-Headers"
  ],
  exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
  maxAge: 86400, // 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

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
app.use("/api/permissoes", require("./routes/permissoesRoutes").default);

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
// app.use("/api/demandas", demandaRoutes); // REMOVIDO - rota duplicada, usar demandasRoutes
app.use("/api/produtos", produtoRoutes);
app.use("/api/produto-modalidades", produtoModalidadeRoutes);
app.use("/api/estoque-central", estoqueCentralRoutes);
app.use("/api/estoque-escolar", estoqueEscolarRoutes);

app.use("/api/saldo-contratos-modalidades", saldoContratosModalidadesRoutes);
app.use("/api/guias", guiaRoutes);
app.use("/api/entregas", entregaRoutes);
app.use("/api/entregas", rotaRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/faturamentos", faturamentoRoutes);
app.use("/api/demandas", demandasRoutes);


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

if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') {
  (async () => {
    try {
      await createEssentialTables();
    } catch (e) {
      console.error('⚠️ Falha ao criar tabelas essenciais (Vercel):', e);
    }

    try {
      await createGuiaTables();
    } catch (e) {
      console.error('⚠️ Falha ao criar tabelas de guias (Vercel):', e);
    }

    try {
      await ensureProdutoComposicaoNutricionalTable();
    } catch (e) {
      console.error('⚠️ Falha ao garantir tabela produto_composicao_nutricional (Vercel):', e);
    }
  })();
}

// Exportar app para Vercel (deve vir depois da configuração)
export default app;

// Para compatibilidade CommonJS
module.exports = app;

// Inicialização de schema essencial em ambiente Vercel (cold start)
(async function safeInitSchemaForVercel() {
  if (process.env.VERCEL === '1') {
    try {
      await createEssentialTables();
      await createGuiaTables();
      await ensureProdutoComposicaoNutricionalTable();
      console.log('✅ Schema essencial de guias/escolas garantido (Vercel)');
    } catch (e) {
      console.error('⚠️ Falha ao inicializar schema essencial (Vercel):', e);
    }
  }
})();
