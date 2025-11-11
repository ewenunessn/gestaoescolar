import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, LogOut, Home } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '250px',
        background: '#1a1a2e',
        color: 'white',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '5px' }}>
            Painel Admin
          </h1>
          <p style={{ fontSize: '12px', opacity: 0.7 }}>Gestão de Instituições</p>
        </div>

        <nav style={{ flex: 1 }}>
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            marginBottom: '8px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Home size={20} />
            Dashboard
          </Link>

          <Link to="/institutions" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            marginBottom: '8px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Building2 size={20} />
            Instituições
          </Link>
        </nav>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '20px'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '14px' }}>
            <div style={{ opacity: 0.7, fontSize: '12px', marginBottom: '5px' }}>
              Logado como
            </div>
            <div style={{ fontWeight: 'bold' }}>{user?.name}</div>
            <div style={{ opacity: 0.7, fontSize: '12px' }}>{user?.email}</div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '12px',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '30px',
        background: '#f5f5f5',
        overflowY: 'auto'
      }}>
        {children}
      </main>
    </div>
  );
}
