import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { listarItensEscola, ItemEntrega, confirmarEntregaItem, ConfirmarEntregaItemData } from '../api/rotas'
import { handleAxiosError } from '../api/client'
import SignaturePad from '../components/SignaturePad'

interface ItemSelecionado extends ItemEntrega {
  selecionado: boolean
  quantidade_a_entregar: number  // Quantidade que será entregue nesta entrega
  entrega_confirmada?: boolean
  nome_quem_recebeu?: string
  data_entrega?: string
}

interface FiltroQRCode {
  rotaId: number
  rotaNome: string
  dataInicio: string
  dataFim: string
  geradoEm: string
  geradoPor?: string
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
  const state = location.state as { escolaNome?: string; guiaId?: number; rotaId?: number; filtroQRCode?: FiltroQRCode } | null
  
  const id = Number(escolaId)
  const [itens, setItens] = useState<ItemSelecionado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<'selecao' | 'revisao'>('selecao')
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'entregues'>('pendentes')
  const [mostrandoSucesso, setMostrandoSucesso] = useState(false)
  const [itemHistoricoModal, setItemHistoricoModal] = useState<ItemSelecionado | null>(null)
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroQRCode | null>(null)
  
  // Dados da revisão
  const [nomeRecebedor, setNomeRecebedor] = useState('')
  const [nomeEntregador, setNomeEntregador] = useState(() => {
    // Pegar o nome do usuário logado
    try {
      const stored = localStorage.getItem('token')
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.nome || ''
      }
    } catch (e) {
      console.warn('Erro ao obter nome do usuário:', e)
    }
    return ''
  })
  const [observacao, setObservacao] = useState('')
  const [assinatura, setAssinatura] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    // Carregar filtro do state ou localStorage
    const filtro = state?.filtroQRCode || (() => {
      const filtroSalvo = localStorage.getItem('filtro_qrcode')
      if (filtroSalvo) {
        try {
          return JSON.parse(filtroSalvo) as FiltroQRCode
        } catch (e) {
          console.warn('Erro ao carregar filtro:', e)
        }
      }
      return null
    })()
    
    setFiltroAtivo(filtro)

    if (!id) return
    ;(async () => {
      try {
        setLoading(true)
        
        // Limpar cache antigo para forçar reload
        localStorage.removeItem(`itens_escola_${id}`)
        
        const data = await listarItensEscola(id, state?.guiaId)
        
        console.log('📥 Dados recebidos da API:', data)
        console.log('📊 Itens com histórico:', data.filter(i => i.historico_entregas && i.historico_entregas.length > 0).map(i => ({
          produto: i.produto_nome,
          quantidade_ja_entregue: i.quantidade_ja_entregue,
          tipo: typeof i.quantidade_ja_entregue,
          saldo_pendente: i.saldo_pendente,
          historico: i.historico_entregas
        })))
        
        // Aplicar filtro de data se houver
        let dadosFiltrados = data
        if (filtro) {
          const dataInicio = new Date(filtro.dataInicio)
          dataInicio.setHours(0, 0, 0, 0)
          const dataFim = new Date(filtro.dataFim)
          dataFim.setHours(23, 59, 59, 999)
          
          console.log('🔍 Aplicando filtro de data:', { dataInicio, dataFim })
          
          dadosFiltrados = data.filter(item => {
            // Filtrar pela data_entrega se disponível
            if (item.data_entrega) {
              const dataEntrega = new Date(item.data_entrega)
              const dentroDoIntervalo = dataEntrega >= dataInicio && dataEntrega <= dataFim
              console.log(`Item ${item.produto_nome}: data_entrega=${item.data_entrega}, dentro=${dentroDoIntervalo}`)
              return dentroDoIntervalo
            }
            // Se não tiver data_entrega, incluir por padrão
            return true
          })
          
          console.log(`📊 Filtro aplicado: ${data.length} itens → ${dadosFiltrados.length} itens`)
        }
        
        // Salvar no cache para uso offline
        try {
          localStorage.setItem(`itens_escola_${id}`, JSON.stringify(dadosFiltrados))
        } catch (e) {
          console.warn('Erro ao salvar cache:', e)
        }
        
        setItens(dadosFiltrados.map(item => ({
          ...item,
          selecionado: false,
          // Se já houver entregas parciais, usar o saldo pendente como quantidade padrão para a próxima entrega
          // Converter para número para evitar problemas
          quantidade_a_entregar: item.saldo_pendente !== undefined && item.saldo_pendente > 0 
            ? parseFloat(String(item.saldo_pendente)) 
            : parseFloat(String(item.quantidade))
        })))
      } catch (e) {
        setError(handleAxiosError(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [id, state?.guiaId])

  // Filtrar itens baseado na aba ativa (usar useMemo para evitar recalcular)
  const itensFiltrados = useMemo(() => {
    return itens.filter(item => {
      if (abaAtiva === 'pendentes') {
        // Pendentes: itens que ainda têm saldo para entregar
        const isPendente = !item.entrega_confirmada || (item.saldo_pendente && item.saldo_pendente > 0)
        if (isPendente) {
          console.log('✅ Item pendente:', item.produto_nome, { entrega_confirmada: item.entrega_confirmada, saldo_pendente: item.saldo_pendente })
        }
        return isPendente
      } else {
        // Entregues: itens que têm histórico de entregas (mesmo que parciais)
        const temHistorico = item.historico_entregas && item.historico_entregas.length > 0
        console.log(`${temHistorico ? '✅' : '❌'} Item ${item.produto_nome}:`, { 
          historico_entregas: item.historico_entregas,
          length: item.historico_entregas?.length 
        })
        return temHistorico
      }
    })
  }, [itens, abaAtiva])

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
    console.log('🔢 ANTES parseFloat:', { itemId, valor, tipo: typeof valor })
    const quantidade = parseFloat(valor) || 0
    console.log('🔢 DEPOIS parseFloat:', { quantidade, tipo: typeof quantidade })
    
    const item = itens.find(i => i.id === itemId)
    console.log('📝 DIGITAÇÃO:', {
      itemId,
      produto: item?.produto_nome,
      valorDigitado: valor,
      quantidadeConvertida: quantidade,
      quantidadeProgramada: item?.quantidade
    })
    setItens(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantidade_a_entregar: quantidade } : item
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
    console.log('🚨 CONTINUAR CLICADO - Estado ANTES de filtrar:', itens)
    
    const selecionados = itens.filter(i => i.selecionado)
    
    console.log('🚨 CONTINUAR - Itens selecionados IMEDIATAMENTE após filtro:', selecionados)
    
    console.log('🔍 REVISÃO - Estado completo dos itens:', itens.map(i => ({
      id: i.id,
      produto: i.produto_nome,
      selecionado: i.selecionado,
      quantidade_a_entregar: i.quantidade_a_entregar,
      tipo: typeof i.quantidade_a_entregar
    })))
    
    console.log('🔍 REVISÃO - Itens selecionados:', selecionados.map(i => ({
      id: i.id,
      produto: i.produto_nome,
      programado: i.quantidade,
      quantidade_a_entregar: i.quantidade_a_entregar,
      unidade: i.unidade
    })))
    
    if (selecionados.length === 0) {
      alert('Selecione pelo menos um item para entrega')
      return
    }

    // Validar quantidades
    const invalidos = selecionados.filter(i => i.quantidade_a_entregar <= 0)
    if (invalidos.length > 0) {
      alert('Todas as quantidades devem ser maiores que zero')
      return
    }

    // Avisar sobre quantidades diferentes (com tolerância de 0.01)
    const diferentes = selecionados.filter(i => {
      const diff = Math.abs(i.quantidade_a_entregar - i.quantidade);
      return diff > 0.01; // Tolerância para evitar problemas de precisão de ponto flutuante
    });
    if (diferentes.length > 0) {
      const nomes = diferentes.map(i => `${i.produto_nome}: ${formatarNumero(i.quantidade_a_entregar)} ${i.unidade} (programado: ${formatarNumero(i.quantidade)} ${i.unidade})`).join('\n')
      const confirmar = window.confirm(
        `⚠️ ATENÇÃO: Entrega Parcial/Diferente\n\n` +
        `Os seguintes itens têm quantidade diferente da programada:\n\n${nomes}\n\n` +
        `Deseja continuar com essas quantidades?`
      )
      if (!confirmar) return
    }

    console.log('🚨 MUDANDO PARA ETAPA REVISAO')
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
        quantidade_a_entregar: i.quantidade_a_entregar,
        unidade: i.unidade
      })))
      
      for (const item of itensSelecionados) {
        const dadosEntrega: ConfirmarEntregaItemData = {
          quantidade_entregue: item.quantidade_a_entregar,
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
    console.log('🎯 RENDERIZANDO TELA DE REVISÃO')
    console.log('🎯 itensSelecionados:', itensSelecionados)
    console.log('🎯 itensSelecionados detalhado:', itensSelecionados.map(i => ({
      id: i.id,
      produto: i.produto_nome,
      quantidade_a_entregar: i.quantidade_a_entregar,
      tipo: typeof i.quantidade_a_entregar,
      quantidade: i.quantidade
    })))
    
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
                const diff = Math.abs(item.quantidade_a_entregar - item.quantidade);
                const quantidadeDiferente = diff > 0.01; // Tolerância para evitar problemas de precisão
                return (
                  <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{item.produto_nome}</span>
                      <span style={{ fontWeight: 700, color: quantidadeDiferente ? '#d97706' : '#059669' }}>
                        {formatarNumero(item.quantidade_a_entregar)} {item.unidade}
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
                readOnly
                style={{ 
                  background: '#f3f4f6', 
                  cursor: 'not-allowed',
                  color: '#6b7280'
                }}
                placeholder="Nome do entregador"
                required
              />
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                ℹ️ Preenchido automaticamente com seu nome de usuário
              </div>
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

      {/* Indicador de filtro ativo */}
      {filtroAtivo && (
        <div style={{
          padding: 12,
          background: '#e3f2fd',
          border: '2px solid #1976d2',
          borderRadius: 8,
          marginBottom: 12
        }}>
          <div style={{ fontWeight: 600, color: '#1565c0', marginBottom: 4, fontSize: 14 }}>
            🔍 Filtro de Período Ativo
          </div>
          <div style={{ fontSize: 13, color: '#1976d2' }}>
            Mostrando apenas itens programados para: {new Date(filtroAtivo.dataInicio).toLocaleDateString('pt-BR')} até {new Date(filtroAtivo.dataFim).toLocaleDateString('pt-BR')}
          </div>
        </div>
      )}

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
          📦 Pendentes ({itens.filter(i => !i.entrega_confirmada || (i.saldo_pendente && i.saldo_pendente > 0)).length})
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
          ✓ Entregues ({itens.filter(i => i.historico_entregas && i.historico_entregas.length > 0).length})
        </button>
      </div>

      {abaAtiva === 'pendentes' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Itens para Entrega</div>
              <div className="muted">
                {itens.filter(i => !i.entrega_confirmada || (i.saldo_pendente && i.saldo_pendente > 0)).length} item(s) pendente(s) para hoje
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
            <div style={{ fontWeight: 600, color: '#059669' }}>✓ Histórico de Entregas</div>
            <div style={{ fontSize: 14, color: '#047857' }}>
              {itens.filter(i => i.historico_entregas && i.historico_entregas.length > 0).length} item(s) com entregas registradas
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {abaAtiva === 'pendentes' && itensFiltrados.map(item => (
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
            {/* ABA PENDENTES - Layout simplificado */}
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
                <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 16, marginBottom: 8 }}>
                  {item.produto_nome}
                </div>
                
                {/* Mostrar saldo pendente se houver entregas parciais */}
                {item.quantidade_ja_entregue && item.quantidade_ja_entregue > 0 ? (
                  <div>
                    <div style={{ fontSize: 14, color: '#dc2626', fontWeight: 600, marginBottom: 4 }}>
                      📦 Faltam: {formatarNumero(item.saldo_pendente || 0)} {item.unidade}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Programado: {formatarNumero(item.quantidade)} {item.unidade} • 
                      Já entregue: {formatarNumero(item.quantidade_ja_entregue)} {item.unidade}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: '#4b5563' }}>
                    📦 Quantidade: <strong style={{ color: '#1f2937' }}>{formatarNumero(item.quantidade)} {item.unidade}</strong>
                  </div>
                )}

                {item.lote && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
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
                          step="any"
                          min="0"
                          value={item.quantidade_a_entregar}
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

        {/* ABA ENTREGUES - Timeline agrupada por data */}
        {abaAtiva === 'entregues' && (() => {
          // Agrupar entregas por data
          const entregasPorData: Record<string, Array<{ item: ItemSelecionado; entrega: any }>> = {}
          
          itensFiltrados.forEach(item => {
            if (item.historico_entregas && item.historico_entregas.length > 0) {
              item.historico_entregas.forEach(entrega => {
                const dataKey = new Date(entrega.data_entrega).toLocaleDateString('pt-BR')
                if (!entregasPorData[dataKey]) {
                  entregasPorData[dataKey] = []
                }
                entregasPorData[dataKey].push({ item, entrega })
              })
            }
          })

          // Ordenar datas (mais recente primeiro)
          const datasOrdenadas = Object.keys(entregasPorData).sort((a, b) => {
            const dateA = new Date(a.split('/').reverse().join('-'))
            const dateB = new Date(b.split('/').reverse().join('-'))
            return dateB.getTime() - dateA.getTime()
          })

          return (
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              {/* Linha vertical da timeline */}
              <div style={{
                position: 'absolute',
                left: 8,
                top: 0,
                bottom: 0,
                width: 3,
                background: 'linear-gradient(to bottom, #059669, #86efac)',
                borderRadius: 2
              }} />

              {datasOrdenadas.map((data, dataIndex) => {
                const entregas = entregasPorData[data]
                const totalItens = entregas.length
                
                return (
                  <div key={data} style={{ marginBottom: 32, position: 'relative' }}>
                    {/* Marcador da data na timeline */}
                    <div style={{
                      position: 'absolute',
                      left: -20,
                      top: 8,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#059669',
                      border: '3px solid white',
                      boxShadow: '0 0 0 2px #059669',
                      zIndex: 1
                    }} />

                    {/* Cabeçalho da data */}
                    <div style={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: 'white',
                      padding: '12px 16px',
                      borderRadius: 8,
                      marginBottom: 12,
                      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>📅 {data}</div>
                          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                            {totalItens} {totalItens === 1 ? 'entrega realizada' : 'entregas realizadas'}
                          </div>
                        </div>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {dataIndex === 0 ? '🆕 Mais recente' : `${dataIndex + 1}º dia`}
                        </div>
                      </div>
                    </div>

                    {/* Entregas do dia */}
                    <div style={{ display: 'grid', gap: 12 }}>
                      {entregas.map(({ item, entrega }, index) => (
                        <div
                          key={`${item.id}-${entrega.id}`}
                          style={{
                            background: 'white',
                            border: '2px solid #d1fae5',
                            borderRadius: 8,
                            padding: 16,
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                          }}
                          onClick={() => setItemHistoricoModal(item)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <div style={{ fontWeight: 700, fontSize: 16, color: '#1f2937' }}>
                                  {item.produto_nome}
                                </div>
                                {item.entrega_confirmada && (
                                  <span style={{
                                    fontSize: 10,
                                    padding: '3px 8px',
                                    background: '#059669',
                                    color: 'white',
                                    borderRadius: 4,
                                    fontWeight: 700
                                  }}>
                                    ✓ COMPLETO
                                  </span>
                                )}
                                {!item.entrega_confirmada && (
                                  <span style={{
                                    fontSize: 10,
                                    padding: '3px 8px',
                                    background: '#fbbf24',
                                    color: 'white',
                                    borderRadius: 4,
                                    fontWeight: 700
                                  }}>
                                    ⚠️ PARCIAL
                                  </span>
                                )}
                              </div>
                              
                              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                                Programado: {formatarNumero(item.quantidade)} {item.unidade}
                                {item.saldo_pendente && item.saldo_pendente > 0 && (
                                  <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                    {' • '}Faltam: {formatarNumero(item.saldo_pendente)} {item.unidade}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{
                              background: '#f0fdf4',
                              padding: '8px 12px',
                              borderRadius: 6,
                              border: '1px solid #86efac',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>
                                {formatarNumero(entrega.quantidade_entregue)}
                              </div>
                              <div style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>
                                {item.unidade}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 12,
                            padding: 12,
                            background: '#f9fafb',
                            borderRadius: 6
                          }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>👤 Entregador</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>
                                {entrega.nome_quem_entregou}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>👤 Recebedor</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>
                                {entrega.nome_quem_recebeu}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}>
                            <span>🕐</span>
                            {new Date(entrega.data_entrega).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {entrega.observacao && (
                              <>
                                <span style={{ margin: '0 4px' }}>•</span>
                                <span style={{ fontStyle: 'italic' }}>💬 {entrega.observacao}</span>
                              </>
                            )}
                          </div>

                          <div style={{
                            marginTop: 8,
                            fontSize: 11,
                            color: '#059669',
                            fontWeight: 600,
                            textAlign: 'right'
                          }}>
                            Clique para ver histórico completo →
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {datasOrdenadas.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Nenhuma entrega registrada</div>
                  <div style={{ fontSize: 14 }}>As entregas aparecerão aqui organizadas por data</div>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Modal de Histórico */}
      {itemHistoricoModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
          onClick={() => setItemHistoricoModal(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: 12,
              maxWidth: 600,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '2px solid #e5e7eb',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
                    📋 Histórico de Entregas
                  </h3>
                  <div style={{ fontSize: 16, color: '#6b7280', marginTop: 4 }}>
                    {itemHistoricoModal.produto_nome}
                  </div>
                </div>
                <button
                  onClick={() => setItemHistoricoModal(null)}
                  style={{
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                    cursor: 'pointer',
                    fontSize: 20,
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
              
              <div style={{ 
                marginTop: 12,
                padding: '12px',
                background: '#f0fdf4',
                borderRadius: 8,
                border: '1px solid #86efac'
              }}>
                <div style={{ fontSize: 14, color: '#065f46' }}>
                  Programado: <strong>{formatarNumero(itemHistoricoModal.quantidade)} {itemHistoricoModal.unidade}</strong>
                  {' • '}
                  Entregue: <strong>{formatarNumero(
                    itemHistoricoModal.historico_entregas?.reduce((sum, h) => sum + parseFloat(String(h.quantidade_entregue)), 0) || 0
                  )} {itemHistoricoModal.unidade}</strong>
                  {itemHistoricoModal.saldo_pendente && itemHistoricoModal.saldo_pendente > 0 && (
                    <>
                      {' • '}
                      <strong style={{ color: '#dc2626' }}>Faltam: {formatarNumero(itemHistoricoModal.saldo_pendente)} {itemHistoricoModal.unidade}</strong>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {itemHistoricoModal.historico_entregas && itemHistoricoModal.historico_entregas.length > 0 ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {itemHistoricoModal.historico_entregas.map((entrega, index) => (
                    <div 
                      key={entrega.id}
                      style={{ 
                        padding: '16px',
                        background: 'rgba(5, 150, 105, 0.08)',
                        borderRadius: 8,
                        borderLeft: '4px solid #059669'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: 12
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#047857' }}>
                          Entrega #{itemHistoricoModal.historico_entregas!.length - index}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: '#059669' }}>
                          {formatarNumero(entrega.quantidade_entregue)} {itemHistoricoModal.unidade}
                          {entrega.quantidade_entregue !== itemHistoricoModal.quantidade && (
                            <span style={{ 
                              marginLeft: 8,
                              padding: '3px 8px',
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
                      </div>
                      
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 14, color: '#065f46', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>👤</span>
                          <div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Entregador</div>
                            <div style={{ fontWeight: 600 }}>{entrega.nome_quem_entregou}</div>
                          </div>
                        </div>
                        
                        <div style={{ fontSize: 14, color: '#065f46', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>👤</span>
                          <div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Recebedor</div>
                            <div style={{ fontWeight: 600 }}>{entrega.nome_quem_recebeu}</div>
                          </div>
                        </div>
                        
                        <div style={{ fontSize: 14, color: '#065f46', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>📅</span>
                          <div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Data e Hora</div>
                            <div style={{ fontWeight: 600 }}>
                              {new Date(entrega.data_entrega).toLocaleDateString('pt-BR')} às {new Date(entrega.data_entrega).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        
                        {entrega.observacao && (
                          <div style={{ 
                            marginTop: 4,
                            padding: '8px 12px',
                            background: '#f9fafb',
                            borderRadius: 6,
                            fontSize: 13,
                            color: '#6b7280',
                            fontStyle: 'italic'
                          }}>
                            💬 {entrega.observacao}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                  Nenhuma entrega registrada
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
