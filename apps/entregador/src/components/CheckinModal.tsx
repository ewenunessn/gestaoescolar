import { useRef, useState } from 'react'
import SignaturePad from './SignaturePad'

export default function CheckinModal({
  open,
  onClose,
  onConfirm
}: {
  open: boolean
  onClose: () => void
  onConfirm: (data: { observacao?: string; fotoBase64?: string; assinadoPor?: string }) => void
}) {
  const [observacao, setObservacao] = useState('')
  const [assinadoPor, setAssinadoPor] = useState('')
  const [fotoBase64, setFotoBase64] = useState<string | undefined>(undefined)
  const [assinaturaBase64, setAssinaturaBase64] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setFotoBase64(reader.result as string)
    reader.readAsDataURL(f)
  }

  function confirm() {
    const foto = fotoBase64 || assinaturaBase64 || undefined
    onConfirm({ observacao: observacao || undefined, fotoBase64: foto, assinadoPor: assinadoPor || undefined })
  }

  if (!open) return null
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:9999
    }}>
      <div className="card" style={{ width:'100%', maxWidth:520 }}>
        <h3 style={{ marginTop:0 }}>Check-in da Escola</h3>
        <div style={{ display:'grid', gap:10 }}>
          <label>
            Observação
            <textarea className="input" rows={3} value={observacao} onChange={e => setObservacao(e.target.value)} />
          </label>
          <div>
            <div className="muted" style={{ marginBottom:6 }}>Foto (opcional)</div>
            <input ref={fileRef} className="input" type="file" accept="image/*" onChange={onFile} />
          </div>
          <div>
            <div className="muted" style={{ marginBottom:6 }}>Assinatura (opcional)</div>
            <SignaturePad onChange={setAssinaturaBase64} />
          </div>
          <label>
            Assinado por (opcional)
            <input className="input" value={assinadoPor} onChange={e => setAssinadoPor(e.target.value)} />
          </label>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn" type="button" onClick={onClose}>Cancelar</button>
            <button className="btn" type="button" onClick={confirm}>Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
