import { Router } from 'express';
import {
  listarItensAgrupadosFaturamento,
  listarContratosDisponiveis,
  listarModalidadesFaturamento,
  criarNovoFaturamento
} from '../controllers/faturamentoInterfaceController';

const router = Router();

/**
 * @route GET /api/faturamento-interface/itens-agrupados
 * @desc Lista itens de faturamento agrupados por fornecedor e contrato
 * @query {string} [status_recebimento] - Filtro por status (COMPLETO, PARCIAL, PENDENTE)
 * @query {number} [fornecedor_id] - Filtro por fornecedor
 * @query {number} [contrato_id] - Filtro por contrato
 * @query {number} [page=1] - Página para paginação
 * @query {number} [limit=50] - Limite de itens por página
 */
router.get('/itens-agrupados', listarItensAgrupadosFaturamento);

/**
 * @route GET /api/faturamento-interface/contratos-disponiveis
 * @desc Lista contratos disponíveis para seleção de novo faturamento
 * @query {number} [fornecedor_id] - Filtro por fornecedor
 * @query {string} [status=ativo] - Status do contrato
 * @query {string} [busca] - Busca por número, descrição ou nome do fornecedor
 */
router.get('/contratos-disponiveis', listarContratosDisponiveis);

/**
 * @route GET /api/faturamento-interface/modalidades
 * @desc Lista modalidades de faturamento cadastradas
 * @query {boolean} [ativo=true] - Filtro por modalidades ativas
 */
router.get('/modalidades', listarModalidadesFaturamento);

/**
 * @route POST /api/faturamento-interface/criar-faturamento
 * @desc Cria um novo faturamento com modalidades selecionadas
 * @body {number} contrato_id - ID do contrato
 * @body {number} fornecedor_id - ID do fornecedor
 * @body {number[]} modalidades_selecionadas - Array de IDs das modalidades
 * @body {number[]} itens_selecionados - Array de IDs dos itens de pedido
 * @body {string} [observacoes] - Observações do faturamento
 */
router.post('/criar-faturamento', criarNovoFaturamento);

export default router;