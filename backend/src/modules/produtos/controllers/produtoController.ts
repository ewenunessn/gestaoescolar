// Controller de produtos para PostgreSQL
import { Request, Response } from "express";
const db = require("../../../database");

export async function listarProdutos(req: Request, res: Response) {
  try {
    const produtos = await db.all(`
      SELECT 
        id,
        nome,
        descricao,
        categoria,
        marca,
        unidade,
        peso,
        fator_divisao,
        tipo_processamento,
        perecivel,
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
      unidade,
      peso,
      fator_divisao,
      tipo_processamento,
      perecivel = false,
      ativo = true
    } = req.body;

    const result = await db.query(`
      INSERT INTO produtos (
        nome, descricao, categoria, marca, unidade, 
        peso, fator_divisao, tipo_processamento,
        perecivel, ativo, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      nome, descricao, categoria, marca, unidade,
      peso, fator_divisao, tipo_processamento,
      perecivel, ativo
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
      unidade,
      peso,
      fator_divisao,
      tipo_processamento,
      perecivel,
      ativo
    } = req.body;

    const result = await db.query(`
      UPDATE produtos SET
        nome = $1,
        descricao = $2,
        categoria = $3,
        marca = $4,
        unidade = $5,
        peso = $6,
        fator_divisao = $7,
        tipo_processamento = $8,
        perecivel = $9,
        ativo = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [
      nome, descricao, categoria, marca, unidade,
      peso, fator_divisao, tipo_processamento,
      perecivel, ativo, id
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

    const result = await db.query(`
      SELECT 
        energia_kcal as "valor_energetico_kcal",
        carboidratos_g,
        acucares_g as acucares_totais_g,
        acucares_adicionados_g,
        proteina_g as proteinas_g,
        lipideos_g as gorduras_totais_g,
        gorduras_saturadas_g,
        gorduras_trans_g,
        fibra_alimentar_g,
        sodio_mg
      FROM produto_composicao_nutricional
      WHERE produto_id = $1
    `, [id]);

    const composicao = result.rows[0];

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
            energia_kcal = $1,
            carboidratos_g = $2,
            proteina_g = $3,
            lipideos_g = $4,
            gorduras_saturadas_g = $5,
            gorduras_trans_g = $6,
            fibra_alimentar_g = $7,
            sodio_mg = $8,
            acucares_g = $9,
            acucares_adicionados_g = $10
          WHERE produto_id = $11
          RETURNING *
        `, [
          valor_energetico_kcal, carboidratos_g, proteinas_g, gorduras_totais_g,
          gorduras_saturadas_g, gorduras_trans_g, fibra_alimentar_g, sodio_mg,
          acucares_totais_g, acucares_adicionados_g, id
        ]);
    } else {
      // Criar novo
      result = await db.query(`
        INSERT INTO produto_composicao_nutricional (
          produto_id, energia_kcal, carboidratos_g,
          proteina_g, lipideos_g, gorduras_saturadas_g,
          gorduras_trans_g, fibra_alimentar_g, sodio_mg,
          acucares_g, acucares_adicionados_g
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        id, valor_energetico_kcal, carboidratos_g,
        proteinas_g, gorduras_totais_g, gorduras_saturadas_g, gorduras_trans_g,
        fibra_alimentar_g, sodio_mg, acucares_totais_g, acucares_adicionados_g
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
          unidade,
          peso,
          fator_divisao,
          tipo_processamento,
          perecivel = false,
          ativo = true
        } = produto;

        // Verificar se produto já existe pelo nome
        const produtoExistente = await db.get(`
          SELECT id FROM produtos WHERE nome = $1
        `, [nome]);

        const result = await db.query(`
          INSERT INTO produtos (
            nome, descricao, categoria, marca, unidade, 
            peso, fator_divisao, tipo_processamento,
            perecivel, ativo, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
          ON CONFLICT (nome) DO UPDATE SET
            descricao = EXCLUDED.descricao,
            categoria = EXCLUDED.categoria,
            marca = EXCLUDED.marca,
            unidade = EXCLUDED.unidade,
            peso = EXCLUDED.peso,
            fator_divisao = EXCLUDED.fator_divisao,
            tipo_processamento = EXCLUDED.tipo_processamento,
            perecivel = EXCLUDED.perecivel,
            ativo = EXCLUDED.ativo
          RETURNING *
        `, [
          nome, descricao, categoria, marca, unidade,
          peso, fator_divisao, tipo_processamento,
          perecivel, ativo
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