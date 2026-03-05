import { Request, Response } from "express";
import db from "../../../database";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

async function buscarUnidadeProduto(produtoId: number) {
  const result = await db.query(`
    SELECT p.unidade
    FROM produtos p
    WHERE p.id = $1
  `, [produtoId]);
  return result.rows[0]?.unidade || "UN";
}

async function colunaExiste(client: any, tabela: string, coluna: string) {
  const result = await client.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
    LIMIT 1
  `, [tabela, coluna]);
  return result.rows.length > 0;
}

async function obterTenantId(client: any, escolaId: number, colunaExisteEscolas: boolean) {
  if (!colunaExisteEscolas) {
    return DEFAULT_TENANT_ID;
  }
  const result = await client.query("SELECT tenant_id FROM escolas WHERE id = $1", [escolaId]);
  return result.rows[0]?.tenant_id || DEFAULT_TENANT_ID;
}

export async function listarEstoqueEscola(req: Request, res: Response) {
  try {
    const escolaId = Number(req.params.escolaId);
    if (!escolaId) {
      return res.status(400).json({ success: false, message: "Escola inválida" });
    }

    console.log(`[DEBUG] Buscando estoque para escola ID: ${escolaId}`);

    const result = await db.query(`
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.categoria,
        COALESCE(ee.quantidade_atual, 0) as quantidade_atual,
        COALESCE(ee.quantidade_minima, 0) as quantidade_minima,
        COALESCE(ee.quantidade_maxima, 0) as quantidade_maxima,
        ee.data_ultima_atualizacao,
        ee.observacoes,
        COALESCE(p.unidade, 'UN') as unidade
      FROM produtos p
      LEFT JOIN estoque_escolas ee 
        ON ee.produto_id = p.id AND ee.escola_id = $1
      WHERE p.ativo = true
      ORDER BY p.nome
    `, [escolaId]);

    console.log(`[DEBUG] Total de produtos retornados: ${result.rows.length}`);
    
    // Log produtos com estoque > 0
    const comEstoque = result.rows.filter(r => r.quantidade_atual > 0);
    console.log(`[DEBUG] Produtos com estoque > 0: ${comEstoque.length}`);
    if (comEstoque.length > 0) {
      console.log('[DEBUG] Primeiros 5 produtos com estoque:');
      comEstoque.slice(0, 5).forEach(p => {
        console.log(`  - ${p.produto_nome}: ${p.quantidade_atual} ${p.unidade}`);
      });
    }

    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (error: any) {
    console.error('[ERROR] Erro ao listar estoque:', error);
    res.status(500).json({ success: false, message: "Erro ao listar estoque", error: error.message });
  }
}

export async function buscarItemEstoque(req: Request, res: Response) {
  try {
    const escolaId = Number(req.params.escolaId);
    const produtoId = Number(req.params.produtoId);
    if (!escolaId || !produtoId) {
      return res.status(400).json({ success: false, message: "Parâmetros inválidos" });
    }

    const result = await db.query(`
      SELECT 
        ee.*,
        p.nome as produto_nome,
        p.categoria
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      WHERE ee.escola_id = $1 AND ee.produto_id = $2
    `, [escolaId, produtoId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Item não encontrado" });
    }

    const unidade = await buscarUnidadeProduto(produtoId);
    res.json({ success: true, data: { ...result.rows[0], unidade } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Erro ao buscar item", error: error.message });
  }
}

export async function listarHistoricoEscola(req: Request, res: Response) {
  try {
    const escolaId = Number(req.params.escolaId);
    if (!escolaId) {
      return res.status(400).json({ success: false, message: "Escola inválida" });
    }

    const limite = Number(req.query.limite) || 200;
    const result = await db.query(`
      SELECT 
        h.*,
        p.nome as produto_nome,
        u.nome as usuario_nome
      FROM estoque_escolas_historico h
      LEFT JOIN produtos p ON p.id = h.produto_id
      LEFT JOIN usuarios u ON u.id = h.usuario_id
      WHERE h.escola_id = $1
      ORDER BY h.data_movimentacao DESC
      LIMIT $2
    `, [escolaId, limite]);

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Erro ao listar histórico", error: error.message });
  }
}

export async function registrarMovimentacao(req: Request, res: Response) {
  const escolaId = Number(req.params.escolaId);
  const { produto_id, tipo_movimentacao, quantidade, usuario_id, observacoes } = req.body;

  const produtoId = Number(produto_id);
  const quantidadeNumero = Number(quantidade);

  if (!escolaId || !produtoId) {
    return res.status(400).json({ success: false, message: "Escola e produto são obrigatórios" });
  }
  if (!["entrada", "saida", "ajuste"].includes(tipo_movimentacao)) {
    return res.status(400).json({ success: false, message: "Tipo de movimentação inválido" });
  }
  if (isNaN(quantidadeNumero) || quantidadeNumero <= 0) {
    return res.status(400).json({ success: false, message: "Quantidade inválida" });
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const colunaTenantEscolas = await colunaExiste(client, "escolas", "tenant_id");
    const colunaTenantEstoque = await colunaExiste(client, "estoque_escolas", "tenant_id");
    const colunaTenantHistorico = await colunaExiste(client, "estoque_escolas_historico", "tenant_id");
    const tenantId = (colunaTenantEstoque || colunaTenantHistorico)
      ? await obterTenantId(client, escolaId, colunaTenantEscolas)
      : null;

    const escolaResult = await client.query("SELECT id FROM escolas WHERE id = $1 AND ativo = true", [escolaId]);
    if (escolaResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Escola não encontrada" });
    }

    const produtoResult = await client.query("SELECT id FROM produtos WHERE id = $1 AND ativo = true", [produtoId]);
    if (produtoResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Produto não encontrado" });
    }

    const estoqueAtual = await client.query(`
      SELECT * FROM estoque_escolas 
      WHERE escola_id = $1 AND produto_id = $2
      LIMIT 1
    `, [escolaId, produtoId]);

    const quantidadeAnterior = estoqueAtual.rows.length > 0 ? Number(estoqueAtual.rows[0].quantidade_atual) : 0;
    let quantidadePosterior = quantidadeAnterior;

    if (tipo_movimentacao === "entrada") {
      quantidadePosterior = quantidadeAnterior + quantidadeNumero;
    } else if (tipo_movimentacao === "saida") {
      if (quantidadeAnterior < quantidadeNumero) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Quantidade insuficiente em estoque" });
      }
      quantidadePosterior = quantidadeAnterior - quantidadeNumero;
    } else {
      quantidadePosterior = quantidadeNumero;
    }

    let estoqueId: number;
    if (estoqueAtual.rows.length === 0) {
      const estoqueColumns = [
        "escola_id",
        "produto_id",
        "quantidade_atual",
        "quantidade_minima",
        "quantidade_maxima",
        "data_ultima_atualizacao",
        "usuario_ultima_atualizacao",
        "ativo",
        "created_at",
        "updated_at"
      ];
      const estoqueValues = [
        "$1",
        "$2",
        "$3",
        "0",
        "0",
        "CURRENT_TIMESTAMP",
        "$4",
        "true",
        "CURRENT_TIMESTAMP",
        "CURRENT_TIMESTAMP"
      ];
      const estoqueParams: any[] = [escolaId, produtoId, quantidadePosterior, usuario_id || null];
      if (colunaTenantEstoque) {
        estoqueColumns.push("tenant_id");
        estoqueValues.push(`$${estoqueParams.length + 1}`);
        estoqueParams.push(tenantId);
      }
      const insertResult = await client.query(`
        INSERT INTO estoque_escolas (${estoqueColumns.join(", ")})
        VALUES (${estoqueValues.join(", ")})
        RETURNING id
      `, estoqueParams);
      estoqueId = insertResult.rows[0].id;
    } else {
      estoqueId = estoqueAtual.rows[0].id;
      await client.query(`
        UPDATE estoque_escolas
        SET quantidade_atual = $1,
            data_ultima_atualizacao = CURRENT_TIMESTAMP,
            usuario_ultima_atualizacao = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [quantidadePosterior, usuario_id || null, estoqueId]);
    }

    const historicoColumns = [
      "estoque_escola_id",
      "escola_id",
      "produto_id",
      "tipo_movimentacao",
      "quantidade_anterior",
      "quantidade_movimentada",
      "quantidade_posterior",
      "usuario_id",
      "observacoes"
    ];
    const historicoParams: any[] = [
      estoqueId,
      escolaId,
      produtoId,
      tipo_movimentacao,
      quantidadeAnterior,
      quantidadeNumero,
      quantidadePosterior,
      usuario_id || null,
      observacoes || null
    ];
    const historicoValues = historicoParams.map((_, index) => `$${index + 1}`);
    if (colunaTenantHistorico) {
      historicoColumns.push("tenant_id");
      historicoValues.push(`$${historicoParams.length + 1}`);
      historicoParams.push(tenantId);
    }
    await client.query(`
      INSERT INTO estoque_escolas_historico (${historicoColumns.join(", ")})
      VALUES (${historicoValues.join(", ")})
    `, historicoParams);

    await client.query("COMMIT");

    const unidade = await buscarUnidadeProduto(produtoId);
    res.json({
      success: true,
      message: "Movimentação registrada",
      data: {
        escola_id: escolaId,
        produto_id: produtoId,
        quantidade_anterior: quantidadeAnterior,
        quantidade_posterior: quantidadePosterior,
        unidade
      }
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, message: "Erro ao registrar movimentação", error: error.message });
  } finally {
    client.release();
  }
}

