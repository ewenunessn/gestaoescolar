export const CONFIG_ALOCACAO_AGRICULTURA_CHAVE = "faturamento_alocacao_agricultura";

export type TipoFornecedorAgricultura = "empresa" | "cooperativa" | "individual" | string;

export interface ConfiguracaoAlocacaoAgricultura {
  ativo: boolean;
  percentual_agricultura: number;
  modalidade_base_ids: number[];
  fornecedor_tipos_agricultura: TipoFornecedorAgricultura[];
  distribuir_excedente: boolean;
}

export interface ModalidadeAlocacao {
  id: number;
  nome: string;
  valor_repasse: number;
}

export interface PedidoItemAlocavel {
  pedido_item_id: number;
  contrato_produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_pedido: number;
  quantidade_disponivel: number;
  preco_unitario: number;
  tipo_fornecedor?: string | null;
}

export interface ItemAlocacaoCalculado {
  pedido_item_ids: number[];
  contrato_produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_pedido: number;
  quantidade_disponivel: number;
  preco_unitario: number;
  tipo_fornecedor: string;
  modalidade_id: number;
  modalidade_nome: string;
  quantidade_alocada: number;
  valor_alocado: number;
  origem_regra: "agricultura_reservada" | "excedente_proporcional" | "proporcional";
}

export interface ResultadoAlocacaoAutomatica {
  regra: ConfiguracaoAlocacaoAgricultura;
  modalidades_base: ModalidadeAlocacao[];
  itens: ItemAlocacaoCalculado[];
  resumo: {
    quantidade_total_disponivel: number;
    quantidade_total_alocada: number;
    quantidade_nao_alocada: number;
    valor_total_alocado: number;
    valor_total_repasses: number;
    valor_meta_agricultura: number;
    valor_capacidade_agricultura: number;
    valor_reservado_agricultura: number;
    percentual_reservado_agricultura: number;
    valor_faltante_reserva: number;
    valor_total_itens: number;
    valor_itens_agricultura: number;
    valor_meta_itens_agricultura: number;
    percentual_itens_agricultura: number;
    valor_faltante_itens_agricultura: number;
    meta_itens_agricultura_atingida: boolean;
  };
}

export const DEFAULT_CONFIG_ALOCACAO_AGRICULTURA: ConfiguracaoAlocacaoAgricultura = {
  ativo: true,
  percentual_agricultura: 45,
  modalidade_base_ids: [],
  fornecedor_tipos_agricultura: ["cooperativa", "individual"],
  distribuir_excedente: true,
};

