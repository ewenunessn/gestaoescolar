import type { PoolClient } from 'pg';
import db from '../../../database';

type AtendimentoTipo = 'emergencial' | 'guia_existente';

interface SolicitacaoItemRow {
  id: number;
  solicitacao_id: number;
  escola_id: number;
  escola_nome: string;
  produto_id: number | null;
  nome_produto: string;
  quantidade: number;
  unidade: string;
  status: string;
}

interface CoberturaGuiaItem {
  guia_id: number;
  guia_produto_escola_id: number;
  guia_nome: string | null;
  codigo_guia: string | null;
  quantidade: number;
  quantidade_entregue: number;
  saldo_pendente: number;
  data_entrega: string | null;
  status: string;
}

interface AnaliseSolicitacao {
  item: SolicitacaoItemRow;
  estoque_central: {
    quantidade_total: number;
    quantidade_reservada: number;
    quantidade_disponivel: number;
  };
  estoque_escola: {
    quantidade_atual: number;
  };
  cobertura_guias: {
    total_pendente: number;
    itens: CoberturaGuiaItem[];
  };
  quantidade_sugerida: number;
  atendimento_sugerido: AtendimentoTipo;
  data_entrega_sugerida: string;
}

interface AprovarPayload {
  quantidade_aprovada?: number;
  data_entrega_prevista?: string;
  observacao?: string | null;
}

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getCompetenciaFromDate(dateValue?: string): { mes: number; ano: number; competencia: string } {
  const base = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
  const mes = base.getMonth() + 1;
  const ano = base.getFullYear();
  return {
    mes,
    ano,
    competencia: `${ano}-${String(mes).padStart(2, '0')}`,
  };
}

async function recalcularStatusSolicitacao(client: PoolClient, solicitacaoId: number, respondidoPor: number) {
  const itens = await client.query(
    'SELECT status FROM solicitacoes_itens WHERE solicitacao_id = $1',
    [solicitacaoId],
  );

  const rows = itens.rows;
  const pendentes = rows.filter((item: any) => item.status === 'pendente').length;
  const atendidos = rows.filter((item: any) => item.status === 'aceito' || item.status === 'contemplado').length;
  const recusados = rows.filter((item: any) => item.status === 'recusado').length;

  let novoStatus: string;
  if (pendentes > 0) {
    novoStatus = atendidos > 0 || recusados > 0 ? 'parcial' : 'pendente';
  } else if (atendidos > 0 && recusados > 0) {
    novoStatus = 'parcial';
  } else if (atendidos > 0) {
    novoStatus = 'concluida';
  } else {
    novoStatus = 'cancelada';
  }

  await client.query(
    `UPDATE solicitacoes
     SET status = $1, respondido_por = $2, respondido_em = NOW(), updated_at = NOW()
     WHERE id = $3`,
    [novoStatus, respondidoPor, solicitacaoId],
  );
}

class SolicitacaoEmergencialService {
  async analisarItem(itemId: number): Promise<AnaliseSolicitacao> {
    return db.transaction(async (client) => {
      const item = await this.buscarItem(client, itemId, false);
      return this.montarAnalise(client, item);
    });
  }

