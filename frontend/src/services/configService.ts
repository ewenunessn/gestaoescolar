import api from './api';

export interface ConfiguracaoSistema {
  id?: number;
  chave: string;
  valor: string;
  descricao?: string;
  tipo: 'string' | 'boolean' | 'number' | 'json';
  categoria: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConfiguracaoModuloSaldo {
  modulo_principal: 'geral' | 'modalidades';
  mostrar_ambos: boolean;
}

class ConfigService {
  // Buscar configuração específica
  async buscarConfiguracao(chave: string): Promise<ConfiguracaoSistema | null> {
    try {
      const response = await api.get(`/configuracoes/${chave}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // Salvar configuração
  async salvarConfiguracao(configuracao: Omit<ConfiguracaoSistema, 'id' | 'created_at' | 'updated_at'>): Promise<ConfiguracaoSistema> {
    try {
      const response = await api.post('/configuracoes', configuracao);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Atualizar configuração
  async atualizarConfiguracao(chave: string, valor: string): Promise<ConfiguracaoSistema> {
    try {
      const response = await api.put(`/configuracoes/${chave}`, { valor });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Listar configurações por categoria
  async listarConfiguracoesPorCategoria(categoria: string): Promise<ConfiguracaoSistema[]> {
    try {
      const response = await api.get(`/configuracoes/categoria/${categoria}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Configurações específicas para módulo de saldo
  async buscarConfiguracaoModuloSaldo(): Promise<ConfiguracaoModuloSaldo> {
    try {
      const config = await this.buscarConfiguracao('modulo_saldo_contratos');
      if (config) {
        return JSON.parse(config.valor);
      }
      
      // Configuração padrão
      return {
        modulo_principal: 'modalidades',
        mostrar_ambos: true
      };
    } catch (error) {
      console.error('Erro ao buscar configuração do módulo de saldo:', error);
      return {
        modulo_principal: 'modalidades',
        mostrar_ambos: true
      };
    }
  }

  async salvarConfiguracaoModuloSaldo(config: ConfiguracaoModuloSaldo): Promise<void> {
    try {
      const configuracao = {
        chave: 'modulo_saldo_contratos',
        valor: JSON.stringify(config),
        descricao: 'Configuração do módulo principal de saldo de contratos',
        tipo: 'json' as const,
        categoria: 'sistema'
      };

      const existente = await this.buscarConfiguracao('modulo_saldo_contratos');
      
      if (existente) {
        await this.atualizarConfiguracao('modulo_saldo_contratos', configuracao.valor);
      } else {
        await this.salvarConfiguracao(configuracao);
      }
    } catch (error) {
      throw error;
    }
  }

  // Cache local para configurações frequentemente acessadas
  private configCache = new Map<string, { valor: any; timestamp: number }>();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  async buscarConfiguracaoComCache(chave: string): Promise<any> {
    const cached = this.configCache.get(chave);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.valor;
    }

    try {
      const config = await this.buscarConfiguracao(chave);
      const valor = config ? JSON.parse(config.valor) : null;
      
      this.configCache.set(chave, { valor, timestamp: now });
      return valor;
    } catch (error) {
      console.error(`Erro ao buscar configuração ${chave}:`, error);
      return null;
    }
  }

  limparCache(): void {
    this.configCache.clear();
  }
}

export default new ConfigService();