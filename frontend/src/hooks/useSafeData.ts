import { useMemo } from "react";

/**
 * Hook para validação e tratamento seguro de dados
 * Garante que valores sejam sempre do tipo esperado
 */
export const useSafeData = () => {
  const safeString = useMemo(() => {
    return (value: any, fallback: string = ""): string => {
      if (value == null) return fallback;
      return String(value);
    };
  }, []);

  const safeNumber = useMemo(() => {
    return (value: any, fallback: number = 0): number => {
      if (value == null) return fallback;
      const num = Number(value);
      return isNaN(num) ? fallback : num;
    };
  }, []);

  const safeDate = useMemo(() => {
    return (value: any, fallback: string = "Data não informada"): string => {
      if (!value) return fallback;
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return "Data inválida";
        return date.toLocaleDateString("pt-BR");
      } catch {
        return "Data inválida";
      }
    };
  }, []);

  const safeBoolean = useMemo(() => {
    return (value: any, fallback: boolean = false): boolean => {
      if (value == null) return fallback;
      return Boolean(value);
    };
  }, []);

  return {
    safeString,
    safeNumber,
    safeDate,
    safeBoolean,
  };
};

export default useSafeData;
