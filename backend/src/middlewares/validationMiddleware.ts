import { Request, Response, NextFunction } from "express";

export interface CardapioValidation {
  nome?: string;
  periodo_dias?: number;
  data_inicio?: string;
  data_fim?: string;
  ativo?: boolean;
}

export function validateCardapio(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { nome, periodo_dias, data_inicio, data_fim, ativo } = req.body;

  console.log("Validando cardápio:", {
    nome,
    periodo_dias,
    data_inicio,
    data_fim,
    ativo,
  });

  // Validação do nome
  if (
    nome !== undefined &&
    (typeof nome !== "string" || nome.trim().length === 0)
  ) {
    console.log("Erro na validação do nome:", nome);
    return res.status(400).json({
      message: "Nome do cardápio é obrigatório e deve ser uma string válida.",
    });
  }

  // Validação do período - converter string para number se necessário
  if (periodo_dias !== undefined) {
    const periodo =
      typeof periodo_dias === "string" ? Number(periodo_dias) : periodo_dias;
    if (isNaN(periodo) || periodo <= 0) {
      console.log("Erro na validação do período:", periodo_dias);
      return res.status(400).json({
        message: "Período deve ser um número positivo.",
      });
    }
    // Atualizar o valor no body para garantir que seja number
    req.body.periodo_dias = periodo;
  }

  // Validação das datas
  if (data_inicio !== undefined) {
    if (typeof data_inicio !== "string" || isNaN(Date.parse(data_inicio))) {
      console.log("Erro na validação da data de início:", data_inicio);
      return res.status(400).json({
        message: "Data de início deve ser uma data válida.",
      });
    }
  }

  if (data_fim !== undefined) {
    if (typeof data_fim !== "string" || isNaN(Date.parse(data_fim))) {
      console.log("Erro na validação da data de fim:", data_fim);
      return res.status(400).json({
        message: "Data de fim deve ser uma data válida.",
      });
    }
  }

  // Validação se data_fim é posterior à data_inicio
  if (data_inicio && data_fim) {
    const inicio = new Date(data_inicio);
    const fim = new Date(data_fim);
    if (fim <= inicio) {
      console.log("Erro: data de fim não é posterior à data de início");
      return res.status(400).json({
        message: "Data de fim deve ser posterior à data de início.",
      });
    }
  }

  // Validação do status ativo - converter string para boolean se necessário
  if (ativo !== undefined) {
    let ativoValue = ativo;
    if (typeof ativo === "string") {
      ativoValue = ativo.toLowerCase() === "true" || ativo === "1";
    }
    if (typeof ativoValue !== "boolean") {
      console.log("Erro na validação do status ativo:", ativo);
      return res.status(400).json({
        message: "Status ativo deve ser um valor booleano.",
      });
    }
    // Atualizar o valor no body para garantir que seja boolean
    req.body.ativo = ativoValue;
  }

  console.log("Validação do cardápio passou com sucesso");
  next();
}

export function validateCardapioRefeicao(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { cardapio_id, refeicao_id, modalidade_id, frequencia_mensal } =
    req.body;

  console.log("Validando refeição do cardápio:", {
    cardapio_id,
    refeicao_id,
    modalidade_id,
    frequencia_mensal,
  });

  // Validação do cardápio_id - converter string para number se necessário
  if (cardapio_id !== undefined) {
    const cardapioId =
      typeof cardapio_id === "string" ? Number(cardapio_id) : cardapio_id;
    if (isNaN(cardapioId) || cardapioId <= 0) {
      console.log("Erro na validação do cardapio_id:", cardapio_id);
      return res.status(400).json({
        message: "ID do cardápio deve ser um número positivo.",
      });
    }
    req.body.cardapio_id = cardapioId;
  }

  // Validação do refeicao_id - converter string para number se necessário
  if (refeicao_id !== undefined) {
    const refeicaoId =
      typeof refeicao_id === "string" ? Number(refeicao_id) : refeicao_id;
    if (isNaN(refeicaoId) || refeicaoId <= 0) {
      console.log("Erro na validação do refeicao_id:", refeicao_id);
      return res.status(400).json({
        message: "ID da refeição deve ser um número positivo.",
      });
    }
    req.body.refeicao_id = refeicaoId;
  }

  // Validação do modalidade_id - converter string para number se necessário
  if (modalidade_id !== undefined) {
    const modalidadeId =
      typeof modalidade_id === "string" ? Number(modalidade_id) : modalidade_id;
    if (isNaN(modalidadeId) || modalidadeId <= 0) {
      console.log("Erro na validação do modalidade_id:", modalidade_id);
      return res.status(400).json({
        message: "ID da modalidade deve ser um número positivo.",
      });
    }
    req.body.modalidade_id = modalidadeId;
  }

  // Validação da frequência mensal - converter string para number se necessário
  if (frequencia_mensal !== undefined) {
    const frequencia =
      typeof frequencia_mensal === "string"
        ? Number(frequencia_mensal)
        : frequencia_mensal;
    if (isNaN(frequencia) || frequencia <= 0) {
      console.log("Erro na validação da frequencia_mensal:", frequencia_mensal);
      return res.status(400).json({
        message: "Frequência mensal deve ser um número positivo.",
      });
    }
    req.body.frequencia_mensal = frequencia;
  }

  console.log("Validação da refeição do cardápio passou com sucesso");
  next();
}
