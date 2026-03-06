import { Request, Response, NextFunction } from 'express';

/**
 * Rate Limiter simples em memória
 * Para produção, considere usar Redis
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Limpar registros antigos a cada 1 minuto
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000);

export interface RateLimitOptions {
  windowMs?: number;  // Janela de tempo em ms (padrão: 15 minutos)
  max?: number;       // Máximo de requisições (padrão: 100)
  message?: string;   // Mensagem customizada
  skipSuccessfulRequests?: boolean;  // Não contar requisições bem-sucedidas
  skipFailedRequests?: boolean;      // Não contar requisições com erro
  keyGenerator?: (req: Request) => string;  // Função para gerar chave única
}

/**
 * Cria um middleware de rate limiting
 */
export const rateLimit = (options: RateLimitOptions = {}) => {
  const {
    windowMs = 15 * 60 * 1000,  // 15 minutos
    max = 100,
    message = 'Muitas requisições. Tente novamente mais tarde.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req: Request) => {
      // Usar IP do cliente como chave padrão
      return req.ip || req.socket.remoteAddress || 'unknown';
    }
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Inicializar ou resetar contador
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    // Incrementar contador
    store[key].count++;

    // Adicionar headers informativos
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - store[key].count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());

    // Verificar se excedeu o limite
    if (store[key].count > max) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      
      return res.status(429).json({
        success: false,
        error: 'TooManyRequests',
        message,
        statusCode: 429,
        retryAfter: `${retryAfter} segundos`,
        resetTime: new Date(store[key].resetTime).toISOString()
      });
    }

    // Decrementar contador se configurado
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalSend = res.send;
      res.send = function(data: any) {
        const statusCode = res.statusCode;
        
        if (
          (skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) ||
          (skipFailedRequests && statusCode >= 400)
        ) {
          store[key].count--;
        }
        
        return originalSend.call(this, data);
      };
    }

    next();
  };
};

/**
 * Rate limiters pré-configurados
 */

// Rate limiter geral (100 req/15min)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas requisições. Limite: 100 requisições a cada 15 minutos.'
});

// Rate limiter para login (5 tentativas/15min)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  skipSuccessfulRequests: true  // Não contar logins bem-sucedidos
});

// Rate limiter para APIs públicas (30 req/min)
export const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Muitas requisições. Limite: 30 requisições por minuto.'
});

// Rate limiter para operações de escrita (20 req/min)
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Muitas operações de escrita. Limite: 20 operações por minuto.'
});

/**
 * Limpar todos os registros (útil para testes)
 */
export const clearRateLimitStore = () => {
  Object.keys(store).forEach(key => delete store[key]);
};

/**
 * Obter estatísticas do rate limiter
 */
export const getRateLimitStats = () => {
  const now = Date.now();
  const active = Object.keys(store).filter(key => store[key].resetTime > now);
  
  return {
    totalKeys: Object.keys(store).length,
    activeKeys: active.length,
    store: process.env.NODE_ENV === 'development' ? store : undefined
  };
};
