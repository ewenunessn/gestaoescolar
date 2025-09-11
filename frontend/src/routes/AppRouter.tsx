import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "../services/auth";
import LayoutModerno from "../components/LayoutModerno";
import { CarrinhoProvider } from "../context/CarrinhoContext";
import { EscolasProvider } from "../contexts/EscolasContext";
import ErrorBoundary from "../components/ErrorBoundary";

// Componentes críticos carregados imediatamente
import Login from "../pages/Login";
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
const EstoqueEscola = lazy(() => import("../pages/EstoqueEscola"));
const EstoqueEscolar = lazy(() => import("../pages/EstoqueEscolar"));
const RefeicaoDetalhe = lazy(() => import("../pages/RefeicaoDetalhe"));
const Refeicoes = lazy(() => import("../pages/Refeicoes"));
const Cardapios = lazy(() => import("../pages/Cardapios"));
const CardapioDetalhe = lazy(() => import("../pages/CardapioDetalhe"));
const CardapioRefeicoes = lazy(() => import("../pages/CardapioRefeicoes"));
const GerarDemanda = lazy(() => import("../pages/GerarDemanda"));
const Fornecedores = lazy(() => import("../pages/Fornecedores"));
const FornecedorDetalhe = lazy(() => import("../pages/FornecedorDetalhe"));
const Contratos = lazy(() => import("../pages/Contratos"));
const NovoContrato = lazy(() => import("../pages/NovoContrato"));
const ContratoDetalhe = lazy(() => import("../pages/ContratoDetalhe"));


const PedidosModernos = lazy(() => import("../pages/PedidosModernos"));
const EstoqueCentral = lazy(() => import("../pages/EstoqueCentral"));
const EstoqueLotes = lazy(() => import("../pages/EstoqueLotes"));
const EstoqueMovimentacoes = lazy(() => import("../pages/EstoqueMovimentacoes"));
const EstoqueAlertas = lazy(() => import("../pages/EstoqueAlertas"));



// SISTEMAS ANTIGOS REMOVIDOS - Agora usando apenas o sistema simplificado
const CatalogoProdutos = lazy(() => import("../pages/CatalogoProdutosSimples"));
const CarrinhoCompras = lazy(() => import("../pages/CarrinhoCompras"));


const RecebimentoSimplificado = lazy(() => import("../pages/RecebimentoSimplificado"));
const RecebimentoItensPage = lazy(() => import("../pages/RecebimentoItensPage"));
const FaturamentoModalidades = lazy(() => import("../pages/FaturamentoModalidades"));
const FaturamentoInterfacePage = lazy(() => import("../pages/FaturamentoInterfacePage"));
const SaldoContratos = lazy(() => import("../pages/SaldoContratos"));