function getDb() {
  return require("../../../database").default || require("../../../database");
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizarPercentual(value: unknown): number {
  const percentual = toNumber(value, DEFAULT_CONFIG_ALOCACAO_AGRICULTURA.percentual_agricultura);
  return Math.min(Math.max(percentual, 0), 100);
}

export function normalizarConfigAlocacaoAgricultura(valor: unknown): ConfiguracaoAlocacaoAgricultura {
  if (!valor || typeof valor !== "object") return DEFAULT_CONFIG_ALOCACAO_AGRICULTURA;

  const parsed = valor as Partial<ConfiguracaoAlocacaoAgricultura> & { modalidade_base_id?: number | null };
  const tipos = Array.isArray(parsed.fornecedor_tipos_agricultura)
    ? parsed.fornecedor_tipos_agricultura
        .map((tipo) => String(tipo || "").trim())
        .filter(Boolean)
    : DEFAULT_CONFIG_ALOCACAO_AGRICULTURA.fornecedor_tipos_agricultura;

  const baseIds = Array.isArray(parsed.modalidade_base_ids)
    ? parsed.modalidade_base_ids.map(Number).filter((id) => Number.isFinite(id) && id > 0)
    : parsed.modalidade_base_id
      ? [Number(parsed.modalidade_base_id)]
      : [];

  return {
    ativo: parsed.ativo !== false,
    percentual_agricultura: normalizarPercentual(parsed.percentual_agricultura),
    modalidade_base_ids: baseIds,
    fornecedor_tipos_agricultura: tipos.length > 0 ? tipos : DEFAULT_CONFIG_ALOCACAO_AGRICULTURA.fornecedor_tipos_agricultura,
    distribuir_excedente: parsed.distribuir_excedente !== false,
  };
}

interface GrupoItemAlocacao {
  pedido_item_ids: number[];
  contrato_produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_pedido: number;
  quantidade_disponivel: number;
  preco_unitario: number;
  tipo_fornecedor: string;
}

function agruparItens(itens: PedidoItemAlocavel[]): GrupoItemAlocacao[] {
  const grupos = new Map<number, GrupoItemAlocacao>();

  for (const item of itens) {
    const contratoProdutoId = Number(item.contrato_produto_id);
    if (!grupos.has(contratoProdutoId)) {
      grupos.set(contratoProdutoId, {
        pedido_item_ids: [],
        contrato_produto_id: contratoProdutoId,
        produto_nome: item.produto_nome || "",
        unidade: item.unidade || "UN",
        quantidade_pedido: 0,
        quantidade_disponivel: 0,
        preco_unitario: toNumber(item.preco_unitario),
        tipo_fornecedor: item.tipo_fornecedor || "empresa",
      });
    }

    const grupo = grupos.get(contratoProdutoId)!;
    grupo.pedido_item_ids.push(Number(item.pedido_item_id));
    grupo.quantidade_pedido += toNumber(item.quantidade_pedido);
    grupo.quantidade_disponivel += Math.max(toNumber(item.quantidade_disponivel), 0);
  }

  return Array.from(grupos.values());
}

function calcularPesosProporcionais(modalidades: ModalidadeAlocacao[]): number[] {
  const somaRepasses = modalidades.reduce((sum, modalidade) => sum + Math.max(toNumber(modalidade.valor_repasse), 0), 0);
  if (somaRepasses <= 0) {
    throw new Error("A soma dos repasses das modalidades selecionadas deve ser maior que zero");
  }

  return modalidades.map((modalidade) => Math.max(toNumber(modalidade.valor_repasse), 0) / somaRepasses);
}

function calcularPesosAgricultura(
  modalidades: ModalidadeAlocacao[],
  modalidadesBase: ModalidadeAlocacao[],
  config: ConfiguracaoAlocacaoAgricultura,
): { pesos: number[]; totalRepasses: number; metaAgricultura: number; capacidadeAgricultura: number; reservadoAgricultura: number } {
  const totalRepasses = modalidades.reduce((sum, modalidade) => sum + Math.max(toNumber(modalidade.valor_repasse), 0), 0);
  if (!config.ativo) {
    return {
      pesos: modalidades.map(() => 0),
      totalRepasses,
      metaAgricultura: 0,
      capacidadeAgricultura: 0,
      reservadoAgricultura: 0,
    };
  }

  const idsBase = new Set(modalidadesBase.map((modalidade) => Number(modalidade.id)));
  const modalidadesElegiveis = modalidades.filter((modalidade) => idsBase.has(Number(modalidade.id)));
  const repasseBase = modalidadesElegiveis.reduce(
    (sum, modalidade) => sum + Math.max(toNumber(modalidade.valor_repasse), 0),
    0,
  );
  if (repasseBase <= 0) {
    throw new Error("Configure ao menos uma modalidade base com repasse FNDE valido para usar a reserva da agricultura");
  }

  const metaAgricultura = round2(totalRepasses * (config.percentual_agricultura / 100));
  const reservadoAgricultura = Math.min(metaAgricultura, repasseBase);
  const pesos = modalidades.map((modalidade) => {
    if (!idsBase.has(Number(modalidade.id)) || reservadoAgricultura <= 0) return 0;
    const reservadoModalidade = reservadoAgricultura * (Math.max(toNumber(modalidade.valor_repasse), 0) / repasseBase);
    return Math.max(reservadoModalidade / reservadoAgricultura, 0);
  });

  return {
    pesos,
    totalRepasses,
    metaAgricultura,
    capacidadeAgricultura: repasseBase,
    reservadoAgricultura: round2(reservadoAgricultura),
  };
}

function calcularPesosConvencionais(
  modalidades: ModalidadeAlocacao[],
  modalidadesBase: ModalidadeAlocacao[],
  reservadoAgricultura: number,
): number[] {
  const idsBase = new Set(modalidadesBase.map((modalidade) => Number(modalidade.id)));
  const capacidadeBase = modalidades
    .filter((modalidade) => idsBase.has(Number(modalidade.id)))
    .reduce((sum, modalidade) => sum + Math.max(toNumber(modalidade.valor_repasse), 0), 0);

  const valoresConvencionais = modalidades.map((modalidade) => {
    const repasse = Math.max(toNumber(modalidade.valor_repasse), 0);
    if (!idsBase.has(Number(modalidade.id)) || capacidadeBase <= 0 || reservadoAgricultura <= 0) return repasse;
    const reservadoModalidade = reservadoAgricultura * (repasse / capacidadeBase);
    return Math.max(repasse - reservadoModalidade, 0);
  });

  const soma = valoresConvencionais.reduce((sum, valor) => sum + valor, 0);
  if (soma <= 0) return calcularPesosProporcionais(modalidades);
  return valoresConvencionais.map((valor) => valor / soma);
}

function distribuirQuantidade(total: number, pesos: number[]): number[] {
  const totalArredondado = round2(total);
  const somaPesos = pesos.reduce((sum, peso) => sum + Math.max(peso, 0), 0);
  if (totalArredondado <= 0 || somaPesos <= 0) return pesos.map(() => 0);

  const normalizados = pesos.map((peso) => Math.max(peso, 0) / somaPesos);
  let restante = totalArredondado;

  return normalizados.map((peso, index) => {
    if (index === normalizados.length - 1) return round2(restante);
    const quantidade = round2(totalArredondado * peso);
    restante = round2(restante - quantidade);
    return quantidade;
  });
}

function criarItemCalculado(
  grupo: GrupoItemAlocacao,
  modalidade: ModalidadeAlocacao,
  quantidade: number,
  origem: ItemAlocacaoCalculado["origem_regra"],
): ItemAlocacaoCalculado | null {
  const quantidadeArredondada = round2(quantidade);
  if (quantidadeArredondada <= 0) return null;

  return {
    pedido_item_ids: grupo.pedido_item_ids,
    contrato_produto_id: grupo.contrato_produto_id,
    produto_nome: grupo.produto_nome,
    unidade: grupo.unidade,
    quantidade_pedido: round2(grupo.quantidade_pedido),
    quantidade_disponivel: round2(grupo.quantidade_disponivel),
    preco_unitario: round2(grupo.preco_unitario),
    tipo_fornecedor: grupo.tipo_fornecedor,
    modalidade_id: modalidade.id,
    modalidade_nome: modalidade.nome,
    quantidade_alocada: quantidadeArredondada,
    valor_alocado: round2(quantidadeArredondada * grupo.preco_unitario),
    origem_regra: origem,
  };
}

function combinarItens(itens: ItemAlocacaoCalculado[]): ItemAlocacaoCalculado[] {
  const combinados = new Map<string, ItemAlocacaoCalculado>();

  for (const item of itens) {
    const chave = `${item.contrato_produto_id}:${item.modalidade_id}`;
    const existente = combinados.get(chave);
    if (!existente) {
      combinados.set(chave, { ...item });
      continue;
    }

    existente.quantidade_alocada = round2(existente.quantidade_alocada + item.quantidade_alocada);
    existente.valor_alocado = round2(existente.quantidade_alocada * existente.preco_unitario);
    existente.origem_regra =
      existente.origem_regra === item.origem_regra ? existente.origem_regra : "excedente_proporcional";
  }

  return Array.from(combinados.values());
}

export function calcularAlocacaoAutomatica(input: {
  config: ConfiguracaoAlocacaoAgricultura;
  modalidadesBase: ModalidadeAlocacao[];
  modalidades: ModalidadeAlocacao[];
  itens: PedidoItemAlocavel[];
}): ResultadoAlocacaoAutomatica {
  const config = normalizarConfigAlocacaoAgricultura(input.config);
  const modalidades = input.modalidades.map((modalidade) => ({
    ...modalidade,
    valor_repasse: toNumber(modalidade.valor_repasse),
  }));

  if (modalidades.length === 0) {
    throw new Error("Selecione pelo menos uma modalidade para alocacao automatica");
  }

  const agricultura = calcularPesosAgricultura(modalidades, input.modalidadesBase || [], config);
  const pesosProporcionais = calcularPesosConvencionais(modalidades, input.modalidadesBase || [], agricultura.reservadoAgricultura);
  const pesosAgricultura = agricultura.pesos;
  const tiposAgricultura = new Set(config.fornecedor_tipos_agricultura.map((tipo) => tipo.toLowerCase()));
  const itensCalculados: ItemAlocacaoCalculado[] = [];
  const grupos = agruparItens(input.itens);
  const valorTotalItens = round2(grupos.reduce((sum, item) => sum + (item.quantidade_disponivel * item.preco_unitario), 0));
  const valorItensAgricultura = round2(grupos.reduce((sum, item) => {
    return tiposAgricultura.has(item.tipo_fornecedor.toLowerCase())
      ? sum + (item.quantidade_disponivel * item.preco_unitario)
      : sum;
  }, 0));
  const valorMetaItensAgricultura = round2(valorTotalItens * (config.percentual_agricultura / 100));

  for (const grupo of grupos) {
    if (grupo.quantidade_disponivel <= 0) continue;

    const fornecedorAgricultura = tiposAgricultura.has(grupo.tipo_fornecedor.toLowerCase());
    if (!fornecedorAgricultura || !config.ativo) {
      const distribuido = distribuirQuantidade(grupo.quantidade_disponivel, pesosProporcionais);
      distribuido.forEach((quantidade, index) => {
        const item = criarItemCalculado(grupo, modalidades[index], quantidade, "proporcional");
        if (item) itensCalculados.push(item);
      });
      continue;
    }

    const somaPesosAgricultura = Math.min(pesosAgricultura.reduce((sum, peso) => sum + peso, 0), 1);
    const quantidadeReservada = config.distribuir_excedente
      ? grupo.quantidade_disponivel
      : round2(grupo.quantidade_disponivel * somaPesosAgricultura);
    const reservado = distribuirQuantidade(quantidadeReservada, pesosAgricultura);
    reservado.forEach((quantidade, index) => {
      const item = criarItemCalculado(grupo, modalidades[index], quantidade, "agricultura_reservada");
      if (item) itensCalculados.push(item);
    });

    const excedente = round2(grupo.quantidade_disponivel - quantidadeReservada);
    if (config.distribuir_excedente && excedente > 0) {
      const distribuido = distribuirQuantidade(excedente, pesosProporcionais);
      distribuido.forEach((quantidade, index) => {
        const item = criarItemCalculado(grupo, modalidades[index], quantidade, "excedente_proporcional");
        if (item) itensCalculados.push(item);
      });
    }
  }

  const itens = combinarItens(itensCalculados);
  const quantidadeTotalDisponivel = round2(grupos.reduce((sum, item) => sum + item.quantidade_disponivel, 0));
  const quantidadeTotalAlocada = round2(itens.reduce((sum, item) => sum + item.quantidade_alocada, 0));
  const valorFaltanteItensAgricultura = round2(Math.max(valorMetaItensAgricultura - valorItensAgricultura, 0));
  const percentualItensAgricultura = valorTotalItens > 0 ? round2((valorItensAgricultura / valorTotalItens) * 100) : 0;

  return {
    regra: config,
    modalidades_base: input.modalidadesBase || [],
    itens,
    resumo: {
      quantidade_total_disponivel: quantidadeTotalDisponivel,
      quantidade_total_alocada: quantidadeTotalAlocada,
      quantidade_nao_alocada: round2(quantidadeTotalDisponivel - quantidadeTotalAlocada),
      valor_total_alocado: round2(itens.reduce((sum, item) => sum + item.valor_alocado, 0)),
      valor_total_repasses: round2(agricultura.totalRepasses),
      valor_meta_agricultura: agricultura.metaAgricultura,
      valor_capacidade_agricultura: round2(agricultura.capacidadeAgricultura),
      valor_reservado_agricultura: agricultura.reservadoAgricultura,
      percentual_reservado_agricultura: agricultura.totalRepasses > 0
        ? round2((agricultura.reservadoAgricultura / agricultura.totalRepasses) * 100)
        : 0,
      valor_faltante_reserva: round2(Math.max(agricultura.metaAgricultura - agricultura.reservadoAgricultura, 0)),
      valor_total_itens: valorTotalItens,
      valor_itens_agricultura: valorItensAgricultura,
      valor_meta_itens_agricultura: valorMetaItensAgricultura,
      percentual_itens_agricultura: percentualItensAgricultura,
      valor_faltante_itens_agricultura: valorFaltanteItensAgricultura,
      meta_itens_agricultura_atingida: valorFaltanteItensAgricultura <= 0,
    },
  };
}

export async function ensureAlocacaoAgriculturaSchema(client?: any): Promise<void> {
  const executor = client || getDb();
  await executor.query(`
    CREATE TABLE IF NOT EXISTS configuracoes_sistema (
      id SERIAL PRIMARY KEY,
      chave VARCHAR(255) UNIQUE NOT NULL,
      valor TEXT,
      descricao TEXT,
      tipo VARCHAR(50) DEFAULT 'string',
      categoria VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await executor.query(`
    ALTER TABLE faturamentos_pedidos
      ADD COLUMN IF NOT EXISTS alocacao_agricultura_snapshot JSONB
  `);

  await executor.query(`
    INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria)
    VALUES ($1, $2, 'Configuracao da reserva de agricultura familiar no faturamento', 'json', 'faturamento')
    ON CONFLICT (chave) DO NOTHING
  `, [CONFIG_ALOCACAO_AGRICULTURA_CHAVE, JSON.stringify(DEFAULT_CONFIG_ALOCACAO_AGRICULTURA)]);

  await executor.query(`
    UPDATE configuracoes_sistema
    SET valor = (
      SELECT jsonb_set(
        valor::jsonb - 'modalidade_base_id',
        '{modalidade_base_ids}',
        CASE
          WHEN valor::jsonb ? 'modalidade_base_ids' THEN valor::jsonb->'modalidade_base_ids'
          WHEN NULLIF(valor::jsonb->>'modalidade_base_id', '') IS NOT NULL THEN jsonb_build_array((valor::jsonb->>'modalidade_base_id')::int)
          ELSE '[]'::jsonb
        END,
        true
      )::text
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE chave = $1
      AND valor IS NOT NULL
      AND valor::jsonb ? 'modalidade_base_id'
  `, [CONFIG_ALOCACAO_AGRICULTURA_CHAVE]);
}

export async function obterConfiguracaoAlocacaoAgricultura(client?: any): Promise<ConfiguracaoAlocacaoAgricultura> {
  const executor = client || getDb();
  await ensureAlocacaoAgriculturaSchema(executor);

  const result = await executor.query(
    "SELECT valor FROM configuracoes_sistema WHERE chave = $1 LIMIT 1",
    [CONFIG_ALOCACAO_AGRICULTURA_CHAVE],
  );

  if (result.rows.length === 0) return DEFAULT_CONFIG_ALOCACAO_AGRICULTURA;

  try {
    return normalizarConfigAlocacaoAgricultura(JSON.parse(result.rows[0].valor || "{}"));
  } catch {
    return DEFAULT_CONFIG_ALOCACAO_AGRICULTURA;
  }
}

export async function salvarConfiguracaoAlocacaoAgricultura(
  config: Partial<ConfiguracaoAlocacaoAgricultura>,
  client?: any,
): Promise<ConfiguracaoAlocacaoAgricultura> {
  const executor = client || getDb();
  await ensureAlocacaoAgriculturaSchema(executor);
  const normalizada = normalizarConfigAlocacaoAgricultura(config);

  await executor.query(`
    INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria)
    VALUES ($1, $2, 'Configuracao da reserva de agricultura familiar no faturamento', 'json', 'faturamento')
    ON CONFLICT (chave) DO UPDATE
      SET valor = EXCLUDED.valor,
          tipo = EXCLUDED.tipo,
          categoria = EXCLUDED.categoria,
          updated_at = CURRENT_TIMESTAMP
  `, [CONFIG_ALOCACAO_AGRICULTURA_CHAVE, JSON.stringify(normalizada)]);

  return normalizada;
}