  async aprovarItemEmergencial(
    itemId: number,
    payload: AprovarPayload,
    usuarioId: number,
  ): Promise<{ analise: AnaliseSolicitacao; guia_item?: any; atendimento_tipo: AtendimentoTipo }> {
    return db.transaction(async (client) => {
      const item = await this.buscarItem(client, itemId, true);

      if (item.status !== 'pendente') {
        throw new Error('Item ja foi analisado');
      }

      if (!item.produto_id) {
        throw new Error('Item sem produto vinculado ao cadastro');
      }

      await client.query('SELECT pg_advisory_xact_lock($1)', [Number(item.produto_id)]);

      const analise = await this.montarAnalise(client, item);
      const quantidadeSolicitada = Number(item.quantidade);
      const quantidadeCoberta = analise.cobertura_guias.total_pendente;
      const quantidadeDescoberta = Math.max(quantidadeSolicitada - quantidadeCoberta, 0);
      const guiaExistente = analise.cobertura_guias.itens[0];

      if (quantidadeDescoberta <= 0 && guiaExistente) {
        await client.query(
          `UPDATE solicitacoes_itens
           SET status = 'contemplado',
               quantidade_aprovada = 0,
               guia_id = $1,
               guia_produto_escola_id = $2,
               atendimento_tipo = 'guia_existente',
               observacao_aprovacao = $3,
               respondido_por = $4,
               respondido_em = NOW()
           WHERE id = $5`,
          [
            guiaExistente.guia_id,
            guiaExistente.guia_produto_escola_id,
            payload.observacao || 'Solicitacao ja contemplada por guia aberta',
            usuarioId,
            itemId,
          ],
        );
        await recalcularStatusSolicitacao(client, item.solicitacao_id, usuarioId);
        return { analise, atendimento_tipo: 'guia_existente' };
      }

      const quantidadeAprovada = payload.quantidade_aprovada !== undefined
        ? Number(payload.quantidade_aprovada)
        : quantidadeDescoberta;

      if (!Number.isFinite(quantidadeAprovada) || quantidadeAprovada <= 0) {
        throw new Error('Quantidade aprovada deve ser maior que zero');
      }

      if (quantidadeAprovada > quantidadeDescoberta) {
        throw new Error(`Quantidade aprovada excede a necessidade descoberta (${quantidadeDescoberta})`);
      }

      if (quantidadeAprovada > analise.estoque_central.quantidade_disponivel) {
        throw new Error(`Estoque central disponivel insuficiente (${analise.estoque_central.quantidade_disponivel})`);
      }

      if (!payload.data_entrega_prevista) {
        throw new Error('Data prevista de entrega e obrigatoria');
      }

      const guia = await this.obterOuCriarGuiaEmergencial(client, payload.data_entrega_prevista);
      const guiaItem = await this.inserirOuAtualizarItemEmergencial(client, {
        guiaId: Number(guia.id),
        escolaId: Number(item.escola_id),
        produtoId: Number(item.produto_id),
        quantidade: quantidadeAprovada,
        unidade: item.unidade,
        dataEntrega: payload.data_entrega_prevista,
        observacao: payload.observacao || `Solicitacao emergencial #${item.solicitacao_id}`,
      });

      await client.query(
        `UPDATE solicitacoes_itens
         SET status = 'aceito',
             quantidade_aprovada = $1,
             data_entrega_prevista = $2,
             guia_id = $3,
             guia_produto_escola_id = $4,
             atendimento_tipo = 'emergencial',
             observacao_aprovacao = $5,
             respondido_por = $6,
             respondido_em = NOW()
         WHERE id = $7`,
        [
          quantidadeAprovada,
          payload.data_entrega_prevista,
          guia.id,
          guiaItem.id,
          payload.observacao || null,
          usuarioId,
          itemId,
        ],
      );

      await recalcularStatusSolicitacao(client, item.solicitacao_id, usuarioId);
      return {
        analise: await this.montarAnalise(client, item),
        guia_item: guiaItem,
        atendimento_tipo: 'emergencial',
      };
    });
  }

  private async buscarItem(client: PoolClient, itemId: number, lockRow: boolean): Promise<SolicitacaoItemRow> {
    const result = await client.query(
      `
        SELECT
          i.*,
          s.escola_id,
          e.nome AS escola_nome
        FROM solicitacoes_itens i
        INNER JOIN solicitacoes s ON s.id = i.solicitacao_id
        INNER JOIN escolas e ON e.id = s.escola_id
        WHERE i.id = $1
        ${lockRow ? 'FOR UPDATE OF i' : ''}
      `,
      [itemId],
    );

    if (result.rows.length === 0) {
      throw new Error('Item nao encontrado');
    }

    const row = result.rows[0];
    return {
      ...row,
      id: Number(row.id),
      solicitacao_id: Number(row.solicitacao_id),
      escola_id: Number(row.escola_id),
      produto_id: row.produto_id ? Number(row.produto_id) : null,
      quantidade: Number(row.quantidade),
    };
  }

