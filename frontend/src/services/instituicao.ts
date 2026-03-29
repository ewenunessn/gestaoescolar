import api from './api';

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
  pdf_templates?: Record<string, any>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstituicaoForm {
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

export const buscarInstituicao = async (): Promise<Instituicao> => {
  const response = await api.get('/instituicao');
  return response.data;
};

export const atualizarInstituicao = async (dados: InstituicaoForm): Promise<{ message: string; instituicao: Instituicao }> => {
  const response = await api.put('/instituicao', dados);
  return response.data;
};

export const uploadLogoArquivo = async (dados: InstituicaoForm, logoFile: File): Promise<{ message: string; instituicao: Instituicao }> => {
  const formData = new FormData();
  Object.entries(dados).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  formData.append('logo', logoFile);
  const response = await api.put('/instituicao', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data;
};

export const uploadLogoBase64 = async (logoBase64: string): Promise<{ message: string; instituicao: Instituicao }> => {
  const response = await api.post('/instituicao/logo-base64', { logoBase64 });
  return response.data;
};

export const salvarTemplatePDF = async (nome: string, template: any): Promise<void> => {
  await api.put(`/instituicao/templates/${nome}`, { template });
};

export const arquivoParaBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
