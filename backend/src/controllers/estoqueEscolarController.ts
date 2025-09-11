// Controller para estoque escolar - visão geral por produto
import { Request, Response } from "express";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
const db = require("../database");

// Função para gerar backup em Excel no formato de matriz
async function gerarBackupExcel(client: any) {
  try {
    // Buscar todos os dados de estoque
    const estoqueData = await client.query(`
      SELECT 
        e.nome as escola_nome,
        p.nome as produto_nome,
        p.categoria,
        p.unidade,
        ee.quantidade_atual
      FROM estoque_escolas ee
      JOIN escolas e ON e.id = ee.escola_id
      JOIN produtos p ON p.id = ee.produto_id
      WHERE e.ativo = true AND p.ativo = true
      ORDER BY e.nome, p.categoria, p.nome
    `);

    // Buscar movimentações para planilha separada
    const movimentacoesData = await client.query(`
      SELECT 
        eeh.id,
        'N/A' as lote_codigo,
        p.nome as produto_nome,
        eeh.tipo_movimentacao as tipo,
        eeh.quantidade_movimentada as quantidade,
        eeh.motivo,
        '' as observacoes,
        eeh.data_movimentacao
      FROM estoque_escolas_historico eeh
      JOIN produtos p ON p.id = eeh.produto_id
      ORDER BY eeh.data_movimentacao DESC
    `);

    // Criar matriz de estoque (escolas x produtos)
    const escolas = [...new Set(estoqueData.rows.map(row => row.escola_nome))].sort();
    const produtos = [...new Set(estoqueData.rows.map(row => row.produto_nome))].sort();
    
    // Criar mapa de quantidades
    const quantidadeMap = new Map();
    estoqueData.rows.forEach(row => {
      const key = `${row.escola_nome}|${row.produto_nome}`;
      quantidadeMap.set(key, row.quantidade_atual);
    });

    // Criar dados da matriz
    const matrizData = [];
    
    // Cabeçalho com produtos
    const header = ['Escola', ...produtos];
    matrizData.push(header);
    
    // Linhas com escolas e quantidades
    escolas.forEach(escola => {
      const row = [escola];
      produtos.forEach(produto => {
        const key = `${escola}|${produto}`;
        const quantidade = quantidadeMap.get(key) || 0;
        row.push(quantidade);
      });
      matrizData.push(row);
    });

    // Criar workbook
    const wb = XLSX.utils.book_new();

    // Adicionar planilha matriz (escolas x produtos)
    const wsMatriz = XLSX.utils.aoa_to_sheet(matrizData);
    XLSX.utils.book_append_sheet(wb, wsMatriz, 'Matriz Estoque');

    // Adicionar planilha de estoque detalhado
    const wsEstoque = XLSX.utils.json_to_sheet(estoqueData.rows);
    XLSX.utils.book_append_sheet(wb, wsEstoque, 'Estoque Detalhado');

    // Adicionar planilha de movimentações
    const wsMovimentacoes = XLSX.utils.json_to_sheet(movimentacoesData.rows);
    XLSX.utils.book_append_sheet(wb, wsMovimentacoes, 'Movimentacoes');

    // Criar diretório de backup se não existir
    // No Vercel, usar /tmp que é writable, em desenvolvimento usar ./backups
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    const backupDir = isProduction ? '/tmp' : path.join(process.cwd(), 'backups');
    
    if (!isProduction && !fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Gerar nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-estoque-${timestamp}.xlsx`;
    const filepath = path.join(backupDir, filename);

    // Salvar arquivo
    XLSX.writeFile(wb, filepath);

    return {
      filename,
      filepath,
      total_escolas: escolas.length,
      total_produtos: produtos.length,
      total_registros_estoque: estoqueData.rows.length,
      total_movimentacoes: movimentacoesData.rows.length
    };
  } catch (error) {
    console.error('Erro ao gerar backup Excel:', error);
    throw error;
  }
}

export async function buscarEstoqueEscolarProduto(req: Request, res: Response) {
  try {
    const { produto_id } = req.params;

    // Buscar informações do produto
    const produtoResult = await db.query(`
      SELECT id, nome, descricao, unidade, categoria
      FROM produtos 
      WHERE id = $1 AND ativo = true
    `, [produto_id]);

    if (produtoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    const produto = produtoResult.rows[0];

    // Buscar estoque do produto em todas as escolas
    const estoqueResult = await db.query(`
      SELECT 
        e.id as escola_id,
        e.nome as escola_nome,
        $1::integer as produto_id,
        COALESCE(ee.quantidade_atual, 0) as quantidade_atual,
        $2 as unidade,
        CASE 
          WHEN COALESCE(ee.quantidade_atual, 0) = 0 THEN 'sem_estoque'
          ELSE 'normal'
        END as status_estoque,
        ee.updated_at as data_ultima_atualizacao
      FROM escolas e
      LEFT JOIN estoque_escolas ee ON (ee.escola_id = e.id AND ee.produto_id = $1)
      WHERE e.ativo = true
      ORDER BY e.nome
    `, [produto_id, produto.unidade]);

    const escolas = estoqueResult.rows;
    const totalQuantidade = escolas.reduce((sum, escola) => sum + parseFloat(escola.quantidade_atual), 0);
    const escolasComEstoque = escolas.filter(escola => parseFloat(escola.quantidade_atual) > 0).length;

    const resultado = {
      produto_id: produto.id,
      produto_nome: produto.nome,
      produto_descricao: produto.descricao,
      unidade: produto.unidade,
      categoria: produto.categoria,
      escolas: escolas,
      total_quantidade: totalQuantidade,
      total_escolas_com_estoque: escolasComEstoque,
      total_escolas: escolas.length
    };

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error("❌ Erro ao buscar estoque escolar do produto:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar estoque escolar do produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function resetEstoque(req: Request, res: Response) {
  try {
    const result = await db.transaction(async (client) => {
      // Transação já iniciada automaticamente pela função transaction
      
      // 1. Gerar backup em Excel antes do reset
      const backupData = await gerarBackupExcel(client);
      
      // 2. Deletar histórico de movimentações primeiro (devido à foreign key)
      const deleteHistorico = await client.query(`
        DELETE FROM estoque_escolas_historico
      `);
      
      // 3. Zerar todos os estoques
      const resetEstoques = await client.query(`
        DELETE FROM estoque_escolas
      `);
      
      // Retornar dados da operação
      return {
        backup_excel: backupData,
        historico_deletado: deleteHistorico.rowCount,
        estoques_resetados: resetEstoques.rowCount,
        data_backup: new Date().toISOString()
      };
    });
    
    res.json({
      success: true,
      message: 'Estoque global resetado com sucesso',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Erro ao resetar estoque global:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao resetar estoque global',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarEstoqueEscolar(req: Request, res: Response) {
  try {
    // Buscar resumo do estoque de todos os produtos
    const result = await db.query(`
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade,
        p.categoria,
        (SELECT COUNT(*) FROM escolas WHERE ativo = true) as total_escolas,
        COUNT(CASE WHEN ee.quantidade_atual > 0 THEN 1 END) as total_escolas_com_estoque,
        SUM(COALESCE(ee.quantidade_atual, 0)) as total_quantidade
      FROM produtos p
      LEFT JOIN estoque_escolas ee ON ee.produto_id = p.id
      LEFT JOIN escolas e ON e.id = ee.escola_id AND e.ativo = true
      WHERE p.ativo = true
      GROUP BY p.id, p.nome, p.descricao, p.unidade, p.categoria
      ORDER BY p.categoria, p.nome
    `);

    const produtos = result.rows.map(row => ({
      produto_id: row.produto_id,
      produto_nome: row.produto_nome,
      produto_descricao: row.produto_descricao,
      unidade: row.unidade,
      categoria: row.categoria,
      total_escolas: parseInt(row.total_escolas),
      total_escolas_com_estoque: parseInt(row.total_escolas_com_estoque),
      total_quantidade: parseFloat(row.total_quantidade) || 0
    }));

    res.json({
      success: true,
      data: produtos,
      total: produtos.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar estoque escolar:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao listar estoque escolar",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}