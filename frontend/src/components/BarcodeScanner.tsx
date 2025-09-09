import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  IconButton,
  Paper
} from '@mui/material';
import { QrCodeScanner, Close, CameraAlt } from '@mui/icons-material';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  open,
  onClose,
  onScan,
  title = "Escanear Código"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Câmera traseira
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      // Iniciar detecção de código
      startBarcodeDetection();

    } catch (err: any) {
      console.error('Erro ao acessar câmera:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const startBarcodeDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const detectBarcode = () => {
      if (!isScanning || !video.videoWidth || !video.videoHeight) {
        if (isScanning) {
          requestAnimationFrame(detectBarcode);
        }
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Aqui você pode integrar com uma biblioteca de detecção de código de barras
        // Como ZXing, QuaggaJS, ou usar a API nativa BarcodeDetector se disponível
        
        // Exemplo com BarcodeDetector (experimental)
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code']
          });

          barcodeDetector.detect(canvas)
            .then((barcodes: any[]) => {
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                console.log('Código detectado:', code);
                onScan(code);
                handleClose();
                return;
              }
            })
            .catch((err: any) => {
              console.error('Erro na detecção:', err);
            });
        }
      }

      if (isScanning) {
        requestAnimationFrame(detectBarcode);
      }
    };

    video.addEventListener('loadedmetadata', () => {
      detectBarcode();
    });
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleManualInput = () => {
    const code = prompt('Digite o código manualmente:');
    if (code && code.trim()) {
      onScan(code.trim());
      handleClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'black' }
      }}
    >
      <DialogTitle sx={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center">
          <QrCodeScanner sx={{ mr: 1 }} />
          {title}
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
        {error ? (
          <Box p={3}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Typography variant="body2" color="white" textAlign="center">
              Você pode digitar o código manualmente se a câmera não estiver funcionando.
            </Typography>
          </Box>
        ) : (
          <Box position="relative">
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '400px',
                objectFit: 'cover'
              }}
              playsInline
              muted
            />
            
            {/* Overlay de mira */}
            <Box
              position="absolute"
              top="50%"
              left="50%"
              sx={{
                transform: 'translate(-50%, -50%)',
                width: '80%',
                height: '60%',
                border: '2px solid #00ff00',
                borderRadius: 2,
                pointerEvents: 'none'
              }}
            />

            {/* Canvas oculto para processamento */}
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />

            {isScanning && (
              <Box
                position="absolute"
                bottom={16}
                left="50%"
                sx={{ transform: 'translateX(-50%)' }}
              >
                <Paper sx={{ px: 2, py: 1, bgcolor: 'rgba(0,0,0,0.7)' }}>
                  <Typography variant="body2" color="white" textAlign="center">
                    Posicione o código dentro da área verde
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ bgcolor: 'black', color: 'white' }}>
        <Button onClick={handleManualInput} color="inherit" startIcon={<CameraAlt />}>
          Digitar Código
        </Button>
        <Button onClick={handleClose} color="inherit">
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};