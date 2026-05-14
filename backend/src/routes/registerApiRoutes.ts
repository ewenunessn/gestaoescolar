import type { Express } from "express";

import userRoutes from "../modules/usuarios/routes/userRoutes";
import adminUsuariosRoutes from "../modules/usuarios/routes/adminUsuariosRoutes";

import permissaoRoutes from "../modules/sistema/routes/permissoesRoutes";
import refeicaoProdutoModalidadeRoutes from "../modules/nutricao/routes/refeicaoProdutoModalidadeRoutes";
import refeicaoCalculosRoutes from "../modules/nutricao/routes/refeicaoCalculosRoutes";
import escolaRoutes from "../modules/escolas/routes/escolaRoutes";
import modalidadeRoutes from "../modules/cardapios/routes/modalidadeRoutes";
import escolaModalidadeRoutes from "../modules/guias/routes/escolaModalidadeRoutes";
import fornecedorRoutes from "../modules/contratos/routes/fornecedorRoutes";
import contratoRoutes from "../modules/contratos/routes/contratoRoutes";
import contratoProdutoRoutes from "../modules/contratos/routes/contratoProdutoRoutes";
import refeicaoRoutes from "../modules/cardapios/routes/refeicaoRoutes";
import refeicaoProdutoRoutes from "../modules/cardapios/routes/refeicaoProdutoRoutes";
import cardapioRoutes from "../modules/cardapios/routes/cardapioRoutes";
import tipoRefeicaoRoutes from "../modules/cardapios/routes/tipoRefeicaoRoutes";
import produtoRoutes from "../modules/produtos/routes/produtoRoutes";
import produtoModalidadeRoutes from "../modules/estoque/routes/produtoModalidadeRoutes";
import estoqueCentralRoutes from "../modules/estoque/routes/estoqueCentralRoutes";
import estoqueEscolarRoutes from "../modules/estoque/routes/estoqueEscolarRoutes";
import saldoContratosModalidadesRoutes from "../modules/contratos/routes/saldoContratosModalidadesRoutes";
import guiaRoutes from "../modules/guias/routes/guiaRoutes";
import entregaRoutes from "../modules/entregas/routes/entregaRoutes";
import rotaRoutes from "../modules/entregas/routes/rotaRoutes";
import compraRoutes from "../modules/compras/routes/compraRoutes";
import faturamentoRoutes from "../modules/faturamentos/routes/faturamentoRoutes";
import demandasRoutes from "../modules/demandas/routes/demandaRoutes";
import recebimentoRoutes from "../modules/recebimentos/routes/recebimentoRoutes";
import instituicaoRoutes from "../modules/sistema/routes/instituicao";
import pnaeRoutes from "../modules/sistema/routes/pnaeRoutes";
import nutricionistaRoutes from "../modules/nutricao/routes/nutricionistaRoutes";
import planejamentoComprasRoutes from "../modules/compras/routes/planejamentoComprasRoutes";
import periodosRoutes from "../modules/sistema/routes/periodosRoutes";
import escolaPortalRoutes from "../modules/portal-escola/routes/escolaPortalRoutes";
import calendarioLetivoRoutes from "../modules/sistema/routes/calendarioLetivoRoutes";
import tacoRoutes from "../modules/nutricao/routes/tacoRoutes";
import gruposIngredientesRoutes from "../modules/nutricao/routes/gruposIngredientesRoutes";
import solicitacoesAlimentosRoutes from "../modules/solicitacoes/routes/solicitacoesAlimentosRoutes";
import dashboardRoutes from "../modules/sistema/routes/dashboardRoutes";
import notificacoesRoutes from "../modules/sistema/routes/notificacoesRoutes";
import disparosNotificacaoRoutes from "../modules/sistema/routes/disparosNotificacaoRoutes";
import unidadeMedidaRoutes from "../modules/unidades/routes/unidadeMedidaRoutes";
import realtimeRoutes from "../modules/sistema/routes/realtimeRoutes";
import chatbotRoutes from "../modules/chatbot/routes/chatbotRoutes";
import architectureRoutes from "../architecture/architectureRoutes";

