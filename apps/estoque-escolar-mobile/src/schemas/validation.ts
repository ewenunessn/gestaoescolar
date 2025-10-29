/**
 * Schemas de validação para o mobile app usando Zod
 * Garante robustez na validação de dados do app mobile
 */

import { z } from 'zod';

// ============================================================================
// SCHEMAS BÁSICOS E UTILITÁRIOS
// ============================================================================

// Schema para IDs (números positivos)
export const idSchema = z.number().int().positive('ID deve ser um número positivo');

// Schema para strings não vazias
export const nonEmptyStringSchema = z.string().min(1, 'Campo obrigatório').trim();

// Schema para quantidades (números não negativos)
export const quantitySchema = z.number().min(0, 'Quantidade não pode ser negativa');

// Schema para datas (aceita string no formato YYYY-MM-DD)
export const dateStringSchema = z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Data deve estar no formato YYYY-MM-DD'
);

// Schema para datas opcionais
export const optionalDateStringSchema = dateStringSchema.optional().nullable();

// ============================================================================
// SCHEMAS DE AUTENTICAÇÃO
// ============================================================================

export const loginSchema = z.object({
    email: z.string().email('Email inválido').toLowerCase(),
    senha: nonEmptyStringSchema.min(6, 'Senha deve ter pelo menos 6 caracteres')
});

// ============================================================================
// SCHEMAS DE MOVIMENTAÇÃO DE ESTOQUE
// ============================================================================

export const movimentacaoEstoqueSchema = z.object({
    produto_id: idSchema,
    tipo_movimentacao: z.enum(['entrada', 'saida', 'ajuste'], {
        errorMap: () => ({ message: 'Tipo de movimentação inválido' })
    }),
    quantidade: quantitySchema,
    motivo: nonEmptyStringSchema.max(200, 'Motivo muito longo'),
    documento_referencia: z.string().max(100, 'Documento muito longo').optional(),
    data_validade: optionalDateStringSchema
});

// ============================================================================
// SCHEMAS DE LOTES
// ============================================================================

export const loteEstoqueSchema = z.object({
    lote: nonEmptyStringSchema.max(50, 'Código do lote muito longo'),
    quantidade_inicial: quantitySchema,
    quantidade_atual: quantitySchema,
    data_fabricacao: optionalDateStringSchema,
    data_validade: optionalDateStringSchema,
    fornecedor_id: z.number().int().positive().optional(),
    observacoes: z.string().max(300, 'Observações muito longas').optional()
});

export const movimentoLoteSchema = z.object({
    lote_id: idSchema,
    tipo_movimento: z.enum(['entrada', 'saida'], {
        errorMap: () => ({ message: 'Tipo de movimento inválido' })
    }),
    quantidade: quantitySchema,
    motivo: nonEmptyStringSchema.max(200, 'Motivo muito longo'),
    data_movimento: dateStringSchema
});

// ============================================================================
// SCHEMAS DE ENTRADA SIMPLES
// ============================================================================

export const entradaSimplesSchema = z.object({
    produto_id: idSchema,
    quantidade: quantitySchema,
    data_validade: optionalDateStringSchema,
    lote: z.string().max(50, 'Código do lote muito longo').optional(),
    observacoes: z.string().max(300, 'Observações muito longas').optional()
});

// ============================================================================
// SCHEMAS DE SAÍDA INTELIGENTE
// ============================================================================

export const saidaInteligenteSchema = z.object({
    produto_id: idSchema,
    quantidade_solicitada: quantitySchema,
    estrategia: z.enum(['fifo', 'fefo', 'manual'], {
        errorMap: () => ({ message: 'Estratégia inválida' })
    }).default('fefo'),
    motivo: nonEmptyStringSchema.max(200, 'Motivo muito longo'),
    lotes_manuais: z.array(z.object({
        lote_id: idSchema,
        quantidade: quantitySchema
    })).optional()
});

// ============================================================================
// SCHEMAS DE FILTROS
// ============================================================================

export const filtroValidadeSchema = z.object({
    status: z.enum(['todos', 'vencidos', 'criticos', 'atencao', 'normais']).default('todos'),
    dias_vencimento: z.number().int().min(0).max(365).optional(),
    produto_id: z.number().int().positive().optional(),
    ordenacao: z.enum(['data_validade', 'produto_nome', 'quantidade']).default('data_validade')
});

export const filtroEstoqueSchema = z.object({
    search: z.string().optional(),
    categoria: z.string().optional(),
    status_estoque: z.enum(['todos', 'com_estoque', 'sem_estoque', 'baixo_estoque']).default('todos'),
    ordenacao: z.enum(['nome', 'categoria', 'quantidade', 'validade']).default('nome')
});

// ============================================================================
// SCHEMAS DE SINCRONIZAÇÃO
// ============================================================================

export const sincronizacaoSchema = z.object({
    ultima_sincronizacao: z.string().datetime().optional(),
    forcar_sincronizacao: z.boolean().default(false),
    apenas_validar: z.boolean().default(false)
});

