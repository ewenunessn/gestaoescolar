import { Router } from 'express';
import { sistemaRobustoController } from '../controllers/sistemaRobustoController';

const router = Router();

// ==================== AUDITORIA ====================

/**
 * @route GET /api/sistema-robusto/auditoria
 * @desc Busca registros de auditoria
 * @access Private
 * @query {string} [tabela] - Filtrar por tabela
 * @query {string} [operacao] - Filtrar por operação (INSERT, UPDATE, DELETE)
 * @query {number} [registro_id] - Filtrar por ID do registro
 * @query {number} [usuario_id] - Filtrar por ID do usuário
 * @query {string} [data_inicio] - Data de início (ISO string)
 * @query {string} [data_fim] - Data de fim (ISO string)
 * @query {number} [page=1] - Página
 * @query {number} [limit=50] - Limite por página
 */
router.get('/auditoria', sistemaRobustoController.buscarAuditoria);

/**
 * @route GET /api/sistema-robusto/auditoria/:tabela/:registro_id
 * @desc Busca auditoria de um registro específico
 * @access Private
 * @param {string} tabela - Nome da tabela
 * @param {number} registro_id - ID do registro
 */
router.get('/auditoria/:tabela/:registro_id', sistemaRobustoController.buscarAuditoriaRegistro);

// ==================== PERFORMANCE ====================

/**
 * @route GET /api/sistema-robusto/performance
 * @desc Busca logs de performance
 * @access Private
 * @query {string} [operacao] - Filtrar por operação
 * @query {string} [tabela] - Filtrar por tabela
 * @query {number} [tempo_minimo_ms] - Tempo mínimo em ms
 * @query {string} [status] - Status (SUCESSO, ERRO, TIMEOUT)
 * @query {string} [data_inicio] - Data de início
 * @query {string} [data_fim] - Data de fim
 * @query {number} [page=1] - Página
 * @query {number} [limit=50] - Limite por página
 */
router.get('/performance', sistemaRobustoController.buscarPerformance);

/**
 * @route GET /api/sistema-robusto/performance/estatisticas
 * @desc Busca estatísticas de performance
 * @access Private
 * @query {string} [data_inicio] - Data de início
 * @query {string} [data_fim] - Data de fim
 */
router.get('/performance/estatisticas', sistemaRobustoController.estatisticasPerformance);

// ==================== CONFIGURAÇÃO ====================

/**
 * @route GET /api/sistema-robusto/configuracao/:chave
 * @desc Busca configuração do sistema
 * @access Private
 * @param {string} chave - Chave da configuração
 */
router.get('/configuracao/:chave', sistemaRobustoController.getConfiguracao);

/**
 * @route PUT /api/sistema-robusto/configuracao/:chave
 * @desc Define configuração do sistema
 * @access Private
 * @param {string} chave - Chave da configuração
 * @body {string} valor - Valor da configuração
 * @body {string} [descricao] - Descrição da configuração
 * @body {string} [tipo=STRING] - Tipo (STRING, INTEGER, REAL, BOOLEAN, JSON)
 */
router.put('/configuracao/:chave', sistemaRobustoController.setConfiguracao);

// ==================== INTEGRIDADE ====================

/**
 * @route GET /api/sistema-robusto/integridade
 * @desc Valida integridade do sistema
 * @access Private
 */
router.get('/integridade', sistemaRobustoController.validarIntegridade);

// ==================== MANUTENÇÃO ====================

/**
 * @route POST /api/sistema-robusto/manutencao/limpar-logs
 * @desc Limpa logs antigos baseado na configuração de retenção
 * @access Private
 */
router.post('/manutencao/limpar-logs', sistemaRobustoController.limparLogsAntigos);

/**
 * @route POST /api/sistema-robusto/manutencao/backup
 * @desc Cria backup do banco de dados
 * @access Private
 * @body {string} [caminho_destino] - Caminho de destino do backup
 */
router.post('/manutencao/backup', sistemaRobustoController.criarBackup);

/**
 * @route POST /api/sistema-robusto/manutencao/otimizar
 * @desc Otimiza o banco de dados
 * @access Private
 */
router.post('/manutencao/otimizar', sistemaRobustoController.otimizarBanco);

// ==================== CONFIGURAÇÃO ROBUSTA ====================

/**
 * @route GET /api/sistema-robusto/config/:modulo/:chave
 * @desc Obter configuração específica do sistema robusto
 * @access Private
 * @param {string} modulo - Módulo da configuração
 * @param {string} chave - Chave da configuração
 */
router.get('/config/:modulo/:chave', sistemaRobustoController.obterConfiguracaoRobusta);

/**
 * @route POST /api/sistema-robusto/config
 * @desc Definir configuração do sistema robusto
 * @access Private
 * @body {string} modulo - Módulo da configuração
 * @body {string} chave - Chave da configuração
 * @body {string} valor - Valor da configuração
 */
router.post('/config', sistemaRobustoController.definirConfiguracaoRobusta);

// ==================== CONSISTÊNCIA ====================

/**
 * @route POST /api/sistema-robusto/consistencia/verificar
 * @desc Executar verificação de consistência completa
 * @access Private
 */
router.post('/consistencia/verificar', sistemaRobustoController.verificarConsistenciaCompleta);

// ==================== MANUTENÇÃO ROBUSTA ====================

/**
 * @route POST /api/sistema-robusto/manutencao/limpar-logs-robusta
 * @desc Executar limpeza de logs do sistema robusto
 * @access Private
 */
router.post('/manutencao/limpar-logs-robusta', sistemaRobustoController.executarLimpezaLogsRobusta);

// ==================== ALERTAS ====================

/**
 * @route GET /api/sistema-robusto/alertas
 * @desc Obter alertas do sistema robusto
 * @access Private
 * @query {string} [prioridade] - Filtrar por prioridade
 */
router.get('/alertas', sistemaRobustoController.obterAlertasRobustos);

// ==================== DASHBOARD ====================

/**
 * @route GET /api/sistema-robusto/dashboard
 * @desc Dashboard do sistema robusto
 * @access Private
 * @query {string} [data_inicio] - Data de início para filtros
 * @query {string} [data_fim] - Data de fim para filtros
 */
router.get('/dashboard', sistemaRobustoController.dashboard);

/**
 * @route GET /api/sistema-robusto/dashboard/completo
 * @desc Dashboard executivo completo do sistema robusto
 * @access Private
 */
router.get('/dashboard/completo', sistemaRobustoController.dashboardCompleto);

// ==================== RELATÓRIOS ====================

/**
 * @route GET /api/sistema-robusto/relatorios/uso
 * @desc Relatório de uso do sistema
 * @access Private
 * @query {string} [data_inicio] - Data de início
 * @query {string} [data_fim] - Data de fim
 */
router.get('/relatorios/uso', sistemaRobustoController.relatorioUso);

export default router;