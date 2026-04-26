import * as PlanejamentoComprasService from './PlanejamentoComprasService';

export function validarCompraDaGuia(reqBody: any, usuarioId: number) {
  return PlanejamentoComprasService.gerarPedidoDaGuia(reqBody, usuarioId);
}

export function iniciarGeracaoCompraDaGuia(reqBody: any, usuarioId: number) {
  return PlanejamentoComprasService.iniciarGeracaoPedido(reqBody, usuarioId);
}

export function buscarStatusGeracaoCompra(
  reqBody: any,
  usuarioId: number,
  reqQuery?: any,
  reqParams?: any,
) {
  return PlanejamentoComprasService.buscarStatusJob(reqBody, usuarioId, reqQuery, reqParams);
}
