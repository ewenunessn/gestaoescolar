import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "../services/auth";
import LayoutModerno from "../components/LayoutModerno";

import { EscolasProvider } from "../contexts/EscolasContext";
import ErrorBoundary from "../components/ErrorBoundary";

// Componentes críticos carregados imediatamente
import Login from "../pages/Login";
import LoginWrapper from "../components/LoginWrapper";
import Registro from "../pages/Registro";
import Dashboard from "../pages/Dashboard";
import LandingPage from "../pages/LandingPage";
import InterestForm from "../pages/InterestForm";

// Sistema de gestores de escola
const LoginGestorEscola = lazy(() => import("../pages/LoginGestorEscola"));
const EstoqueEscolaMobile = lazy(() => import("../pages/EstoqueEscolaMobile"));
const EstoqueEscolaRouter = lazy(() => import("../components/EstoqueEscolaRouter"));

// Componente de loading
const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '16px',
    color: '#666'
  }}>
    Carregando...
  </div>
);

// Lazy loading para páginas menos críticas
const Escolas = lazy(() => import("../pages/Escolas"));
const Modalidades = lazy(() => import("../pages/Modalidades"));
const Produtos = lazy(() => import("../pages/Produtos"));
const ProdutoDetalhe = lazy(() => import("../pages/ProdutoDetalhe"));
const EscolaDetalhes = lazy(() => import("../pages/EscolaDetalhes"));
const EstoqueEscolar = lazy(() => import("../pages/EstoqueEscolar"));
const RefeicaoDetalhe = lazy(() => import("../pages/RefeicaoDetalhe"));
const Refeicoes = lazy(() => import("../pages/Refeicoes"));
const Cardapios = lazy(() => import("../pages/Cardapios"));
const CardapioDetalhe = lazy(() => import("../pages/CardapioDetalhe"));
const CardapioRefeicoes = lazy(() => import("../pages/CardapioRefeicoes"));
const GerarDemanda = lazy(() => import("../pages/GerarDemanda"));
const Fornecedores = lazy(() => import("../pages/Fornecedores"));
const FornecedorDetalhe = lazy(() => import("../pages/FornecedorDetalhe"));
const VisualizacaoEntregas = lazy(() => import("../pages/VisualizacaoEntregas"));
const ItensFornecedor = lazy(() => import("../pages/ItensFornecedor"));
const Contratos = lazy(() => import("../pages/Contratos"));
const DemandasLista = lazy(() => import("../pages/DemandasLista"));
const GerarFaturamento = lazy(() => import("../pages/GerarFaturamento"));
const NovoContrato = lazy(() => import("../pages/NovoContrato"));
const ContratoDetalhe = lazy(() => import("../pages/ContratoDetalhe"));
const EstoqueCentral = lazy(() => import("../pages/EstoqueCentral"));
const EstoqueLotes = lazy(() => import("../pages/EstoqueLotes"));
const EstoqueMovimentacoes = lazy(() => import("../pages/EstoqueMovimentacoes"));
const EstoqueAlertas = lazy(() => import("../pages/EstoqueAlertas"));
const SaldoContratos = lazy(() => import("../pages/SaldoContratos"));
const SaldoContratosModalidades = lazy(() => import("../pages/SaldoContratosModalidades"));
const GerenciarAlunosModalidades = lazy(() => import("../pages/GerenciarAlunosModalidades"));
const DashboardConsistencia = lazy(() => import("../components/DashboardConsistencia"));
const GuiasDemanda = lazy(() => import("../pages/GuiasDemanda"));
const GuiaDetalhe = lazy(() => import("../pages/GuiaDetalhe"));
const Entregas = lazy(() => import("../pages/Entregas"));
const ConfiguracaoEntrega = lazy(() => import("../pages/ConfiguracaoEntrega"));
const GestaoRotas = lazy(() => import("../pages/GestaoRotas"));
const GerenciarEscolasRota = lazy(() => import("../pages/GerenciarEscolasRota"));
const Pedidos = lazy(() => import("../pages/Pedidos"));
const NovoPedido = lazy(() => import("../pages/NovoPedido"));
const PedidoDetalhe = lazy(() => import("../pages/PedidoDetalhe"));
const EditarPedido = lazy(() => import("../pages/EditarPedido"));
const FaturamentoDetalhe = lazy(() => import("../pages/FaturamentoDetalhe"));


