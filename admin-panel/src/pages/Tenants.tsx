import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import axios from 'axios';
import { Building2 } from 'lucide-react';

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  institution_name: string;
  total_escolas: number;
  total_usuarios: number;
  total_produtos: number;
}

export default function Tenants() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`${API_URL}/api/system-admin/data/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTenants(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTenantStatus = async (tenantId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      await axios.patch(
        `${API_URL}/api/system-admin/data/tenants/${tenantId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadTenants();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do tenant');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' }}>
          Gerenciar Tenants
        </h1>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {tenants.map((tenant, index) => (
            <div
              key={tenant.id}
              style={{
                padding: '20px',
                borderBottom: index < tenants.length - 1 ? '1px solid #e5e7eb' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Building2 size={20} color="#667eea" />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{tenant.name}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>{tenant.slug}</div>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#666', marginLeft: '30px' }}>
                  {tenant.institution_name || 'Sem instituição'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>
                    {tenant.total_escolas}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Escolas</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#11998e' }}>
                    {tenant.total_usuarios}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Usuários</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f093fb' }}>
                    {tenant.total_produtos}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Produtos</div>
                </div>

                <select
                  value={tenant.status}
                  onChange={(e) => updateTenantStatus(tenant.id, e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: tenant.status === 'active' ? '#d4edda' : '#f8d7da',
                    color: tenant.status === 'active' ? '#155724' : '#721c24',
                    cursor: 'pointer'
                  }}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="suspended">Suspenso</option>
                </select>

                <button
                  onClick={() => navigate(`/tenants/${tenant.id}`)}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Ver Detalhes →
                </button>
              </div>
            </div>
          ))}

          {tenants.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
              Nenhum tenant encontrado.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
