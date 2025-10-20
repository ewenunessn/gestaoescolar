import { entregaService, ItemEntrega, EscolaEntrega, RotaEntrega, ConfirmarEntregaData } from './entregaService';
import { offlineService } from './offlineService';

class EntregaServiceHybrid {
  
  // ========== ROTAS ==========
  
  async listarTodasRotas(): Promise<RotaEntrega[]> {
    // Verificar se está offline primeiro
    const isOffline = await offlineService.isOffline();
    
    if (isOffline) {
      console.log('📱 Modo offline detectado, usando cache local para rotas');
      
      const rotasCache = await offlineService.obterRotasCache();
      
      if (rotasCache.length === 0) {
        throw new Error('Nenhuma rota disponível offline. Conecte-se à internet para sincronizar.');
      }
      
      return rotasCache;
    }
    
    try {
      // Usar listarRotas que já tem suporte a filtros da configuração
      const rotas = await entregaService.listarRotas();
      
      // Salvar no cache para uso offline
      await offlineService.salvarRotasCache(rotas);
      
      return rotas;
    } catch (error) {
      console.log('📱 Falha na conexão, usando cache local para rotas');
      
      // Se falhar, usar cache local
      const rotasCache = await offlineService.obterRotasCache();
      
      if (rotasCache.length === 0) {
        throw new Error('Nenhuma rota disponível offline. Conecte-se à internet para sincronizar.');
      }
      
      return rotasCache;
    }
  }

  async listarRotas(guiaId?: number): Promise<RotaEntrega[]> {
    // Verificar se está offline primeiro
    const isOffline = await offlineService.isOffline();
    
    if (isOffline) {
      console.log('📱 Modo offline detectado, usando cache local para rotas com entregas');
      
      const rotasCache = await offlineService.obterRotasCache();
      
      if (rotasCache.length === 0) {
        throw new Error('Nenhuma rota disponível offline. Conecte-se à internet para sincronizar.');
      }
      
      return rotasCache;
    }
    
    try {
      // Tentar buscar online
      const rotas = await entregaService.listarRotas(guiaId);
      
      // Salvar no cache para uso offline
      await offlineService.salvarRotasCache(rotas);
      
      return rotas;
    } catch (error) {
      console.log('📱 Falha na conexão, usando cache local para rotas com entregas');
      
      // Se falhar, usar cache local
      const rotasCache = await offlineService.obterRotasCache();
      
      if (rotasCache.length === 0) {
        throw new Error('Nenhuma rota disponível offline. Conecte-se à internet para sincronizar.');
      }
      
      return rotasCache;
    }
  }

  // ========== ESCOLAS ==========
  
  async listarEscolasRota(rotaId?: number, guiaId?: number): Promise<EscolaEntrega[]> {
    // Verificar se está offline primeiro
    const isOffline = await offlineService.isOffline();
    
    if (isOffline) {
      console.log(`📱 Modo offline detectado, usando cache local para escolas (rota: ${rotaId})`);
      
      const cacheDisponivel = await this.verificarCacheDisponivel();
      if (!cacheDisponivel) {
        throw new Error('Dados não disponíveis offline. Conecte-se à internet primeiro para baixar os dados.');
      }
      
      const escolasCache = await offlineService.obterEscolasCache(rotaId);
      
      if (escolasCache.length === 0) {
        throw new Error('Nenhuma escola desta rota disponível offline. Conecte-se à internet para sincronizar.');
      }
      
      return escolasCache;
    }
    
    try {
      // Tentar buscar online
      const escolas = await entregaService.listarEscolasRota(rotaId, guiaId);
      
      // Salvar no cache para uso offline
      await offlineService.salvarEscolasCache(escolas, rotaId);
      
      return escolas;
    } catch (error) {
      console.log(`📱 Falha na conexão, usando cache local para escolas (rota: ${rotaId})`);
      
      // Se falhar, usar cache local
      const escolasCache = await offlineService.obterEscolasCache(rotaId);
      
      if (escolasCache.length === 0) {
        throw new Error('Nenhuma escola disponível offline. Conecte-se à internet para sincronizar.');
      }
      
      return escolasCache;
    }
  }

  // ========== ITENS ==========
  
