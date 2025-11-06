/**
 * Utilitários para validação de CPF e CNPJ no frontend
 */

/**
 * Remove caracteres não numéricos de uma string
 */
export const limparDocumento = (documento: string): string => {
  return documento.replace(/\D/g, '');
};

/**
 * Formata CPF (000.000.000-00)
 */
export const formatarCPF = (cpf: string): string => {
  const numeros = limparDocumento(cpf);
  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata CNPJ (00.000.000/0000-00)
 */
export const formatarCNPJ = (cnpj: string): string => {
  const numeros = limparDocumento(cnpj);
  return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

/**
 * Valida CPF
 */
export const validarCPF = (cpf: string): boolean => {
  const numeros = limparDocumento(cpf);
  
  // Verifica se tem 11 dígitos
  if (numeros.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(numeros)) return false;
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros[i]) * (10 - i);
  }
  let resto = soma % 11;
  let digitoVerificador1 = resto < 2 ? 0 : 11 - resto;
  
  if (parseInt(numeros[9]) !== digitoVerificador1) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros[i]) * (11 - i);
  }
  resto = soma % 11;
  let digitoVerificador2 = resto < 2 ? 0 : 11 - resto;
  
  return parseInt(numeros[10]) === digitoVerificador2;
};

/**
 * Valida CNPJ
 */
export const validarCNPJ = (cnpj: string): boolean => {
  const numeros = limparDocumento(cnpj);
  
  // Verifica se tem 14 dígitos
  if (numeros.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(numeros)) return false;
  
  // Validação do primeiro dígito verificador
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(numeros[i]) * pesos1[i];
  }
  let resto = soma % 11;
  let digitoVerificador1 = resto < 2 ? 0 : 11 - resto;
  
  if (parseInt(numeros[12]) !== digitoVerificador1) return false;
  
  // Validação do segundo dígito verificador
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(numeros[i]) * pesos2[i];
  }
  resto = soma % 11;
  let digitoVerificador2 = resto < 2 ? 0 : 11 - resto;
  
  return parseInt(numeros[13]) === digitoVerificador2;
};

/**
 * Detecta o tipo de documento (CPF ou CNPJ) baseado no comprimento
 */
export const detectarTipoDocumento = (documento: string): 'CPF' | 'CNPJ' | 'INVALIDO' => {
  const numeros = limparDocumento(documento);
  
  if (numeros.length === 11) return 'CPF';
  if (numeros.length === 14) return 'CNPJ';
  return 'INVALIDO';
};

/**
 * Valida documento (CPF ou CNPJ) automaticamente
 */
export const validarDocumento = (documento: string): {
  valido: boolean;
  tipo: 'CPF' | 'CNPJ' | 'INVALIDO';
  mensagem: string;
} => {
  if (!documento || documento.trim() === '') {
    return {
      valido: false,
      tipo: 'INVALIDO',
      mensagem: 'Documento é obrigatório'
    };
  }
  
  const tipo = detectarTipoDocumento(documento);
  
  if (tipo === 'INVALIDO') {
    return {
      valido: false,
      tipo: 'INVALIDO',
      mensagem: 'Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)'
    };
  }
  
  const valido = tipo === 'CPF' ? validarCPF(documento) : validarCNPJ(documento);
  
  return {
    valido,
    tipo,
    mensagem: valido ? `${tipo} válido` : `${tipo} inválido - verifique os dígitos verificadores`
  };
};

/**
 * Formata documento automaticamente (CPF ou CNPJ)
 */
export const formatarDocumento = (documento: string): string => {
  const tipo = detectarTipoDocumento(documento);
  
  if (tipo === 'CPF') return formatarCPF(documento);
  if (tipo === 'CNPJ') return formatarCNPJ(documento);
  return documento;
};

/**
 * Máscara para input de documento que aceita CPF ou CNPJ
 */
export const aplicarMascaraDocumento = (valor: string): string => {
  const numeros = limparDocumento(valor);
  
  // Limita a 14 dígitos (CNPJ)
  const numerosTruncados = numeros.slice(0, 14);
  
  if (numerosTruncados.length <= 11) {
    // Aplica máscara de CPF
    return numerosTruncados
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // Aplica máscara de CNPJ
    return numerosTruncados
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
};

/**
 * Hook personalizado para campo de documento
 */
export const useDocumentoField = (valorInicial: string = '') => {
  const [valor, setValor] = React.useState(valorInicial);
  const [erro, setErro] = React.useState<string | null>(null);
  
  const handleChange = (novoValor: string) => {
    const valorFormatado = aplicarMascaraDocumento(novoValor);
    setValor(valorFormatado);
    
    // Validar apenas se o campo não estiver vazio
    if (novoValor.trim() !== '') {
      const validacao = validarDocumento(novoValor);
      setErro(validacao.valido ? null : validacao.mensagem);
    } else {
      setErro(null);
    }
  };
  
  const validar = (): boolean => {
    const validacao = validarDocumento(valor);
    setErro(validacao.valido ? null : validacao.mensagem);
    return validacao.valido;
  };
  
  return {
    valor,
    erro,
    handleChange,
    validar,
    limpar: () => {
      setValor('');
      setErro(null);
    }
  };
};

// Importar React para o hook
import React from 'react';