const DashboardConsistencia = lazy(() => import("../components/DashboardConsistencia"));
// Componente removido: ExemploTabelaPedido não existe




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
        <CarrinhoProvider>
          <Routes>
            {/* Landing Page Pública */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<LandingPage />} />
            
            {/* Formulário de Interesse */}
            <Route path="/interesse" element={<InterestForm />} />
            
            {/* Login administrativo */}
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            
            {/* Sistema de Gestores de Escola */}
            <Route path="/login-gestor" element={
              <Suspense fallback={<PageLoader />}>
                <LoginGestorEscola />
              </Suspense>
            } />
            {/* Rota inteligente que detecta dispositivo */}
            <Route path="/estoque-escola-auto/:escolaId" element={
              <Suspense fallback={<PageLoader />}>
                <EstoqueEscolaRouter />
              </Suspense>
            } />
            <Route path="/estoque-escola/:escolaId" element={
              <Suspense fallback={<PageLoader />}>
                <EstoqueEscola />
              </Suspense>
            } />
            <Route path="/estoque-escola-mobile/:escolaId" element={
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
              element={<LazyRoute><EstoqueEscola /></LazyRoute>}
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
              path="/fornecedores"
              element={<LazyRoute><Fornecedores /></LazyRoute>}
            />
            <Route
              path="/fornecedores/:id"
              element={<LazyRoute><FornecedorDetalhe /></LazyRoute>}
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
            <Route
              path="/catalogo"
              element={
                <LazyRoute>
                  <ErrorBoundary>
                    <CatalogoProdutos />
                  </ErrorBoundary>
                </LazyRoute>
              }
            />
            <Route
              path="/carrinho"
              element={
                <LazyRoute>
                  <ErrorBoundary>
                    <CarrinhoCompras />
                  </ErrorBoundary>
                </LazyRoute>
              }
            />
            <Route
              path="/pedidos"
              element={<LazyRoute><PedidosModernos /></LazyRoute>}
            />
            {/* Rota removida: ExemploTabelaPedido não existe */}
            {/* Sistema clássico removido - agora usando apenas pedidos modernos */}
            {/* 
              MIGRAÇÃO PARA SISTEMA ÚNICO DE RECEBIMENTO
              
              Os sistemas antigos foram descontinuados em favor do sistema simplificado:
              - Mais intuitivo e fácil de usar
              - Sem necessidade de "iniciar" e "finalizar" recebimentos
              - Status automático baseado nas quantidades
              - Integração completa com contratos e estoque
              
              Todas as rotas antigas redirecionam para o novo sistema.
            */}
            <Route
              path="/recebimentos"
              element={<Navigate to="/recebimento-simples" replace />}
            />
            <Route
              path="/recebimentos/classico"
              element={<Navigate to="/recebimento-simples" replace />}
            />
            <Route
              path="/recebimentos/:pedidoId/conferir"
              element={<Navigate to="/recebimento-simples" replace />}
            />
            <Route
              path="/recebimentos/:id"
              element={<Navigate to="/recebimento-simples" replace />}
            />




            {/* SISTEMA DE RECEBIMENTOS */}
            <Route
              path="/recebimento-simplificado"
              element={<LazyRoute><RecebimentoSimplificado /></LazyRoute>}
            />
            <Route
              path="/recebimento-simples"
              element={<LazyRoute><RecebimentoSimplificado /></LazyRoute>}
            />
            {/* Rota principal de recebimentos */}
            <Route
              path="/recebimentos-novo"
              element={<LazyRoute><RecebimentoSimplificado /></LazyRoute>}
            />
            <Route
              path="/recebimento-simplificado/pedido/:pedido_id"
              element={<LazyRoute><RecebimentoItensPage /></LazyRoute>}
            />
            <Route
              path="/recebimento-simples/pedido/:pedido_id"
              element={<LazyRoute><RecebimentoItensPage /></LazyRoute>}
            />
            {/* Rotas alternativas para compatibilidade */}
            <Route
              path="/recebimento-simplificado/:pedido_id"
              element={<LazyRoute><RecebimentoItensPage /></LazyRoute>}
            />
            <Route
              path="/recebimento-simples/:pedido_id"
              element={<LazyRoute><RecebimentoItensPage /></LazyRoute>}
            />
            <Route
              path="/recebimento-itens/:pedidoId"
              element={<LazyRoute><RecebimentoItensPage /></LazyRoute>}
            />





            {/* Dashboard de Consistência */}
            <Route
              path="/consistencia"
              element={<LazyRoute><DashboardConsistencia /></LazyRoute>}
            />
            
            {/* Faturamento de Modalidades */}
            <Route
              path="/faturamento-modalidades"
              element={<LazyRoute><FaturamentoModalidades /></LazyRoute>}
            />
            
            {/* Interface de Faturamento */}
            <Route
              path="/faturamento-interface"
              element={<LazyRoute><FaturamentoInterfacePage /></LazyRoute>}
            />



          </Routes>
        </CarrinhoProvider>
      </EscolasProvider>
    </BrowserRouter>
  );
}
