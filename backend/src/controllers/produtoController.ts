// Controller de produtos para PostgreSQL
import { Request, Response } from "express";
const db = require("../database");

export async function listarProdutos(req: Request, res: Response) {
  try {
    const produtos = await db.all(`
      SELECT 
        id,
        nome,
        descricao,
        categoria,
        marca,
        codigo_barras,
        unidade,
        peso,
        validade_minima,
        fator_divisao,
        tipo_processamento,
        imagem_url,
        COALESCE(preco_referencia, 0.00) as preco_referencia,
        COALESCE(estoque_minimo, 10) as estoque_minimo,
        ativo,
        created_at
      FROM produtos 
      ORDER BY nome
    `);

    res.json({
      success: true,
      data: produtos,
      total: produtos.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar produtos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar produtos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const produto = await db.get(`
      SELECT * FROM produtos WHERE id = $1
    `, [id]);

    if (!produto) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    res.json({
      success: true,
      data: produto
    });
  } catch (error) {
    console.error("❌ Erro ao buscar produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarProduto(req: Request, res: Response) {
  try {
    const {
      nome,
      descricao,
      categoria,
      marca,
      codigo_barras,
      unidade,
      peso,
      validade_minima,
      fator_divisao,
      tipo_processamento,
      imagem_url,
      preco_referencia,
      estoque_minimo = 10,
      ativo = true
    } = req.body;

    const result = await db.query(`
      INSERT INTO produtos (
        nome, descricao, categoria, marca, codigo_barras, unidade, 
        peso, validade_minima, fator_divisao, tipo_processamento,
        imagem_url, preco_referencia, estoque_minimo, ativo, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      nome, descricao, categoria, marca, codigo_barras, unidade,
      peso, validade_minima, fator_divisao, tipo_processamento,
      imagem_url, preco_referencia, estoque_minimo, ativo
    ]);

    res.json({
      success: true,
      message: "Produto criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      categoria,
      marca,
      codigo_barras,
      unidade,
      peso,
      validade_minima,
      fator_divisao,
      tipo_processamento,
      imagem_url,
      preco_referencia,
      estoque_minimo,
      ativo
    } = req.body;

    const result = await db.query(`
      UPDATE produtos SET
        nome = $1,
        descricao = $2,
        categoria = $3,
        marca = $4,
        codigo_barras = $5,
        unidade = $6,
        peso = $7,
        validade_minima = $8,
        fator_divisao = $9,
        tipo_processamento = $10,
        imagem_url = $11,
        preco_referencia = $12,
        estoque_minimo = $13,
        ativo = $14
      WHERE id = $15
      RETURNING *
    `, [
      nome, descricao, categoria, marca, codigo_barras, unidade,
      peso, validade_minima, fator_divisao, tipo_processamento,
      imagem_url, preco_referencia, estoque_minimo, ativo, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Produto atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM produtos WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Produto removido com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao remover produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarComposicaoNutricional(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const composicao = await db.get(`
      SELECT 
        valor_energetico_kcal,
        carboidratos_g,
        acucares_totais_g,
        acucares_adicionados_g,
        proteinas_g,
        gorduras_totais_g,
        gorduras_saturadas_g,
        gorduras_trans_g,
        fibra_alimentar_g,
        sodio_mg
      FROM produto_composicao_nutricional 
      WHERE produto_id = $1
    `, [id]);

    if (!composicao) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: composicao
    });
  } catch (error) {
    console.error("❌ Erro ao buscar composição nutricional:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar composição nutricional",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function obterCatalogoProdutos(req: Request, res: Response) {
  try {
    const { limit = 100, offset = 0, categoria, busca } = req.query;

    let whereClause = 'p.ativo = true';
    const params: any[] = [];
    let paramCount = 0;

    // Filtro por categoria
    if (categoria) {
      paramCount++;
      whereClause += ` AND p.categoria = $${paramCount}`;
      params.push(categoria);
    }

    // Filtro de busca
    if (busca) {
      paramCount++;
      whereClause += ` AND (p.nome ILIKE $${paramCount} OR p.descricao ILIKE $${paramCount})`;
      params.push(`%${busca}%`);
    }

    // Paginação
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;
    params.push(Number(limit), Number(offset));

    const produtos = await db.all(`
      SELECT 
        p.id,
        p.nome,
        p.descricao,
        p.categoria,
        p.marca,
        p.unidade,
        p.peso,
        p.imagem_url,
        COALESCE(p.preco_referencia, 0.00) as preco_referencia,
        p.estoque_minimo,
        -- Sempre true pois só mostramos produtos com contratos
        true as disponivel_contrato,
        -- Menor preço disponível nos contratos
        COALESCE(MIN(vsc.valor_unitario), 0.00) as preco_contrato,
        -- Fornecedor com menor preço
        MIN(f.nome) as fornecedor_melhor_preco,
        -- Informações do contrato
        MIN(vsc.contrato_id) as contrato_id,
        MIN(vsc.contrato_numero) as numero_contrato,
        MIN(c.fornecedor_id) as fornecedor_id,
        -- Saldo disponível real (atualizado)
        COALESCE(MIN(vsc.quantidade_disponivel_real), 0) as saldo_disponivel
      FROM produtos p
      INNER JOIN view_saldo_contratos_itens vsc ON p.id = vsc.produto_id AND vsc.quantidade_disponivel_real > 0
      INNER JOIN contratos c ON vsc.contrato_id = c.id
      INNER JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE ${whereClause}
      GROUP BY p.id, p.nome, p.descricao, p.categoria, p.marca, p.unidade, 
               p.peso, p.imagem_url, p.preco_referencia, p.estoque_minimo
      ORDER BY p.nome
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, params);

    // Contar total - apenas produtos com saldo disponível real
    const totalResult = await db.get(`
      SELECT COUNT(DISTINCT p.id) as total 
      FROM produtos p
      INNER JOIN view_saldo_contratos_itens vsc ON p.id = vsc.produto_id AND vsc.quantidade_disponivel_real > 0
      WHERE ${whereClause}
    `, params.slice(0, -2)); // Remove limit e offset

    res.json({
      success: true,
      data: produtos,
      total: Number(totalResult.total),
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    console.error("❌ Erro ao obter catálogo de produtos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter catálogo de produtos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function salvarComposicaoNutricional(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      valor_energetico_kcal,
      carboidratos_g,
      acucares_totais_g,
      acucares_adicionados_g,
      proteinas_g,
      gorduras_totais_g,
      gorduras_saturadas_g,
      gorduras_trans_g,
      fibra_alimentar_g,
      sodio_mg
    } = req.body;

    // Verificar se já existe composição para este produto
    const existente = await db.get(`
      SELECT id FROM produto_composicao_nutricional WHERE produto_id = $1
    `, [id]);

    let result;
    if (existente) {
      // Atualizar existente
      result = await db.query(`
        UPDATE produto_composicao_nutricional SET
          valor_energetico_kcal = $1,
          carboidratos_g = $2,
          acucares_totais_g = $3,
          acucares_adicionados_g = $4,
          proteinas_g = $5,
          gorduras_totais_g = $6,
          gorduras_saturadas_g = $7,
          gorduras_trans_g = $8,
          fibra_alimentar_g = $9,
          sodio_mg = $10
        WHERE produto_id = $11
        RETURNING *
      `, [
        valor_energetico_kcal, carboidratos_g, acucares_totais_g, acucares_adicionados_g,
        proteinas_g, gorduras_totais_g, gorduras_saturadas_g, gorduras_trans_g,
        fibra_alimentar_g, sodio_mg, id
      ]);
    } else {
      // Criar novo
      result = await db.query(`
        INSERT INTO produto_composicao_nutricional (
          produto_id, valor_energetico_kcal, carboidratos_g, acucares_totais_g,
          acucares_adicionados_g, proteinas_g, gorduras_totais_g, gorduras_saturadas_g,
          gorduras_trans_g, fibra_alimentar_g, sodio_mg
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        id, valor_energetico_kcal, carboidratos_g, acucares_totais_g, acucares_adicionados_g,
        proteinas_g, gorduras_totais_g, gorduras_saturadas_g, gorduras_trans_g,
        fibra_alimentar_g, sodio_mg
      ]);
    }

    res.json({
      success: true,
      message: "Composição nutricional salva com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao salvar composição nutricional:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao salvar composição nutricional",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function importarProdutosLote(req: Request, res: Response) {
  try {
    const { produtos } = req.body;

    if (!Array.isArray(produtos) || produtos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Lista de produtos inválida"
      });
    }

    let sucessos = 0;
    let erros = 0;
    let atualizacoes = 0;
    let insercoes = 0;
    const resultados = [];

    for (const produto of produtos) {
      try {
        const {
          nome,
          descricao,
          categoria,
          marca,
          codigo_barras,
          unidade,
          peso,
          validade_minima,
          fator_divisao,
          tipo_processamento,
          imagem_url,
          preco_referencia,
          estoque_minimo = 10,
          ativo = true
        } = produto;

        // Verificar se produto já existe pelo nome
        const produtoExistente = await db.get(`
          SELECT id FROM produtos WHERE nome = $1
        `, [nome]);

        const result = await db.query(`
          INSERT INTO produtos (
            nome, descricao, categoria, marca, codigo_barras, unidade, 
            peso, validade_minima, fator_divisao, tipo_processamento,
            imagem_url, preco_referencia, estoque_minimo, ativo, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
          ON CONFLICT (nome) DO UPDATE SET
            descricao = EXCLUDED.descricao,
            categoria = EXCLUDED.categoria,
            marca = EXCLUDED.marca,
            codigo_barras = EXCLUDED.codigo_barras,
            unidade = EXCLUDED.unidade,
            peso = EXCLUDED.peso,
            validade_minima = EXCLUDED.validade_minima,
            fator_divisao = EXCLUDED.fator_divisao,
            tipo_processamento = EXCLUDED.tipo_processamento,
            imagem_url = EXCLUDED.imagem_url,
            preco_referencia = EXCLUDED.preco_referencia,
            estoque_minimo = EXCLUDED.estoque_minimo,
            ativo = EXCLUDED.ativo
          RETURNING *
        `, [
          nome, descricao, categoria, marca, codigo_barras, unidade,
          peso, validade_minima, fator_divisao, tipo_processamento,
          imagem_url, preco_referencia, estoque_minimo, ativo
        ]);

        const acao = produtoExistente ? 'atualizado' : 'inserido';
        if (produtoExistente) {
          atualizacoes++;
        } else {
          insercoes++;
        }

        resultados.push({
          sucesso: true,
          acao: acao,
          produto: result.rows[0]
        });

        sucessos++;
      } catch (error) {
        console.error(`❌ Erro ao importar produto ${produto.nome}:`, error);
        resultados.push({
          sucesso: false,
          produto: produto.nome,
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        erros++;
      }
    }

    const mensagem = `Importação concluída: ${insercoes} inseridos, ${atualizacoes} atualizados, ${erros} erros`;

    res.json({
      success: true,
      message: mensagem,
      resultados: {
        sucesso: sucessos,
        erros: erros,
        insercoes: insercoes,
        atualizacoes: atualizacoes,
        detalhes: resultados
      }
    });
  } catch (error) {
    console.error("❌ Erro na importação em lote:", error);
    res.status(500).json({
      success: false,
      message: "Erro na importação em lote",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}