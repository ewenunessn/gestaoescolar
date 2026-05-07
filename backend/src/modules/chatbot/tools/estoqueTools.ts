type QueryFn = (sql: string, params?: any[]) => Promise<{ rows: any[] }>;

export interface ConsultarAtualizacoesEstoqueInput {
  produtoNome: string;
  dias: number;
  escolaId?: number;
}

export interface ConstruirContextoOperacionalInput {
  precisaDados?: boolean;
  precisaDadosEstoque?: boolean;
  produtoNome?: string;
  escolaNome?: string;
  dias?: number;
  termosProdutos?: string[];
  termosEscolas?: string[];
  periodoDias?: number;
  pergunta?: string;
}

export interface ProdutoCandidato {
  id: number;
  nome: string;
  unidade: string;
}

export interface EscolaAtualizada {
  escolaId: number;
  escolaNome: string;
  ultimaAtualizacao: string;
  usuarioNome: string | null;
  tipoEvento: string;
  quantidadeMovimentada: number;
  saldoAtual: number;
}

export interface EscolaPendente {
  escolaId: number;
  escolaNome: string;
}

export interface AtualizacoesEstoqueResult {
  status: "ok" | "product_not_found" | "ambiguous_product";
  produto?: ProdutoCandidato;
  candidatos?: ProdutoCandidato[];
  periodo: {
    dias: number;
    inicio: string;
    fim: string;
  };
  totalEscolasAtivas: number;
  escolasAtualizadas: EscolaAtualizada[];
  escolasPendentes: EscolaPendente[];
  observacoes: string[];
}

export interface EstoqueToolDeps {
  query?: QueryFn;
  now?: Date;
}

export interface ConsultarEstoqueProdutoEscolaInput {
  produtoNome: string;
  escolaNome: string;
}

export interface EscolaCandidato {
  id: number;
  nome: string;
}

export interface EstoqueProdutoEscolaResult {
  status: "ok" | "product_not_found" | "ambiguous_product" | "school_not_found" | "ambiguous_school";
  produto?: ProdutoCandidato;
  escola?: EscolaCandidato;
  candidatosProduto?: ProdutoCandidato[];
  candidatosEscola?: EscolaCandidato[];
  saldoAtual?: number;
  ultimaAtualizacao?: string | null;
  ultimoTipoEvento?: string | null;
  ultimoUsuarioNome?: string | null;
  ultimaQuantidadeMovimentada?: number;
  observacoes: string[];
}

export interface EscolaComEstoque {
  escolaId: number;
  escolaNome: string;
  produtosComEstoque: number;
  saldoTotalItens: number;
  ultimaAtualizacao: string | null;
}

export interface EscolaComProdutoEstoque {
  escolaId: number;
  escolaNome: string;
  saldoAtual: number;
  ultimaAtualizacao: string | null;
}

export interface EscolasComEstoqueResult {
  status: "ok";
  totalEscolasComEstoque: number;
  escolas: EscolaComEstoque[];
  observacoes: string[];
}

export interface ContextoOperacionalEstoqueResult {
  tipo: "estoque";
  filtros: {
    termosProdutos: string[];
    termosEscolas: string[];
    dias: number;
  };
  periodo: {
    dias: number;
    inicio: string;
    fim: string;
  };
  produtos: ProdutoCandidato[];
  produtoSelecionado?: ProdutoCandidato;
  escolasCandidatas: EscolaCandidato[];
  escolasComEstoque: EscolaComEstoque[];
  escolasComProdutoEmEstoque: EscolaComProdutoEstoque[];
  escolasAtualizadas: EscolaAtualizada[];
  escolasPendentes: EscolaPendente[];
  saldoNaEscola?: EstoqueProdutoEscolaResult;
  observacoes: string[];
}

const defaultQuery: QueryFn = async (sql, params = []) => {
  const db = (await import("../../../database")).default;
  return db.query(sql, params);
};

function normalizeSearch(value: string): string {
  return `%${value.trim().replace(/\s+/g, "%")}%`;
}

function uniqueTerms(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const value of values) {
    const normalized = value?.trim().replace(/\s+/g, " ");
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(normalized);
  }

  return terms.slice(0, 3);
}

function clampDays(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(Math.trunc(value), 30);
}

