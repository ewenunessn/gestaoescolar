import { Suspense, lazy, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { isAuthenticated } from "../services/auth";
import LayoutModerno from "../components/LayoutModerno";
import PermissionGuard from "../components/PermissionGuard";
import { EscolasProvider } from "../contexts/EscolasContext";
import { desktopSans } from "../theme/theme";

// Componentes críticos carregados imediatamente (páginas públicas)
import Login from "../pages/Login";
import LoginWrapper from "../components/LoginWrapper";
import LandingPage from "../pages/LandingPage";
import InterestForm from "../pages/InterestForm";

// Módulos - carregados imediatamente
import Dashboard from "../modules/sistema/pages/Dashboard";
import CardapioPublico from "../modules/cardapios/pages/CardapioPublico";

// Componente de loading
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: 200,
    }}
  >
    <Typography sx={{ fontSize: '0.95rem', color: 'text.secondary', fontFamily: desktopSans }}>
      Carregando...
    </Typography>
  </Box>
);

// Redireciona para a rota inicial correta conforme tipo de usuário
function RootRedirect() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Detectar se é usuário de escola pelo token JWT (sem chamada de API)
  try {
    const token = localStorage.getItem('token');

    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isEscolaUser = !!(payload.escola_id && payload.tipo !== 'admin' && !payload.isSystemAdmin);

      if (isEscolaUser) {
        return <Navigate to="/portal-escola" replace />;
      }
    }
  } catch (e) {
    console.error('Erro ao decodificar token:', e);
  }

  return <Navigate to="/dashboard" replace />;
}

// Lazy loading - Módulo: escolas
const Escolas = lazy(() => import("../modules/escolas/pages/Escolas"));
const EscolaDetalhes = lazy(() => import("../modules/escolas/pages/EscolaDetalhes"));
const GerenciarAlunosModalidades = lazy(() => import("../modules/escolas/pages/GerenciarAlunosModalidades"));
const RelatorioAlunosModalidades = lazy(() => import("../modules/escolas/pages/RelatorioAlunosModalidades"));
const GerenciarEscolasRota = lazy(() => import("../modules/escolas/pages/GerenciarEscolasRota"));

// Lazy loading - Módulo: portal-escola (separado do módulo escolas)
const PortalEscolaHome = lazy(() => import("../modules/portal-escola/pages/PortalEscolaHome"));
const CardapioPage = lazy(() => import("../modules/portal-escola/pages/CardapioPage"));
const SolicitacoesPage = lazy(() => import("../modules/portal-escola/pages/SolicitacoesPage"));
const ComprovantesPage = lazy(() => import("../modules/portal-escola/pages/ComprovantesPage"));
const AlunosPage = lazy(() => import("../modules/portal-escola/pages/AlunosPage"));

// Lazy loading - Módulo: sistema
const Modalidades = lazy(() => import("../modules/sistema/pages/Modalidades"));
const ConfiguracaoInstituicao = lazy(() => import("../modules/sistema/pages/ConfiguracaoInstituicao"));
const GerenciamentoUsuarios = lazy(() => import("../modules/sistema/pages/GerenciamentoUsuarios"));
const GerenciamentoPeriodos = lazy(() => import("../modules/sistema/pages/GerenciamentoPeriodos"));
const DashboardPNAE = lazy(() => import("../modules/sistema/pages/DashboardPNAE"));
const EditorTemplatesPDF = lazy(() => import("../modules/sistema/pages/EditorTemplatesPDF"));
const CalendarioLetivo = lazy(() => import("../modules/sistema/pages/CalendarioLetivo"));
const DisparosNotificacao = lazy(() => import("../modules/sistema/pages/DisparosNotificacao"));
const DocumentacaoSistema = lazy(() => import("../modules/sistema/pages/DocumentacaoSistema"));

// Lazy loading - Módulo: produtos
const Produtos = lazy(() => import("../modules/produtos/pages/Produtos"));
const ProdutoDetalhe = lazy(() => import("../modules/produtos/pages/ProdutoDetalhe"));

