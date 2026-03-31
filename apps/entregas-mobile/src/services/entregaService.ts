import api from './api';

export interface User {
  id: number;
  nome: string;
  email: string;
  tipo: 'admin' | 'entregador' | 'escola';
}

export interface LoginResponse {
  token: string;
  tipo: string;
  nome: string;
}

export interface EscolaEntrega {
  id: number;
  nome: string;
  endereco?: string;
  telefone?: string;
  total_itens: number;
  itens_entregues: number;
  percentual_entregue: number;
  latitude?: number;
  longitude?: number;
}

export interface ItemEntrega {
  id: number;
  guia_id: number;
  produto_id: number;
  escola_id: number;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  para_entrega: boolean;
  entrega_confirmada: boolean;
  quantidade_entregue?: number;
  data_entrega?: string;
  nome_quem_recebeu?: string;
  nome_quem_entregou?: string;
  produto_nome: string;
  produto_unidade: string;
  mes: number;
  ano: number;
  guia_observacao?: string;
}

export interface ConfirmarEntregaData {
  quantidade_entregue: number;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  observacao?: string;
  latitude?: number;
  longitude?: number;
  precisao_gps?: number;
}

export interface EstatisticasEntregas {
  total_escolas: number;
  total_itens: number;
  itens_entregues: number;
  itens_pendentes: number;
  percentual_entregue: number;
}

export interface RotaEntrega {
  id: number;
  nome: string;
  cor: string;
  descricao?: string;
  total_escolas: number;
  total_itens: number;
  itens_entregues: number;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PlanejamentoEntrega {
  id: number;
  guia_id: number;
  rota_id: number;
  data_planejada?: string;
  status: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado';
  responsavel?: string;
  observacao?: string;
  created_at: string;
  updated_at: string;
  rota_nome?: string;
  rota_cor?: string;
  guia_mes?: number;
  guia_ano?: number;
}

class EntregaService {
  // ========== AUTENTICAÇÃO ==========
  
  // Login do usuário
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('🔐 Fazendo login para:', email);
      const response = await api.post('/auth/login', {
        email,
        senha: password
      });
      console.log('✅ Login realizado com sucesso');
      return response.data;
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  }

  // Buscar dados do usuário logado
  async buscarUsuario(): Promise<User> {
    try {
      console.log('👤 Buscando dados do usuário logado');
      const response = await api.get('/auth/me');
      console.log('✅ Dados do usuário recebidos:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ Erro ao buscar usuário:', error);
      throw error;
    }
  }

  // ========== ROTAS ==========
  
  // Listar todas as rotas de entrega
  async listarTodasRotas(): Promise<RotaEntrega[]> {
    try {
      console.log('🌐 Fazendo requisição para: /entregas/rotas');
      const response = await api.get('/entregas/rotas');
      console.log('✅ Todas as rotas recebidas:', response.data);
      
      // Normalizar dados das rotas
      return response.data.map((rota: any) => ({
        ...rota,
        id: Number(rota.id),
        total_escolas: Number(rota.total_escolas) || 0,
        total_itens: Number(rota.total_itens) || 0,
        itens_entregues: Number(rota.itens_entregues) || 0,
      }));
    } catch (error) {
      console.error('❌ Erro ao listar todas as rotas:', error);
      throw error;
    }
  }

