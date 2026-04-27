interface RomaneioPdfRoute {
  id: number;
  nome: string;
}

interface RomaneioPdfRow {
  data_entrega_formatada: string;
  produto_nome: string;
  quantidade_formatada: string;
  unidade: string;
  num_escolas: number;
}

export function getRomaneioRouteLabel(rotaIds: number[], rotas: RomaneioPdfRoute[]): string {
  if (rotaIds.length === 0 || rotaIds.length === rotas.length) return "Todas as Rotas";

  const selectedNames = rotas
    .filter((rota) => rotaIds.includes(rota.id))
    .map((rota) => rota.nome);

  return selectedNames.length > 0 ? selectedNames.join(", ") : "Rotas selecionadas";
}

export function buildRomaneioPdfRows(rows: RomaneioPdfRow[]) {
  return rows.map((row) => [
    row.data_entrega_formatada,
    row.produto_nome,
    row.quantidade_formatada,
    row.unidade,
    String(row.num_escolas),
  ]);
}

export function buildRomaneioPdfFileName(filters: { dataInicio?: string; dataFim?: string }) {
  if (filters.dataInicio && filters.dataFim) {
    return `romaneio-${filters.dataInicio}-a-${filters.dataFim}.pdf`;
  }

  return `romaneio-${new Date().toISOString().split("T")[0]}.pdf`;
}
