import React from "react";
import { Typography, TypographyProps } from "@mui/material";

// Função utilitária para garantir valores válidos
const safeString = (value: any, fallback: string = ""): string => {
  if (value == null) return fallback;
  return String(value);
};

interface SafeTypographyProps extends Omit<TypographyProps, "children"> {
  children: any;
  fallback?: string;
}

/**
 * Componente Typography seguro que garante que o children seja sempre uma string válida
 *
 * @param children - Valor a ser renderizado
 * @param fallback - Valor padrão caso children seja null/undefined
 * @param props - Todas as props do Typography original
 */
export const SafeTypography: React.FC<SafeTypographyProps> = ({
  children,
  fallback = "",
  ...props
}) => {
  return <Typography {...props}>{safeString(children, fallback)}</Typography>;
};

export default SafeTypography;
