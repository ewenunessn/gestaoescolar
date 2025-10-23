-- Schema extraído do banco Neon
-- Gerado em: 2025-10-23T11:43:53.665Z
-- Banco origem: ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech

-- Criar database (execute manualmente se necessário)
-- CREATE DATABASE gestao_escolar;
-- \c gestao_escolar;

-- Tabela: aditivos_contratos
CREATE TABLE IF NOT EXISTS aditivos_contratos (
  id integer NOT NULL DEFAULT nextval('aditivos_contratos_id_seq'::regclass),
  contrato_id integer NOT NULL,
  numero_aditivo character varying(255) NOT NULL,
  tipo character varying(50) NOT NULL,
  data_assinatura date NOT NULL,
  data_inicio_vigencia date NOT NULL,
  data_fim_vigencia date,
  prazo_adicional_dias integer,
  nova_data_fim date,
  percentual_acrescimo numeric,
  valor_original numeric,
  valor_aditivo numeric,
  valor_total_atualizado numeric,
  justificativa text NOT NULL,
  fundamentacao_legal text NOT NULL,
  numero_processo character varying(100),
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  criado_por integer NOT NULL,
  aprovado_por integer,
  data_aprovacao timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (aprovado_por) REFERENCES usuarios(id),
  FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

CREATE INDEX idx_aditivos_contratos_contrato ON public.aditivos_contratos USING btree (contrato_id);
CREATE INDEX idx_aditivos_contratos_tipo ON public.aditivos_contratos USING btree (tipo);

-- Tabela: aditivos_contratos_itens
CREATE TABLE IF NOT EXISTS aditivos_contratos_itens (
  id integer NOT NULL DEFAULT nextval('aditivos_contratos_itens_id_seq'::regclass),
  aditivo_id integer NOT NULL,
  contrato_produto_id integer NOT NULL,
  quantidade_original numeric NOT NULL,
  percentual_acrescimo numeric NOT NULL,
  quantidade_adicional numeric NOT NULL,
  quantidade_nova numeric NOT NULL,
  valor_unitario numeric NOT NULL,
  valor_adicional numeric NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (aditivo_id) REFERENCES aditivos_contratos(id),
  FOREIGN KEY (contrato_produto_id) REFERENCES contrato_produtos(id),
  UNIQUE (aditivo_id),
  UNIQUE (aditivo_id),
  UNIQUE (contrato_produto_id),
  UNIQUE (contrato_produto_id)
);

CREATE UNIQUE INDEX aditivos_contratos_itens_aditivo_id_contrato_produto_id_key ON public.aditivos_contratos_itens USING btree (aditivo_id, contrato_produto_id);
CREATE INDEX idx_aditivos_itens_aditivo ON public.aditivos_contratos_itens USING btree (aditivo_id);

-- Tabela: agrupamentos_faturamentos
CREATE TABLE IF NOT EXISTS agrupamentos_faturamentos (
  id integer NOT NULL DEFAULT nextval('agrupamentos_faturamentos_id_seq'::regclass),
  agrupamento_id integer NOT NULL,
  fornecedor_id integer NOT NULL,
  status character varying(50) DEFAULT 'PENDENTE'::character varying,
  valor_total numeric DEFAULT 0,
  valor_faturado numeric DEFAULT 0,
  total_pedidos integer DEFAULT 0,
  pedidos_faturados integer DEFAULT 0,
  data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (agrupamento_id) REFERENCES agrupamentos_mensais(id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  UNIQUE (agrupamento_id),
  UNIQUE (agrupamento_id),
  UNIQUE (fornecedor_id),
  UNIQUE (fornecedor_id)
);

CREATE UNIQUE INDEX agrupamentos_faturamentos_agrupamento_id_fornecedor_id_key ON public.agrupamentos_faturamentos USING btree (agrupamento_id, fornecedor_id);
CREATE INDEX idx_agrupamentos_faturamentos_agrupamento ON public.agrupamentos_faturamentos USING btree (agrupamento_id);
CREATE INDEX idx_agrupamentos_faturamentos_fornecedor ON public.agrupamentos_faturamentos USING btree (fornecedor_id);

-- Tabela: agrupamentos_mensais
CREATE TABLE IF NOT EXISTS agrupamentos_mensais (
  id integer NOT NULL DEFAULT nextval('agrupamentos_mensais_id_seq'::regclass),
  ano integer NOT NULL,
  mes integer NOT NULL,
  descricao character varying(255),
  status character varying(50) DEFAULT 'ATIVO'::character varying,
  total_pedidos integer DEFAULT 0,
  valor_total numeric DEFAULT 0,
  data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  criado_por integer,
  PRIMARY KEY (id),
  FOREIGN KEY (criado_por) REFERENCES usuarios(id),
  UNIQUE (ano),
  UNIQUE (ano),
  UNIQUE (mes),
  UNIQUE (mes)
);

CREATE UNIQUE INDEX agrupamentos_mensais_ano_mes_key ON public.agrupamentos_mensais USING btree (ano, mes);
CREATE INDEX idx_agrupamentos_mensais_ano_mes ON public.agrupamentos_mensais USING btree (ano, mes);

-- Tabela: agrupamentos_pedidos
CREATE TABLE IF NOT EXISTS agrupamentos_pedidos (
  id integer NOT NULL DEFAULT nextval('agrupamentos_pedidos_id_seq'::regclass),
  agrupamento_id integer NOT NULL,
  pedido_id integer NOT NULL,
  data_vinculacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (agrupamento_id) REFERENCES agrupamentos_mensais(id),
  UNIQUE (pedido_id)
);

CREATE UNIQUE INDEX agrupamentos_pedidos_pedido_id_key ON public.agrupamentos_pedidos USING btree (pedido_id);
CREATE INDEX idx_agrupamentos_pedidos_agrupamento ON public.agrupamentos_pedidos USING btree (agrupamento_id);

-- Tabela: alertas
CREATE TABLE IF NOT EXISTS alertas (
  id integer NOT NULL DEFAULT nextval('alertas_id_seq'::regclass),
  tipo character varying(50) NOT NULL,
  titulo character varying(255) NOT NULL,
  mensagem text NOT NULL,
  nivel character varying(20) NOT NULL DEFAULT 'INFO'::character varying,
  ativo boolean DEFAULT true,
  data_inicio timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  data_fim timestamp without time zone,
  usuario_criacao integer,
  dados_extras jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_criacao) REFERENCES usuarios(id)
);

CREATE INDEX idx_alertas_ativo ON public.alertas USING btree (ativo);
CREATE INDEX idx_alertas_nivel ON public.alertas USING btree (nivel);
CREATE INDEX idx_alertas_tipo ON public.alertas USING btree (tipo);

-- Tabela: analises_qualidade
CREATE TABLE IF NOT EXISTS analises_qualidade (
  id integer NOT NULL DEFAULT nextval('analises_qualidade_id_seq'::regclass),
  item_controle_id integer NOT NULL,
  criterio character varying(255) NOT NULL,
  resultado character varying(20) NOT NULL,
  observacoes text,
  usuario_id integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (item_controle_id) REFERENCES controle_qualidade(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);


-- Tabela: auditoria_universal
CREATE TABLE IF NOT EXISTS auditoria_universal (
  id integer NOT NULL DEFAULT nextval('auditoria_universal_id_seq'::regclass),
  modulo character varying(100) NOT NULL,
  tabela character varying(100) NOT NULL,
  operacao character varying(50) NOT NULL,
  registro_id integer,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id integer,
  usuario_nome character varying(255),
  ip_usuario inet,
  contexto_operacao text,
  nivel_criticidade character varying(20) DEFAULT 'medio'::character varying,
  timestamp_operacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);


-- Tabela: backup_estoque_escolas
CREATE TABLE IF NOT EXISTS backup_estoque_escolas (
  id integer NOT NULL DEFAULT nextval('backup_estoque_escolas_id_seq'::regclass),
  escola_id integer NOT NULL,
  produto_id integer NOT NULL,
  quantidade_atual numeric NOT NULL DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  data_backup timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_backup_estoque_data ON public.backup_estoque_escolas USING btree (data_backup);
CREATE INDEX idx_backup_estoque_escola ON public.backup_estoque_escolas USING btree (escola_id);

-- Tabela: backup_movimentacoes_estoque
CREATE TABLE IF NOT EXISTS backup_movimentacoes_estoque (
  id integer NOT NULL DEFAULT nextval('backup_movimentacoes_estoque_id_seq'::regclass),
  escola_id integer NOT NULL,
  produto_id integer NOT NULL,
  tipo_movimentacao character varying(50) NOT NULL,
  quantidade numeric NOT NULL,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  usuario_id integer,
  data_backup timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_backup_movimentacoes_data ON public.backup_movimentacoes_estoque USING btree (data_backup);
CREATE INDEX idx_backup_movimentacoes_escola ON public.backup_movimentacoes_estoque USING btree (escola_id);

-- Tabela: backups
CREATE TABLE IF NOT EXISTS backups (
  id integer NOT NULL DEFAULT nextval('backups_id_seq'::regclass),
  nome_arquivo character varying(255) NOT NULL,
  tamanho_bytes bigint,
  tipo character varying(50) NOT NULL,
  status character varying(20) NOT NULL,
  data_backup timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);


-- Tabela: calculos_entrega
CREATE TABLE IF NOT EXISTS calculos_entrega (
  id integer NOT NULL DEFAULT nextval('calculos_entrega_id_seq'::regclass),
  nome_calculo character varying(200) NOT NULL,
  descricao text,
  data_calculo timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  periodo_inicio date,
  periodo_fim date,
  status character varying(50) DEFAULT 'calculado'::character varying,
  observacoes text,
  created_by integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);


-- Tabela: calculos_resultados
CREATE TABLE IF NOT EXISTS calculos_resultados (
  id integer NOT NULL DEFAULT nextval('calculos_resultados_id_seq'::regclass),
  calculo_id integer NOT NULL,
  escola_id integer NOT NULL,
  produto_id integer NOT NULL,
  quantidade_calculada numeric NOT NULL,
  quantidade_ajustada numeric,
  observacoes_ajuste text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (calculo_id) REFERENCES calculos_entrega(id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  UNIQUE (calculo_id),
  UNIQUE (calculo_id),
  UNIQUE (calculo_id),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id)
);

CREATE UNIQUE INDEX calculos_resultados_calculo_id_escola_id_produto_id_key ON public.calculos_resultados USING btree (calculo_id, escola_id, produto_id);
CREATE INDEX idx_calculos_resultados_calculo ON public.calculos_resultados USING btree (calculo_id);
CREATE INDEX idx_calculos_resultados_escola ON public.calculos_resultados USING btree (escola_id);
CREATE INDEX idx_calculos_resultados_produto ON public.calculos_resultados USING btree (produto_id);

-- Tabela: cardapio_refeicoes
CREATE TABLE IF NOT EXISTS cardapio_refeicoes (
  id integer NOT NULL DEFAULT nextval('cardapio_refeicoes_id_seq'::regclass),
  cardapio_id integer NOT NULL,
  refeicao_id integer NOT NULL,
  modalidade_id integer NOT NULL,
  frequencia_mensal integer NOT NULL DEFAULT 1,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (cardapio_id) REFERENCES cardapios(id),
  FOREIGN KEY (modalidade_id) REFERENCES modalidades(id),
  FOREIGN KEY (refeicao_id) REFERENCES refeicoes(id),
  UNIQUE (cardapio_id),
  UNIQUE (cardapio_id),
  UNIQUE (cardapio_id),
  UNIQUE (refeicao_id),
  UNIQUE (refeicao_id),
  UNIQUE (refeicao_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id)
);

CREATE UNIQUE INDEX uk_cardapio_refeicao_modalidade ON public.cardapio_refeicoes USING btree (cardapio_id, refeicao_id, modalidade_id);
CREATE INDEX idx_cardapio_refeicoes_cardapio_id ON public.cardapio_refeicoes USING btree (cardapio_id);
CREATE INDEX idx_cardapio_refeicoes_refeicao_id ON public.cardapio_refeicoes USING btree (refeicao_id);

-- Tabela: cardapios
CREATE TABLE IF NOT EXISTS cardapios (
  id integer NOT NULL DEFAULT nextval('cardapios_id_seq'::regclass),
  nome character varying(255) NOT NULL,
  descricao text,
  periodo_dias integer NOT NULL DEFAULT 30,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  modalidade_id integer,
  PRIMARY KEY (id),
  FOREIGN KEY (modalidade_id) REFERENCES modalidades(id)
);

CREATE INDEX idx_cardapios_ativo ON public.cardapios USING btree (ativo);
CREATE INDEX idx_cardapios_modalidade ON public.cardapios USING btree (modalidade_id);
CREATE INDEX idx_cardapios_nome ON public.cardapios USING btree (nome);
CREATE INDEX idx_cardapios_periodo ON public.cardapios USING btree (data_inicio, data_fim);

-- Tabela: carrinho_itens
CREATE TABLE IF NOT EXISTS carrinho_itens (
  id integer NOT NULL DEFAULT nextval('carrinho_itens_id_seq'::regclass),
  usuario_id integer DEFAULT 1,
  produto_id integer NOT NULL,
  contrato_id integer,
  fornecedor_id integer,
  quantidade numeric NOT NULL,
  preco_unitario numeric NOT NULL,
  subtotal numeric,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_carrinho_itens_contrato_id ON public.carrinho_itens USING btree (contrato_id);
CREATE INDEX idx_carrinho_itens_produto_id ON public.carrinho_itens USING btree (produto_id);
CREATE INDEX idx_carrinho_itens_usuario_id ON public.carrinho_itens USING btree (usuario_id);

-- Tabela: configuracao_entregas
CREATE TABLE IF NOT EXISTS configuracao_entregas (
  id integer NOT NULL DEFAULT nextval('configuracao_entregas_id_seq'::regclass),
  guia_id integer NOT NULL,
  rotas_selecionadas ARRAY NOT NULL DEFAULT '{}'::integer[],
  itens_selecionados ARRAY NOT NULL DEFAULT '{}'::integer[],
  ativa boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);


-- Tabela: configuracoes_notificacao
CREATE TABLE IF NOT EXISTS configuracoes_notificacao (
  id integer NOT NULL DEFAULT nextval('configuracoes_notificacao_id_seq'::regclass),
  usuario_id integer NOT NULL,
  tipo_alerta character varying(100) NOT NULL,
  ativo boolean DEFAULT true,
  email boolean DEFAULT true,
  push boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  UNIQUE (usuario_id),
  UNIQUE (usuario_id),
  UNIQUE (tipo_alerta),
  UNIQUE (tipo_alerta)
);

CREATE UNIQUE INDEX configuracoes_notificacao_usuario_id_tipo_alerta_key ON public.configuracoes_notificacao USING btree (usuario_id, tipo_alerta);

-- Tabela: consistencia_dados
CREATE TABLE IF NOT EXISTS consistencia_dados (
  id integer NOT NULL DEFAULT nextval('consistencia_dados_id_seq'::regclass),
  modulo character varying(100) NOT NULL,
  tipo_verificacao character varying(100) NOT NULL,
  tabela_origem character varying(100),
  registro_id integer,
  status_verificacao character varying(20) NOT NULL,
  detalhes_inconsistencia text,
  timestamp_verificacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);


-- Tabela: contrato_produtos
CREATE TABLE IF NOT EXISTS contrato_produtos (
  id integer NOT NULL DEFAULT nextval('contrato_produtos_id_seq'::regclass),
  contrato_id integer NOT NULL,
  produto_id integer NOT NULL,
  preco_unitario numeric NOT NULL,
  quantidade_maxima numeric,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  limite numeric,
  preco numeric,
  saldo numeric,
  quantidade_contratada numeric DEFAULT 0,
  quantidade_consumida numeric DEFAULT 0,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  UNIQUE (contrato_id),
  UNIQUE (contrato_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id)
);

CREATE UNIQUE INDEX contrato_produtos_contrato_id_produto_id_key ON public.contrato_produtos USING btree (contrato_id, produto_id);
CREATE INDEX idx_contrato_produtos_contrato ON public.contrato_produtos USING btree (contrato_id);
CREATE INDEX idx_contrato_produtos_produto ON public.contrato_produtos USING btree (produto_id);

-- Tabela: contrato_produtos_modalidades
CREATE TABLE IF NOT EXISTS contrato_produtos_modalidades (
  id integer NOT NULL DEFAULT nextval('contrato_produtos_modalidades_id_seq'::regclass),
  contrato_produto_id integer NOT NULL,
  modalidade_id integer NOT NULL,
  quantidade_inicial numeric NOT NULL DEFAULT 0,
  quantidade_consumida numeric NOT NULL DEFAULT 0,
  quantidade_disponivel numeric,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (contrato_produto_id) REFERENCES contrato_produtos(id),
  FOREIGN KEY (modalidade_id) REFERENCES modalidades(id),
  UNIQUE (contrato_produto_id),
  UNIQUE (contrato_produto_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id)
);

CREATE UNIQUE INDEX contrato_produtos_modalidades_contrato_produto_id_modalidad_key ON public.contrato_produtos_modalidades USING btree (contrato_produto_id, modalidade_id);
CREATE INDEX idx_contrato_produtos_modalidades_contrato_produto ON public.contrato_produtos_modalidades USING btree (contrato_produto_id);
CREATE INDEX idx_contrato_produtos_modalidades_modalidade ON public.contrato_produtos_modalidades USING btree (modalidade_id);

-- Tabela: contratos
CREATE TABLE IF NOT EXISTS contratos (
  id integer NOT NULL DEFAULT nextval('contratos_id_seq'::regclass),
  numero character varying(100) NOT NULL,
  fornecedor_id integer NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  valor_total numeric NOT NULL DEFAULT 0,
  status character varying(50) DEFAULT 'ATIVO'::character varying,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  ativo boolean DEFAULT true,
  descricao text,
  objeto text,
  modalidade character varying(100),
  numero_processo character varying(50),
  saldo_disponivel numeric DEFAULT 0,
  tipo_contrato character varying(20) DEFAULT 'fornecimento'::character varying,
  PRIMARY KEY (id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  UNIQUE (numero)
);

CREATE UNIQUE INDEX contratos_numero_key ON public.contratos USING btree (numero);
CREATE INDEX idx_contratos_fornecedor ON public.contratos USING btree (fornecedor_id);
CREATE INDEX idx_contratos_status ON public.contratos USING btree (status);

-- Tabela: controle_qualidade
CREATE TABLE IF NOT EXISTS controle_qualidade (
  id integer NOT NULL DEFAULT nextval('controle_qualidade_id_seq'::regclass),
  produto_id integer NOT NULL,
  lote character varying(100) NOT NULL,
  data_fabricacao date,
  data_validade date,
  quantidade numeric NOT NULL,
  status character varying(20) DEFAULT 'pendente'::character varying,
  observacoes text,
  usuario_analise_id integer,
  data_analise timestamp without time zone,
  motivo_rejeicao text,
  fornecedor_id integer,
  recebimento_id integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (usuario_analise_id) REFERENCES usuarios(id)
);


-- Tabela: demandas
CREATE TABLE IF NOT EXISTS demandas (
  id integer NOT NULL DEFAULT nextval('demandas_id_seq'::regclass),
  escola_id integer,
  produto_id integer NOT NULL,
  modalidade_id integer NOT NULL,
  mes integer NOT NULL,
  ano integer NOT NULL,
  quantidade_calculada numeric NOT NULL,
  quantidade_ajustada numeric,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  escola_nome character varying(255),
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  FOREIGN KEY (modalidade_id) REFERENCES modalidades(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  UNIQUE (produto_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id),
  UNIQUE (mes),
  UNIQUE (mes),
  UNIQUE (mes),
  UNIQUE (mes),
  UNIQUE (mes),
  UNIQUE (ano),
  UNIQUE (ano),
  UNIQUE (ano),
  UNIQUE (ano),
  UNIQUE (ano),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (escola_id)
);

CREATE UNIQUE INDEX demandas_escola_id_produto_id_modalidade_id_mes_ano_key ON public.demandas USING btree (escola_id, produto_id, modalidade_id, mes, ano);

-- Tabela: demandas_escolas
CREATE TABLE IF NOT EXISTS demandas_escolas (
  id integer NOT NULL DEFAULT nextval('demandas_escolas_id_seq'::regclass),
  escola_id integer,
  escola_nome character varying(255),
  numero_oficio character varying(50) NOT NULL,
  data_solicitacao date NOT NULL,
  data_semead date,
  objeto text NOT NULL,
  descricao_itens text NOT NULL,
  data_resposta_semead date,
  dias_solicitacao integer NOT NULL DEFAULT 0,
  status character varying(20) NOT NULL DEFAULT 'pendente'::character varying,
  observacoes text,
  usuario_criacao_id integer DEFAULT 1,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_demandas_escolas_escola ON public.demandas_escolas USING btree (escola_id);
CREATE INDEX idx_demandas_escolas_status ON public.demandas_escolas USING btree (status);
CREATE INDEX idx_demandas_escolas_data_solicitacao ON public.demandas_escolas USING btree (data_solicitacao);
CREATE INDEX idx_demandas_escolas_usuario_criacao ON public.demandas_escolas USING btree (usuario_criacao_id);
CREATE INDEX idx_demandas_escolas_objeto ON public.demandas_escolas USING gin (to_tsvector('portuguese'::regconfig, objeto));
CREATE INDEX idx_demandas_escolas_escola_nome ON public.demandas_escolas USING btree (escola_nome);

-- Tabela: escola_modalidades
CREATE TABLE IF NOT EXISTS escola_modalidades (
  id integer NOT NULL DEFAULT nextval('escola_modalidades_id_seq'::regclass),
  escola_id integer NOT NULL,
  modalidade_id integer NOT NULL,
  quantidade_alunos integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  turno character varying(20),
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  FOREIGN KEY (modalidade_id) REFERENCES modalidades(id),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id)
);

CREATE UNIQUE INDEX escola_modalidades_escola_id_modalidade_id_key ON public.escola_modalidades USING btree (escola_id, modalidade_id);
CREATE INDEX idx_escola_modalidades_escola ON public.escola_modalidades USING btree (escola_id);
CREATE INDEX idx_escola_modalidades_modalidade ON public.escola_modalidades USING btree (modalidade_id);

-- Tabela: escolas
CREATE TABLE IF NOT EXISTS escolas (
  id integer NOT NULL DEFAULT nextval('escolas_id_seq'::regclass),
  nome character varying(255) NOT NULL,
  endereco text,
  municipio character varying(100),
  endereco_maps text,
  telefone character varying(20),
  nome_gestor character varying(255),
  administracao character varying(20),
  rota integer DEFAULT 1,
  posicao_rota integer DEFAULT 1,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  codigo character varying(50),
  email character varying(255),
  codigo_acesso character varying(20),
  PRIMARY KEY (id),
  UNIQUE (codigo_acesso)
);

CREATE UNIQUE INDEX escolas_codigo_acesso_key ON public.escolas USING btree (codigo_acesso);
CREATE UNIQUE INDEX escolas_nome_unique ON public.escolas USING btree (nome);
CREATE INDEX idx_escolas_ativo ON public.escolas USING btree (ativo);
CREATE UNIQUE INDEX idx_escolas_codigo_acesso ON public.escolas USING btree (codigo_acesso) WHERE (codigo_acesso IS NOT NULL);
CREATE INDEX idx_escolas_nome ON public.escolas USING btree (nome);

-- Tabela: escolas_modalidades
CREATE TABLE IF NOT EXISTS escolas_modalidades (
  id integer NOT NULL DEFAULT nextval('escolas_modalidades_id_seq'::regclass),
  escola_id integer NOT NULL,
  modalidade_id integer NOT NULL,
  quantidade_alunos integer NOT NULL DEFAULT 0,
  ano_letivo integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id),
  UNIQUE (ano_letivo),
  UNIQUE (ano_letivo),
  UNIQUE (ano_letivo)
);

CREATE UNIQUE INDEX escolas_modalidades_escola_id_modalidade_id_ano_letivo_key ON public.escolas_modalidades USING btree (escola_id, modalidade_id, ano_letivo);
CREATE INDEX idx_escolas_modalidades_escola ON public.escolas_modalidades USING btree (escola_id);
CREATE INDEX idx_escolas_modalidades_modalidade ON public.escolas_modalidades USING btree (modalidade_id);

-- Tabela: estoque_alertas
CREATE TABLE IF NOT EXISTS estoque_alertas (
  id integer NOT NULL DEFAULT nextval('estoque_alertas_id_seq'::regclass),
  produto_id integer NOT NULL,
  lote_id integer,
  tipo character varying(30) NOT NULL,
  nivel character varying(20) NOT NULL,
  titulo text NOT NULL,
  descricao text NOT NULL,
  data_alerta timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  visualizado boolean DEFAULT false,
  resolvido boolean DEFAULT false,
  PRIMARY KEY (id),
  FOREIGN KEY (lote_id) REFERENCES estoque_lotes(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE INDEX idx_alertas_produto ON public.estoque_alertas USING btree (produto_id);
CREATE UNIQUE INDEX idx_alertas_unique ON public.estoque_alertas USING btree (produto_id, COALESCE(lote_id, 0), tipo) WHERE (resolvido = false);

-- Tabela: estoque_escola
CREATE TABLE IF NOT EXISTS estoque_escola (
  id integer NOT NULL DEFAULT nextval('estoque_escola_id_seq'::regclass),
  escola_id integer NOT NULL,
  produto_id integer NOT NULL,
  quantidade numeric DEFAULT 0,
  quantidade_minima numeric DEFAULT 0,
  data_ultima_atualizacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id)
);

CREATE UNIQUE INDEX estoque_escola_escola_id_produto_id_key ON public.estoque_escola USING btree (escola_id, produto_id);
CREATE INDEX idx_estoque_escola_escola ON public.estoque_escola USING btree (escola_id);
CREATE INDEX idx_estoque_escola_produto ON public.estoque_escola USING btree (produto_id);

-- Tabela: estoque_escolar_movimentacoes
CREATE TABLE IF NOT EXISTS estoque_escolar_movimentacoes (
  id integer NOT NULL DEFAULT nextval('estoque_escolar_movimentacoes_id_seq'::regclass),
  escola_id integer NOT NULL,
  produto_id integer NOT NULL,
  tipo character varying(20) NOT NULL,
  quantidade numeric NOT NULL,
  quantidade_anterior numeric NOT NULL,
  quantidade_posterior numeric NOT NULL,
  motivo text,
  usuario_id integer,
  data_movimentacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_estoque_escolar_mov_data ON public.estoque_escolar_movimentacoes USING btree (data_movimentacao);
CREATE INDEX idx_estoque_escolar_mov_escola ON public.estoque_escolar_movimentacoes USING btree (escola_id);
CREATE INDEX idx_estoque_escolar_mov_produto ON public.estoque_escolar_movimentacoes USING btree (produto_id);

-- Tabela: estoque_escolas
CREATE TABLE IF NOT EXISTS estoque_escolas (
  id integer NOT NULL DEFAULT nextval('estoque_escolas_id_seq'::regclass),
  escola_id integer NOT NULL,
  produto_id integer NOT NULL,
  quantidade_atual numeric NOT NULL DEFAULT 0.000,
  quantidade_minima numeric DEFAULT 0.000,
  quantidade_maxima numeric DEFAULT 0.000,
  data_ultima_atualizacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  usuario_ultima_atualizacao integer,
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (usuario_ultima_atualizacao) REFERENCES usuarios(id),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id)
);

CREATE UNIQUE INDEX estoque_escolas_escola_id_produto_id_key ON public.estoque_escolas USING btree (escola_id, produto_id);
CREATE INDEX idx_estoque_escolas_ativo ON public.estoque_escolas USING btree (ativo);
CREATE INDEX idx_estoque_escolas_escola ON public.estoque_escolas USING btree (escola_id);
CREATE INDEX idx_estoque_escolas_escola_id ON public.estoque_escolas USING btree (escola_id);
CREATE INDEX idx_estoque_escolas_produto ON public.estoque_escolas USING btree (produto_id);
CREATE INDEX idx_estoque_escolas_produto_id ON public.estoque_escolas USING btree (produto_id);
CREATE INDEX idx_estoque_escolas_quantidade_atual ON public.estoque_escolas USING btree (quantidade_atual);

-- Tabela: estoque_escolas_historico
CREATE TABLE IF NOT EXISTS estoque_escolas_historico (
  id integer NOT NULL DEFAULT nextval('estoque_escolas_historico_id_seq'::regclass),
  estoque_escola_id integer NOT NULL,
  escola_id integer NOT NULL,
  produto_id integer NOT NULL,
  tipo_movimentacao character varying(20) NOT NULL,
  quantidade_anterior numeric NOT NULL,
  quantidade_movimentada numeric NOT NULL,
  quantidade_posterior numeric NOT NULL,
  motivo text,
  documento_referencia character varying(100),
  usuario_id integer,
  data_movimentacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  FOREIGN KEY (estoque_escola_id) REFERENCES estoque_escolas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_estoque_escolas_historico_data ON public.estoque_escolas_historico USING btree (data_movimentacao);
CREATE INDEX idx_estoque_escolas_historico_escola_id ON public.estoque_escolas_historico USING btree (escola_id);
CREATE INDEX idx_estoque_escolas_historico_estoque_escola_id ON public.estoque_escolas_historico USING btree (estoque_escola_id);
CREATE INDEX idx_estoque_historico_data ON public.estoque_escolas_historico USING btree (data_movimentacao);
CREATE INDEX idx_estoque_historico_escola_produto ON public.estoque_escolas_historico USING btree (escola_id, produto_id);
CREATE INDEX idx_estoque_historico_tipo ON public.estoque_escolas_historico USING btree (tipo_movimentacao);
CREATE INDEX idx_historico_data_movimentacao ON public.estoque_escolas_historico USING btree (data_movimentacao);
CREATE INDEX idx_historico_escola_id ON public.estoque_escolas_historico USING btree (escola_id);
CREATE UNIQUE INDEX idx_historico_prevent_exact_duplicates ON public.estoque_escolas_historico USING btree (escola_id, produto_id, tipo_movimentacao, quantidade_movimentada, date_trunc('second'::text, data_movimentacao), COALESCE(motivo, ''::text), usuario_id);
CREATE INDEX idx_historico_produto_id ON public.estoque_escolas_historico USING btree (produto_id);
CREATE INDEX idx_historico_tipo_movimentacao ON public.estoque_escolas_historico USING btree (tipo_movimentacao);
CREATE INDEX idx_historico_usuario_id ON public.estoque_escolas_historico USING btree (usuario_id);
CREATE UNIQUE INDEX idx_prevent_double_click ON public.estoque_escolas_historico USING btree (escola_id, produto_id, tipo_movimentacao, quantidade_movimentada, usuario_id, date_trunc('second'::text, data_movimentacao));

-- Tabela: estoque_lotes
CREATE TABLE IF NOT EXISTS estoque_lotes (
  id integer NOT NULL DEFAULT nextval('estoque_lotes_id_seq'::regclass),
  produto_id integer NOT NULL,
  lote text NOT NULL,
  quantidade_inicial numeric NOT NULL DEFAULT 0,
  quantidade_atual numeric NOT NULL DEFAULT 0,
  data_fabricacao date,
  data_validade date,
  fornecedor_id integer,
  recebimento_id integer,
  observacoes text,
  status character varying(20) NOT NULL DEFAULT 'ativo'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  nota_fiscal character varying(100),
  PRIMARY KEY (id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  UNIQUE (produto_id),
  UNIQUE (produto_id),
  UNIQUE (lote),
  UNIQUE (lote)
);

CREATE UNIQUE INDEX uk_produto_lote ON public.estoque_lotes USING btree (produto_id, lote);
CREATE INDEX idx_estoque_lotes_produto ON public.estoque_lotes USING btree (produto_id);
CREATE INDEX idx_estoque_lotes_status ON public.estoque_lotes USING btree (status);
CREATE INDEX idx_estoque_lotes_validade ON public.estoque_lotes USING btree (data_validade);

-- Tabela: estoque_movimentacoes
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id integer NOT NULL DEFAULT nextval('estoque_movimentacoes_id_seq'::regclass),
  lote_id integer NOT NULL,
  produto_id integer NOT NULL,
  tipo character varying(20) NOT NULL,
  quantidade numeric NOT NULL,
  quantidade_anterior numeric NOT NULL,
  quantidade_posterior numeric NOT NULL,
  motivo text NOT NULL,
  documento_referencia text,
  usuario_id integer NOT NULL,
  data_movimentacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  observacoes text,
  escola_id integer,
  unidade_medida character varying(20),
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  FOREIGN KEY (lote_id) REFERENCES estoque_lotes(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE INDEX idx_movimentacoes_data ON public.estoque_movimentacoes USING btree (data_movimentacao);
CREATE INDEX idx_movimentacoes_data_movimentacao ON public.estoque_movimentacoes USING btree (data_movimentacao);
CREATE INDEX idx_movimentacoes_lote ON public.estoque_movimentacoes USING btree (lote_id);
CREATE INDEX idx_movimentacoes_produto ON public.estoque_movimentacoes USING btree (produto_id);

-- Tabela: faturamento_itens
CREATE TABLE IF NOT EXISTS faturamento_itens (
  id integer NOT NULL DEFAULT nextval('faturamento_itens_id_seq'::regclass),
  faturamento_id integer NOT NULL,
  produto_id integer NOT NULL,
  fornecedor_id integer NOT NULL,
  modalidade_id integer NOT NULL,
  quantidade_recebida numeric NOT NULL,
  preco_unitario numeric NOT NULL,
  valor_total numeric NOT NULL,
  data_recebimento timestamp without time zone NOT NULL,
  observacoes text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pedido_item_id integer,
  quantidade_original numeric,
  quantidade_modalidade numeric,
  percentual_modalidade numeric,
  contrato_id integer,
  consumo_registrado boolean DEFAULT false,
  data_consumo timestamp without time zone,
  PRIMARY KEY (id),
  FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  FOREIGN KEY (faturamento_id) REFERENCES faturamentos(id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (modalidade_id) REFERENCES modalidades(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE INDEX idx_faturamento_itens_faturamento ON public.faturamento_itens USING btree (faturamento_id);
CREATE INDEX idx_faturamento_itens_fornecedor ON public.faturamento_itens USING btree (fornecedor_id);
CREATE INDEX idx_faturamento_itens_modalidade ON public.faturamento_itens USING btree (modalidade_id);
CREATE INDEX idx_faturamento_itens_produto ON public.faturamento_itens USING btree (produto_id);
CREATE INDEX idx_faturamento_itens_consumo ON public.faturamento_itens USING btree (faturamento_id, consumo_registrado);

-- Tabela: faturamento_itens_modalidades
CREATE TABLE IF NOT EXISTS faturamento_itens_modalidades (
  id integer NOT NULL DEFAULT nextval('faturamento_itens_modalidades_id_seq'::regclass),
  faturamento_id integer NOT NULL,
  pedido_item_id integer NOT NULL,
  produto_id integer NOT NULL,
  modalidade_id integer NOT NULL,
  quantidade_original numeric NOT NULL,
  quantidade_modalidade numeric NOT NULL,
  percentual_modalidade numeric NOT NULL,
  valor_unitario numeric NOT NULL,
  valor_total_modalidade numeric NOT NULL,
  valor_repasse_modalidade numeric NOT NULL,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (faturamento_id) REFERENCES faturamentos(id),
  FOREIGN KEY (modalidade_id) REFERENCES modalidades(id),
  FOREIGN KEY (pedido_item_id) REFERENCES pedidos_itens(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE INDEX idx_faturamento_itens_modalidades_faturamento ON public.faturamento_itens_modalidades USING btree (faturamento_id);
CREATE INDEX idx_faturamento_itens_modalidades_modalidade ON public.faturamento_itens_modalidades USING btree (modalidade_id);
CREATE INDEX idx_faturamento_itens_modalidades_pedido_item ON public.faturamento_itens_modalidades USING btree (pedido_item_id);

-- Tabela: faturamentos
CREATE TABLE IF NOT EXISTS faturamentos (
  id integer NOT NULL DEFAULT nextval('faturamentos_id_seq'::regclass),
  numero_faturamento character varying(100) NOT NULL,
  pedido_id integer NOT NULL,
  fornecedor_id integer,
  status character varying(50) NOT NULL DEFAULT 'RASCUNHO'::character varying,
  data_inicio timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_finalizacao timestamp without time zone,
  usuario_criador_id integer NOT NULL,
  observacoes text,
  valor_total_faturado numeric DEFAULT 0,
  total_itens_faturados integer DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  contrato_id integer,
  is_parcial boolean DEFAULT false,
  numero character varying(50),
  data_faturamento date,
  usuario_criacao_id integer,
  PRIMARY KEY (id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id),
  FOREIGN KEY (usuario_criador_id) REFERENCES usuarios(id),
  FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  UNIQUE (numero_faturamento)
);

CREATE UNIQUE INDEX faturamentos_numero_faturamento_key ON public.faturamentos USING btree (numero_faturamento);
CREATE INDEX idx_faturamentos_pedido ON public.faturamentos USING btree (pedido_id);
CREATE INDEX idx_faturamentos_status ON public.faturamentos USING btree (status);

-- Tabela: fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id integer NOT NULL DEFAULT nextval('fornecedores_id_seq'::regclass),
  nome character varying(255) NOT NULL,
  cnpj character varying(18),
  email character varying(255),
  telefone character varying(20),
  endereco text,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  cidade character varying(100),
  estado character varying(2),
  cep character varying(10),
  contato_responsavel character varying(255),
  PRIMARY KEY (id),
  UNIQUE (cnpj)
);

CREATE UNIQUE INDEX fornecedores_cnpj_key ON public.fornecedores USING btree (cnpj);

-- Tabela: gas_controle
CREATE TABLE IF NOT EXISTS gas_controle (
  id integer NOT NULL DEFAULT nextval('gas_controle_id_seq'::regclass),
  nome_local character varying(255) NOT NULL,
  quantidade_total integer NOT NULL DEFAULT 0,
  quantidade_disponivel integer NOT NULL DEFAULT 0,
  quantidade_em_uso integer NOT NULL DEFAULT 0,
  preco_unitario numeric,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  escola_id integer,
  PRIMARY KEY (id)
);

CREATE INDEX idx_gas_controle_nome_local ON public.gas_controle USING btree (nome_local);

-- Tabela: gas_estoque
CREATE TABLE IF NOT EXISTS gas_estoque (
  id integer NOT NULL DEFAULT nextval('gas_estoque_id_seq'::regclass),
  escola_id integer NOT NULL,
  nome_local character varying(255) NOT NULL,
  quantidade_total integer NOT NULL DEFAULT 0,
  quantidade_em_uso integer NOT NULL DEFAULT 0,
  quantidade_reserva integer NOT NULL DEFAULT 0,
  quantidade_vazia integer NOT NULL DEFAULT 0,
  status_estoque character varying(20) NOT NULL DEFAULT 'normal'::character varying,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (nome_local),
  UNIQUE (nome_local)
);

CREATE UNIQUE INDEX gas_estoque_escola_id_nome_local_key ON public.gas_estoque USING btree (escola_id, nome_local);

-- Tabela: gas_movimentacoes
CREATE TABLE IF NOT EXISTS gas_movimentacoes (
  id integer NOT NULL DEFAULT nextval('gas_movimentacoes_id_seq'::regclass),
  gas_controle_id integer NOT NULL,
  tipo_movimentacao character varying(50) NOT NULL,
  quantidade integer NOT NULL,
  preco_unitario numeric,
  valor_total numeric,
  observacoes text,
  data_movimentacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (gas_controle_id) REFERENCES gas_controle(id)
);

CREATE INDEX idx_gas_movimentacoes_gas_controle_id ON public.gas_movimentacoes USING btree (gas_controle_id);
CREATE INDEX idx_gas_movimentacoes_tipo ON public.gas_movimentacoes USING btree (tipo_movimentacao);
CREATE INDEX idx_gas_movimentacoes_data ON public.gas_movimentacoes USING btree (data_movimentacao);

-- Tabela: gestor_escola
CREATE TABLE IF NOT EXISTS gestor_escola (
  id integer NOT NULL DEFAULT nextval('gestor_escola_id_seq'::regclass),
  usuario_id integer NOT NULL,
  escola_id integer NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  UNIQUE (usuario_id),
  UNIQUE (usuario_id),
  UNIQUE (escola_id),
  UNIQUE (escola_id)
);

CREATE UNIQUE INDEX gestor_escola_usuario_id_escola_id_key ON public.gestor_escola USING btree (usuario_id, escola_id);
CREATE INDEX idx_gestor_escola_escola ON public.gestor_escola USING btree (escola_id);
CREATE INDEX idx_gestor_escola_usuario ON public.gestor_escola USING btree (usuario_id);

-- Tabela: guia_produto_escola
CREATE TABLE IF NOT EXISTS guia_produto_escola (
  id integer NOT NULL DEFAULT nextval('guia_produto_escola_id_seq'::regclass),
  guia_id integer NOT NULL,
  produto_id integer NOT NULL,
  escola_id integer NOT NULL,
  quantidade numeric NOT NULL,
  unidade character varying(20) DEFAULT 'kg'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  para_entrega boolean DEFAULT true,
  entrega_confirmada boolean DEFAULT false,
  quantidade_entregue numeric,
  data_entrega timestamp without time zone,
  nome_quem_recebeu character varying(255),
  nome_quem_entregou character varying(255),
  lote character varying(100),
  observacao text,
  observacao_entrega text,
  latitude numeric,
  longitude numeric,
  precisao_gps numeric,
  PRIMARY KEY (id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  FOREIGN KEY (guia_id) REFERENCES guias(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  UNIQUE (guia_id),
  UNIQUE (guia_id),
  UNIQUE (guia_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id),
  UNIQUE (escola_id),
  UNIQUE (escola_id),
  UNIQUE (escola_id)
);

CREATE UNIQUE INDEX guia_produto_escola_guia_id_produto_id_escola_id_key ON public.guia_produto_escola USING btree (guia_id, produto_id, escola_id);
CREATE INDEX idx_guia_produto_escola_escola ON public.guia_produto_escola USING btree (escola_id);
CREATE INDEX idx_guia_produto_escola_guia ON public.guia_produto_escola USING btree (guia_id);
CREATE INDEX idx_guia_produto_escola_produto ON public.guia_produto_escola USING btree (produto_id);
CREATE INDEX idx_guia_produto_escola_para_entrega ON public.guia_produto_escola USING btree (para_entrega);
CREATE INDEX idx_guia_produto_escola_entrega_confirmada ON public.guia_produto_escola USING btree (entrega_confirmada);
CREATE INDEX idx_guia_produto_escola_location ON public.guia_produto_escola USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));

-- Tabela: guias
CREATE TABLE IF NOT EXISTS guias (
  id integer NOT NULL DEFAULT nextval('guias_id_seq'::regclass),
  mes integer NOT NULL,
  ano integer NOT NULL,
  observacao text,
  status character varying(20) DEFAULT 'aberta'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_guias_mes_ano ON public.guias USING btree (mes, ano);
CREATE INDEX idx_guias_status ON public.guias USING btree (status);

-- Tabela: historico_saldos
CREATE TABLE IF NOT EXISTS historico_saldos (
  id integer NOT NULL DEFAULT nextval('historico_saldos_id_seq'::regclass),
  contrato_produto_id integer NOT NULL,
  saldo_anterior numeric NOT NULL,
  saldo_novo numeric NOT NULL,
  diferenca numeric,
  observacao text,
  usuario_id integer DEFAULT 1,
  data_alteracao timestamp without time zone DEFAULT now(),
  PRIMARY KEY (id)
);


-- Tabela: itens_pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
  id integer NOT NULL DEFAULT nextval('itens_pedido_id_seq'::regclass),
  pedido_id integer NOT NULL,
  contrato_item_id integer,
  produto_id integer,
  item_licitacao character varying(100) NOT NULL,
  marca character varying(100) NOT NULL,
  unidade character varying(20) NOT NULL,
  preco_unitario numeric NOT NULL,
  quantidade_total numeric NOT NULL,
  quantidade_entregue numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL,
  observacoes text,
  especificacoes text,
  permite_entrega_parcial boolean DEFAULT true,
  quantidade_minima_entrega numeric,
  status character varying(30) NOT NULL DEFAULT 'pendente'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (contrato_item_id) REFERENCES contrato_produtos(id),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE INDEX idx_itens_contrato_item_id ON public.itens_pedido USING btree (contrato_item_id);
CREATE INDEX idx_itens_pedido_id ON public.itens_pedido USING btree (pedido_id);
CREATE INDEX idx_itens_produto_id ON public.itens_pedido USING btree (produto_id);
CREATE INDEX idx_itens_status ON public.itens_pedido USING btree (status);

-- Tabela: logs_auditoria
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id integer NOT NULL DEFAULT nextval('logs_auditoria_id_seq'::regclass),
  usuario_id integer,
  acao character varying(100) NOT NULL,
  tabela character varying(100) NOT NULL,
  registro_id integer,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_auditoria_data ON public.logs_auditoria USING btree (created_at);
CREATE INDEX idx_auditoria_tabela ON public.logs_auditoria USING btree (tabela);
CREATE INDEX idx_auditoria_usuario ON public.logs_auditoria USING btree (usuario_id);

-- Tabela: modalidades
CREATE TABLE IF NOT EXISTS modalidades (
  id integer NOT NULL DEFAULT nextval('modalidades_id_seq'::regclass),
  nome character varying(255) NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  valor_repasse numeric DEFAULT 0.00,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  codigo_financeiro character varying(10),
  PRIMARY KEY (id),
  UNIQUE (nome)
);

CREATE UNIQUE INDEX modalidades_nome_key ON public.modalidades USING btree (nome);

-- Tabela: movimentacoes_consumo_contrato
CREATE TABLE IF NOT EXISTS movimentacoes_consumo_contrato (
  id integer NOT NULL DEFAULT nextval('movimentacoes_consumo_contrato_id_seq'::regclass),
  contrato_produto_id integer NOT NULL,
  quantidade numeric NOT NULL,
  tipo_movimentacao character varying(20) DEFAULT 'CONSUMO'::character varying,
  observacao text,
  usuario_id integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (contrato_produto_id) REFERENCES contrato_produtos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);


-- Tabela: movimentacoes_consumo_contratos
CREATE TABLE IF NOT EXISTS movimentacoes_consumo_contratos (
  id integer NOT NULL DEFAULT nextval('movimentacoes_consumo_contratos_id_seq'::regclass),
  contrato_produto_id integer NOT NULL,
  tipo character varying(20) NOT NULL,
  quantidade_utilizada numeric NOT NULL,
  valor_utilizado numeric,
  justificativa text NOT NULL,
  data_movimentacao date NOT NULL,
  usuario_id integer NOT NULL,
  observacoes text,
  documento_referencia text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (contrato_produto_id) REFERENCES contrato_produtos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_movimentacoes_consumo_contrato_produto ON public.movimentacoes_consumo_contratos USING btree (contrato_produto_id, data_movimentacao DESC);
CREATE INDEX idx_movimentacoes_consumo_data ON public.movimentacoes_consumo_contratos USING btree (data_movimentacao DESC);
CREATE INDEX idx_movimentacoes_consumo_usuario ON public.movimentacoes_consumo_contratos USING btree (usuario_id);

-- Tabela: movimentacoes_consumo_modalidade
CREATE TABLE IF NOT EXISTS movimentacoes_consumo_modalidade (
  id integer NOT NULL DEFAULT nextval('movimentacoes_consumo_modalidade_id_seq'::regclass),
  contrato_produto_modalidade_id integer NOT NULL,
  quantidade numeric NOT NULL,
  tipo_movimentacao character varying(20) NOT NULL DEFAULT 'CONSUMO'::character varying,
  observacao text,
  usuario_id integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (contrato_produto_modalidade_id) REFERENCES contrato_produtos_modalidades(id)
);

CREATE INDEX idx_movimentacoes_consumo_modalidade_contrato_produto_modalidad ON public.movimentacoes_consumo_modalidade USING btree (contrato_produto_modalidade_id);

-- Tabela: notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
  id integer NOT NULL DEFAULT nextval('notificacoes_id_seq'::regclass),
  usuario_id integer NOT NULL,
  titulo character varying(255) NOT NULL,
  mensagem text NOT NULL,
  tipo character varying(20) DEFAULT 'info'::character varying,
  lida boolean DEFAULT false,
  dados_contexto jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);


-- Tabela: notificacoes_sistema
CREATE TABLE IF NOT EXISTS notificacoes_sistema (
  id integer NOT NULL DEFAULT nextval('notificacoes_sistema_id_seq'::regclass),
  usuario_id integer,
  tipo character varying(20) NOT NULL,
  titulo character varying(255) NOT NULL,
  mensagem text NOT NULL,
  dados_extras jsonb DEFAULT '{}'::jsonb,
  lida boolean DEFAULT false,
  data_leitura timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_notificacoes_lida ON public.notificacoes_sistema USING btree (lida);
CREATE INDEX idx_notificacoes_tipo ON public.notificacoes_sistema USING btree (tipo);
CREATE INDEX idx_notificacoes_usuario ON public.notificacoes_sistema USING btree (usuario_id);

-- Tabela: pedido_itens
CREATE TABLE IF NOT EXISTS pedido_itens (
  id integer NOT NULL DEFAULT nextval('pedido_itens_id_seq'::regclass),
  pedido_id integer NOT NULL,
  produto_id integer NOT NULL,
  quantidade numeric NOT NULL,
  preco_unitario numeric,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  contrato_produto_id integer,
  data_entrega_prevista date,
  PRIMARY KEY (id),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE INDEX idx_pedido_itens_pedido ON public.pedido_itens USING btree (pedido_id);
CREATE INDEX idx_pedido_itens_produto ON public.pedido_itens USING btree (produto_id);

-- Tabela: pedido_itens_modalidades_config
CREATE TABLE IF NOT EXISTS pedido_itens_modalidades_config (
  id integer NOT NULL DEFAULT nextval('pedido_itens_modalidades_config_id_seq'::regclass),
  pedido_item_id integer NOT NULL,
  modalidade_id integer NOT NULL,
  percentual_configurado numeric,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (modalidade_id) REFERENCES modalidades(id),
  FOREIGN KEY (pedido_item_id) REFERENCES pedidos_itens(id),
  UNIQUE (pedido_item_id),
  UNIQUE (pedido_item_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id)
);

CREATE UNIQUE INDEX pedido_itens_modalidades_confi_pedido_item_id_modalidade_id_key ON public.pedido_itens_modalidades_config USING btree (pedido_item_id, modalidade_id);
CREATE INDEX idx_pedido_itens_modalidades_config_pedido_item ON public.pedido_itens_modalidades_config USING btree (pedido_item_id);

-- Tabela: pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id integer NOT NULL DEFAULT nextval('pedidos_id_seq'::regclass),
  usuario_id integer NOT NULL,
  escola_id integer,
  contrato_id integer,
  fornecedor_id integer,
  status character varying(50) DEFAULT 'pendente'::character varying,
  valor_total numeric DEFAULT 0,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  numero_pedido character varying(50),
  codigo_financeiro character varying(50),
  numero character varying(50),
  data_pedido date,
  usuario_criacao_id integer,
  usuario_aprovacao_id integer,
  data_aprovacao timestamp without time zone,
  PRIMARY KEY (id),
  FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (usuario_aprovacao_id) REFERENCES usuarios(id),
  FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id),
  UNIQUE (numero_pedido),
  UNIQUE (numero_pedido)
);

CREATE UNIQUE INDEX pedidos_modernos_numero_pedido_key ON public.pedidos USING btree (numero_pedido);
CREATE UNIQUE INDEX pedidos_numero_pedido_key ON public.pedidos USING btree (numero_pedido);
CREATE INDEX idx_pedidos_codigo_financeiro ON public.pedidos USING btree (codigo_financeiro);
CREATE INDEX idx_pedidos_contrato_id ON public.pedidos USING btree (contrato_id);
CREATE INDEX idx_pedidos_data ON public.pedidos USING btree (created_at);
CREATE INDEX idx_pedidos_escola ON public.pedidos USING btree (escola_id);
CREATE INDEX idx_pedidos_fornecedor_id ON public.pedidos USING btree (fornecedor_id);
CREATE INDEX idx_pedidos_numero ON public.pedidos USING btree (numero_pedido);
CREATE INDEX idx_pedidos_status ON public.pedidos USING btree (status);

-- Tabela: pedidos_faturamentos_controle
CREATE TABLE IF NOT EXISTS pedidos_faturamentos_controle (
  id integer NOT NULL DEFAULT nextval('pedidos_faturamentos_controle_id_seq'::regclass),
  pedido_id integer NOT NULL,
  fornecedor_id integer NOT NULL,
  agrupamento_faturamento_id integer,
  faturamento_id integer,
  status character varying(50) DEFAULT 'PENDENTE'::character varying,
  valor_pedido numeric DEFAULT 0,
  data_faturamento timestamp without time zone,
  data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (agrupamento_faturamento_id) REFERENCES agrupamentos_faturamentos(id),
  FOREIGN KEY (faturamento_id) REFERENCES faturamentos(id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  UNIQUE (pedido_id),
  UNIQUE (pedido_id),
  UNIQUE (fornecedor_id),
  UNIQUE (fornecedor_id)
);

CREATE UNIQUE INDEX pedidos_faturamentos_controle_pedido_id_fornecedor_id_key ON public.pedidos_faturamentos_controle USING btree (pedido_id, fornecedor_id);
CREATE INDEX idx_pedidos_faturamentos_controle_fornecedor ON public.pedidos_faturamentos_controle USING btree (fornecedor_id);
CREATE INDEX idx_pedidos_faturamentos_controle_pedido ON public.pedidos_faturamentos_controle USING btree (pedido_id);

-- Tabela: pedidos_fornecedores
CREATE TABLE IF NOT EXISTS pedidos_fornecedores (
  id integer NOT NULL DEFAULT nextval('pedidos_fornecedores_id_seq'::regclass),
  pedido_id integer NOT NULL,
  fornecedor_id integer NOT NULL,
  status character varying(50) DEFAULT 'pendente'::character varying,
  valor_subtotal numeric DEFAULT 0,
  observacoes_fornecedor text,
  data_confirmacao timestamp without time zone,
  data_envio timestamp without time zone,
  data_entrega timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
);

CREATE INDEX idx_pedidos_fornecedores_fornecedor ON public.pedidos_fornecedores USING btree (fornecedor_id);
CREATE INDEX idx_pedidos_fornecedores_pedido ON public.pedidos_fornecedores USING btree (pedido_id);
CREATE INDEX idx_pedidos_fornecedores_status ON public.pedidos_fornecedores USING btree (status);

-- Tabela: pedidos_historico
CREATE TABLE IF NOT EXISTS pedidos_historico (
  id integer NOT NULL DEFAULT nextval('pedidos_historico_id_seq'::regclass),
  pedido_id integer NOT NULL,
  status_anterior character varying(50),
  status_novo character varying(50) NOT NULL,
  observacoes text,
  data_alteracao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  alterado_por integer,
  PRIMARY KEY (id),
  FOREIGN KEY (alterado_por) REFERENCES usuarios(id),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
);

CREATE INDEX idx_pedidos_historico_data ON public.pedidos_historico USING btree (data_alteracao);
CREATE INDEX idx_pedidos_historico_pedido ON public.pedidos_historico USING btree (pedido_id);

-- Tabela: pedidos_itens
CREATE TABLE IF NOT EXISTS pedidos_itens (
  id integer NOT NULL DEFAULT nextval('pedidos_itens_id_seq'::regclass),
  pedido_fornecedor_id integer NOT NULL,
  produto_id integer NOT NULL,
  contrato_id integer,
  quantidade numeric NOT NULL,
  preco_unitario numeric NOT NULL,
  subtotal numeric NOT NULL,
  observacoes_item text,
  data_entrega_prevista date,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  FOREIGN KEY (pedido_fornecedor_id) REFERENCES pedidos_fornecedores(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE INDEX idx_pedidos_itens_contrato ON public.pedidos_itens USING btree (contrato_id);
CREATE INDEX idx_pedidos_itens_fornecedor ON public.pedidos_itens USING btree (pedido_fornecedor_id);
CREATE INDEX idx_pedidos_itens_produto ON public.pedidos_itens USING btree (produto_id);

-- Tabela: performance_monitoring
CREATE TABLE IF NOT EXISTS performance_monitoring (
  id integer NOT NULL DEFAULT nextval('performance_monitoring_id_seq'::regclass),
  modulo character varying(100) NOT NULL,
  operacao character varying(100) NOT NULL,
  tabela character varying(100),
  tempo_execucao_ms integer NOT NULL,
  registros_afetados integer DEFAULT 0,
  query_sql text,
  usuario_id integer,
  sessao_id character varying(255),
  timestamp_inicio timestamp without time zone NOT NULL,
  timestamp_fim timestamp without time zone NOT NULL,
  status character varying(20) DEFAULT 'sucesso'::character varying,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);


-- Tabela: planejamento_entregas
CREATE TABLE IF NOT EXISTS planejamento_entregas (
  id integer NOT NULL DEFAULT nextval('planejamento_entregas_id_seq'::regclass),
  guia_id integer NOT NULL,
  rota_id integer NOT NULL,
  data_planejada date,
  status character varying(20) DEFAULT 'planejado'::character varying,
  responsavel character varying(255),
  observacao text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (guia_id) REFERENCES guias(id),
  FOREIGN KEY (rota_id) REFERENCES rotas_entrega(id),
  UNIQUE (guia_id),
  UNIQUE (guia_id),
  UNIQUE (rota_id),
  UNIQUE (rota_id)
);

CREATE UNIQUE INDEX planejamento_entregas_guia_id_rota_id_key ON public.planejamento_entregas USING btree (guia_id, rota_id);
CREATE INDEX idx_planejamento_entregas_guia ON public.planejamento_entregas USING btree (guia_id);
CREATE INDEX idx_planejamento_entregas_rota ON public.planejamento_entregas USING btree (rota_id);
CREATE INDEX idx_planejamento_entregas_status ON public.planejamento_entregas USING btree (status);

-- Tabela: presets_rotas
CREATE TABLE IF NOT EXISTS presets_rotas (
  id integer NOT NULL DEFAULT nextval('presets_rotas_id_seq'::regclass),
  nome character varying(255) NOT NULL,
  descricao text,
  cor_padrao character varying(7) NOT NULL DEFAULT '#1976d2'::character varying,
  icone_padrao character varying(10) NOT NULL DEFAULT '🚌'::character varying,
  configuracao_padrao text,
  ativo boolean DEFAULT true,
  criado_por integer NOT NULL DEFAULT 1,
  data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (nome)
);

CREATE UNIQUE INDEX presets_rotas_nome_key ON public.presets_rotas USING btree (nome);
CREATE INDEX idx_presets_ativo ON public.presets_rotas USING btree (ativo);

-- Tabela: produto_composicao_nutricional
CREATE TABLE IF NOT EXISTS produto_composicao_nutricional (
  id integer NOT NULL DEFAULT nextval('produto_composicao_nutricional_id_seq'::regclass),
  produto_id integer NOT NULL,
  calorias numeric,
  proteinas numeric,
  carboidratos numeric,
  gorduras numeric,
  fibras numeric,
  sodio numeric,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  UNIQUE (produto_id)
);

CREATE UNIQUE INDEX produto_composicao_nutricional_produto_id_key ON public.produto_composicao_nutricional USING btree (produto_id);
CREATE INDEX idx_produto_composicao_produto_id ON public.produto_composicao_nutricional USING btree (produto_id);

-- Tabela: produto_modalidades
CREATE TABLE IF NOT EXISTS produto_modalidades (
  id integer NOT NULL DEFAULT nextval('produto_modalidades_id_seq'::regclass),
  produto_id integer NOT NULL,
  modalidade_id integer NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (produto_id),
  UNIQUE (produto_id),
  UNIQUE (modalidade_id),
  UNIQUE (modalidade_id)
);

CREATE UNIQUE INDEX produto_modalidades_produto_id_modalidade_id_key ON public.produto_modalidades USING btree (produto_id, modalidade_id);
CREATE INDEX idx_produto_modalidades_modalidade ON public.produto_modalidades USING btree (modalidade_id);
CREATE INDEX idx_produto_modalidades_produto ON public.produto_modalidades USING btree (produto_id);

-- Tabela: produtos
CREATE TABLE IF NOT EXISTS produtos (
  id integer NOT NULL DEFAULT nextval('produtos_id_seq'::regclass),
  nome character varying(255) NOT NULL,
  descricao text,
  unidade character varying(50) NOT NULL DEFAULT 'kg'::character varying,
  fator_divisao numeric DEFAULT 1.0000,
  tipo_processamento character varying(100),
  categoria character varying(100),
  marca character varying(100),
  peso numeric,
  validade_minima integer,
  imagem_url text,
  perecivel boolean DEFAULT false,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (nome)
);

CREATE UNIQUE INDEX produtos_nome_unique ON public.produtos USING btree (nome);
CREATE INDEX idx_produtos_ativo ON public.produtos USING btree (ativo);
CREATE INDEX idx_produtos_categoria ON public.produtos USING btree (categoria);
CREATE INDEX idx_produtos_nome ON public.produtos USING btree (nome);

-- Tabela: programacoes_entrega
CREATE TABLE IF NOT EXISTS programacoes_entrega (
  id integer NOT NULL DEFAULT nextval('programacoes_entrega_id_seq'::regclass),
  item_pedido_id integer NOT NULL,
  numero_entrega integer NOT NULL,
  data_programada date NOT NULL,
  data_confirmada date,
  data_realizada date,
  quantidade_programada numeric NOT NULL,
  quantidade_entregue numeric DEFAULT 0,
  status character varying(30) NOT NULL DEFAULT 'pendente'::character varying,
  nota_fiscal character varying(50),
  transportadora character varying(100),
  numero_rastreamento character varying(100),
  motorista character varying(100),
  placa_veiculo character varying(20),
  recebido_por character varying(100),
  data_recebimento timestamp without time zone,
  observacoes_recebimento text,
  conforme_especificacoes boolean,
  qualidade_aprovada boolean,
  observacoes_qualidade text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (item_pedido_id) REFERENCES itens_pedido(id)
);

CREATE INDEX idx_prog_entrega_data_prog ON public.programacoes_entrega USING btree (data_programada);
CREATE INDEX idx_prog_entrega_data_real ON public.programacoes_entrega USING btree (data_realizada);
CREATE INDEX idx_prog_entrega_item_id ON public.programacoes_entrega USING btree (item_pedido_id);
CREATE UNIQUE INDEX idx_prog_entrega_item_numero ON public.programacoes_entrega USING btree (item_pedido_id, numero_entrega);
CREATE INDEX idx_prog_entrega_status ON public.programacoes_entrega USING btree (status);

-- Tabela: recebimento_itens_controle
CREATE TABLE IF NOT EXISTS recebimento_itens_controle (
  id integer NOT NULL DEFAULT nextval('recebimento_itens_controle_id_seq'::regclass),
  pedido_item_id integer NOT NULL,
  produto_id integer NOT NULL,
  fornecedor_id integer NOT NULL,
  quantidade_esperada numeric NOT NULL,
  quantidade_recebida numeric DEFAULT 0,
  data_ultimo_recebimento timestamp without time zone,
  usuario_ultimo_recebimento integer NOT NULL,
  observacoes character varying(255),
  status character varying(255) DEFAULT 'PENDENTE'::character varying,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  PRIMARY KEY (id)
);


-- Tabela: recebimentos_simples
CREATE TABLE IF NOT EXISTS recebimentos_simples (
  id integer NOT NULL DEFAULT nextval('recebimentos_simples_id_seq'::regclass),
  pedido_item_id integer NOT NULL,
  quantidade_recebida numeric NOT NULL,
  numero_lote character varying(100),
  data_validade date,
  observacoes text,
  usuario_id integer DEFAULT 1,
  data_recebimento timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);


-- Tabela: refeicao_produtos
CREATE TABLE IF NOT EXISTS refeicao_produtos (
  id integer NOT NULL DEFAULT nextval('refeicao_produtos_id_seq'::regclass),
  refeicao_id integer NOT NULL,
  produto_id integer NOT NULL,
  per_capita numeric NOT NULL DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  tipo_medida character varying(20) DEFAULT 'gramas'::character varying,
  observacoes text,
  PRIMARY KEY (id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (refeicao_id) REFERENCES refeicoes(id),
  UNIQUE (refeicao_id),
  UNIQUE (refeicao_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id)
);

CREATE UNIQUE INDEX uk_refeicao_produto ON public.refeicao_produtos USING btree (refeicao_id, produto_id);
CREATE INDEX idx_refeicao_produtos_produto_id ON public.refeicao_produtos USING btree (produto_id);
CREATE INDEX idx_refeicao_produtos_refeicao_id ON public.refeicao_produtos USING btree (refeicao_id);
CREATE INDEX idx_refeicao_produtos_tipo_medida ON public.refeicao_produtos USING btree (tipo_medida);

-- Tabela: refeicoes
CREATE TABLE IF NOT EXISTS refeicoes (
  id integer NOT NULL DEFAULT nextval('refeicoes_id_seq'::regclass),
  nome character varying(255) NOT NULL,
  descricao text,
  tipo character varying(100),
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  horario_inicio time without time zone,
  horario_fim time without time zone,
  ativa boolean DEFAULT true,
  PRIMARY KEY (id)
);

CREATE INDEX idx_refeicoes_ativo ON public.refeicoes USING btree (ativo);
CREATE INDEX idx_refeicoes_nome ON public.refeicoes USING btree (nome);
CREATE INDEX idx_refeicoes_tipo ON public.refeicoes USING btree (tipo);

-- Tabela: refeicoes_ingredientes
CREATE TABLE IF NOT EXISTS refeicoes_ingredientes (
  id integer NOT NULL DEFAULT nextval('refeicoes_ingredientes_id_seq'::regclass),
  refeicao_id integer NOT NULL,
  produto_id integer NOT NULL,
  quantidade_por_porcao numeric NOT NULL,
  unidade_medida character varying(20) DEFAULT 'g'::character varying,
  observacoes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (refeicao_id) REFERENCES refeicoes(id),
  UNIQUE (refeicao_id),
  UNIQUE (refeicao_id),
  UNIQUE (produto_id),
  UNIQUE (produto_id)
);

CREATE UNIQUE INDEX refeicoes_ingredientes_refeicao_id_produto_id_key ON public.refeicoes_ingredientes USING btree (refeicao_id, produto_id);

-- Tabela: rota_escolas
CREATE TABLE IF NOT EXISTS rota_escolas (
  id integer NOT NULL DEFAULT nextval('rota_escolas_id_seq'::regclass),
  rota_id integer NOT NULL,
  escola_id integer NOT NULL,
  ordem integer DEFAULT 1,
  observacao text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (rota_id) REFERENCES rotas_entrega(id),
  FOREIGN KEY (escola_id) REFERENCES escolas(id),
  UNIQUE (rota_id),
  UNIQUE (rota_id),
  UNIQUE (escola_id),
  UNIQUE (escola_id)
);

CREATE UNIQUE INDEX rota_escolas_rota_id_escola_id_key ON public.rota_escolas USING btree (rota_id, escola_id);
CREATE INDEX idx_rota_escolas_rota ON public.rota_escolas USING btree (rota_id);
CREATE INDEX idx_rota_escolas_escola ON public.rota_escolas USING btree (escola_id);

-- Tabela: rotas
CREATE TABLE IF NOT EXISTS rotas (
  id integer NOT NULL DEFAULT nextval('rotas_id_seq'::regclass),
  nome character varying(255) NOT NULL,
  descricao text,
  cor character varying(7) NOT NULL DEFAULT '#1976d2'::character varying,
  cor_secundaria character varying(7),
  icone character varying(10) NOT NULL DEFAULT '🚌'::character varying,
  ativa boolean DEFAULT true,
  tipo character varying(20) NOT NULL DEFAULT 'personalizada'::character varying,
  preset_id integer,
  configuracao text,
  criado_por integer NOT NULL DEFAULT 1,
  data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (preset_id) REFERENCES presets_rotas(id)
);

CREATE INDEX idx_rotas_ativa ON public.rotas USING btree (ativa);
CREATE INDEX idx_rotas_preset ON public.rotas USING btree (preset_id);
CREATE INDEX idx_rotas_tipo ON public.rotas USING btree (tipo);

-- Tabela: rotas_entrega
CREATE TABLE IF NOT EXISTS rotas_entrega (
  id integer NOT NULL DEFAULT nextval('rotas_entrega_id_seq'::regclass),
  nome character varying(255) NOT NULL,
  descricao text,
  cor character varying(7) DEFAULT '#1976d2'::character varying,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);


-- Tabela: schema_migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  id integer NOT NULL DEFAULT nextval('schema_migrations_id_seq'::regclass),
  migration_name character varying(255) NOT NULL,
  executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (migration_name)
);

CREATE UNIQUE INDEX schema_migrations_migration_name_key ON public.schema_migrations USING btree (migration_name);

-- Tabela: sistema_configuracao_robusta
CREATE TABLE IF NOT EXISTS sistema_configuracao_robusta (
  id integer NOT NULL DEFAULT nextval('sistema_configuracao_robusta_id_seq'::regclass),
  modulo character varying(100) NOT NULL,
  chave character varying(100) NOT NULL,
  valor text,
  data_atualizacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  atualizado_por integer,
  PRIMARY KEY (id),
  FOREIGN KEY (atualizado_por) REFERENCES usuarios(id),
  UNIQUE (modulo),
  UNIQUE (modulo),
  UNIQUE (chave),
  UNIQUE (chave)
);

CREATE UNIQUE INDEX sistema_configuracao_robusta_modulo_chave_key ON public.sistema_configuracao_robusta USING btree (modulo, chave);

-- Tabela: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id integer NOT NULL DEFAULT nextval('usuarios_id_seq'::regclass),
  nome character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  senha character varying(255) NOT NULL,
  tipo character varying(50) DEFAULT 'USUARIO'::character varying,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  perfil character varying(50) DEFAULT 'usuario'::character varying,
  ultimo_login timestamp without time zone,
  PRIMARY KEY (id),
  UNIQUE (email)
);

CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email);
CREATE INDEX idx_usuarios_ativo ON public.usuarios USING btree (ativo);
CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);

-- Dados da tabela: modalidades
INSERT INTO modalidades (id, nome, descricao, ativo, valor_repasse, created_at, updated_at, codigo_financeiro) VALUES (1, 'CRECHE', NULL, true, '34592.50', '2025-08-14T02:35:17.399Z', '2025-10-06T03:51:17.146Z', '2.035') ON CONFLICT DO NOTHING;
INSERT INTO modalidades (id, nome, descricao, ativo, valor_repasse, created_at, updated_at, codigo_financeiro) VALUES (2, 'PRÉ ESCOLA', NULL, true, '34860.75', '2025-08-14T02:35:17.404Z', '2025-10-06T03:51:47.486Z', '2.039') ON CONFLICT DO NOTHING;
INSERT INTO modalidades (id, nome, descricao, ativo, valor_repasse, created_at, updated_at, codigo_financeiro) VALUES (3, 'ENS. FUNDAMENTAL', NULL, true, '138463.00', '2025-08-14T02:35:17.407Z', '2025-10-06T03:52:15.151Z', '2.037') ON CONFLICT DO NOTHING;
INSERT INTO modalidades (id, nome, descricao, ativo, valor_repasse, created_at, updated_at, codigo_financeiro) VALUES (4, 'ENS. MÉDIO', NULL, true, '34726.50', '2025-08-14T02:35:17.410Z', '2025-10-06T03:52:43.694Z', '2.038') ON CONFLICT DO NOTHING;
INSERT INTO modalidades (id, nome, descricao, ativo, valor_repasse, created_at, updated_at, codigo_financeiro) VALUES (5, 'EJA', NULL, true, '6498.50', '2025-08-14T02:35:17.415Z', '2025-10-06T03:53:40.985Z', '2.036') ON CONFLICT DO NOTHING;
INSERT INTO modalidades (id, nome, descricao, ativo, valor_repasse, created_at, updated_at, codigo_financeiro) VALUES (6, 'AEE', NULL, true, '2432.00', '2025-08-14T02:35:17.417Z', '2025-10-06T03:53:19.043Z', '2.034') ON CONFLICT DO NOTHING;
INSERT INTO modalidades (id, nome, descricao, ativo, valor_repasse, created_at, updated_at, codigo_financeiro) VALUES (7, 'QSE', NULL, true, '0.00', '2025-10-08T17:50:02.667Z', '2025-10-08T17:50:02.667Z', '2.097') ON CONFLICT DO NOTHING;
INSERT INTO modalidades (id, nome, descricao, ativo, valor_repasse, created_at, updated_at, codigo_financeiro) VALUES (8, 'ENS MÉDIO ESTADO', NULL, true, '0.00', '2025-10-08T20:32:39.141Z', '2025-10-08T20:32:39.141Z', '2.026') ON CONFLICT DO NOTHING;
INSERT INTO modalidades (id, nome, descricao, ativo, valor_repasse, created_at, updated_at, codigo_financeiro) VALUES (9, 'INTEGRAL', NULL, true, '0.00', '2025-10-08T20:34:32.768Z', '2025-10-16T23:04:59.612Z', '0') ON CONFLICT DO NOTHING;

-- Dados da tabela: usuarios
INSERT INTO usuarios (id, nome, email, senha, tipo, ativo, created_at, updated_at, perfil, ultimo_login) VALUES (1, 'Administrador', 'admin@sistema.com', '$2b$10$rQZ8kHWKtGkVQZ8kHWKtGOuKQZ8kHWKtGkVQZ8kHWKtGkVQZ8kHWKt', 'ADMIN', true, '2025-08-14T02:49:41.366Z', '2025-08-14T02:49:41.366Z', 'usuario', NULL) ON CONFLICT DO NOTHING;
INSERT INTO usuarios (id, nome, email, senha, tipo, ativo, created_at, updated_at, perfil, ultimo_login) VALUES (2, 'Ewerton Nunes', 'ewenunes0@gmail.com', '$2a$10$KKR/RixGLaGjiRLyYj75t.rbOy1k9WzCP.p//ASdnW0WezRRS95Mm', 'gestor', true, '2025-08-16T04:35:55.346Z', '2025-08-16T04:35:55.346Z', 'usuario', NULL) ON CONFLICT DO NOTHING;
INSERT INTO usuarios (id, nome, email, senha, tipo, ativo, created_at, updated_at, perfil, ultimo_login) VALUES (3, 'Leonardo Oliveira', 'leonardo@semed.com', '$2b$10$.93kmnKrMdnFtCdOK3T.sOkWxd8HOIRenl3kXyj5OLi2DMNjbIz3O', 'admin', true, '2025-10-10T22:18:48.224Z', '2025-10-10T22:20:49.577Z', 'usuario', NULL) ON CONFLICT DO NOTHING;

-- Dados da tabela: fornecedores
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (35, 'Ramos Comercio LTDA', '55.999.499/0001-84', NULL, NULL, NULL, true, '2025-10-06T19:20:03.997Z', '2025-10-06T19:20:03.997Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (36, 'AHCOR Comercio de Produtos Odontológicos LTDA', '37.556.213/0001-04', NULL, NULL, NULL, true, '2025-10-08T16:19:06.498Z', '2025-10-08T16:19:06.498Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (37, 'Distribuidora Mesquita LTDA', '55.346.592/0001-90', NULL, NULL, NULL, true, '2025-10-08T16:38:52.809Z', '2025-10-08T16:38:52.809Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (38, 'ANTONIO RAFAEL NASCIMENTO DA SILVA', '009.174.112-26', NULL, NULL, NULL, true, '2025-10-09T14:28:56.992Z', '2025-10-09T14:29:51.587Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (39, 'ANTONIO RIBEIRO DA SILVA', '697.763.002-78', NULL, NULL, NULL, true, '2025-10-09T14:29:38.286Z', '2025-10-09T14:29:38.286Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (40, 'ANTONIO SAMUEL TAVARES BARBOSA', '694.734.202-34', NULL, NULL, NULL, true, '2025-10-09T14:30:04.027Z', '2025-10-09T14:30:04.027Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (41, 'CARLOS ROBERTO GOMES PEREIRA', '834.933.102-00', NULL, NULL, NULL, true, '2025-10-09T14:30:32.416Z', '2025-10-09T14:30:32.416Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (42, 'DENIVALDO ROSA GUIMARÃES FARIAS', '576.740.862-91', NULL, NULL, NULL, true, '2025-10-09T14:30:41.826Z', '2025-10-09T14:30:41.826Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (43, 'GUILHERME LIMA MONTEIRO', '704.563.222-30', NULL, NULL, NULL, true, '2025-10-09T14:30:58.169Z', '2025-10-09T14:30:58.169Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (44, 'JORGE ELSO ESPIRITO SANTO CUNHA', '616.380.722-72', NULL, NULL, NULL, true, '2025-10-09T14:31:22.555Z', '2025-10-09T14:31:22.555Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (45, 'JORGE MARCELO PEREIRA BATISTA', '375.072.572-15', NULL, NULL, NULL, true, '2025-10-09T14:31:38.250Z', '2025-10-09T14:31:38.250Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (46, 'LAERCIO GOMES BARBOSA', '060.127.442-34', NULL, NULL, NULL, true, '2025-10-09T14:31:52.954Z', '2025-10-09T14:31:52.954Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (47, 'MARIA ESTELA ALVES PINHEIRO', '600.434.563-67', NULL, NULL, NULL, true, '2025-10-09T14:32:06.359Z', '2025-10-09T14:32:06.359Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (48, 'PEDRO PAULO GUIMARÃES PINHEIRO', '396.826.412-68', NULL, NULL, NULL, true, '2025-10-09T14:32:19.220Z', '2025-10-09T14:32:19.220Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (49, 'REINALDO DA CUNHA LIMA', '783.307.262-15', NULL, NULL, NULL, true, '2025-10-09T14:32:33.659Z', '2025-10-09T14:32:33.659Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (50, 'SORAYA LIMA MONTEIRO', '006.892.082-27', NULL, NULL, NULL, true, '2025-10-09T14:32:52.279Z', '2025-10-09T14:32:52.279Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (51, 'EUCLIDES DA SILVA ALVES', '463.536.903-04', NULL, NULL, NULL, true, '2025-10-09T14:33:11.647Z', '2025-10-09T14:33:11.647Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (52, 'COOPERATIVA AGROPECUÁRIA DE BENEVIDES - COOPABEN', '10.249.079/0001-42', NULL, NULL, NULL, true, '2025-10-09T14:33:34.134Z', '2025-10-09T14:33:34.134Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (53, 'COOPERATIVA AGROINDUSTRIAL FAMILIAR DE BENEVIDES E REGIÃO - COOPAFABEN', '19.249.458/0001-07', NULL, NULL, NULL, true, '2025-10-09T14:33:52.252Z', '2025-10-09T14:33:52.252Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO fornecedores (id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at, cidade, estado, cep, contato_responsavel) VALUES (54, 'COOPERATIVA AGROPECUÁRIA DO SALGADO PARAENSE - CASP', '11.885.783/0001-54', NULL, NULL, NULL, true, '2025-10-09T14:34:08.933Z', '2025-10-09T14:34:08.933Z', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;

