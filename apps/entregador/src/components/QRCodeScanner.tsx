import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRCodeScannerProps {
  onScan: (data: string) => void
  onClose: () => void
}

export default function QRCodeScanner({ onScan, onClose }: QRCodeScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [cameras, setCameras] = useState<any[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [manualInput, setManualInput] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

  useEffect(() => {
    // Verificar se está em contexto seguro
    const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    
    if (!isSecureContext) {
      setError('⚠️ Acesso à câmera requer HTTPS ou localhost. Use a opção de entrada manual abaixo.')
      setShowManualInput(true)
      return
    }

    // Listar câmeras disponíveis
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices)
        // Preferir câmera traseira
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back'))
        setSelectedCamera(backCamera?.id || devices[0].id)
      }
    }).catch(err => {
      console.error('Erro ao listar câmeras:', err)
      setError('Não foi possível acessar as câmeras. Use a entrada manual.')
      setShowManualInput(true)
    })

    return () => {
      stopScanning()
    }
  }, [])

  const startScanning = async () => {
    if (!selectedCamera) {
      setError('Nenhuma câmera selecionada')
      return
    }

    try {
      setScanning(true)
      setError(null)

      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          console.log('QR Code detectado:', decodedText)
          stopScanning()
          onScan(decodedText)
        },
        (errorMessage) => {
          // Ignorar erros de "não encontrado" durante o scan
        }
      )
    } catch (err: any) {
      console.error('Erro ao iniciar scanner:', err)
      setError(err.message || 'Erro ao iniciar câmera')
      setScanning(false)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      } catch (err) {
        console.error('Erro ao parar scanner:', err)
      }
    }
    setScanning(false)
  }

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      setError('Digite ou cole os dados do QR Code')
      return
    }
    onScan(manualInput.trim())
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 20,
        maxWidth: 500,
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>📷 Escanear QR Code</h2>
          <button
            onClick={() => {
              stopScanning()
              onClose()
            }}
            style={{
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            ✕ Fechar
          </button>
        </div>

        {error && (
          <div style={{
            padding: 12,
            background: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: 6,
            marginBottom: 16,
            color: '#c62828'
          }}>
            {error}
          </div>
        )}

        {showManualInput && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Entrada Manual:
            </label>
            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder='Cole aqui os dados do QR Code (JSON)'
              rows={4}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 13,
                fontFamily: 'monospace',
                marginBottom: 8
              }}
            />
            <button
              onClick={handleManualSubmit}
              style={{
                width: '100%',
                padding: 12,
                background: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              ✓ Aplicar Filtro
            </button>
            <div style={{
              marginTop: 12,
              padding: 10,
              background: '#e3f2fd',
              borderRadius: 6,
              fontSize: 12,
              color: '#1565c0'
            }}>
              <strong>Como usar:</strong><br/>
              1. No sistema principal, gere o QR Code<br/>
              2. Clique em "Copiar Dados"<br/>
              3. Cole aqui e clique em "Aplicar Filtro"
            </div>
          </div>
        )}

        {cameras.length > 1 && !scanning && !showManualInput && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Selecionar Câmera:
            </label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 14
              }}
            >
              {cameras.map(camera => (
                <option key={camera.id} value={camera.id}>
                  {camera.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          id="qr-reader"
          style={{
            width: '100%',
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: 16,
            display: showManualInput ? 'none' : 'block'
          }}
        />

        {!scanning && !showManualInput && (
          <button
            onClick={startScanning}
            disabled={!selectedCamera}
            style={{
              width: '100%',
              padding: 14,
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: selectedCamera ? 'pointer' : 'not-allowed',
              fontSize: 16,
              fontWeight: 600,
              opacity: selectedCamera ? 1 : 0.5
            }}
          >
            📷 Iniciar Scanner
          </button>
        )}

        {scanning && (
          <div style={{
            textAlign: 'center',
            padding: 16,
            background: '#e3f2fd',
            borderRadius: 6,
            color: '#1976d2',
            fontWeight: 600
          }}>
            🔍 Aponte a câmera para o QR Code...
          </div>
        )}

        {!showManualInput && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: '#f5f5f5',
            borderRadius: 6,
            fontSize: 12,
            color: '#666'
          }}>
            <strong>Dica:</strong> Mantenha o QR Code bem iluminado e centralizado na câmera.
          </div>
        )}

        {!showManualInput && (
          <button
            onClick={() => setShowManualInput(true)}
            style={{
              width: '100%',
              marginTop: 12,
              padding: 10,
              background: 'transparent',
              color: '#1976d2',
              border: '1px solid #1976d2',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            📝 Usar Entrada Manual
          </button>
        )}
      </div>
    </div>
  )
}
