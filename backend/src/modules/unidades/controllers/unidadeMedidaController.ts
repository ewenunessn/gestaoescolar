import { Request, Response } from 'express';
import * as unidadeService from '../../../services/unidadesMedidaService';
import { cacheService } from '../../../utils/cacheService';

/**
 * Listar todas as unidades de medida
 * GET /api/unidades-medida
 * Query params: tipo (opcional)
 */
export async function listarUnidades(req: Request, res: Response) {
  try {
    const cached = await cacheService.get('unidades_medida:list:all');
    if (cached) return res.json(cached);

    const { tipo } = req.query;
    const unidades = await unidadeService.listarUnidadesMedida(tipo as string);

    const response = {
      success: true,
      data: unidades,
      total: unidades.length
    };
    await cacheService.set('unidades_medida:list:all', response, cacheService.TTL.static);
    res.json(response);
  } catch (error) {
    console.error('❌ Erro ao listar unidades:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar unidades de medida',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Buscar unidade por código ou ID
 * GET /api/unidades-medida/:identificador
 */
export async function buscarUnidade(req: Request, res: Response) {
  try {
    const { identificador } = req.params;
    const id = parseInt(identificador);

    const cached = await cacheService.get(`unidades_medida:${identificador}`);
    if (cached) return res.json(cached);

    const unidade = await unidadeService.buscarUnidadeMedida(
      isNaN(id) ? identificador : id
    );

    if (!unidade) {
      return res.status(404).json({
        success: false,
        message: 'Unidade de medida não encontrada'
      });
    }

    const response = {
      success: true,
      data: unidade
    };
    await cacheService.set(`unidades_medida:${identificador}`, response, cacheService.TTL.static);
    res.json(response);
  } catch (error) {
    console.error('❌ Erro ao buscar unidade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar unidade de medida',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Converter quantidade entre unidades
 * POST /api/unidades-medida/converter
 * Body: { quantidade, unidadeOrigemId, unidadeDestinoId, pesoEmbalagem? }
 */
export async function converterUnidades(req: Request, res: Response) {
  try {
    const { quantidade, unidadeOrigemId, unidadeDestinoId, pesoEmbalagem } = req.body;
    
    if (!quantidade || !unidadeOrigemId || !unidadeDestinoId) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: quantidade, unidadeOrigemId, unidadeDestinoId'
      });
    }
    
    const resultado = await unidadeService.converterUnidade(
      parseFloat(quantidade),
      parseInt(unidadeOrigemId),
      parseInt(unidadeDestinoId),
      pesoEmbalagem ? parseFloat(pesoEmbalagem) : undefined
    );
    
    res.json({
      success: true,
      data: {
        quantidadeOrigem: quantidade,
        quantidadeConvertida: resultado,
        unidadeOrigemId,
        unidadeDestinoId
      }
    });
  } catch (error) {
    console.error('❌ Erro ao converter unidades:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao converter unidades'
    });
  }
}

/**
 * Calcular fator de conversão
 * POST /api/unidades-medida/calcular-fator
 * Body: { unidadeOrigemId, unidadeDestinoId, pesoEmbalagem?, pesoProduto? }
 */
export async function calcularFator(req: Request, res: Response) {
  try {
    const { unidadeOrigemId, unidadeDestinoId, pesoEmbalagem, pesoProduto } = req.body;
    
    if (!unidadeOrigemId || !unidadeDestinoId) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: unidadeOrigemId, unidadeDestinoId'
      });
    }
    
    const fator = await unidadeService.calcularFatorConversao(
      parseInt(unidadeOrigemId),
      parseInt(unidadeDestinoId),
      pesoEmbalagem ? parseFloat(pesoEmbalagem) : undefined,
      pesoProduto ? parseFloat(pesoProduto) : undefined
    );
    
    res.json({
      success: true,
      data: {
        fatorConversao: fator,
        unidadeOrigemId,
        unidadeDestinoId
      }
    });
  } catch (error) {
    console.error('❌ Erro ao calcular fator:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao calcular fator de conversão'
    });
  }
}
