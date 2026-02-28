import { useEffect, useState } from 'react'
import { handleAxiosError } from '../api/client'
import { EscolaStatus } from '../api/rotas'

type Filtros = {
  planejamentoId?: string
  rotaId?: string
  status?: string
  from?: string
  to?: string
}

export default function Historico() {
  const [filtros, setFiltros] = useState<Filtros>({})
  const [itens, setItens] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function buscar() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (filtros.planejamentoId) params.set('planejamentoId', filtros.planejamentoId)
      if (filtros.rotaId) params.set('rotaId', filtros.rotaId)
      if (filtros.status) params.set('status', filtros.status)
      if (filtros.from) params.set('from', filtros.from)
      if (filtros.to) params.set('to', filtros.to)
      const url = `${import.meta.env.VITE_API_URL || ''}/api/entregas/evidencias?${params.toString()}`
      const resp = await fetch(url, { headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${JSON.parse(localStorage.getItem('token')!).token}` : '' } })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setItens(data)
    } catch (e) {
      setError(handleAxiosError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { buscar() }, [])

  return (
    <div>
      <h2>Histórico de Entregas</h2>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:8 }}>
          <input className="input" placeholder="Planejamento ID" value={filtros.planejamentoId || ''} onChange={e => setFiltros(f => ({ ...f, planejamentoId: e.target.value }))} />
          <input className="input" placeholder="Rota ID" value={filtros.rotaId || ''} onChange={e => setFiltros(f => ({ ...f, rotaId: e.target.value }))} />
          <select className="input" value={filtros.status || ''} onChange={e => setFiltros(f => ({ ...f, status: e.target.value || undefined }))}>
            <option value="">Todos os status</option>
            <option value="entregue">Entregue</option>
            <option value="nao_entregue">Não entregue</option>
            <option value="pendente">Pendente</option>
          </select>
          <input className="input" type="date" value={filtros.from || ''} onChange={e => setFiltros(f => ({ ...f, from: e.target.value }))} />
          <input className="input" type="date" value={filtros.to || ''} onChange={e => setFiltros(f => ({ ...f, to: e.target.value }))} />
          <button className="btn" onClick={buscar}>Filtrar</button>
        </div>
      </div>
      {loading && <div className="card">Carregando…</div>}
      {error && <div className="card error">Erro: {error}</div>}
      <div className="grid">
        {itens.map((it) => (
          <div key={it.id} className="card">
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <div style={{ fontWeight:600 }}>{it.escola_nome}</div>
              <span className={`badge ${it.status === 'entregue' ? 'ok' : it.status === 'nao_entregue' ? 'off' : ''}`}>{it.status}</span>
            </div>
            <div className="muted" style={{ marginTop:4 }}>Rota: {it.rota_nome} • {new Date(it.updated_at).toLocaleString('pt-BR')}</div>
            {it.escola_endereco && <div className="muted">{it.escola_endereco}</div>}
            {it.foto_url && (
              <div style={{ marginTop:8 }}>
                <img src={it.foto_url} alt="Evidência" style={{ width:'100%', maxHeight:180, objectFit:'cover', borderRadius:8, border:'1px solid #1f2937' }} />
              </div>
            )}
            {(it.assinado_por || it.assinado_em) && (
              <div className="muted" style={{ marginTop:6 }}>
                {it.assinado_por ? `Ass.: ${it.assinado_por}` : null}
                {it.assinado_em ? ` • ${new Date(it.assinado_em).toLocaleString('pt-BR')}` : null}
              </div>
            )}
            {it.observacao && <div className="muted" style={{ marginTop:6 }}>Obs.: {it.observacao}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