// ============================================================================
// SCHEMAS DE CONFIGURAÇÃO LOCAL
// ============================================================================

export const configuracaoLocalSchema = z.object({
    escola_id: idSchema,
    nome_escola: nonEmptyStringSchema,
    servidor_url: z.string().url('URL do servidor inválida'),
    token_acesso: z.string().optional(),
    sincronizacao_automatica: z.boolean().default(true),
    intervalo_sincronizacao: z.number().int().min(1).max(60).default(5), // minutos
    modo_offline: z.boolean().default(false)
});

// ============================================================================
// SCHEMAS DE RELATÓRIOS
// ============================================================================

export const relatorioValidadeSchema = z.object({
    data_inicio: dateStringSchema,
    data_fim: dateStringSchema,
    incluir_vencidos: z.boolean().default(true),
    incluir_criticos: z.boolean().default(true),
    incluir_atencao: z.boolean().default(false),
    formato: z.enum(['pdf', 'excel', 'csv']).default('pdf')
}).refine((data) => {
    return new Date(data.data_inicio) <= new Date(data.data_fim);
}, {
    message: 'Data de início deve ser anterior à data de fim',
    path: ['data_fim']
});

export const relatorioEstoqueSchema = z.object({
    incluir_sem_estoque: z.boolean().default(false),
    incluir_baixo_estoque: z.boolean().default(true),
    agrupar_por_categoria: z.boolean().default(true),
    formato: z.enum(['pdf', 'excel', 'csv']).default('pdf')
});

// ============================================================================
// TIPOS TYPESCRIPT DERIVADOS DOS SCHEMAS
// ============================================================================

export type LoginData = z.infer<typeof loginSchema>;
export type MovimentacaoEstoqueData = z.infer<typeof movimentacaoEstoqueSchema>;
export type LoteEstoqueData = z.infer<typeof loteEstoqueSchema>;
export type MovimentoLoteData = z.infer<typeof movimentoLoteSchema>;
export type EntradaSimplesData = z.infer<typeof entradaSimplesSchema>;
export type SaidaInteligenteData = z.infer<typeof saidaInteligenteSchema>;
export type FiltroValidadeData = z.infer<typeof filtroValidadeSchema>;
export type FiltroEstoqueData = z.infer<typeof filtroEstoqueSchema>;
export type SincronizacaoData = z.infer<typeof sincronizacaoSchema>;
export type ConfiguracaoLocalData = z.infer<typeof configuracaoLocalSchema>;
export type RelatorioValidadeData = z.infer<typeof relatorioValidadeSchema>;
export type RelatorioEstoqueData = z.infer<typeof relatorioEstoqueSchema>;

// ============================================================================
// UTILITÁRIOS DE VALIDAÇÃO
// ============================================================================

/**
 * Função helper para validar dados
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    errors?: string[];
} {
    try {
        const validatedData = schema.parse(data);
        return {
            success: true,
            data: validatedData
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map(err => err.message);
            return {
                success: false,
                errors: errorMessages
            };
        }

        return {
            success: false,
            errors: ['Erro de validação desconhecido']
        };
    }
}

/**
 * Função helper para validar dados de forma assíncrona
 */
export async function validateDataAsync<T>(schema: z.ZodSchema<T>, data: unknown): Promise<{
    success: boolean;
    data?: T;
    errors?: string[];
}> {
    try {
        const validatedData = await schema.parseAsync(data);
        return {
            success: true,
            data: validatedData
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map(err => err.message);
            return {
                success: false,
                errors: errorMessages
            };
        }

        return {
            success: false,
            errors: ['Erro de validação desconhecido']
        };
    }
}

/**
 * Validar quantidade com base no tipo de movimentação
 */
export function validateQuantidadeMovimentacao(
    tipo: 'entrada' | 'saida' | 'ajuste',
    quantidade: number,
    estoqueAtual: number = 0
): { valid: boolean; message?: string } {
    if (quantidade <= 0) {
        return { valid: false, message: 'Quantidade deve ser maior que zero' };
    }

    if (tipo === 'saida' && quantidade > estoqueAtual) {
        return {
            valid: false,
            message: `Quantidade insuficiente em estoque. Disponível: ${estoqueAtual}`
        };
    }

    return { valid: true };
}

/**
 * Validar data de validade
 */
export function validateDataValidade(dataValidade: string): { valid: boolean; message?: string } {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const validade = new Date(dataValidade);
    validade.setHours(0, 0, 0, 0);

    if (validade < hoje) {
        return { valid: false, message: 'Data de validade não pode ser anterior a hoje' };
    }

    // Avisar se a validade é muito próxima (menos de 7 dias)
    const diffDays = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
        return {
            valid: true,
            message: `Atenção: Produto vencerá em ${diffDays} dia(s)`
        };
    }

    return { valid: true };
}