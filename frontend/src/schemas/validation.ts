/**
 * Schemas de validação para o frontend usando Zod
 * Garante consistência entre frontend e backend
 */

import { z } from 'zod';

// ============================================================================
// SCHEMAS BÁSICOS E UTILITÁRIOS
// ============================================================================

// Schema para IDs (números positivos)
export const idSchema = z.number().int().positive('ID deve ser um número positivo');

// Schema para strings não vazias
export const nonEmptyStringSchema = z.string().min(1, 'Campo obrigatório').trim();

// Schema para emails
export const emailSchema = z.string().email('Email inválido').toLowerCase();

// Schema para datas (aceita string ISO ou objeto Date)
export const dateSchema = z.union([
    z.string().min(1, 'Data é obrigatória'),
    z.date()
]).transform((val) => {
    if (typeof val === 'string') {
        const date = new Date(val);
        if (isNaN(date.getTime())) {
            throw new Error('Data inválida');
        }
        return date;
    }
    return val;
});

// Schema para quantidades (números não negativos)
export const quantitySchema = z.number().min(0, 'Quantidade não pode ser negativa');

// Schema para preços (números positivos)
export const priceSchema = z.number().positive('Preço deve ser positivo');

// ============================================================================
// SCHEMAS DE AUTENTICAÇÃO
// ============================================================================

