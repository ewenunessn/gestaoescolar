import { Link, useLocation } from 'react-router-dom'

export default function Topbar() {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')
  
  return (
    <header className="topbar">
      <div className="brand">
        <span className="dot" />
        Sistema de Entregas
      </div>
      <nav style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link 
          to="/rotas" 
          className="btn"
          style={{ 
            background: isActive('/rotas') ? 'var(--primary)' : 'transparent',
            color: isActive('/rotas') ? 'white' : 'var(--text-primary)',
            boxShadow: isActive('/rotas') ? '0 1px 2px var(--shadow)' : 'none'
          }}
        >
          📍 Rotas
        </Link>
        <Link 
          to="/historico" 
          className="btn"
          style={{ 
            background: isActive('/historico') ? 'var(--primary)' : 'transparent',
            color: isActive('/historico') ? 'white' : 'var(--text-primary)',
            boxShadow: isActive('/historico') ? '0 1px 2px var(--shadow)' : 'none'
          }}
        >
          📋 Histórico
        </Link>
      </nav>
    </header>
  )
}