  async listarItensEscola(escolaId: number, guiaId?: number): Promise<ItemEntrega[]> {
    // Verificar se está offline primeiro
    const isOffline = await offlineService.isOffline();
    
    if (isOffline) {
      console.log(`📱 Modo offline detectado, usando cache local para itens da escola ${escolaId}`);
      
      const cacheDisponivel = await this.verificarCacheDisponivel();
      if (!cacheDisponivel) {
        throw new Error('Dados não disponíveis offline. Conecte-se à internet primeiro para baixar os dados.');
      }
      
      const itensCache = await offlineService.obterItensEscolaCache(escolaId);
      
      if (itensCache.length === 0) {
        throw new Error('Nenhum item desta escola disponível offline. Conecte-se à internet para sincronizar.');
      }
      
      return itensCache;
    }
    
    try {
      // Tentar buscar online
      const itens = await entregaService.listarItensEscola(escolaId, guiaId);
      
      // Salvar no cache para uso offline
      await offlineService.salvarItensEscolaCache(escolaId, itens);
      
      return itens;
    } catch (error) {
      console.log(`📱 Falha na conexão, usando cache local para itens da escola ${escolaId}`);
      
      // Se falhar, usar cache local
      const itensCache = await offlineService.obterItensEscolaCache(escolaId);
      
      if (itensCache.length === 0) {
        throw new Error('Nenhum item disponível offline. Conecte-se à internet para sincronizar.');
      }
      
      return itensCache;
    }
  }

  async buscarItem(itemId: number): Promise<ItemEntrega> {
    try {
      // Tentar buscar online primeiro
      return await entregaService.buscarItem(itemId);
    } catch (error) {
      console.log(`📱 Sem conexão, buscando item ${itemId} no cache local`);
      
      // Buscar em todos os caches de escolas
      // (implementação simplificada - em produção seria mais eficiente)
      throw new Error('Item não disponível offline. Conecte-se à internet.');
    }
  }

  // ========== OPERAÇÕES DE ENTREGA (COM SUPORTE OFFLINE) ==========
  
  async confirmarEntrega(itemId: number, dados: ConfirmarEntregaData): Promise<{ message: string; item: ItemEntrega }> {
    console.log(`🔄 Iniciando confirmação de entrega - Item ID: ${itemId}`);
    
    try {
      // Verificar se está offline
      const isOffline = await offlineService.isOffline();
      console.log(`📶 Status offline: ${isOffline}`);
      
      if (isOffline) {
        console.log('📱 Modo offline detectado, usando confirmação offline');
        return await this.confirmarEntregaOffline(itemId, dados);
      }
      
      console.log('🌐 Tentando confirmar entrega online');
      // Tentar confirmar online
      const resultado = await entregaService.confirmarEntrega(itemId, dados);
      
      // Atualizar cache local com o resultado
      await this.atualizarItemNoCache(resultado.item);
      
      console.log('✅ Entrega confirmada online com sucesso');
      return resultado;
      
    } catch (error: any) {
      console.log('❌ Erro ao confirmar entrega, tentando modo offline');
      console.error('Tipo de erro:', error?.constructor?.name);
      console.error('Mensagem:', error?.message);
      console.error('Código:', error?.code);
      
      // SEMPRE tentar offline em caso de erro
      console.log('🔴 Forçando modo offline devido ao erro');
      return await this.confirmarEntregaOffline(itemId, dados);
    }
  }

