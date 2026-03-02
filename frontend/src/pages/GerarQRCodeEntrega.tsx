import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  SelectChangeEvent
} from '@mui/material';
import { QrCode2 as QrCodeIcon, Download as DownloadIcon } from '@mui/icons-material';
import PageHeader from '../components/PageHeader';
import QRCode from 'qrcode';
import api from '../services/api';

interface QRCodeData {
  rotaIds: number[];
  rotaNomes: string[];
  dataInicio: string;
  dataFim: string;
  geradoEm: string;
  geradoPor?: string;
}

interface Rota {
  id: number;
  nome: string;
  descricao?: string;
  cor: string;
  ativo: boolean;
}

const GerarQRCodeEntrega: React.FC = () => {
  const [rotaIds, setRotaIds] = useState<number[]>([]);
  const [dataInicio, setDataInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState<string>(new Date().toISOString().split('T')[0]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    carregarRotas();
  }, []);

  const carregarRotas = async () => {
    try {
      const response = await api.get('/entregas/rotas');
      setRotas(response.data);
    } catch (error) {
      console.error('Erro ao carregar rotas:', error);
    }
  };

  const gerarQRCode = async () => {
    if (rotaIds.length === 0 || !dataInicio || !dataFim) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const rotasSelecionadas = rotas.filter(r => rotaIds.includes(r.id));
    if (rotasSelecionadas.length === 0) return;

    setLoading(true);

    try {
      // Obter nome do usuário logado
      const token = localStorage.getItem('token');
      let geradoPor = 'Sistema';
      if (token) {
        try {
          const parsed = JSON.parse(token);
          geradoPor = parsed.nome || 'Sistema';
        } catch (e) {
          console.warn('Erro ao obter nome do usuário:', e);
        }
      }

      const data: QRCodeData = {
        rotaIds: rotaIds,
        rotaNomes: rotasSelecionadas.map(r => r.nome),
        dataInicio,
        dataFim,
        geradoEm: new Date().toISOString(),
        geradoPor
      };

      // Codificar dados em JSON
      const jsonData = JSON.stringify(data);
      
      // Gerar QR Code usando a biblioteca
      const qrUrl = await QRCode.toDataURL(jsonData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrUrl);
      setQrData(data);
      setOpenDialog(true);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      alert('Erro ao gerar QR Code');
    } finally {
      setLoading(false);
    }
  };

  const baixarQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-rotas-${rotaIds.join('-')}-${dataInicio}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copiarDados = () => {
    if (!qrData) return;
    
    const texto = `Rotas: ${qrData.rotaNomes.join(', ')}\nData Início: ${new Date(qrData.dataInicio).toLocaleDateString('pt-BR')}\nData Fim: ${new Date(qrData.dataFim).toLocaleDateString('pt-BR')}`;
    navigator.clipboard.writeText(texto);
    alert('Dados copiados para a área de transferência!');
  };

  const imprimirQRCode = () => {
    if (!qrCodeUrl || !qrData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${qrData.rotaNomes.join(', ')}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 40px;
            }
            h1 {
              color: #1976d2;
              margin-bottom: 10px;
            }
            .info {
              margin: 20px 0;
              text-align: center;
            }
            .info p {
              margin: 5px 0;
            }
            img {
              border: 2px solid #1976d2;
              padding: 20px;
              background: white;
            }
            .instructions {
              margin-top: 30px;
              padding: 20px;
              background: #f5f5f5;
              border-radius: 8px;
              max-width: 500px;
            }
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <h1>QR Code para Entrega</h1>
          <div class="info">
            <p><strong>Rotas:</strong> ${qrData.rotaNomes.join(', ')}</p>
            <p><strong>Período:</strong> ${new Date(qrData.dataInicio).toLocaleDateString('pt-BR')} até ${new Date(qrData.dataFim).toLocaleDateString('pt-BR')}</p>
            <p><strong>Gerado em:</strong> ${new Date(qrData.geradoEm).toLocaleString('pt-BR')}</p>
            ${qrData.geradoPor ? `<p><strong>Gerado por:</strong> ${qrData.geradoPor}</p>` : ''}
          </div>
          <img src="${qrCodeUrl}" alt="QR Code" />
          <div class="instructions">
            <h3>Instruções para o entregador:</h3>
            <ol>
              <li>Abra o app Entregador</li>
              <li>Faça login</li>
              <li>Clique no botão "Escanear QR Code" 📷</li>
              <li>Aponte a câmera para este código</li>
              <li>As entregas serão filtradas automaticamente</li>
            </ol>
          </div>
          <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px; cursor: pointer;">
            Imprimir
          </button>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Box>
      <PageHeader 
        title="Gerar QR Code para Entrega" 
        subtitle="Configure a rota e período para o entregador"
        totalCount={0}
      />

      <Card sx={{ maxWidth: 600, mx: 'auto', mt: 3 }}>
        <CardContent>
          <Box display="flex" flexDirection="column" gap={3}>
            <Typography variant="body2" color="text.secondary">
              Gere um QR Code com as informações de rota e período de entrega. 
              O entregador irá escanear este código no app para visualizar apenas 
              os itens programados para aquela rota e período.
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Rotas *</InputLabel>
              <Select
                multiple
                value={rotaIds}
                onChange={(e: SelectChangeEvent<number[]>) => {
                  const value = e.target.value;
                  setRotaIds(typeof value === 'string' ? [] : value as number[]);
                }}
                label="Rotas *"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[]).map((id) => {
                      const rota = rotas.find(r => r.id === id);
                      return rota ? (
                        <Chip key={id} label={rota.nome} size="small" />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {rotas.map(rota => (
                  <MenuItem key={rota.id} value={rota.id}>
                    {rota.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Data Início *"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              helperText="Data inicial das entregas programadas"
            />

            <TextField
              label="Data Fim *"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              helperText="Data final das entregas programadas"
            />

            <Box 
              sx={{ 
                p: 2, 
                bgcolor: '#e3f2fd', 
                borderRadius: 1,
                border: '1px solid #90caf9'
              }}
            >
              <Typography variant="caption" sx={{ display: 'block', color: '#1565c0', fontWeight: 600, mb: 1 }}>
                ℹ️ Como funciona:
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: '#1976d2' }}>
                1. Configure a rota e o período de entrega<br/>
                2. Gere o QR Code<br/>
                3. O entregador escaneia o código no app<br/>
                4. O app mostra apenas os itens daquela rota e período
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={<QrCodeIcon />}
              onClick={gerarQRCode}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Gerando...' : 'Gerar QR Code'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Dialog com QR Code */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <QrCodeIcon color="primary" />
            <span>QR Code Gerado</span>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
            {qrCodeUrl && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'white',
                  borderRadius: 2,
                  boxShadow: 3
                }}
              >
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  style={{ 
                    width: '100%', 
                    maxWidth: 400,
                    display: 'block'
                  }} 
                />
              </Box>
            )}

            {qrData && (
              <Box 
                sx={{ 
                  width: '100%',
                  p: 2, 
                  bgcolor: '#f5f5f5', 
                  borderRadius: 1 
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Informações do QR Code:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Rotas:</strong> {qrData.rotaNomes.join(', ')}<br/>
                  <strong>Período:</strong> {new Date(qrData.dataInicio).toLocaleDateString('pt-BR')} até {new Date(qrData.dataFim).toLocaleDateString('pt-BR')}<br/>
                  <strong>Gerado em:</strong> {new Date(qrData.geradoEm).toLocaleString('pt-BR')}<br/>
                  {qrData.geradoPor && <><strong>Gerado por:</strong> {qrData.geradoPor}</>}
                </Typography>
              </Box>
            )}

            <Box 
              sx={{ 
                width: '100%',
                p: 2, 
                bgcolor: '#fff3e0', 
                borderRadius: 1,
                border: '1px solid #ffb74d'
              }}
            >
              <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 600 }}>
                📱 Instruções para o entregador:
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: '#e65100', mt: 1 }}>
                1. Abra o app Entregador<br/>
                2. Faça login<br/>
                3. Clique no botão "Escanear QR Code" 📷<br/>
                4. Aponte a câmera para este código<br/>
                5. As entregas serão filtradas automaticamente
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={copiarDados}>
            Copiar Dados
          </Button>
          <Button 
            onClick={imprimirQRCode}
            variant="outlined"
          >
            Imprimir
          </Button>
          <Button 
            onClick={baixarQRCode}
            startIcon={<DownloadIcon />}
            variant="outlined"
          >
            Baixar
          </Button>
          <Button 
            onClick={() => setOpenDialog(false)}
            variant="contained"
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GerarQRCodeEntrega;
