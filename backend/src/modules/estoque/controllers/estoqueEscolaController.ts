// Controller de estoque escolar para PostgreSQL
import { Request, Response } from "express";
const db = require("../../../database");

export async function listarEstoqueEscola(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;

    // Query dinâmica que mostra TODOS os produtos ativos, mesmo os não inicializados no estoque
    const result = await db.query(`
      SELECT 
        ee.id,
        $1::integer as escola_id,
        p.id as produto_id,
        COALESCE(ee.quantidade_atual, 0) as quantidade_atual,
        ee.updated_at as data_ultima_atualizacao,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade as unidade_medida,
        p.categoria,
        e.nome as escola_nome,
        CASE 
          WHEN COALESCE(ee.quantidade_atual, 0) = 0 THEN 'sem_estoque'
          ELSE 'normal'
        END as status_estoque
      FROM produtos p
      CROSS JOIN escolas e
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
      WHERE p.ativo = true 
        AND e.id = $1 
        AND e.ativo = true
      ORDER BY p.categoria, p.nome
    `, [escola_id]);

    const estoque = result.rows;

    res.json({
      success: true,
      data: estoque,
      total: estoque.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar estoque da escola:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar estoque da escola",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarItemEstoqueEscola(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        ee.*,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade as unidade_medida,
        p.categoria,
        e.nome as escola_nome
      FROM estoque_escolas ee
      LEFT JOIN produtos p ON ee.produto_id = p.id
      LEFT JOIN escolas e ON ee.escola_id = e.id
      WHERE ee.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item de estoque não encontrado"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar item de estoque:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar item de estoque",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function atualizarQuantidadeEstoque(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      quantidade_atual,
      usuario_id
    } = req.body;

    // Validar quantidade
    if (quantidade_atual < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantidade não pode ser negativa"
      });
    }

    const result = await db.query(`
      UPDATE estoque_escolas SET
        quantidade_atual = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [
      quantidade_atual,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item de estoque não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Quantidade atualizada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar quantidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar quantidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function atualizarLoteQuantidades(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;
    const { itens, usuario_id } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Lista de itens inválida"
      });
    }

    // Usar transação para atualizar todos os itens
    const result = await db.transaction(async (client: any) => {
      const resultados = [];

      for (const item of itens) {
        const { produto_id, quantidade_atual } = item;

        // Validar quantidade
        if (quantidade_atual < 0) {
          throw new Error(`Quantidade não pode ser negativa para o produto ${produto_id}`);
        }

        // Primeiro tentar atualizar, se não existir, criar o registro
        const updateResult = await client.query(`
          INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
          VALUES ($2, $3, $1)
          ON CONFLICT (escola_id, produto_id) 
          DO UPDATE SET
            quantidade_atual = $1,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `, [quantidade_atual, escola_id, produto_id]);

        if (updateResult.rows.length > 0) {
          resultados.push(updateResult.rows[0]);
        }
      }

      return resultados;
    });

    res.json({
      success: true,
      message: `${result.length} itens atualizados com sucesso`,
      data: result
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar lote de quantidades:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar quantidades",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarHistoricoEstoque(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;
    const { produto_id, limite = 50 } = req.query;

    let whereClause = 'WHERE eeh.escola_id = $1';
    const params = [escola_id];

    if (produto_id) {
      whereClause += ' AND eeh.produto_id = $2';
      params.push(produto_id as string);
    }

    const result = await db.query(`
      SELECT 
        eeh.*,
        p.nome as produto_nome,
        p.unidade as unidade_medida,
        u.nome as usuario_nome
      FROM estoque_escolas_historico eeh
      LEFT JOIN produtos p ON eeh.produto_id = p.id
      LEFT JOIN usuarios u ON eeh.usuario_id = u.id
      ${whereClause}
      ORDER BY eeh.data_movimentacao DESC
      LIMIT $${params.length + 1}
    `, [...params, limite]);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar histórico:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar histórico",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function obterResumoEstoque(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;

    // Resumo dinâmico considerando todos os produtos ativos
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_produtos,
        COUNT(CASE WHEN COALESCE(ee.quantidade_atual, 0) > 0 THEN 1 END) as produtos_com_estoque,
        COUNT(CASE WHEN COALESCE(ee.quantidade_atual, 0) = 0 THEN 1 END) as produtos_sem_estoque,
        MAX(COALESCE(ee.updated_at, CURRENT_TIMESTAMP)) as ultima_atualizacao
      FROM produtos p
      CROSS JOIN escolas e
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
      WHERE p.ativo = true 
        AND e.id = $1 
        AND e.ativo = true
    `, [escola_id]);

    const resumo = result.rows[0];

    res.json({
      success: true,
      data: {
        total_itens: parseInt(resumo.total_produtos),
        itens_normais: parseInt(resumo.produtos_com_estoque),
        itens_baixos: 0, // Por enquanto não temos lógica de baixo estoque
        itens_sem_estoque: parseInt(resumo.produtos_sem_estoque),
        ultima_atualizacao: resumo.ultima_atualizacao
      }
    });
  } catch (error) {
    console.error("❌ Erro ao obter resumo:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter resumo do estoque",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function inicializarEstoqueEscola(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;

    // Verificar se a escola existe
    const escolaResult = await db.query('SELECT id, nome FROM escolas WHERE id = $1', [escola_id]);
    if (escolaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola não encontrada"
      });
    }

    // Inserir produtos que ainda não existem no estoque da escola
    const result = await db.query(`
      INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
      SELECT $1, p.id, 0.000
      FROM produtos p
      WHERE p.id NOT IN (
        SELECT produto_id 
        FROM estoque_escolas 
        WHERE escola_id = $1
      )
      RETURNING *
    `, [escola_id]);

    res.json({
      success: true,
      message: `Estoque inicializado com ${result.rows.length} novos produtos`,
      data: result.rows
    });
  } catch (error) {
    console.error("❌ Erro ao inicializar estoque:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao inicializar estoque",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function registrarMovimentacao(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;
    const {
      produto_id,
      tipo_movimentacao,
      quantidade,
      motivo,
      documento_referencia,
      usuario_id
    } = req.body;

    // Validações
    if (!['entrada', 'saida', 'ajuste'].includes(tipo_movimentacao)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de movimentação inválido. Use: entrada, saida ou ajuste"
      });
    }

    if (quantidade === null || quantidade === undefined || quantidade < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantidade deve ser maior ou igual a zero"
      });
    }

    // Usar transação para garantir consistência
    const result = await db.transaction(async (client: any) => {
      // Buscar a unidade de medida do produto
      const produtoResult = await client.query(`
        SELECT unidade FROM produtos WHERE id = $1
      `, [produto_id]);
      
      if (produtoResult.rows.length === 0) {
        throw new Error('Produto não encontrado');
      }
      
      const unidadeMedida = produtoResult.rows[0].unidade;

      // Buscar ou criar o item no estoque
      let estoqueAtual = await client.query(`
        SELECT * FROM estoque_escolas 
        WHERE escola_id = $1 AND produto_id = $2
      `, [escola_id, produto_id]);

      let item;
      if (estoqueAtual.rows.length === 0) {
        // Criar registro no estoque se não existir
        const novoItem = await client.query(`
          INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
          VALUES ($1, $2, 0)
          RETURNING *
        `, [escola_id, produto_id]);
        item = novoItem.rows[0];
      } else {
        item = estoqueAtual.rows[0];
      }

      const quantidadeAnterior = parseFloat(item.quantidade_atual);
      let quantidadePosterior = quantidadeAnterior;

      // Calcular nova quantidade baseada no tipo de movimentação
      switch (tipo_movimentacao) {
        case 'entrada':
          quantidadePosterior = quantidadeAnterior + parseFloat(quantidade);
          break;
        case 'saida':
          quantidadePosterior = quantidadeAnterior - parseFloat(quantidade);
          if (quantidadePosterior < 0) {
            throw new Error('Quantidade insuficiente em estoque');
          }
          break;
        case 'ajuste':
          quantidadePosterior = parseFloat(quantidade);
          break;
      }

      // Atualizar o estoque
      const updateResult = await client.query(`
        UPDATE estoque_escolas SET
          quantidade_atual = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE escola_id = $2 AND produto_id = $3
        RETURNING *
      `, [quantidadePosterior, escola_id, produto_id]);

      // Registrar no histórico
      const historicoResult = await client.query(`
        INSERT INTO estoque_escolas_historico (
          estoque_escola_id,
          escola_id,
          produto_id,
          tipo_movimentacao,
          quantidade_anterior,
          quantidade_movimentada,
          quantidade_posterior,
          motivo,
          documento_referencia,
          usuario_id,
          data_movimentacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        item.id,
        escola_id,
        produto_id,
        tipo_movimentacao,
        quantidadeAnterior,
        parseFloat(quantidade),
        quantidadePosterior,
        motivo,
        documento_referencia,
        usuario_id
      ]);

      return {
        estoque: updateResult.rows[0],
        historico: historicoResult.rows[0]
      };
    });

    res.json({
      success: true,
      message: `Movimentação de ${tipo_movimentacao} registrada com sucesso`,
      data: result
    });
  } catch (error) {
    console.error("❌ Erro ao registrar movimentação:", error);
    
    // Tratar erros específicos
    if (error instanceof Error) {
      // Erro de duplicata (constraint violation)
      if (error.message.includes('duplicate key') || error.message.includes('idx_historico_unique_movement')) {
        return res.status(409).json({
          success: false,
          message: "Esta movimentação já foi registrada. Evite clicar múltiplas vezes no botão.",
          error: "Movimentação duplicada"
        });
      }
      
      // Erro de quantidade insuficiente
      if (error.message.includes('Quantidade insuficiente')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: "Estoque insuficiente"
        });
      }
      
      // Erro de item não encontrado
      if (error.message.includes('Item não encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: "Item não encontrado"
        });
      }
    }
    
    // Erro genérico
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor. Tente novamente.",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function resetarEstoqueComBackup(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;
    const { usuario_id, motivo } = req.body;

    // Verificar se a escola existe
    const escolaResult = await db.query('SELECT id, nome FROM escolas WHERE id = $1 AND ativo = true', [escola_id]);
    if (escolaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola não encontrada"
      });
    }

    const escola = escolaResult.rows[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeBackup = `backup_estoque_escola_${escola_id}_${timestamp}`;

    // Usar transação para garantir consistência
    const result = await db.transaction(async (client: any) => {
      // 1. Criar backup dos dados atuais
      const dadosEstoque = await client.query(`
        SELECT 
          ee.id,
          ee.escola_id,
          ee.produto_id,
          ee.quantidade_atual,
          ee.created_at,
          ee.updated_at,
          p.nome as produto_nome,
          p.descricao as produto_descricao
        FROM estoque_escolas ee
        JOIN produtos p ON p.id = ee.produto_id
        WHERE ee.escola_id = $1
      `, [escola_id]);

      const dadosHistorico = await client.query(`
        SELECT 
          eeh.*,
          p.nome as produto_nome
        FROM estoque_escolas_historico eeh
        JOIN estoque_escolas ee ON ee.id = eeh.estoque_escola_id
        JOIN produtos p ON p.id = ee.produto_id
        WHERE ee.escola_id = $1
        ORDER BY eeh.created_at DESC
      `, [escola_id]);

      // 2. Salvar backup em tabela de backups (se existir) ou em arquivo JSON
      const backupData = {
        escola: escola,
        timestamp: new Date(),
        motivo: motivo || 'Reset manual do estoque',
        usuario_id: usuario_id,
        estoque: dadosEstoque.rows,
        historico: dadosHistorico.rows
      };

      // Tentar salvar na tabela de backups
      try {
        await client.query(`
          INSERT INTO backups (nome_arquivo, tipo, status, data_backup, observacoes)
          VALUES ($1, 'reset_estoque', 'sucesso', NOW(), $2)
        `, [nomeBackup, JSON.stringify(backupData)]);
      } catch (backupError) {
        console.warn('⚠️ Tabela de backups não encontrada, continuando sem salvar backup em BD:', backupError);
      }

      // 3. Registrar a operação de reset no histórico antes de limpar
      const itensEstoque = await client.query(`
        SELECT id, produto_id, quantidade_atual 
        FROM estoque_escolas 
        WHERE escola_id = $1 AND quantidade_atual > 0
      `, [escola_id]);

      // Registrar movimentação de saída para cada item com estoque
      for (const item of itensEstoque.rows) {
        if (item.quantidade_atual > 0) {
          await client.query(`
            INSERT INTO estoque_escolas_historico (
              estoque_escola_id,
              escola_id,
              produto_id,
              tipo_movimentacao,
              quantidade_anterior,
              quantidade_movimentada,
              quantidade_posterior,
              motivo,
              documento_referencia,
              usuario_id,
              created_at
            ) VALUES ($1, $2, $3, 'reset', $4, $5, 0, $6, $7, $8, NOW())
          `, [
            item.id,
            escola_id,
            item.produto_id,
            item.quantidade_atual,
            -item.quantidade_atual,
            motivo || 'Reset do estoque - backup criado',
            nomeBackup,
            usuario_id
          ]);
        }
      }

      // 4. Zerar todas as quantidades do estoque da escola
      const resetEstoque = await client.query(`
        UPDATE estoque_escolas 
        SET quantidade_atual = 0, updated_at = NOW()
        WHERE escola_id = $1
        RETURNING *
      `, [escola_id]);

      return {
        backup: backupData,
        itensResetados: resetEstoque.rows.length,
        nomeBackup: nomeBackup
      };
    });

    res.json({
      success: true,
      message: `Estoque da escola ${escola.nome} foi resetado com sucesso. Backup criado: ${result.nomeBackup}`,
      data: {
        escola_nome: escola.nome,
        itens_resetados: result.itensResetados,
        backup_nome: result.nomeBackup,
        backup_criado_em: new Date(),
        itens_backup: result.backup.estoque.length,
        historico_backup: result.backup.historico.length
      }
    });

  } catch (error) {
    console.error("❌ Erro ao resetar estoque com backup:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao resetar estoque",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Listar lotes de um produto específico
export async function listarLotesProduto(req: Request, res: Response) {
  try {
    const { produto_id } = req.params;
    const apenas_ativos = req.query.apenas_ativos !== 'false';

    if (!produto_id) {
      return res.status(400).json({
        success: false,
        message: "ID do produto é obrigatório"
      });
    }

    // Verificar se produto existe
    const produto = await db.query(`
      SELECT id, nome, unidade FROM produtos WHERE id = $1 AND ativo = true
    `, [produto_id]);

    if (produto.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    let whereClause = "WHERE el.produto_id = $1";
    const params = [produto_id];

    if (apenas_ativos) {
      whereClause += " AND el.status = 'ativo' AND el.quantidade_atual > 0";
    }

    const query = `
      SELECT 
        el.id,
        el.produto_id,
        el.lote,
        el.quantidade_inicial,
        el.quantidade_atual,
        el.data_validade,
        el.data_fabricacao,
        el.fornecedor_id,
        f.nome as fornecedor_nome,
        el.status,
        el.observacoes,
        el.created_at,
        el.updated_at
      FROM estoque_lotes el
      LEFT JOIN fornecedores f ON el.fornecedor_id = f.id
      ${whereClause}
      ORDER BY 
        CASE WHEN el.data_validade IS NULL THEN 1 ELSE 0 END,
        el.data_validade ASC,
        el.created_at DESC
    `;

    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      produto: produto.rows[0]
    });
  } catch (error: any) {
    console.error("❌ Erro ao listar lotes do produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar lotes do produto",
      error: error.message
    });
  }
}

// Criar novo lote
export async function criarLote(req: Request, res: Response) {
  try {
    const {
      produto_id,
      lote,
      quantidade,
      data_fabricacao,
      data_validade,
      fornecedor_id,
      observacoes
    } = req.body;

    // Validações básicas
    if (!produto_id || !lote || quantidade === null || quantidade === undefined || quantidade < 0) {
      return res.status(400).json({
        success: false,
        message: "Produto, lote e quantidade são obrigatórios"
      });
    }

    // Verificar se produto existe
    const produto = await db.query(`
      SELECT id, nome FROM produtos WHERE id = $1 AND ativo = true
    `, [produto_id]);

    if (produto.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    // Verificar se lote já existe para este produto
    const loteExistente = await db.query(`
      SELECT id FROM estoque_lotes 
      WHERE produto_id = $1 AND lote = $2
    `, [produto_id, lote.toString().trim()]);

    if (loteExistente.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Lote '${lote}' já existe para este produto`
      });
    }

    // Validar datas se fornecidas
    if (data_fabricacao && data_validade) {
      const fabricacao = new Date(data_fabricacao);
      const validade = new Date(data_validade);
      
      if (validade <= fabricacao) {
        return res.status(400).json({
          success: false,
          message: "Data de validade deve ser posterior à data de fabricação"
        });
      }
    }

    // Criar o lote
    const novoLote = await db.query(`
      INSERT INTO estoque_lotes (
        produto_id, lote, quantidade_inicial, quantidade_atual,
        data_fabricacao, data_validade, fornecedor_id, observacoes,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7, 'ativo', NOW(), NOW())
      RETURNING *
    `, [
      produto_id,
      lote.toString().trim(),
      Number(quantidade),
      data_fabricacao || null,
      data_validade || null,
      fornecedor_id || null,
      observacoes || null
    ]);

    res.status(201).json({
      success: true,
      message: "Lote criado com sucesso",
      data: novoLote.rows[0]
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar lote:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar lote",
      error: error.message
    });
  }
}

