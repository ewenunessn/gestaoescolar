/**
 * Schemas de validação centralizados usando Zod
 * Garante robustez e consistência na validação de dados
 */

import { z } from 'zod';

// ============================================================================
// SCHEMAS BÁSICOS E UTILITÁRIOS
// ============================================================================

// Schema para IDs (números positivos)
export const idSchema = z.number().int().positive('ID deve ser um número positivo');

// Schema para IDs opcionais
export const optionalIdSchema = z.number().int().positive().optional();

// Schema para strings não vazias
export const nonEmptyStringSchema = z.string().min(1, 'Campo obrigatório').trim();

// Schema para emails
export const emailSchema = z.string().email('Email inválido').toLowerCase();

// Schema para datas (aceita string ISO ou objeto Date)
export const dateSchema = z.union([
  z.string().datetime('Data deve estar no formato ISO'),
  z.date()
]).transform((val) => {
  if (typeof val === 'string') {
    return new Date(val);
  }
  return val;
});

// Schema para datas opcionais
export const optionalDateSchema = dateSchema.optional().nullable();

// Schema para quantidades (números não negativos)
export const quantitySchema = z.number().min(0, 'Quantidade não pode ser negativa');

// Schema para preços (números positivos com até 2 casas decimais)
export const priceSchema = z.number().positive('Preço deve ser positivo').multipleOf(0.01);

// ============================================================================
// SCHEMAS DE USUÁRIO E AUTENTICAÇÃO
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  senha: nonEmptyStringSchema.min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const userCreateSchema = z.object({
  nome: nonEmptyStringSchema.max(100, 'Nome muito longo'),
  email: emailSchema,
  senha: nonEmptyStringSchema.min(6, 'Senha deve ter pelo menos 6 caracteres'),
  tipo: z.enum(['admin', 'gestor', 'escola'], {
    message: 'Tipo de usuário inválido'
  }),
  escola_id: optionalIdSchema,
  ativo: z.boolean().default(true)
});

export const userUpdateSchema = userCreateSchema.partial().omit({ senha: true });

export const changePasswordSchema = z.object({
  senha_atual: nonEmptyStringSchema,
  nova_senha: nonEmptyStringSchema.min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmar_senha: nonEmptyStringSchema
}).refine((data) => data.nova_senha === data.confirmar_senha, {
  message: 'Senhas não coincidem',
  path: ['confirmar_senha']
});

// ============================================================================
// SCHEMAS DE PRODUTOS
// ============================================================================

export const produtoCreateSchema = z.object({
  nome: nonEmptyStringSchema.max(200, 'Nome muito longo'),
  descricao: z.string().max(500, 'Descrição muito longa').optional(),
  unidade: nonEmptyStringSchema.max(20, 'Unidade muito longa'),
  categoria: nonEmptyStringSchema.max(100, 'Categoria muito longa'),
  ativo: z.boolean().default(true)
});

export const produtoUpdateSchema = produtoCreateSchema.partial();

// ============================================================================
// SCHEMAS DE ESCOLAS
// ============================================================================

export const escolaCreateSchema = z.object({
  nome: nonEmptyStringSchema.max(200, 'Nome muito longo'),
  endereco: z.string().max(300, 'Endereço muito longo').optional(),
  telefone: z.string().max(20, 'Telefone muito longo').optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  diretor: z.string().max(100, 'Nome do diretor muito longo').optional(),
  ativo: z.boolean().default(true)
});

export const escolaUpdateSchema = escolaCreateSchema.partial();

// ============================================================================
// SCHEMAS DE ESTOQUE
// ============================================================================

export const estoqueMovimentacaoSchema = z.object({
  produto_id: idSchema,
  tipo_movimentacao: z.enum(['entrada', 'saida', 'ajuste'], {
    message: 'Tipo de movimentação inválido'
  }),
  quantidade: quantitySchema,
  motivo: nonEmptyStringSchema.max(200, 'Motivo muito longo'),
  documento_referencia: z.string().max(100, 'Documento de referência muito longo').optional(),
  usuario_id: optionalIdSchema,
  data_validade: optionalDateSchema
});

export const estoqueLoteCreateSchema = z.object({
  produto_id: idSchema,
  lote: nonEmptyStringSchema.max(50, 'Código do lote muito longo'),
  quantidade_inicial: quantitySchema,
  quantidade_atual: quantitySchema,
  data_fabricacao: optionalDateSchema,
  data_validade: optionalDateSchema,
  fornecedor_id: optionalIdSchema,
  observacoes: z.string().max(300, 'Observações muito longas').optional()
});

export const estoqueLoteUpdateSchema = estoqueLoteCreateSchema.partial().omit({ produto_id: true });

