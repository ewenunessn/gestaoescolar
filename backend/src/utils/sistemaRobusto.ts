import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupInfo {
  id?: number;
  nome_arquivo: string;
  tamanho_bytes: number;
  data_backup: Date;
  tipo: 'completo' | 'incremental' | 'manual';
  status: 'sucesso' | 'erro' | 'em_progresso';
  observacoes?: string;
  created_at?: Date;
}

export interface VerificacaoIntegridade {
  tabela: string;
  total_registros: number;
  registros_validos: number;
  registros_invalidos: number;
  problemas_encontrados: string[];
}

export class SistemaRobusto {
  private pool: Pool;
  private backupDir: string;

  constructor(pool: Pool, backupDir: string = './backups') {
    this.pool = pool;
    this.backupDir = backupDir;
    
    // Criar diretório de backup se não existir
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async criarBackup(tipo: 'completo' | 'incremental' | 'manual' = 'manual'): Promise<BackupInfo> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeArquivo = `backup_${tipo}_${timestamp}.sql`;
    const caminhoCompleto = path.join(this.backupDir, nomeArquivo);

    try {
      // Registrar início do backup
      const backupInfo = await this.registrarBackup(nomeArquivo, tipo, 'em_progresso');

      // Executar pg_dump (assumindo que está disponível no sistema)
      const { exec } = require('child_process');
      const comando = `pg_dump ${process.env.DATABASE_URL} > "${caminhoCompleto}"`;
      
      await new Promise((resolve, reject) => {
        exec(comando, (error: any, stdout: any, stderr: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });

      // Verificar se o arquivo foi criado e obter tamanho
      const stats = fs.statSync(caminhoCompleto);
      
      // Atualizar registro do backup
      await this.atualizarBackup(backupInfo.id!, stats.size, 'sucesso');

      return {
        ...backupInfo,
        tamanho_bytes: stats.size,
        status: 'sucesso'
      };

    } catch (error) {
      // Atualizar registro com erro
      const backupInfo = await this.buscarBackupPorNome(nomeArquivo);
      if (backupInfo) {
        await this.atualizarBackup(backupInfo.id!, 0, 'erro', error.message);
      }
      
      throw new Error(`Erro ao criar backup: ${error.message}`);
    }
  }

  private async registrarBackup(nomeArquivo: string, tipo: string, status: string): Promise<BackupInfo> {
    const query = `
      INSERT INTO backups (nome_arquivo, tamanho_bytes, tipo, status, data_backup)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [nomeArquivo, 0, tipo, status]);
    return result.rows[0];
  }

  private async atualizarBackup(id: number, tamanho: number, status: string, observacoes?: string): Promise<void> {
    const query = `
      UPDATE backups 
      SET tamanho_bytes = $1, status = $2, observacoes = $3
      WHERE id = $4
    `;
    
    await this.pool.query(query, [tamanho, status, observacoes, id]);
  }

  private async buscarBackupPorNome(nomeArquivo: string): Promise<BackupInfo | null> {
    const query = 'SELECT * FROM backups WHERE nome_arquivo = $1';
    const result = await this.pool.query(query, [nomeArquivo]);
    return result.rows[0] || null;
  }

  async listarBackups(limite: number = 20): Promise<BackupInfo[]> {
    const query = `
      SELECT * FROM backups 
      ORDER BY data_backup DESC 
      LIMIT $1
    `;
    
    const result = await this.pool.query(query, [limite]);
    return result.rows;
  }

  async verificarIntegridade(): Promise<VerificacaoIntegridade[]> {
    const resultados: VerificacaoIntegridade[] = [];

    // Lista de tabelas principais para verificar
    const tabelas = [
      'usuarios', 'produtos', 'escolas', 'fornecedores', 
      'contratos', 'pedidos', 'estoque', 'recebimentos'
    ];

    for (const tabela of tabelas) {
      try {
        const verificacao = await this.verificarTabelaIntegridade(tabela);
        resultados.push(verificacao);
      } catch (error) {
        resultados.push({
          tabela,
          total_registros: 0,
          registros_validos: 0,
          registros_invalidos: 0,
          problemas_encontrados: [`Erro ao verificar tabela: ${error.message}`]
        });
      }
    }

    return resultados;
  }

  private async verificarTabelaIntegridade(tabela: string): Promise<VerificacaoIntegridade> {
    const problemas: string[] = [];
    
    // Contar total de registros
    const totalQuery = `SELECT COUNT(*) as total FROM ${tabela}`;
    const totalResult = await this.pool.query(totalQuery);
    const totalRegistros = parseInt(totalResult.rows[0].total);

    let registrosValidos = totalRegistros;
    let registrosInvalidos = 0;

    // Verificações específicas por tabela
    switch (tabela) {
      case 'usuarios':
        // Verificar emails duplicados
        const emailsDuplicados = await this.pool.query(`
          SELECT email, COUNT(*) as count 
          FROM usuarios 
          GROUP BY email 
          HAVING COUNT(*) > 1
        `);
        
        if (emailsDuplicados.rows.length > 0) {
          problemas.push(`${emailsDuplicados.rows.length} emails duplicados encontrados`);
          registrosInvalidos += emailsDuplicados.rows.reduce((sum, row) => sum + row.count - 1, 0);
        }
        break;

      case 'produtos':
        // Verificar produtos sem categoria
        const produtosSemCategoria = await this.pool.query(`
          SELECT COUNT(*) as count 
          FROM produtos 
          WHERE categoria IS NULL OR categoria = ''
        `);
        
        if (parseInt(produtosSemCategoria.rows[0].count) > 0) {
          problemas.push(`${produtosSemCategoria.rows[0].count} produtos sem categoria`);
          registrosInvalidos += parseInt(produtosSemCategoria.rows[0].count);
        }
        break;

      case 'pedidos':
        // Verificar pedidos sem itens
        const pedidosSemItens = await this.pool.query(`
          SELECT COUNT(*) as count 
          FROM pedidos p
          LEFT JOIN pedidos_itens pi ON p.id = pi.pedido_id
          WHERE pi.id IS NULL
        `);
        
        if (parseInt(pedidosSemItens.rows[0].count) > 0) {
          problemas.push(`${pedidosSemItens.rows[0].count} pedidos sem itens`);
          registrosInvalidos += parseInt(pedidosSemItens.rows[0].count);
        }
        break;

      case 'estoque':
        // Verificar estoques negativos
        const estoquesNegativos = await this.pool.query(`
          SELECT COUNT(*) as count 
          FROM estoque 
          WHERE quantidade_atual < 0
        `);
        
        if (parseInt(estoquesNegativos.rows[0].count) > 0) {
          problemas.push(`${estoquesNegativos.rows[0].count} produtos com estoque negativo`);
          registrosInvalidos += parseInt(estoquesNegativos.rows[0].count);
        }
        break;
    }

    registrosValidos = totalRegistros - registrosInvalidos;

    return {
      tabela,
      total_registros: totalRegistros,
      registros_validos: registrosValidos,
      registros_invalidos: registrosInvalidos,
      problemas_encontrados: problemas
    };
  }

  async corrigirProblemasIntegridade(): Promise<{ corrigidos: number; erros: string[] }> {
    let totalCorrigidos = 0;
    const erros: string[] = [];

    try {
      // Corrigir produtos sem categoria
      const produtosCorrigidos = await this.pool.query(`
        UPDATE produtos 
        SET categoria = 'Não Categorizado' 
        WHERE categoria IS NULL OR categoria = ''
      `);
      totalCorrigidos += produtosCorrigidos.rowCount || 0;

      // Corrigir estoques negativos
      const estoquesCorrigidos = await this.pool.query(`
        UPDATE estoque 
        SET quantidade_atual = 0 
        WHERE quantidade_atual < 0
      `);
      totalCorrigidos += estoquesCorrigidos.rowCount || 0;

      // Desativar pedidos sem itens
      const pedidosCorrigidos = await this.pool.query(`
        UPDATE pedidos 
        SET status = 'cancelado', observacoes = 'Cancelado automaticamente - sem itens'
        WHERE id IN (
          SELECT p.id 
          FROM pedidos p
          LEFT JOIN pedidos_itens pi ON p.id = pi.pedido_id
          WHERE pi.id IS NULL AND p.status != 'cancelado'
        )
      `);
      totalCorrigidos += pedidosCorrigidos.rowCount || 0;

    } catch (error) {
      erros.push(`Erro ao corrigir problemas: ${error.message}`);
    }

    return { corrigidos: totalCorrigidos, erros };
  }

  async executarManutencao(): Promise<any> {
    const resultados = {
      backup_criado: false,
      integridade_verificada: false,
      problemas_corrigidos: 0,
      logs_limpos: 0,
      erros: [] as string[]
    };

    try {
      // 1. Criar backup automático
      const backup = await this.criarBackup('incremental');
      resultados.backup_criado = backup.status === 'sucesso';
      
      if (!resultados.backup_criado) {
        resultados.erros.push('Falha ao criar backup');
      }

    } catch (error) {
      resultados.erros.push(`Erro no backup: ${error.message}`);
    }

    try {
      // 2. Verificar e corrigir integridade
      const verificacao = await this.verificarIntegridade();
      resultados.integridade_verificada = true;

      const totalProblemas = verificacao.reduce((sum, v) => sum + v.registros_invalidos, 0);
      
      if (totalProblemas > 0) {
        const correcao = await this.corrigirProblemasIntegridade();
        resultados.problemas_corrigidos = correcao.corrigidos;
        resultados.erros.push(...correcao.erros);
      }

    } catch (error) {
      resultados.erros.push(`Erro na verificação de integridade: ${error.message}`);
    }

    try {
      // 3. Limpar logs antigos (manter últimos 90 dias)
      const logsLimpos = await this.pool.query(`
        DELETE FROM logs_auditoria 
        WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
      `);
      resultados.logs_limpos = logsLimpos.rowCount || 0;

    } catch (error) {
      resultados.erros.push(`Erro ao limpar logs: ${error.message}`);
    }

    return resultados;
  }

  async obterEstatisticasBackup(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_backups,
        COUNT(*) FILTER (WHERE status = 'sucesso') as backups_sucesso,
        COUNT(*) FILTER (WHERE status = 'erro') as backups_erro,
        COALESCE(SUM(tamanho_bytes), 0) as tamanho_total,
        MAX(data_backup) as ultimo_backup,
        AVG(tamanho_bytes) FILTER (WHERE status = 'sucesso') as tamanho_medio
      FROM backups
      WHERE data_backup >= CURRENT_DATE - INTERVAL '30 days'
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async limparBackupsAntigos(diasParaManter: number = 30): Promise<number> {
    // Buscar backups antigos
    const backupsAntigos = await this.pool.query(`
      SELECT nome_arquivo FROM backups 
      WHERE data_backup < CURRENT_DATE - INTERVAL '${diasParaManter} days'
    `);

    let removidos = 0;

    // Remover arquivos físicos
    for (const backup of backupsAntigos.rows) {
      try {
        const caminhoArquivo = path.join(this.backupDir, backup.nome_arquivo);
        if (fs.existsSync(caminhoArquivo)) {
          fs.unlinkSync(caminhoArquivo);
        }
        removidos++;
      } catch (error) {
        console.error(`Erro ao remover backup ${backup.nome_arquivo}:`, error);
      }
    }

    // Remover registros do banco
    await this.pool.query(`
      DELETE FROM backups 
      WHERE data_backup < CURRENT_DATE - INTERVAL '${diasParaManter} days'
    `);

    return removidos;
  }
}