export interface Instituicao {
  id: number;
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  site?: string;
  logo_url?: string;
  secretario_nome?: string;
  secretario_cargo?: string;
  departamento?: string;
  pdf_templates?: any;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InstituicaoInput {
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  site?: string;
  secretario_nome?: string;
  secretario_cargo?: string;
  departamento?: string;
}
