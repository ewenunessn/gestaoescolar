import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000).unref?.();

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export const rateLimit = (options: RateLimitOptions = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Muitas requisicoes. Tente novamente mais tarde.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    store[key].count++;

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - store[key].count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());

    if (store[key].count > max) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      return res.status(429).json({
        success: false,
        error: 'TooManyRequests',
        message,
        statusCode: 429,
        retryAfter: `${retryAfter} segundos`,
        resetTime: new Date(store[key].resetTime).toISOString(),
      });
    }

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

export const ipLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 600 : 120,
  message: 'Muitas requisicoes do mesmo IP. Limite: 120 requisicoes por minuto.',
  keyGenerator: (req: Request) => `ip_${req.ip || req.socket.remoteAddress || 'unknown'}`,
});

export const authenticatedUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 2000 : 1000,
  message: 'Muitas requisicoes. Limite: 1000 requisicoes a cada 15 minutos.',
  keyGenerator: (req: Request) => {
    const user = (req as AuthenticatedRequest).user;
    if (user?.id) return `user_${user.id}`;
    return `anonymous_${req.ip || req.socket.remoteAddress || 'unknown'}`;
  },
});

export const generalLimiter = authenticatedUserLimiter;

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  skipSuccessfulRequests: true,
});

export const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Muitas requisicoes. Limite: 30 requisicoes por minuto.',
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Muitas operacoes de escrita. Limite: 20 operacoes por minuto.',
});

export const clearRateLimitStore = () => {
  Object.keys(store).forEach(key => delete store[key]);
};

export const getRateLimitStats = () => {
  const now = Date.now();
  const active = Object.keys(store).filter(key => store[key].resetTime > now);

  return {
    totalKeys: Object.keys(store).length,
    activeKeys: active.length,
    store: process.env.NODE_ENV === 'development' ? store : undefined,
  };
};
