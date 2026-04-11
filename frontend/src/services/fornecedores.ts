import { createCrudService, extractResponseData } from './createCrudService';
import { apiWithRetry } from './api';

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  endereco?: string;
  contato?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export type FornecedorCreate = Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>;
export type FornecedorUpdate = Partial<FornecedorCreate>;

// CRUD básico via factory
export const fornecedorService = createCrudService<Fornecedor, FornecedorCreate, FornecedorUpdate>('fornecedores');

// Operações específicas do fornecedor
export async function verificarRelacionamentosFornecedor(id: number) {
  const { data } = await apiWithRetry.get(`/fornecedores/${id}/relacionamentos`);
  return extractResponseData(data);
}

// Importar fornecedores em lote (sempre substitui existentes)
export async function importarFornecedoresLote(fornecedores: FornecedorCreate[]) {
  const { data } = await apiWithRetry.post('/fornecedores/importar-lote', { fornecedores });
  return extractResponseData(data);
}