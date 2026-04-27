interface RomaneioQrRoute {
  id: number;
  nome: string;
}

interface BuildRomaneioQrPayloadInput {
  rotaIds: number[];
  rotas: RomaneioQrRoute[];
  filters: {
    dataInicio?: string;
    dataFim?: string;
    status?: string;
  };
}

export function buildRomaneioQrPayload({
  rotaIds,
  rotas,
  filters,
}: BuildRomaneioQrPayloadInput) {
  const todasAsRotas = rotaIds.length === 0 || (rotas.length > 0 && rotaIds.length === rotas.length);
  const payload: any = {
    t: "romaneio",
    r: todasAsRotas ? "*" : rotaIds,
    di: filters.dataInicio,
    df: filters.dataFim,
    s: filters.status || "todos",
  };

  if (!todasAsRotas) {
    const rotaNomes = rotas
      .filter((rota) => rotaIds.includes(rota.id))
      .map((rota) => rota.nome);

    payload.rn = rotaNomes.length === 1
      ? rotaNomes[0]
      : `${rotaIds.length} rotas selecionadas`;

    if (rotaNomes.length > 0 && rotaNomes.length <= 3) {
      payload.rns = rotaNomes;
    }
  }

  return payload;
}