export const loginFormSchema = z.object({
    email: emailSchema,
    senha: nonEmptyStringSchema.min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const changePasswordFormSchema = z.object({
    senha_atual: nonEmptyStringSchema,
    nova_senha: nonEmptyStringSchema.min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
    confirmar_senha: nonEmptyStringSchema
}).refine((data) => data.nova_senha === data.confirmar_senha, {
    message: 'Senhas não coincidem',
    path: ['confirmar_senha']
});

// ============================================================================
// SCHEMAS DE USUÁRIO
// ============================================================================

export const userFormSchema = z.object({
    nome: nonEmptyStringSchema.max(100, 'Nome muito longo'),
    email: emailSchema,
    tipo: z.enum(['admin', 'gestor', 'escola']),
    escola_id: z.number().int().positive().optional(),
    ativo: z.boolean().default(true)
});

export const userCreateFormSchema = userFormSchema.extend({
    senha: nonEmptyStringSchema.min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const userUpdateFormSchema = userFormSchema.partial();

// ============================================================================
// SCHEMAS DE PRODUTOS
// ============================================================================

export const produtoFormSchema = z.object({
    nome: nonEmptyStringSchema.max(200, 'Nome muito longo'),
    descricao: z.string().max(500, 'Descrição muito longa').optional(),
    unidade: nonEmptyStringSchema.max(20, 'Unidade muito longa'),
    categoria: nonEmptyStringSchema.max(100, 'Categoria muito longa'),
    ativo: z.boolean().default(true)
});

// ============================================================================
// SCHEMAS DE ESCOLAS
// ============================================================================

export const escolaFormSchema = z.object({
    nome: nonEmptyStringSchema.max(200, 'Nome muito longo'),
    endereco: z.string().max(300, 'Endereço muito longo').optional(),
    telefone: z.string().max(20, 'Telefone muito longo').optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    diretor: z.string().max(100, 'Nome do diretor muito longo').optional(),
    ativo: z.boolean().default(true)
});

// ============================================================================
// SCHEMAS DE ESTOQUE
// ============================================================================

export const movimentacaoEstoqueFormSchema = z.object({
    produto_id: idSchema,
    tipo_movimentacao: z.enum(['entrada', 'saida', 'ajuste']),
    quantidade: quantitySchema,
    motivo: z.string().max(200, 'Motivo muito longo').optional(),
    documento_referencia: z.string().max(100, 'Documento de referência muito longo').optional(),
    data_validade: z.string().optional()
});

export const loteEstoqueFormSchema = z.object({
    lote: nonEmptyStringSchema.max(50, 'Código do lote muito longo'),
    quantidade_inicial: quantitySchema,
    quantidade_atual: quantitySchema,
    data_fabricacao: z.string().optional(),
    data_validade: z.string().optional(),
    fornecedor_id: z.number().int().positive().optional(),
    observacoes: z.string().max(300, 'Observações muito longas').optional()
});

// ============================================================================
// SCHEMAS DE DEMANDAS
// ============================================================================

export const demandaFormSchema = z.object({
    escola_id: idSchema,
    numero_oficio: nonEmptyStringSchema.max(50, 'Número do ofício muito longo'),
    data_solicitacao: z.string().min(1, 'Data de solicitação é obrigatória'),
    objeto: nonEmptyStringSchema.max(200, 'Objeto muito longo'),
    descricao_itens: nonEmptyStringSchema.max(1000, 'Descrição muito longa'),
    observacoes: z.string().max(500, 'Observações muito longas').optional()
});

export const demandaAcaoFormSchema = z.object({
    acao: z.enum(['aprovar', 'recusar', 'atender']),
    motivo_recusa: z.string().max(300, 'Motivo muito longo').optional(),
    data_resposta: z.string().optional(),
    observacoes: z.string().max(500, 'Observações muito longas').optional()
}).refine((data) => {
    if (data.acao === 'recusar' && !data.motivo_recusa?.trim()) {
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

export const configuracaoFormSchema = z.object({
    chave: nonEmptyStringSchema.max(100, 'Chave muito longa'),
    valor: z.string().max(1000, 'Valor muito longo'),
    descricao: z.string().max(300, 'Descrição muito longa').optional(),
    tipo: z.enum(['string', 'number', 'boolean', 'json']).default('string')
});

// ============================================================================
// SCHEMAS DE FILTROS E BUSCA
// ============================================================================

export const filtroEstoqueSchema = z.object({
    search: z.string().optional(),
    categoria: z.string().optional(),
    status: z.enum(['todos', 'com_estoque', 'sem_estoque', 'baixo_estoque']).optional(),
    data_inicio: z.string().optional(),
    data_fim: z.string().optional()
});

export const paginacaoSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('asc')
});

// ============================================================================
// SCHEMAS PARA FORMULÁRIOS ESPECÍFICOS
// ============================================================================

export const resetEstoqueFormSchema = z.object({
    confirmacao: z.literal(true),
    motivo: nonEmptyStringSchema.max(200, 'Motivo muito longo'),
    backup: z.boolean().default(true)
});

export const importacaoEstoqueSchema = z.object({
    arquivo: z.instanceof(File, { message: 'Arquivo é obrigatório' }),
    sobrescrever: z.boolean().default(false),
    validar_apenas: z.boolean().default(false)
});

// ============================================================================
// TIPOS TYPESCRIPT DERIVADOS DOS SCHEMAS
// ============================================================================

export type LoginFormData = z.infer<typeof loginFormSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;

export type UserFormData = z.infer<typeof userFormSchema>;
export type UserCreateFormData = z.infer<typeof userCreateFormSchema>;
export type UserUpdateFormData = z.infer<typeof userUpdateFormSchema>;

export type ProdutoFormData = z.infer<typeof produtoFormSchema>;
export type EscolaFormData = z.infer<typeof escolaFormSchema>;

export type MovimentacaoEstoqueFormData = z.infer<typeof movimentacaoEstoqueFormSchema>;
export type LoteEstoqueFormData = z.infer<typeof loteEstoqueFormSchema>;

export type DemandaFormData = z.infer<typeof demandaFormSchema>;
export type DemandaAcaoFormData = z.infer<typeof demandaAcaoFormSchema>;

export type ConfiguracaoFormData = z.infer<typeof configuracaoFormSchema>;
export type FiltroEstoqueData = z.infer<typeof filtroEstoqueSchema>;
export type PaginacaoData = z.infer<typeof paginacaoSchema>;

export type ResetEstoqueFormData = z.infer<typeof resetEstoqueFormSchema>;
export type ImportacaoEstoqueData = z.infer<typeof importacaoEstoqueSchema>;

// ============================================================================
// UTILITÁRIOS DE VALIDAÇÃO
// ============================================================================

/**
 * Função helper para validar dados de formulário
 */
export function validateFormData<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    errors?: Record<string, string[]>;
} {
    try {
        const validatedData = schema.parse(data);
        return {
            success: true,
            data: validatedData
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formattedErrors: Record<string, string[]> = {};

            error.issues.forEach((err) => {
                const path = err.path.join('.');
                if (!formattedErrors[path]) {
                    formattedErrors[path] = [];
                }
                formattedErrors[path].push(err.message);
            });

            return {
                success: false,
                errors: formattedErrors
            };
        }

        return {
            success: false,
            errors: { general: ['Erro de validação desconhecido'] }
        };
    }
}

/**
 * Função helper para validar dados de forma assíncrona
 */
export async function validateFormDataAsync<T>(schema: z.ZodSchema<T>, data: unknown): Promise<{
    success: boolean;
    data?: T;
    errors?: Record<string, string[]>;
}> {
    try {
        const validatedData = await schema.parseAsync(data);
        return {
            success: true,
            data: validatedData
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formattedErrors: Record<string, string[]> = {};

            error.issues.forEach((err) => {
                const path = err.path.join('.');
                if (!formattedErrors[path]) {
                    formattedErrors[path] = [];
                }
                formattedErrors[path].push(err.message);
            });

            return {
                success: false,
                errors: formattedErrors
            };
        }

        return {
            success: false,
            errors: { general: ['Erro de validação desconhecido'] }
        };
    }
}