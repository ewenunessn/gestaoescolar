# 🚀 Guia de Preparação para Produção

Este documento detalha as recomendações de longo prazo para colocar o sistema em produção com segurança e escalabilidade.

---

## ✅ Status Atual

### Implementado
- [x] Rate limiting em memória
- [x] Cache HTTP em memória
- [x] Compressão de respostas
- [x] Paginação automática
- [x] Tratamento de erros
- [x] Monitoramento básico

### Pendente para Produção
- [ ] Rate limiting com Redis
- [ ] Cache com Redis
- [ ] CDN para assets estáticos
- [ ] Load balancer
- [ ] HTTPS/SSL
- [ ] Logs estruturados
- [ ] Backup automático
- [ ] CI/CD
- [ ] Monitoramento avançado

---

## 1. 🔒 Migrar para Redis

### Por que?
- Memória compartilhada entre instâncias
- Persistência de dados
- Melhor performance
- Escalabilidade horizontal

### Como Implementar

#### Instalar Redis

```bash
# Windows (via Chocolatey)
choco install redis-64

# Linux
sudo apt-get install redis-server

# Mac
brew install redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

#### Configurar Redis no Backend

```bash
npm install redis ioredis
```

**Arquivo: `backend/src/config/redis.ts`**

```typescript
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  console.log('✅ Redis conectado');
});

redis.on('error', (err) => {
  console.error('❌ Erro no Redis:', err);
});
```

#### Atualizar Rate Limiter

```typescript
// backend/src/middleware/rateLimiter.ts
import { redis } from '../config/redis';

export const rateLimit = (options: RateLimitOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `ratelimit:${keyGenerator(req)}`;
    
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }
    
    if (current > max) {
      return res.status(429).json({
        success: false,
        error: 'TooManyRequests',
        message: 'Muitas requisições'
      });
    }
    
    next();
  };
};
```

#### Atualizar Cache

```typescript
// backend/src/middleware/cache.ts
import { redis } from '../config/redis';

export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `cache:${keyGenerator(req)}`;
    
    const cached = await redis.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const originalJson = res.json.bind(res);
    res.json = async function(data: any) {
      await redis.setex(key, ttl, JSON.stringify(data));
      return originalJson(data);
    };
    
    next();
  };
};
```

---

## 2. 🌐 CDN para Assets Estáticos

### Opções Recomendadas

1. **Cloudflare** (Gratuito)
   - Cache automático
   - DDoS protection
   - SSL gratuito

2. **AWS CloudFront**
   - Integração com S3
   - Baixa latência global

3. **Vercel** (Para frontend)
   - Deploy automático
   - CDN global incluído

### Configuração Cloudflare

1. Criar conta em cloudflare.com
2. Adicionar domínio
3. Atualizar nameservers
4. Configurar regras de cache:

```
Cache Level: Standard
Browser Cache TTL: 4 hours
Always Online: On
```

### Mover Assets para S3/CDN

```typescript
// backend/src/config/storage.ts
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

export const uploadToS3 = async (file: Buffer, key: string) => {
  return s3.upload({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: file,
    ACL: 'public-read'
  }).promise();
};
```

---

## 3. ⚖️ Load Balancer

### Opções

1. **Nginx** (Recomendado)
2. **HAProxy**
3. **AWS ELB**
4. **Vercel** (automático)

### Configuração Nginx

**Arquivo: `/etc/nginx/sites-available/gestaoescolar`**

```nginx
upstream backend {
    least_conn;
    server localhost:3000 weight=1;
    server localhost:3001 weight=1;
    server localhost:3002 weight=1;
}

