import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarRotas, Rota } from '../api/rotas'
import { handleAxiosError } from '../api/client'
import QRCodeScanner from '../components/QRCodeScanner'

interface FiltroQRCode {
  rotaId: number
  rotaNome: string
  dataInicio: string
  dataFim: string
  geradoEm: string
  geradoPor?: string
}

export default function Rotas() {
  const [rotas, setRotas] = useState<Rota[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarScanner, setMostrarScanner] = useState(false)
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroQRCode | null>(null)

  useEffect(() => {
    // Carregar filtro salvo
    const filtroSalvo = localStorage.getItem('filtro_qrcode')
    if (filtroSalvo) {
      try {
        setFiltroAtivo(JSON.parse(filtroSalvo))
      } catch (e) {
        console.warn('Erro ao carregar filtro:', e)
      }
    }

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

  function handleScan(data: string) {
    try {
      const filtro: FiltroQRCode = JSON.parse(data)
      
      // Validar estrutura do QR Code
      if (!filtro.rotaId || !filtro.rotaNome || !filtro.dataInicio || !filtro.dataFim) {
        alert('QR Code inválido. Certifique-se de escanear um QR Code gerado pelo sistema.')
        return
      }

      // Salvar filtro no localStorage
      localStorage.setItem('filtro_qrcode', data)
      setFiltroAtivo(filtro)
      setMostrarScanner(false)

      alert(`✓ Filtro aplicado!\n\nRota: ${filtro.rotaNome}\nPeríodo: ${new Date(filtro.dataInicio).toLocaleDateString('pt-BR')} até ${new Date(filtro.dataFim).toLocaleDateString('pt-BR')}`)
    } catch (e) {
      console.error('Erro ao processar QR Code:', e)
      alert('Erro ao processar QR Code. Verifique se o código está correto.')
    }
  }

  function limparFiltro() {
    localStorage.removeItem('filtro_qrcode')
    setFiltroAtivo(null)
    alert('Filtro removido. Todas as rotas estão visíveis novamente.')
  }

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

  // Filtrar rotas se houver filtro ativo
  const rotasFiltradas = filtroAtivo 
    ? rotas.filter(r => r.id === filtroAtivo.rotaId)
    : rotas

  return (
    <div>
      {mostrarScanner && (
        <QRCodeScanner
          onScan={handleScan}
          onClose={() => setMostrarScanner(false)}
        />
      )}

      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>Rotas de Entrega</h2>
          <div className="muted">{rotasFiltradas.length} rota(s) disponível(is)</div>
        </div>
        <button 
          className="btn" 
          onClick={() => setMostrarScanner(true)}
          style={{ background: '#1976d2', color: 'white' }}
        >
          📷 Escanear QR Code
        </button>
      </div>

      {/* Indicador de filtro ativo */}
      {filtroAtivo && (
        <div style={{
          padding: 16,
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          borderRadius: 8,
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🔍</span>
                <span>Filtro Ativo</span>
              </div>
              <div style={{ fontSize: 14, opacity: 0.95 }}>
                <strong>Rota:</strong> {filtroAtivo.rotaNome}
              </div>
              <div style={{ fontSize: 14, opacity: 0.95 }}>
                <strong>Período:</strong> {new Date(filtroAtivo.dataInicio).toLocaleDateString('pt-BR')} até {new Date(filtroAtivo.dataFim).toLocaleDateString('pt-BR')}
              </div>
              {filtroAtivo.geradoPor && (
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                  Gerado por: {filtroAtivo.geradoPor}
                </div>
              )}
            </div>
            <button
              onClick={limparFiltro}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 6,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              ✕ Limpar Filtro
            </button>
          </div>
        </div>
      )}
      <div className="grid">
        {rotasFiltradas.map((rota) => (
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
