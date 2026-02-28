import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { listarItensEscola, ItemEntrega, confirmarEntregaItem, ConfirmarEntregaItemData } from '../api/rotas'
import { handleAxiosError } from '../api/client'
import SignaturePad from '../components/SignaturePad'

interface ItemSelecionado extends ItemEntrega {
  selecionado: boolean
  quantidade_entregue: number
  entrega_confirmada?: boolean
  nome_quem_recebeu?: string
  data_entrega?: string
}

// Função para formatar números removendo zeros desnecessários
function formatarNumero(valor: number): string {
  // Remove zeros à direita após o ponto decimal
  return valor.toString().replace(/\.?0+$/, '')
}

export default function EscolaDetalhe() {
  const { escolaId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { escolaNome?: string; guiaId?: number; rotaId?: number } | null
  
  const id = Number(escolaId)
  const [itens, setItens] = useState<ItemSelecionado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<'selecao' | 'revisao'>('selecao')
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'entregues'>('pendentes')
  const [mostrandoSucesso, setMostrandoSucesso] = useState(false)
  
  // Dados da revisão
  const [nomeRecebedor, setNomeRecebedor] = useState('')
  const [nomeEntregador, setNomeEntregador] = useState('')
  const [observacao, setObservacao] = useState('')
  const [assinatura, setAssinatura] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)
        const data = await listarItensEscola(id, state?.guiaId)
        
        // Salvar no cache para uso offline
        try {
          localStorage.setItem(`itens_escola_${id}`, JSON.stringify(data))
        } catch (e) {
          console.warn('Erro ao salvar cache:', e)
        }
        
        setItens(data.map(item => ({
          ...item,
          selecionado: false,
          // Se já houver entregas parciais, usar o saldo pendente como quantidade padrão
          quantidade_entregue: item.saldo_pendente !== undefined && item.quantidade_ja_entregue ? item.saldo_pendente : item.quantidade
        })))
      } catch (e) {
        setError(handleAxiosError(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [id, state?.guiaId])

  // Filtrar itens baseado na aba ativa
  const itensFiltrados = itens.filter(item => 
    abaAtiva === 'pendentes' ? !item.entrega_confirmada : item.entrega_confirmada
  )

  function toggleItem(itemId: number) {
    const item = itens.find(i => i.id === itemId)
    if (item?.entrega_confirmada) {
      return // Não permite selecionar itens já entregues
    }
    
    setItens(prev => prev.map(item =>
      item.id === itemId ? { ...item, selecionado: !item.selecionado } : item
    ))
  }

  function atualizarQuantidade(itemId: number, valor: string) {
    const quantidade = parseFloat(valor) || 0
    const item = itens.find(i => i.id === itemId)
    console.log('📝 DIGITAÇÃO:', {
      itemId,
      produto: item?.produto_nome,
      valorDigitado: valor,
      quantidadeConvertida: quantidade,
      quantidadeProgramada: item?.quantidade
    })
    setItens(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantidade_entregue: quantidade } : item
    ))
  }

  function selecionarTodos() {
    const itensPendentes = itensFiltrados.filter(i => !i.entrega_confirmada)
    const todosSelecionados = itensPendentes.every(i => i.selecionado)
    setItens(prev => prev.map(item => 
      !item.entrega_confirmada ? { ...item, selecionado: !todosSelecionados } : item
    ))
  }

  function continuar() {
    const selecionados = itens.filter(i => i.selecionado)
    console.log('🔍 REVISÃO - Itens selecionados:', selecionados.map(i => ({
      id: i.id,
      produto: i.produto_nome,
      programado: i.quantidade,
      quantidade_entregue: i.quantidade_entregue,
      unidade: i.unidade
    })))
    
    if (selecionados.length === 0) {
      alert('Selecione pelo menos um item para entrega')
      return
    }

    // Validar quantidades
    const invalidos = selecionados.filter(i => i.quantidade_entregue <= 0)
    if (invalidos.length > 0) {
      alert('Todas as quantidades devem ser maiores que zero')
      return
    }

    // Avisar sobre quantidades diferentes
    const diferentes = selecionados.filter(i => i.quantidade_entregue !== i.quantidade)
    if (diferentes.length > 0) {
      const nomes = diferentes.map(i => `${i.produto_nome}: ${formatarNumero(i.quantidade_entregue)} ${i.unidade} (programado: ${formatarNumero(i.quantidade)} ${i.unidade})`).join('\n')
      const confirmar = window.confirm(
        `⚠️ ATENÇÃO: Entrega Parcial/Diferente\n\n` +
        `Os seguintes itens têm quantidade diferente da programada:\n\n${nomes}\n\n` +
        `Deseja continuar com essas quantidades?`
      )
      if (!confirmar) return
    }

    setEtapa('revisao')
  }

  async function finalizarEntrega() {
    if (!nomeRecebedor.trim()) {
      alert('Informe o nome de quem recebeu a entrega')
      return
    }

    if (!nomeEntregador.trim()) {
      alert('Informe o nome de quem entregou')
      return
    }

    if (!assinatura) {
      alert('É necessário coletar a assinatura do recebedor')
      return
    }

    try {
      setSalvando(true)
      
      // Confirmar cada item selecionado
      const itensSelecionados = itens.filter(i => i.selecionado)
      let algumOffline = false
      
      console.log('Finalizando entrega com itens:', itensSelecionados.map(i => ({
        id: i.id,
        produto: i.produto_nome,
        programado: i.quantidade,
        quantidade_entregue: i.quantidade_entregue,
        unidade: i.unidade
      })))
      
      for (const item of itensSelecionados) {
        const dadosEntrega: ConfirmarEntregaItemData = {
          quantidade_entregue: item.quantidade_entregue,
          nome_quem_entregou: nomeEntregador.trim(),
          nome_quem_recebeu: nomeRecebedor.trim(),
          observacao: observacao.trim() || undefined,
          assinatura_base64: assinatura
        }
        
        console.log('📤 ENVIANDO para API:', {
          itemId: item.id,
          produto: item.produto_nome,
          ...dadosEntrega
        })
        
        const resultado = await confirmarEntregaItem(item.id, dadosEntrega)
        if (resultado.queued) {
          algumOffline = true
        }
      }

      // Mostrar animação de sucesso
      setMostrandoSucesso(true)
      
      // Se algum item foi para fila offline, mostrar mensagem
      if (algumOffline) {
        setTimeout(() => {
          alert('⚠️ Entrega salva offline. Será sincronizada quando houver conexão.')
        }, 500)
      }
      
      // Aguardar 2 segundos e voltar
      setTimeout(() => {
        // Limpar cache da escola
        localStorage.removeItem(`itens_escola_${id}`)
        navigate(`/rotas/${state?.rotaId || ''}`)
      }, 2000)
    } catch (e) {
      alert(`Erro ao finalizar entrega: ${handleAxiosError(e)}`)
      setSalvando(false)
    }
  }

  if (loading) return <div className="card">Carregando itens...</div>
  if (error) return <div className="card error">Erro ao carregar itens: {error}</div>

  const itensSelecionados = itens.filter(i => i.selecionado)

  // Modal de sucesso
  if (mostrandoSucesso) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.3s ease-in'
      }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 48,
          textAlign: 'center',
          maxWidth: 400,
          animation: 'scaleIn 0.5s ease-out'
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'checkmark 0.8s ease-in-out'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" style={{ animation: 'drawCheck 0.5s ease-in-out 0.3s forwards', strokeDasharray: 30, strokeDashoffset: 30 }} />
            </svg>
          </div>
          <h2 style={{ margin: '0 0 12px', color: '#059669', fontSize: 28, fontWeight: 700 }}>
            Entrega Confirmada!
          </h2>
          <p style={{ margin: 0, color: '#666', fontSize: 16 }}>
            {itensSelecionados.length} {itensSelecionados.length === 1 ? 'item confirmado' : 'itens confirmados'} com sucesso
          </p>
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes checkmark {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
          @keyframes drawCheck {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </div>
    )
  }

  if (etapa === 'revisao') {
    return (
      <div>
        <div className="header">
          <h2>{state?.escolaNome || `Escola ${id}`}</h2>
          <button className="btn" onClick={() => setEtapa('selecao')}>Voltar</button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Resumo da Entrega</h3>
          
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Itens Selecionados ({itensSelecionados.length})</div>
            <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              {itensSelecionados.map(item => {
                const quantidadeDiferente = item.quantidade_entregue !== item.quantidade
                return (
                  <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{item.produto_nome}</span>
                      <span style={{ fontWeight: 700, color: quantidadeDiferente ? '#d97706' : '#059669' }}>
                        {formatarNumero(item.quantidade_entregue)} {item.unidade}
                      </span>
                    </div>
                    {quantidadeDiferente && (
                      <div style={{ 
                        fontSize: 12, 
                        color: '#92400e', 
                        marginTop: 4,
                        padding: '4px 8px',
                        background: '#fef3c7',
                        borderRadius: 4,
                        display: 'inline-block'
                      }}>
                        ⚠️ Programado: {formatarNumero(item.quantidade)} {item.unidade}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Nome de Quem Entregou *</div>
              <input
                className="input"
                type="text"
                value={nomeEntregador}
                onChange={e => setNomeEntregador(e.target.value)}
                placeholder="Nome do entregador"
                required
              />
            </label>

            <label>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Nome de Quem Recebeu *</div>
              <input
                className="input"
                type="text"
                value={nomeRecebedor}
                onChange={e => setNomeRecebedor(e.target.value)}
                placeholder="Nome completo"
                required
              />
            </label>

            <label>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Observações (opcional)</div>
              <textarea
                className="input"
                rows={3}
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Observações adicionais sobre a entrega"
              />
            </label>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Assinatura do Recebedor *</div>
              {assinatura ? (
                <div>
                  <div style={{ 
                    border: '2px solid var(--success)', 
                    borderRadius: 8, 
                    padding: 12,
                    background: '#f0fdf4',
                    marginBottom: 8
                  }}>
                    <img 
                      src={assinatura} 
                      alt="Assinatura" 
                      style={{ 
                        width: '100%', 
                        height: 'auto',
                        display: 'block'
                      }} 
                    />
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setAssinatura(null)}
                    style={{ 
                      width: '100%',
                      background: 'var(--warning)'
                    }}
                  >
                    ✏️ Refazer Assinatura
                  </button>
                </div>
              ) : (
                <SignaturePad 
                  onSave={(dataUrl) => setAssinatura(dataUrl)}
                  onClear={() => setAssinatura(null)}
                />
              )}
            </div>

            <div style={{ 
              padding: '12px', 
              background: '#fef3c7', 
              borderRadius: 8, 
              border: '1px solid #fbbf24',
              marginTop: 8
            }}>
              <div style={{ fontSize: 13, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>
                ⚠️ Atenção: Entrega Parcial
              </div>
              <div style={{ fontSize: 12, color: '#78350f' }}>
                Você pode entregar uma quantidade diferente da programada. O sistema registrará exatamente o que foi entregue.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                className="btn"
                onClick={() => setEtapa('selecao')}
                disabled={salvando}
                style={{ flex: 1 }}
              >
                Voltar
              </button>
              <button
                className="btn"
                onClick={finalizarEntrega}
                disabled={salvando}
                style={{ flex: 2, background: '#059669', color: 'white' }}
              >
                {salvando ? 'Finalizando...' : 'Finalizar Entrega'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <h2>{state?.escolaNome || `Escola ${id}`}</h2>
        <button className="btn" onClick={() => navigate(-1)}>Voltar</button>
      </div>

      {/* Abas */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 16,
        borderBottom: '2px solid #e5e7eb'
      }}>
        <button
          onClick={() => setAbaAtiva('pendentes')}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: abaAtiva === 'pendentes' ? '#1976d2' : 'transparent',
            color: abaAtiva === 'pendentes' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: abaAtiva === 'pendentes' ? '3px solid #1976d2' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 15,
            transition: 'all 0.2s'
          }}
        >
          📦 Pendentes ({itens.filter(i => !i.entrega_confirmada).length})
        </button>
        <button
          onClick={() => setAbaAtiva('entregues')}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: abaAtiva === 'entregues' ? '#059669' : 'transparent',
            color: abaAtiva === 'entregues' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: abaAtiva === 'entregues' ? '3px solid #059669' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 15,
            transition: 'all 0.2s'
          }}
        >
          ✓ Entregues ({itens.filter(i => i.entrega_confirmada).length})
        </button>
      </div>

      {abaAtiva === 'pendentes' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Itens para Entrega</div>
              <div className="muted">
                {itens.filter(i => !i.entrega_confirmada).length} item(s) pendente(s) para hoje
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn" onClick={selecionarTodos}>
                {itensFiltrados.every(i => i.selecionado) ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'entregues' && (
        <div className="card" style={{ marginBottom: 12, background: '#f0fdf4', border: '2px solid #86efac' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#059669' }}>✓ Itens Entregues</div>
            <div style={{ fontSize: 14, color: '#047857' }}>
              {itens.filter(i => i.entrega_confirmada).length} item(s) já entregue(s) hoje
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {itensFiltrados.map(item => (
          <div 
            key={item.id} 
            className="card" 
            style={{ 
              padding: 16,
              opacity: item.entrega_confirmada ? 0.95 : 1,
              background: item.entrega_confirmada ? '#f0fdf4' : 'white',
              border: item.entrega_confirmada ? '2px solid #86efac' : '1px solid #d1d5db',
              boxShadow: item.entrega_confirmada ? '0 1px 3px rgba(5, 150, 105, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {!item.entrega_confirmada && (
                <input
                  type="checkbox"
                  checked={item.selecionado}
                  onChange={() => toggleItem(item.id)}
                  style={{ 
                    marginTop: 4, 
                    width: 18, 
                    height: 18, 
                    cursor: 'pointer'
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>{item.produto_nome}</div>
                  {item.entrega_confirmada && (
                    <span style={{ 
                      fontSize: 11, 
                      padding: '3px 10px', 
                      background: '#059669', 
                      color: 'white', 
                      borderRadius: 6,
                      fontWeight: 700,
                      letterSpacing: '0.5px'
                    }}>
                      ✓ ENTREGUE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: '#4b5563', marginBottom: 4 }}>
                  Quantidade programada: <strong style={{ color: '#1f2937' }}>{formatarNumero(item.quantidade)} {item.unidade}</strong>
                  {item.quantidade_ja_entregue && item.quantidade_ja_entregue > 0 && !item.entrega_confirmada && (
                    <div style={{ 
                      marginTop: 6,
                      padding: '6px 10px',
                      background: '#fef3c7',
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#92400e',
                      border: '1px solid #fbbf24'
                    }}>
                      ⚠️ Já entregue anteriormente: <strong>{formatarNumero(item.quantidade_ja_entregue)} {item.unidade}</strong>
                      <br />
                      <strong style={{ color: '#1976d2' }}>Saldo pendente: {formatarNumero(item.saldo_pendente || 0)} {item.unidade}</strong>
                    </div>
                  )}
                </div>
                {item.entrega_confirmada && (
                  <div style={{ 
                    fontSize: 13, 
                    color: '#047857', 
                    marginTop: 8,
                    padding: '8px 12px',
                    background: 'rgba(5, 150, 105, 0.08)',
                    borderRadius: 6,
                    borderLeft: '3px solid #059669'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Entregue: {formatarNumero(item.quantidade_entregue || item.quantidade)} {item.unidade}
                      {item.quantidade_entregue && item.quantidade_entregue !== item.quantidade && (
                        <span style={{ 
                          marginLeft: 8,
                          padding: '2px 6px',
                          background: '#fef3c7',
                          color: '#92400e',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700
                        }}>
                          PARCIAL
                        </span>
                      )}
                    </div>
                    {item.quantidade_entregue && item.quantidade_entregue !== item.quantidade && (
                      <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>
                        ⚠️ Programado: {formatarNumero(item.quantidade)} {item.unidade}
                      </div>
                    )}
                    {item.nome_quem_recebeu && (
                      <div style={{ fontSize: 12, color: '#065f46' }}>
                        👤 Recebido por: {item.nome_quem_recebeu}
                      </div>
                    )}
                    {item.data_entrega && (
                      <div style={{ fontSize: 12, color: '#065f46' }}>
                        📅 {new Date(item.data_entrega).toLocaleDateString('pt-BR')} às {new Date(item.data_entrega).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                )}
                {item.lote && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    🏷️ Lote: <strong>{item.lote}</strong>
                  </div>
                )}
                {item.observacao && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontStyle: 'italic', padding: '6px 10px', background: '#f9fafb', borderRadius: 4 }}>
                    💬 {item.observacao}
                  </div>
                )}

                {item.selecionado && !item.entrega_confirmada && (
                  <div style={{ marginTop: 12, padding: '12px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                    <label>
                      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#1e40af' }}>
                        Quantidade a entregar *
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                        Você pode entregar uma quantidade diferente da programada
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantidade_entregue}
                          onChange={e => atualizarQuantidade(item.id, e.target.value)}
                          style={{ maxWidth: 150, fontSize: 16, fontWeight: 600 }}
                        />
                        <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 16 }}>{item.unidade}</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {itensFiltrados.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {abaAtiva === 'pendentes' ? '📦' : '✓'}
          </div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            {abaAtiva === 'pendentes' 
              ? 'Nenhum item pendente para hoje' 
              : 'Nenhum item entregue ainda'}
          </div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>
            {abaAtiva === 'pendentes' 
              ? 'Todos os itens já foram entregues' 
              : 'Faça entregas para vê-las aqui'}
          </div>
        </div>
      )}

      {itensSelecionados.length > 0 && (
        <div style={{ position: 'sticky', bottom: 16, marginTop: 20 }}>
          <button
            className="btn"
            onClick={continuar}
            style={{
              width: '100%',
              padding: '14px 20px',
              fontSize: 16,
              fontWeight: 600,
              background: '#1976d2',
              color: 'white'
            }}
          >
            Continuar ({itensSelecionados.length} {itensSelecionados.length === 1 ? 'item' : 'itens'})
          </button>
        </div>
      )}
    </div>
  )
}
