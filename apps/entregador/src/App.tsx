import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import Rotas from './pages/Rotas'
import RotaDetalhe from './pages/RotaDetalhe'
import EscolaDetalhe from './pages/EscolaDetalhe'
import Topbar from './components/Topbar'
import Login from './pages/Login'
import Historico from './pages/Historico'
import OfflineIndicator from './components/OfflineIndicator'

export default function App() {
  const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('token')
  const location = useLocation()
  const isLogin = location.pathname.startsWith('/login')
  if (!hasToken && !isLogin) {
    return (
      <div className="app">
        <Topbar />
        <div className="container">
          <Login />
        </div>
      </div>
    )
  }
  return (
    <div className="app">
      <Topbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/rotas" replace />} />
          <Route path="/rotas" element={<Rotas />} />
          <Route path="/rotas/:rotaId" element={<RotaDetalhe />} />
          <Route path="/escolas/:escolaId" element={<EscolaDetalhe />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="*" element={
            <div>
              <h2>Página não encontrada</h2>
              <Link to="/rotas">Voltar</Link>
            </div>
          } />
        </Routes>
      </div>
      <OfflineIndicator />
    </div>
  )
}
