import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import axios from 'axios';

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app';

export default function TenantData() {
  const { tenantId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenantData();
  }, [tenantId]);

  const loadTenantData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`${API_URL}/api/system-admin/data/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>Carregando...</div>
      </Layout>
    );
  }
  
  if (!data) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>Tenant não encontrado</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <Link
          to="/tenants"
          style={{
            color: '#667eea',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '20px',
            display: 'inline-block'
          }}
        >
          ← Voltar para Tenants
        </Link>

        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>
          {data.tenant.name}
        </h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Instituição: {data.tenant.institution_name || 'N/A'} | Status: {data.tenant.status}
        </p>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>{data.stats.total_escolas}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Escolas</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#11998e' }}>{data.stats.total_alunos}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Alunos</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f093fb' }}>{data.stats.total_produtos}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Produtos</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f5576c' }}>{data.stats.total_contratos}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Contratos</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa709a' }}>{data.stats.total_usuarios}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Usuários</div>
          </div>
        </div>

        {/* Escolas */}
        {data.escolas.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '25px',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
              Escolas ({data.stats.total_escolas})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.escolas.map((escola: any) => (
                <div
                  key={escola.id}
                  style={{
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{escola.nome}</div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    {escola.municipio} • {escola.total_alunos} alunos
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Produtos */}
        {data.produtos.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '25px',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
              Produtos ({data.stats.total_produtos})
            </h2>
            <div style={{ fontSize: '14px', color: '#666' }}>
              {data.produtos.slice(0, 10).map((p: any) => p.nome).join(', ')}
              {data.produtos.length > 10 && ` e mais ${data.produtos.length - 10}...`}
            </div>
          </div>
        )}

        {/* Usuários */}
        {data.usuarios.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '25px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
              Usuários ({data.stats.total_usuarios})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.usuarios.map((usuario: any) => (
                <div
                  key={usuario.id}
                  style={{
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{usuario.nome}</div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    {usuario.email} • {usuario.tenant_role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