function mapProduto(row: any): ProdutoCandidato {
  return {
    id: Number(row.id),
    nome: String(row.nome),
    unidade: String(row.unidade || "UN"),
  };
}

function mapAtualizada(row: any): EscolaAtualizada {
  return {
    escolaId: Number(row.escola_id),
    escolaNome: String(row.escola_nome),
    ultimaAtualizacao: new Date(row.ultima_atualizacao).toISOString(),
    usuarioNome: row.usuario_nome ?? null,
    tipoEvento: String(row.tipo_evento),
    quantidadeMovimentada: Number(row.quantidade_movimentada ?? 0),
    saldoAtual: Number(row.saldo_atual ?? 0),
  };
}

async function resolverProduto(query: QueryFn, produtoNome: string): Promise<ProdutoCandidato[]> {
  const result = await query(
    `
      SELECT
        p.id,
        p.nome,
        COALESCE(um.codigo, 'UN') AS unidade
      FROM produtos p
      LEFT JOIN unidades_medida um ON um.id = p.unidade_medida_id
      WHERE COALESCE(p.ativo, true) = true
        AND LOWER(p.nome) LIKE LOWER($1)
      ORDER BY
        CASE WHEN LOWER(p.nome) = LOWER($2) THEN 0 ELSE 1 END,
        p.nome
      LIMIT 5
    `,
    [normalizeSearch(produtoNome), produtoNome.trim()],
  );

  return result.rows.map(mapProduto);
}

async function resolverEscola(query: QueryFn, escolaNome: string): Promise<EscolaCandidato[]> {
  const result = await query(
    `
      SELECT id, nome
      FROM escolas
      WHERE COALESCE(ativo, true) = true
        AND LOWER(nome) LIKE LOWER($1)
      ORDER BY
        CASE WHEN LOWER(nome) = LOWER($2) THEN 0 ELSE 1 END,
        nome
      LIMIT 5
    `,
    [normalizeSearch(escolaNome), escolaNome.trim()],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    nome: String(row.nome),
  }));
}

async function listarEscolasAtivas(query: QueryFn, escolaId?: number): Promise<EscolaPendente[]> {
  const result = await query(
    `
      SELECT id, nome
      FROM escolas
      WHERE COALESCE(ativo, true) = true
        AND ($1::integer IS NULL OR id = $1)
      ORDER BY nome
    `,
    [escolaId ?? null],
  );

  return result.rows.map((row) => ({
    escolaId: Number(row.id),
    escolaNome: String(row.nome),
  }));
}

function escolherUnicoProduto(candidatos: ProdutoCandidato[], produtoNome: string): ProdutoCandidato | null {
  const exactMatches = candidatos.filter(
    (item) => item.nome.trim().toLowerCase() === produtoNome.trim().toLowerCase(),
  );

  if (candidatos.length > 1 && exactMatches.length !== 1) return null;
  return exactMatches[0] ?? candidatos[0] ?? null;
}

function escolherUnicaEscola(candidatos: EscolaCandidato[], escolaNome: string): EscolaCandidato | null {
  const exactMatches = candidatos.filter(
    (item) => item.nome.trim().toLowerCase() === escolaNome.trim().toLowerCase(),
  );

  if (candidatos.length > 1 && exactMatches.length !== 1) return null;
  return exactMatches[0] ?? candidatos[0] ?? null;
}

async function listarAtualizacoes(
  query: QueryFn,
  produtoId: number,
  inicio: string,
  escolaId?: number,
): Promise<EscolaAtualizada[]> {
  const result = await query(
    `
      WITH eventos_periodo AS (
        SELECT DISTINCT ON (ee.escola_id)
          ee.escola_id,
          es.nome AS escola_nome,
          ee.data_evento AS ultima_atualizacao,
          ee.usuario_nome_snapshot AS usuario_nome,
          ee.tipo_evento,
          ee.quantidade_delta AS quantidade_movimentada
        FROM estoque_eventos ee
        INNER JOIN escolas es ON es.id = ee.escola_id
        WHERE ee.escopo = 'escola'
          AND ee.produto_id = $1
          AND ee.data_evento >= $2::timestamp
          AND COALESCE(es.ativo, true) = true
          AND ($3::integer IS NULL OR ee.escola_id = $3)
        ORDER BY ee.escola_id, ee.data_evento DESC, ee.id DESC
      ),
      saldos AS (
        SELECT escola_id, SUM(quantidade_delta) AS saldo_atual
        FROM estoque_eventos
        WHERE escopo = 'escola'
          AND produto_id = $1
        GROUP BY escola_id
      )
      SELECT
        ep.*,
        COALESCE(s.saldo_atual, 0) AS saldo_atual
      FROM eventos_periodo ep
      LEFT JOIN saldos s ON s.escola_id = ep.escola_id
      ORDER BY ep.escola_nome
    `,
    [produtoId, inicio, escolaId ?? null],
  );

  return result.rows.map(mapAtualizada);
}

