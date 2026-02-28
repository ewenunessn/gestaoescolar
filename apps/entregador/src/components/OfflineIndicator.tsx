import { useEffect, useState } from 'react'
import { syncOfflineQueue } from '../api/rotas'
import { getQueueCount } from '../offline/queue'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queueCount, setQueueCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    // Atualizar contador da fila
    const updateQueue = () => {
      setQueueCount(getQueueCount())
    }
    
    updateQueue()
    const interval = setInterval(updateQueue, 2000)

    // Listeners de conexão
    const handleOnline = () => {
      setIsOnline(true)
      console.log('🌐 Conexão restaurada')
      // Tentar sincronizar automaticamente
      setTimeout(() => handleSync(), 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('📴 Sem conexão')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleSync = async () => {
    if (syncing || queueCount === 0) return
    
    setSyncing(true)
    try {
      const result = await syncOfflineQueue()
      if (result.success && result.synced && result.synced > 0) {
        setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
        setQueueCount(getQueueCount())
        alert(`✅ ${result.synced} entrega(s) sincronizada(s) com sucesso!`)
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
      alert('❌ Erro ao sincronizar entregas. Tente novamente.')
    } finally {
      setSyncing(false)
    }
  }

  if (isOnline && queueCount === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      zIndex: 1000,
      background: isOnline ? '#fef3c7' : '#fee2e2',
      border: `2px solid ${isOnline ? '#f59e0b' : '#ef4444'}`,
      borderRadius: 12,
      padding: '12px 16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      maxWidth: 320,
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: isOnline ? '#10b981' : '#ef4444',
          animation: isOnline ? 'none' : 'pulse 2s infinite'
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937', marginBottom: 2 }}>
            {isOnline ? '🌐 Online' : '📴 Offline'}
          </div>
          {queueCount > 0 && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {queueCount} entrega(s) pendente(s)
              {lastSync && <span> • Última sync: {lastSync}</span>}
            </div>
          )}
        </div>
        {isOnline && queueCount > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn"
            style={{
              fontSize: 12,
              padding: '6px 12px',
              background: '#059669',
              color: 'white',
              border: 'none',
              cursor: syncing ? 'wait' : 'pointer',
              opacity: syncing ? 0.6 : 1
            }}
          >
            {syncing ? '⏳ Sincronizando...' : '🔄 Sincronizar'}
          </button>
        )}
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
