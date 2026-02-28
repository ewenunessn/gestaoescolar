import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarRotas, Rota } from '../api/rotas'
import { handleAxiosError } from '../api/client'

export default function Rotas() {
  const [rotas, setRotas] = useState<Rota[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const itens = await listarRotas()
        setRotas(itens)
      } catch (e) {
        setError(handleAxiosError(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>Carregando rotas...</div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="card error">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Erro ao carregar rotas</div>
            <div style={{ fontSize: 14 }}>{error}</div>
          </div>
        </div>
      </div>
    )
  }

  if (rotas.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📍</div>
        <div className="empty-state-title">Nenhuma rota encontrada</div>
        <div className="empty-state-description">
          Não há rotas de entrega cadastradas no momento
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>Rotas de Entrega</h2>
          <div className="muted">{rotas.length} rota(s) disponível(is)</div>
        </div>
      </div>
      <div className="grid">
        {rotas.map((rota) => (
          <Link 
            key={rota.id} 
            to={`/rotas/${rota.id}`}
            className="rota-card"
            style={{ borderLeftColor: rota.cor || '#1976d2' }}
          >
            <div className="rota-name">{rota.nome}</div>
            {rota.descricao && <div className="rota-desc">{rota.descricao}</div>}
            <div className="rota-meta">
              <span className={`badge ${rota.ativo ? 'ok' : 'off'}`}>
                {rota.ativo ? '✓ Ativa' : '✕ Inativa'}
              </span>
              <span className="muted">
                🏫 {rota.total_escolas ?? 0} escola(s)
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
