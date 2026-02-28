import { api } from './client'
import { enqueue, readQueue, clearQueue } from '../offline/queue'

export interface Rota {
  id: number
  nome: string
  descricao?: string
  cor: string
  ativo: boolean
  total_escolas?: number
}

export interface EscolaRota {
  id: number
  rota_id: number
  escola_id: number
  ordem: number
  escola_nome?: string
  escola_endereco?: string
}

export async function listarRotas(): Promise<Rota[]> {
  const { data } = await api.get('/api/entregas/rotas')
  return data
}

export async function listarEscolasDaRota(rotaId: number): Promise<EscolaRota[]> {
  const { data } = await api.get(`/api/entregas/rotas/${rotaId}/escolas`)
  return data
}

export type PlanejamentoStatus = 'planejado' | 'em_andamento' | 'concluido' | 'cancelado'

export interface Planejamento {
  id: number
  guia_id: number
  rota_id: number
  data_planejada?: string | null
  status: PlanejamentoStatus
  responsavel?: string | null
  observacao?: string | null
  rota_nome?: string
  guia_mes?: number
  guia_ano?: number
}

export async function listarPlanejamentos(params?: { guiaId?: number; rotaId?: number }): Promise<Planejamento[]> {
  const query = new URLSearchParams()
  if (params?.guiaId) query.set('guiaId', String(params.guiaId))
  if (params?.rotaId) query.set('rotaId', String(params.rotaId))
  const { data } = await api.get(`/api/entregas/planejamentos?${query.toString()}`)
  return data
}

export async function atualizarPlanejamento(id: number, patch: Partial<Pick<Planejamento, 'status' | 'data_planejada' | 'responsavel' | 'observacao'>>) {
  const { data } = await api.put(`/api/entregas/planejamentos/${id}`, patch)
  return data as Planejamento
}

export type EscolaStatus = EscolaRota & { 
  status: 'pendente'|'entregue'|'nao_entregue',
  foto_url?: string | null,
  assinado_por?: string | null,
  assinado_em?: string | null
}

export interface ItemEntrega {
  id: number
  produto_id: number
  produto_nome: string
  quantidade: number
  unidade: string
  lote?: string
  observacao?: string
  quantidade_ja_entregue?: number
  saldo_pendente?: number
  entrega_confirmada?: boolean
  nome_quem_recebeu?: string
  data_entrega?: string
}

export async function listarItensEscola(escolaId: number, guiaId?: number): Promise<ItemEntrega[]> {
  try {
    const query = guiaId ? `?guiaId=${guiaId}` : ''
    const { data } = await api.get(`/api/entregas/escolas/${escolaId}/itens${query}`)
    return data
  } catch (e) {
    // Se estiver offline, tentar buscar do cache
    if (!navigator.onLine || (e as any)?.code === 'ERR_NETWORK') {
      const cached = localStorage.getItem(`itens_escola_${escolaId}`)
      if (cached) {
        console.log('📦 Usando dados em cache para escola', escolaId)
        return JSON.parse(cached)
      }
    }
    throw e
  }
}

// Função para sincronizar fila offline
export async function syncOfflineQueue() {
  const { readQueue, removeFromQueue, clearQueue, setSyncStatus, isSyncing } = await import('../offline/queue')
  
  if (isSyncing()) {
    console.log('⏳ Sincronização já em andamento')
    return { success: false, message: 'Sincronização já em andamento' }
  }
  
  const queue = readQueue()
  if (queue.length === 0) {
    console.log('✅ Nenhuma entrega pendente para sincronizar')
    return { success: true, synced: 0 }
  }
  
  setSyncStatus(true)
  let synced = 0
  let failed = 0
  
  console.log(`🔄 Sincronizando ${queue.length} entrega(s) pendente(s)...`)
  
  for (const item of queue) {
    try {
      await confirmarEntregaItem(item.itemId, {
        quantidade_entregue: item.quantidade_entregue,
        nome_quem_entregou: item.nome_quem_entregou,
        nome_quem_recebeu: item.nome_quem_recebeu,
        observacao: item.observacao
      })
      removeFromQueue(item.itemId)
      synced++
      console.log(`✅ Item ${item.itemId} sincronizado`)
    } catch (error) {
      failed++
      console.error(`❌ Erro ao sincronizar item ${item.itemId}:`, error)
    }
  }
  
  setSyncStatus(false)
  
  if (failed === 0) {
    clearQueue()
  }
  
  console.log(`🎉 Sincronização concluída: ${synced} sucesso, ${failed} falhas`)
  
  return { 
    success: true, 
    synced, 
    failed,
    message: `${synced} entrega(s) sincronizada(s)${failed > 0 ? `, ${failed} falha(s)` : ''}`
  }
}

export interface ConfirmarEntregaItemData {
  quantidade_entregue: number
  nome_quem_entregou: string
  nome_quem_recebeu: string
  observacao?: string
  assinatura_base64?: string
  latitude?: number
  longitude?: number
  precisao_gps?: number
}

export async function confirmarEntregaItem(itemId: number, dados: ConfirmarEntregaItemData) {
  try {
    const { data } = await api.post(`/api/entregas/itens/${itemId}/confirmar`, dados)
    return data
  } catch (e) {
    // Se estiver offline, adicionar à fila
    if (!navigator.onLine || (e as any)?.code === 'ERR_NETWORK') {
      const { enqueueEntrega } = await import('../offline/queue')
      const queued = enqueueEntrega({
        itemId,
        ...dados,
        timestamp: new Date().toISOString()
      })
      if (queued) {
        return { 
          success: true, 
          queued: true, 
          message: 'Entrega salva offline. Será sincronizada quando houver conexão.' 
        }
      }
    }
    throw e
  }
}

export async function listarStatusEscolasPlanejamento(planejamentoId: number): Promise<EscolaStatus[]> {
  const { data } = await api.get(`/api/entregas/planejamentos/${planejamentoId}/escolas-status`)
  return data
}

export async function atualizarStatusEscola(
  planejamentoId: number,
  escolaId: number,
  status: 'pendente'|'entregue'|'nao_entregue',
  observacao?: string,
  fotoBase64?: string,
  assinadoPor?: string
) {
  try {
    const { data } = await api.put(
      `/api/entregas/planejamentos/${planejamentoId}/escolas/${escolaId}/status`,
      { status, observacao, fotoBase64, assinadoPor }
    )
    return data
  } catch (e) {
    if (!navigator.onLine) {
      enqueue({ planejamentoId, escolaId, status, observacao, fotoBase64, assinadoPor })
      return { queued: true }
    }
    throw e
  }
}

export async function flushQueuedCheckins() {
  const items = readQueue()
  if (!items.length) return
  for (const it of items) {
    try {
      await atualizarStatusEscola(it.planejamentoId, it.escolaId, it.status, it.observacao, it.fotoBase64, it.assinadoPor)
    } catch (e) {
      // mantém na fila se falhar
      return
    }
  }
  clearQueue()
}
