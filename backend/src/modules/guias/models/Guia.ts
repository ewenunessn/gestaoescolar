import db from "../../../database";

export interface Guia {
  id: number;
  mes: number;
  ano: number;
  nome?: string;
  observacao?: string;
  status: 'aberta' | 'fechada' | 'cancelada';
  competencia_mes_ano?: string;
  periodo_inicio?: string;
  periodo_fim?: string;
  created_at: string;
  updated_at: string;
  total_produtos?: number;
}

export async function createGuiaTables() {
  const tableExists = async (name: string): Promise<boolean> => {
    try {
      const r = await db.get(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
        [name]
      );
      return !!r;
    } catch {
      return false;
    }
  };

  await db.query(
    `CREATE TABLE IF NOT EXISTS guias (
      id SERIAL PRIMARY KEY,
      mes INTEGER NOT NULL,
      ano INTEGER NOT NULL,
      nome TEXT,
      observacao TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','fechada','cancelada')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`
  );

  const hasProdutos = await tableExists('produtos');
  const hasEscolas = await tableExists('escolas');

  const fkGuia = `guia_id INTEGER NOT NULL${true ? '' : ''}`;
  const fkProduto = `produto_id INTEGER${hasProdutos ? ' NOT NULL' : ''}`;
  const fkEscola = `escola_id INTEGER${hasEscolas ? ' NOT NULL' : ''}`;

  const guiaProdutoSql = `
    CREATE TABLE IF NOT EXISTS guia_produto_escola (
      id SERIAL PRIMARY KEY,
      ${fkGuia},
      ${fkProduto},
      ${fkEscola},
      quantidade DECIMAL(12,3) DEFAULT 0,
      unidade TEXT,
      lote TEXT,
      observacao TEXT,
      para_entrega BOOLEAN DEFAULT TRUE,
      entrega_confirmada BOOLEAN DEFAULT FALSE,
      quantidade_entregue DECIMAL(12,3),
      data_entrega TIMESTAMP,
      nome_quem_recebeu TEXT,
      nome_quem_entregou TEXT,
      status VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await db.query(guiaProdutoSql);

  await db.query(
    `CREATE TABLE IF NOT EXISTS rotas_entrega (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`
  );

  const rotaEscolasSql = `
    CREATE TABLE IF NOT EXISTS rota_escolas (
      id SERIAL PRIMARY KEY,
      rota_id INTEGER NOT NULL,
      escola_id INTEGER,
      ordem INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await db.query(rotaEscolasSql);
}

export interface GuiaProdutoEscola {
  id: number;
  guia_id: number;
  produto_id: number;
  escola_id: number;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  para_entrega: boolean;
  created_at: string;
  updated_at: string;
  entrega_confirmada?: boolean;
  quantidade_entregue?: number;
  data_entrega?: string;
  nome_quem_recebeu?: string;
  nome_quem_entregou?: string;
  status?: 'pendente' | 'entregue' | 'cancelado' | 'programada' | 'parcial';
}

export interface CreateGuiaData {
  mes: number;
  ano: number;
  nome?: string;
  observacao?: string;
}

export interface CreateGuiaProdutoEscolaData {
  guia_id: number;
  produto_id: number;
  escola_id: number;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  para_entrega?: boolean;
  entrega_confirmada?: boolean;
  quantidade_entregue?: number;
  data_entrega?: string;
  nome_quem_recebeu?: string;
  nome_quem_entregou?: string;
  status?: 'pendente' | 'entregue' | 'cancelado' | 'programada' | 'parcial';
}

export async function createEssentialTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS escolas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      codigo TEXT,
      codigo_acesso TEXT,
      endereco TEXT,
      municipio TEXT,
      endereco_maps TEXT,
      telefone TEXT,
      email TEXT,
      nome_gestor TEXT,
      administracao TEXT,
      ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

class GuiaModel {
  async listarGuias(): Promise<Guia[]> {
    try {
      console.log('🔍 [GuiaModel] Listando guias');
      const result = await db.all(`
        SELECT 
          g.*,
          COUNT(DISTINCT gpe.id) as total_produtos,
          COUNT(DISTINCT gpe.escola_id) as total_escolas
        FROM guias g
        LEFT JOIN guia_produto_escola gpe ON g.id = gpe.guia_id
        LEFT JOIN periodos per ON g.periodo_id = per.id
        WHERE (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
        GROUP BY g.id, g.mes, g.ano, g.nome, g.observacao, g.status, g.created_at, g.updated_at
        ORDER BY g.created_at DESC
      `);
      console.log('✅ [GuiaModel] Encontradas', result.length, 'guias');
      return result;
    } catch (error) {
      console.error('❌ [GuiaModel] Erro ao listar guias:', error);
      throw error;
    }
  }

  async buscarGuiaPorMesAno(mes: number, ano: number): Promise<Guia | undefined> {
    const result = await db.get(`
      SELECT * FROM guias WHERE mes = $1 AND ano = $2
    `, [mes, ano]);
    return result;
  }

  async buscarGuia(id: number): Promise<Guia | null> {
    const result = await db.get(`
      SELECT * FROM guias WHERE id = $1
    `, [id]);
    return result;
  }

  async criarGuia(data: CreateGuiaData): Promise<Guia> {
    // Gerar código único para a guia
    const codigoResult = await db.query(`SELECT gerar_codigo_guia($1, $2) as codigo`, [data.mes, data.ano]);
    const codigo_guia = codigoResult.rows[0]?.codigo;
    
    const result = await db.query(`
      INSERT INTO guias (mes, ano, nome, observacao, status, codigo_guia, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'aberta', $5, NOW(), NOW())
      RETURNING *
    `, [data.mes, data.ano, data.nome || null, data.observacao || null, codigo_guia]);

    return result.rows[0];
  }

  async listarStatusEscolas(mes: number, ano: number, guiaId?: number): Promise<any[]> {
    try {
      console.log(`🔍 [GuiaModel] Listando status das escolas para ${mes}/${ano}`);
      
      const tableExists = async (name: string): Promise<boolean> => {
        try {
          const r = await db.get(`
            SELECT 1
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          `, [name]);
          return !!r;
        } catch {
          return false;
        }
      };

      const hasGuias = await tableExists('guias');
      const hasGPE = await tableExists('guia_produto_escola');
      const hasRotas = (await tableExists('rotas_entrega')) && (await tableExists('rota_escolas'));

      if (!hasGuias || !hasGPE) {
        const escolas = await db.all(`SELECT id, nome, endereco FROM escolas ORDER BY nome`);
        return escolas.map((e: any) => ({
          id: e.id,
          nome: e.nome,
          endereco: e.endereco,
          escola_rota: null,
          ordem_rota: null,
          qtd_pendente: 0,
          qtd_programada: 0,
          qtd_parcial: 0,
          qtd_cancelado: 0,
          qtd_entregue: 0
        }));
      }

      let joinRotasSelect = `NULL as escola_rota, NULL as ordem_rota`;
      let joinRotas = ``;
      if (hasRotas) {
        joinRotasSelect = `
          STRING_AGG(DISTINCT re.nome, ', ') as escola_rota,
          MIN(res.ordem) as ordem_rota
        `;
        joinRotas = `
          LEFT JOIN rota_escolas res ON e.id = res.escola_id
          LEFT JOIN rotas_entrega re ON res.rota_id = re.id
        `;
      }

      const result = await db.all(`
        SELECT 
          e.id, 
          e.nome, 
          e.endereco,
          ${joinRotasSelect},
          COUNT(CASE WHEN gpe.status = 'pendente' THEN 1 END) as qtd_pendente,
          COUNT(CASE WHEN gpe.status = 'programada' THEN 1 END) as qtd_programada,
          COUNT(CASE WHEN gpe.status = 'parcial' THEN 1 END) as qtd_parcial,
          COUNT(CASE WHEN gpe.status = 'cancelado' THEN 1 END) as qtd_cancelado,
          COUNT(CASE WHEN gpe.status = 'entregue' THEN 1 END) as qtd_entregue
        FROM escolas e
        ${joinRotas}
        LEFT JOIN guia_produto_escola gpe ON e.id = gpe.escola_id 
          AND EXISTS (
            SELECT 1 FROM guias g 
            WHERE g.id = gpe.guia_id 
            AND g.mes = $1 
            AND g.ano = $2
            ${guiaId ? 'AND g.id = $3' : ''}
          )
        GROUP BY e.id, e.nome, e.endereco
        ORDER BY ${hasRotas ? "escola_rota NULLS LAST, ordem_rota NULLS LAST," : ""} e.nome
      `, guiaId ? [mes, ano, guiaId] : [mes, ano]);
      return result;
    } catch (error) {
      console.error('❌ [GuiaModel] Erro ao listar status das escolas:', error);
      throw error;
    }
  }

  async listarRomaneio(filtros: { dataInicio?: string; dataFim?: string; escolaId?: number; rotaId?: number; status?: string }): Promise<any[]> {
    try {
      console.log('🔍 [GuiaModel] Listando romaneio com filtros:', filtros);
      
      // Query otimizada: usa subquery para rotas ao invés de JOIN + GROUP BY
      let query = `
        SELECT 
          gpe.id,
          gpe.data_entrega,
          gpe.quantidade,
          gpe.unidade,
          gpe.observacao,
          gpe.status,
          p.nome as produto_nome,
          e.nome as escola_nome,
          (
            SELECT STRING_AGG(re.nome, ', ')
            FROM rota_escolas res
            JOIN rotas_entrega re ON res.rota_id = re.id
            WHERE res.escola_id = e.id
          ) as escola_rota
        FROM guia_produto_escola gpe
        JOIN produtos p ON gpe.produto_id = p.id
        JOIN escolas e ON gpe.escola_id = e.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramCount = 1;

      if (filtros.dataInicio) {
        query += ` AND gpe.data_entrega >= $${paramCount}`;
        params.push(filtros.dataInicio);
        paramCount++;
      }

      if (filtros.dataFim) {
        query += ` AND gpe.data_entrega <= $${paramCount}`;
        params.push(filtros.dataFim);
        paramCount++;
      }

      if (filtros.escolaId) {
        query += ` AND gpe.escola_id = $${paramCount}`;
        params.push(filtros.escolaId);
        paramCount++;
      }

      if (filtros.rotaId) {
        query += ` AND EXISTS (
          SELECT 1 FROM rota_escolas res 
          WHERE res.escola_id = e.id AND res.rota_id = $${paramCount}
        )`;
        params.push(filtros.rotaId);
        paramCount++;
      }

      if (filtros.status) {
        query += ` AND gpe.status = $${paramCount}`;
        params.push(filtros.status);
        paramCount++;
      } else {
        // Por padrão, não mostrar cancelados
        query += ` AND (gpe.status != 'cancelado' OR gpe.status IS NULL)`;
      }

      // Filtrar apenas itens com data de entrega definida
      query += ` AND gpe.data_entrega IS NOT NULL`;

      query += ` ORDER BY gpe.data_entrega, e.nome, p.nome`;

      const result = await db.all(query, params);
      return result;
    } catch (error) {
      console.error('❌ [GuiaModel] Erro ao listar romaneio:', error);
      throw error;
    }
  }

  async atualizarGuia(id: number, data: Partial<CreateGuiaData>): Promise<Guia> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.mes !== undefined) {
      fields.push(`mes = $${paramCount}`);
      values.push(data.mes);
      paramCount++;
    }
    if (data.ano !== undefined) {
      fields.push(`ano = $${paramCount}`);
      values.push(data.ano);
      paramCount++;
    }
    if (data.observacao !== undefined) {
      fields.push(`observacao = $${paramCount}`);
      values.push(data.observacao);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await db.run(`
      UPDATE guias 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    return await this.buscarGuia(id);
  }

  async deletarGuia(id: number): Promise<boolean> {
    const result = await db.run(`
      DELETE FROM guias WHERE id = $1
    `, [id]);
    return result.changes > 0;
  }

  async listarProdutosPorGuia(guiaId: number): Promise<GuiaProdutoEscola[]> {
    const result = await db.all(`
      SELECT 
        gpe.*,
        p.nome as produto_nome,
        p.unidade_distribuicao as produto_unidade,
        e.nome as escola_nome,
        DATE(gpe.created_at) as data_criacao,
        COALESCE(gpe.quantidade_total_entregue, 0) as quantidade_total_entregue,
        (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) as saldo_pendente,
        COALESCE(gpe.quantidade_demanda, gpe.quantidade) as quantidade_demanda,
        CASE 
          WHEN COALESCE(gpe.quantidade_total_entregue, 0) >= gpe.quantidade THEN 'entregue'
          WHEN COALESCE(gpe.quantidade_total_entregue, 0) > 0 THEN 'parcial'
          WHEN gpe.status = 'programada' THEN 'programada'
          WHEN gpe.status = 'cancelado' THEN 'cancelado'
          ELSE 'pendente'
        END as status_calculado
      FROM guia_produto_escola gpe
      JOIN produtos p ON gpe.produto_id = p.id
      JOIN escolas e ON gpe.escola_id = e.id
      JOIN guias g ON gpe.guia_id = g.id
      WHERE gpe.guia_id = $1
      ORDER BY gpe.created_at DESC, gpe.lote, p.nome, e.nome
    `, [guiaId]);
    
    // Atualizar o status com base no status calculado
    return result.map(item => ({
      ...item,
      status: item.status_calculado
    }));
  }

  async listarProdutosPorEscola(escolaId: number, mes: number, ano: number): Promise<GuiaProdutoEscola[]> {
    const result = await db.all(`
      SELECT 
        gpe.*,
        p.nome as produto_nome,
        g.mes,
        g.ano,
        COALESCE(gpe.quantidade_total_entregue, 0) as quantidade_total_entregue,
        (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) as saldo_pendente,
        CASE 
          WHEN COALESCE(gpe.quantidade_total_entregue, 0) >= gpe.quantidade THEN 'entregue'
          WHEN COALESCE(gpe.quantidade_total_entregue, 0) > 0 THEN 'parcial'
          WHEN gpe.status = 'programada' THEN 'programada'
          WHEN gpe.status = 'cancelado' THEN 'cancelado'
          ELSE 'pendente'
        END as status_calculado
      FROM guia_produto_escola gpe
      JOIN guias g ON gpe.guia_id = g.id
      JOIN produtos p ON gpe.produto_id = p.id
      WHERE gpe.escola_id = $1 AND g.mes = $2 AND g.ano = $3
      ORDER BY gpe.created_at DESC
    `, [escolaId, mes, ano]);
    
    // Atualizar o status com base no status calculado
    return result.map(item => ({
      ...item,
      status: item.status_calculado
    }));
  }

  async adicionarProdutoGuia(data: CreateGuiaProdutoEscolaData): Promise<GuiaProdutoEscola> {
    // Buscar snapshot da escola
    const escolaSnapshot = await db.get(`
      SELECT 
        e.nome as escola_nome,
        e.endereco as escola_endereco,
        e.municipio as escola_municipio,
        COALESCE((
          SELECT SUM(em.quantidade_alunos)
          FROM escola_modalidades em
          WHERE em.escola_id = e.id
        ), 0) as escola_total_alunos,
        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'modalidade_id', em.modalidade_id,
                'modalidade_nome', m.nome,
                'quantidade_alunos', em.quantidade_alunos
              ) ORDER BY m.nome
            ),
            '[]'::jsonb
          )
          FROM escola_modalidades em
          LEFT JOIN modalidades m ON em.modalidade_id = m.id
          WHERE em.escola_id = e.id
        ) as escola_modalidades
      FROM escolas e
      WHERE e.id = $1
    `, [data.escola_id]);

    const result = await db.run(`
      INSERT INTO guia_produto_escola (
        guia_id, produto_id, escola_id, quantidade, unidade, 
        lote, observacao, para_entrega, status, data_entrega,
        escola_nome, escola_endereco, escola_municipio, escola_total_alunos, escola_modalidades, escola_snapshot_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      data.guia_id,
      data.produto_id,
      data.escola_id,
      data.quantidade,
      data.unidade,
      data.lote || null,
      data.observacao || null,
      data.para_entrega !== undefined ? data.para_entrega : true,
      data.status || 'pendente',
      data.data_entrega || null,
      escolaSnapshot?.escola_nome || null,
      escolaSnapshot?.escola_endereco || null,
      escolaSnapshot?.escola_municipio || null,
      escolaSnapshot?.escola_total_alunos || null,
      escolaSnapshot?.escola_modalidades ? JSON.stringify(escolaSnapshot.escola_modalidades) : null,
    ]);

    return await this.buscarProdutoGuia(result.lastID);
  }

  async buscarProdutoGuia(id: number): Promise<GuiaProdutoEscola | null> {
    const result = await db.get(`
      SELECT * FROM guia_produto_escola WHERE id = $1
    `, [id]);
    return result;
  }

  async atualizarProdutoGuia(id: number, data: Partial<CreateGuiaProdutoEscolaData>): Promise<GuiaProdutoEscola> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.quantidade !== undefined) {
      fields.push(`quantidade = $${paramCount}`);
      values.push(data.quantidade);
      paramCount++;
    }
    if (data.unidade !== undefined) {
      fields.push(`unidade = $${paramCount}`);
      values.push(data.unidade);
      paramCount++;
    }
    if (data.observacao !== undefined) {
      fields.push(`observacao = $${paramCount}`);
      values.push(data.observacao);
      paramCount++;
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount}`);
      values.push(data.status);
      paramCount++;
    }
    if (data.data_entrega !== undefined) {
      fields.push(`data_entrega = $${paramCount}`);
      values.push(data.data_entrega);
      paramCount++;
    }

    if (fields.length === 0) return await this.buscarProdutoGuia(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await db.run(`
      UPDATE guia_produto_escola 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    return await this.buscarProdutoGuia(id);
  }

  async removerProdutoGuia(id: number): Promise<boolean> {
    const result = await db.run(`
      DELETE FROM guia_produto_escola WHERE id = $1
    `, [id]);
    return result.changes > 0;
  }

  async removerProdutosPorGuia(guiaId: number, produtoId?: number, escolaId?: number): Promise<boolean> {
    let query = 'DELETE FROM guia_produto_escola WHERE guia_id = $1';
    const params = [guiaId];

    if (produtoId) {
      query += ' AND produto_id = $2';
      params.push(produtoId);
    }

    if (escolaId) {
      query += ` AND escola_id = $${params.length + 1}`;
      params.push(escolaId);
    }

    const result = await db.run(query, params);
    return result.changes > 0;
  }

  // Métodos específicos para entregas
  async listarEscolasComItensParaEntrega(): Promise<any[]> {
    const result = await db.all(`
      SELECT DISTINCT
        e.id,
        e.nome,
        e.endereco,
        e.telefone,
        COUNT(gpe.id) as total_itens,
        SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) as itens_entregues
      FROM escolas e
      INNER JOIN guia_produto_escola gpe ON e.id = gpe.escola_id
      INNER JOIN guias g ON gpe.guia_id = g.id
      WHERE gpe.para_entrega = true 
        AND g.status = 'aberta'
      GROUP BY e.id, e.nome, e.endereco, e.telefone
      ORDER BY e.nome
    `);
    return result;
  }

  async listarItensParaEntregaPorEscola(escolaId: number): Promise<any[]> {
    const result = await db.all(`
      SELECT 
        gpe.*,
        p.nome as produto_nome,
        p.unidade_distribuicao as produto_unidade,
        g.mes,
        g.ano,
        g.observacao as guia_observacao
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN guias g ON gpe.guia_id = g.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      WHERE gpe.escola_id = $1 
        AND gpe.para_entrega = true
        AND g.status = 'aberta'
      ORDER BY g.mes DESC, g.ano DESC, p.nome, gpe.lote
    `, [escolaId]);
    return result;
  }

  async confirmarEntrega(itemId: number, dadosEntrega: {
    quantidade_entregue: number;
    nome_quem_entregou: string;
    nome_quem_recebeu: string;
  }): Promise<GuiaProdutoEscola> {
    await db.run(`
      UPDATE guia_produto_escola 
      SET 
        entrega_confirmada = true,
        status = 'entregue',
        quantidade_entregue = $1,
        data_entrega = NOW(),
        nome_quem_entregou = $2,
        nome_quem_recebeu = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [
      dadosEntrega.quantidade_entregue,
      dadosEntrega.nome_quem_entregou,
      dadosEntrega.nome_quem_recebeu,
      itemId
    ]);

    return await this.buscarProdutoGuia(itemId);
  }

  // Listar competências com resumo de status
  async listarCompetencias(): Promise<any[]> {
    const query = `
      SELECT 
        g.mes,
        g.ano,
        g.id as guia_id,
        g.nome as guia_nome,
        g.status as guia_status,
        g.competencia_mes_ano,
        g.periodo_inicio,
        g.periodo_fim,
        COUNT(DISTINCT gpe.id) as total_itens,
        COUNT(DISTINCT gpe.escola_id) as total_escolas,
        COUNT(DISTINCT CASE WHEN gpe.status = 'pendente' THEN gpe.id END) as qtd_pendente,
        COUNT(DISTINCT CASE WHEN gpe.status = 'programada' THEN gpe.id END) as qtd_programada,
        COUNT(DISTINCT CASE WHEN gpe.status = 'parcial' THEN gpe.id END) as qtd_parcial,
        COUNT(DISTINCT CASE WHEN gpe.status = 'entregue' THEN gpe.id END) as qtd_entregue,
        COUNT(DISTINCT CASE WHEN gpe.status = 'cancelado' THEN gpe.id END) as qtd_cancelado
      FROM guias g
      LEFT JOIN guia_produto_escola gpe ON g.id = gpe.guia_id
      GROUP BY g.mes, g.ano, g.id, g.nome, g.status, g.competencia_mes_ano, g.periodo_inicio, g.periodo_fim
      ORDER BY g.ano DESC, g.mes DESC, g.periodo_inicio ASC NULLS LAST
    `;

    const rows = await db.all(query);
    
    return rows.map((row: any) => ({
      mes: row.mes,
      ano: row.ano,
      guia_id: row.guia_id,
      guia_nome: row.guia_nome,
      guia_status: row.guia_status,
      competencia_mes_ano: row.competencia_mes_ano,
      periodo_inicio: row.periodo_inicio,
      periodo_fim: row.periodo_fim,
      total_itens: Number(row.total_itens) || 0,
      total_escolas: Number(row.total_escolas) || 0,
      qtd_pendente: Number(row.qtd_pendente) || 0,
      qtd_programada: Number(row.qtd_programada) || 0,
      qtd_parcial: Number(row.qtd_parcial) || 0,
      qtd_entregue: Number(row.qtd_entregue) || 0,
      qtd_cancelado: Number(row.qtd_cancelado) || 0
    }));
  }
}

export default new GuiaModel();