  private async montarAnalise(client: PoolClient, item: SolicitacaoItemRow): Promise<AnaliseSolicitacao> {
    if (!item.produto_id) {
      return {
        item,
        estoque_central: { quantidade_total: 0, quantidade_reservada: 0, quantidade_disponivel: 0 },
        estoque_escola: { quantidade_atual: 0 },
        cobertura_guias: { total_pendente: 0, itens: [] },
        quantidade_sugerida: Number(item.quantidade),
        atendimento_sugerido: 'emergencial',
        data_entrega_sugerida: toDateOnly(addDays(new Date(), 1)),
      };
    }

    const central = await this.buscarSaldoCentral(client, Number(item.produto_id));
    const escola = await this.buscarSaldoEscola(client, Number(item.escola_id), Number(item.produto_id));
    const cobertura = await this.buscarCoberturaGuias(client, Number(item.escola_id), Number(item.produto_id));

    const totalPendente = cobertura.reduce((acc, row) => acc + row.saldo_pendente, 0);
    const quantidadeSugerida = Math.max(Number(item.quantidade) - totalPendente, 0);

    return {
      item,
      estoque_central: central,
      estoque_escola: escola,
      cobertura_guias: {
        total_pendente: totalPendente,
        itens: cobertura,
      },
      quantidade_sugerida: quantidadeSugerida,
      atendimento_sugerido: quantidadeSugerida <= 0 ? 'guia_existente' : 'emergencial',
      data_entrega_sugerida: toDateOnly(addDays(new Date(), 1)),
    };
  }

  private async buscarSaldoCentral(client: PoolClient, produtoId: number) {
    const result = await client.query(
      `
        WITH total AS (
          SELECT COALESCE(SUM(quantidade_delta), 0) AS quantidade_total
          FROM estoque_eventos
          WHERE escopo = 'central'
            AND produto_id = $1
        ),
        reservas AS (
          SELECT COALESCE(SUM(GREATEST(gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0), 0)), 0) AS quantidade_reservada
          FROM guia_produto_escola gpe
          INNER JOIN guias g ON g.id = gpe.guia_id
          WHERE g.status = 'aberta'
            AND gpe.produto_id = $1
            AND COALESCE(gpe.para_entrega, true) = true
            AND COALESCE(gpe.status, 'pendente') IN ('pendente', 'programada', 'parcial')
        )
        SELECT
          total.quantidade_total,
          reservas.quantidade_reservada,
          total.quantidade_total - reservas.quantidade_reservada AS quantidade_disponivel
        FROM total, reservas
      `,
      [produtoId],
    );

    const row = result.rows[0] || {};
    return {
      quantidade_total: toNumber(row.quantidade_total),
      quantidade_reservada: toNumber(row.quantidade_reservada),
      quantidade_disponivel: toNumber(row.quantidade_disponivel),
    };
  }

  private async buscarSaldoEscola(client: PoolClient, escolaId: number, produtoId: number) {
    const result = await client.query(
      `
        SELECT COALESCE(SUM(quantidade_delta), 0) AS quantidade_atual
        FROM estoque_eventos
        WHERE escopo = 'escola'
          AND escola_id = $1
          AND produto_id = $2
      `,
      [escolaId, produtoId],
    );

    return { quantidade_atual: toNumber(result.rows[0]?.quantidade_atual) };
  }

  private async buscarCoberturaGuias(
    client: PoolClient,
    escolaId: number,
    produtoId: number,
  ): Promise<CoberturaGuiaItem[]> {
    const result = await client.query(
      `
        SELECT
          g.id AS guia_id,
          gpe.id AS guia_produto_escola_id,
          g.nome AS guia_nome,
          g.codigo_guia,
          gpe.quantidade,
          COALESCE(gpe.quantidade_total_entregue, 0) AS quantidade_entregue,
          GREATEST(gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0), 0) AS saldo_pendente,
          gpe.data_entrega,
          COALESCE(gpe.status, 'pendente') AS status
        FROM guia_produto_escola gpe
        INNER JOIN guias g ON g.id = gpe.guia_id
        WHERE g.status = 'aberta'
          AND gpe.escola_id = $1
          AND gpe.produto_id = $2
          AND COALESCE(gpe.para_entrega, true) = true
          AND COALESCE(gpe.status, 'pendente') IN ('pendente', 'programada', 'parcial')
          AND GREATEST(gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0), 0) > 0
        ORDER BY gpe.data_entrega NULLS LAST, g.created_at
      `,
      [escolaId, produtoId],
    );

    return result.rows.map((row) => ({
      guia_id: Number(row.guia_id),
      guia_produto_escola_id: Number(row.guia_produto_escola_id),
      guia_nome: row.guia_nome ?? null,
      codigo_guia: row.codigo_guia ?? null,
      quantidade: Number(row.quantidade),
      quantidade_entregue: Number(row.quantidade_entregue),
      saldo_pendente: Number(row.saldo_pendente),
      data_entrega: row.data_entrega ? toDateOnly(new Date(row.data_entrega)) : null,
      status: row.status,
    }));
  }

