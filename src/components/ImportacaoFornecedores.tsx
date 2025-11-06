import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  Card,
} from '@mui/material';
import {
  CloudUpload,
  Download,
  CheckCircle,
  Error,
  Warning,
  Delete,
  Business,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import {
  validarDocumento,
  formatarDocumento,
  detectarTipoDocumento
} from '../utils/validacaoDocumento';

interface ImportacaoFornecedoresProps {
  open: boolean;
  onClose: () => void;
  onImport: (fornecedores: FornecedorImportacao[]) => Promise<void>;
}

interface FornecedorImportacao {
  nome: string;
  cnpj: string;
  email?: string;
  ativo: boolean;
  status: 'valido' | 'erro' | 'aviso';
  mensagem?: string;
}

const ImportacaoFornecedores: React.FC<ImportacaoFornecedoresProps> = ({
  open,
  onClose,
  onImport
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<FornecedorImportacao[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = ['Upload do Arquivo', 'Validação dos Dados', 'Importação'];

  const resetState = () => {
    setActiveStep(0);
    setFornecedores([]);
    setArquivo(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const gerarModeloCSV = () => {
    const headers = [
      'nome',
      'cnpj',
      'email',
      'ativo'
    ];

    const exemplos = [
      [
        'Distribuidora Alimentos Ltda',
        '12.345.678/0001-90',
        'contato@distribuidora.com.br',
        'true'
      ],
      [
        'Frigorífico Central S.A.',
        '98.765.432/0001-10',
        'vendas@frigorifico.com.br',
        'true'
      ],
      [
        'Hortifruti Verde Vida',
        '11.222.333/0001-44',
        'comercial@verdevida.com.br',
        'true'
      ],
      [
        'Laticínios do Campo',
        '55.666.777/0001-88',
        'pedidos@laticinios.com.br',
        'true'
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...exemplos.map(linha => linha.map(campo => `"${campo}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_importacao_fornecedores.csv';
    link.click();
  };

  const gerarModeloExcel = () => {
    const headers = [
      'nome',
      'cnpj',
      'email',
      'ativo'
    ];

    const exemplos = [
      [
        'Distribuidora Alimentos Ltda',
        '12.345.678/0001-90',
        'contato@distribuidora.com.br',
        true
      ],
      [
        'Frigorífico Central S.A.',
        '98.765.432/0001-10',
        'vendas@frigorifico.com.br',
        true
      ],
      [
        'Hortifruti Verde Vida',
        '11.222.333/0001-44',
        'comercial@verdevida.com.br',
        true
      ],
      [
        'Laticínios do Campo',
        '55.666.777/0001-88',
        'pedidos@laticinios.com.br',
        true
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exemplos]);
    
    // Definir largura das colunas
    ws['!cols'] = [
      { wch: 30 }, // nome
      { wch: 18 }, // cnpj
      { wch: 25 }, // email
      { wch: 15 }, // telefone
      { wch: 30 }, // endereco
      { wch: 15 }, // cidade
      { wch: 8 },  // estado
      { wch: 12 }, // cep
    
      { wch: 35 }, // observacoes
      { wch: 8 }   // ativo
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fornecedores');
    XLSX.writeFile(wb, 'modelo_importacao_fornecedores.xlsx');
  };

  const processarArquivo = async (file: File) => {
    setLoading(true);
    
    try {
      const dados = await lerArquivo(file);
      const fornecedoresValidados = validarFornecedores(dados);
      setFornecedores(fornecedoresValidados);
      setActiveStep(1);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar arquivo. Verifique o formato e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const lerArquivo = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let jsonData: any[] = [];

          if (file.name.endsWith('.csv')) {
            // Processar CSV
            const text = data as string;
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            jsonData = lines.slice(1).map(line => {
              // Processar CSV com aspas
              const values = [];
              let current = '';
              let inQuotes = false;
              
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  values.push(current.trim());
                  current = '';
                } else {
                  current += char;
                }
              }
              values.push(current.trim());

              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = values[index] || '';
              });
              return obj;
            });
          } else {
            // Processar Excel
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            jsonData = XLSX.utils.sheet_to_json(worksheet);
          }

          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  const validarFornecedores = (dadosRaw: any[]): FornecedorImportacao[] => {
    return dadosRaw.map((linha, index) => {
      const fornecedor: FornecedorImportacao = {
        nome: linha.nome || '',
        cnpj: linha.cnpj || '',
        email: linha.email || '',
        telefone: linha.telefone || '',
        endereco: linha.endereco || '',
        cidade: linha.cidade || '',
        estado: linha.estado || '',
        cep: linha.cep || '',
    
        observacoes: linha.observacoes || '',
        ativo: linha.ativo === 'true' || linha.ativo === true || linha.ativo === 1,
        status: 'valido',
        mensagem: ''
      };

      const erros: string[] = [];
      const avisos: string[] = [];

      // Validar nome (obrigatório)
      if (!fornecedor.nome || fornecedor.nome.trim().length < 3) {
        erros.push('Nome é obrigatório (mínimo 3 caracteres)');
      }

      // Validar CPF/CNPJ (obrigatório)
      if (!fornecedor.cnpj) {
        erros.push('CPF/CNPJ é obrigatório');
      } else {
        const validacaoDocumento = validarDocumento(fornecedor.cnpj);
        if (!validacaoDocumento.valido) {
          erros.push(validacaoDocumento.mensagem);
        } else {
          // Formatar o documento se válido
          fornecedor.cnpj = formatarDocumento(fornecedor.cnpj);
        }
      }

      // Validar email (se fornecido)
      if (fornecedor.email && fornecedor.email.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fornecedor.email)) {
          avisos.push('Formato de email pode estar incorreto');
        }
      }

      // Validar CEP (se fornecido)
      if (fornecedor.cep && fornecedor.cep.length > 0) {
        const cepLimpo = fornecedor.cep.replace(/[^\d]/g, '');
        if (cepLimpo.length !== 8) {
          avisos.push('CEP deve ter 8 dígitos');
        }
      }

      // Definir status
      if (erros.length > 0) {
        fornecedor.status = 'erro';
        fornecedor.mensagem = erros.join('; ');
      } else if (avisos.length > 0) {
        fornecedor.status = 'aviso';
        fornecedor.mensagem = avisos.join('; ');
      } else {
        fornecedor.status = 'valido';
        fornecedor.mensagem = 'Dados válidos';
      }

      return fornecedor;
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setArquivo(file);
      processarArquivo(file);
    }
  };

  const handleImport = async () => {
    const fornecedoresValidos = fornecedores.filter(fornecedor => fornecedor.status !== 'erro');
    
    if (fornecedoresValidos.length === 0) {
      alert('Não há fornecedores válidos para importar');
      return;
    }

    setLoading(true);
    setActiveStep(2);

    try {
      await onImport(fornecedoresValidos);
      handleClose();
    } catch (error) {
      console.error('Erro na importação:', error);
      alert('Erro ao importar fornecedores. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const removerFornecedor = (index: number) => {
    setFornecedores(fornecedores.filter((_, i) => i !== index));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valido':
        return { color: '#059669', bg: '#dcfce7', icon: <CheckCircle sx={{ fontSize: 16 }} /> };
      case 'aviso':
        return { color: '#d97706', bg: '#fef3c7', icon: <Warning sx={{ fontSize: 16 }} /> };
      case 'erro':
        return { color: '#dc2626', bg: '#fee2e2', icon: <Error sx={{ fontSize: 16 }} /> };
      default:
        return { color: '#6b7280', bg: '#f3f4f6', icon: <CheckCircle sx={{ fontSize: 16 }} /> };
    }
  };

  const fornecedoresValidos = fornecedores.filter(fornecedor => fornecedor.status !== 'erro').length;
  const fornecedoresComErro = fornecedores.filter(fornecedor => fornecedor.status === 'erro').length;
  const fornecedoresComAviso = fornecedores.filter(fornecedor => fornecedor.status === 'aviso').length;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          minHeight: '70vh',
        }
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          color: '#1f2937',
          borderBottom: '1px solid #e5e7eb',
          pb: 2,
        }}
      >
        Importação em Lote - Fornecedores
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {loading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography sx={{ mt: 1, textAlign: 'center', color: '#6b7280' }}>
              Processando arquivo...
            </Typography>
          </Box>
        )}

        {/* Passo 1: Upload do Arquivo */}
        {activeStep === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Faça o upload de um arquivo CSV ou Excel com os dados dos fornecedores para cadastro em massa.
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                startIcon={<Download />}
                onClick={gerarModeloCSV}
                variant="outlined"
                sx={{ textTransform: 'none' }}
              >
                Baixar Modelo CSV
              </Button>
              <Button
                startIcon={<Download />}
                onClick={gerarModeloExcel}
                variant="outlined"
                sx={{ textTransform: 'none' }}
              >
                Baixar Modelo Excel
              </Button>
            </Box>

            <Card
              sx={{
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                p: 6,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: '#4f46e5',
                  bgcolor: '#f8fafc',
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUpload sx={{ fontSize: 64, color: '#9ca3af', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 1 }}>
                Clique para selecionar arquivo
              </Typography>
              <Typography sx={{ color: '#6b7280' }}>
                Formatos aceitos: CSV, Excel (.xlsx, .xls)
              </Typography>
              {arquivo && (
                <Typography sx={{ color: '#4f46e5', mt: 2, fontWeight: 600 }}>
                  Arquivo selecionado: {arquivo.name}
                </Typography>
              )}
            </Card>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Formato do Arquivo:
              </Typography>
              <Typography component="div" sx={{ color: '#6b7280' }}>
                O arquivo deve conter as seguintes colunas:
                <ul>
                  <li><strong>nome</strong>: Nome do fornecedor (obrigatório)</li>
                  <li><strong>cnpj</strong>: CNPJ do fornecedor (obrigatório)</li>
                  <li><strong>email</strong>: Email de contato (opcional)</li>
                  <li><strong>ativo</strong>: true ou false (padrão: true)</li>
                </ul>
              </Typography>
            </Box>
          </Box>
        )}

        {/* Passo 2: Validação dos Dados */}
        {activeStep === 1 && (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
              <Chip
                icon={<CheckCircle sx={{ fontSize: 16 }} />}
                label={`${fornecedoresValidos} válidos`}
                sx={{
                  bgcolor: '#dcfce7',
                  color: '#059669',
                  fontWeight: 600,
                }}
              />
              {fornecedoresComAviso > 0 && (
                <Chip
                  icon={<Warning sx={{ fontSize: 16 }} />}
                  label={`${fornecedoresComAviso} com avisos`}
                  sx={{
                    bgcolor: '#fef3c7',
                    color: '#d97706',
                    fontWeight: 600,
                  }}
                />
              )}
              {fornecedoresComErro > 0 && (
                <Chip
                  icon={<Error sx={{ fontSize: 16 }} />}
                  label={`${fornecedoresComErro} com erros`}
                  sx={{
                    bgcolor: '#fee2e2',
                    color: '#dc2626',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>

            <Alert severity="success" sx={{ mb: 3 }}>
              <strong>Importação Inteligente:</strong><br/>
              • Fornecedores com CNPJs iguais serão automaticamente atualizados<br/>
              • Fornecedores com CNPJs novos serão inseridos<br/>
              • Nunca haverá duplicação de fornecedores<br/>
              • O sistema identifica fornecedores pelo CNPJ
            </Alert>

            {fornecedoresComErro > 0 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Existem {fornecedoresComErro} fornecedores com erros que não serão importados. 
                Corrija os erros ou remova os fornecedores para continuar.
              </Alert>
            )}

            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Nome</TableCell>
                    <TableCell>CPF/CNPJ</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="center">Ativo</TableCell>
                    <TableCell>Mensagem</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fornecedores.map((fornecedor, index) => {
                    const statusConfig = getStatusColor(fornecedor.status);
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip
                            icon={statusConfig.icon}
                            label={fornecedor.status}
                            size="small"
                            sx={{
                              bgcolor: statusConfig.bg,
                              color: statusConfig.color,
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>
                            {fornecedor.nome}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {fornecedor.cnpj ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {fornecedor.cnpj}
                              </Typography>
                              <Chip 
                                label={detectarTipoDocumento(fornecedor.cnpj)} 
                                size="small" 
                                color={detectarTipoDocumento(fornecedor.cnpj) === 'CPF' ? 'primary' : 'secondary'}
                                sx={{ fontSize: '0.7rem', height: '18px', mt: 0.5 }}
                              />
                            </Box>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{fornecedor.email || '-'}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={fornecedor.ativo ? 'Sim' : 'Não'}
                            size="small"
                            sx={{
                              bgcolor: fornecedor.ativo ? '#dcfce7' : '#fee2e2',
                              color: fornecedor.ativo ? '#059669' : '#dc2626',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              color: fornecedor.status === 'erro' ? '#dc2626' : '#6b7280',
                              fontSize: '0.875rem',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {fornecedor.mensagem}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Remover fornecedor">
                            <IconButton
                              onClick={() => removerFornecedor(index)}
                              sx={{
                                bgcolor: '#fee2e2',
                                color: '#dc2626',
                                '&:hover': { bgcolor: '#fecaca' },
                              }}
                            >
                              <Delete sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Passo 3: Importação */}
        {activeStep === 2 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Business sx={{ fontSize: 64, color: '#059669', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 1 }}>
              Importação Concluída!
            </Typography>
            <Typography sx={{ color: '#6b7280' }}>
              {fornecedoresValidos} fornecedores foram importados com sucesso.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid #e5e7eb' }}>
        <Button
          onClick={handleClose}
          sx={{
            color: '#6b7280',
            textTransform: 'none',
          }}
        >
          {activeStep === 2 ? 'Fechar' : 'Cancelar'}
        </Button>

        {activeStep === 0 && arquivo && (
          <Button
            onClick={() => processarArquivo(arquivo)}
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: '#4f46e5',
              textTransform: 'none',
              '&:hover': { bgcolor: '#4338ca' },
            }}
          >
            Processar Arquivo
          </Button>
        )}

        {activeStep === 1 && fornecedoresValidos > 0 && (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: '#059669',
              textTransform: 'none',
              '&:hover': { bgcolor: '#047857' },
            }}
          >
            Importar {fornecedoresValidos} Fornecedores
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportacaoFornecedores;