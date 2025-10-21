import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { ItemEntrega, EscolaEntrega, RotaEntrega, ConfirmarEntregaData } from './entregaService';

// Chaves para armazenamento local
const STORAGE_KEYS = {
  ROTAS: '@entregas:cache_rotas',
  ESCOLAS: '@entregas:cache_escolas',
  ITENS_ESCOLA: '@entregas:cache_itens_escola',
  FILA_SYNC: '@entregas:fila_sincronizacao',
  LAST_SYNC: '@entregas:last_sync',
  IS_OFFLINE: '@entregas:is_offline',
};

// Interface para operações na fila de sincronização
export interface OperacaoSync {
  id: string;
  tipo: 'confirmar_entrega' | 'cancelar_entrega';
  itemId: number;
  dados?: ConfirmarEntregaData;
  timestamp: number;
  tentativas: number;
}

class OfflineService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;

  constructor() {
    this.initNetworkListener();
  }

  // Inicializar listener de conectividade
  private initNetworkListener() {
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      console.log(`📶 Status de rede: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
      
      // Se voltou online, tentar sincronizar
      if (wasOffline && this.isOnline) {
        console.log('🔄 Voltou online! Iniciando sincronização...');
        this.sincronizarFilaPendente();
      }
      
      this.salvarStatusOffline(!this.isOnline);
    });
  }

  // Verificar se está offline
  async isOffline(): Promise<boolean> {
    try {
      // Verificar status atual da rede
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected ?? false;
      const isInternetReachable = netInfo.isInternetReachable ?? false;
      
      // Considerar offline se não há conexão OU se não consegue acessar a internet
      const offline = !isConnected || !isInternetReachable;
      
      console.log(`📶 Status de rede: conectado=${isConnected}, internet=${isInternetReachable}, offline=${offline}`);
      
      return offline;
    } catch (error) {
      console.error('❌ Erro ao verificar status da rede:', error);
      // Se não conseguir verificar, assumir que está offline
      return true;
    }
  }

  // Salvar status offline
  private async salvarStatusOffline(offline: boolean) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.IS_OFFLINE, offline.toString());
    } catch (error) {
      console.error('Erro ao salvar status offline:', error);
    }
  }

  // ========== CACHE DE DADOS ==========

  // Salvar rotas no cache
  async salvarRotasCache(rotas: RotaEntrega[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ROTAS, JSON.stringify(rotas));
      console.log(`💾 ${rotas.length} rotas salvas no cache`);
    } catch (error) {
      console.error('Erro ao salvar rotas no cache:', error);
    }
  }

  // Obter rotas do cache
  async obterRotasCache(): Promise<RotaEntrega[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ROTAS);
      if (data) {
        const rotas = JSON.parse(data);
        console.log(`📱 ${rotas.length} rotas carregadas do cache`);
        return rotas;
      }
    } catch (error) {
      console.error('Erro ao obter rotas do cache:', error);
    }
    return [];
  }

  // Salvar escolas no cache
  async salvarEscolasCache(escolas: EscolaEntrega[], rotaId?: number): Promise<void> {
    try {
      const key = rotaId ? `${STORAGE_KEYS.ESCOLAS}_${rotaId}` : STORAGE_KEYS.ESCOLAS;
      await AsyncStorage.setItem(key, JSON.stringify(escolas));
      console.log(`💾 ${escolas.length} escolas salvas no cache (rota: ${rotaId || 'todas'})`);
    } catch (error) {
      console.error('Erro ao salvar escolas no cache:', error);
    }
  }

  // Obter escolas do cache
  async obterEscolasCache(rotaId?: number): Promise<EscolaEntrega[]> {
    try {
      const key = rotaId ? `${STORAGE_KEYS.ESCOLAS}_${rotaId}` : STORAGE_KEYS.ESCOLAS;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const escolas = JSON.parse(data);
        console.log(`📱 ${escolas.length} escolas carregadas do cache (rota: ${rotaId || 'todas'})`);
        return escolas;
      }
    } catch (error) {
      console.error('Erro ao obter escolas do cache:', error);
    }
    return [];
  }

  // Salvar itens de escola no cache
  async salvarItensEscolaCache(escolaId: number, itens: ItemEntrega[]): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.ITENS_ESCOLA}_${escolaId}`;
      await AsyncStorage.setItem(key, JSON.stringify(itens));
      console.log(`💾 ${itens.length} itens da escola ${escolaId} salvos no cache`);
    } catch (error) {
      console.error('Erro ao salvar itens da escola no cache:', error);
    }
  }

  // Obter itens de escola do cache
  async obterItensEscolaCache(escolaId: number): Promise<ItemEntrega[]> {
    try {
      const key = `${STORAGE_KEYS.ITENS_ESCOLA}_${escolaId}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const itens = JSON.parse(data);
        console.log(`📱 ${itens.length} itens da escola ${escolaId} carregados do cache`);
        return itens;
      }
    } catch (error) {
      console.error('Erro ao obter itens da escola do cache:', error);
    }
    return [];
  }

  // Atualizar item no cache (para refletir mudanças offline)
  async atualizarItemCache(escolaId: number, itemAtualizado: ItemEntrega): Promise<void> {
    try {
      const itens = await this.obterItensEscolaCache(escolaId);
      const index = itens.findIndex(item => item.id === itemAtualizado.id);
      
      if (index !== -1) {
        itens[index] = itemAtualizado;
        await this.salvarItensEscolaCache(escolaId, itens);
        console.log(`📝 Item ${itemAtualizado.id} atualizado no cache`);
        
        // Recalcular e atualizar percentuais da escola
        await this.recalcularPercentuaisEscola(escolaId, itens);
      }
    } catch (error) {
      console.error('Erro ao atualizar item no cache:', error);
    }
  }

  // Recalcular percentuais da escola após mudanças nos itens
  private async recalcularPercentuaisEscola(escolaId: number, itens: ItemEntrega[]): Promise<void> {
    try {
      // Calcular estatísticas dos itens
      const itensParaEntrega = itens.filter(item => item.para_entrega);
      const totalItens = itensParaEntrega.length;
      const itensEntregues = itensParaEntrega.filter(item => item.entrega_confirmada).length;
      const percentualEntregue = totalItens > 0 ? (itensEntregues / totalItens) * 100 : 0;

      console.log(`📊 Escola ${escolaId}: ${itensEntregues}/${totalItens} itens entregues (${percentualEntregue.toFixed(1)}%)`);

      // Atualizar todas as listas de escolas em cache que contenham esta escola
      const keys = await AsyncStorage.getAllKeys();
      const escolasKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.ESCOLAS));

      for (const key of escolasKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const escolas: EscolaEntrega[] = JSON.parse(data);
          const escolaIndex = escolas.findIndex(e => e.id === escolaId);
          
          if (escolaIndex !== -1) {
            // Atualizar os dados da escola
            escolas[escolaIndex] = {
              ...escolas[escolaIndex],
              total_itens: totalItens,
              itens_entregues: itensEntregues,
              percentual_entregue: percentualEntregue,
            };
            
            await AsyncStorage.setItem(key, JSON.stringify(escolas));
            console.log(`✅ Percentuais da escola ${escolaId} atualizados no cache ${key}`);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao recalcular percentuais da escola:', error);
    }
  }

  // ========== FILA DE SINCRONIZAÇÃO ==========

  // Adicionar operação à fila de sincronização
  async adicionarOperacaoFila(operacao: Omit<OperacaoSync, 'id' | 'timestamp' | 'tentativas'>): Promise<string> {
    try {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const novaOperacao: OperacaoSync = {
        ...operacao,
        id,
        timestamp: Date.now(),
        tentativas: 0,
      };

      const fila = await this.obterFilaSincronizacao();
      fila.push(novaOperacao);
      
      await AsyncStorage.setItem(STORAGE_KEYS.FILA_SYNC, JSON.stringify(fila));
      console.log(`📤 Operação ${operacao.tipo} adicionada à fila (ID: ${id})`);
      
      return id;
    } catch (error) {
      console.error('Erro ao adicionar operação à fila:', error);
      throw error;
    }
  }

  // Obter fila de sincronização
  async obterFilaSincronizacao(): Promise<OperacaoSync[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FILA_SYNC);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao obter fila de sincronização:', error);
      return [];
    }
  }

  // Remover operação da fila
  async removerOperacaoFila(operacaoId: string): Promise<void> {
    try {
      const fila = await this.obterFilaSincronizacao();
      const novaFila = fila.filter(op => op.id !== operacaoId);
      
      await AsyncStorage.setItem(STORAGE_KEYS.FILA_SYNC, JSON.stringify(novaFila));
      console.log(`✅ Operação ${operacaoId} removida da fila`);
    } catch (error) {
      console.error('Erro ao remover operação da fila:', error);
    }
  }

  // Sincronizar fila pendente
  async sincronizarFilaPendente(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    console.log('🔄 Iniciando sincronização da fila pendente...');

    try {
      const fila = await this.obterFilaSincronizacao();
      
      if (fila.length === 0) {
        console.log('✅ Nenhuma operação pendente para sincronizar');
        return;
      }

      console.log(`📤 ${fila.length} operações pendentes para sincronizar`);

      for (const operacao of fila) {
        try {
          await this.executarOperacao(operacao);
          await this.removerOperacaoFila(operacao.id);
          console.log(`✅ Operação ${operacao.id} sincronizada com sucesso`);
        } catch (error) {
          console.error(`❌ Erro ao sincronizar operação ${operacao.id}:`, error);
          
          // Incrementar tentativas
          operacao.tentativas++;
          
          // Se passou de 3 tentativas, remover da fila
          if (operacao.tentativas >= 3) {
            console.log(`🗑️ Operação ${operacao.id} removida após 3 tentativas`);
            await this.removerOperacaoFila(operacao.id);
          }
        }
      }

      await this.salvarUltimaSync();
      console.log('🎉 Sincronização concluída!');
      
    } catch (error) {
      console.error('❌ Erro durante sincronização:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Executar uma operação específica
  private async executarOperacao(operacao: OperacaoSync): Promise<void> {
    console.log(`🔄 Executando operação ${operacao.tipo} para item ${operacao.itemId}`);
    
    try {
      // Importar o serviço de entrega
      const entregaServiceModule = require('./entregaService');
      const entregaService = entregaServiceModule.entregaService;
      
      if (operacao.tipo === 'confirmar_entrega' && operacao.dados) {
        await entregaService.confirmarEntrega(operacao.itemId, operacao.dados);
        console.log(`✅ Entrega ${operacao.itemId} confirmada no servidor`);
      } else if (operacao.tipo === 'cancelar_entrega') {
        await entregaService.cancelarEntrega(operacao.itemId);
        console.log(`✅ Entrega ${operacao.itemId} cancelada no servidor`);
      }
    } catch (error) {
      console.error(`❌ Erro ao executar operação ${operacao.tipo}:`, error);
      throw error;
    }
  }

  // Salvar timestamp da última sincronização
  private async salvarUltimaSync(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error('Erro ao salvar última sincronização:', error);
    }
  }

  // Obter timestamp da última sincronização
  async obterUltimaSync(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return timestamp ? new Date(parseInt(timestamp)) : null;
    } catch (error) {
      console.error('Erro ao obter última sincronização:', error);
      return null;
    }
  }

  // Limpar todo o cache
  async limparCache(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      console.log('🗑️ Cache limpo com sucesso');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  // Obter tamanho do cache
  async obterTamanhoCache(): Promise<{ itens: number; tamanho: string }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('@entregas:cache_'));
      
      let tamanhoTotal = 0;
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          tamanhoTotal += new Blob([data]).size;
        }
      }

      return {
        itens: cacheKeys.length,
        tamanho: this.formatarTamanho(tamanhoTotal),
      };
    } catch (error) {
      console.error('Erro ao calcular tamanho do cache:', error);
      return { itens: 0, tamanho: '0 B' };
    }
  }

  private formatarTamanho(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Método de debug para verificar status do cache
  async debugCache(): Promise<void> {
    console.log('🔍 === DEBUG CACHE OFFLINE ===');
    
    try {
      const rotas = await this.obterRotasCache();
      console.log(`📊 Rotas no cache: ${rotas.length}`);
      
      for (const rota of rotas) {
        const escolas = await this.obterEscolasCache(rota.id);
        console.log(`📊 Rota ${rota.nome}: ${escolas.length} escolas`);
        
        for (const escola of escolas) {
          const itens = await this.obterItensEscolaCache(escola.id);
          console.log(`📊 Escola ${escola.nome}: ${itens.length} itens`);
        }
      }
      
      const fila = await this.obterFilaSincronizacao();
      console.log(`📊 Operações na fila: ${fila.length}`);
      
      const tamanho = await this.obterTamanhoCache();
      console.log(`📊 Tamanho do cache: ${tamanho.tamanho} (${tamanho.itens} arquivos)`);
      
    } catch (error) {
      console.error('❌ Erro no debug do cache:', error);
    }
    
    console.log('🔍 === FIM DEBUG CACHE ===');
  }
}

export const offlineService = new OfflineService();