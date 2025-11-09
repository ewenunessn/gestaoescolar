import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { institutionService } from '../services/institutionService';
import { Building2, Users, Server, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      console.log('Loading institutions...');
      console.log('Token:', localStorage.getItem('admin_token')?.substring(0, 20));
      const response = await institutionService.list();
      console.log('Response:', response);
      const institutions = response.data || [];
      
      // Calcular estatísticas
      const totalInstitutions = institutions.length;
      const activeInstitutions = institutions.filter((i: any) => i.status === 'active').length;
      
      setStats({
        totalInstitutions,
        activeInstitutions,
        pendingInstitutions: institutions.filter((i: any) => i.status === 'pending').length,
        recentInstitutions: institutions.slice(0, 5)
      });
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      // Não fazer nada, deixar o loading false e mostrar 0
      setStats({
        totalInstitutions: 0,
        activeInstitutions: 0,
        pendingInstitutions: 0,
        recentInstitutions: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Carregando...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' }}>
          Dashboard
        </h1>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Building2 size={24} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
                  {stats?.totalInstitutions || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Total de Instituições
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={24} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
                  {stats?.activeInstitutions || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Instituições Ativas
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Server size={24} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
                  {stats?.pendingInstitutions || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Pendentes
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Institutions */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '25px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>
              Instituições Recentes
            </h2>
            <Link
              to="/institutions"
              style={{
                color: '#667eea',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Ver todas →
            </Link>
          </div>

          {stats?.recentInstitutions?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.recentInstitutions.map((inst: any) => (
                <Link
                  key={inst.id}
                  to={`/institutions/${inst.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
                >
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {inst.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {inst.type} • {inst.slug}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: inst.status === 'active' ? '#d4edda' : '#fff3cd',
                    color: inst.status === 'active' ? '#155724' : '#856404'
                  }}>
                    {inst.status === 'active' ? 'Ativo' : 'Pendente'}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              Nenhuma instituição cadastrada ainda
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: '30px' }}>
          <Link
            to="/institutions/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Building2 size={20} />
            Nova Instituição
          </Link>
        </div>
      </div>
    </Layout>
  );
}
