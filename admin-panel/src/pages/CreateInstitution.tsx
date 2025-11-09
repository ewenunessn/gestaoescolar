import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { institutionService } from '../services/institutionService';
import { planService } from '../services/planService';
import { ArrowLeft, Building2, Save } from 'lucide-react';

export default function CreateInstitution() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await planService.list();
      setPlans(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    }
  };
  
  const [formData, setFormData] = useState({
    institution: {
      name: '',
      slug: '',
      legal_name: '',
      document_number: '',
      type: 'prefeitura',
      email: '',
      phone: '',
      address: {
        street: '',
        number: '',
        city: '',
        state: '',
        zipcode: ''
      }
    },
    tenant: {
      name: '',
      slug: '',
      subdomain: ''
    },
    admin: {
      nome: '',
      email: '',
      senha: ''
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await institutionService.provisionComplete(formData);
      alert('Instituição criada com sucesso!');
      navigate(`/institutions/${response.data.institution.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar instituição');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateAddressField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      institution: {
        ...prev.institution,
        address: {
          ...prev.institution.address,
          [field]: value
        }
      }
    }));
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

        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' }}>
          Nova Instituição
        </h1>

        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Dados da Instituição */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
              Dados da Instituição
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.institution.name}
                  onChange={(e) => updateField('institution', 'name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formData.institution.slug}
                  onChange={(e) => updateField('institution', 'slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Razão Social
                </label>
                <input
                  type="text"
                  value={formData.institution.legal_name}
                  onChange={(e) => updateField('institution', 'legal_name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.institution.document_number}
                  onChange={(e) => updateField('institution', 'document_number', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Tipo
                </label>
                <select
                  value={formData.institution.type}
                  onChange={(e) => updateField('institution', 'type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="prefeitura">Prefeitura</option>
                  <option value="secretaria">Secretaria</option>
                  <option value="organizacao">Organização</option>
                  <option value="empresa">Empresa</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Plano *
                </label>
                <select
                  value={formData.institution.plan_id || ''}
                  onChange={(e) => updateField('institution', 'plan_id', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Selecione um plano</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.max_users} usuários, {plan.max_schools} escolas
                      {plan.price > 0 && ` (R$ ${plan.price}/mês)`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.institution.email}
                  onChange={(e) => updateField('institution', 'email', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tenant Inicial */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
              Tenant Inicial
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Nome do Tenant *
                </label>
                <input
                  type="text"
                  required
                  value={formData.tenant.name}
                  onChange={(e) => updateField('tenant', 'name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Slug do Tenant *
                </label>
                <input
                  type="text"
                  required
                  value={formData.tenant.slug}
                  onChange={(e) => updateField('tenant', 'slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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
            </div>
          </div>

          {/* Usuário Administrador */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
              Usuário Administrador
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.admin.nome}
                  onChange={(e) => updateField('admin', 'nome', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.admin.email}
                  onChange={(e) => updateField('admin', 'email', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Senha *
                </label>
                <input
                  type="password"
                  required
                  value={formData.admin.senha}
                  onChange={(e) => updateField('admin', 'senha', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 24px',
                background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              <Save size={20} />
              {loading ? 'Criando...' : 'Criar Instituição'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/institutions')}
              style={{
                padding: '14px 24px',
                background: 'white',
                color: '#666',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
