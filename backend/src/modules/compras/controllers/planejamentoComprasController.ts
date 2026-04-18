import { Request, Response } from 'express';
import * as PlanejamentoComprasService from '../services/PlanejamentoComprasService';

export const gerarPedidosPorPeriodo = async (req: Request, res: Response) => {
  try {
    const result = await PlanejamentoComprasService.gerarPedidosPorPeriodo(req.body, req.user?.id || 0);
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const calcularDemandaPorCompetencia = async (req: Request, res: Response) => {
  try {
    const result = await PlanejamentoComprasService.calcularDemandaPorCompetencia(req.body, req.user?.id || 0);
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const gerarGuiasDemanda = async (req: Request, res: Response) => {
  try {
    const result = await PlanejamentoComprasService.gerarGuiasDemanda(req.body, req.user?.id || 0);
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const gerarPedidoDaGuia = async (req: Request, res: Response) => {
  try {
    const result = await PlanejamentoComprasService.gerarPedidoDaGuia(req.body, req.user?.id || 0);
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const iniciarGeracaoGuias = async (req: Request, res: Response) => {
  try {
    // some routes check req.usuario, fallback to req.user
    const userId = (req as any).usuario?.id || req.user?.id || 0;
    const result = await PlanejamentoComprasService.iniciarGeracaoGuias(req.body, userId);
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const iniciarGeracaoPedido = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).usuario?.id || req.user?.id || 0;
    const result = await PlanejamentoComprasService.iniciarGeracaoPedido(req.body, userId);
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const buscarStatusJob = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 0;
    const result = await PlanejamentoComprasService.buscarStatusJob(req.body, userId, req.query, req.params);
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const listarJobsUsuario = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || (req as any).usuario?.id || 0;
    const result = await PlanejamentoComprasService.listarJobsUsuario(req.body, userId);
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