  // Listar rotas disponíveis para entrega (com planejamentos)
  async listarRotas(guiaId?: number): Promise<RotaEntrega[]> {
    try {
      // Tentar usar rotas filtradas primeiro
      try {
        console.log('🌐 Tentando buscar rotas filtradas...');
        const response = await api.get('/entregas/rotas-filtradas');
        console.log('✅ Rotas filtradas recebidas:', response.data);
        
        // Normalizar dados das rotas
        return response.data.map((rota: any) => ({
          ...rota,
          id: Number(rota.id),
          total_escolas: Number(rota.total_escolas) || 0,
          total_itens: Number(rota.total_itens) || 0,
          itens_entregues: Number(rota.itens_entregues) || 0,
        }));
      } catch (filtroError) {
        console.log('⚠️ Rotas filtradas não disponíveis, usando método padrão');
        
        // Fallback para método original
        const params = new URLSearchParams();
        if (guiaId) params.append('guiaId', guiaId.toString());
        
        const url = `/entregas/rotas-entregas?${params.toString()}`;
        console.log('🌐 Fazendo requisição para:', url);
        const response = await api.get(url);
        console.log('✅ Rotas com entregas recebidas:', response.data);
        
        // Normalizar dados das rotas
        return response.data.map((rota: any) => ({
          ...rota,
          id: Number(rota.id),
          total_escolas: Number(rota.total_escolas) || 0,
          total_itens: Number(rota.total_itens) || 0,
          itens_entregues: Number(rota.itens_entregues) || 0,
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao listar rotas:', error);
      throw error;
    }
  }

  // Listar escolas de uma rota com itens para entrega
  async listarEscolasRota(rotaId?: number, guiaId?: number): Promise<EscolaEntrega[]> {
    try {
      // Tentar usar escolas filtradas primeiro
      try {
        const params = new URLSearchParams();
        if (rotaId) params.append('rotaId', rotaId.toString());
        if (guiaId) params.append('guiaId', guiaId.toString());
        
        const url = `/entregas/escolas-filtradas?${params.toString()}`;
        console.log('🌐 Tentando buscar escolas filtradas:', url);
        
        const response = await api.get(url);
        console.log('✅ Escolas filtradas recebidas:', response.data);
        
        // Normalizar dados das escolas
        return response.data.map((escola: any) => ({
          ...escola,
          id: Number(escola.id),
          total_itens: Number(escola.total_itens) || 0,
          itens_entregues: Number(escola.itens_entregues) || 0,
          percentual_entregue: Number(escola.percentual_entregue) || 0,
        }));
      } catch (filtroError) {
        console.log('⚠️ Escolas filtradas não disponíveis, usando método padrão');
        
        // Fallback para método original
        const params = new URLSearchParams();
        if (rotaId) params.append('rotaId', rotaId.toString());
        if (guiaId) params.append('guiaId', guiaId.toString());
        
        const url = `/entregas/escolas?${params.toString()}`;
        console.log('🌐 Fazendo requisição para:', url);
        
        const response = await api.get(url);
        console.log('✅ Escolas recebidas:', response.data);
        
        // Normalizar dados das escolas
        return response.data.map((escola: any) => ({
          ...escola,
          id: Number(escola.id),
          total_itens: Number(escola.total_itens) || 0,
          itens_entregues: Number(escola.itens_entregues) || 0,
          percentual_entregue: Number(escola.percentual_entregue) || 0,
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao listar escolas:', error);
      throw error;
    }
  }

  // Obter estatísticas gerais de entregas
  async obterEstatisticas(guiaId?: number, rotaId?: number): Promise<EstatisticasEntregas> {
    try {
      const params = new URLSearchParams();
      if (guiaId) params.append('guiaId', guiaId.toString());
      if (rotaId) params.append('rotaId', rotaId.toString());
      
      const url = `/entregas/estatisticas?${params.toString()}`;
      console.log('🌐 Fazendo requisição para:', url);
      
      const response = await api.get(url);
      console.log('✅ Estatísticas recebidas:', response.data);
      
      // Normalizar dados - converter strings para números
      const data = response.data;
      return {
        total_escolas: Number(data.total_escolas) || 0,
        total_itens: Number(data.total_itens) || 0,
        itens_entregues: Number(data.itens_entregues) || 0,
        itens_pendentes: Number(data.itens_pendentes) || 0,
        percentual_entregue: Number(data.percentual_entregue) || 0,
      };
    } catch (error) {
      // Não logar erro aqui pois é tratado no hybrid service
      throw error;
    }
  }

  // Listar itens para entrega de uma escola específica
  async listarItensEscola(escolaId: number, guiaId?: number): Promise<ItemEntrega[]> {
    try {
      // Tentar usar itens filtrados primeiro
      try {
        const params = new URLSearchParams();
        if (guiaId) params.append('guiaId', guiaId.toString());
        
        const url = `/entregas/escolas/${escolaId}/itens-filtrados?${params.toString()}`;
        console.log('🌐 Tentando buscar itens filtrados:', url);
        
        const response = await api.get(url);
        console.log('✅ Itens filtrados recebidos:', response.data);
        
        // Normalizar dados dos itens
        return response.data.map((item: any) => ({
          ...item,
          id: Number(item.id),
          guia_id: Number(item.guia_id),
          produto_id: Number(item.produto_id),
          escola_id: Number(item.escola_id),
          quantidade: Number(item.quantidade) || 0,
          quantidade_entregue: item.quantidade_entregue ? Number(item.quantidade_entregue) : undefined,
          para_entrega: Boolean(item.para_entrega),
          entrega_confirmada: Boolean(item.entrega_confirmada),
          mes: Number(item.mes),
          ano: Number(item.ano),
        }));
      } catch (filtroError) {
        console.log('⚠️ Itens filtrados não disponíveis, usando método padrão');
        
        // Fallback para método original
        const params = new URLSearchParams();
        if (guiaId) params.append('guiaId', guiaId.toString());
        
        const url = `/entregas/escolas/${escolaId}/itens?${params.toString()}`;
        console.log('🌐 Fazendo requisição para:', url);
        
        const response = await api.get(url);
        console.log('✅ Itens da escola recebidos:', response.data);
        
        // Normalizar dados dos itens
        return response.data.map((item: any) => ({
          ...item,
          id: Number(item.id),
          guia_id: Number(item.guia_id),
          produto_id: Number(item.produto_id),
          escola_id: Number(item.escola_id),
          quantidade: Number(item.quantidade) || 0,
          quantidade_entregue: item.quantidade_entregue ? Number(item.quantidade_entregue) : undefined,
          para_entrega: Boolean(item.para_entrega),
          entrega_confirmada: Boolean(item.entrega_confirmada),
          mes: Number(item.mes),
          ano: Number(item.ano),
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao listar itens da escola:', error);
      throw error;
    }
  }

  // Buscar detalhes de um item específico
  async buscarItem(itemId: number): Promise<ItemEntrega> {
    try {
      const response = await api.get(`/entregas/itens/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar item:', error);
      throw error;
    }
  }

  // Confirmar entrega de um item
  async confirmarEntrega(itemId: number, dados: ConfirmarEntregaData): Promise<{ message: string; item: ItemEntrega }> {
    try {
      const response = await api.post(`/entregas/itens/${itemId}/confirmar`, dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao confirmar entrega:', error);
      throw error;
    }
  }

  // Cancelar entrega de um item
  async cancelarEntrega(itemId: number): Promise<{ message: string; item: ItemEntrega }> {
    try {
      const response = await api.post(`/entregas/itens/${itemId}/cancelar`);
      return response.data;
    } catch (error) {
      console.error('Erro ao cancelar entrega:', error);
      throw error;
    }
  }

  // Cancelar item de entrega de forma segura (mantém integridade do comprovante)
  async cancelarItemEntrega(historicoEntregaId: number, motivo?: string): Promise<{ message: string; sucesso: boolean }> {
    try {
      const response = await api.post('/entregas/comprovantes/cancelar-item', {
        historico_entrega_id: historicoEntregaId,
        motivo
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao cancelar item de entrega:', error);
      throw error;
    }
  }

  // Listar planejamentos de entrega
  async listarPlanejamentos(guiaId?: number, rotaId?: number): Promise<PlanejamentoEntrega[]> {
    try {
      const params = new URLSearchParams();
      if (guiaId) params.append('guiaId', guiaId.toString());
      if (rotaId) params.append('rotaId', rotaId.toString());
      
      const url = `/entregas/planejamentos?${params.toString()}`;
      console.log('🌐 Fazendo requisição para:', url);
      
      const response = await api.get(url);
      console.log('✅ Planejamentos recebidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao listar planejamentos:', error);
      throw error;
    }
  }

  // Salvar foto localmente (não faz upload para servidor)
  async salvarFotoLocal(itemId: number, fotoUri: string): Promise<string> {
    try {
      // A foto já está salva localmente pelo expo-camera
      // Apenas retornamos o URI local para referência
      console.log(`📸 Foto salva localmente para item ${itemId}:`, fotoUri);
      return fotoUri;
    } catch (error) {
      console.error('Erro ao processar foto local:', error);
      throw error;
    }
  }
}

export const entregaService = new EntregaService();