// Controller de cardápios para PostgreSQL
import { Request, Response } from "express";
import { setTenantContextFromRequest } from "../../../utils/tenantContext";
const db = require("../../../database");

export async function listarCardapios(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    const result = await db.query(`
      SELECT 
        c.id,
        c.nome,
        c.descricao,
        c.periodo_dias,
        c.data_inicio,
        c.data_fim,
        c.modalidade_id,
        c.ativo,
        c.created_at,
        c.updated_at,
        m.nome as modalidade_nome
      FROM cardapios c
      LEFT JOIN modalidades m ON c.modalidade_id = m.id
      WHERE c.tenant_id = current_setting('app.current_tenant_id')::uuid
      ORDER BY c.created_at DESC
    `);

    const cardapios = result.rows;

    res.json({
      success: true,
      data: cardapios,
      total: cardapios.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar cardápios:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar cardápios",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function calcularNecessidades(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Buscar refeições do cardápio com produtos
    // Usa o MAIOR preço dos contratos ativos, depois preco_referencia como fallback
    const result = await db.query(`
      SELECT 
        cr.id as cardapio_refeicao_id,
        cr.frequencia_mensal,
        r.nome as refeicao_nome,
        m.nome as modalidade_nome,
        rp.per_capita as produto_quantidade,
        p.nome as produto_nome,
        p.unidade as unidade_medida,
        COALESCE(
          (SELECT MAX(cp2.preco_unitario) 
           FROM contrato_produtos cp2 
           INNER JOIN contratos ct2 ON cp2.contrato_id = ct2.id 
           WHERE cp2.produto_id = p.id 
           AND ct2.ativo = true 
           AND CURRENT_DATE BETWEEN ct2.data_inicio AND ct2.data_fim),
          p.preco_referencia, 
          0
        ) as preco_unitario
      FROM cardapio_refeicoes cr
      JOIN refeicoes r ON cr.refeicao_id = r.id
      JOIN modalidades m ON cr.modalidade_id = m.id
      LEFT JOIN refeicao_produtos rp ON r.id = rp.refeicao_id
      LEFT JOIN produtos p ON rp.produto_id = p.id
      WHERE cr.cardapio_id = $1
      ORDER BY r.nome, p.nome
    `, [id]);

    // Agrupar e calcular necessidades
    const necessidadesMap = new Map();
    
    result.rows.forEach(row => {
      if (!row.produto_nome) return; // Pular se não há produtos
      
      const key = `${row.produto_nome}_${row.unidade_medida}`;
      
      if (!necessidadesMap.has(key)) {
        necessidadesMap.set(key, {
          produto_nome: row.produto_nome,
          unidade_medida: row.unidade_medida,
          preco_unitario: row.preco_unitario,
          quantidade_total: 0,
          valor_total: 0,
          detalhes: []
        });
      }
      
      const necessidade = necessidadesMap.get(key);
      const quantidadeMensal = row.produto_quantidade * row.frequencia_mensal;
      
      necessidade.quantidade_total += quantidadeMensal;
      necessidade.valor_total += quantidadeMensal * (row.preco_unitario || 0);
      necessidade.detalhes.push({
        refeicao: row.refeicao_nome,
        modalidade: row.modalidade_nome,
        frequencia_mensal: row.frequencia_mensal,
        quantidade_por_refeicao: row.produto_quantidade,
        quantidade_mensal: quantidadeMensal
      });
    });

    const necessidades = Array.from(necessidadesMap.values());

    res.json({
      success: true,
      data: necessidades,
      total: necessidades.length
    });
  } catch (error) {
    console.error("❌ Erro ao calcular necessidades:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao calcular necessidades",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarCardapio(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }
    
    // IMPORTANTE: Filtrar por tenant_id para segurança
    const result = await db.query(`
      SELECT * FROM cardapios WHERE id = $1 AND tenant_id = $2
    `, [id, req.tenant.id]);

    const cardapio = result.rows[0];

    if (!cardapio) {
      return res.status(404).json({
        success: false,
        message: "Cardápio não encontrado"
      });
    }

    res.json({
      success: true,
      data: cardapio
    });
  } catch (error) {
    console.error("❌ Erro ao buscar cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarCardapioRefeicoes(req: Request, res: Response) {
  try {
    const { cardapioId } = req.params;
    
    const result = await db.query(`
      SELECT 
        cr.*,
        r.nome as refeicao_nome,
        r.tipo as refeicao_tipo,
        r.descricao as refeicao_descricao,
        r.ativo as refeicao_ativo,
        m.nome as modalidade_nome
      FROM cardapio_refeicoes cr
      LEFT JOIN refeicoes r ON cr.refeicao_id = r.id
      LEFT JOIN modalidades m ON cr.modalidade_id = m.id
      WHERE cr.cardapio_id = $1
      ORDER BY r.tipo, r.nome
    `, [cardapioId]);

    // Transformar os dados para incluir o objeto refeicao aninhado
    const refeicoes = result.rows.map(row => ({
      id: row.id,
      cardapio_id: row.cardapio_id,
      refeicao_id: row.refeicao_id,
      modalidade_id: row.modalidade_id,
      frequencia_mensal: row.frequencia_mensal,
      modalidade_nome: row.modalidade_nome,
      refeicao: row.refeicao_nome ? {
        id: row.refeicao_id,
        nome: row.refeicao_nome,
        tipo: row.refeicao_tipo,
        descricao: row.refeicao_descricao,
        ativo: row.refeicao_ativo
      } : null
    }));

    res.json({
      success: true,
      data: refeicoes,
      total: refeicoes.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar refeições do cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar refeições do cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarCardapio(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    const { nome, descricao, periodo_dias, data_inicio, data_fim, modalidade_id, ativo } = req.body;

    // Validações básicas
    if (!nome || !data_inicio || !data_fim) {
      return res.status(400).json({
        success: false,
        message: "Nome, data de início e data de fim são obrigatórios"
      });
    }

    const result = await db.query(`
      INSERT INTO cardapios (nome, descricao, periodo_dias, data_inicio, data_fim, modalidade_id, ativo, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, current_setting('app.current_tenant_id')::uuid)
      RETURNING *
    `, [nome, descricao, periodo_dias || 30, data_inicio, data_fim, modalidade_id, ativo !== false]);

    const cardapio = result.rows[0];

    res.status(201).json({
      success: true,
      data: cardapio,
      message: "Cardápio criado com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao criar cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function atualizarCardapio(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nome, descricao, periodo_dias, data_inicio, data_fim, ativo } = req.body;

    // Validações básicas
    if (!nome || !data_inicio || !data_fim) {
      return res.status(400).json({
        success: false,
        message: "Nome, data de início e data de fim são obrigatórios"
      });
    }

    // Verificar se o cardápio existe
    const existeResult = await db.query('SELECT id FROM cardapios WHERE id = $1', [id]);
    if (existeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cardápio não encontrado"
      });
    }

    // Validar datas
    if (new Date(data_fim) <= new Date(data_inicio)) {
      return res.status(400).json({
        success: false,
        message: "Data de fim deve ser posterior à data de início"
      });
    }

    // Atualizar cardápio sem permitir alterar modalidade_id
    const result = await db.query(`
      UPDATE cardapios 
      SET nome = $1, descricao = $2, periodo_dias = $3, data_inicio = $4, data_fim = $5, ativo = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [nome, descricao, periodo_dias || 30, data_inicio, data_fim, ativo !== false, id]);

    const cardapio = result.rows[0];

    res.json({
      success: true,
      data: cardapio,
      message: "Cardápio atualizado com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function deletarCardapio(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    // IMPORTANTE: Verificar se o cardápio existe NO MESMO TENANT
    const existeResult = await db.query('SELECT id FROM cardapios WHERE id = $1 AND tenant_id = $2', [id, req.tenant.id]);
    if (existeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cardápio não encontrado"
      });
    }

    // IMPORTANTE: Deletar cardápio apenas do tenant atual (cascade irá remover as refeições associadas)
    await db.query('DELETE FROM cardapios WHERE id = $1 AND tenant_id = $2', [id, req.tenant.id]);

    res.json({
      success: true,
      message: "Cardápio deletado com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao deletar cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao deletar cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Funções para gerenciar refeições do cardápio
export async function adicionarRefeicaoCardapio(req: Request, res: Response) {
  try {
    const { cardapioId } = req.params;
    const { refeicao_id, modalidade_id, frequencia_mensal } = req.body;

    // Validações
    if (!refeicao_id) {
      return res.status(400).json({
        success: false,
        message: "ID da refeição é obrigatório"
      });
    }

    console.log('Adicionando refeição ao cardápio:', {
      cardapioId,
      refeicao_id,
      modalidade_id,
      frequencia_mensal
    });

    // Verificar se o cardápio existe
    const cardapioExists = await db.query('SELECT id FROM cardapios WHERE id = $1', [cardapioId]);
    if (cardapioExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cardápio não encontrado"
      });
    }

    // Verificar se a refeição existe
    const refeicaoExists = await db.query('SELECT id FROM refeicoes WHERE id = $1', [refeicao_id]);
    if (refeicaoExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    // Verificar se a modalidade existe (se fornecida)
    if (modalidade_id) {
      const modalidadeExists = await db.query('SELECT id FROM modalidades WHERE id = $1', [modalidade_id]);
      if (modalidadeExists.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Modalidade não encontrada"
        });
      }
    }

    // Verificar se a associação já existe
    const existingAssociation = await db.query(`
      SELECT id FROM cardapio_refeicoes 
      WHERE cardapio_id = $1 AND refeicao_id = $2 AND (modalidade_id = $3 OR modalidade_id IS NULL)
    `, [cardapioId, refeicao_id, modalidade_id]);

    if (existingAssociation.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Esta refeição já está associada ao cardápio",
        code: "ALREADY_EXISTS"
      });
    }

    const result = await db.query(`
      INSERT INTO cardapio_refeicoes (cardapio_id, refeicao_id, modalidade_id, frequencia_mensal)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [cardapioId, refeicao_id, modalidade_id, frequencia_mensal || 1]);

    const cardapioRefeicao = result.rows[0];

    res.status(201).json({
      success: true,
      data: cardapioRefeicao,
      message: "Refeição adicionada ao cardápio com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao adicionar refeição ao cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao adicionar refeição ao cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerRefeicaoCardapio(req: Request, res: Response) {
  try {
    const { cardapioId, refeicaoId } = req.params;

    const result = await db.query(`
      DELETE FROM cardapio_refeicoes 
      WHERE cardapio_id = $1 AND id = $2
      RETURNING *
    `, [cardapioId, refeicaoId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Associação não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Refeição removida do cardápio com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao remover refeição do cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover refeição do cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function atualizarRefeicaoCardapio(req: Request, res: Response) {
  try {
    const { refeicaoId } = req.params;
    const { modalidade_id, frequencia_mensal } = req.body;

    console.log('Atualizando refeição do cardápio:', {
      refeicaoId,
      modalidade_id,
      frequencia_mensal
    });

    // Verificar se a associação existe
    const existeResult = await db.query('SELECT * FROM cardapio_refeicoes WHERE id = $1', [refeicaoId]);
    if (existeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Associação não encontrada"
      });
    }

    // Verificar se a modalidade existe (se fornecida)
    if (modalidade_id) {
      const modalidadeExists = await db.query('SELECT id FROM modalidades WHERE id = $1', [modalidade_id]);
      if (modalidadeExists.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Modalidade não encontrada"
        });
      }
    }

    // Construir query dinamicamente baseado nos campos fornecidos
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (modalidade_id !== undefined) {
      updateFields.push(`modalidade_id = $${paramIndex}`);
      updateValues.push(modalidade_id);
      paramIndex++;
    }

    if (frequencia_mensal !== undefined) {
      updateFields.push(`frequencia_mensal = $${paramIndex}`);
      updateValues.push(frequencia_mensal);
      paramIndex++;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(refeicaoId);

    const result = await db.query(`
      UPDATE cardapio_refeicoes 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    const cardapioRefeicao = result.rows[0];

    res.json({
      success: true,
      data: cardapioRefeicao,
      message: "Refeição do cardápio atualizada com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar refeição do cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar refeição do cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Nova função para calcular custo total por refeição considerando alunos da modalidade
export async function calcularCustoRefeicoes(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Buscar refeições do cardápio com custo total considerando alunos da modalidade
    const result = await db.query(`
      SELECT 
        cr.id as cardapio_refeicao_id,
        cr.frequencia_mensal,
        r.id as refeicao_id,
        r.nome as refeicao_nome,
        r.descricao as refeicao_descricao,
        m.id as modalidade_id,
        m.nome as modalidade_nome,
        -- Calcular custo total da refeição por aluno
        COALESCE(
          SUM(
            (CASE 
              WHEN COALESCE(rp.tipo_medida, 'gramas') = 'unidades' THEN
                (rp.per_capita / COALESCE(p.fator_divisao, 1))
              ELSE
                (rp.per_capita / 1000.0 / COALESCE(p.fator_divisao, 1))
            END) * 
            COALESCE(
              (SELECT MAX(cp2.preco_unitario) 
               FROM contrato_produtos cp2 
               INNER JOIN contratos ct2 ON cp2.contrato_id = ct2.id 
               WHERE cp2.produto_id = p.id 
               AND ct2.ativo = true 
               AND CURRENT_DATE BETWEEN ct2.data_inicio AND ct2.data_fim),
              p.preco_referencia, 
              0
            )
          ), 0
        ) as custo_por_aluno,
        -- Calcular quantidade total de alunos da modalidade
        COALESCE(
          (SELECT SUM(em.quantidade_alunos)
           FROM escola_modalidades em
           WHERE em.modalidade_id = cr.modalidade_id), 0
        ) as total_alunos_modalidade,
        -- Calcular custo total da refeição (custo_por_aluno * total_alunos * frequencia)
        COALESCE(
          SUM(
            (CASE 
              WHEN COALESCE(rp.tipo_medida, 'gramas') = 'unidades' THEN
                (rp.per_capita / COALESCE(p.fator_divisao, 1))
              ELSE
                (rp.per_capita / 1000.0 / COALESCE(p.fator_divisao, 1))
            END) * 
            COALESCE(
              (SELECT MAX(cp2.preco_unitario) 
               FROM contrato_produtos cp2 
               INNER JOIN contratos ct2 ON cp2.contrato_id = ct2.id 
               WHERE cp2.produto_id = p.id 
               AND ct2.ativo = true 
               AND CURRENT_DATE BETWEEN ct2.data_inicio AND ct2.data_fim),
              p.preco_referencia, 
              0
            )
          ) * 
          COALESCE(
            (SELECT SUM(em.quantidade_alunos)
             FROM escola_modalidades em
             WHERE em.modalidade_id = cr.modalidade_id), 0
          ) * cr.frequencia_mensal, 0
        ) as custo_total_refeicao
      FROM cardapio_refeicoes cr
      JOIN refeicoes r ON cr.refeicao_id = r.id AND r.ativo = true
      JOIN modalidades m ON cr.modalidade_id = m.id
      LEFT JOIN refeicao_produtos rp ON r.id = rp.refeicao_id
      LEFT JOIN produtos p ON rp.produto_id = p.id AND p.ativo = true
      WHERE cr.cardapio_id = $1
      GROUP BY cr.id, cr.frequencia_mensal, r.id, r.nome, r.descricao, m.id, m.nome, cr.modalidade_id
      ORDER BY r.nome
    `, [id]);

    const refeicoesComCusto = result.rows.map(row => ({
      cardapio_refeicao_id: row.cardapio_refeicao_id,
      refeicao_id: row.refeicao_id,
      refeicao_nome: row.refeicao_nome,
      refeicao_descricao: row.refeicao_descricao,
      modalidade_id: row.modalidade_id,
      modalidade_nome: row.modalidade_nome,
      frequencia_mensal: row.frequencia_mensal,
      custo_por_aluno: parseFloat(row.custo_por_aluno || 0),
      total_alunos_modalidade: parseInt(row.total_alunos_modalidade || 0),
      custo_total_refeicao: parseFloat(row.custo_total_refeicao || 0)
    }));

    // Buscar detalhes dos produtos para cada refeição
    const detalhesResult = await db.query(`
      SELECT 
        cr.id as cardapio_refeicao_id,
        r.id as refeicao_id,
        p.id as produto_id,
        p.nome as produto_nome,
        p.unidade as unidade_medida,
        p.fator_divisao,
        rp.per_capita,
        COALESCE(rp.tipo_medida, 'gramas') as tipo_medida,
        COALESCE(
          (SELECT MAX(cp2.preco_unitario) 
           FROM contrato_produtos cp2 
           INNER JOIN contratos ct2 ON cp2.contrato_id = ct2.id 
           WHERE cp2.produto_id = p.id 
           AND ct2.ativo = true 
           AND CURRENT_DATE BETWEEN ct2.data_inicio AND ct2.data_fim),
          p.preco_referencia, 
          0
        ) as preco_unitario,
        (CASE 
          WHEN COALESCE(rp.tipo_medida, 'gramas') = 'unidades' THEN
            (rp.per_capita / COALESCE(p.fator_divisao, 1))
          ELSE
            (rp.per_capita / 1000.0 / COALESCE(p.fator_divisao, 1))
        END * 
         COALESCE(
           (SELECT MAX(cp2.preco_unitario) 
            FROM contrato_produtos cp2 
            INNER JOIN contratos ct2 ON cp2.contrato_id = ct2.id 
            WHERE cp2.produto_id = p.id 
            AND ct2.ativo = true 
            AND CURRENT_DATE BETWEEN ct2.data_inicio AND ct2.data_fim),
           p.preco_referencia, 
           0
         )
        ) as custo_por_aluno_produto
      FROM cardapio_refeicoes cr
      JOIN refeicoes r ON cr.refeicao_id = r.id AND r.ativo = true
      JOIN refeicao_produtos rp ON r.id = rp.refeicao_id
      JOIN produtos p ON rp.produto_id = p.id AND p.ativo = true
      WHERE cr.cardapio_id = $1
      ORDER BY r.nome, p.nome
    `, [id]);

    // Agrupar produtos por refeição
    const produtosPorRefeicao = detalhesResult.rows.reduce((acc, row) => {
      if (!acc[row.refeicao_id]) {
        acc[row.refeicao_id] = [];
      }
      acc[row.refeicao_id].push({
        produto_id: row.produto_id,
        produto_nome: row.produto_nome,
        unidade_medida: row.unidade_medida,
        fator_divisao: parseFloat(row.fator_divisao || 1),
        per_capita: parseFloat(row.per_capita),
        preco_unitario: parseFloat(row.preco_unitario || 0),
        custo_por_aluno_produto: parseFloat(row.custo_por_aluno_produto || 0)
      });
      return acc;
    }, {});

    // Adicionar produtos aos dados das refeições
    const refeicoesComDetalhes = refeicoesComCusto.map(refeicao => ({
      ...refeicao,
      produtos: produtosPorRefeicao[refeicao.refeicao_id] || []
    }));

    // Calcular custo total do cardápio
    const custoTotalCardapio = refeicoesComCusto.reduce((total, refeicao) => 
      total + refeicao.custo_total_refeicao, 0
    );

    res.json({
      success: true,
      data: {
        refeicoes: refeicoesComDetalhes,
        custo_total_cardapio: custoTotalCardapio
      }
    });
  } catch (error) {
    console.error("❌ Erro ao calcular custo das refeições:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao calcular custo das refeições",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}