function route(prefix: string, path = ""): string {
  return `${prefix}${path}`;
}

export function registerApiRoutes(app: Express, prefix = "/api"): void {
  app.use(route(prefix, "/usuarios"), userRoutes);
  app.use(route(prefix, "/auth"), userRoutes);
  app.use(route(prefix, "/permissoes"), permissaoRoutes);
  app.use(route(prefix, "/admin"), adminUsuariosRoutes);

  app.use(route(prefix, "/escolas"), escolaRoutes);
  app.use(route(prefix, "/modalidades"), modalidadeRoutes);
  app.use(route(prefix, "/escola-modalidades"), escolaModalidadeRoutes);
  app.use(route(prefix, "/fornecedores"), fornecedorRoutes);
  app.use(route(prefix, "/contratos"), contratoRoutes);
  app.use(route(prefix, "/contrato-produtos"), contratoProdutoRoutes);

  app.use(route(prefix, "/refeicoes"), refeicaoRoutes);
  app.use(route(prefix, "/refeicao-produtos"), refeicaoProdutoRoutes);
  app.use(route(prefix, "/refeicao-produto-modalidade"), refeicaoProdutoModalidadeRoutes);
  app.use(route(prefix), refeicaoCalculosRoutes);
  app.use(route(prefix, "/cardapios"), cardapioRoutes);
  app.use(route(prefix, "/tipos-refeicao"), tipoRefeicaoRoutes);
  app.use(route(prefix, "/nutricionistas"), nutricionistaRoutes);
  app.use(route(prefix, "/produtos"), produtoRoutes);
  app.use(route(prefix, "/produto-modalidades"), produtoModalidadeRoutes);
  app.use(route(prefix, "/unidades-medida"), unidadeMedidaRoutes);
  app.use(route(prefix, "/estoque-central"), estoqueCentralRoutes);
  app.use(route(prefix, "/estoque-escolar"), estoqueEscolarRoutes);

  app.use(route(prefix, "/saldo-contratos-modalidades"), saldoContratosModalidadesRoutes);
  app.use(route(prefix, "/guias"), guiaRoutes);
  app.use(route(prefix, "/entregas"), entregaRoutes);
  app.use(route(prefix, "/entregas"), rotaRoutes);
  app.use(route(prefix, "/compras"), compraRoutes);
  app.use(route(prefix, "/faturamentos"), faturamentoRoutes);
  app.use(route(prefix, "/demandas"), demandasRoutes);
  app.use(route(prefix, "/recebimentos"), recebimentoRoutes);
  app.use(route(prefix, "/instituicao"), instituicaoRoutes);
  app.use(route(prefix, "/pnae"), pnaeRoutes);
  app.use(route(prefix, "/planejamento-compras"), planejamentoComprasRoutes);
  app.use(route(prefix, "/periodos"), periodosRoutes);
  app.use(route(prefix, "/escola-portal"), escolaPortalRoutes);
  app.use(route(prefix), calendarioLetivoRoutes);
  app.use(route(prefix, "/taco"), tacoRoutes);
  app.use(route(prefix, "/grupos-ingredientes"), gruposIngredientesRoutes);
  app.use(route(prefix, "/solicitacoes-alimentos"), solicitacoesAlimentosRoutes);
  app.use(route(prefix, "/dashboard"), dashboardRoutes);
  app.use(route(prefix, "/notificacoes"), notificacoesRoutes);
  app.use(route(prefix, "/disparos-notificacao"), disparosNotificacaoRoutes);
  app.use(route(prefix), realtimeRoutes);
  app.use(route(prefix, "/chatbot"), chatbotRoutes);
  app.use(route(prefix, "/architecture"), architectureRoutes);
}