  private async obterOuCriarGuiaEmergencial(client: PoolClient, dataEntrega: string) {
    const { mes, ano, competencia } = getCompetenciaFromDate(dataEntrega);
    const nome = `Guia Emergencial ${String(mes).padStart(2, '0')}/${ano}`;

    const existente = await client.query(
      `
        SELECT *
        FROM guias
        WHERE mes = $1
          AND ano = $2
          AND status = 'aberta'
          AND nome = $3
        ORDER BY id
        LIMIT 1
      `,
      [mes, ano, nome],
    );

    if (existente.rows[0]) {
      return existente.rows[0];
    }

    const funcResult = await client.query(
      `SELECT to_regprocedure('gerar_codigo_guia(integer,integer)') AS fn`,
    );

    let codigoGuia = `EMERG-${ano}-${String(mes).padStart(2, '0')}-${Date.now()}`;
    if (funcResult.rows[0]?.fn) {
      const codigoResult = await client.query(
        `SELECT gerar_codigo_guia($1, $2) AS codigo`,
        [mes, ano],
      );
      codigoGuia = codigoResult.rows[0]?.codigo || codigoGuia;
    }

    const result = await client.query(
      `
        INSERT INTO guias (mes, ano, nome, competencia_mes_ano, observacao, status, codigo_guia, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'aberta', $6, NOW(), NOW())
        RETURNING *
      `,
      [mes, ano, nome, competencia, 'Guia criada automaticamente por aprovacao de solicitacao emergencial', codigoGuia],
    );

    return result.rows[0];
  }

  private async inserirOuAtualizarItemEmergencial(
    client: PoolClient,
    input: {
      guiaId: number;
      escolaId: number;
      produtoId: number;
      quantidade: number;
      unidade: string;
      dataEntrega: string;
      observacao: string;
    },
  ) {
    const existente = await client.query(
      `
        SELECT id
        FROM guia_produto_escola
        WHERE guia_id = $1
          AND escola_id = $2
          AND produto_id = $3
          AND data_entrega = $4::date
          AND COALESCE(status, 'pendente') IN ('pendente', 'programada')
        ORDER BY id
        LIMIT 1
      `,
      [input.guiaId, input.escolaId, input.produtoId, input.dataEntrega],
    );

    if (existente.rows[0]) {
      const result = await client.query(
        `
          UPDATE guia_produto_escola
          SET quantidade = quantidade + $1,
              observacao = COALESCE(observacao || E'\n', '') || $2,
              updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `,
        [input.quantidade, input.observacao, existente.rows[0].id],
      );
      return result.rows[0];
    }

    const escolaSnapshot = await client.query(
      `
        SELECT
          e.nome AS escola_nome,
          e.endereco AS escola_endereco,
          e.municipio AS escola_municipio,
          COALESCE((
            SELECT SUM(em.quantidade_alunos)
            FROM escola_modalidades em
            WHERE em.escola_id = e.id
          ), 0) AS escola_total_alunos
        FROM escolas e
        WHERE e.id = $1
      `,
      [input.escolaId],
    );
    const escola = escolaSnapshot.rows[0] || {};

    const result = await client.query(
      `
        INSERT INTO guia_produto_escola (
          guia_id, produto_id, escola_id, quantidade, unidade,
          observacao, para_entrega, status, data_entrega,
          escola_nome, escola_endereco, escola_municipio, escola_total_alunos, escola_snapshot_data,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, true, 'pendente', $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, NOW(), NOW())
        RETURNING *
      `,
      [
        input.guiaId,
        input.produtoId,
        input.escolaId,
        input.quantidade,
        input.unidade,
        input.observacao,
        input.dataEntrega,
        escola.escola_nome || null,
        escola.escola_endereco || null,
        escola.escola_municipio || null,
        escola.escola_total_alunos || null,
      ],
    );

    return result.rows[0];
  }
}

export default new SolicitacaoEmergencialService();
