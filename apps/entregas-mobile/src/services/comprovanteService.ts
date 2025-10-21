import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

interface DadosComprovante {
  escolaNome: string;
  itens: {
    produto_nome: string;
    quantidade_entregue: number;
    unidade: string;
  }[];
  nomeQuemRecebeu: string;
  nomeQuemEntregou: string;
  dataEntrega: string;
  fotoUri?: string;
}

class ComprovanteService {
  
  async gerarComprovantePDF(dados: DadosComprovante): Promise<string> {
    const html = this.gerarHTMLComprovante(dados);
    
    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      
      return uri;
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error('Erro ao gerar comprovante PDF');
    }
  }

  async compartilharComprovante(pdfUri: string): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        throw new Error('Compartilhamento não disponível neste dispositivo');
      }

      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar Comprovante de Entrega',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Erro ao compartilhar PDF:', error);
      throw new Error('Erro ao compartilhar comprovante');
    }
  }

  async salvarComprovante(pdfUri: string, nomeArquivo: string): Promise<string> {
    try {
      const downloadDir = FileSystem.documentDirectory + 'comprovantes/';
      
      // Criar diretório se não existir
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }

      const destino = downloadDir + nomeArquivo;
      await FileSystem.copyAsync({
        from: pdfUri,
        to: destino,
      });

      return destino;
    } catch (error) {
      console.error('Erro ao salvar PDF:', error);
      throw new Error('Erro ao salvar comprovante');
    }
  }

  private gerarHTMLComprovante(dados: DadosComprovante): string {
    const dataFormatada = new Date(dados.dataEntrega).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const itensHTML = dados.itens.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.produto_nome}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantidade_entregue}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.unidade}</td>
      </tr>
    `).join('');

    const fotoHTML = dados.fotoUri ? `
      <div style="margin-top: 30px; page-break-inside: avoid;">
        <h3 style="color: #1976d2; margin-bottom: 15px;">Foto Comprovante</h3>
        <img src="${dados.fotoUri}" style="max-width: 100%; max-height: 400px; border: 1px solid #e0e0e0; border-radius: 8px;" />
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Comprovante de Entrega</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              padding: 40px;
              color: #333;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #1976d2;
            }
            .header h1 {
              color: #1976d2;
              font-size: 28px;
              margin-bottom: 10px;
            }
            .header p {
              color: #666;
              font-size: 14px;
            }
            .info-section {
              margin-bottom: 30px;
              padding: 20px;
              background-color: #f8f9fa;
              border-radius: 8px;
              border-left: 4px solid #1976d2;
            }
            .info-section h2 {
              color: #1976d2;
              font-size: 18px;
              margin-bottom: 15px;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #555;
              min-width: 150px;
            }
            .info-value {
              color: #333;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              background-color: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            thead {
              background-color: #1976d2;
              color: white;
            }
            th {
              padding: 15px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e0e0e0;
            }
            tr:last-child td {
              border-bottom: none;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e0e0e0;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .assinatura {
              margin-top: 60px;
              display: flex;
              justify-content: space-around;
            }
            .assinatura-box {
              text-align: center;
              width: 40%;
            }
            .assinatura-linha {
              border-top: 2px solid #333;
              margin-bottom: 10px;
              padding-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚚 Comprovante de Entrega</h1>
            <p>Alimentação Escolar</p>
          </div>

          <div class="info-section">
            <h2>Informações da Entrega</h2>
            <div class="info-row">
              <span class="info-label">Escola:</span>
              <span class="info-value">${dados.escolaNome}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Data/Hora:</span>
              <span class="info-value">${dataFormatada}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Quem Entregou:</span>
              <span class="info-value">${dados.nomeQuemEntregou}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Quem Recebeu:</span>
              <span class="info-value">${dados.nomeQuemRecebeu}</span>
            </div>
          </div>

          <div class="info-section">
            <h2>Itens Entregues</h2>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th style="text-align: center;">Quantidade</th>
                  <th style="text-align: center;">Unidade</th>
                </tr>
              </thead>
              <tbody>
                ${itensHTML}
              </tbody>
            </table>
          </div>

          ${fotoHTML}

          <div class="assinatura">
            <div class="assinatura-box">
              <div class="assinatura-linha"></div>
              <p><strong>${dados.nomeQuemEntregou}</strong></p>
              <p style="font-size: 12px; color: #666;">Entregador</p>
            </div>
            <div class="assinatura-box">
              <div class="assinatura-linha"></div>
              <p><strong>${dados.nomeQuemRecebeu}</strong></p>
              <p style="font-size: 12px; color: #666;">Recebedor</p>
            </div>
          </div>

          <div class="footer">
            <p>Este documento foi gerado automaticamente pelo sistema de Gestão de Alimentação Escolar</p>
            <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </body>
      </html>
    `;
  }
}

export const comprovanteService = new ComprovanteService();
