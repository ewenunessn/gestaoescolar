import dotenv from "dotenv";

dotenv.config();

const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  // Configurações do servidor
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  isVercel,
  isProduction,

  // Configurações do banco de dados
  database: {
    url: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'alimentacao_escolar',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: isProduction ? true : false
  },

  // Configurações de segurança
  jwtSecret: process.env.JWT_SECRET || (() => {
    console.error('❌❌❌ ERRO CRÍTICO: JWT_SECRET NÃO CONFIGURADO! ❌❌❌');
    console.error('❌ Isso causará tokens inválidos a cada restart do servidor!');
    console.error('❌ Configure JWT_SECRET nas variáveis de ambiente do Vercel!');
    console.error('❌ Acesse: https://vercel.com/dashboard → Settings → Environment Variables');
    console.error('❌ Gerando secret temporário - TODOS OS TOKENS SERÃO INVÁLIDOS NO PRÓXIMO RESTART!');
    return 'TEMPORARY-INSECURE-SECRET-' + Date.now();
  })(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d", // Aumentado para 7 dias

  // Configurações do backend (para compatibilidade com index.ts)
  backend: {
    cors: {
      origin: isVercel
        ? [
            "https://gestaoescolar-frontend.vercel.app",
            "https://gestaoescolar-frontend-painel.vercel.app",
            "https://nutriescola.vercel.app",
            "*.vercel.app",
            "http://localhost:5173",
            "http://localhost:3000"
          ]
        : process.env.CORS_ORIGIN?.split(',') || [
            "http://localhost:5173",
            "http://192.168.1.2:5173",
            "http://192.168.18.12:5173"
          ],
      credentials: true
    }
  },

  // Configurações da API
  apiBasePath: process.env.API_BASE_PATH || "/api",

  // URLs completas
  get apiUrl() {
    if (isVercel) {
      return process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}${this.apiBasePath}`
        : `${this.apiBasePath}`;
    }
    return `http://192.168.18.12:${this.port}${this.apiBasePath}`;
  },

  get healthUrl() {
    if (isVercel) {
      return process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}/health`
        : `/health`;
    }
    return `http://192.168.18.12:${this.port}/health`;
  },
};
