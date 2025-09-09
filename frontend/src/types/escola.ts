/**
 * Tipos relacionados às escolas e rotas
 */

export interface Escola {
  id: number;
  nome: string;
  endereco?: string;
  municipio?: string;
  endereco_maps?: string;
  telefone?: string;
  nome_gestor?: string;
  administracao?: 'municipal' | 'estadual' | 'federal' | 'particular';
  ativo: boolean;
  total_alunos?: number;
  modalidades?: string;
}

export interface EscolaFormData {
  nome: string;
  endereco: string;
  municipio: string;
  endereco_maps: string;
  telefone: string;
  nome_gestor: string;
  administracao: '' | 'municipal' | 'estadual' | 'federal' | 'particular';
  ativo: boolean;
  total_alunos: string;
}

export interface EscolaComCoordenadas extends Escola {
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface FiltroEscolas {
  busca?: string;
  administracao?: string;
  ativo?: boolean;
  municipio?: string;
}

export interface EstatisticasEscolas {
  total: number;
  ativas: number;
  inativas: number;
  totalAlunos: number;
}