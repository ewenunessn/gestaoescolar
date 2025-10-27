import { storage } from '../utils/storage';
import { ItemEstoqueEscola, HistoricoEstoque, ResumoEstoque, AtualizacaoLote, MovimentoEstoque } from '../types';
import { API_CONFIG, API_ENDPOINTS, DEV_CONFIG } from '../config/api';

// Função auxiliar para processar datas corrigindo problema de timezone
const processarDataCorreta = (dataStr: string): Date => {
  // CORREÇÃO DEFINITIVA: Sempre extrair apenas YYYY-MM-DD
  // Isso resolve o problema de datas com T00:00:00.000Z que são interpretadas como UTC
  const dataApenas = String(dataStr).split('T')[0];
  const [ano, mes, dia] = dataApenas.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

class ApiService {
  // Métodos para gerenciar tokens
  async getToken(): Promise<string | null> {
    try {
      return await storage.getItem('auth_token');
    } catch (error) {
      console.error('Erro ao obter token:', error);
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      await storage.setItem('auth_token', token);
    } catch (error) {
      console.error('Erro ao salvar token:', error);
    }
  }

  async removeToken(): Promise<void> {
    try {
      await storage.removeItem('auth_token');
    } catch (error) {
      console.error('Erro ao remover token:', error);
    }
  }
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();

    // Simular delay de rede em desenvolvimento
    if (DEV_CONFIG.NETWORK_DELAY > 0) {
      await new Promise(resolve => setTimeout(resolve, DEV_CONFIG.NETWORK_DELAY));
    }

    const url = `${API_CONFIG.BASE_URL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        ...API_CONFIG.HEADERS,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (DEV_CONFIG.ENABLE_LOGS) {
      console.log(`API Request: ${options.method || 'GET'} ${url}`, options.body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        if (DEV_CONFIG.ENABLE_LOGS) {
          console.error(`API Error: ${response.status} - ${errorText}`);
        }

        // Se for erro 401, limpar token
        if (response.status === 401) {
          await this.removeToken();
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (DEV_CONFIG.ENABLE_LOGS) {
        console.log(`API Response:`, result);
      }

      return result;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Estoque Escola - Adaptado para o backend do Vercel
  async listarEstoqueEscola(escolaId: number): Promise<ItemEstoqueEscola[]> {
    try {
      const response = await this.request<any>(`/api/estoque-escola/escola/${escolaId}`);
      // Adaptar dados do backend para o formato esperado pelo app
      const dados = response.data || [];

      // Mapear dados e incluir informações de validade
      const itens = await Promise.all(dados.map(async (item: any) => {
        // Buscar lotes do produto para calcular informações de validade
        const lotes = await this.listarLotesProduto(item.produto_id);
        const lotesAtivos = lotes.filter(l => l.status === 'ativo' && l.quantidade_atual > 0);
        
        // Calcular informações de validade
        let proximoVencimento: string | undefined;
        let diasProximoVencimento: number | undefined;
        let statusValidade: 'vencido' | 'critico' | 'atencao' | 'normal' = 'normal';
        let temLotesVencidos = false;
        let temLotesCriticos = false;

        if (lotesAtivos.length > 0) {
          // Ordenar lotes por data de validade
          const lotesComValidade = lotesAtivos
            .filter(l => l.data_validade)
            .sort((a, b) => processarDataCorreta(a.data_validade!).getTime() - processarDataCorreta(b.data_validade!).getTime());

          if (lotesComValidade.length > 0) {
            proximoVencimento = lotesComValidade[0].data_validade;
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const dataVencimento = processarDataCorreta(proximoVencimento!);
            diasProximoVencimento = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

            // Determinar status de validade
            if (diasProximoVencimento <= 0) {
              statusValidade = 'vencido';
              temLotesVencidos = true;
            } else if (diasProximoVencimento <= 7) {
              statusValidade = 'critico';
              temLotesCriticos = true;
            } else if (diasProximoVencimento <= 30) {
              statusValidade = 'atencao';
            }

            // Verificar se há lotes vencidos ou críticos
            temLotesVencidos = lotesComValidade.some(l => {
              const dias = Math.ceil((processarDataCorreta(l.data_validade!).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
              return dias <= 0;
            });

            temLotesCriticos = lotesComValidade.some(l => {
              const dias = Math.ceil((processarDataCorreta(l.data_validade!).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
              return dias > 0 && dias <= 7;
            });
          }
        }

        return {
          id: item.id,
          produto_id: item.produto_id,
          escola_id: item.escola_id,
          quantidade_atual: item.quantidade_atual || 0,
          quantidade_minima: item.quantidade_minima || 0,
          quantidade_maxima: item.quantidade_maxima || 0,
          status_estoque: item.status_estoque || 'normal',
          data_ultima_atualizacao: item.data_ultima_atualizacao || new Date().toISOString(),
          produto_nome: item.produto_nome || 'Produto sem nome',
          produto_descricao: item.produto_descricao || '',
          unidade_medida: item.unidade_medida || 'un',
          categoria: item.categoria || 'Geral',
          escola_nome: item.escola_nome || 'Escola',
          // Dados de validade do backend (controle simples)
          // IMPORTANTE: Garantir que datas são strings, não objetos Date
          data_validade: item.data_validade ? (item.data_validade instanceof Date ? item.data_validade.toISOString().split('T')[0] : String(item.data_validade)) : undefined,
          data_entrada: item.data_entrada ? (item.data_entrada instanceof Date ? item.data_entrada.toISOString().split('T')[0] : String(item.data_entrada)) : undefined,
          dias_para_vencimento: item.dias_para_vencimento,
          // Informações de validade calculadas (para compatibilidade)
          lotes: lotesAtivos,
          proximo_vencimento: proximoVencimento || item.data_validade,
          dias_proximo_vencimento: diasProximoVencimento || item.dias_para_vencimento,
          status_validade: statusValidade,
          tem_lotes_vencidos: temLotesVencidos,
          tem_lotes_criticos: temLotesCriticos,
          produto: {
            id: item.produto_id,
            nome: item.produto_nome || 'Produto sem nome',
            descricao: item.produto_descricao || '',
            unidade_medida: item.unidade_medida || 'un',
            categoria: item.categoria || 'Geral'
          },
          escola: {
            id: item.escola_id,
            nome: item.escola_nome || 'Escola'
          }
        };
      }));

      return itens;
    } catch (error) {
      console.error('Erro ao listar estoque:', error);
      return [];
    }
  }

  async listarProdutos(): Promise<any[]> {
    try {
      const response = await this.request<any>('/api/produtos');
      return response.data || [];
    } catch (error) {
      console.error('Erro ao listar produtos:', error);
      return [];
    }
  }

  async obterResumoEstoque(escolaId: number): Promise<ResumoEstoque> {
    try {
      const response = await this.request<any>(`/api/estoque-escola/escola/${escolaId}/resumo`);
      return response.data || {
        total_itens: 0,
        itens_normais: 0,
        itens_baixos: 0,
        itens_sem_estoque: 0
      };
    } catch (error) {
      console.error('Erro ao obter resumo:', error);
      return {
        total_itens: 0,
        itens_normais: 0,
        itens_baixos: 0,
        itens_sem_estoque: 0
      };
    }
  }

  async listarHistoricoMovimentos(escolaId: number, limit?: number, offset?: number): Promise<HistoricoEstoque[]> {
    try {
      let endpoint = API_ENDPOINTS.ESTOQUE_HISTORICO(escolaId);

      // Adicionar parâmetros de paginação se fornecidos
      if (limit !== undefined || offset !== undefined) {
        const params = new URLSearchParams();
        if (limit !== undefined) params.append('limit', limit.toString());
        if (offset !== undefined) params.append('offset', offset.toString());
        endpoint += `?${params.toString()}`;
      }

      const response = await this.request<any>(endpoint);

      // Verificar se a resposta tem o formato esperado
      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (Array.isArray(response)) {
        return response;
      }

      console.warn('Formato de resposta inesperado para histórico:', response);
      return [];
    } catch (error) {
      console.error('Erro ao listar histórico:', error);
      // Se o endpoint não existir, retornar array vazio sem erro
      return [];
    }
  }

  async obterItemEstoque(itemId: number): Promise<ItemEstoqueEscola> {
    try {
      const response = await this.request<any>(`/api/estoque-moderno/${itemId}`);
      if (!response.data) {
        throw new Error('Item não encontrado');
      }
      return response.data;
    } catch (error) {
      console.error('Erro ao obter item:', error);
      throw error;
    }
  }

  // CRUD Estoque - Adaptado para o backend do Vercel (somente leitura)
  async criarItemEstoque(item: Omit<ItemEstoqueEscola, 'id' | 'created_at' | 'updated_at'>): Promise<ItemEstoqueEscola> {
    // Como o backend do Vercel não suporta POST para estoque, simular criação
    console.warn('Criação de item simulada - backend somente leitura');
    const novoItem: ItemEstoqueEscola = {
      id: Date.now(),
      ...item,
      data_ultima_atualizacao: new Date().toISOString()
    };
    return Promise.resolve(novoItem);
  }

  async adicionarItemEstoque(escolaId: number, item: Partial<ItemEstoqueEscola>): Promise<ItemEstoqueEscola> {
    // Como o backend do Vercel não suporta POST para estoque, simular criação
    console.warn('Adição de item simulada - backend somente leitura');
    const novoItem: ItemEstoqueEscola = {
      id: Date.now(),
      produto_id: item.produto_id || Date.now(),
      escola_id: escolaId,
      quantidade_atual: item.quantidade_atual || 0,
      quantidade_minima: item.quantidade_minima || 0,
      status_estoque: 'normal',
      data_ultima_atualizacao: new Date().toISOString(),
      produto_nome: item.produto_nome || 'Novo Item',
      unidade_medida: item.unidade_medida || 'un',
      categoria: item.categoria || 'Categoria',
      escola_nome: item.escola_nome || 'Escola'
    };
    return Promise.resolve(novoItem);
  }

  async atualizarItemEstoque(itemId: number, item: Partial<ItemEstoqueEscola>): Promise<ItemEstoqueEscola> {
    // Como o backend do Vercel não suporta PUT para estoque, simular atualização
    console.warn('Atualização de item simulada - backend somente leitura');
    const itemAtualizado: ItemEstoqueEscola = {
      id: itemId,
      produto_id: item.produto_id || itemId,
      escola_id: item.escola_id || 1,
      quantidade_atual: item.quantidade_atual || 0,
      quantidade_minima: item.quantidade_minima || 0,
      status_estoque: item.status_estoque || 'normal',
      data_ultima_atualizacao: new Date().toISOString(),
      produto_nome: item.produto_nome || 'Item Atualizado',
      unidade_medida: item.unidade_medida || 'un',
      categoria: item.categoria || 'Categoria',
      escola_nome: item.escola_nome || 'Escola'
    };
    return Promise.resolve(itemAtualizado);
  }

  async excluirItemEstoque(itemId: number): Promise<void> {
    // Como o backend do Vercel não suporta DELETE para estoque, simular exclusão
    console.warn('Exclusão de item simulada - backend somente leitura');
    return Promise.resolve();
  }

  async movimentarEstoque(movimento: Omit<HistoricoEstoque, 'id' | 'data_movimentacao'>): Promise<HistoricoEstoque> {
    // Como o backend do Vercel não suporta POST para movimentação, simular
    console.warn('Movimentação simulada - backend somente leitura');
    const novaMovimentacao: HistoricoEstoque = {
      id: Date.now(),
      ...movimento,
      data_movimentacao: new Date().toISOString()
    };
    return Promise.resolve(novaMovimentacao);
  }

  async atualizarQuantidadeItem(
    escolaId: number,
    produtoId: number,
    movimento: MovimentoEstoque
  ): Promise<ItemEstoqueEscola> {
    // Se tem lotes, usar endpoint específico para lotes
    if (movimento.lotes && movimento.lotes.length > 0) {
      const dadosMovimentacao = {
        produto_id: produtoId,
        tipo_movimentacao: movimento.tipo_movimentacao || movimento.tipo || 'ajuste',
        lotes: movimento.lotes,
        motivo: movimento.motivo || '',
        documento_referencia: movimento.documento_referencia || '',
        usuario_id: movimento.usuario_id || 1
      };

      return this.request<ItemEstoqueEscola>(`/api/estoque-escola/escola/${escolaId}/movimentacao-lotes`, {
        method: 'POST',
        body: JSON.stringify(dadosMovimentacao),
      });
    } else {
      // Usar endpoint tradicional para movimentação simples
      const dadosMovimentacao = {
        produto_id: produtoId,
        tipo_movimentacao: movimento.tipo_movimentacao || movimento.tipo || 'ajuste',
        quantidade: movimento.quantidade_movimentada !== undefined ? movimento.quantidade_movimentada : movimento.quantidade,
        motivo: movimento.motivo || '',
        documento_referencia: movimento.documento_referencia || '',
        usuario_id: movimento.usuario_id || 1
      };

      return this.request<ItemEstoqueEscola>(API_ENDPOINTS.MOVIMENTO_ESTOQUE(escolaId), {
        method: 'POST',
        body: JSON.stringify(dadosMovimentacao),
      });
    }
  }

  // Métodos para gerenciar lotes (usando endpoints do estoque escolar)
  async listarLotesProduto(produtoId: number): Promise<any[]> {
    try {
      const response = await this.request<any>(`/api/estoque-escola/produtos/${produtoId}/lotes`);
      return (response.data || []).map((lote: any) => ({
        id: lote.id,
        produto_id: lote.produto_id,
        lote: lote.lote,
        quantidade_inicial: lote.quantidade_inicial || 0,
        quantidade_atual: lote.quantidade_atual || 0,
        // IMPORTANTE: Garantir que datas são strings, não objetos Date
        data_fabricacao: lote.data_fabricacao ? (lote.data_fabricacao instanceof Date ? lote.data_fabricacao.toISOString().split('T')[0] : String(lote.data_fabricacao)) : undefined,
        data_validade: lote.data_validade ? (lote.data_validade instanceof Date ? lote.data_validade.toISOString().split('T')[0] : String(lote.data_validade)) : undefined,
        fornecedor_id: lote.fornecedor_id,
        observacoes: lote.observacoes,
        status: lote.status || 'ativo',
        created_at: lote.created_at,
        updated_at: lote.updated_at
      }));
    } catch (error: any) {
      console.error('Erro ao listar lotes:', error);
      return [];
    }
  }

  async criarLote(lote: any): Promise<any> {
    try {
      return this.request<any>('/api/estoque-escola/lotes', {
        method: 'POST',
        body: JSON.stringify(lote),
      });
    } catch (error) {
      console.error('Erro ao criar lote:', error);
      throw error;
    }
  }

  async processarMovimentacaoLotes(escolaId: number, dados: any): Promise<any> {
    try {
      return this.request<any>(`/api/estoque-escola/escola/${escolaId}/movimentacao-lotes`, {
        method: 'POST',
        body: JSON.stringify(dados),
      });
    } catch (error) {
      console.error('Erro ao processar movimentação com lotes:', error);
      throw error;
    }
  }

  async atualizarLoteItens(
    escolaId: number,
    atualizacoes: AtualizacaoLote[]
  ): Promise<{ sucesso: boolean; itens_atualizados: number }> {
    return this.request(API_ENDPOINTS.ESTOQUE_LOTE(escolaId), {
      method: 'PUT',
      body: JSON.stringify({ atualizacoes }),
    });
  }

  // Listar escolas para seleção
  async listarEscolas(): Promise<any[]> {
    try {
      const response = await this.request<any>('/api/gestor-escola/escolas');
      return response.data || [];
    } catch (error) {
      console.error('Erro ao listar escolas:', error);
      throw new Error('Erro ao carregar lista de escolas');
    }
  }

  // Autenticar gestor com código de acesso
  async autenticarGestor(escola_id: number, codigo_acesso: string): Promise<{ success: boolean; message: string; data?: { escola: any; token: string } }> {
    try {
      const response = await this.request<any>('/api/gestor-escola/autenticar', {
        method: 'POST',
        body: JSON.stringify({
          escola_id,
          codigo_acesso
        })
      });

      if (response.success && response.data) {
        // Salvar token automaticamente após login bem-sucedido
        await this.setToken(response.data.token);
      }

      return response;
    } catch (error: any) {
      console.error('Erro na autenticação:', error);
      if (error.message?.includes('401')) {
        throw { success: false, message: 'Código de acesso inválido para esta escola' };
      }
      throw { success: false, message: 'Erro de conexão' };
    }
  }

  // Verificar se o acesso ainda é válido
  async verificarAcesso(escola_id: number, codigo_acesso: string): Promise<boolean> {
    try {
      const response = await this.request<any>(`/api/gestor-escola/verificar/${escola_id}?codigo_acesso=${codigo_acesso}`);
      return response.success;
    } catch (error) {
      return false;
    }
  }

  // Login legado (mantido para compatibilidade)
  async login(email: string, senha: string): Promise<{ token: string; usuario: any }> {
    try {
      // Verificar se o backend está online
      const healthCheck = await this.request('/health');

      // Como o backend do Vercel não tem endpoint de login POST ativo,
      // vamos usar os dados dos usuários disponíveis via GET
      const usuarios = await this.request('/api/usuarios') as { data?: any[] };

      // Buscar usuário por email
      const usuario = usuarios.data?.find((u: any) => u.email === email);

      if (!usuario) {
        throw new Error('Usuário não encontrado');
      }

      // Simular validação de senha (em produção, isso seria feito no backend)
      if (senha !== 'admin123' && senha !== '123456') {
        throw new Error('Senha incorreta');
      }

      // Gerar token mock
      const token = `mock_token_${usuario.id}_${Date.now()}`;

      // Salvar token automaticamente após login bem-sucedido
      await this.setToken(token);

      return {
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo,
          ativo: usuario.ativo
        }
      };
    } catch (error) {
      console.error('Erro no login:', error);
      throw new Error('Falha na autenticação. Verifique suas credenciais.');
    }
  }

  async verificarSessao(): Promise<{ valida: boolean; usuario?: any }> {
    const token = await this.getToken();
    if (!token) {
      return { valida: false };
    }

    // Verificar se é um token mock válido
    if (token.startsWith('mock_token_')) {
      try {
        // Extrair ID do usuário do token
        const userId = token.split('_')[2];
        const usuarios = await this.request('/api/usuarios') as { data?: any[] };
        const usuario = usuarios.data?.find((u: any) => u.id.toString() === userId);

        if (usuario) {
          return {
            valida: true,
            usuario: {
              id: usuario.id,
              nome: usuario.nome,
              email: usuario.email,
              tipo: usuario.tipo,
              ativo: usuario.ativo
            }
          };
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      }
    }

    return { valida: false };
  }

  async logout(): Promise<void> {
    await this.removeToken();
  }

  // Método auxiliar para mapear status do estoque baseado na quantidade
  private mapearStatusEstoque(quantidadeAtual: number, quantidadeMinima: number = 0, quantidadeMaxima: number = 0): string {
    if (quantidadeAtual === 0) {
      return 'sem_estoque';
    } else if (quantidadeMinima > 0 && quantidadeAtual <= quantidadeMinima) {
      return 'baixo';
    } else if (quantidadeMaxima > 0 && quantidadeAtual >= quantidadeMaxima) {
      return 'alto';
    } else {
      return 'normal';
    }
  }

  // Método auxiliar para mapear status_estoque do backend para compatibilidade
  private mapearStatusParaCompatibilidade(statusEstoque: string): string {
    // Mapear os valores do backend para os valores esperados pelo app
    switch (statusEstoque) {
      case 'sem_estoque':
        return 'sem_estoque';
      case 'baixo':
        return 'baixo';
      case 'normal':
        return 'normal';
      case 'alto':
        return 'excesso';
      default:
        return 'normal';
    }
  }



}

export const apiService = new ApiService();
export default apiService;