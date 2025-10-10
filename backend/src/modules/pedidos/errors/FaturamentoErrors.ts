/**
 * Classes de erro customizadas para o módulo de faturamento
 */

export class FaturamentoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FaturamentoError';
  }
}

export class FaturamentoDuplicadoError extends FaturamentoError {
  constructor(pedidoId: number) {
    super(`Já existe um faturamento para o pedido #${pedidoId}`);
    this.name = 'FaturamentoDuplicadoError';
  }
}

export class SaldoInsuficienteError extends FaturamentoError {
  public readonly produto: string;
  public readonly modalidade: string;
  public readonly disponivel: number;
  public readonly necessario: number;

  constructor(produto: string, modalidade: string, disponivel: number, necessario: number) {
    super(
      `Saldo insuficiente para "${produto}" na modalidade "${modalidade}". ` +
      `Disponível: ${disponivel}, Necessário: ${necessario}`
    );
    this.name = 'SaldoInsuficienteError';
    this.produto = produto;
    this.modalidade = modalidade;
    this.disponivel = disponivel;
    this.necessario = necessario;
  }
}

export class PedidoInvalidoError extends FaturamentoError {
  constructor(message: string) {
    super(message);
    this.name = 'PedidoInvalidoError';
  }
}

export class FaturamentoNaoEncontradoError extends FaturamentoError {
  constructor(id: number) {
    super(`Faturamento #${id} não encontrado`);
    this.name = 'FaturamentoNaoEncontradoError';
  }
}

export class ConsumoJaRegistradoError extends FaturamentoError {
  constructor(faturamentoId: number) {
    super(`O consumo do faturamento #${faturamentoId} já foi registrado`);
    this.name = 'ConsumoJaRegistradoError';
  }
}

export class ModalidadeNaoEncontradaError extends FaturamentoError {
  constructor(modalidadeNome: string, contratoNumero: string) {
    super(`Modalidade "${modalidadeNome}" não encontrada no contrato ${contratoNumero}`);
    this.name = 'ModalidadeNaoEncontradaError';
  }
}

/**
 * Verifica se um erro é de negócio (retorna 400) ou técnico (retorna 500)
 */
export function isBusinessError(error: Error): boolean {
  return error instanceof FaturamentoError;
}

/**
 * Obtém o status HTTP apropriado para o erro
 */
export function getErrorStatus(error: Error): number {
  if (error instanceof FaturamentoNaoEncontradoError) {
    return 404;
  }
  
  if (isBusinessError(error)) {
    return 400;
  }
  
  return 500;
}
