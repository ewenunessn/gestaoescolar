import { PoolClient, QueryResult } from 'pg';
import db from '../../../database';
import { obterDataAtual } from '../../../utils/dateUtils';

type Queryable = Pick<PoolClient, 'query'> | typeof db;

export type OperacaoHistoricoAlunoModalidade = 'create' | 'update' | 'delete' | 'bootstrap';

export interface FiltrosRelatorioAlunosHistorico {
  data_referencia?: string | number | null;
  escola_id?: string | number | null;
  modalidade_id?: string | number | null;
  escola_ativo?: string | boolean | null;
}

export interface FiltrosHistoricoAlunos extends FiltrosRelatorioAlunosHistorico {
  data_inicio?: string | null;
  data_fim?: string | null;
  limit?: string | number | null;
}

export interface RegistrarHistoricoAlunoModalidadeInput {
  escola_id: number;
  modalidade_id: number;
  quantidade_alunos: number;
  quantidade_anterior?: number | null;
  operacao: OperacaoHistoricoAlunoModalidade;
  vigente_de?: string | null;
  observacao?: string | null;
  usuario_id?: number | null;
  origem?: string | null;
}

export interface RelatorioAlunosHistorico {
  data_referencia: string;
  linhas: Array<Record<string, any>>;
  por_escola: Array<Record<string, any>>;
  por_modalidade: Array<Record<string, any>>;
  total_geral: number;
}

function normalizeDateInput(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return obterDataAtual();
}

function parseOptionalPositiveInt(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return 500;
  return Math.min(parsed, 1000);
}

function normalizeOptionalDate(value: unknown): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return null;
}

function buildEscolaAtivoWhereSql(value: unknown): string {
  if (value === false || value === 'false' || value === 'inativas' || value === 'inactive') {
    return 'e.ativo = false';
  }

  if (value === 'todas' || value === 'todos' || value === 'all') {
    return 'TRUE';
  }

  return 'e.ativo = true';
}

export function buildRelatorioAlunosHistoricoParams(filters: FiltrosRelatorioAlunosHistorico = {}) {
  const values: any[] = [normalizeDateInput(filters.data_referencia)];
  const conditions = ['h.vigente_de <= $1::date'];

  const escolaId = parseOptionalPositiveInt(filters.escola_id);
  if (escolaId !== null) {
    values.push(escolaId);
    conditions.push(`h.escola_id = $${values.length}`);
  }

  const modalidadeId = parseOptionalPositiveInt(filters.modalidade_id);
  if (modalidadeId !== null) {
    values.push(modalidadeId);
    conditions.push(`h.modalidade_id = $${values.length}`);
  }

  return {
    dataReferencia: values[0] as string,
    values,
    whereSql: conditions.join(' AND '),
    escolaAtivoWhereSql: buildEscolaAtivoWhereSql(filters.escola_ativo),
  };
}

function buildHistoricoListParams(filters: FiltrosHistoricoAlunos = {}) {
  const values: any[] = [];
  const conditions: string[] = [];

  const escolaId = parseOptionalPositiveInt(filters.escola_id);
  if (escolaId !== null) {
    values.push(escolaId);
    conditions.push(`h.escola_id = $${values.length}`);
  }

  const modalidadeId = parseOptionalPositiveInt(filters.modalidade_id);
  if (modalidadeId !== null) {
    values.push(modalidadeId);
    conditions.push(`h.modalidade_id = $${values.length}`);
  }

  const dataInicio = normalizeOptionalDate(filters.data_inicio);
  if (dataInicio) {
    values.push(dataInicio);
    conditions.push(`h.vigente_de >= $${values.length}::date`);
  }

  const dataFim = normalizeOptionalDate(filters.data_fim);
  if (dataFim) {
    values.push(dataFim);
    conditions.push(`h.vigente_de <= $${values.length}::date`);
  }

  values.push(normalizeLimit(filters.limit));
  const limitPlaceholder = `$${values.length}`;

  return {
    values,
    limitPlaceholder,
    whereSql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
  };
}

export function normalizeHistoricoRow<T extends Record<string, any>>(row: T): T {
  const numericFields = [
    'id',
    'escola_id',
    'modalidade_id',
    'quantidade_alunos',
    'quantidade_anterior',
    'total_alunos',
    'total_escolas',
    'total_modalidades',
    'total_geral',
  ];

  const normalized: Record<string, any> = { ...row };
  for (const field of numericFields) {
    if (normalized[field] !== undefined && normalized[field] !== null) {
      normalized[field] = Number(normalized[field]);
    }
  }

  return normalized as T;
}

export async function registrarHistoricoAlunoModalidade(
  client: Queryable,
  input: RegistrarHistoricoAlunoModalidadeInput
) {
  const quantidadeAlunos = Number(input.quantidade_alunos);
  if (!Number.isInteger(quantidadeAlunos) || quantidadeAlunos < 0) {
    throw new Error('Quantidade de alunos deve ser um inteiro maior ou igual a zero');
  }

  const vigenteDe = normalizeDateInput(input.vigente_de);
  const result = await client.query(`
    INSERT INTO escola_modalidades_historico (
      escola_id,
      modalidade_id,
      quantidade_alunos,
      quantidade_anterior,
      operacao,
      vigente_de,
      observacao,
      usuario_id,
      origem,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, CURRENT_TIMESTAMP)
    RETURNING *
  `, [
    input.escola_id,
    input.modalidade_id,
    quantidadeAlunos,
    input.quantidade_anterior ?? null,
    input.operacao,
    vigenteDe,
    input.observacao || null,
    input.usuario_id ?? null,
    input.origem || 'manual',
  ]);

  return normalizeHistoricoRow(result.rows[0]);
}