  private async confirmarEntregaOffline(itemId: number, dados: ConfirmarEntregaData): Promise<{ message: string; item: ItemEntrega }> {
    console.log(`📱 Confirmando entrega offline - Item ID: ${itemId}`);
    
    // Verificar se há cache disponível
    const cacheDisponivel = await this.verificarCacheDisponivel();
    if (!cacheDisponivel) {
      console.error(`❌ Nenhum dado em cache disponível`);
      throw new Error('⚠️ DADOS NÃO DISPONÍVEIS OFFLINE\n\nPara usar o app offline, você precisa:\n1. Conectar à internet\n2. Abrir o app e navegar pelas rotas/escolas\n3. Os dados serão baixados automaticamente\n\nDepois disso, você poderá trabalhar offline.');
    }
    
    // Buscar item no cache para atualizar
    console.log(`🔍 Buscando item ${itemId} no cache...`);
    const item = await this.buscarItemNoCache(itemId);
    
    if (!item) {
      console.error(`❌ Item ${itemId} não encontrado no cache local`);
      await offlineService.debugCache(); // Debug para ver o que tem no cache
      throw new Error(`Item ${itemId} não encontrado no cache local.\n\nConecte-se à internet e navegue até esta escola para baixar os dados.`);
    }
    
    console.log(`✅ Item ${itemId} encontrado no cache:`, item.produto_nome);
    console.log(`📋 Escola ID do item: ${item.escola_id}`);

    if (!item.escola_id || item.escola_id === 0) {
      console.error(`❌ Item ${itemId} tem escola_id inválido no cache:`, item.escola_id);
      throw new Error('Erro: Item com dados incompletos no cache. Reconecte à internet e sincronize novamente.');
    }

    if (item.entrega_confirmada) {
      console.error(`❌ Item ${itemId} já foi entregue`);
      throw new Error('Este item já foi entregue');
    }

    console.log(`📝 Atualizando item ${itemId} no cache local`);

    // Atualizar item localmente
    const itemAtualizado: ItemEntrega = {
      ...item,
      entrega_confirmada: true,
      quantidade_entregue: dados.quantidade_entregue,
      data_entrega: new Date().toISOString(),
      nome_quem_entregou: dados.nome_quem_entregou,
      nome_quem_recebeu: dados.nome_quem_recebeu,
    };

    // Salvar no cache local
    await offlineService.atualizarItemCache(item.escola_id, itemAtualizado);
    console.log(`💾 Item ${itemId} atualizado no cache da escola ${item.escola_id}`);

    // Adicionar à fila de sincronização
    const operacaoId = await offlineService.adicionarOperacaoFila({
      tipo: 'confirmar_entrega',
      itemId,
      dados,
    });

    console.log(`📤 Operação ${operacaoId} adicionada à fila de sincronização`);

    return {
      message: 'Entrega confirmada offline - será sincronizada automaticamente quando conectar',
      item: itemAtualizado,
    };
  }

  async cancelarEntrega(itemId: number): Promise<{ message: string; item: ItemEntrega }> {
    console.log(`🔄 Iniciando cancelamento de entrega - Item ID: ${itemId}`);
    
    try {
      // Verificar se está offline
      const isOffline = await offlineService.isOffline();
      console.log(`📶 Status offline: ${isOffline}`);
      
      if (isOffline) {
        console.log('📱 Modo offline detectado, usando cancelamento offline');
        return await this.cancelarEntregaOffline(itemId);
      }
      
      console.log('🌐 Tentando cancelar entrega online');
      // Tentar cancelar online
      const resultado = await entregaService.cancelarEntrega(itemId);
      
      // Atualizar cache local com o resultado
      await this.atualizarItemNoCache(resultado.item);
      
      console.log('✅ Entrega cancelada online com sucesso');
      return resultado;
      
    } catch (error: any) {
      console.log('❌ Erro ao cancelar entrega, tentando modo offline');
      console.error('Tipo de erro:', error?.constructor?.name);
      console.error('Mensagem:', error?.message);
      
      // SEMPRE tentar offline em caso de erro
      console.log('🔴 Forçando modo offline devido ao erro');
      return await this.cancelarEntregaOffline(itemId);
    }
  }

  private async cancelarEntregaOffline(itemId: number): Promise<{ message: string; item: ItemEntrega }> {
    console.log(`📱 Cancelando entrega offline - Item ID: ${itemId}`);
    
    // Buscar item no cache para atualizar
    const item = await this.buscarItemNoCache(itemId);
    
    if (!item) {
      console.error(`❌ Item ${itemId} não encontrado no cache local`);
      throw new Error('Item não encontrado no cache local. Conecte-se à internet para sincronizar.');
    }

    console.log(`✅ Item ${itemId} encontrado no cache:`, item.produto_nome);
    console.log(`📋 Escola ID do item: ${item.escola_id}`);

    if (!item.escola_id || item.escola_id === 0) {
      console.error(`❌ Item ${itemId} tem escola_id inválido no cache:`, item.escola_id);
      throw new Error('Erro: Item com dados incompletos no cache. Reconecte à internet e sincronize novamente.');
    }

    if (!item.entrega_confirmada) {
      console.error(`❌ Item ${itemId} não foi entregue ainda`);
      throw new Error('Este item não foi entregue ainda');
    }

    console.log(`📝 Cancelando entrega do item ${itemId} no cache local`);

    // Atualizar item localmente
    const itemAtualizado: ItemEntrega = {
      ...item,
      entrega_confirmada: false,
      quantidade_entregue: undefined,
      data_entrega: undefined,
      nome_quem_entregou: undefined,
      nome_quem_recebeu: undefined,
    };

    // Salvar no cache local
    await offlineService.atualizarItemCache(item.escola_id, itemAtualizado);
    console.log(`💾 Item ${itemId} atualizado no cache da escola ${item.escola_id}`);

    // Adicionar à fila de sincronização
    const operacaoId = await offlineService.adicionarOperacaoFila({
      tipo: 'cancelar_entrega',
      itemId,
    });

    console.log(`📤 Operação ${operacaoId} adicionada à fila de sincronização`);

    return {
      message: 'Entrega cancelada offline - será sincronizada automaticamente quando conectar',
      item: itemAtualizado,
    };
  }

