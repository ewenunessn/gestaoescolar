import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';

/**
 * Middleware de compressão de respostas
 * Comprime respostas JSON grandes para reduzir tráfego de rede
 */

export interface CompressionOptions {
  threshold?: number;  // Tamanho mínimo em bytes para comprimir (padrão: 1KB)
  level?: number;      // Nível de compressão 0-9 (padrão: 6)
}

/**
 * Verifica se o cliente aceita compressão
 */
const acceptsEncoding = (req: Request, encoding: string): boolean => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  return acceptEncoding.includes(encoding);
};

/**
 * Middleware de compressão
 */
export const compressionMiddleware = (options: CompressionOptions = {}) => {
  const {
    threshold = 1024,  // 1KB
    level = 6
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Interceptar res.json
    const originalJson = res.json.bind(res);
    
    res.json = function(data: any) {
      const jsonString = JSON.stringify(data);
      const size = Buffer.byteLength(jsonString);

      // Adicionar header de tamanho original
      res.setHeader('X-Original-Size', size.toString());

      // Não comprimir se for muito pequeno
      if (size < threshold) {
        return originalJson(data);
      }

      // Comprimir com gzip se suportado
      if (acceptsEncoding(req, 'gzip')) {
        const compressed = zlib.gzipSync(jsonString, { level });
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'application/json');
        return res.send(compressed);
      }

      // Comprimir com deflate se suportado
      if (acceptsEncoding(req, 'deflate')) {
        const compressed = zlib.deflateSync(jsonString, { level });
        res.setHeader('Content-Encoding', 'deflate');
        res.setHeader('Content-Type', 'application/json');
        return res.send(compressed);
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Compressão agressiva para listas grandes
 */
export const aggressiveCompression = compressionMiddleware({
  threshold: 512,  // 512 bytes
  level: 9         // Máxima compressão
});

/**
 * Compressão balanceada (padrão)
 */
export const balancedCompression = compressionMiddleware({
  threshold: 1024,  // 1KB
  level: 6          // Compressão média
});

/**
 * Compressão rápida para respostas em tempo real
 */
export const fastCompression = compressionMiddleware({
  threshold: 2048,  // 2KB
  level: 1          // Compressão mínima
});
