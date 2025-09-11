import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { config } from "./config";

// Importar apenas rotas essenciais que funcionam com PostgreSQL
import userRoutes from "./routes/userRoutes";

// Importar rotas essenciais
import escolaRoutes from "./routes/escolaRoutes";
import modalidadeRoutes from "./routes/modalidadeRoutes";
import escolaModalidadeRoutes from "./routes/escolaModalidadeRoutes";
import carrinhoRoutes from "./routes/carrinhoRoutes";
import fornecedorRoutes from "./routes/fornecedorRoutes";
import contratoRoutes from "./routes/contratoRoutes";
import contratoProdutoRoutes from "./routes/contratoProdutoRoutes";
import { createAditivoContratoRoutes } from "./routes/aditivoContratoRoutes";

import refeicaoRoutes from "./routes/refeicaoRoutes";
import refeicaoProdutoRoutes from "./routes/refeicaoProdutoRoutes";
import cardapioRoutes from "./routes/cardapioRoutes";
import demandaRoutes from "./routes/demandaRoutes";
import produtoRoutes from "./routes/produtoRoutes";
import produtoModalidadeRoutes from "./routes/produtoModalidadeRoutes";
// Importar rotas modernas
import pedidoModernoRoutes from "./routes/pedidoModernoRoutes";
import recebimentoSimplificadoRoutes from "./routes/recebimentoSimplificadoRoutes";
import estoqueCentralRoutes from "./routes/estoqueCentralRoutes";
import estoqueEscolaRoutes from "./routes/estoqueEscolaRoutes";
import gestorEscolaRoutes from "./routes/gestorEscolaRoutes";
import estoqueEscolarRoutes from "./routes/estoqueEscolarRoutes";

import faturamentoModalidadesRoutes from "./routes/faturamentoModalidadesRoutes";
import faturamentoInterfaceRoutes from "./routes/faturamentoInterface";
import saldoContratosRoutes from "./routes/saldoContratosRoutes";
// Módulo de gás removido



// Importar rotas preservadas do sistema escolar


// Importar configuração SQLite
const db = require("./database");

dotenv.config();

const app = express();
app.use(express.json());

// Configuração CORS usando config.json
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Em desenvolvimento, permitir qualquer origem
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Em produção, verificar lista de origens permitidas
    const allowedOrigins = config.backend.cors.origin;
    if (Array.isArray(allowedOrigins)) {
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
          // Suporte para wildcards como *.vercel.app
          const pattern = allowedOrigin.replace(/\*/g, '.*');
          return new RegExp(pattern).test(origin);
        }
        return allowedOrigin === origin;
      });
      return callback(null, isAllowed);
    }
    
    return callback(null, allowedOrigins === true || allowedOrigins === origin);
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



// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await db.testConnection();
    res.json({
      status: "ok",
      database: "PostgreSQL",
      dbConnection: "connected",
      timestamp: new Date().toISOString(),
      apiUrl: (config as any).apiUrl || 'http://localhost:3000',
      environment: process.env.NODE_ENV || 'development',
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



// Endpoint de teste para tabelas de pedidos
app.get("/api/test-pedidos", async (req, res) => {
  try {
    // Verificar se as tabelas existem
    const tabelas = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%pedido%'
      ORDER BY table_name
    `);

    // Testar uma consulta simples
    let pedidosCount = 0;
    try {
      const countResult = await db.query('SELECT COUNT(*) as total FROM pedidos');
      pedidosCount = countResult.rows[0].total;
    } catch (e) {
      // Tabela pode não existir ainda
    }

    res.json({
      success: true,
      message: "Teste de tabelas de pedidos",
      data: {
        tabelasEncontradas: tabelas.rows.map((r: any) => r.table_name),
        totalPedidos: pedidosCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao testar tabelas de pedidos",
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
app.use("/api/carrinho", carrinhoRoutes);
app.use("/api/fornecedores", fornecedorRoutes);
app.use("/api/contratos", contratoRoutes);
app.use("/api/contrato-produtos", contratoProdutoRoutes);
app.use("/api/aditivos-contratos", createAditivoContratoRoutes(db.pool));

app.use("/api/refeicoes", refeicaoRoutes);
app.use("/api/refeicao-produtos", refeicaoProdutoRoutes);
app.use("/api/cardapios", cardapioRoutes);
app.use("/api/demanda", demandaRoutes);
app.use("/api/produtos", produtoRoutes);

app.use("/api/produto-modalidades", produtoModalidadeRoutes);

app.use("/api/pedidos-modernos", pedidoModernoRoutes);
app.use("/api/recebimento-simples", recebimentoSimplificadoRoutes);
app.use("/api/estoque-central", estoqueCentralRoutes);
app.use("/api/estoque-escola", estoqueEscolaRoutes);
app.use("/api/gestor-escola", gestorEscolaRoutes);
app.use("/api/estoque-escolar", estoqueEscolarRoutes);

app.use("/api/faturamento-modalidades", faturamentoModalidadesRoutes);
app.use("/api/faturamento-interface", faturamentoInterfaceRoutes);
app.use("/api/saldos-contratos", saldoContratosRoutes);
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
      documentation: "Rotas disponíveis listadas abaixo"
    },
    availableRoutes: [
      "/api/usuarios",
      "/api/auth",
      "/api/escolas",
      "/api/modalidades",
      "/api/escola-modalidades",
      "/api/carrinho",
      "/api/fornecedores",
      "/api/contratos",
      "/api/contrato-produtos",
      "/api/aditivos-contratos",
      "/api/refeicoes",
      "/api/cardapios",
      "/api/demanda",
      "/api/produtos",
      "/api/produtos-orm",
      "/api/produto-modalidades",
      "/api/pedidos-modernos",
      "/api/recebimento-simples",
      "/api/estoque-moderno",
      "/api/estoque-escolar",
      "/api/faturamento-modalidades",
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
      "/api/carrinho",
      "/api/fornecedores",
      "/api/contratos",
      "/api/contrato-produtos",
      "/api/aditivos-contratos",
      "/api/refeicoes",
      "/api/cardapios",
      "/api/demanda",
      "/api/produtos",
      "/api/produtos-orm",
      "/api/produto-modalidades",
      "/api/pedidos-modernos",
      "/api/recebimento-simples",
      "/api/estoque-moderno",
      "/api/estoque-escolar",
      "/api/faturamento-modalidades",
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

      // Inicializar módulos
      console.log('🔧 Inicializando módulos...');
      const { initEstoqueCentral } = await import('./controllers/estoqueCentralController');
      await initEstoqueCentral();



      console.log('✅ Módulos inicializados com sucesso!');

      // Iniciar servidor
      app.listen(config.backend.port, config.backend.host, () => {
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

// Exportar app para Vercel
export default app;

// Para compatibilidade CommonJS
module.exports = app;

// Inicializar apenas se não estiver no Vercel
if (process.env.VERCEL !== '1') {
  iniciarServidor();
}