// Lazy loading - Módulo: nutricao
const Preparacoes = lazy(() => import("../modules/nutricao/pages/Preparacoes"));
const PreparacaoDetalhe = lazy(() => import("../modules/nutricao/pages/PreparacaoDetalhe"));
const TiposRefeicao = lazy(() => import("../modules/nutricao/pages/TiposRefeicao"));
const Nutricionistas = lazy(() => import("../modules/nutricao/pages/Nutricionistas"));
const GruposIngredientes = lazy(() => import("../modules/nutricao/pages/GruposIngredientes"));
const Refeicoes = lazy(() => import("../modules/nutricao/pages/Refeicoes"));

// Lazy loading - Módulo: cardapios
const Cardapios = lazy(() => import("../modules/cardapios/pages/CardapiosModalidade"));
const CardapioCalendario = lazy(() => import("../modules/cardapios/pages/CardapioCalendario"));
const CardapioDetalhe = lazy(() => import("../modules/cardapios/pages/CardapioDetalhe"));

// Lazy loading - Módulo: fornecedores
const Fornecedores = lazy(() => import("../modules/fornecedores/pages/Fornecedores"));
const FornecedorDetalhe = lazy(() => import("../modules/fornecedores/pages/FornecedorDetalhe"));
const ItensFornecedor = lazy(() => import("../modules/fornecedores/pages/ItensFornecedor"));

// Lazy loading - Módulo: contratos
const Contratos = lazy(() => import("../modules/contratos/pages/Contratos"));
const NovoContrato = lazy(() => import("../modules/contratos/pages/NovoContrato"));
const ContratoDetalhe = lazy(() => import("../modules/contratos/pages/ContratoDetalhe"));
const SaldoContratosModalidades = lazy(() => import("../modules/contratos/pages/SaldoContratosModalidades"));

// Lazy loading - Módulo: estoque
const EstoqueCentral = lazy(() => import("../modules/estoque/pages/EstoqueCentral"));
const EstoqueLotes = lazy(() => import("../modules/estoque/pages/EstoqueLotes"));
const EstoqueMovimentacoes = lazy(() => import("../modules/estoque/pages/EstoqueMovimentacoes"));
const EstoqueAlertas = lazy(() => import("../modules/estoque/pages/EstoqueAlertas"));
const EstoqueEscolar = lazy(() => import("../modules/estoque/pages/EstoqueEscolar"));
const EstoqueEscolaPortal = lazy(() => import("../modules/estoque/pages/EstoqueEscolaPortal"));

// Lazy loading - Módulo: demandas
const DemandasLista = lazy(() => import("../modules/demandas/pages/DemandasLista"));
const GuiasDemandaLista = lazy(() => import("../modules/demandas/pages/GuiasDemandaLista"));
const GuiaDemandaDetalhe = lazy(() => import("../modules/demandas/pages/GuiaDemandaDetalhe"));
const GuiaDemandaEscolaItens = lazy(() => import("../modules/demandas/pages/GuiaDemandaEscolaItens"));
const AjusteGuiaDemandaScreen = lazy(() => import("../modules/programacao/pages/AjusteGuiaDemandaScreen"));

// Lazy loading - Módulo: entregas
const Romaneio = lazy(() => import("../modules/entregas/pages/Romaneio"));
const Entregas = lazy(() => import("../modules/entregas/pages/Entregas"));
const ComprovantesEntrega = lazy(() => import("../modules/entregas/pages/ComprovantesEntrega"));
const ValidarComprovante = lazy(() => import("../modules/entregas/pages/ValidarComprovante"));

// Lazy loading - Módulo: rotas
const GestaoRotas = lazy(() => import("../modules/rotas/pages/GestaoRotas"));