// Processar movimentação com lotes
export async function processarMovimentacaoLotes(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;
    const {
      produto_id,
      tipo_movimentacao,
      lotes,
      motivo,
      documento_referencia,
      usuario_id
    } = req.body;

    if (!produto_id || !tipo_movimentacao || !lotes || !Array.isArray(lotes) || lotes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Produto, tipo de movimentação e lotes são obrigatórios"
      });
    }

    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      const movimentacoes = [];
      let quantidadeTotal = 0;

      for (const loteMovimento of lotes) {
        const { lote_id, lote, quantidade, data_validade, data_fabricacao, observacoes } = loteMovimento;

        if (quantidade <= 0) continue;

        quantidadeTotal += quantidade;

        if (tipo_movimentacao === 'entrada') {
          // Para entrada, criar novo lote ou atualizar existente
          let loteAtual;
          
          if (lote_id) {
            // Atualizar lote existente
            const updateResult = await client.query(`
              UPDATE estoque_lotes 
              SET quantidade_atual = quantidade_atual + $1,
                  updated_at = NOW()
              WHERE id = $2 AND produto_id = $3
              RETURNING *
            `, [quantidade, lote_id, produto_id]);
            
            loteAtual = updateResult.rows[0];
          } else {
            // Criar novo lote
            const insertResult = await client.query(`
              INSERT INTO estoque_lotes (
                produto_id, lote, quantidade_inicial, quantidade_atual,
                data_fabricacao, data_validade, observacoes,
                status, created_at, updated_at
              ) VALUES ($1, $2, $3, $3, $4, $5, $6, 'ativo', NOW(), NOW())
              RETURNING *
            `, [
              produto_id,
              lote,
              quantidade,
              data_fabricacao || null,
              data_validade || null,
              observacoes || null
            ]);
            
            loteAtual = insertResult.rows[0];
          }

          movimentacoes.push({
            lote_id: loteAtual.id,
            lote: loteAtual.lote,
            quantidade,
            tipo: 'entrada'
          });

        } else if (tipo_movimentacao === 'saida') {
          // Para saída, reduzir quantidade do lote
          if (!lote_id) {
            throw new Error('ID do lote é obrigatório para saída');
          }

          const loteAtual = await client.query(`
            SELECT * FROM estoque_lotes WHERE id = $1 AND produto_id = $2
          `, [lote_id, produto_id]);

          if (loteAtual.rows.length === 0) {
            throw new Error(`Lote não encontrado`);
          }

          if (loteAtual.rows[0].quantidade_atual < quantidade) {
            throw new Error(`Quantidade insuficiente no lote ${loteAtual.rows[0].lote}`);
          }

          const novaQuantidade = loteAtual.rows[0].quantidade_atual - quantidade;
          const novoStatus = novaQuantidade === 0 ? 'esgotado' : 'ativo';

          await client.query(`
            UPDATE estoque_lotes 
            SET quantidade_atual = $1,
                status = $2,
                updated_at = NOW()
            WHERE id = $3
          `, [novaQuantidade, novoStatus, lote_id]);

          movimentacoes.push({
            lote_id,
            lote: loteAtual.rows[0].lote,
            quantidade,
            tipo: 'saida'
          });
        }
      }

      // Atualizar estoque da escola
      const estoqueEscola = await client.query(`
        SELECT * FROM estoque_escolas 
        WHERE escola_id = $1 AND produto_id = $2
      `, [escola_id, produto_id]);

      let quantidadeAnterior = 0;
      let quantidadePosterior = 0;

      if (estoqueEscola.rows.length > 0) {
        quantidadeAnterior = estoqueEscola.rows[0].quantidade_atual;
        
        if (tipo_movimentacao === 'entrada') {
          quantidadePosterior = quantidadeAnterior + quantidadeTotal;
        } else if (tipo_movimentacao === 'saida') {
          quantidadePosterior = quantidadeAnterior - quantidadeTotal;
        }

        await client.query(`
          UPDATE estoque_escolas 
          SET quantidade_atual = $1, updated_at = NOW()
          WHERE escola_id = $2 AND produto_id = $3
        `, [quantidadePosterior, escola_id, produto_id]);
      } else {
        // Criar registro no estoque da escola se não existir
        quantidadePosterior = tipo_movimentacao === 'entrada' ? quantidadeTotal : 0;
        
        await client.query(`
          INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
          VALUES ($1, $2, $3)
        `, [escola_id, produto_id, quantidadePosterior]);
      }

      // Registrar no histórico
      await client.query(`
        INSERT INTO estoque_escolas_historico (
          estoque_escola_id, escola_id, produto_id, tipo_movimentacao,
          quantidade_anterior, quantidade_movimentada, quantidade_posterior,
          motivo, documento_referencia, usuario_id, data_movimentacao
        ) VALUES (
          (SELECT id FROM estoque_escolas WHERE escola_id = $1 AND produto_id = $2),
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
        )
      `, [
        escola_id, produto_id, tipo_movimentacao,
        quantidadeAnterior, quantidadeTotal, quantidadePosterior,
        motivo || `Movimentação por lotes: ${movimentacoes.length} lote(s)`,
        documento_referencia, usuario_id || 1
      ]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Movimentação processada com sucesso`,
        data: {
          tipo_movimentacao,
          quantidade_total: quantidadeTotal,
          lotes_processados: movimentacoes.length,
          movimentacoes
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error("❌ Erro ao processar movimentação com lotes:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar movimentação",
      error: error.message
    });
  }
}