server {
    listen 80;
    server_name api.seudominio.com;

    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.seudominio.com;

    ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Compressão
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache para assets estáticos
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Iniciar Múltiplas Instâncias

```bash
# Instância 1
PORT=3000 npm start &

# Instância 2
PORT=3001 npm start &

# Instância 3
PORT=3002 npm start &
```

---

## 4. 🔐 HTTPS/SSL

### Let's Encrypt (Gratuito)

```bash
# Instalar Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d api.seudominio.com

# Renovação automática
sudo certbot renew --dry-run
```

### Forçar HTTPS no Backend

```typescript
// backend/src/middleware/security.ts
export const forceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};

// Aplicar
app.use(forceHTTPS);
```

---

## 5. 📝 Logs Estruturados

### Instalar Winston

```bash
npm install winston winston-daily-rotate-file
```

### Configurar Logger

**Arquivo: `backend/src/config/logger.ts`**

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'gestao-escolar' },
  transports: [
    // Logs de erro
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    // Logs combinados
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### Usar Logger

```typescript
import logger from './config/logger';

// Info
logger.info('Usuário logado', { userId: 123, email: 'user@example.com' });

// Erro
logger.error('Erro ao processar pedido', { error: err.message, stack: err.stack });

// Warning
logger.warn('Taxa de requisições alta', { ip: req.ip, count: 100 });
```

---

## 6. 💾 Backup Automático

### Script de Backup PostgreSQL

**Arquivo: `backend/scripts/backup-database.sh`**

```bash
#!/bin/bash

# Configurações
DB_NAME="alimentacao_escolar"
DB_USER="postgres"
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

# Fazer backup
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup criado: $BACKUP_FILE"
```

### Agendar com Cron

```bash
# Editar crontab
crontab -e

# Backup diário às 2h da manhã
0 2 * * * /path/to/backup-database.sh

# Backup a cada 6 horas
0 */6 * * * /path/to/backup-database.sh
```

### Backup para S3

```bash
#!/bin/bash

# Fazer backup
pg_dump -U postgres alimentacao_escolar | gzip > backup.sql.gz

# Enviar para S3
aws s3 cp backup.sql.gz s3://meu-bucket/backups/$(date +%Y%m%d_%H%M%S).sql.gz

# Limpar arquivo local
rm backup.sql.gz
```

---

## 7. 🔄 CI/CD

### GitHub Actions

**Arquivo: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run tests
        run: |
          cd backend
          npm test
      
      - name: Run linter
        run: |
          cd backend
          npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/gestaoescolar
            git pull origin main
            cd backend
            npm install
            pm2 restart gestaoescolar
```

---

## 8. 📊 Monitoramento Avançado

### Opções

1. **New Relic** (APM completo)
2. **DataDog** (Infraestrutura + APM)
3. **Sentry** (Error tracking)
4. **Prometheus + Grafana** (Open source)

### Configurar Sentry

```bash
npm install @sentry/node @sentry/tracing
```

```typescript
// backend/src/config/sentry.ts
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app })
  ]
});

// Middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler (deve ser o último)
app.use(Sentry.Handlers.errorHandler());
```

---

## 9. 🔒 Variáveis de Ambiente

### Arquivo: `.env.production`

```bash
# Banco de Dados
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DATABASE_SSL=true

# Redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# AWS
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET=gestaoescolar-assets

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# Outros
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

---

## 10. ✅ Checklist de Deploy

### Antes do Deploy

- [ ] Testes passando
- [ ] Variáveis de ambiente configuradas
- [ ] Backup do banco de dados
- [ ] SSL/HTTPS configurado
- [ ] Redis configurado
- [ ] Logs estruturados
- [ ] Monitoramento configurado
- [ ] Rate limiting ativo
- [ ] Cache configurado

### Durante o Deploy

- [ ] Fazer backup
- [ ] Rodar migrações
- [ ] Atualizar código
- [ ] Reiniciar serviços
- [ ] Verificar logs
- [ ] Testar endpoints críticos

### Após o Deploy

- [ ] Monitorar logs por 1 hora
- [ ] Verificar métricas de performance
- [ ] Testar funcionalidades principais
- [ ] Verificar alertas
- [ ] Documentar mudanças

---

## 📚 Recursos Adicionais

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Redis Documentation](https://redis.io/documentation)
- [AWS S3 Guide](https://docs.aws.amazon.com/s3/)
- [Sentry Documentation](https://docs.sentry.io/)

---

**Última atualização:** 06/03/2026  
**Status:** 📝 Guia Completo  
**Próximo passo:** Implementar conforme necessidade
