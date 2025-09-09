import { Pool } from 'pg';

export interface Alerta {
  id?: number;
  tipo: 'estoque_baixo' | 'contrato_vencendo' | 'pedido_atrasado' | 'sistema';
  titulo: string;
  mensagem: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'pendente' | 'lido' | 'resolvido' | 'ignorado';
  usuario_id?: number;
  dados_contexto?: any;
  data_expiracao?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class AlertaService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criarAlerta(alerta: Omit<Alerta, 'id' | 'created_at' | 'updated_at'>): Promise<Alerta> {
    const query = `
      INSERT INTO alertas (tipo, titulo, mensagem, prioridade, status, usuario_id, dados_contexto, data_expiracao)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      alerta.tipo,
      alerta.titulo,
      alerta.mensagem,
      alerta.prioridade,
      alerta.status,
      alerta.usuario_id,
      JSON.stringify(alerta.dados_contexto),
      alerta.data_expiracao
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async verificarEstoqueBaixo(): Promise<void> {
    const query = `
      SELECT e.*, p.nome as produto_nome
      FROM estoque e
      JOIN produtos p ON e.produto_id = p.id
      WHERE e.quantidade_atual <= e.quantidade_minima
        AND p.ativo = true
        AND NOT EXISTS (
          SELECT 1 FROM alertas a 
          WHERE a.tipo = 'estoque_baixo' 
            AND a.dados_contexto->>'produto_id' = e.produto_id::text
            AND a.status IN ('pendente', 'lido')
            AND a.created_at > CURRENT_DATE - INTERVAL '7 days'
        )
    `;

    const result = await this.pool.query(query);

    for (const item of result.rows) {
      await this.criarAlerta({
        tipo: 'estoque_baixo',
        titulo: `Estoque baixo: ${item.produto_nome}`,
        mensagem: `O produto ${item.produto_nome} está com estoque baixo. Quantidade atual: ${item.quantidade_atual}, Mínimo: ${item.quantidade_minima}`,
        prioridade: item.quantidade_atual === 0 ? 'critica' : 'alta',
        status: 'pendente',
        dados_contexto: {
          produto_id: item.produto_id,
          quantidade_atual: item.quantidade_atual,
          quantidade_minima: item.quantidade_minima
        }
      });
    }
  }

  // Função removida: verificarProdutosVencendo - dependia do módulo de controle de qualidade

  async verificarContratosVencendo(): Promise<void> {
    const query = `
      SELECT c.*, f.nome as fornecedor_nome
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE c.data_fim <= CURRENT_DATE + INTERVAL '30 days'
        AND c.data_fim > CURRENT_DATE
        AND c.status = 'ativo'
        AND NOT EXISTS (
          SELECT 1 FROM alertas a 
          WHERE a.tipo = 'contrato_vencendo' 
            AND a.dados_contexto->>'contrato_id' = c.id::text
            AND a.status IN ('pendente', 'lido')
        )
    `;

    const result = await this.pool.query(query);

    for (const contrato of result.rows) {
      const diasRestantes = Math.ceil((new Date(contrato.data_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      await this.criarAlerta({
        tipo: 'contrato_vencendo',
        titulo: `Contrato vencendo: ${contrato.numero}`,
        mensagem: `O contrato ${contrato.numero} com ${contrato.fornecedor_nome} vence em ${diasRestantes} dias (${contrato.data_fim})`,
        prioridade: diasRestantes <= 7 ? 'critica' : 'alta',
        status: 'pendente',
        dados_contexto: {
          contrato_id: contrato.id,
          numero: contrato.numero,
          fornecedor_nome: contrato.fornecedor_nome,
          data_fim: contrato.data_fim,
          dias_restantes: diasRestantes
        }
      });
    }
  }

  async verificarPedidosAtrasados(): Promise<void> {
    const query = `
      SELECT p.*, e.nome as escola_nome, f.nome as fornecedor_nome
      FROM pedidos p
      JOIN escolas e ON p.escola_id = e.id
      JOIN fornecedores f ON p.fornecedor_id = f.id
      WHERE p.data_entrega_prevista < CURRENT_DATE
        AND p.status IN ('aprovado', 'em_producao', 'em_transito')
        AND NOT EXISTS (
          SELECT 1 FROM alertas a 
          WHERE a.tipo = 'pedido_atrasado' 
            AND a.dados_contexto->>'pedido_id' = p.id::text
            AND a.status IN ('pendente', 'lido')
            AND a.created_at > CURRENT_DATE - INTERVAL '1 day'
        )
    `;

    const result = await this.pool.query(query);

    for (const pedido of result.rows) {
      const diasAtraso = Math.ceil((new Date().getTime() - new Date(pedido.data_entrega_prevista).getTime()) / (1000 * 60 * 60 * 24));
      
      await this.criarAlerta({
        tipo: 'pedido_atrasado',
        titulo: `Pedido atrasado: ${pedido.escola_nome}`,
        mensagem: `O pedido para ${pedido.escola_nome} está atrasado há ${diasAtraso} dias. Previsão era ${pedido.data_entrega_prevista}`,
        prioridade: diasAtraso > 7 ? 'critica' : 'alta',
        status: 'pendente',
        dados_contexto: {
          pedido_id: pedido.id,
          escola_nome: pedido.escola_nome,
          fornecedor_nome: pedido.fornecedor_nome,
          data_entrega_prevista: pedido.data_entrega_prevista,
          dias_atraso: diasAtraso
        }
      });
    }
  }

  async executarVerificacoes(): Promise<void> {
    try {
      await this.verificarEstoqueBaixo();
      // Removido: await this.verificarProdutosVencendo(); - dependia do módulo de controle de qualidade
      await this.verificarContratosVencendo();
      await this.verificarPedidosAtrasados();
      
      console.log('Verificações de alertas executadas com sucesso');
    } catch (error) {
      console.error('Erro ao executar verificações de alertas:', error);
    }
  }

  async listarAlertas(filtros?: {
    tipo?: string;
    prioridade?: string;
    status?: string;
    usuario_id?: number;
  }): Promise<Alerta[]> {
    let query = 'SELECT * FROM alertas WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (filtros?.tipo) {
      query += ` AND tipo = $${paramCount}`;
      values.push(filtros.tipo);
      paramCount++;
    }

    if (filtros?.prioridade) {
      query += ` AND prioridade = $${paramCount}`;
      values.push(filtros.prioridade);
      paramCount++;
    }

    if (filtros?.status) {
      query += ` AND status = $${paramCount}`;
      values.push(filtros.status);
      paramCount++;
    }

    if (filtros?.usuario_id) {
      query += ` AND (usuario_id = $${paramCount} OR usuario_id IS NULL)`;
      values.push(filtros.usuario_id);
      paramCount++;
    }

    // Remover alertas expirados
    query += ' AND (data_expiracao IS NULL OR data_expiracao > CURRENT_TIMESTAMP)';
    query += ' ORDER BY prioridade DESC, created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async marcarComoLido(id: number): Promise<boolean> {
    const query = 'UPDATE alertas SET status = \'lido\', updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async marcarComoResolvido(id: number): Promise<boolean> {
    const query = 'UPDATE alertas SET status = \'resolvido\', updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async ignorarAlerta(id: number): Promise<boolean> {
    const query = 'UPDATE alertas SET status = \'ignorado\', updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async obterEstatisticas(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
        COUNT(*) FILTER (WHERE status = 'lido') as lidos,
        COUNT(*) FILTER (WHERE status = 'resolvido') as resolvidos,
        COUNT(*) FILTER (WHERE prioridade = 'critica') as criticos,
        COUNT(*) FILTER (WHERE prioridade = 'alta') as alta_prioridade,
        COUNT(*) FILTER (WHERE tipo = 'estoque_baixo') as estoque_baixo
      FROM alertas
      WHERE (data_expiracao IS NULL OR data_expiracao > CURRENT_TIMESTAMP)
        AND created_at > CURRENT_DATE - INTERVAL '30 days'
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async limparAlertasExpirados(): Promise<number> {
    const query = 'DELETE FROM alertas WHERE data_expiracao < CURRENT_TIMESTAMP';
    const result = await this.pool.query(query);
    return result.rowCount || 0;
  }
}