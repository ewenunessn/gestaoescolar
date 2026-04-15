import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
}

interface BackendConfig {
  host: string;
  port: number;
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

interface Config {
  backend: BackendConfig;
  database: DatabaseConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  uploads: {
    path: string;
    maxSize: number;
  };
}

function loadConfig(): Config {
  const environment = process.env.NODE_ENV || 'development';
  
  // Tentar diferentes caminhos para o config.json
  const possiblePaths = [
    path.join(process.cwd(), '..', 'config.json'),           // Se rodando de backend/
    path.join(process.cwd(), 'config.json'),                // Se rodando da raiz
    path.join(__dirname, '..', '..', '..', 'config.json'),  // Caminho absoluto
  ];
  
  let jsonConfig = {};
  let configPath = '';
  
  // Tentar carregar config.json de diferentes locais
  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      configPath = tryPath;
      break;
    }
  }
  
  if (configPath) {
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      const allConfigs = JSON.parse(configFile);
      jsonConfig = allConfigs[environment] || {};
      console.log(`✅ Configuração carregada do config.json (${environment})`);
      console.log(`   Arquivo: ${configPath}`);
    } catch (error) {
      console.warn('⚠️  Erro ao carregar config.json, usando variáveis de ambiente');
      console.warn(`   Erro: ${(error as Error).message}`);
    }
  } else {
    console.warn('⚠️  config.json não encontrado, usando variáveis de ambiente');
    console.warn(`   Procurado em: ${possiblePaths.join(', ')}`);
  }

  // Configuração padrão com fallback para variáveis de ambiente
  const config: Config = {
    backend: {
      host: (jsonConfig as any)?.backend?.host || process.env.HOST || 'localhost',
      port: (jsonConfig as any)?.backend?.port || parseInt(process.env.PORT || '3000'),
      cors: {
        origin: (jsonConfig as any)?.backend?.cors?.origin || 
          process.env.CORS_ORIGIN?.split(',') || [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'https://nutriescola.vercel.app'
        ],
        credentials: (jsonConfig as any)?.backend?.cors?.credentials ?? true
      }
    },
    database: {
      host: (jsonConfig as any)?.database?.host || process.env.DB_HOST || 'localhost',
      port: (jsonConfig as any)?.database?.port || parseInt(process.env.DB_PORT || '5432'),
      name: (jsonConfig as any)?.database?.name || process.env.DB_NAME || 'alimentacao_escolar',
      user: (jsonConfig as any)?.database?.user || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '', // Deve ser configurada em variável de ambiente
      ssl: (jsonConfig as any)?.database?.ssl ?? (process.env.DB_SSL === 'true')
    },
    jwt: {
      secret: process.env.JWT_SECRET || (() => {
        console.warn('⚠️ JWT_SECRET não configurado - usando valor padrão (INSEGURO EM PRODUÇÃO!)');
        return 'default-secret-change-in-production';
      })(),
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    uploads: {
      path: process.env.UPLOADS_PATH || './uploads',
      maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
    }
  };

  // Log da configuração (sem dados sensíveis)
  console.log('🔧 Configuração do servidor:');
  console.log(`   Host: ${config.backend.host}:${config.backend.port}`);
  console.log(`   Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
  console.log(`   Environment: ${environment}`);

  return config;
}

export const config = loadConfig();
export default config;