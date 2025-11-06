import { listarEscolas, buscarEscola, criarEscola, editarEscola, removerEscola } from './escolas';

class EscolaService {
  async listarEscolas() {
    return listarEscolas();
  }

  async buscarEscola(id: number) {
    return buscarEscola(id);
  }

  async criarEscola(escola: any) {
    return criarEscola(escola);
  }

  async editarEscola(id: number, escola: any) {
    return editarEscola(id, escola);
  }

  async removerEscola(id: number) {
    return removerEscola(id);
  }
}

export const escolaService = new EscolaService();
export default escolaService;