// Lazy loading - Módulo: compras
const Compras = lazy(() => import("../modules/compras/pages/Compras"));
const CompraForm = lazy(() => import("../modules/compras/pages/CompraForm"));
const CompraDetalhe = lazy(() => import("../modules/compras/pages/CompraDetalhe"));
const Abastecimento = lazy(() => import("../modules/abastecimento/pages/Abastecimento"));

// Lazy loading - Módulo: programacao
const ProgramacaoEntregaScreen = lazy(() => import("../modules/programacao/pages/ProgramacaoEntregaScreen"));
const AjusteProgramacoesScreen = lazy(() => import("../modules/programacao/pages/AjusteProgramacoesScreen"));

// Lazy loading - Módulo: faturamento
const FaturamentosCompra = lazy(() => import("../modules/faturamento/pages/FaturamentosCompra"));
const FaturamentoModalidades = lazy(() => import("../modules/faturamento/pages/FaturamentoModalidades"));
const RelatorioFaturamentoTipoFornecedor = lazy(() => import("../modules/faturamento/pages/RelatorioFaturamentoTipoFornecedor"));
const FaturamentoDetalhe = lazy(() => import("../modules/faturamento/pages/FaturamentoDetalhe"));

function LegacyFaturamentoRedirect() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  return <Navigate to={`/compras/${pedidoId}/faturamentos`} replace />;
}

function LegacyRomaneioRedirect() {
  const location = useLocation();
  return <Navigate to={`/entregas/romaneio${location.search}`} replace />;
}

// Lazy loading - Módulo: solicitacoes
const SolicitacoesAlimentos = lazy(() => import("../modules/solicitacoes/pages/SolicitacoesAlimentos"));
const SolicitacaoEscolaDetalhe = lazy(() => import("../modules/solicitacoes/pages/SolicitacaoEscolaDetalhe"));

// Componentes auxiliares
const DashboardConsistencia = lazy(() => import("../components/DashboardConsistencia"));

interface AppRouterProps {
  routerConfig?: {
    future: {
      v7_startTransition: boolean;
      v7_relativeSplatPath: boolean;
    };
  };
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: JSX.Element }) {
  return !isAuthenticated() ? children : <Navigate to="/dashboard" replace />;
}

function LazyRoute({ children, moduloSlug }: { children: JSX.Element; moduloSlug?: string }) {
  return (
    <PrivateRoute>
      <LayoutModerno>
        <Suspense fallback={<PageLoader />}>
          {moduloSlug ? (
            <PermissionGuard moduloSlug={moduloSlug}>
              {children}
            </PermissionGuard>
          ) : (
            children
          )}
        </Suspense>
      </LayoutModerno>
    </PrivateRoute>
  );
}

