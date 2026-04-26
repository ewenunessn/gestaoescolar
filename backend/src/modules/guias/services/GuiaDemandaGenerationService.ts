import * as PlanejamentoComprasService from '../../compras/services/PlanejamentoComprasService';

export function gerarGuiaDemanda(reqBody: any, usuarioId: number) {
  return PlanejamentoComprasService.gerarGuiasDemanda(reqBody, usuarioId);
}

export function iniciarGeracaoGuiaDemanda(reqBody: any, usuarioId: number) {
  return PlanejamentoComprasService.iniciarGeracaoGuias(reqBody, usuarioId);
}

export function buscarStatusGeracaoGuiaDemanda(
  reqBody: any,
  usuarioId: number,
  reqQuery?: any,
  reqParams?: any,
) {
  return PlanejamentoComprasService.buscarStatusJob(reqBody, usuarioId, reqQuery, reqParams);
}
