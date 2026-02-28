type EntregaItem = {
  itemId: number
  quantidade_entregue: number
  nome_quem_entregou: string
  nome_quem_recebeu: string
  observacao?: string
  assinatura_base64?: string
  timestamp: string
  escolaNome?: string
  produtoNome?: string
}

const QUEUE_KEY = 'entregas_queue_v2'
const SYNC_STATUS_KEY = 'sync_status'

export function enqueueEntrega(item: EntregaItem) {
  try {
    const s = localStorage.getItem(QUEUE_KEY)
    const arr: EntregaItem[] = s ? JSON.parse(s) : []
    arr.push(item)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(arr))
    console.log('📦 Entrega adicionada à fila offline:', item)
    return true
  } catch (e) {
    console.error('Erro ao adicionar à fila:', e)
    return false
  }
}

export function readQueue(): EntregaItem[] {
  try {
    const s = localStorage.getItem(QUEUE_KEY)
    return s ? JSON.parse(s) : []
  } catch { 
    return [] 
  }
}

export function clearQueue() {
  try {
    localStorage.removeItem(QUEUE_KEY)
    console.log('✅ Fila offline limpa')
  } catch {}
}

export function removeFromQueue(itemId: number) {
  try {
    const queue = readQueue()
    const filtered = queue.filter(item => item.itemId !== itemId)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered))
    console.log('🗑️ Item removido da fila:', itemId)
  } catch {}
}

export function getQueueCount(): number {
  return readQueue().length
}

export function setSyncStatus(syncing: boolean) {
  try {
    localStorage.setItem(SYNC_STATUS_KEY, syncing ? 'true' : 'false')
  } catch {}
}

export function isSyncing(): boolean {
  try {
    return localStorage.getItem(SYNC_STATUS_KEY) === 'true'
  } catch {
    return false
  }
}

// Compatibilidade com código antigo
type CheckinItem = {
  planejamentoId: number
  escolaId: number
  status: 'pendente'|'entregue'|'nao_entregue'
  observacao?: string
  fotoBase64?: string
  assinadoPor?: string
}

const OLD_KEY = 'checkin_queue_v1'

export function enqueue(item: CheckinItem) {
  try {
    const s = localStorage.getItem(OLD_KEY)
    const arr: CheckinItem[] = s ? JSON.parse(s) : []
    arr.push(item)
    localStorage.setItem(OLD_KEY, JSON.stringify(arr))
  } catch {}
}