export const estoqueAtualizacaoLoteSchema = z.object({
  itens: z.array(z.object({
    produto_id: idSchema,
    quantidade_atual: quantitySchema
  })).min(1, 'Pelo menos um item deve ser fornecido'),
  usuario_id: optionalIdSchema
});

// ============================================================================
// SCHEMAS DE GUIAS E DEMANDAS
// ============================================================================

export const demandaCreateSchema = z.object({
  escola_id: idSchema,
  numero_oficio: nonEmptyStringSchema.max(50, 'Número do ofício muito longo'),
  data_solicitacao: dateSchema,
  objeto: nonEmptyStringSchema.max(200, 'Objeto muito longo'),
  descricao_itens: nonEmptyStringSchema.max(1000, 'Descrição muito longa'),
  observacoes: z.string().max(500, 'Observações muito longas').optional(),
  status: z.enum(['pendente', 'aprovada', 'recusada', 'atendida']).default('pendente')
});

export const demandaUpdateSchema = demandaCreateSchema.partial();

export const demandaAcaoSchema = z.object({
  acao: z.enum(['aprovar', 'recusar', 'atender'], {
    message: 'Ação inválida'
  }),
  motivo_recusa: z.string().max(300, 'Motivo muito longo').optional(),
  data_resposta: dateSchema.optional(),
  observacoes: z.string().max(500, 'Observações muito longas').optional()
}).refine((data) => {
  if (data.acao === 'recusar' && !data.motivo_recusa) {
    return false;
  }
  return true;
}, {
  message: 'Motivo da recusa é obrigatório',
  path: ['motivo_recusa']
});

// ============================================================================
// SCHEMAS DE CONFIGURAÇÃO
// ============================================================================

export const configuracaoSchema = z.object({
  chave: nonEmptyStringSchema.max(100, 'Chave muito longa'),
  valor: z.string().max(1000, 'Valor muito longo'),
  descricao: z.string().max(300, 'Descrição muito longa').optional(),
  tipo: z.enum(['string', 'number', 'boolean', 'json']).default('string')
});

export const configuracaoUpdateSchema = configuracaoSchema.partial().omit({ chave: true });

// ============================================================================
// SCHEMAS DE QUERY PARAMETERS
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc')
});

export const dateRangeSchema = z.object({
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional()
}).refine((data) => {
  if (data.data_inicio && data.data_fim) {
    return new Date(data.data_inicio) <= new Date(data.data_fim);
  }
  return true;
}, {
  message: 'Data de início deve ser anterior à data de fim',
  path: ['data_fim']
});

// ============================================================================
// SCHEMAS PARA ENDPOINTS ESPECÍFICOS
// ============================================================================

export const multiplosProdutosSchema = z.object({
  produto_ids: z.array(idSchema).min(1, 'Pelo menos um produto deve ser fornecido').max(50, 'Máximo 50 produtos por vez')
});

export const matrizEstoqueQuerySchema = z.object({
  produto_ids: z.string().optional().transform((val) => {
    if (!val) return undefined;
    return val.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
  }),
  limite_produtos: z.coerce.number().int().min(1).max(100).default(50)
});

// ============================================================================
// TIPOS TYPESCRIPT DERIVADOS DOS SCHEMAS
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type ProdutoCreateInput = z.infer<typeof produtoCreateSchema>;
export type ProdutoUpdateInput = z.infer<typeof produtoUpdateSchema>;

export type EscolaCreateInput = z.infer<typeof escolaCreateSchema>;
export type EscolaUpdateInput = z.infer<typeof escolaUpdateSchema>;

export type EstoqueMovimentacaoInput = z.infer<typeof estoqueMovimentacaoSchema>;
export type EstoqueLoteCreateInput = z.infer<typeof estoqueLoteCreateSchema>;
export type EstoqueLoteUpdateInput = z.infer<typeof estoqueLoteUpdateSchema>;

export type DemandaCreateInput = z.infer<typeof demandaCreateSchema>;
export type DemandaUpdateInput = z.infer<typeof demandaUpdateSchema>;
export type DemandaAcaoInput = z.infer<typeof demandaAcaoSchema>;

export type ConfiguracaoInput = z.infer<typeof configuracaoSchema>;
export type ConfiguracaoUpdateInput = z.infer<typeof configuracaoUpdateSchema>;

export type PaginationQuery = z.infer<typeof paginationSchema>;
export type DateRangeQuery = z.infer<typeof dateRangeSchema>;
export type MultiplosProdutosInput = z.infer<typeof multiplosProdutosSchema>;
export type MatrizEstoqueQuery = z.infer<typeof matrizEstoqueQuerySchema>;