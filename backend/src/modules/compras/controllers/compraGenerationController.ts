import { Request, Response } from 'express';
import * as CompraGenerationService from '../services/CompraGenerationService';

function getUserId(req: Request): number {
  return (req as any).usuario?.id || req.user?.id || 0;
}

export const validarCompraDaGuia = async (req: Request, res: Response) => {
  try {
    const result = await CompraGenerationService.validarCompraDaGuia(req.body, getUserId(req));
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const iniciarGeracaoCompraDaGuia = async (req: Request, res: Response) => {
  try {
    const result = await CompraGenerationService.iniciarGeracaoCompraDaGuia(req.body, getUserId(req));
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const buscarStatusGeracaoCompra = async (req: Request, res: Response) => {
  try {
    const result = await CompraGenerationService.buscarStatusGeracaoCompra(
      req.body,
      getUserId(req),
      req.query,
      req.params,
    );
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
