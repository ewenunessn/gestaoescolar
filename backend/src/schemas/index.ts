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
  motivo: z.string().max(200, 'Motivo muito longo').optional(),
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
// SCHEMAS DE TENANT
// ============================================================================

// Schema para slug de tenant (URL-friendly)
export const tenantSlugSchema = z.string()
  .min(3, 'Slug deve ter pelo menos 3 caracteres')
  .max(50, 'Slug deve ter no máximo 50 caracteres')
  .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens');

// Schema para subdomain de tenant
export const tenantSubdomainSchema = z.string()
  .min(3, 'Subdomínio deve ter pelo menos 3 caracteres')
  .max(50, 'Subdomínio deve ter no máximo 50 caracteres')
  .regex(/^[a-z0-9-]+$/, 'Subdomínio deve conter apenas letras minúsculas, números e hífens');

// Schema para configurações de tenant
export const tenantSettingsSchema = z.object({
  features: z.object({
    inventory: z.boolean().default(true),
    contracts: z.boolean().default(true),
    deliveries: z.boolean().default(true),
    reports: z.boolean().default(true),
    mobile: z.boolean().default(true),
    analytics: z.boolean().default(false)
  }).default({}),
  branding: z.object({
    logo: z.string().url().optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal').optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal').optional(),
    favicon: z.string().url().optional(),
    customCss: z.string().max(10000, 'CSS customizado muito longo').optional()
  }).default({}),
  notifications: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    push: z.boolean().default(true)
  }).default({}),
  integrations: z.object({
    whatsapp: z.boolean().default(false),
    email: z.boolean().default(true),
    sms: z.boolean().default(false)
  }).default({})
});

// Schema para limites de tenant
export const tenantLimitsSchema = z.object({
  maxUsers: z.number().int().min(1).max(10000).default(100),
  maxSchools: z.number().int().min(1).max(1000).default(50),
  maxProducts: z.number().int().min(1).max(50000).default(1000),
  storageLimit: z.number().int().min(100).max(100000).default(1024), // MB
  apiRateLimit: z.number().int().min(10).max(10000).default(100), // requests per minute
  maxContracts: z.number().int().min(1).max(1000).default(50),
  maxOrders: z.number().int().min(1).max(10000).default(1000)
});

// Schema para criação de tenant
export const tenantCreateSchema = z.object({
  slug: tenantSlugSchema,
  name: nonEmptyStringSchema.max(255, 'Nome muito longo'),
  domain: z.string().url().optional(),
  subdomain: tenantSubdomainSchema.optional(),
  settings: tenantSettingsSchema.optional(),
  limits: tenantLimitsSchema.optional()
});

// Schema para atualização de tenant
export const tenantUpdateSchema = z.object({
  name: nonEmptyStringSchema.max(255, 'Nome muito longo').optional(),
  domain: z.string().url().optional().nullable(),
  subdomain: tenantSubdomainSchema.optional().nullable(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  settings: tenantSettingsSchema.optional(),
  limits: tenantLimitsSchema.optional()
});

// Schema para associação de usuário com tenant
export const tenantUserCreateSchema = z.object({
  tenantId: z.string().uuid('ID do tenant inválido'),
  userId: idSchema,
  role: z.enum(['tenant_admin', 'user', 'viewer']).default('user'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active')
});

// Schema para atualização de usuário do tenant
export const tenantUserUpdateSchema = z.object({
  role: z.enum(['tenant_admin', 'user', 'viewer']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
});

// Schema para configuração de tenant
export const tenantConfigurationCreateSchema = z.object({
  tenantId: z.string().uuid('ID do tenant inválido'),
  category: nonEmptyStringSchema.max(100, 'Categoria muito longa'),
  key: nonEmptyStringSchema.max(100, 'Chave muito longa'),
  value: z.any()
});

// Schema para atualização de configuração de tenant
export const tenantConfigurationUpdateSchema = z.object({
  value: z.any()
});

// Schema para provisioning de tenant
export const tenantProvisioningSchema = z.object({
  tenant: tenantCreateSchema,
  adminUser: z.object({
    nome: nonEmptyStringSchema.max(100, 'Nome muito longo'),
    email: emailSchema,
    senha: nonEmptyStringSchema.min(6, 'Senha deve ter pelo menos 6 caracteres')
  }),
  initialData: z.object({
    schools: z.array(z.any()).optional(),
    products: z.array(z.any()).optional(),
    users: z.array(z.any()).optional()
  }).optional()
});

// Schema para resolução de tenant
export const tenantResolutionSchema = z.object({
  method: z.enum(['subdomain', 'header', 'token', 'domain']),
  identifier: nonEmptyStringSchema
});

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

export type TenantCreateInput = z.infer<typeof tenantCreateSchema>;
export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>;
export type TenantUserCreateInput = z.infer<typeof tenantUserCreateSchema>;
export type TenantUserUpdateInput = z.infer<typeof tenantUserUpdateSchema>;
export type TenantConfigurationCreateInput = z.infer<typeof tenantConfigurationCreateSchema>;
export type TenantConfigurationUpdateInput = z.infer<typeof tenantConfigurationUpdateSchema>;
export type TenantProvisioningInput = z.infer<typeof tenantProvisioningSchema>;
export type TenantResolutionInput = z.infer<typeof tenantResolutionSchema>;