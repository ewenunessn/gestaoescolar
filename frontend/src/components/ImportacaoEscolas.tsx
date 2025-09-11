import React, { useState, useRef, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Alert, LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, IconButton, Tooltip, Stepper, Step, StepLabel, Card,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload, Download, CheckCircle, Error, Warning, Delete, School,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

// Interfaces
interface ImportacaoEscolasProps {
  open: boolean;
  onClose: () => void;
  onImport: (escolas: any[]) => Promise<void>;
}

interface EscolaValidada {
  nome: string;
  endereco?: string;
  municipio?: string;
  telefone?: string;
  nome_gestor?: string;
  administracao?: 'municipal' | 'estadual' | 'federal' | 'particular';
  codigo_acesso?: string;
  ativo: boolean;
  status: 'valido' | 'erro' | 'aviso';
}

// Componente Principal
const ImportacaoEscolas: React.FC<ImportacaoEscolasProps> = ({ open, onClose, onImport }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [escolas, setEscolas] = useState<EscolaValidada[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = ['Upload do Arquivo', 'Validação dos Dados', 'Importação'];

  const resetState = () => {
    setActiveStep(0);
    setEscolas([]);
    setArquivo(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const gerarModeloExcel = () => {
    const headers = [ 'Nome', 'Endereço', 'Município', 'Telefone', 'Email', 'Gestor', 'Administração', 'Código de Acesso', 'Ativo', 'Modalidades' ];
    const exemplos = [
        ['Escola Exemplo 1', 'Rua das Flores, 123', 'São Paulo', '(11) 99999-9999', 'escola1@email.com', 'Maria Santos', 'Municipal', 'ESC001', 'Sim', 'Ensino Fundamental, EJA'],
        ['Escola Exemplo 2', 'Avenida Principal, 456', 'Rio de Janeiro', '(21) 88888-8888', 'escola2@email.com', 'João Oliveira', 'Estadual', 'ESC002', 'Sim', 'Ensino Médio'],
      ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exemplos]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 10, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_importacao_escolas.xlsx');
  };

  const lerArquivo = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsBinaryString(file);
    });
  };

  const validarEscolas = (dados: any[]): EscolaValidada[] => {
    return dados.map(linha => {
      // Mapeamento flexível de headers
      const nome = linha.nome || linha['Nome'] || linha['Nome da Escola'] || '';
      const ativoRaw = linha.ativo || linha['Ativo'] || linha['Status'] || '';
      
      const escola: EscolaValidada = {
        nome: String(nome || '').trim(),
        endereco: String(linha.endereco || linha['Endereço'] || '').trim(),
        municipio: String(linha.municipio || linha['Município'] || '').trim(),
        telefone: String(linha.telefone || linha['Telefone'] || '').trim(),
        nome_gestor: String(linha.nome_gestor || linha['Gestor'] || linha['Nome do Gestor'] || '').trim(),
        administracao: String(linha.administracao || linha['Administração'] || '').toLowerCase().trim() as any,
        codigo_acesso: String(linha.codigo_acesso || linha['Código de Acesso'] || '').trim(),
        ativo: String(ativoRaw).toLowerCase() === 'sim' || String(ativoRaw).toLowerCase() === 'ativa' || String(ativoRaw).toLowerCase() === 'true' || ativoRaw === true,
        status: 'valido',
      };

      if (!escola.nome || escola.nome.trim().length < 3) {
        escola.status = 'erro';
      }

      if (escola.administracao && !['municipal', 'estadual', 'federal', 'particular'].includes(escola.administracao)) {
        escola.status = 'erro';
      }

      if (escola.codigo_acesso && escola.codigo_acesso.length > 20) {
        escola.status = 'erro';
      }
      return escola;
    });
  };

  const processarArquivo = async (file: File) => {
    setLoading(true);
    try {
      const dados = await lerArquivo(file);
      const escolasValidadas = validarEscolas(dados);
      setEscolas(escolasValidadas);
      setActiveStep(1);
    } catch (error) {
      alert('Erro ao processar arquivo. Verifique se o formato está correto.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setArquivo(file);
      processarArquivo(file);
    }
  };

  const handleImport = async () => {
    const escolasParaImportar = escolas.filter(e => e.status !== 'erro');
    if (escolasParaImportar.length === 0) {
      alert('Não há escolas válidas para importar.');
      return;
    }
    setLoading(true);
    setActiveStep(2);
    try {
      await onImport(escolasParaImportar);
      // O fechamento e a mensagem de sucesso são agora controlados pela página pai (EscolasPage)
    } catch (error) {
      alert('Ocorreu um erro na etapa final da importação.');
      setActiveStep(1); // Volta para a validação em caso de erro
    } finally {
      setLoading(false);
    }
  };
  
  const removerEscola = (index: number) => {
    setEscolas(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusProps = (status: 'valido' | 'erro' | 'aviso') => {
    switch (status) {
      case 'valido': return { color: '#059669', bgcolor: '#dcfce7', icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Válida' };
      case 'erro': return { color: '#dc2626', bgcolor: '#fee2e2', icon: <Error sx={{ fontSize: 16 }} />, label: 'Erro' };
      case 'aviso': return { color: '#d97706', bgcolor: '#fef3c7', icon: <Warning sx={{ fontSize: 16 }} />, label: 'Aviso' };
    }
  };
  
  const { validasCount, errosCount } = useMemo(() => ({
    validasCount: escolas.filter(e => e.status !== 'erro').length,
    errosCount: escolas.filter(e => e.status === 'erro').length,
  }), [escolas]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth PaperProps={{ sx: { borderRadius: '12px', height: '90vh' } }}>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>
        Importação em Lote - Escolas
      </DialogTitle>
      <DialogContent sx={{ p: 3, bgcolor: '#f9fafb' }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {activeStep === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Faça o upload de um arquivo Excel (.xlsx) com os dados das escolas. Use nosso modelo para garantir a formatação correta.
            </Alert>
            <Button startIcon={<Download />} onClick={gerarModeloExcel} variant="outlined">
              Baixar Modelo Excel
            </Button>
            <Card sx={{ border: '2px dashed #d1d5db', borderRadius: '12px', p: 6, textAlign: 'center', cursor: 'pointer', mt: 3, '&:hover': { borderColor: 'primary.main', bgcolor: '#f8fafc' } }} onClick={() => fileInputRef.current?.click()}>
              <CloudUpload sx={{ fontSize: 64, color: '#9ca3af', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Clique para selecionar o arquivo</Typography>
              <Typography color="text.secondary">Formato aceito: .xlsx</Typography>
              {arquivo && <Typography color="primary" sx={{ mt: 2, fontWeight: 600 }}>Arquivo: {arquivo.name}</Typography>}
            </Card>
            <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileSelect} style={{ display: 'none' }} />
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Chip icon={<CheckCircle />} label={`${validasCount} válidas`} sx={{ bgcolor: '#dcfce7', color: '#059669', fontWeight: 600 }} />
              <Chip icon={<Error />} label={`${errosCount} com erros`} sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 600 }} />
              <Box sx={{ flexGrow: 1 }} />
              <Alert severity="info" icon={false} sx={{ p: 1, py: 0.5 }}><strong>Modo Inteligente:</strong> Escolas existentes serão atualizadas e novas serão inseridas.</Alert>
            </Box>

            {errosCount > 0 && <Alert severity="warning" sx={{ mb: 2 }}>Existem {errosCount} escolas com erros que não serão importadas. Verifique: nome (mín. 3 caracteres), administração (municipal/estadual/federal/particular) e código de acesso (máx. 20 caracteres). Corrija na planilha e reenvie.</Alert>}
            
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>Importação Inteligente:</strong><br/>
              • Escolas com nomes iguais serão automaticamente atualizadas.<br/>
              • Escolas com nomes novos serão inseridas.<br/>
              • O sistema identifica escolas pelo nome para evitar duplicação.
            </Alert>

            <TableContainer component={Paper} sx={{ maxHeight: 'calc(90vh - 400px)' }}>
              <Table stickyHeader>
                <TableHead><TableRow>
                  <TableCell>Status</TableCell><TableCell>Nome</TableCell><TableCell>Endereço</TableCell>
                  <TableCell>Município</TableCell><TableCell>Telefone</TableCell><TableCell>Gestor</TableCell>
                  <TableCell>Administração</TableCell><TableCell>Código de Acesso</TableCell><TableCell>Ativo</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {escolas.map((escola, index) => {
                    const status = getStatusProps(escola.status);
                    return (
                      <TableRow key={index} sx={{ bgcolor: escola.status === 'erro' ? '#fff5f5' : 'inherit' }}>
                        <TableCell><Chip icon={status.icon} label={status.label} size="small" sx={{ bgcolor: status.bgcolor, color: status.color, fontWeight: 600 }} /></TableCell>
                        <TableCell>{escola.nome || '-'}</TableCell>
                        <TableCell>{escola.endereco || '-'}</TableCell>
                        <TableCell>{escola.municipio || '-'}</TableCell>
                        <TableCell>{escola.telefone || '-'}</TableCell>
                        <TableCell>{escola.nome_gestor || '-'}</TableCell>
                        <TableCell>{escola.administracao || '-'}</TableCell>
                        <TableCell>{escola.codigo_acesso || '-'}</TableCell>
                        <TableCell sx={{ color: escola.ativo ? 'success.main' : 'error.main' }}>{escola.ativo ? 'Sim' : 'Não'}</TableCell>

                        <TableCell align="center">
                          <Tooltip title="Remover da importação"><IconButton size="small" onClick={() => removerEscola(index)} color="error"><Delete /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Processando Importação...</Typography>
            <Typography color="text.secondary">Isso pode levar alguns instantes. Por favor, aguarde.</Typography>
          </Box>
        )}

      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
        <Button onClick={handleClose}>Cancelar</Button>
        {activeStep === 1 && (
          <Button variant="contained" onClick={handleImport} disabled={validasCount === 0 || loading} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
            Importar {validasCount} Escolas Válidas
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportacaoEscolas;