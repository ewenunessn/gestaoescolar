import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "../services/auth";
import LayoutModerno from "../components/LayoutModerno";

import { EscolasProvider } from "../contexts/EscolasContext";

// Componentes críticos carregados imediatamente
import Login from "../pages/Login";
import LoginWrapper from "../components/LoginWrapper";
import Registro from "../pages/Registro";
import Dashboard from "../pages/Dashboard";
import LandingPage from "../pages/LandingPage";
import InterestForm from "../pages/InterestForm";


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

// Componente que verifica autenticação e redireciona de forma síncrona
function RootRedirect() {
  // Verifica autenticação de forma síncrona e redireciona imediatamente
  const isAuth = isAuthenticated();
  
  // Retorna o Navigate diretamente, sem useEffect
  return <Navigate to={isAuth ? "/dashboard" : "/login"} replace />;
}

// Lazy loading para páginas menos críticas
const Escolas = lazy(() => import("../pages/Escolas"));
const Modalidades = lazy(() => import("../pages/Modalidades"));
const Produtos = lazy(() => import("../pages/Produtos"));
const ProdutoDetalhe = lazy(() => import("../pages/ProdutoDetalhe"));
const EscolaDetalhes = lazy(() => import("../pages/EscolaDetalhes"));
const RefeicaoDetalhe = lazy(() => import("../pages/RefeicaoDetalhe"));
const Refeicoes = lazy(() => import("../pages/Refeicoes"));
const Cardapios = lazy(() => import("../pages/CardapiosModalidade"));
const CardapioCalendario = lazy(() => import("../pages/CardapioCalendario"));

const Fornecedores = lazy(() => import("../pages/Fornecedores"));
const FornecedorDetalhe = lazy(() => import("../pages/FornecedorDetalhe"));
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
const EstoqueEscolar = lazy(() => import("../pages/EstoqueEscolar"));
const SaldoContratosModalidades = lazy(() => import("../pages/SaldoContratosModalidades"));
const GerenciarAlunosModalidades = lazy(() => import("../pages/GerenciarAlunosModalidades"));
const DashboardConsistencia = lazy(() => import("../components/DashboardConsistencia"));
const GuiasDemandaAntigo = lazy(() => import("../pages/GuiasDemanda"));
const GuiasDemanda = lazy(() => import("../pages/GuiasDemandaRefatorado"));
const Romaneio = lazy(() => import("../pages/Romaneio"));
const GuiaDetalhe = lazy(() => import("../pages/GuiaDetalhe"));
const Entregas = lazy(() => import("../pages/Entregas"));
const GestaoRotas = lazy(() => import("../pages/GestaoRotas"));
const GerenciarEscolasRota = lazy(() => import("../pages/GerenciarEscolasRota"));
const Pedidos = lazy(() => import("../pages/Pedidos"));
const NovoPedido = lazy(() => import("../pages/NovoPedido"));
const PedidoDetalhe = lazy(() => import("../pages/PedidoDetalhe"));
const EditarPedido = lazy(() => import("../pages/EditarPedido"));
const FaturamentosPedido = lazy(() => import("../pages/FaturamentosPedido"));
const FaturamentoModalidades = lazy(() => import("../pages/FaturamentoModalidades"));
const RelatorioFaturamentoTipoFornecedor = lazy(() => import("../pages/RelatorioFaturamentoTipoFornecedor"));
const FaturamentoDetalhe = lazy(() => import("../pages/FaturamentoDetalhe"));
const ComprovantesEntrega = lazy(() => import("../pages/ComprovantesEntrega"));


interface AppRouterProps {
  routerConfig?: {
    future: {
      v7_startTransition: boolean;
      v7_relativeSplatPath: boolean;
    };
  };
}

// Protege rotas privadas - redireciona para login se não autenticado
function PrivateRoute({ children }: { children: JSX.Element }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

// Protege rotas públicas (login/registro) - redireciona para dashboard se já autenticado
function PublicRoute({ children }: { children: JSX.Element }) {
  return !isAuthenticated() ? children : <Navigate to="/dashboard" replace />;
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
  // Remove o loader inicial assim que o React montar
  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.remove();
    }
  }, []);

  return (
    <BrowserRouter future={routerConfig?.future}>
      <EscolasProvider>
        <Routes>
            {/* Redireciona para dashboard se logado, senão para login */}
            <Route path="/" element={<RootRedirect />} />
            {/* Landing Page Pública (desativada) */}
            <Route path="/home" element={<LandingPage />} />
            
            {/* Formulário de Interesse */}
            <Route path="/interesse" element={<InterestForm />} />
            
            {/* Login administrativo */}
            <Route path="/login" element={
              <PublicRoute>
                <LoginWrapper>
                  <Login />
                </LoginWrapper>
              </PublicRoute>
            } />
            <Route path="/registro" element={
              <PublicRoute>
                <Registro />
              </PublicRoute>
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
              path="/cardapios/:cardapioId/calendario"
              element={<LazyRoute><CardapioCalendario /></LazyRoute>}
            />

            <Route
              path="/guias-demanda"
              element={<LazyRoute><GuiasDemanda /></LazyRoute>}
            />
            <Route
              path="/guias-demanda-antigo"
              element={<LazyRoute><GuiasDemandaAntigo /></LazyRoute>}
            />
            <Route
              path="/romaneio"
              element={<LazyRoute><Romaneio /></LazyRoute>}
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
              path="/comprovantes-entrega"
              element={<LazyRoute><ComprovantesEntrega /></LazyRoute>}
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
              path="/pedidos/:id/faturamentos"
              element={<LazyRoute><FaturamentosPedido /></LazyRoute>}
            />
            <Route
              path="/pedidos/:id/faturamento/:faturamentoId/relatorio-tipo"
              element={<LazyRoute><RelatorioFaturamentoTipoFornecedor /></LazyRoute>}
            />
            <Route
              path="/pedidos/:id/faturamento/:faturamentoId"
              element={<LazyRoute><FaturamentoModalidades /></LazyRoute>}
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
              path="/estoque-escolar"
              element={<LazyRoute><EstoqueEscolar /></LazyRoute>}
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