  // ========== MÉTODOS AUXILIARES ==========
  
  async verificarCacheDisponivel(): Promise<boolean> {
    try {
      const rotas = await offlineService.obterRotasCache();
      return rotas.length > 0;
    } catch (error) {
      return false;
    }
  }
  
  private async buscarItemNoCache(itemId: number): Promise<ItemEntrega | null> {
    try {
      // Buscar em todos os caches de escolas
      const rotas = await offlineService.obterRotasCache();
      
      for (const rota of rotas) {
        const escolas = await offlineService.obterEscolasCache(rota.id);
        
        for (const escola of escolas) {
          const itens = await offlineService.obterItensEscolaCache(escola.id);
          const item = itens.find(i => i.id === itemId);
          
          if (item) {
            return item;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar item no cache:', error);
      return null;
    }
  }

  private async atualizarItemNoCache(item: ItemEntrega): Promise<void> {
    if (!item.escola_id || item.escola_id === 0) {
      console.error(`❌ Item ${item.id} tem escola_id inválido:`, item.escola_id);
      console.log(`⚠️ Pulando atualização do cache para este item`);
      return;
    }
    await offlineService.atualizarItemCache(item.escola_id, item);
  }

  // ========== MÉTODOS DE SINCRONIZAÇÃO ==========

  // Pré-carregar todos os dados necessários para uso offline
  async preCarregarDados(): Promise<void> {
    console.log('📥 Pré-carregando dados do servidor...');
    
    try {
      // 1. Carregar todas as rotas
      console.log('📥 Carregando rotas...');
      const rotas = await entregaService.listarTodasRotas();
      await offlineService.salvarRotasCache(rotas);
      console.log(`✅ ${rotas.length} rotas salvas no cache`);
      
      // 2. Para cada rota, carregar escolas
      for (const rota of rotas) {
        try {
          console.log(`📥 Carregando escolas da rota: ${rota.nome}`);
          const escolas = await entregaService.listarEscolasRota(rota.id);
          await offlineService.salvarEscolasCache(escolas, rota.id);
          console.log(`✅ ${escolas.length} escolas da rota ${rota.nome} salvas no cache`);
          
          // 3. Para cada escola, carregar itens
          for (const escola of escolas) {
            try {
              console.log(`📥 Carregando itens da escola: ${escola.nome}`);
              const itens = await entregaService.listarItensEscola(escola.id);
              await offlineService.salvarItensEscolaCache(escola.id, itens);
              console.log(`✅ ${itens.length} itens da escola ${escola.nome} salvos no cache`);
            } catch (error) {
              console.error(`❌ Erro ao carregar itens da escola ${escola.nome}:`, error);
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao carregar escolas da rota ${rota.nome}:`, error);
        }
      }
      
      console.log('🎉 Pré-carregamento completo! App pronto para uso offline.');
    } catch (error) {
      console.error('❌ Erro durante pré-carregamento:', error);
      throw error;
    }
  }





  // ========== MÉTODOS DELEGADOS (SEM CACHE) ==========
  
  async obterEstatisticas(guiaId?: number, rotaId?: number) {
    try {
      // Tentar buscar online
      return await entregaService.obterEstatisticas(guiaId, rotaId);
    } catch (error) {
      // Se falhar (offline ou erro de rede), retornar null
      // A tela vai calcular as estatísticas localmente
      console.log('Estatísticas não disponíveis online, usando dados locais');
      return null;
    }
  }

  async listarPlanejamentos(guiaId?: number, rotaId?: number) {
    return entregaService.listarPlanejamentos(guiaId, rotaId);
  }

  async salvarFotoLocal(itemId: number, fotoUri: string) {
    try {
      console.log(`📸 Salvando foto local para item ${itemId}`);
      return entregaService.salvarFotoLocal(itemId, fotoUri);
    } catch (error) {
      console.error(`❌ Erro ao salvar foto local:`, error);
      // Não bloquear a confirmação se a foto falhar
      return fotoUri;
    }
  }
}

export const entregaServiceHybrid = new EntregaServiceHybrid();