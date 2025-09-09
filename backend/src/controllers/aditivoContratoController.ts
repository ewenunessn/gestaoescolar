import { Request, Response } from 'express';
import { Pool } from 'pg';
import { AditivoContratoModel, AditivoContrato } from '../models/AditivoContrato';

export class AditivoContratoController {
  private aditivoModel: AditivoContratoModel;

  constructor(pool: Pool) {
    this.aditivoModel = new AditivoContratoModel(pool);
  }

  /**
   * Criar um novo aditivo de contrato
   */
  async criar(req: Request, res: Response): Promise<void> {
    try {
      const {
        contrato_id,
        contrato_produto_id,
        tipo,
        quantidade_adicional,
        dias_adicionais,
        nova_data_fim,
        justificativa,
        numero_aditivo,
        data_assinatura,
        valor_adicional
      } = req.body;

      // Validações básicas
      if (!contrato_id || !tipo || !justificativa || !data_assinatura) {
        res.status(400).json({
          error: 'Campos obrigatórios: contrato_id, tipo, justificativa, data_assinatura'
        });
        return;
      }

      if (!['QUANTIDADE', 'PRAZO'].includes(tipo)) {
        res.status(400).json({
          error: 'Tipo deve ser QUANTIDADE ou PRAZO'
        });
        return;
      }

      // Usar o tipo diretamente conforme definido no modelo
      const tipoMapeado = tipo as 'QUANTIDADE' | 'PRAZO';

      // Validações específicas por tipo
      if (tipo === 'QUANTIDADE') {
        if (!contrato_produto_id || !quantidade_adicional) {
          res.status(400).json({
            error: 'Aditivo de quantidade requer contrato_produto_id e quantidade_adicional'
          });
          return;
        }
      }

      if (tipo === 'PRAZO') {
        if (!nova_data_fim && !dias_adicionais) {
          res.status(400).json({
            error: 'Aditivo de prazo requer nova_data_fim ou dias_adicionais'
          });
          return;
        }
      }

      const dadosAditivo: Omit<AditivoContrato, 'id' | 'created_at' | 'updated_at'> = {
        contrato_id: parseInt(contrato_id),
        contrato_produto_id: contrato_produto_id ? parseInt(contrato_produto_id) : undefined,
        tipo: tipoMapeado,
        quantidade_adicional: quantidade_adicional ? parseFloat(quantidade_adicional) : undefined,
        dias_adicionais: dias_adicionais ? parseInt(dias_adicionais) : undefined,
        nova_data_fim: nova_data_fim ? new Date(nova_data_fim) : undefined,
        justificativa,
        numero_aditivo,
        data_assinatura: new Date(data_assinatura),
        valor_adicional: valor_adicional ? parseFloat(valor_adicional) : 0,
        created_by: (req as any).user?.id || null
      };

      const novoAditivo = await this.aditivoModel.criar(dadosAditivo);

      res.status(201).json({
        message: 'Aditivo criado com sucesso',
        data: novoAditivo
      });

    } catch (error: any) {
      console.error('Erro ao criar aditivo:', error);
      res.status(500).json({
        error: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar todos os aditivos
   */
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const aditivos = await this.aditivoModel.listar();

      res.json({
        message: 'Aditivos listados com sucesso',
        data: aditivos
      });

    } catch (error: any) {
      console.error('Erro ao listar aditivos:', error);
      res.status(500).json({
        error: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar aditivos de um contrato
   */
  async listarPorContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;
      // console.log('🔍 Listando aditivos para contrato:', contratoId);

      if (!contratoId) {
        res.status(400).json({
          error: 'ID do contrato é obrigatório'
        });
        return;
      }

      const contratoExiste = await this.verificarContratoExiste(parseInt(contratoId));
      
      if (!contratoExiste) {
        res.status(404).json({
          error: 'Contrato não encontrado'
        });
        return;
      }

      const aditivos = await this.aditivoModel.listarPorContrato(parseInt(contratoId));
      // console.log('📋 Aditivos encontrados:', aditivos.length);

      res.json({
        message: 'Aditivos listados com sucesso',
        data: aditivos
      });

    } catch (error: any) {
      console.error('❌ Erro ao listar aditivos:', error);
      res.status(500).json({
        error: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar aditivo por ID
   */
  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'ID do aditivo é obrigatório'
        });
        return;
      }

      const aditivo = await this.aditivoModel.buscarPorId(parseInt(id));

      if (!aditivo) {
        res.status(404).json({
          error: 'Aditivo não encontrado'
        });
        return;
      }

      res.json({
        message: 'Aditivo encontrado',
        data: aditivo
      });

    } catch (error: any) {
      console.error('Erro ao buscar aditivo:', error);
      res.status(500).json({
        error: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Remover aditivo
   */
  async remover(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'ID do aditivo é obrigatório'
        });
        return;
      }

      // Verificar se o aditivo existe
      const aditivoExistente = await this.aditivoModel.buscarPorId(parseInt(id));
      if (!aditivoExistente) {
        res.status(404).json({
          error: 'Aditivo não encontrado'
        });
        return;
      }

      await this.aditivoModel.remover(parseInt(id));

      res.json({
        message: 'Aditivo removido com sucesso'
      });

    } catch (error: any) {
      console.error('Erro ao remover aditivo:', error);
      res.status(500).json({
        error: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Calcular resumo de aditivos por contrato
   */
  async calcularResumo(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;

      if (!contratoId) {
        res.status(400).json({
          error: 'ID do contrato é obrigatório'
        });
        return;
      }

      const resumo = await this.aditivoModel.calcularResumoAditivos(parseInt(contratoId));

      res.json({
        message: 'Resumo calculado com sucesso',
        data: resumo
      });

    } catch (error: any) {
      console.error('Erro ao calcular resumo:', error);
      res.status(500).json({
        error: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar produtos de um contrato para aditivos de quantidade
   */
  async listarProdutosContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;

      if (!contratoId) {
        res.status(400).json({
          error: 'ID do contrato é obrigatório'
        });
        return;
      }

      const contratoExiste = await this.verificarContratoExiste(parseInt(contratoId));
      if (!contratoExiste) {
        res.status(404).json({
          error: 'Contrato não encontrado'
        });
        return;
      }

      // Buscar produtos do contrato - versão simplificada
      const result = await this.aditivoModel['pool'].query(
        'SELECT cp.id, cp.produto_id, p.nome as produto_nome FROM contrato_produtos cp INNER JOIN produtos p ON cp.produto_id = p.id WHERE cp.contrato_id = $1',
        [parseInt(contratoId)]
      );

      res.json({
        message: 'Produtos listados com sucesso',
        data: result.rows
      });

    } catch (error: any) {
      console.error('Erro ao listar produtos do contrato:', error);
      res.status(500).json({
        error: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Verificar se um contrato existe
   */
  private async verificarContratoExiste(contratoId: number): Promise<boolean> {
    try {
      const query = 'SELECT id, ativo FROM contratos WHERE id = $1';
      console.log('🔍 Verificando contrato com query:', query, 'ID:', contratoId);
      const result = await this.aditivoModel['pool'].query(query, [contratoId]);
      console.log('📊 Resultado da query:', result.rows);
      
      if (result.rows.length === 0) {
        return false;
      }
      
      const contrato = result.rows[0];
      console.log('📋 Contrato encontrado:', contrato);
      return contrato.ativo === true;
    } catch (error) {
      console.error('❌ Erro ao verificar contrato:', error);
      return false;
    }
  }

  /**
   * Validar se é possível criar aditivo de quantidade
   */
  async validarAditivoQuantidade(req: Request, res: Response): Promise<void> {
    try {
      const { contrato_produto_id, quantidade_adicional } = req.body;

      if (!contrato_produto_id || !quantidade_adicional) {
        res.status(400).json({
          error: 'contrato_produto_id e quantidade_adicional são obrigatórios'
        });
        return;
      }

      // Buscar quantidade original e aditivos existentes
      const query = `
        SELECT 
          cp.quantidade as quantidade_original,
          COALESCE(SUM(a.quantidade_adicional), 0) as total_aditivos_existentes,
          p.nome as produto_nome
        FROM contrato_produtos cp
        INNER JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN aditivos_contratos a ON cp.id = a.contrato_produto_id 
          AND a.tipo = 'QUANTIDADE' AND a.ativo = true
        WHERE cp.id = $1
        GROUP BY cp.id, cp.quantidade, p.nome
      `;

      const result = await this.aditivoModel['pool'].query(query, [parseInt(contrato_produto_id)]);

      if (result.rows.length === 0) {
        res.status(404).json({
          error: 'Produto do contrato não encontrado'
        });
        return;
      }

      const dados = result.rows[0];
      const quantidadeOriginal = parseFloat(dados.quantidade_original);
      const totalAditivosExistentes = parseFloat(dados.total_aditivos_existentes);
      const novaQuantidade = parseFloat(quantidade_adicional);

      const percentualAtual = (totalAditivosExistentes / quantidadeOriginal) * 100;
      const percentualNovo = ((totalAditivosExistentes + novaQuantidade) / quantidadeOriginal) * 100;

      const podeAdicionar = percentualNovo <= 25;
      const percentualDisponivel = 25 - percentualAtual;
      const quantidadeMaximaDisponivel = (quantidadeOriginal * percentualDisponivel) / 100;

      res.json({
        message: 'Validação realizada',
        data: {
          produto_nome: dados.produto_nome,
          quantidade_original: quantidadeOriginal,
          total_aditivos_existentes: totalAditivosExistentes,
          percentual_atual: Math.round(percentualAtual * 100) / 100,
          percentual_novo: Math.round(percentualNovo * 100) / 100,
          pode_adicionar: podeAdicionar,
          percentual_disponivel: Math.round(percentualDisponivel * 100) / 100,
          quantidade_maxima_disponivel: Math.round(quantidadeMaximaDisponivel * 100) / 100
        }
      });

    } catch (error: any) {
      console.error('Erro ao validar aditivo:', error);
      res.status(500).json({
        error: error.message || 'Erro interno do servidor'
      });
    }
  }
}