import { Request, Response } from 'express';
import * as GuiaDemandaGenerationService from '../services/GuiaDemandaGenerationService';

function getUserId(req: Request): number {
  return (req as any).usuario?.id || req.user?.id || 0;
}

export const gerarGuiaDemanda = async (req: Request, res: Response) => {
  try {
    const result = await GuiaDemandaGenerationService.gerarGuiaDemanda(req.body, getUserId(req));
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const iniciarGeracaoGuiaDemanda = async (req: Request, res: Response) => {
  try {
    const result = await GuiaDemandaGenerationService.iniciarGeracaoGuiaDemanda(req.body, getUserId(req));
    return res.status(result.status || 200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const buscarStatusGeracaoGuiaDemanda = async (req: Request, res: Response) => {
  try {
    const result = await GuiaDemandaGenerationService.buscarStatusGeracaoGuiaDemanda(
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
