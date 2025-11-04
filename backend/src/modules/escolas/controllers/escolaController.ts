// Controller de escolas para PostgreSQL
import { Request, Response } from "express";
import { setTenantContextFromRequest } from "../../../utils/tenantContext";
const db = require("../../../database");

export async function listarEscolas(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🏢 Listando escolas para tenant: ${req.tenant?.name} (${req.tenant?.id})`);
    }

    // Aplicar filtro de tenant diretamente na query (fallback para RLS)
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    const result = await db.query(`
      SELECT 
        e.id,
        e.nome,
        e.codigo,
        e.codigo_acesso,
        e.endereco,
        e.municipio,
        e.endereco_maps,
        e.telefone,
        e.email,
        e.nome_gestor,
        e.administracao,
        e.ativo,
        e.tenant_id,
        e.created_at,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
        STRING_AGG(DISTINCT m.nome, ', ' ORDER BY m.nome) as modalidades
      FROM escolas e
      LEFT JOIN escola_modalidades em ON e.id = em.escola_id
      LEFT JOIN modalidades m ON em.modalidade_id = m.id
      WHERE e.tenant_id = $1
      GROUP BY e.id, e.nome, e.codigo, e.codigo_acesso, e.endereco, e.municipio, e.endereco_maps, 
               e.telefone, e.email, e.nome_gestor, e.administracao, e.ativo, e.tenant_id, e.created_at
      ORDER BY e.nome
    `, [tenantId]);

    const escolas = result.rows;
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Encontradas ${escolas.length} escolas para o tenant ${req.tenant?.name}`);
    }

    res.json({
      success: true,
      data: escolas,
      total: escolas.length,
      tenant: req.tenant?.name || 'N/A',
      tenantId: req.tenant?.id || 'N/A'
    });
  } catch (error) {
    console.error("❌ Erro ao listar escolas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar escolas",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarEscola(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    // Aplicar filtro de tenant
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    // Buscar dados básicos da escola com filtro de tenant
    const escolaResult = await db.query(`
      SELECT * FROM escolas WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (escolaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola não encontrada"
      });
    }

    // Buscar total de alunos separadamente
    const alunosResult = await db.query(`
      SELECT COALESCE(SUM(quantidade_alunos), 0) as total_alunos
      FROM escola_modalidades 
      WHERE escola_id = $1
    `, [id]);

    // Buscar modalidades da escola
    const modalidadesResult = await db.query(`
      SELECT 
        em.id,
        em.escola_id,
        em.modalidade_id,
        em.quantidade_alunos,
        m.nome as modalidade_nome
      FROM escola_modalidades em
      LEFT JOIN modalidades m ON em.modalidade_id = m.id
      WHERE em.escola_id = $1
      ORDER BY m.nome
    `, [id]);

    const escola = escolaResult.rows[0];
    escola.total_alunos = parseInt(alunosResult.rows[0].total_alunos) || 0;
    escola.modalidades = modalidadesResult.rows;

    res.json({
      success: true,
      data: escola
    });
  } catch (error) {
    console.error("❌ Erro ao buscar escola:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar escola",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarEscola(req: Request, res: Response) {
  try {
    const {
      nome,
      codigo,
      codigo_acesso,
      endereco,
      municipio,
      endereco_maps,
      telefone,
      email,
      nome_gestor,
      administracao,
      ativo = true
    } = req.body;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    // Gerar código de acesso único de 6 dígitos se não fornecido
    const codigoAcessoFinal = codigo_acesso || Math.random().toString().slice(2, 8).padStart(6, '0');

    const result = await db.query(`
      INSERT INTO escolas (
        nome, codigo, codigo_acesso, endereco, municipio, endereco_maps, 
        telefone, email, nome_gestor, administracao, ativo, tenant_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      nome, codigo, codigoAcessoFinal, endereco, municipio, endereco_maps,
      telefone, email, nome_gestor, administracao, ativo, req.tenant.id
    ]);

    res.json({
      success: true,
      message: "Escola criada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar escola:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar escola",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarEscola(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      nome,
      codigo,
      codigo_acesso,
      endereco,
      municipio,
      endereco_maps,
      telefone,
      email,
      nome_gestor,
      administracao,
      ativo
    } = req.body;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    // Aplicar filtro de tenant
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    const result = await db.query(`
      UPDATE escolas SET
        nome = $1,
        codigo = $2,
        codigo_acesso = $3,
        endereco = $4,
        municipio = $5,
        endereco_maps = $6,
        telefone = $7,
        email = $8,
        nome_gestor = $9,
        administracao = $10,
        ativo = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12 AND tenant_id = $13
      RETURNING *
    `, [
      nome, codigo, codigo_acesso, endereco, municipio, endereco_maps, 
      telefone, email, nome_gestor, administracao, ativo, id, tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Escola atualizada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar escola:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar escola",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerEscola(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    // Aplicar filtro de tenant
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    const result = await db.query(`
      DELETE FROM escolas WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Escola removida com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao remover escola:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover escola",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function importarEscolasLote(req: Request, res: Response) {
  try {
    const { escolas } = req.body;

    if (!Array.isArray(escolas) || escolas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Lista de escolas inválida"
      });
    }

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    console.log(`📥 Iniciando importação de ${escolas.length} escolas para tenant ${req.tenant.name}...`);

    // Log das primeiras 3 escolas para debug
    console.log('🔍 Primeiras escolas a serem processadas:', escolas.slice(0, 3).map(e => ({
      nome: e.nome,
      endereco: e.endereco,
      municipio: e.municipio,
      telefone: e.telefone
    })));

    let sucessos = 0;
    let erros = 0;
    let atualizacoes = 0;
    let insercoes = 0;
    const resultados = [];

    // Processar em lotes de 50 para melhor performance
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < escolas.length; i += BATCH_SIZE) {
      batches.push(escolas.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 Processando ${batches.length} lotes de até ${BATCH_SIZE} escolas cada...`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} escolas)...`);

      // Usar transação para cada lote
      await db.query('BEGIN');
      
      try {
        for (const escola of batch) {
          try {
            const {
              nome,
              codigo,
              codigo_acesso,
              endereco,
              municipio,
              endereco_maps,
              telefone,
              email,
              nome_gestor,
              administracao,
              ativo = true
            } = escola;

            // Função para limpar strings
            const limparString = (str: any, maxLength: number = 500): string | null => {
              if (!str || str === null || str === undefined) return null;
              const cleaned = str
                .toString()
                .trim()
                .replace(/\s+/g, ' ') // Normalizar espaços
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remover caracteres de controle
                .substring(0, maxLength);
              return cleaned.length > 0 ? cleaned : null;
            };

            // Limpar e validar dados
            const nomeClean = limparString(nome, 255);
            const codigoClean = limparString(codigo, 50);
            const enderecoClean = limparString(endereco, 500);
            const municipioClean = limparString(municipio, 100);
            const telefoneClean = limparString(telefone, 20);
            const emailClean = limparString(email, 100);
            const nomeGestorClean = limparString(nome_gestor, 255);
            let administracaoClean = limparString(administracao, 20);
            
            // Gerar código de acesso único se não fornecido
            const codigoAcessoFinal = codigo_acesso || Math.random().toString().slice(2, 8).padStart(6, '0');

            // Validação do nome (único campo obrigatório)
            if (!nomeClean || nomeClean.length === 0) {
              throw new Error('Nome da escola é obrigatório');
            }

            // Validar e normalizar administração
            if (administracaoClean) {
              const adminNormalizada = administracaoClean.toLowerCase();
              if (adminNormalizada.includes('municipal')) {
                administracaoClean = 'municipal';
              } else if (adminNormalizada.includes('estadual')) {
                administracaoClean = 'estadual';
              } else if (adminNormalizada.includes('federal')) {
                administracaoClean = 'federal';
              } else if (adminNormalizada.includes('privad') || adminNormalizada.includes('particular')) {
                administracaoClean = 'particular';
              } else {
                // Se não conseguir normalizar, usar municipal como padrão
                administracaoClean = 'municipal';
              }
            } else {
              // Se não fornecido, usar municipal como padrão
              administracaoClean = 'municipal';
            }

            // Usar UPSERT (INSERT ... ON CONFLICT) para sempre substituir
            // Primeiro, verificar se existe para saber se foi inserção ou atualização
            const existeResult = await db.query(`
              SELECT id FROM escolas WHERE nome = $1 AND tenant_id = $2
            `, [nomeClean, req.tenant.id]);
            const escolaExistente = existeResult.rows.length > 0 ? existeResult.rows[0] : null;

            const result = await db.query(`
              INSERT INTO escolas (
                nome, codigo, codigo_acesso, endereco, municipio, endereco_maps, 
                telefone, email, nome_gestor, administracao, ativo, tenant_id
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT (nome, tenant_id) DO UPDATE SET
                codigo = EXCLUDED.codigo,
                codigo_acesso = EXCLUDED.codigo_acesso,
                endereco = EXCLUDED.endereco,
                municipio = EXCLUDED.municipio,
                endereco_maps = EXCLUDED.endereco_maps,
                telefone = EXCLUDED.telefone,
                email = EXCLUDED.email,
                nome_gestor = EXCLUDED.nome_gestor,
                administracao = EXCLUDED.administracao,
                ativo = EXCLUDED.ativo,
                updated_at = CURRENT_TIMESTAMP
              RETURNING *
            `, [
              nomeClean, codigoClean, codigoAcessoFinal, enderecoClean, municipioClean, 
              endereco_maps, telefoneClean, emailClean, nomeGestorClean, administracaoClean, ativo, req.tenant.id
            ]);

            const acao = escolaExistente ? 'atualizada' : 'inserida';
            if (escolaExistente) {
              atualizacoes++;
            } else {
              insercoes++;
            }

            resultados.push({
              sucesso: true,
              acao: acao,
              escola: result.rows[0]
            });

            sucessos++;
          } catch (error) {
            console.error(`❌ Erro ao importar escola ${escola.nome}:`, error);
            console.error('📋 Dados da escola com erro:', {
              nome: escola.nome,
              endereco: escola.endereco,
              municipio: escola.municipio,
              telefone: escola.telefone,
              nome_gestor: escola.nome_gestor,
              administracao: escola.administracao
            });
            
            // Extrair mensagem de erro mais específica
            let mensagemErro = 'Erro desconhecido';
            if (error instanceof Error) {
              mensagemErro = error.message;
              console.error('🔍 Erro original:', mensagemErro);
              
              // Traduzir erros comuns do PostgreSQL
              if (mensagemErro.includes('duplicate key')) {
                mensagemErro = 'Escola já existe com este nome';
              } else if (mensagemErro.includes('not-null constraint')) {
                mensagemErro = 'Campo obrigatório não preenchido';
              } else if (mensagemErro.includes('foreign key constraint')) {
                mensagemErro = 'Referência inválida';
              } else if (mensagemErro.includes('check constraint')) {
                mensagemErro = 'Dados não atendem aos critérios de validação';
              } else if (mensagemErro.includes('value too long')) {
                mensagemErro = 'Dados muito longos para o campo';
              }
            }
            
            resultados.push({
              sucesso: false,
              escola: escola.nome || 'Nome não informado',
              erro: mensagemErro,
              erro_original: error instanceof Error ? error.message : 'Erro desconhecido',
              dados_recebidos: {
                nome: escola.nome,
                endereco: escola.endereco,
                municipio: escola.municipio,
                telefone: escola.telefone,
                nome_gestor: escola.nome_gestor,
                administracao: escola.administracao
              }
            });
            erros++;
          }
        }
        
        await db.query('COMMIT');
        console.log(`✅ Lote ${batchIndex + 1} processado com sucesso`);
        
      } catch (batchError) {
        await db.query('ROLLBACK');
        console.error(`❌ Erro no lote ${batchIndex + 1}:`, batchError);
        
        // Marcar todas as escolas do lote como erro
        for (const escola of batch) {
          resultados.push({
            sucesso: false,
            escola: escola.nome || 'Nome não informado',
            erro: 'Erro no processamento do lote',
            dados_recebidos: { nome: escola.nome }
          });
          erros++;
        }
      }
    }

    const mensagem = `Importação concluída: ${insercoes} inseridas, ${atualizacoes} atualizadas, ${erros} erros`;
    console.log(`🎉 ${mensagem}`);

    // Log dos erros mais comuns para debug
    if (erros > 0) {
      const errosComuns: { [key: string]: number } = {};
      resultados.filter(r => !r.sucesso).forEach(r => {
        const erro = r.erro;
        if (erro) {
          errosComuns[erro] = (errosComuns[erro] || 0) + 1;
        }
      });
      
      console.log('📊 Resumo dos erros:');
      Object.entries(errosComuns).forEach(([erro, count]) => {
        console.log(`   ${erro}: ${count} ocorrências`);
      });

      // Log das primeiras 5 escolas com erro para análise
      const primeirosErros = resultados.filter(r => !r.sucesso).slice(0, 5);
      console.log('🔍 Primeiros erros detalhados:', primeirosErros);
    }

    res.json({
      success: true,
      message: mensagem,
      resultados: {
        sucesso: sucessos,
        erros: erros,
        insercoes: insercoes,
        atualizacoes: atualizacoes,
        detalhes: resultados
      }
    });
  } catch (error) {
    console.error("❌ Erro na importação em lote:", error);
    res.status(500).json({
      success: false,
      message: "Erro na importação em lote",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}