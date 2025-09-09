import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';

interface PasswordStrengthIndicatorProps {
  password: string;
  showDetails?: boolean;
}

interface PasswordValidation {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
  strength: number;
  strengthLabel: string;
  strengthColor: 'error' | 'warning' | 'info' | 'success';
}

const validatePassword = (password: string): PasswordValidation => {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const validCriteria = [minLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const strength = (validCriteria / 5) * 100;
  
  let strengthLabel = 'Muito Fraca';
  let strengthColor: 'error' | 'warning' | 'info' | 'success' = 'error';
  
  if (strength >= 80) {
    strengthLabel = 'Forte';
    strengthColor = 'success';
  } else if (strength >= 60) {
    strengthLabel = 'Boa';
    strengthColor = 'info';
  } else if (strength >= 40) {
    strengthLabel = 'Regular';
    strengthColor = 'warning';
  }
  
  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: validCriteria === 5,
    strength,
    strengthLabel,
    strengthColor
  };
};

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ 
  password, 
  showDetails = true 
}) => {
  const validation = validatePassword(password);

  if (!password) return null;

  const criteria = [
    { key: 'minLength', label: 'Mínimo 8 caracteres', valid: validation.minLength },
    { key: 'hasUpper', label: 'Letra maiúscula (A-Z)', valid: validation.hasUpper },
    { key: 'hasLower', label: 'Letra minúscula (a-z)', valid: validation.hasLower },
    { key: 'hasNumber', label: 'Número (0-9)', valid: validation.hasNumber },
    { key: 'hasSpecial', label: 'Caractere especial (!@#$...)', valid: validation.hasSpecial }
  ];

  return (
    <Box sx={{ mt: 2 }}>
      {/* Barra de força */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Força da senha:
          </Typography>
          <Typography 
            variant="body2" 
            color={`${validation.strengthColor}.main`}
            fontWeight="bold"
          >
            {validation.strengthLabel}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={validation.strength}
          color={validation.strengthColor}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {/* Detalhes dos critérios */}
      {showDetails && (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Critérios de segurança:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {criteria.map(({ key, label, valid }) => (
              <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {valid ? (
                  <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <Cancel sx={{ fontSize: 16, color: 'error.main' }} />
                )}
                <Typography 
                  variant="body2" 
                  color={valid ? 'success.main' : 'error.main'}
                  sx={{ fontSize: '0.875rem' }}
                >
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PasswordStrengthIndicator;