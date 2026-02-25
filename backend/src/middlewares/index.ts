// Exportar todos os middlewares de um único ponto
export { devAuthMiddleware, allowAllMiddleware } from './devAuthMiddleware';
export { validateCardapio, validateCardapioRefeicao } from './validationMiddleware';
export { authenticateToken } from './auth.js';
export { authMiddleware } from './authMiddleware';
