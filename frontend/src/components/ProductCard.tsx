import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Info,
  Store,
  AttachMoney,
  Inventory,
  CheckCircle,
} from '@mui/icons-material';
import { ProdutoContrato } from '../types/carrinho';

interface ProductCardProps {
  produto: ProdutoContrato;
  onAddToCart: (produto: ProdutoContrato) => void;
  onViewDetails: (produto: ProdutoContrato) => void;
  noCarrinho?: boolean;
  quantidadeNoCarrinho?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({
  produto,
  onViewDetails,
  noCarrinho = false,
  quantidadeNoCarrinho = 0,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [currentIcon, setCurrentIcon] = useState('🍎');
  const [isHovered, setIsHovered] = useState(false);

  // Ícones baseados no tipo de produto
  const productIcons = ['🍎', '🥖', '🥛', '🍖', '🥕', '🍚'];

  useEffect(() => {
    const interval = setInterval(() => {
      const currentIndex = productIcons.indexOf(currentIcon);
      const nextIndex = (currentIndex + 1) % productIcons.length;
      setCurrentIcon(productIcons[nextIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentIcon]);

  const isDisponivel = produto.contrato_ativo && produto.quantidade_disponivel > 0;
  const preco = `R$ ${(produto.preco_contratual || 0).toFixed(2).replace('.', ',')}`;

  return (
    <Box
      onClick={() => onViewDetails(produto)}
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: 1.5,
        width: '100%',
        maxWidth: '200px',
        height: 'auto',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          boxShadow: '0 35px 70px rgba(0, 0, 0, 0.2)',
          transform: 'translateY(-4px)',
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Barra colorida superior */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #f87171, #14b8a6, #3b82f6)',
          borderRadius: '12px 12px 0 0',
        }}
      />

      {/* Área da imagem/ícone */}
      <Box
        sx={{
          width: '100%',
          height: isMobile ? '80px' : '100px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Padrão de textura */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.3,
            backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><pattern id='grain' width='100' height='100' patternUnits='userSpaceOnUse'><circle cx='20' cy='20' r='1' fill='white' opacity='0.1'/><circle cx='80' cy='40' r='1' fill='white' opacity='0.1'/><circle cx='40' cy='80' r='1' fill='white' opacity='0.1'/><circle cx='90' cy='90' r='1' fill='white' opacity='0.1'/></pattern></defs><rect width='100' height='100' fill='url(%23grain)'/></svg>")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Ícone do produto */}
        <Typography
          sx={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            color: 'rgba(255, 255, 255, 0.8)',
            zIndex: 10,
            transition: 'all 0.3s ease',
            animation: isHovered ? 'bounce 2s ease-in-out infinite' : 'none',
            '@keyframes bounce': {
              '0%, 100%': { transform: 'translateY(0px)' },
              '50%': { transform: 'translateY(-5px)' },
            }
          }}
        >
          {currentIcon}
        </Typography>

        {/* Badge de status */}
        {noCarrinho && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#059669',
              px: 1,
              py: 0.5,
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <CheckCircle sx={{ fontSize: 12 }} />
            NO CARRINHO
          </Box>
        )}

        {!isDisponivel && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              px: 1,
              py: 0.5,
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              zIndex: 20,
            }}
          >
            INDISPONÍVEL
          </Box>
        )}
      </Box>

      {/* Informações do produto */}
      <Box sx={{ textAlign: 'left' }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontWeight: 'bold',
            color: '#1f2937',
            mb: 1,
            lineHeight: 1.3,
            fontSize: '1.1rem',
          }}
        >
          {produto.nome_produto}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            color: '#6b7280',
            mb: 2,
            fontSize: '0.875rem',
          }}
        >
          <strong>Fornecedor:</strong> {produto.nome_fornecedor}
        </Typography>

        {/* Tags de informação */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Box
            sx={{
              background: '#dcfce7',
              color: '#059669',
              px: 1,
              py: 0.5,
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Store sx={{ fontSize: 12 }} />
            {produto.unidade}
          </Box>

          <Box
            sx={{
              background: '#dbeafe',
              color: '#2563eb',
              px: 1,
              py: 0.5,
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Inventory sx={{ fontSize: 12 }} />
            {produto.quantidade_disponivel.toLocaleString('pt-BR')} disponível
          </Box>
        </Box>

        {/* Preço */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography
            sx={{
              fontSize: '1.5rem',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontWeight: 800,
            }}
          >
            {preco}
          </Typography>
        </Box>

        {/* Quantidade no carrinho */}
        {noCarrinho && quantidadeNoCarrinho > 0 && (
          <Box
            sx={{
              background: '#dcfce7',
              color: '#059669',
              p: 1,
              borderRadius: '8px',
              textAlign: 'center',
              mb: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontWeight: 'bold',
                fontSize: '0.875rem',
              }}
            >
              {quantidadeNoCarrinho} {produto.unidade} no carrinho
            </Typography>
          </Box>
        )}


      </Box>
    </Box>
  );
};

export default ProductCard;