export default function AppRouter({ routerConfig }: AppRouterProps) {
  const Router = window.desktopShell?.isDesktop ? HashRouter : BrowserRouter;

  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.remove();
    }
  }, []);

  return (
    <Router>
      <EscolasProvider>
        <Routes>
            {/* Redireciona para dashboard se logado, senão para login */}
            <Route path="/" element={<RootRedirect />} />
            {/* Landing Page Pública (desativada) */}
            <Route path="/home" element={<LandingPage />} />
            
            {/* Formulário de Interesse */}
            <Route path="/interesse" element={<InterestForm />} />
            
            {/* Validação de Comprovante - Rota Pública */}
            <Route path="/validar-comprovante" element={
              <Suspense fallback={<PageLoader />}>
                <ValidarComprovante />
              </Suspense>
            } />
            
            {/* Login administrativo */}
            <Route path="/login" element={
              <PublicRoute>
                <LoginWrapper>
                  <Login />
                </LoginWrapper>
              </PublicRoute>
            } />

            {/* Cardápio Público - Acesso via QR Code */}
            <Route path="/cardapio-publico" element={
              <Suspense fallback={<div>Carregando...</div>}>
                <CardapioPublico />
              </Suspense>
            } />
            
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <LayoutModerno>
                    <Dashboard />
                  </LayoutModerno>
                </PrivateRoute>
              }
            />
            <Route
              path="/app"
              element={
                <PrivateRoute>
                  <LayoutModerno>
                    <Dashboard />
                  </LayoutModerno>
                </PrivateRoute>
              }
            />
            <Route
              path="/escolas"
              element={<LazyRoute moduloSlug="escolas"><Escolas /></LazyRoute>}
            />
            <Route
              path="/escolas/:id"
              element={<LazyRoute moduloSlug="escolas"><EscolaDetalhes /></LazyRoute>}
            />

            <Route
              path="/modalidades"
              element={<LazyRoute moduloSlug="modalidades"><Modalidades /></LazyRoute>}
            />
            <Route
              path="/modalidades/gerenciar-alunos"
              element={<LazyRoute moduloSlug="modalidades"><GerenciarAlunosModalidades /></LazyRoute>}
            />
            <Route
              path="/modalidades/relatorio-alunos"
              element={<LazyRoute moduloSlug="modalidades"><RelatorioAlunosModalidades /></LazyRoute>}
            />
            <Route
              path="/produtos"
              element={<LazyRoute moduloSlug="produtos"><Produtos /></LazyRoute>}
            />
            <Route
              path="/produtos/:id"
              element={<LazyRoute moduloSlug="produtos"><ProdutoDetalhe /></LazyRoute>}
            />
            <Route
              path="/preparacoes"
              element={<LazyRoute moduloSlug="preparacoes"><Preparacoes /></LazyRoute>}
            />
            <Route
              path="/preparacoes/:id"
              element={<LazyRoute moduloSlug="preparacoes"><PreparacaoDetalhe /></LazyRoute>}
            />
            <Route
              path="/cardapios"
              element={<LazyRoute moduloSlug="cardapios"><Cardapios /></LazyRoute>}
            />
            <Route
              path="/cardapios/:cardapioId/calendario"
              element={<LazyRoute moduloSlug="cardapios"><CardapioCalendario /></LazyRoute>}
            />
            <Route
              path="/tipos-refeicao"
              element={<LazyRoute moduloSlug="tipos_refeicao"><TiposRefeicao /></LazyRoute>}
            />
            <Route
              path="/nutricionistas"
              element={<LazyRoute moduloSlug="nutricionistas"><Nutricionistas /></LazyRoute>}
            />

            <Route
              path="/guias-demanda"
              element={<LazyRoute moduloSlug="demandas"><GuiasDemandaLista /></LazyRoute>}
            />
            <Route
              path="/guias-demanda/:guiaId"
              element={<LazyRoute moduloSlug="demandas"><GuiaDemandaDetalhe /></LazyRoute>}
            />
            <Route
              path="/guias-demanda/:guiaId/escola/:escolaId"
              element={<LazyRoute moduloSlug="demandas"><GuiaDemandaEscolaItens /></LazyRoute>}
            />
            <Route
              path="/guias-demanda/:guiaId/ajuste"
              element={<LazyRoute moduloSlug="demandas"><AjusteGuiaDemandaScreen /></LazyRoute>}
            />
            <Route
              path="/romaneio"
              element={<LazyRoute moduloSlug="romaneio"><LegacyRomaneioRedirect /></LazyRoute>}
            />
            <Route
              path="/guias-demanda-old/:id"
              element={<LazyRoute moduloSlug="demandas"><GuiaDemandaDetalhe /></LazyRoute>}
            />
            <Route
              path="/entregas"
              element={<LazyRoute moduloSlug="entregas"><Entregas /></LazyRoute>}
            />
            <Route
              path="/entregas/romaneio"
              element={<LazyRoute moduloSlug="romaneio"><Romaneio /></LazyRoute>}
            />
            <Route
              path="/comprovantes-entrega"
              element={<LazyRoute moduloSlug="comprovantes"><ComprovantesEntrega /></LazyRoute>}
            />

            <Route
              path="/gestao-rotas"
              element={<LazyRoute moduloSlug="rotas"><GestaoRotas /></LazyRoute>}
            />
            <Route
              path="/gestao-rotas/:rotaId/escolas"
              element={<LazyRoute moduloSlug="rotas"><GerenciarEscolasRota /></LazyRoute>}
            />

            <Route
              path="/fornecedores"
              element={<LazyRoute moduloSlug="fornecedores"><Fornecedores /></LazyRoute>}
            />
            <Route
              path="/fornecedores/:id"
              element={<LazyRoute moduloSlug="fornecedores"><FornecedorDetalhe /></LazyRoute>}
            />
            <Route
              path="/fornecedores/:id/itens"
              element={<LazyRoute moduloSlug="fornecedores"><ItensFornecedor /></LazyRoute>}
            />
            <Route
              path="/contratos"
              element={<LazyRoute moduloSlug="contratos"><Contratos /></LazyRoute>}
            />
            <Route
              path="/contratos/novo"
              element={<LazyRoute moduloSlug="contratos"><NovoContrato /></LazyRoute>}
            />
            <Route
              path="/contratos/:id"
              element={<LazyRoute moduloSlug="contratos"><ContratoDetalhe /></LazyRoute>}
            />
            <Route
              path="/saldos-contratos-modalidades"
              element={<LazyRoute moduloSlug="saldo_contratos"><SaldoContratosModalidades /></LazyRoute>}
            />

            {/* Rotas de Compras */}
            <Route path="/compras" element={<LazyRoute moduloSlug="pedidos"><Compras /></LazyRoute>} />
            <Route path="/abastecimento" element={<LazyRoute moduloSlug="planejamento_compras"><Abastecimento /></LazyRoute>} />
            <Route path="/compras/planejamento" element={<Navigate to="/guias-demanda" replace />} />
            <Route path="/compras/novo" element={<LazyRoute moduloSlug="pedidos"><CompraForm /></LazyRoute>} />
            <Route path="/compras/:id/editar" element={<LazyRoute moduloSlug="pedidos"><CompraForm /></LazyRoute>} />
            <Route path="/compras/:id" element={<LazyRoute moduloSlug="pedidos"><CompraDetalhe /></LazyRoute>} />
            <Route path="/compras/:id/item/:itemId/programacao" element={<LazyRoute moduloSlug="pedidos"><ProgramacaoEntregaScreen /></LazyRoute>} />
            <Route path="/compras/:id/programacoes-ajuste" element={<LazyRoute moduloSlug="pedidos"><AjusteProgramacoesScreen /></LazyRoute>} />
            <Route path="/compras/:id/faturamentos" element={<LazyRoute moduloSlug="faturamento"><FaturamentosCompra /></LazyRoute>} />
            <Route path="/compras/:id/faturamento/:faturamentoId/relatorio-tipo" element={<LazyRoute moduloSlug="faturamento"><RelatorioFaturamentoTipoFornecedor /></LazyRoute>} />
            <Route path="/compras/:id/faturamento/:faturamentoId" element={<LazyRoute moduloSlug="faturamento"><FaturamentoModalidades /></LazyRoute>} />
            <Route path="/compras/:pedidoId/faturamento" element={<LazyRoute moduloSlug="faturamento"><LegacyFaturamentoRedirect /></LazyRoute>} />
            <Route path="/compras/:pedidoId/faturamento/visualizar" element={<LazyRoute moduloSlug="faturamento"><FaturamentoDetalhe /></LazyRoute>} />


            {/* Rotas de Demandas */}
            <Route
              path="/demandas"
              element={<LazyRoute moduloSlug="demandas"><DemandasLista /></LazyRoute>}
            />

            {/* Rotas do Estoque Central */}
            <Route
              path="/estoque-central"
              element={<LazyRoute moduloSlug="estoque"><EstoqueCentral /></LazyRoute>}
            />
            <Route
              path="/estoque-escolar"
              element={<LazyRoute moduloSlug="estoque"><EstoqueEscolar /></LazyRoute>}
            />
            <Route
              path="/estoque-escola-portal"
              element={<LazyRoute moduloSlug="estoque"><EstoqueEscolaPortal /></LazyRoute>}
            />
            <Route
              path="/estoque-moderno/produtos/:produto_id/lotes"
              element={<LazyRoute moduloSlug="estoque"><EstoqueLotes /></LazyRoute>}
            />
            <Route
              path="/estoque-moderno/produtos/:produto_id/movimentacoes"
              element={<LazyRoute moduloSlug="estoque"><EstoqueMovimentacoes /></LazyRoute>}
            />
            <Route
              path="/estoque-moderno/alertas"
              element={<LazyRoute moduloSlug="estoque"><EstoqueAlertas /></LazyRoute>}
            />

            {/* Dashboard de Consistência */}
            <Route
              path="/consistencia"
              element={<LazyRoute moduloSlug="dashboard"><DashboardConsistencia /></LazyRoute>}
            />

            {/* Configurações da Instituição */}
            <Route
              path="/configuracao-instituicao"
              element={<LazyRoute moduloSlug="configuracoes"><ConfiguracaoInstituicao /></LazyRoute>}
            />
            {/* Editor de Templates PDF */}
            <Route
              path="/editor-templates-pdf"
              element={<LazyRoute moduloSlug="configuracoes"><EditorTemplatesPDF /></LazyRoute>}
            />
            
            {/* Dashboard PNAE */}
            <Route
              path="/pnae/dashboard"
              element={<LazyRoute moduloSlug="pnae"><DashboardPNAE /></LazyRoute>}
            />

            {/* Gerenciamento de Usuários (admin) */}
            <Route
              path="/gerenciamento-usuarios"
              element={<LazyRoute moduloSlug="usuarios"><GerenciamentoUsuarios /></LazyRoute>}
            />

            {/* Gerenciamento de Períodos (admin) */}
            <Route
              path="/periodos"
              element={<LazyRoute moduloSlug="periodos"><GerenciamentoPeriodos /></LazyRoute>}
            />
            {/* Grupos de Ingredientes */}
            <Route
              path="/grupos-ingredientes"
              element={<LazyRoute moduloSlug="preparacoes"><GruposIngredientes /></LazyRoute>}
            />

            {/* Portal da Escola (secretaria de escola) - Módulo separado */}
            <Route
              path="/portal-escola"
              element={<LazyRoute moduloSlug="dashboard"><PortalEscolaHome /></LazyRoute>}
            />
            <Route
              path="/portal-escola/cardapio"
              element={<LazyRoute moduloSlug="dashboard"><CardapioPage /></LazyRoute>}
            />
            <Route
              path="/portal-escola/solicitacoes"
              element={<LazyRoute moduloSlug="dashboard"><SolicitacoesPage /></LazyRoute>}
            />
            <Route
              path="/portal-escola/comprovantes"
              element={<LazyRoute moduloSlug="dashboard"><ComprovantesPage /></LazyRoute>}
            />
            <Route
              path="/portal-escola/alunos"
              element={<LazyRoute moduloSlug="dashboard"><AlunosPage /></LazyRoute>}
            />

            {/* Solicitações de Alimentos (módulo principal) */}
            <Route
              path="/solicitacoes-alimentos"
              element={<LazyRoute moduloSlug="solicitacoes"><SolicitacoesAlimentos /></LazyRoute>}
            />
            <Route
              path="/solicitacoes-alimentos/:escolaId"
              element={<LazyRoute moduloSlug="solicitacoes"><SolicitacaoEscolaDetalhe /></LazyRoute>}
            />

            {/* Calendário Letivo */}
            <Route
              path="/calendario-letivo"
              element={<LazyRoute moduloSlug="calendario"><CalendarioLetivo /></LazyRoute>}
            />

            {/* Disparos de Notificação */}
            <Route
              path="/disparos-notificacao"
              element={<LazyRoute moduloSlug="notificacoes"><DisparosNotificacao /></LazyRoute>}
            />

            




          </Routes>
        </EscolasProvider>
    </Router>
  );
}