export async function consultarAtualizacoesProdutoPorPeriodo(
  input: ConsultarAtualizacoesEstoqueInput,
  deps: EstoqueToolDeps = {},
): Promise<AtualizacoesEstoqueResult> {
  const query = deps.query ?? defaultQuery;
  const now = deps.now ?? new Date();
  const dias = clampDays(input.dias);
  const inicioDate = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000);
  const inicio = inicioDate.toISOString();
  const fim = now.toISOString();
  const base = {
    periodo: { dias, inicio, fim },
    totalEscolasAtivas: 0,
    escolasAtualizadas: [],
    escolasPendentes: [],
    observacoes: [] as string[],
  };

  const candidatos = await resolverProduto(query, input.produtoNome);

  if (candidatos.length === 0) {
    return {
      status: "product_not_found",
      candidatos: [],
      ...base,
      observacoes: [`Nenhum produto ativo encontrado para "${input.produtoNome}".`],
    };
  }

  const produto = escolherUnicoProduto(candidatos, input.produtoNome);

  if (!produto) {
    return {
      status: "ambiguous_product",
      candidatos,
      ...base,
      observacoes: ["Mais de um produto parecido foi encontrado. Refine o nome do produto."],
    };
  }

  const escolas = await listarEscolasAtivas(query, input.escolaId);
  const atualizadas = await listarAtualizacoes(query, produto.id, inicio, input.escolaId);
  const atualizadasIds = new Set(atualizadas.map((item) => item.escolaId));

  return {
    status: "ok",
    produto,
    ...base,
    totalEscolasAtivas: escolas.length,
    escolasAtualizadas: atualizadas,
    escolasPendentes: escolas.filter((item) => !atualizadasIds.has(item.escolaId)),
    observacoes: dias !== input.dias ? ["Periodo limitado ao maximo de 30 dias."] : [],
  };
}

export async function consultarEstoqueProdutoNaEscola(
  input: ConsultarEstoqueProdutoEscolaInput,
  deps: EstoqueToolDeps = {},
): Promise<EstoqueProdutoEscolaResult> {
  const query = deps.query ?? defaultQuery;
  const candidatosProduto = await resolverProduto(query, input.produtoNome);

  if (candidatosProduto.length === 0) {
    return {
      status: "product_not_found",
      candidatosProduto: [],
      observacoes: [`Nenhum produto ativo encontrado para "${input.produtoNome}".`],
    };
  }

  const produto = escolherUnicoProduto(candidatosProduto, input.produtoNome);

  if (!produto) {
    return {
      status: "ambiguous_product",
      candidatosProduto,
      observacoes: ["Mais de um produto parecido foi encontrado. Refine o nome do produto."],
    };
  }

  const candidatosEscola = await resolverEscola(query, input.escolaNome);

  if (candidatosEscola.length === 0) {
    return {
      status: "school_not_found",
      produto,
      candidatosEscola: [],
      observacoes: [`Nenhuma escola ativa encontrada para "${input.escolaNome}".`],
    };
  }

  const escola = escolherUnicaEscola(candidatosEscola, input.escolaNome);

  if (!escola) {
    return {
      status: "ambiguous_school",
      produto,
      candidatosEscola,
      observacoes: ["Mais de uma escola parecida foi encontrada. Refine o nome da escola."],
    };
  }

  const result = await query(
    `
      WITH saldo AS (
        SELECT
          COALESCE(SUM(quantidade_delta), 0) AS saldo_atual,
          MAX(data_evento) AS ultima_atualizacao
        FROM estoque_eventos
        WHERE escopo = 'escola'
          AND produto_id = $1
          AND escola_id = $2
      ),
      ultimo_evento AS (
        SELECT
          tipo_evento AS ultimo_tipo_evento,
          usuario_nome_snapshot AS ultimo_usuario_nome,
          quantidade_delta AS ultima_quantidade_movimentada
        FROM estoque_eventos
        WHERE escopo = 'escola'
          AND produto_id = $1
          AND escola_id = $2
        ORDER BY data_evento DESC, id DESC
        LIMIT 1
      )
      SELECT
        saldo.saldo_atual,
        saldo.ultima_atualizacao,
        ultimo_evento.ultimo_tipo_evento,
        ultimo_evento.ultimo_usuario_nome,
        ultimo_evento.ultima_quantidade_movimentada
      FROM saldo
      LEFT JOIN ultimo_evento ON true
    `,
    [produto.id, escola.id],
  );

  const row = result.rows[0] ?? {};

  return {
    status: "ok",
    produto,
    escola,
    saldoAtual: Number(row.saldo_atual ?? 0),
    ultimaAtualizacao: row.ultima_atualizacao ? new Date(row.ultima_atualizacao).toISOString() : null,
    ultimoTipoEvento: row.ultimo_tipo_evento ?? null,
    ultimoUsuarioNome: row.ultimo_usuario_nome ?? null,
    ultimaQuantidadeMovimentada: Number(row.ultima_quantidade_movimentada ?? 0),
    observacoes: [],
  };
}

