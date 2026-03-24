-- Migração: Sistema de Jobs para Processamento em Background
-- Permite processar tarefas longas de forma assíncrona com progresso

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,              -- Ex: 'gerar_guias', 'importar_produtos'
  status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- pendente, processando, concluido, erro
  progresso INTEGER DEFAULT 0,            -- 0-100
  total_itens INTEGER DEFAULT 0,          -- Total de itens a processar
  itens_processados INTEGER DEFAULT 0,    -- Itens já processados
  tempo_estimado INTEGER,                 -- Segundos estimados restantes
  tempo_inicio TIMESTAMP,                 -- Quando começou
  tempo_fim TIMESTAMP,                    -- Quando terminou
  resultado JSONB,                        -- Resultado final (guia_id, etc)
  erro TEXT,                              -- Mensagem de erro se falhar
  parametros JSONB,                       -- Parâmetros da tarefa
  usuario_id INTEGER,                     -- Quem iniciou
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas rápidas
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_tipo ON jobs(tipo);
CREATE INDEX idx_jobs_usuario_id ON jobs(usuario_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Adicionar campo job_id na tabela guias para rastrear qual job criou a guia
ALTER TABLE guias ADD COLUMN IF NOT EXISTS job_id INTEGER REFERENCES jobs(id);
CREATE INDEX IF NOT EXISTS idx_guias_job_id ON guias(job_id);
