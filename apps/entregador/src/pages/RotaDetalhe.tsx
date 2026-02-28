import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { listarEscolasDaRota, EscolaRota, listarPlanejamentos, atualizarPlanejamento, Planejamento, listarStatusEscolasPlanejamento, atualizarStatusEscola, EscolaStatus } from '../api/rotas'
import { handleAxiosError } from '../api/client'
import CheckinModal from '../components/CheckinModal'

export default function RotaDetalhe() {
  const { rotaId } = useParams()
  const id = Number(rotaId)
  const [escolas, setEscolas] = useState<EscolaStatus[]>([])
  const [planej, setPlanej] = useState<Planejamento | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [escolaAlvo, setEscolaAlvo] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)
        const plans = await listarPlanejamentos({ rotaId: id })
        const p = plans[0] ?? null
        setPlanej(p)
        if (p) {
          const status = await listarStatusEscolasPlanejamento(p.id)
          setEscolas(status)
        } else {
          const itens = await listarEscolasDaRota(id)
          setEscolas(itens.map(i => ({ ...i, status: 'pendente' })))
        }
      } catch (e) {
        setError(handleAxiosError(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) {
    return (
      <div className="loading">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>Carregando escolas...</div>
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
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Erro ao carregar escolas</div>
            <div style={{ fontSize: 14 }}>{error}</div>
          </div>
        </div>
      </div>
    )
  }

  async function alterarStatus(status: Planejamento['status']) {
    if (!planej) return
    try {
      setUpdating(true)
      const updated = await atualizarPlanejamento(planej.id, { status })
      setPlanej(updated)
    } catch (e) {
      alert(`Falha ao atualizar status: ${handleAxiosError(e)}`)
    } finally {
      setUpdating(false)
    }
  }

  async function marcarEscola(escolaId: number, status: 'entregue'|'nao_entregue') {
    if (!planej) return alert('Crie um planejamento para registrar status por escola.')
    try {
      if (status === 'entregue') {
        setEscolaAlvo(escolaId)
        setModalOpen(true)
        return
      } else {
        setUpdating(true)
        await atualizarStatusEscola(planej.id, escolaId, status, undefined)
        setEscolas(prev => prev.map(e => e.escola_id === escolaId ? { ...e, status } : e))
      }
    } catch (e) {
      alert(`Falha ao salvar status da escola: ${handleAxiosError(e)}`)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div>
      <CheckinModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEscolaAlvo(null) }}
        onConfirm={async ({ observacao, fotoBase64, assinadoPor }) => {
          if (!planej || escolaAlvo == null) return
          try {
            setUpdating(true)
            await atualizarStatusEscola(planej.id, escolaAlvo, 'entregue', observacao, fotoBase64, assinadoPor)
            setEscolas(prev => prev.map(e => e.escola_id === escolaAlvo ? { ...e, status: 'entregue' } : e))
          } catch (e) {
            alert(`Falha ao registrar check-in: ${handleAxiosError(e)}`)
          } finally {
            setUpdating(false)
            setModalOpen(false)
            setEscolaAlvo(null)
          }
        }}
      />
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>Rota #{id}</h2>
          <div className="muted">{escolas.length} escola(s) na rota</div>
        </div>
        <Link to="/rotas" className="btn">← Voltar</Link>
      </div>
      {planej && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div>
              <div style={{ fontWeight:600 }}>Planejamento</div>
              <div className="muted">
                Status: <strong>{planej.status}</strong>
                {planej.data_planejada ? ` • Data: ${new Date(planej.data_planejada).toLocaleDateString('pt-BR')}` : ''}
                {planej.responsavel ? ` • Resp.: ${planej.responsavel}` : ''}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="btn" disabled={updating} onClick={() => alterarStatus('em_andamento')}>Iniciar</button>
              <button className="btn" disabled={updating} onClick={() => alterarStatus('concluido')}>Concluir</button>
              <button className="btn" disabled={updating} onClick={() => alterarStatus('cancelado')}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      <ol className="lista">
        {escolas.map((item) => (
          <li key={item.id} className="escola">
            <div className="ordem">#{item.ordem}</div>
            <div className="dados">
              <div className="nome">{item.escola_nome || `Escola ${item.escola_id}`}</div>
              {item.escola_endereco && <div className="end">{item.escola_endereco}</div>}
              {item.foto_url && (
                <div className="end" style={{ marginTop: 6 }}>
                  <img src={item.foto_url} alt="Evidência" style={{ height: 38, borderRadius: 6, border: '1px solid #1f2937' }} />
                </div>
              )}
              {(item.assinado_por || item.assinado_em) && (
                <div className="end">
                  {item.assinado_por ? `Ass.: ${item.assinado_por}` : null}
                  {item.assinado_em ? ` • ${new Date(item.assinado_em).toLocaleString('pt-BR')}` : null}
                </div>
              )}
            </div>
            <div style={{ marginLeft: 'auto', display:'flex', alignItems:'center', gap:8, flexWrap: 'wrap' }}>
              <Link 
                to={`/escolas/${item.escola_id}`}
                state={{ escolaNome: item.escola_nome, guiaId: undefined, rotaId: id }}
                className="btn"
                style={{ textDecoration: 'none' }}
              >
                Ver Itens
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
