const db = require("../database");

// Interface para item de recebimento simplificado
export interface RecebimentoItem {
  id: number;
  pedido_item_id: number;
  produto_id: number;
  fornecedor_id: number;
  quantidade_esperada: number;
  quantidade_recebida: number; // Soma total de todos os recebimentos
  data_ultimo_recebimento?: string;
  usuario_ultimo_recebimento?: number;
  observacoes?: string;
  status: 'PENDENTE' | 'PARCIAL' | 'COMPLETO' | 'EXCEDENTE';
  // Campos para exibição
  nome_produto?: string;
  unidade?: string;
  nome_fornecedor?: string;
  nome_usuario?: string;
}

// Interface para registro individual de recebimento
export interface RecebimentoRegistro {
  id: number;
  pedido_item_id: number;
  quantidade: number;
  data_recebimento: string;
  usuario_id: number;
  numero_lote?: string;
  data_validade?: string;
  observacoes?: string;
  comprovante_path?: string;
  // Campos para exibição
  nome_produto?: string;
  nome_usuario?: string;
}

// Função para calcular status automaticamente
export function calcularStatus(esperada: number, recebida: number): 'PENDENTE' | 'PARCIAL' | 'COMPLETO' | 'EXCEDENTE' {
  if (recebida === 0) return 'PENDENTE';
  if (recebida < esperada) return 'PARCIAL';
  if (recebida === esperada) return 'COMPLETO';
  return 'EXCEDENTE';
}

// Criar tabelas do sistema simplificado
export async function createRecebimentoSimplificadoTables() {
  // Tabela para controle de itens (uma linha por item do pedido)
  await db.query(`
    CREATE TABLE IF NOT EXISTS recebimento_itens_controle (
      id SERIAL PRIMARY KEY,
      pedido_item_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      fornecedor_id INTEGER NOT NULL,
      quantidade_esperada DECIMAL(10,3) NOT NULL,
      quantidade_recebida DECIMAL(10,3) DEFAULT 0,
      data_ultimo_recebimento TIMESTAMP,
      usuario_ultimo_recebimento INTEGER,
      observacoes TEXT,
      status TEXT DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'PARCIAL', 'COMPLETO', 'EXCEDENTE')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(pedido_item_id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id),
      FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
      FOREIGN KEY (usuario_ultimo_recebimento) REFERENCES usuarios(id)
    )
  `);

  // Tabela para histórico de recebimentos (uma linha por recebimento)
  await db.query(`
    CREATE TABLE IF NOT EXISTS recebimento_registros (
      id SERIAL PRIMARY KEY,
      pedido_item_id INTEGER NOT NULL,
      quantidade DECIMAL(10,3) NOT NULL,
      data_recebimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      usuario_id INTEGER NOT NULL,
      numero_lote TEXT,
      data_validade DATE,
      observacoes TEXT,
      comprovante_path TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pedido_item_id) REFERENCES pedidos_itens(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  // Índices para performance
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_recebimento_controle_pedido_item 
    ON recebimento_itens_controle(pedido_item_id)
  `);
    
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_recebimento_controle_status 
    ON recebimento_itens_controle(status)
  `);
    
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_recebimento_registros_pedido_item 
    ON recebimento_registros(pedido_item_id)
  `);
    
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_recebimento_registros_data 
    ON recebimento_registros(data_recebimento)
  `);

  // Trigger function para atualizar timestamp
  await db.query(`
    CREATE OR REPLACE FUNCTION update_recebimento_controle_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Trigger para atualizar timestamp
  await db.query(`
    DROP TRIGGER IF EXISTS update_recebimento_controle_timestamp ON recebimento_itens_controle;
    CREATE TRIGGER update_recebimento_controle_timestamp
      BEFORE UPDATE ON recebimento_itens_controle
      FOR EACH ROW
      EXECUTE FUNCTION update_recebimento_controle_timestamp();
  `);
}

