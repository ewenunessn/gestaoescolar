import type { Express } from "express";

import chatbotRoutes from "../modules/chatbot/routes/chatbotRoutes";
import dashboardRoutes from "../modules/sistema/routes/dashboardRoutes";
import entregaRoutes from "../modules/entregas/routes/entregaRoutes";
import escolaPortalRoutes from "../modules/portal-escola/routes/escolaPortalRoutes";
import estoqueCentralRoutes from "../modules/estoque/routes/estoqueCentralRoutes";
import estoqueEscolaLegacyRoutes from "../modules/estoque/routes/estoqueEscolaLegacyRoutes";
import estoqueEscolarRoutes from "../modules/estoque/routes/estoqueEscolarRoutes";
import notificacoesRoutes from "../modules/sistema/routes/notificacoesRoutes";
import realtimeRoutes from "../modules/sistema/routes/realtimeRoutes";
import recebimentoRoutes from "../modules/recebimentos/routes/recebimentoRoutes";
import rotaRoutes from "../modules/entregas/routes/rotaRoutes";
import solicitacoesAlimentosRoutes from "../modules/solicitacoes/routes/solicitacoesAlimentosRoutes";
import userRoutes from "../modules/usuarios/routes/userRoutes";
import produtoRoutes from "../modules/produtos/routes/produtoRoutes";
import escolaRoutes from "../modules/escolas/routes/escolaRoutes";
import { registerApiRoutes } from "../routes/registerApiRoutes";

export function registerBffRoutes(app: Express): void {
  registerApiRoutes(app, "/bff/web");

  app.use("/bff/web/dashboard", dashboardRoutes);
  app.use("/bff/web/notificacoes", notificacoesRoutes);
  app.use("/bff/web/realtime", realtimeRoutes);

  app.use("/bff/app/auth", userRoutes);
  app.use("/bff/app/produtos", produtoRoutes);
  app.use("/bff/app/escolas", escolaRoutes);
  app.use("/bff/app/entregas", entregaRoutes);
  app.use("/bff/app/entregas", rotaRoutes);
  app.use("/bff/app/estoque-central", estoqueCentralRoutes);
  app.use("/bff/app/estoque-escolar", estoqueEscolarRoutes);
  app.use("/bff/app/recebimentos", recebimentoRoutes);
  app.use("/bff/app/realtime", realtimeRoutes);

  app.use("/bff/portal/auth", userRoutes);
  app.use("/bff/portal/produtos", produtoRoutes);
  app.use("/bff/portal/escolas", escolaRoutes);
  app.use("/bff/portal/escola", escolaPortalRoutes);
  app.use("/bff/portal/solicitacoes-alimentos", solicitacoesAlimentosRoutes);
  app.use("/bff/portal/estoque-escola", estoqueEscolaLegacyRoutes);
  app.use("/bff/portal/estoque-escolar", estoqueEscolarRoutes);
  app.use("/bff/portal/realtime", realtimeRoutes);

  app.use("/bff/chatbot/auth", userRoutes);
  app.use("/bff/chatbot", chatbotRoutes);
}