export async function consultarEscolasComEstoque(
  deps: EstoqueToolDeps = {},
): Promise<EscolasComEstoqueResult> {
  const query = deps.query ?? defaultQuery;
  const result = await query(
    `
      SELECT
        es.id AS escola_id,
        es.nome AS escola_nome,
        COUNT(*) AS produtos_com_estoque,
        SUM(saldo.quantidade_atual) AS saldo_total_itens,
        MAX(saldo.ultima_atualizacao) AS ultima_atualizacao
      FROM (
        SELECT
          ee.escola_id,
          ee.produto_id,
          SUM(ee.quantidade_delta) AS quantidade_atual,
          MAX(ee.data_evento) AS ultima_atualizacao
        FROM estoque_eventos ee
        WHERE ee.escopo = 'escola'
        GROUP BY ee.escola_id, ee.produto_id
        HAVING SUM(ee.quantidade_delta) > 0
      ) saldo
      INNER JOIN escolas es ON es.id = saldo.escola_id
      WHERE COALESCE(es.ativo, true) = true
      GROUP BY es.id, es.nome
      ORDER BY es.nome
    `,
  );

  const escolas = result.rows.map((row) => ({
    escolaId: Number(row.escola_id),
    escolaNome: String(row.escola_nome),
    produtosComEstoque: Number(row.produtos_com_estoque ?? 0),
    saldoTotalItens: Number(row.saldo_total_itens ?? 0),
    ultimaAtualizacao: row.ultima_atualizacao ? new Date(row.ultima_atualizacao).toISOString() : null,
  }));

  return {
    status: "ok",
    totalEscolasComEstoque: escolas.length,
    escolas,
    observacoes: [],
  };
}

async function listarEscolasComProdutoEmEstoque(
  query: QueryFn,
  produtoId: number,
): Promise<EscolaComProdutoEstoque[]> {
  const result = await query(
    `
      SELECT
        es.id AS escola_id,
        es.nome AS escola_nome,
        SUM(ee.quantidade_delta) AS saldo_atual,
        MAX(ee.data_evento) AS ultima_atualizacao
      FROM estoque_eventos ee
      INNER JOIN escolas es ON es.id = ee.escola_id
      WHERE ee.escopo = 'escola'
        AND ee.produto_id = $1
        AND COALESCE(es.ativo, true) = true
      GROUP BY es.id, es.nome
      HAVING SUM(ee.quantidade_delta) > 0
      ORDER BY es.nome
    `,
    [produtoId],
  );

  return result.rows.map((row) => ({
    escolaId: Number(row.escola_id),
    escolaNome: String(row.escola_nome),
    saldoAtual: Number(row.saldo_atual ?? 0),
    ultimaAtualizacao: row.ultima_atualizacao ? new Date(row.ultima_atualizacao).toISOString() : null,
  }));
}

