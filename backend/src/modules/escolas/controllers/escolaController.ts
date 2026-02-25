const db = require("../../../database");

export async function listarEscolas(req, res) {
  try {
    const result = await db.query(`
      SELECT 
        e.id,
        e.nome,
        e.codigo,
        e.codigo_acesso,
        e.endereco,
        e.municipio,
        e.endereco_maps,
        e.telefone,
        e.email,
        e.nome_gestor,
        e.administracao,
        e.ativo,
        e.created_at,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
        STRING_AGG(DISTINCT m.nome, ', ' ORDER BY m.nome) as modalidades
      FROM escolas e
      LEFT JOIN escola_modalidades em ON e.id = em.escola_id
      LEFT JOIN modalidades m ON em.modalidade_id = m.id
      GROUP BY e.id, e.nome, e.codigo, e.codigo_acesso, e.endereco, e.municipio, e.endereco_maps, 
               e.telefone, e.email, e.nome_gestor, e.administracao, e.ativo, e.created_at
      ORDER BY e.nome
    `);

    const escolas = result.rows;

    res.json({
      success: true,
      data: escolas,
      total: escolas.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar escolas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar escolas",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarEscola(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        e.id,
        e.nome,
        e.codigo,
        e.codigo_acesso,
        e.endereco,
        e.municipio,
        e.endereco_maps,
        e.telefone,
        e.email,
        e.nome_gestor,
        e.administracao,
        e.ativo,
        e.created_at,
        e.updated_at
      FROM escolas e
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola não encontrada"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar escola:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar escola",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarEscola(req, res) {
  try {
    const {
      nome,
      codigo,
      codigo_acesso,
      endereco,
      municipio,
      endereco_maps,
      telefone,
      email,
      nome_gestor,
      administracao,
      ativo = true
    } = req.body;

    const result = await db.query(`
      INSERT INTO escolas (
        nome, codigo, codigo_acesso, endereco, municipio, endereco_maps,
        telefone, email, nome_gestor, administracao, ativo, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nome, codigo, codigo_acesso, endereco, municipio, endereco_maps, telefone, email, nome_gestor, administracao, ativo]);

    res.json({
      success: true,
      message: "Escola criada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar escola:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar escola",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarEscola(req, res) {
  try {
    const { id } = req.params;
    const {
      nome,
      codigo,
      codigo_acesso,
      endereco,
      municipio,
      endereco_maps,
      telefone,
      email,
      nome_gestor,
      administracao,
      ativo
    } = req.body;

    const result = await db.query(`
      UPDATE escolas SET
        nome = $1,
        codigo = $2,
        codigo_acesso = $3,
        endereco = $4,
        municipio = $5,
        endereco_maps = $6,
        telefone = $7,
        email = $8,
        nome_gestor = $9,
        administracao = $10,
        ativo = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [nome, codigo, codigo_acesso, endereco, municipio, endereco_maps, telefone, email, nome_gestor, administracao, ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Escola atualizada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar escola:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar escola",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerEscola(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM escolas WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Escola removida com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao remover escola:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover escola",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
