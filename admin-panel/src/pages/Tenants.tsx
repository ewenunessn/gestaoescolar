import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://gestaoescolar-backend-seven.vercel.app';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  institution_name: string;
  institution_subdomain: string;
  total_escolas: number;
  total_usuarios: number;
  total_produtos: number;
  total_contratos: number;
  total_pedidos: number;
  created_at: string;
}

export default function Tenants() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const token = localStorage.getItem('adminToken');
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
      const token = localStorage.getItem('adminToken');
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

  const filteredTenants = tenants.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Tenants</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Todos ({tenants.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded ${filter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            Ativos ({tenants.filter(t => t.status === 'active').length})
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded ${filter === 'inactive' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
          >
            Inativos ({tenants.filter(t => t.status === 'inactive').length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instituição</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escolas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuários</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produtos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTenants.map(tenant => (
              <tr key={tenant.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                  <div className="text-sm text-gray-500">{tenant.slug}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{tenant.institution_name}</div>
                  <div className="text-sm text-gray-500">{tenant.institution_subdomain}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{tenant.total_escolas}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{tenant.total_usuarios}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{tenant.total_produtos}</td>
                <td className="px-6 py-4">
                  <select
                    value={tenant.status}
                    onChange={(e) => updateTenantStatus(tenant.id, e.target.value)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      tenant.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : tenant.status === 'inactive'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="suspended">Suspenso</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    Ver Detalhes →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTenants.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhum tenant encontrado com o filtro selecionado.
        </div>
      )}
    </div>
  );
}
