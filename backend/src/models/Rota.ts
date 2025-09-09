const db = require("../database");

// Interfaces
export interface PresetRota {
  id?: number;
  nome: string;
  descricao?: string;
  cor_padrao: string;
  icone_padrao: string;
  configuracao_padrao?: string;
  ativo?: boolean;
  criado_por?: number;
  data_criacao?: Date;
}

export interface Rota {
  id?: number;
  nome: string;
  descricao?: string;
  cor: string;
  cor_secundaria?: string;
  icone: string;
  ativa?: boolean;
  tipo: 'personalizada' | 'preset';
  preset_id?: number;
  configuracao?: string;
  criado_por?: number;
  data_criacao?: Date;
  data_atualizacao?: Date;
}

// Criar tabelas
export async function createRotasTables() {
  try {
    // Tabela de presets de rotas
    await db.query(`
      CREATE TABLE IF NOT EXISTS presets_rotas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL UNIQUE,
        descricao TEXT,
        cor_padrao VARCHAR(7) NOT NULL DEFAULT '#1976d2',
        icone_padrao VARCHAR(10) NOT NULL DEFAULT '🚌',
        configuracao_padrao TEXT,
        ativo BOOLEAN DEFAULT true,
        criado_por INTEGER NOT NULL DEFAULT 1,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela principal de rotas
    await db.query(`
      CREATE TABLE IF NOT EXISTS rotas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        cor VARCHAR(7) NOT NULL DEFAULT '#1976d2',
        cor_secundaria VARCHAR(7),
        icone VARCHAR(10) NOT NULL DEFAULT '🚌',
        ativa BOOLEAN DEFAULT true,
        tipo VARCHAR(20) NOT NULL DEFAULT 'personalizada' CHECK(tipo IN ('personalizada', 'preset')),
        preset_id INTEGER,
        configuracao TEXT,
        criado_por INTEGER NOT NULL DEFAULT 1,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (preset_id) REFERENCES presets_rotas(id) ON DELETE SET NULL
      )
    `);

    // Índices para performance
    await db.query(`CREATE INDEX IF NOT EXISTS idx_rotas_ativa ON rotas(ativa)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_rotas_tipo ON rotas(tipo)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_rotas_preset ON rotas(preset_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_presets_ativo ON presets_rotas(ativo)`);

    // Função para atualizar data_atualizacao
    await db.query(`
      CREATE OR REPLACE FUNCTION update_rota_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.data_atualizacao = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Trigger para atualizar data_atualizacao
    await db.query(`
      DROP TRIGGER IF EXISTS update_rota_timestamp ON rotas;
      CREATE TRIGGER update_rota_timestamp
        BEFORE UPDATE ON rotas
        FOR EACH ROW
        EXECUTE FUNCTION update_rota_timestamp();
    `);

    // Inserir presets padrão se não existirem
    await inserirPresetsDefault();
    console.log('✅ Tabelas de rotas criadas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas de rotas:', error);
    throw error;
  }
}

// Inserir presets padrão
async function inserirPresetsDefault() {
  const presetsDefault = [
    {
      nome: 'Rota Urbana',
      descricao: 'Preset para rotas dentro da cidade',
      cor_padrao: '#1976d2',
      icone_padrao: '🚌',
      configuracao_padrao: JSON.stringify({
        tempo_estimado_por_escola: 15,
        distancia_maxima_entre_escolas: 10,
        horario_inicio_padrao: '07:00',
        tipo_veiculo: 'onibus'
      })
    },
    {
      nome: 'Rota Rural',
      descricao: 'Preset para rotas em áreas rurais',
      cor_padrao: '#388e3c',
      icone_padrao: '🚐',
      configuracao_padrao: JSON.stringify({
        tempo_estimado_por_escola: 25,
        distancia_maxima_entre_escolas: 25,
        horario_inicio_padrao: '06:30',
        tipo_veiculo: 'van'
      })
    },
    {
      nome: 'Rota Expressa',
      descricao: 'Preset para rotas rápidas com poucas paradas',
      cor_padrao: '#f57c00',
      icone_padrao: '🚛',
      configuracao_padrao: JSON.stringify({
        tempo_estimado_por_escola: 10,
        distancia_maxima_entre_escolas: 15,
        horario_inicio_padrao: '08:00',
        tipo_veiculo: 'caminhao'
      })
    },
    {
      nome: 'Rota Especial',
      descricao: 'Preset para rotas com necessidades especiais',
      cor_padrao: '#7b1fa2',
      icone_padrao: '🚑',
      configuracao_padrao: JSON.stringify({
        tempo_estimado_por_escola: 20,
        distancia_maxima_entre_escolas: 12,
        horario_inicio_padrao: '07:30',
        tipo_veiculo: 'especial',
        acessibilidade: true
      })
    }
  ];

  for (const preset of presetsDefault) {
    const existe = await db.query('SELECT id FROM presets_rotas WHERE nome = $1', [preset.nome]);
    if (existe.rows.length === 0) {
      await db.query(
        `INSERT INTO presets_rotas (nome, descricao, cor_padrao, icone_padrao, configuracao_padrao) 
         VALUES ($1, $2, $3, $4, $5)`,
        [preset.nome, preset.descricao, preset.cor_padrao, preset.icone_padrao, preset.configuracao_padrao]
      );
    }
  }
}

// CRUD para Presets
export async function getPresets(ativo?: boolean): Promise<PresetRota[]> {
  let query = 'SELECT * FROM presets_rotas';
  const params: any[] = [];

  if (ativo !== undefined) {
    query += ' WHERE ativo = $1';
    params.push(ativo);
  }

  query += ' ORDER BY nome';
  const result = await db.query(query, params);
  return result.rows;
}

export async function getPresetById(id: number): Promise<PresetRota | null> {
  const result = await db.query('SELECT * FROM presets_rotas WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createPreset(preset: Omit<PresetRota, 'id' | 'data_criacao'>): Promise<PresetRota> {
  const result = await db.query(
    `INSERT INTO presets_rotas (nome, descricao, cor_padrao, icone_padrao, configuracao_padrao, ativo, criado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [preset.nome, preset.descricao, preset.cor_padrao, preset.icone_padrao, preset.configuracao_padrao, preset.ativo, preset.criado_por]
  );
  return result.rows[0];
}

export async function updatePreset(id: number, preset: Partial<PresetRota>): Promise<PresetRota | null> {
  const fields = Object.keys(preset).filter(key => key !== 'id' && key !== 'data_criacao');
  const values = fields.map(field => preset[field as keyof PresetRota]);
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

  if (fields.length === 0) {
    return await getPresetById(id);
  }

  const result = await db.query(
    `UPDATE presets_rotas SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
}

export async function deletePreset(id: number): Promise<boolean> {
  const result = await db.query('DELETE FROM presets_rotas WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// CRUD para Rotas
export async function getRotas(ativa?: boolean): Promise<Rota[]> {
  let query = `
    SELECT r.*, p.nome as preset_nome 
    FROM rotas r 
    LEFT JOIN presets_rotas p ON r.preset_id = p.id
  `;
  const params: any[] = [];

  if (ativa !== undefined) {
    query += ' WHERE r.ativa = $1';
    params.push(ativa);
  }

  query += ' ORDER BY r.nome';
  const result = await db.query(query, params);
  return result.rows;
}

export async function getRotaById(id: number): Promise<Rota | null> {
  const result = await db.query(
    `SELECT r.*, p.nome as preset_nome 
     FROM rotas r 
     LEFT JOIN presets_rotas p ON r.preset_id = p.id 
     WHERE r.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createRota(rota: Omit<Rota, 'id' | 'data_criacao' | 'data_atualizacao'>): Promise<Rota> {
  const result = await db.query(
    `INSERT INTO rotas (nome, descricao, cor, cor_secundaria, icone, ativa, tipo, preset_id, configuracao, criado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [rota.nome, rota.descricao, rota.cor, rota.cor_secundaria, rota.icone, rota.ativa, rota.tipo, rota.preset_id, rota.configuracao, rota.criado_por]
  );
  return result.rows[0];
}

export async function updateRota(id: number, rota: Partial<Rota>): Promise<Rota | null> {
  const fields = Object.keys(rota).filter(key => !['id', 'data_criacao', 'data_atualizacao'].includes(key));
  const values = fields.map(field => rota[field as keyof Rota]);
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

  if (fields.length === 0) {
    return await getRotaById(id);
  }

  const result = await db.query(
    `UPDATE rotas SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
}

export async function deleteRota(id: number): Promise<boolean> {
  const result = await db.query('DELETE FROM rotas WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// Funções auxiliares
export async function createRotaFromPreset(presetId: number, dadosRota: Partial<Rota>): Promise<Rota> {
  const preset = await getPresetById(presetId);
  if (!preset) {
    throw new Error('Preset não encontrado');
  }

  const novaRota: Omit<Rota, 'id' | 'data_criacao' | 'data_atualizacao'> = {
    nome: dadosRota.nome || `Rota baseada em ${preset.nome}`,
    descricao: dadosRota.descricao || preset.descricao,
    cor: dadosRota.cor || preset.cor_padrao,
    cor_secundaria: dadosRota.cor_secundaria,
    icone: dadosRota.icone || preset.icone_padrao,
    ativa: dadosRota.ativa !== undefined ? dadosRota.ativa : true,
    tipo: 'preset',
    preset_id: presetId,
    configuracao: dadosRota.configuracao || preset.configuracao_padrao,
    criado_por: dadosRota.criado_por || 1
  };

  return await createRota(novaRota);
}

export async function duplicarRota(id: number, novoNome?: string): Promise<Rota> {
  const rotaOriginal = await getRotaById(id);
  if (!rotaOriginal) {
    throw new Error('Rota não encontrada');
  }

  const rotaDuplicada: Omit<Rota, 'id' | 'data_criacao' | 'data_atualizacao'> = {
    nome: novoNome || `${rotaOriginal.nome} (Cópia)`,
    descricao: rotaOriginal.descricao,
    cor: rotaOriginal.cor,
    cor_secundaria: rotaOriginal.cor_secundaria,
    icone: rotaOriginal.icone,
    ativa: rotaOriginal.ativa,
    tipo: rotaOriginal.tipo,
    preset_id: rotaOriginal.preset_id,
    configuracao: rotaOriginal.configuracao,
    criado_por: rotaOriginal.criado_por
  };

  return await createRota(rotaDuplicada);
}

export async function getEstatisticasRotas(): Promise<any> {
  const result = await db.query(`
    SELECT 
      COUNT(*) as total_rotas,
      COUNT(CASE WHEN ativa = true THEN 1 END) as rotas_ativas,
      COUNT(CASE WHEN tipo = 'preset' THEN 1 END) as rotas_preset,
      COUNT(CASE WHEN tipo = 'personalizada' THEN 1 END) as rotas_personalizadas
    FROM rotas
  `);

  const presetsResult = await db.query(`
    SELECT COUNT(*) as total_presets FROM presets_rotas WHERE ativo = true
  `);

  return {
    ...result.rows[0],
    total_presets: presetsResult.rows[0].total_presets
  };
}