export async function criarSnapshotInicialHistorico(client: Queryable = db): Promise<number> {
  const result: QueryResult = await client.query(`
    INSERT INTO escola_modalidades_historico (
      escola_id,
      modalidade_id,
      quantidade_alunos,
      quantidade_anterior,
      operacao,
      vigente_de,
      observacao,
      origem,
      created_at
    )
    SELECT
      em.escola_id,
      em.modalidade_id,
      COALESCE(em.quantidade_alunos, 0),
      NULL,
      'bootstrap',
      CURRENT_DATE,
      'Snapshot inicial criado a partir de escola_modalidades',
      'migration',
      CURRENT_TIMESTAMP
    FROM escola_modalidades em
    INNER JOIN escolas e ON e.id = em.escola_id
    INNER JOIN modalidades m ON m.id = em.modalidade_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM escola_modalidades_historico h
      WHERE h.escola_id = em.escola_id
        AND h.modalidade_id = em.modalidade_id
    )
  `);

  return result.rowCount || 0;
}

export async function listarHistoricoAlunosModalidades(filters: FiltrosHistoricoAlunos = {}) {
  const params = buildHistoricoListParams(filters);
  const result = await db.query(`
    SELECT
      h.id,
      h.escola_id,
      e.nome as escola_nome,
      h.modalidade_id,
      m.nome as modalidade_nome,
      h.quantidade_alunos,
      h.quantidade_anterior,
      h.operacao,
      h.vigente_de,
      h.observacao,
      h.usuario_id,
      u.nome as usuario_nome,
      h.origem,
      h.created_at
    FROM escola_modalidades_historico h
    LEFT JOIN escolas e ON e.id = h.escola_id
    LEFT JOIN modalidades m ON m.id = h.modalidade_id
    LEFT JOIN usuarios u ON u.id = h.usuario_id
    ${params.whereSql}
    ORDER BY h.vigente_de DESC, h.created_at DESC, h.id DESC
    LIMIT ${params.limitPlaceholder}
  `, params.values);

  return result.rows.map(normalizeHistoricoRow);
}

export async function gerarRelatorioAlunosModalidades(
  filters: FiltrosRelatorioAlunosHistorico = {}
): Promise<RelatorioAlunosHistorico> {
  await criarSnapshotInicialHistorico();

  const params = buildRelatorioAlunosHistoricoParams(filters);
  const result = await db.query(`
    WITH ultima_versao AS (
      SELECT DISTINCT ON (h.escola_id, h.modalidade_id)
        h.escola_id,
        h.modalidade_id,
        h.quantidade_alunos,
        h.vigente_de,
        h.created_at,
        h.id
      FROM escola_modalidades_historico h
      WHERE ${params.whereSql}
      ORDER BY h.escola_id, h.modalidade_id, h.vigente_de DESC, h.created_at DESC, h.id DESC
    )
    SELECT
      u.escola_id,
      e.nome as escola_nome,
      e.ativo as escola_ativo,
      u.modalidade_id,
      m.nome as modalidade_nome,
      u.quantidade_alunos,
      u.vigente_de
    FROM ultima_versao u
    INNER JOIN escolas e ON e.id = u.escola_id
    INNER JOIN modalidades m ON m.id = u.modalidade_id
    WHERE u.quantidade_alunos > 0
      AND ${params.escolaAtivoWhereSql}
    ORDER BY e.nome, m.nome
  `, params.values);

  const linhas = result.rows.map(normalizeHistoricoRow);
  const escolas = new Map<number, Record<string, any>>();
  const modalidades = new Map<number, Record<string, any>>();
  let totalGeral = 0;

  for (const linha of linhas) {
    const quantidade = Number(linha.quantidade_alunos) || 0;
    totalGeral += quantidade;

    if (!escolas.has(linha.escola_id)) {
      escolas.set(linha.escola_id, {
        escola_id: linha.escola_id,
        escola_nome: linha.escola_nome,
        total_alunos: 0,
        total_modalidades: 0,
      });
    }
    const escola = escolas.get(linha.escola_id)!;
    escola.total_alunos += quantidade;
    escola.total_modalidades += 1;

    if (!modalidades.has(linha.modalidade_id)) {
      modalidades.set(linha.modalidade_id, {
        modalidade_id: linha.modalidade_id,
        modalidade_nome: linha.modalidade_nome,
        total_alunos: 0,
        total_escolas: 0,
      });
    }
    const modalidade = modalidades.get(linha.modalidade_id)!;
    modalidade.total_alunos += quantidade;
    modalidade.total_escolas += 1;
  }

  return {
    data_referencia: params.dataReferencia,
    linhas,
    por_escola: Array.from(escolas.values()).sort((a, b) => a.escola_nome.localeCompare(b.escola_nome)),
    por_modalidade: Array.from(modalidades.values()).sort((a, b) => a.modalidade_nome.localeCompare(b.modalidade_nome)),
    total_geral: totalGeral,
  };
}