function perguntaPedeEstoqueAtualPorProduto(pergunta?: string): boolean {
  if (!pergunta) return false;
  const normalized = pergunta
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return /\b(?:qual|quais)\s+escolas?\b/.test(normalized) && /\b(possui|possuem|tem|estoque|saldo)\b/.test(normalized);
}

export async function construirContextoOperacionalEstoque(
  input: ConstruirContextoOperacionalInput,
  deps: EstoqueToolDeps = {},
): Promise<ContextoOperacionalEstoqueResult> {
  const query = deps.query ?? defaultQuery;
  const now = deps.now ?? new Date();
  const dias = clampDays(input.periodoDias ?? input.dias ?? 2);
  const inicio = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();
  const fim = now.toISOString();
  const termosProdutos = uniqueTerms([...(input.termosProdutos ?? []), input.produtoNome]);
  const termosEscolas = uniqueTerms([...(input.termosEscolas ?? []), input.escolaNome]);
  const observacoes: string[] = [];

  const produtosPorTermo = await Promise.all(termosProdutos.map((termo) => resolverProduto(query, termo)));
  const escolasPorTermo = await Promise.all(termosEscolas.map((termo) => resolverEscola(query, termo)));
  const produtos = produtosPorTermo.flat();
  const escolasCandidatas = escolasPorTermo.flat();
  const produtoSelecionado =
    termosProdutos.length === 1 ? escolherUnicoProduto(produtosPorTermo[0] ?? [], termosProdutos[0]) ?? undefined : undefined;
  const escolaSelecionada =
    termosEscolas.length === 1 ? escolherUnicaEscola(escolasPorTermo[0] ?? [], termosEscolas[0]) ?? undefined : undefined;
  const escolasComEstoque = termosProdutos.length === 0 && termosEscolas.length === 0 ? (await consultarEscolasComEstoque({ query })).escolas : [];
  let escolasComProdutoEmEstoque: EscolaComProdutoEstoque[] = [];
  let escolasAtualizadas: EscolaAtualizada[] = [];
  let escolasPendentes: EscolaPendente[] = [];
  let saldoNaEscola: EstoqueProdutoEscolaResult | undefined;

  for (const [index, termo] of termosProdutos.entries()) {
    if ((produtosPorTermo[index] ?? []).length === 0) {
      observacoes.push(`Nenhum produto ativo encontrado para "${termo}".`);
    }
  }

  if (termosProdutos.length === 1 && (produtosPorTermo[0] ?? []).length > 1 && !produtoSelecionado) {
    observacoes.push("Mais de um produto parecido foi encontrado. Use os produtos candidatos para pedir refinamento.");
  }

  for (const [index, termo] of termosEscolas.entries()) {
    if ((escolasPorTermo[index] ?? []).length === 0) {
      observacoes.push(`Nenhuma escola ativa encontrada para "${termo}".`);
    }
  }

  if (produtoSelecionado && !escolaSelecionada && perguntaPedeEstoqueAtualPorProduto(input.pergunta)) {
    escolasComProdutoEmEstoque = await listarEscolasComProdutoEmEstoque(query, produtoSelecionado.id);
  } else if (produtoSelecionado && !escolaSelecionada) {
    const escolas = await listarEscolasAtivas(query);
    escolasAtualizadas = await listarAtualizacoes(query, produtoSelecionado.id, inicio);
    const atualizadasIds = new Set(escolasAtualizadas.map((item) => item.escolaId));
    escolasPendentes = escolas.filter((item) => !atualizadasIds.has(item.escolaId));
  }

  if (termosProdutos.length === 1 && termosEscolas.length === 1) {
    saldoNaEscola = await consultarEstoqueProdutoNaEscola(
      { produtoNome: termosProdutos[0], escolaNome: termosEscolas[0] },
      { query },
    );
  }

  if (dias !== (input.periodoDias ?? input.dias) && (input.periodoDias ?? input.dias) !== undefined) {
    observacoes.push("Periodo limitado ao maximo de 30 dias.");
  }

  return {
    tipo: "estoque",
    filtros: {
      termosProdutos,
      termosEscolas,
      dias,
    },
    periodo: { dias, inicio, fim },
    produtos,
    produtoSelecionado,
    escolasCandidatas,
    escolasComEstoque,
    escolasComProdutoEmEstoque,
    escolasAtualizadas,
    escolasPendentes,
    saldoNaEscola,
    observacoes,
  };
}
