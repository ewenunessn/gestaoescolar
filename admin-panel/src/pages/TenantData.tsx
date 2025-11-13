import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app';

interface TenantData {
  tenant: any;
  escolas: any[];
  modalidades: any[];
  produtos: any[];
  refeicoes: any[];
  cardapios: any[];
  fornecedores: any[];
  contratos: any[];
  pedidos: any[];
  usuarios: any[];
  stats: {
    total_escolas: number;
    total_modalidades: number;
    total_produtos: number;
    total_refeicoes: number;
    total_cardapios: number;
    total_fornecedores: number;
    total_contratos: number;
    total_pedidos: number;
    total_usuarios: number;
    total_alunos: number;
  };
}

export default function TenantData() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!data) return <div className="p-6">Tenant não encontrado</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/tenants')} className="text-blue-600 hover:underline mb-4">
          ← Voltar para Tenants
        </button>
        <h1 className="text-3xl font-bold">{data.tenant.name}</h1>
        <p className="text-gray-600">
          Instituição: {data.tenant.institution_name} | Status: 
          <span className={`ml-2 px-2 py-1 rounded text-sm ${
            data.tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {data.tenant.status}
          </span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{data.stats.total_escolas}</div>
          <div className="text-sm text-gray-600">Escolas</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{data.stats.total_alunos}</div>
          <div className="text-sm text-gray-600">Alunos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{data.stats.total_produtos}</div>
          <div className="text-sm text-gray-600">Produtos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">{data.stats.total_contratos}</div>
          <div className="text-sm text-gray-600">Contratos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">{data.stats.total_pedidos}</div>
          <div className="text-sm text-gray-600">Pedidos</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'escolas', 'produtos', 'contratos', 'pedidos', 'usuarios'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Modalidades ({data.stats.total_modalidades})</h3>
              <ul className="space-y-1">
                {data.modalidades.slice(0, 5).map(m => (
                  <li key={m.id} className="text-sm text-gray-600">• {m.nome}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Refeições ({data.stats.total_refeicoes})</h3>
              <ul className="space-y-1">
                {data.refeicoes.slice(0, 5).map(r => (
                  <li key={r.id} className="text-sm text-gray-600">• {r.nome}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Fornecedores ({data.stats.total_fornecedores})</h3>
              <ul className="space-y-1">
                {data.fornecedores.slice(0, 5).map(f => (
                  <li key={f.id} className="text-sm text-gray-600">• {f.nome}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Cardápios Recentes ({data.stats.total_cardapios})</h3>
              <ul className="space-y-1">
                {data.cardapios.slice(0, 5).map(c => (
                  <li key={c.id} className="text-sm text-gray-600">
                    • {c.escola_nome} - {new Date(c.data).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'escolas' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Município</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alunos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.escolas.map(escola => (
                  <tr key={escola.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{escola.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{escola.codigo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{escola.municipio}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{escola.total_alunos}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${escola.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {escola.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'produtos' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.produtos.map(produto => (
                  <tr key={produto.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{produto.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{produto.codigo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{produto.unidade_medida}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{produto.categoria}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'contratos' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Início</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Fim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.contratos.map(contrato => (
                  <tr key={contrato.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contrato.numero}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contrato.fornecedor_nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(contrato.data_inicio).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(contrato.data_fim).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {parseFloat(contrato.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pedidos' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escola</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.pedidos.map(pedido => (
                  <tr key={pedido.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pedido.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pedido.escola_nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(pedido.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                        {pedido.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.usuarios.map(usuario => (
                  <tr key={usuario.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{usuario.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.tipo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.tenant_role}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        usuario.tenant_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {usuario.tenant_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
