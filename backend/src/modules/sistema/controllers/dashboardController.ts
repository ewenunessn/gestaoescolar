import { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/errorHandler';
import { createDashboardService } from '../../dashboard/services/dashboardService';
import type { ClientChannel } from '../../../gateway/clientChannel';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = createDashboardService();
  const clientChannel = (req as Request & { clientChannel?: ClientChannel }).clientChannel ?? "api";
  const resumo = await dashboard.getResumo(clientChannel);

  const response = {
    success: true,
    data: resumo,
  };
  res.json(response);
});