// Inicializar itens de controle para um pedido
export async function inicializarItensControle(pedido_id: number): Promise<void> {
  await db.query('BEGIN');

  try {
    // Buscar todos os itens do pedido que ainda não foram inicializados
    const result = await db.query(`
      SELECT pi.id as pedido_item_id, pi.produto_id, pi.quantidade,
             pf.fornecedor_id, p.nome as nome_produto, p.unidade,
             f.nome as nome_fornecedor
      FROM pedidos_itens pi
      JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
      JOIN produtos p ON pi.produto_id = p.id
      JOIN fornecedores f ON pf.fornecedor_id = f.id
      WHERE pf.pedido_id = $1
      AND pi.id NOT IN (SELECT pedido_item_id FROM recebimento_itens_controle)
    `, [pedido_id]);

    const itens = result.rows;

    // Inserir controle para cada item
    for (const item of itens) {
      await db.query(`
        INSERT INTO recebimento_itens_controle (
          pedido_item_id, produto_id, fornecedor_id, quantidade_esperada, status
        ) VALUES ($1, $2, $3, $4, 'PENDENTE')
      `, [item.pedido_item_id, item.produto_id, item.fornecedor_id, item.quantidade]);
    }

    await db.query('COMMIT');
    console.log(`✅ Inicializados ${itens.length} itens de controle para pedido ${pedido_id}`);
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

// Listar itens para recebimento de um pedido
export async function listarItensParaRecebimento(pedido_id: number): Promise<RecebimentoItem[]> {
  // Garantir que os itens de controle existem
  await inicializarItensControle(pedido_id);

  const result = await db.query(`
    SELECT 
      ric.*,
      p.nome as nome_produto,
      p.unidade,
      f.nome as nome_fornecedor,
      u.nome as nome_usuario
    FROM recebimento_itens_controle ric
    JOIN pedidos_itens pi ON ric.pedido_item_id = pi.id
    JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
    JOIN produtos p ON ric.produto_id = p.id
    JOIN fornecedores f ON ric.fornecedor_id = f.id
    LEFT JOIN usuarios u ON ric.usuario_ultimo_recebimento = u.id
    WHERE pf.pedido_id = $1
    ORDER BY ric.status ASC, p.nome ASC
  `, [pedido_id]);

  return result.rows;
}

// Registrar recebimento de um item
export async function registrarRecebimento(
  pedido_item_id: number,
  quantidade: number,
  usuario_id: number,
  numero_lote?: string,
  data_validade?: string,
  observacoes?: string,
  comprovante_path?: string
): Promise<{ sucesso: boolean; item_atualizado: RecebimentoItem; registro_id: number }> {
  await db.query('BEGIN');

  try {
    // Buscar item de controle atual
    const itemControleResult = await db.query(`
      SELECT * FROM recebimento_itens_controle 
      WHERE pedido_item_id = $1
    `, [pedido_item_id]);

    const itemControle = itemControleResult.rows[0];

    if (!itemControle) {
      throw new Error('Item de controle não encontrado');
    }

    // Validar quantidade
    if (quantidade <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    // Registrar o recebimento individual
    const registroResult = await db.query(`
      INSERT INTO recebimento_registros (
        pedido_item_id, quantidade, usuario_id, numero_lote, 
        data_validade, observacoes, comprovante_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      pedido_item_id, quantidade, usuario_id, numero_lote,
      data_validade, observacoes, comprovante_path
    ]);

    // Calcular nova quantidade total recebida
    const novaQuantidadeRecebida = itemControle.quantidade_recebida + quantidade;
    const novoStatus = calcularStatus(itemControle.quantidade_esperada, novaQuantidadeRecebida);

    // Atualizar item de controle
    await db.query(`
      UPDATE recebimento_itens_controle 
      SET quantidade_recebida = $1,
          status = $2,
          data_ultimo_recebimento = CURRENT_TIMESTAMP,
          usuario_ultimo_recebimento = $3,
          observacoes = COALESCE($4, observacoes)
      WHERE pedido_item_id = $5
    `, [novaQuantidadeRecebida, novoStatus, usuario_id, observacoes, pedido_item_id]);

    // Buscar item atualizado com dados completos
    const itemAtualizadoResult = await db.query(`
      SELECT 
        ric.*,
        p.nome as nome_produto,
        p.unidade,
        f.nome as nome_fornecedor,
        u.nome as nome_usuario
      FROM recebimento_itens_controle ric
      JOIN produtos p ON ric.produto_id = p.id
      JOIN fornecedores f ON ric.fornecedor_id = f.id
      LEFT JOIN usuarios u ON ric.usuario_ultimo_recebimento = u.id
      WHERE ric.pedido_item_id = $1
    `, [pedido_item_id]);

    const itemAtualizado = itemAtualizadoResult.rows[0];

    // NOVA FUNCIONALIDADE: Registrar consumo no saldo do contrato do fornecedor
    await registrarConsumoContratoSimplificado(
      pedido_item_id,
      itemControle.produto_id,
      quantidade,
      usuario_id
    );

    // Registrar entrada no estoque (igual aos outros módulos)
    if (numero_lote) {
      try {
        const { criarLoteEstoque } = await import('./EstoqueModerno');
        await criarLoteEstoque({
          produto_id: itemControle.produto_id,
          lote: numero_lote,
          quantidade: quantidade,
          data_validade: data_validade,
          fornecedor_id: itemControle.fornecedor_id,
          usuario_id: usuario_id,
          observacoes: `Recebimento simplificado - ${novoStatus}`
        });
        
        console.log(`✅ [SIMPLIFICADO] Lote criado no estoque: ${numero_lote} - ${quantidade} unidades`);
      } catch (estoqueError) {
        console.warn('⚠️ [SIMPLIFICADO] Erro ao criar lote no estoque:', estoqueError);
        // Não falha o recebimento por causa do estoque
      }
    } else {
      // Se não tem lote, criar entrada genérica no estoque
      try {
        const { criarLoteEstoque } = await import('./EstoqueModerno');
        const loteGenerico = `SIMP-${Date.now()}-${itemControle.produto_id}`;
        
        await criarLoteEstoque({
          produto_id: itemControle.produto_id,
          lote: loteGenerico,
          quantidade: quantidade,
          data_validade: data_validade,
          fornecedor_id: itemControle.fornecedor_id,
          usuario_id: usuario_id,
          observacoes: `Recebimento simplificado sem lote - ${novoStatus}`
        });
        
        console.log(`✅ [SIMPLIFICADO] Entrada genérica criada no estoque: ${loteGenerico} - ${quantidade} unidades`);
      } catch (estoqueError) {
        console.warn('⚠️ [SIMPLIFICADO] Erro ao criar entrada genérica no estoque:', estoqueError);
        // Não falha o recebimento por causa do estoque
      }
    }

    // SINCRONIZAÇÃO: Verificar se todos os itens do pedido foram recebidos e atualizar status
    await sincronizarStatusPedidoSimplificado(pedido_item_id);

    await db.query('COMMIT');

    return {
      sucesso: true,
      item_atualizado: itemAtualizado!,
      registro_id: registroResult.rows[0].id
    };

  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}


export async function buscarPedidosRecebidos(): Promise<Array<{
  id: number;
  numero_pedido: string;
  fornecedor_nome: string;
  status: string;
  data_criacao: string;
  data_ultimo_recebimento?: string;
  total_itens: number;
  total_recebimentos: number;
  valor_total_pedido: number;
  valor_total_recebido: number;
  percentual_recebido: number;
}>> {
  try {
    const result = await db.query(`
      SELECT 
        pm.id,
        pm.numero_pedido,
        f.nome as fornecedor_nome,
        pm.status,
        pm.data_criacao,
        MAX(rr.data_recebimento) as data_ultimo_recebimento,
        COUNT(DISTINCT pi.id) as total_itens,
        COUNT(DISTINCT rr.id) as total_recebimentos,
        COALESCE(SUM(pi.quantidade * pi.preco_unitario), 0) as valor_total_pedido,
        COALESCE(SUM(ric.quantidade_recebida * pi.preco_unitario), 0) as valor_total_recebido,
        CASE 
          WHEN COALESCE(SUM(pi.quantidade), 0) > 0 
          THEN (COALESCE(SUM(ric.quantidade_recebida), 0) * 100.0 / COALESCE(SUM(pi.quantidade), 0))
          ELSE 0 
        END as percentual_recebido
      FROM pedidos pm
      JOIN pedidos_fornecedores pf ON pm.id = pf.pedido_id
      JOIN fornecedores f ON pf.fornecedor_id = f.id
      JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
      LEFT JOIN recebimento_itens_controle ric ON pi.id = ric.pedido_item_id
      LEFT JOIN recebimento_registros rr ON pi.id = rr.pedido_item_id
      WHERE ric.quantidade_recebida > 0
      GROUP BY pm.id, pm.numero_pedido, f.nome, pm.status, pm.data_criacao
      HAVING COUNT(DISTINCT rr.id) > 0
      ORDER BY pm.data_criacao DESC
    `);

    const pedidos = result.rows;

    // Determinar status baseado no percentual recebido
    const pedidosComStatus = pedidos.map((pedido: any) => {
      let statusRecebimento = 'RECEBIDO_PARCIAL';
      
      if ((pedido.percentual_recebido || 0) >= 100) {
        statusRecebimento = 'RECEBIDO_COMPLETO';
      }
      
      // Se já foi faturado, manter esse status
      if (pedido.status === 'FATURADO') {
        statusRecebimento = 'FATURADO';
      }

      return {
        ...pedido,
        status: statusRecebimento,
        valor_total_pedido: pedido.valor_total_pedido || 0,
        valor_total_recebido: pedido.valor_total_recebido || 0,
        percentual_recebido: pedido.percentual_recebido || 0
      };
    });

    return pedidosComStatus;

  } catch (error) {
    throw error;
  }
}

// Buscar histórico de recebimentos de um item
export async function buscarHistoricoRecebimento(pedido_item_id: number): Promise<RecebimentoRegistro[]> {
  const result = await db.query(`
    SELECT 
      rr.*,
      p.nome as nome_produto,
      u.nome as nome_usuario
    FROM recebimento_registros rr
    JOIN pedidos_itens pi ON rr.pedido_item_id = pi.id
    JOIN produtos p ON pi.produto_id = p.id
    JOIN usuarios u ON rr.usuario_id = u.id
    WHERE rr.pedido_item_id = $1
    ORDER BY rr.data_recebimento DESC
  `, [pedido_item_id]);

  return result.rows;
}

// Buscar estatísticas de recebimento de um pedido
export async function buscarEstatisticasPedido(pedido_id: number): Promise<{
  total_itens: number;
  itens_pendentes: number;
  itens_parciais: number;
  itens_completos: number;
  itens_excedentes: number;
  percentual_completo: number;
}> {
  const result = await db.query(`
    SELECT 
      COUNT(*) as total_itens,
      COUNT(CASE WHEN ric.status = 'PENDENTE' THEN 1 END) as itens_pendentes,
      COUNT(CASE WHEN ric.status = 'PARCIAL' THEN 1 END) as itens_parciais,
      COUNT(CASE WHEN ric.status = 'COMPLETO' THEN 1 END) as itens_completos,
      COUNT(CASE WHEN ric.status = 'EXCEDENTE' THEN 1 END) as itens_excedentes,
      ROUND(
        (COUNT(CASE WHEN ric.status = 'COMPLETO' THEN 1 END) * 100.0) / COUNT(*), 
        2
      ) as percentual_completo
    FROM recebimento_itens_controle ric
    JOIN pedidos_itens pi ON ric.pedido_item_id = pi.id
    JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
    WHERE pf.pedido_id = $1
  `, [pedido_id]);

  const stats = result.rows[0];

  return stats || {
    total_itens: 0,
    itens_pendentes: 0,
    itens_parciais: 0,
    itens_completos: 0,
    itens_excedentes: 0,
    percentual_completo: 0
  };
}

// Buscar pedidos com itens pendentes de recebimento
export async function buscarPedidosComItensPendentes(): Promise<Array<{
  pedido_id: number;
  numero_pedido: string;
  fornecedor: string;
  total_itens: number;
  itens_pendentes: number;
  itens_parciais: number;
  percentual_recebido: number;
}>> {
  // Buscar pedidos com controle já inicializado
  const pedidosComControleResult = await db.query(`
    SELECT 
      pm.id as pedido_id,
      pm.numero_pedido,
      STRING_AGG(DISTINCT f.nome, ', ') as fornecedor,
      COUNT(ric.id) as total_itens,
      COUNT(CASE WHEN ric.status = 'PENDENTE' THEN 1 END) as itens_pendentes,
      COUNT(CASE WHEN ric.status = 'PARCIAL' THEN 1 END) as itens_parciais,
      ROUND(
        (COUNT(CASE WHEN ric.status IN ('COMPLETO', 'EXCEDENTE') THEN 1 END) * 100.0) / COUNT(ric.id), 
        2
      ) as percentual_recebido
    FROM pedidos pm
    JOIN pedidos_fornecedores pf ON pm.id = pf.pedido_id
    JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
    JOIN recebimento_itens_controle ric ON pi.id = ric.pedido_item_id
    JOIN fornecedores f ON pf.fornecedor_id = f.id
    WHERE ric.status IN ('PENDENTE', 'PARCIAL')
    GROUP BY pm.id, pm.numero_pedido
    HAVING COUNT(CASE WHEN ric.status = 'PENDENTE' THEN 1 END) > 0 OR COUNT(CASE WHEN ric.status = 'PARCIAL' THEN 1 END) > 0
    ORDER BY pm.data_criacao DESC
  `);

  // Buscar pedidos sem controle inicializado (novos pedidos)
  const pedidosSemControleResult = await db.query(`
    SELECT 
      pm.id as pedido_id,
      pm.numero_pedido,
      STRING_AGG(DISTINCT f.nome, ', ') as fornecedor,
      COUNT(pi.id) as total_itens,
      COUNT(pi.id) as itens_pendentes,
      0 as itens_parciais,
      0 as percentual_recebido
    FROM pedidos pm
    JOIN pedidos_fornecedores pf ON pm.id = pf.pedido_id
    JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
    JOIN fornecedores f ON pf.fornecedor_id = f.id
    WHERE pm.status IN ('CONFIRMADO')
    AND pi.id NOT IN (SELECT pedido_item_id FROM recebimento_itens_controle)
    GROUP BY pm.id, pm.numero_pedido
    ORDER BY pm.data_criacao DESC
  `);

  // Combinar os resultados
  const todosPedidos = [...pedidosComControleResult.rows, ...pedidosSemControleResult.rows];

  return todosPedidos;
}

/**
 * Registra consumo no saldo do contrato do fornecedor (Sistema Simplificado)
 */
async function registrarConsumoContratoSimplificado(
  pedido_item_id: number,
  produto_id: number,
  quantidade_recebida: number,
  usuario_id: number
): Promise<void> {
  try {
    console.log(`🔄 [SIMPLIFICADO] Registrando consumo no contrato para produto ${produto_id}, quantidade: ${quantidade_recebida}`);
    
    // 1. Buscar informações do pedido através do item
    const pedidoInfoResult = await db.query(`
      SELECT pf.pedido_id, pi.contrato_id
      FROM pedidos_itens pi
      JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
      WHERE pi.id = $1
    `, [pedido_item_id]);
    
    const pedidoInfo = pedidoInfoResult.rows[0];
    
    if (!pedidoInfo) {
      console.log('⚠️ [SIMPLIFICADO] Informações do pedido não encontradas, pulando registro de consumo');
      return;
    }
    
    // 2. Buscar o contrato_produto_id
    let contratoInfoResult = await db.query(`
      SELECT cp.id as contrato_produto_id, c.numero as contrato_numero, f.nome as fornecedor_nome
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE cp.contrato_id = $1 AND cp.produto_id = $2
      LIMIT 1
    `, [pedidoInfo.contrato_id, produto_id]);
    
    let contratoInfo = contratoInfoResult.rows[0];
    
    // Se não encontrou pelo contrato_id do item, tenta pela estrutura do pedido
    if (!contratoInfo) {
      contratoInfoResult = await db.query(`
        SELECT cp.id as contrato_produto_id, c.numero as contrato_numero, f.nome as fornecedor_nome
        FROM pedidos_itens pi
        JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
        JOIN contratos c ON pi.contrato_id = c.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        JOIN contrato_produtos cp ON (cp.contrato_id = c.id AND cp.produto_id = $1)
        WHERE pf.pedido_id = $2 AND pi.produto_id = $3
        LIMIT 1
      `, [produto_id, pedidoInfo.pedido_id, produto_id]);
      
      contratoInfo = contratoInfoResult.rows[0];
    }
    
    if (!contratoInfo) {
      console.log(`⚠️ [SIMPLIFICADO] Contrato não encontrado para produto ${produto_id} no pedido ${pedidoInfo.pedido_id}`);
      return;
    }
    
    console.log(`📋 [SIMPLIFICADO] Contrato encontrado: ${contratoInfo.contrato_numero} (${contratoInfo.fornecedor_nome})`);
    
    // Sistema de movimentações removido - registro simplificado
    console.log(`✅ [SIMPLIFICADO] Recebimento processado para contrato ${contratoInfo.contrato_numero}: ${quantidade_recebida} unidades`);
    
  } catch (error) {
    console.error('❌ [SIMPLIFICADO] Erro ao registrar consumo no contrato:', error);
    // Não interrompe o recebimento se houver erro no registro de consumo
    // Apenas loga o erro para investigação posterior
  }
}

/**
 * Sincroniza o status do pedido baseado no recebimento simplificado
 */
export async function sincronizarStatusPedidoSimplificado(
  pedido_item_id: number
): Promise<void> {
  try {
    console.log(`🔄 [SINCRONIZAÇÃO] Verificando status do pedido após recebimento do item ${pedido_item_id}`);
    
    // 1. Buscar o pedido_id através do item
    const pedidoInfoResult = await db.query(`
      SELECT pf.pedido_id
      FROM pedidos_itens pi
      JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
      WHERE pi.id = $1
    `, [pedido_item_id]);
    
    const pedidoInfo = pedidoInfoResult.rows[0];
    
    if (!pedidoInfo) {
      console.log('⚠️ [SINCRONIZAÇÃO] Pedido não encontrado');
      return;
    }
    
    const pedido_id = pedidoInfo.pedido_id;
    
    // 2. Verificar status atual do pedido
    const pedidoResult = await db.query(`
      SELECT status FROM pedidos WHERE id = $1
    `, [pedido_id]);
    
    const pedido = pedidoResult.rows[0];
    
    if (!pedido) {
      console.log('⚠️ [SINCRONIZAÇÃO] Pedido não encontrado na tabela pedidos');
      return;
    }
    
    // 3. Buscar estatísticas de recebimento do pedido
    const stats = await buscarEstatisticasPedido(pedido_id);
    
    console.log(`📊 [SINCRONIZAÇÃO] Estatísticas do pedido ${pedido_id}:`, {
      total_itens: stats.total_itens,
      itens_completos: stats.itens_completos,
      itens_pendentes: stats.itens_pendentes,
      itens_parciais: stats.itens_parciais,
      percentual_completo: stats.percentual_completo
    });
    
    // 4. Determinar novo status baseado nas estatísticas
    let novoStatus = pedido.status;
    
    if (stats.itens_completos === stats.total_itens && stats.total_itens > 0) {
      // Todos os itens foram recebidos completamente
      if (pedido.status === 'CONFIRMADO') {
        novoStatus = 'RECEBIDO';
      }
    }
    
    // 5. Atualizar status se necessário
    if (novoStatus !== pedido.status) {
      await db.query(`
        UPDATE pedidos 
        SET status = $1, 
            data_atualizacao = CURRENT_TIMESTAMP,
            atualizado_por = 'Sistema Recebimento Simplificado'
        WHERE id = $2
      `, [novoStatus, pedido_id]);
      
      console.log(`✅ [SINCRONIZAÇÃO] Status do pedido ${pedido_id} atualizado: ${pedido.status} → ${novoStatus}`);
      
      // Log da mudança para auditoria
      try {
        await db.query(`
          INSERT INTO logs_sistema (
            tipo, descricao, usuario_id, data_log, detalhes
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
        `, [
          'STATUS_PEDIDO',
          `Status do pedido alterado automaticamente pelo recebimento simplificado`,
          1, // Sistema
          JSON.stringify({
            pedido_id: pedido_id,
            status_anterior: pedido.status,
            status_novo: novoStatus,
            motivo: 'Sincronização automática - recebimento simplificado',
            estatisticas: stats
          })
        ]);
      } catch (logError) {
        console.warn('⚠️ [SINCRONIZAÇÃO] Erro ao registrar log:', logError);
      }
    } else {
      console.log(`📋 [SINCRONIZAÇÃO] Status do pedido ${pedido_id} mantido: ${pedido.status}`);
    }
    
  } catch (error) {
    console.error('❌ [SINCRONIZAÇÃO] Erro ao sincronizar status do pedido:', error);
    // Não interrompe o processo se houver erro na sincronização
  }
}
/**

 * Buscar pedidos que já foram recebidos (completos ou parciais)
 */