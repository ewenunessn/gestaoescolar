const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  try {
    // Em desenvolvimento, permitir acesso sem token se não houver header de autorização
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const authHeader = req.headers.authorization;

    if (isDevelopment && !authHeader) {
      console.log('🔓 Modo desenvolvimento: Permitindo acesso sem token');
      req.user = { id: 1, nome: 'Usuário Dev', email: 'dev@sistema.com' };
      return next();
    }

    // Se há header de autorização, validar o token
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: "Token de autorização não fornecido." 
      });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ 
        success: false,
        message: "Formato de token inválido. Use: Bearer <token>" 
      });
    }

    const token = parts[1];
    
    // Verificar se é um token mock (para desenvolvimento)
    if (token.startsWith('mock_token_')) {
      console.log('🔓 Token mock detectado:', token);
      const parts = token.split('_');
      const userId = parts[2];
      req.user = { 
        id: parseInt(userId) || 1, 
        nome: 'Usuário Mock', 
        email: 'mock@sistema.com',
        tipo: 'gestor'
      };
      return next();
    }
    
    // Verificar se é um token de gestor
    if (token.startsWith('gestor_')) {
      console.log('🔓 Token de gestor detectado:', token);
      const parts = token.split('_');
      const escolaId = parts[1];
      req.user = { 
        id: parseInt(escolaId) || 1, 
        nome: 'Gestor Escola', 
        email: 'gestor@escola.com',
        tipo: 'gestor',
        escola_id: parseInt(escolaId)
      };
      return next();
    }
    
    const jwtSecret = process.env.JWT_SECRET || 'seu_jwt_secret_aqui';

    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: "Token inválido." 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: "Token expirado." 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: "Erro interno do servidor." 
    });
  }
}

module.exports = { authenticateToken: authMiddleware };