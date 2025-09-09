import { Pool } from 'pg';

export interface VerificacaoConsistencia {
  tabela: string;
  campo: string;
  problema: string;
  registros_afetados: number;
  detalhes?: any;
}

export class ConsistenciaModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async verificarIntegridade(): Promise<VerificacaoConsistencia[]> {
    const problemas: VerificacaoConsistencia[] = [];

    // Verificar pedidos sem itens
    const pedidosSemItens = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM pedidos p
      LEFT JOIN pedidos_itens pi ON p.id = pi.pedido_id
      WHERE pi.id IS NULL AND p.status != 'cancelado'
    `);

    if (parseInt(pedidosSemItens.rows[0].count) > 0) {
      problemas.push({
        tabela: 'pedidos',
        campo: 'itens',
        problema: 'Pedidos sem itens associados',
        registros_afetados: parseInt(pedidosSemItens.rows[0].count)
      });
    }

    // Verificar produtos sem estoque
    const produtosSemEstoque = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM produtos p
      LEFT JOIN estoque e ON p.id = e.produto_id
      WHERE e.id IS NULL AND p.ativo = true
    `);

    if (parseInt(produtosSemEstoque.rows[0].count) > 0) {
      problemas.push({
        tabela: 'produtos',
        campo: 'estoque',
        problema: 'Produtos ativos sem registro de estoque',
        registros_afetados: parseInt(produtosSemEstoque.rows[0].count)
      });
    }

    // Verificar contratos sem produtos
    const contratosSemProdutos = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM contratos c
      LEFT JOIN contratos_produtos cp ON c.id = cp.contrato_id
      WHERE cp.id IS NULL AND c.ativo = true
    `);

    if (parseInt(contratosSemProdutos.rows[0].count) > 0) {
      problemas.push({
        tabela: 'contratos',
        campo: 'produtos',
        problema: 'Contratos ativos sem produtos associados',
        registros_afetados: parseInt(contratosSemProdutos.rows[0].count)
      });
    }

    // Verificar escolas sem modalidades
    const escolasSemModalidades = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM escolas e
      LEFT JOIN escolas_modalidades em ON e.id = em.escola_id
      WHERE em.id IS NULL AND e.ativa = true
    `);

    if (parseInt(escolasSemModalidades.rows[0].count) > 0) {
      problemas.push({
        tabela: 'escolas',
        campo: 'modalidades',
        problema: 'Escolas ativas sem modalidades de ensino',
        registros_afetados: parseInt(escolasSemModalidades.rows[0].count)
      });
    }

    return problemas;
  }

  async corrigirProblemas(): Promise<{ corrigidos: number; erros: string[] }> {
    let corrigidos = 0;
    const erros: string[] = [];

    try {
      // Criar registros de estoque para produtos sem estoque
      const resultEstoque = await this.pool.query(`
        INSERT INTO estoque (produto_id, quantidade_atual, quantidade_minima, created_at)
        SELECT p.id, 0, 0, CURRENT_TIMESTAMP
        FROM produtos p
        LEFT JOIN estoque e ON p.id = e.produto_id
        WHERE e.id IS NULL AND p.ativo = true
      `);
      corrigidos += resultEstoque.rowCount || 0;

      // Desativar pedidos sem itens
      const resultPedidos = await this.pool.query(`
        UPDATE pedidos 
        SET status = 'cancelado', observacoes = 'Cancelado automaticamente - sem itens'
        WHERE id IN (
          SELECT p.id
          FROM pedidos p
          LEFT JOIN pedidos_itens pi ON p.id = pi.pedido_id
          WHERE pi.id IS NULL AND p.status != 'cancelado'
        )
      `);
      corrigidos += resultPedidos.rowCount || 0;

    } catch (error) {
      erros.push(`Erro ao corrigir problemas: ${error.message}`);
    }

    return { corrigidos, erros };
  }

  async verificarDuplicatas(): Promise<VerificacaoConsistencia[]> {
    const problemas: VerificacaoConsistencia[] = [];

    // Verificar produtos duplicados por nome
    const produtosDuplicados = await this.pool.query(`
      SELECT nome, COUNT(*) as count
      FROM produtos
      WHERE ativo = true
      GROUP BY LOWER(nome)
      HAVING COUNT(*) > 1
    `);

    if (produtosDuplicados.rows.length > 0) {
      problemas.push({
        tabela: 'produtos',
        campo: 'nome',
        problema: 'Produtos com nomes duplicados',
        registros_afetados: produtosDuplicados.rows.length,
        detalhes: produtosDuplicados.rows
      });
    }

    // Verificar escolas duplicadas por nome
    const escolasDuplicadas = await this.pool.query(`
      SELECT nome, COUNT(*) as count
      FROM escolas
      WHERE ativa = true
      GROUP BY LOWER(nome)
      HAVING COUNT(*) > 1
    `);

    if (escolasDuplicadas.rows.length > 0) {
      problemas.push({
        tabela: 'escolas',
        campo: 'nome',
        problema: 'Escolas com nomes duplicados',
        registros_afetados: escolasDuplicadas.rows.length,
        detalhes: escolasDuplicadas.rows
      });
    }

    return problemas;
  }

  async obterEstatisticas(): Promise<any> {
    const stats = await this.pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM produtos WHERE ativo = true) as produtos_ativos,
        (SELECT COUNT(*) FROM escolas WHERE ativa = true) as escolas_ativas,
        (SELECT COUNT(*) FROM contratos WHERE ativo = true) as contratos_ativos,
        (SELECT COUNT(*) FROM pedidos WHERE status = 'pendente') as pedidos_pendentes,
        (SELECT COUNT(*) FROM usuarios WHERE ativo = true) as usuarios_ativos
    `);

    return stats.rows[0];
  }
}