interface AppRouterProps {
  routerConfig?: {
    future: {
      v7_startTransition: boolean;
      v7_relativeSplatPath: boolean;
    };
  };
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  return isAuthenticated() ? children : <Navigate to="/login" />;
}

// Wrapper para rotas com lazy loading
function LazyRoute({ children }: { children: JSX.Element }) {
  return (
    <PrivateRoute>
      <LayoutModerno>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </LayoutModerno>
    </PrivateRoute>
  );
}

export default function AppRouter({ routerConfig }: AppRouterProps) {
  return (
    <BrowserRouter future={routerConfig?.future}>
      <EscolasProvider>
        <Routes>
            {/* Landing Page Pública */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<LandingPage />} />
            
            {/* Formulário de Interesse */}
            <Route path="/interesse" element={<InterestForm />} />
            
            {/* Login administrativo */}
            <Route path="/login" element={
              <LoginWrapper>
                <Login />
              </LoginWrapper>
            } />
            <Route path="/registro" element={<Registro />} />
            
            {/* Sistema de Gestores de Escola */}
            <Route path="/login-gestor" element={
              <Suspense fallback={<PageLoader />}>
                <LoginGestorEscola />
              </Suspense>
            } />
            {/* Rota única para estoque escola - versão mobile */}
            <Route path="/estoque-escola/:escolaId" element={
              <Suspense fallback={<PageLoader />}>
                <EstoqueEscolaMobile />
              </Suspense>
            } />
            {/* Rota mantida para compatibilidade com URLs antigas */}
            <Route path="/estoque-escola-mobile/:escolaId" element={
              <Suspense fallback={<PageLoader />}>
                <EstoqueEscolaMobile />
              </Suspense>
            } />
            {/* Rota antiga auto-detect removida */}
            <Route path="/estoque-escola-auto/:escolaId" element={
              <Suspense fallback={<PageLoader />}>
                <EstoqueEscolaMobile />
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
              element={<LazyRoute><Escolas /></LazyRoute>}
            />
            <Route
              path="/escolas/:id"
              element={<LazyRoute><EscolaDetalhes /></LazyRoute>}
            />
            <Route
              path="/escolas/:escolaId/estoque"
              element={<LazyRoute><EstoqueEscolaMobile /></LazyRoute>}
            />
            <Route
              path="/estoque-escolar"
              element={<LazyRoute><EstoqueEscolar /></LazyRoute>}
            />

            <Route
              path="/modalidades"
              element={<LazyRoute><Modalidades /></LazyRoute>}
            />
            <Route
              path="/modalidades/gerenciar-alunos"
              element={<LazyRoute><GerenciarAlunosModalidades /></LazyRoute>}
            />
            <Route
              path="/produtos"
              element={<LazyRoute><Produtos /></LazyRoute>}
            />
            <Route
              path="/produtos/:id"
              element={<LazyRoute><ProdutoDetalhe /></LazyRoute>}
            />
            <Route
              path="/refeicoes"
              element={<LazyRoute><Refeicoes /></LazyRoute>}
            />
            <Route
              path="/refeicoes/:id"
              element={<LazyRoute><RefeicaoDetalhe /></LazyRoute>}
            />
            <Route
              path="/cardapios"
              element={<LazyRoute><Cardapios /></LazyRoute>}
            />
            <Route
              path="/cardapios/novo"
              element={<LazyRoute><CardapioDetalhe /></LazyRoute>}
            />
            <Route
              path="/cardapios/:id"
              element={<LazyRoute><CardapioDetalhe /></LazyRoute>}
            />
            <Route
              path="/cardapios/:cardapioId/refeicoes"
              element={<LazyRoute><CardapioRefeicoes /></LazyRoute>}
            />
            <Route
              path="/gerar-demanda"
              element={<LazyRoute><GerarDemanda /></LazyRoute>}
            />
            <Route
              path="/guias-demanda"
              element={<LazyRoute><GuiasDemanda /></LazyRoute>}
            />
            <Route
              path="/guias-demanda/:id"
              element={<LazyRoute><GuiaDetalhe /></LazyRoute>}
            />
            <Route
              path="/entregas"
              element={<LazyRoute><Entregas /></LazyRoute>}
            />
            <Route
              path="/configuracao-entrega"
              element={<LazyRoute><ConfiguracaoEntrega /></LazyRoute>}
            />
            <Route
              path="/visualizacao-entregas"
              element={<LazyRoute><VisualizacaoEntregas /></LazyRoute>}
            />
            <Route
              path="/gestao-rotas"
              element={<LazyRoute><GestaoRotas /></LazyRoute>}
            />
            <Route
              path="/gestao-rotas/:rotaId/escolas"
              element={<LazyRoute><GerenciarEscolasRota /></LazyRoute>}
            />

            <Route
              path="/fornecedores"
              element={<LazyRoute><Fornecedores /></LazyRoute>}
            />
            <Route
              path="/fornecedores/:id"
              element={<LazyRoute><FornecedorDetalhe /></LazyRoute>}
            />
            <Route
              path="/fornecedores/:id/itens"
              element={<LazyRoute><ItensFornecedor /></LazyRoute>}
            />
            <Route
              path="/contratos"
              element={<LazyRoute><Contratos /></LazyRoute>}
            />
            <Route
              path="/contratos/novo"
              element={<LazyRoute><NovoContrato /></LazyRoute>}
            />
            <Route
              path="/contratos/:id"
              element={<LazyRoute><ContratoDetalhe /></LazyRoute>}
            />
            <Route
              path="/saldos-contratos"
              element={<LazyRoute><SaldoContratos /></LazyRoute>}
            />
            <Route
              path="/saldos-contratos-modalidades"
              element={<LazyRoute><SaldoContratosModalidades /></LazyRoute>}
            />

            {/* Rotas de Pedidos */}
            <Route
              path="/pedidos"
              element={<LazyRoute><Pedidos /></LazyRoute>}
            />
            <Route
              path="/pedidos/novo"
              element={<LazyRoute><NovoPedido /></LazyRoute>}
            />
            <Route
              path="/pedidos/:id/editar"
              element={<LazyRoute><EditarPedido /></LazyRoute>}
            />
            <Route
              path="/pedidos/:pedidoId/faturamento"
              element={<LazyRoute><GerarFaturamento /></LazyRoute>}
            />
            <Route
              path="/pedidos/:pedidoId/faturamento/visualizar"
              element={<LazyRoute><FaturamentoDetalhe /></LazyRoute>}
            />
            <Route
              path="/pedidos/:id"
              element={<LazyRoute><PedidoDetalhe /></LazyRoute>}
            />

            {/* Rotas de Demandas */}
            <Route
              path="/demandas"
              element={<LazyRoute><DemandasLista /></LazyRoute>}
            />

            {/* Rotas do Estoque Central */}
            <Route
              path="/estoque-central"
              element={<LazyRoute><EstoqueCentral /></LazyRoute>}
            />
            <Route
              path="/estoque-moderno/produtos/:produto_id/lotes"
              element={<LazyRoute><EstoqueLotes /></LazyRoute>}
            />
            <Route
              path="/estoque-moderno/produtos/:produto_id/movimentacoes"
              element={<LazyRoute><EstoqueMovimentacoes /></LazyRoute>}
            />
            <Route
              path="/estoque-moderno/alertas"
              element={<LazyRoute><EstoqueAlertas /></LazyRoute>}
            />



            {/* Outras rotas protegidas podem ser adicionadas aqui, sempre dentro do LayoutModerno */}
            {/* Outras rotas protegidas podem ser adicionadas aqui, sempre dentro do LayoutModerno */}





            {/* Dashboard de Consistência */}
            <Route
              path="/consistencia"
              element={<LazyRoute><DashboardConsistencia /></LazyRoute>}
            />
            




          </Routes>
        </EscolasProvider>
    </BrowserRouter>
  );
}
