import { apiWithRetry } from "./api";

export async function listarCardapios() {
  const { data } = await apiWithRetry.get("/cardapios");
  return data.data || []; // Return the actual array from the response
}

export async function buscarCardapio(id: number) {
  const { data } = await apiWithRetry.get(`/cardapios/${id}`);
  return data.data || null; // Return the actual data from the response
}

export async function criarCardapio(cardapio: any) {
  const { data } = await apiWithRetry.post("/cardapios", cardapio);
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function editarCardapio(id: number, cardapio: any) {
  const { data } = await apiWithRetry.put(`/cardapios/${id}`, cardapio);
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function deletarCardapio(id: number) {
  await apiWithRetry.delete(`/cardapios/${id}`);
}

export async function listarCardapioRefeicoes(cardapioId: number) {
  const { data } = await apiWithRetry.get(`/cardapios/${cardapioId}/refeicoes`);
  return data.data || []; // Return the actual array from the response
}

export async function adicionarCardapioRefeicao(cardapioRefeicao: any) {
  if (!cardapioRefeicao.cardapio_id)
    throw new Error("cardapio_id é obrigatório");
  const { data } = await apiWithRetry.post(
    `/cardapios/${cardapioRefeicao.cardapio_id}/refeicoes`,
    cardapioRefeicao
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function atualizarCardapioRefeicao(
  id: number,
  cardapioRefeicao: any
) {
  const { data } = await apiWithRetry.put(
    `/cardapios/refeicoes/${id}`,
    cardapioRefeicao
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function deletarCardapioRefeicao(cardapioId: number, refeicaoId: number) {
  await apiWithRetry.delete(`/cardapios/${cardapioId}/refeicoes/${refeicaoId}`);
}

export async function calcularNecessidades(cardapioId: number) {
  const { data } = await apiWithRetry.get(
    `/cardapios/${cardapioId}/necessidades`
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function calcularCustoRefeicoes(cardapioId: number) {
  const { data } = await apiWithRetry.get(`/cardapios/${cardapioId}/custo-refeicoes`);
  return data.data || data; // Handle both new format {success, data} and old format
}
