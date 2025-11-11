import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { institutionService } from '../services/institutionService';
import { planService } from '../services/planService';
import { ArrowLeft, Building2, Users, Server, Plus } from 'lucide-react';

export default function InstitutionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [institution, setInstitution] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadData();
      loadPlans();
    }
  }, [id]);

  const loadPlans = async () => {
    try {
      const response = await planService.list();
      setPlans(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    }
  };

  const loadData = async () => {
    try {
      console.log('Loading institution data for ID:', id);
      console.log('Token:', localStorage.getItem('admin_token')?.substring(0, 20));
      
      const [instResponse, statsResponse, tenantsResponse, usersResponse] = await Promise.all([
        institutionService.getById(id!),
        institutionService.getStats(id!),
        institutionService.getTenants(id!),
        institutionService.getUsers(id!)
      ]);

      console.log('Data loaded successfully');
      setInstitution(instResponse.data);
      setStats(statsResponse.data);
      setTenants(tenantsResponse.data);
      setUsers(usersResponse.data);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      console.error('Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      });
      
      // Se for erro 404, mostrar mensagem
      if (error.response?.status === 404) {
        setInstitution(null);
      }
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

  if (!institution) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Instituição não encontrada
        </div>
      </Layout>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      // Criar usuário sem tenant específico - ele terá acesso a todos os tenants da instituição
      await institutionService.createUser(id!, {
        nome: formData.get('nome'),
        email: formData.get('email'),
        senha: formData.get('senha'),
        tipo: formData.get('tipo'),
        institution_role: formData.get('institution_role')
      });
      
      alert('Usuário criado com sucesso! Ele terá acesso a todos os tenants da instituição.');
      setShowCreateUserModal(false);
      loadData();
    } catch (error: any) {
      alert('Erro ao criar usuário: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      await institutionService.createTenant(id!, {
        name: formData.get('name') as string,
        slug: formData.get('slug') as string,
        subdomain: formData.get('subdomain') as string
      });
      
      alert('Tenant criado com sucesso!');
      setShowCreateTenantModal(false);
      loadData();
    } catch (error: any) {
      alert('Erro ao criar tenant: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      await institutionService.update(id!, {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        status: formData.get('status') as string,
        plan_id: formData.get('plan_id') ? parseInt(formData.get('plan_id') as string) : undefined
      });
      
      alert('Instituição atualizada com sucesso!');
      setShowEditModal(false);
      loadData();
    } catch (error: any) {
      alert('Erro ao atualizar instituição: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <Layout>
      <div>
        <button
          onClick={() => navigate('/institutions')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '20px',
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={18} />
          Voltar
        </button>

        {/* Header */}
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>
                {institution.name}
              </h1>
              <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#666' }}>
                <span>Slug: <code>{institution.slug}</code></span>
                <span>•</span>
                <span>Tipo: {institution.type}</span>
                <span>•</span>
                <span>
                  Status: 
                  <span style={{
                    marginLeft: '8px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: institution.status === 'active' ? '#d4edda' : '#fff3cd',
                    color: institution.status === 'active' ? '#155724' : '#856404'
                  }}>
                    {institution.status === 'active' ? 'Ativo' : 'Pendente'}
                  </span>
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                padding: '10px 20px',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Editar
            </button>
          </div>
        </div>

        {/* Plan Info */}
        {institution.limits && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>
              Plano Atual
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>
              {institution.plan_name || 'Não definido'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Tenants</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {stats?.total_tenants || 0} / {institution.plan_max_tenants || institution.limits.max_tenants}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Usuários</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {stats?.total_users || 0} / {institution.plan_max_users || institution.limits.max_users}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Escolas</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {stats?.total_schools || 0} / {institution.plan_max_schools || institution.limits.max_schools}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Server size={20} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {stats?.total_tenants || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Tenants</div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={20} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {stats?.total_users || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Usuários</div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Building2 size={20} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {stats?.total_schools || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Escolas</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tenants */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Tenants ({tenants.length})
            </h2>
            <button
              onClick={() => setShowCreateTenantModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <Plus size={16} />
              Novo Tenant
            </button>
          </div>

          {tenants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
              Nenhum tenant cadastrado
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  style={{
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {tenant.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {tenant.slug} • {tenant.subdomain}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: tenant.status === 'active' ? '#d4edda' : '#fff3cd',
                    color: tenant.status === 'active' ? '#155724' : '#856404'
                  }}>
                    {tenant.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Usuários ({users.length})
            </h2>
            <button
              onClick={() => setShowCreateUserModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <Users size={16} />
              Novo Usuário
            </button>
          </div>

          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
              Nenhum usuário cadastrado
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.map((user) => (
                <div
                  key={user.id}
                  style={{
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {user.user_name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {user.user_email} • {user.user_type} • Função: {user.role}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: '#e3f2fd',
                      color: '#1976d2'
                    }}>
                      {user.role}
                    </span>
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setShowEditUserModal(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#666'
                      }}
                      title="Editar usuário"
                    >
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Tem certeza que deseja remover ${user.user_name} desta instituição?`)) {
                          try {
                            await institutionService.removeUser(id!, user.user_id);
                            alert('Usuário removido com sucesso!');
                            loadData();
                          } catch (error: any) {
                            alert(error.response?.data?.message || 'Erro ao remover usuário');
                          }
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#fff',
                        border: '1px solid #f44336',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#f44336'
                      }}
                      title="Remover usuário"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Criar Usuário */}
        {showCreateUserModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
                Novo Usuário
              </h2>
              
              <form onSubmit={handleCreateUser}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Nome *
                  </label>
                  <input
                    name="nome"
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Email *
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Senha *
                  </label>
                  <input
                    name="senha"
                    type="password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Tipo de Usuário
                  </label>
                  <select
                    name="tipo"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="usuario">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Nível de Acesso
                  </label>
                  <select
                    name="institution_role"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="user">Usuário - Acesso básico</option>
                    <option value="manager">Gerente - Pode gerenciar dados</option>
                    <option value="institution_admin">Admin - Acesso total</option>
                  </select>
                  <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                    O usuário terá acesso a todos os {tenants.length} tenant(s) da instituição
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Criar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#e0e0e0',
                      color: '#333',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Usuário */}
        {showEditUserModal && editingUser && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
                Editar Usuário
              </h2>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                
                try {
                  await institutionService.updateUser(id!, editingUser.user_id, {
                    institution_role: formData.get('institution_role')
                  });
                  alert('Usuário atualizado com sucesso!');
                  setShowEditUserModal(false);
                  setEditingUser(null);
                  loadData();
                } catch (error: any) {
                  alert(error.response?.data?.message || 'Erro ao atualizar usuário');
                }
              }}>
                <div style={{ marginBottom: '15px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Nome:</strong> {editingUser.user_name}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Email:</strong> {editingUser.user_email}
                  </div>
                  <div>
                    <strong>Tipo:</strong> {editingUser.user_type}
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Nível de Acesso na Instituição
                  </label>
                  <select
                    name="institution_role"
                    defaultValue={editingUser.role}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="user">Usuário - Acesso básico</option>
                    <option value="manager">Gerente - Pode gerenciar dados</option>
                    <option value="institution_admin">Admin - Acesso total</option>
                  </select>
                  <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                    Define as permissões do usuário nesta instituição
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditUserModal(false);
                      setEditingUser(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#e0e0e0',
                      color: '#333',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Criar Tenant */}
        {showCreateTenantModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              width: '90%',
              maxWidth: '500px'
            }}>
              <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
                Novo Tenant
              </h2>
              
              <form onSubmit={handleCreateTenant}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Nome *
                  </label>
                  <input
                    name="name"
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Slug *
                  </label>
                  <input
                    name="slug"
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Subdomínio
                  </label>
                  <input
                    name="subdomain"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Criar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateTenantModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#e0e0e0',
                      color: '#333',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Instituição */}
        {showEditModal && institution && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              width: '90%',
              maxWidth: '500px'
            }}>
              <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
                Editar Instituição
              </h2>
              
              <form onSubmit={handleUpdateInstitution}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Nome *
                  </label>
                  <input
                    name="name"
                    defaultValue={institution.name}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={institution.email}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Telefone
                  </label>
                  <input
                    name="phone"
                    defaultValue={institution.phone}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Plano
                  </label>
                  <select
                    name="plan_id"
                    defaultValue={institution.plan_id}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Nenhum</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {plan.max_users} usuários, {plan.max_schools} escolas
                        {plan.price > 0 && ` (R$ ${plan.price}/mês)`}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={institution.status}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="suspended">Suspenso</option>
                    <option value="pending">Pendente</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#e0e0e0',
                      color: '#333',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
