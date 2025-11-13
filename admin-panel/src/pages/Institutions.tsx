import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { institutionService } from '../services/institutionService';
import { Plus, Search, Trash2 } from 'lucide-react';

export default function Institutions() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    try {
      const response = await institutionService.list();
      setInstitutions(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar instituições:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, institutionId: number, institutionName: string) => {
    e.stopPropagation();
    
    if (!confirm(`Tem certeza que deseja deletar a instituição "${institutionName}"?\n\nISSO IRÁ DELETAR:\n- Todos os tenants da instituição\n- Todas as escolas dos tenants\n- Todos os produtos dos tenants\n- Todos os usuários dos tenants\n- Todos os contratos dos tenants\n\nEsta ação NÃO PODE ser desfeita!`)) {
      return;
    }

    try {
      await institutionService.delete(institutionId);
      alert('Instituição deletada com sucesso!');
      loadInstitutions();
    } catch (error: any) {
      console.error('Erro ao deletar instituição:', error);
      alert(error.response?.data?.error || 'Erro ao deletar instituição');
    }
  };

  const filteredInstitutions = institutions.filter(inst => {
    const matchesSearch = inst.name.toLowerCase().includes(search.toLowerCase()) ||
                         inst.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inst.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>
            Instituições
          </h1>
          <Link
            to="/institutions/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
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
            <Plus size={20} />
            Nova Instituição
          </Link>
        </div>

        {/* Filters */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px',
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#999'
              }} />
              <input
                type="text"
                placeholder="Buscar por nome ou slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 40px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 15px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="pending">Pendente</option>
            <option value="inactive">Inativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>

        {/* List */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#999' }}>
              Carregando...
            </div>
          ) : filteredInstitutions.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#999' }}>
              Nenhuma instituição encontrada
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>
                    Nome
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>
                    Tipo
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>
                    Slug
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>
                    Status
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>
                    Criado em
                  </th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', fontSize: '14px', width: '100px' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInstitutions.map((inst) => (
                  <tr
                    key={inst.id}
                    style={{
                      borderBottom: '1px solid #e0e0e0',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Navegando para instituição:', inst.id);
                      window.location.href = `/institutions/${inst.id}`;
                    }}
                  >
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {inst.name}
                      </div>
                      {inst.legal_name && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {inst.legal_name}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '15px', fontSize: '14px', color: '#666' }}>
                      {inst.type}
                    </td>
                    <td style={{ padding: '15px', fontSize: '14px', fontFamily: 'monospace' }}>
                      {inst.slug}
                    </td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: inst.status === 'active' ? '#d4edda' : 
                                   inst.status === 'pending' ? '#fff3cd' : '#f8d7da',
                        color: inst.status === 'active' ? '#155724' : 
                               inst.status === 'pending' ? '#856404' : '#721c24'
                      }}>
                        {inst.status === 'active' ? 'Ativo' : 
                         inst.status === 'pending' ? 'Pendente' : 
                         inst.status === 'suspended' ? 'Suspenso' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '15px', fontSize: '14px', color: '#666' }}>
                      {new Date(inst.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => handleDelete(e, inst.id, inst.name)}
                        style={{
                          padding: '8px 12px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#c82333';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#dc3545';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Trash2 size={14} />
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
