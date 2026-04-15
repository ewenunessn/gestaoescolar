/**
 * @deprecated Use `modalidades.ts` instead.
 * Este arquivo existe apenas para compatibilidade com imports antigos.
 * Re-exporta tudo de modalidades.ts.
 */
export {
  modalidadeService,
  modalidadeService as default,
  type Modalidade,
  type ModalidadeInput,
} from './modalidades';

// Aliases de compatibilidade para funções com nomes diferentes
import { modalidadeService as svc } from './modalidades';

export async function listarModalidades(ativo?: boolean) {
  const todos = await svc.listar();
  if (ativo !== undefined) return todos.filter((m: any) => m.ativo === ativo);
  return todos;
}

export async function criarModalidade(dados: any) {
  return svc.criar(dados);
}

export async function editarModalidade(id: number, dados: any) {
  return svc.atualizar(id, dados);
}

export async function removerModalidade(id: number) {
  return svc.remover(id);
}
