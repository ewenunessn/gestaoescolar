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
  Stepper,
  Step,
  StepLabel,
  Card,
} from '@mui/material';
import {
  CloudUpload,
  Download,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Inventory,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { gerarModeloExcelProdutos, gerarModeloCSVProdutos } from '../utils/produtoImportUtils';

interface ImportacaoProdutosProps {
  open: boolean;
  onClose: () => void;
  onImport: (produtos: ProdutoImportacao[]) => Promise<void>;
}

export interface ProdutoImportacao {
  nome: string;
  unidade: string;
  descricao?: string;
  categoria?: string;
  tipo_processamento?: string;
  peso?: number;
  fator_correcao?: number;
  perecivel?: boolean;
  ativo: boolean;
  status: 'valido' | 'erro' | 'aviso';
  mensagem?: string;
}

type LinhaImportacaoProduto = Record<string, unknown>;

const ImportacaoProdutos: React.FC<ImportacaoProdutosProps> = ({
  open,
  onClose,
  onImport
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoImportacao[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = ['Upload do Arquivo', 'Validação dos Dados', 'Importação'];

  const resetState = () => {
    setActiveStep(0);
    setProdutos([]);
    setArquivo(null);
    setLoading(false);

  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const gerarModeloCSV = () => {
    gerarModeloCSVProdutos();
  };

  const gerarModeloExcel = () => {
    gerarModeloExcelProdutos();
  };

  const processarArquivo = async (file: File) => {
    setLoading(true);

    try {
      const dados = await lerArquivo(file);
      const produtosValidados = validarProdutos(dados);
      setProdutos(produtosValidados);
      setActiveStep(1);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar arquivo. Verifique o formato e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const lerArquivo = (file: File): Promise<LinhaImportacaoProduto[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let jsonData: LinhaImportacaoProduto[] = [];

          if (file.name.endsWith('.csv')) {
            // Processar CSV
            const text = data as string;
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

            jsonData = lines.slice(1).map(line => {
              // Processar CSV com aspas
              const values: string[] = [];
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

              const obj: LinhaImportacaoProduto = {};
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
            jsonData = XLSX.utils.sheet_to_json<LinhaImportacaoProduto>(worksheet);
          }

          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        const errorMessage = 'Erro ao ler arquivo';
        reject(new globalThis.Error(errorMessage));
      };

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  const validarProdutos = (dadosRaw: LinhaImportacaoProduto[]): ProdutoImportacao[] => {
    return dadosRaw.map((linha) => {
      // Normalizar tipo_processamento para lowercase
      let tipoProcessamento = String(linha.tipo_processamento || '');
      if (tipoProcessamento && typeof tipoProcessamento === 'string') {
        tipoProcessamento = tipoProcessamento.trim().toLowerCase();
      }
      
      const produto: ProdutoImportacao = {
        nome: String(linha.nome || ''),
        unidade: String(linha.unidade || 'UN'),
        descricao: String(linha.descricao || ''),
        categoria: String(linha.categoria || ''),
        tipo_processamento: tipoProcessamento,
        peso: linha.peso ? parseFloat(String(linha.peso)) : undefined,
        fator_correcao: linha.fator_correcao ? parseFloat(String(linha.fator_correcao)) : undefined,
        perecivel: linha.perecivel === 'true' || linha.perecivel === true || linha.perecivel === 1,
        ativo: linha.ativo === 'true' || linha.ativo === true || linha.ativo === 1,
        status: 'valido',
        mensagem: ''
      };

      const erros: string[] = [];
      const avisos: string[] = [];

      // Validar nome (obrigatório)
      if (!produto.nome || produto.nome.trim().length < 2) {
        erros.push('Nome do produto é obrigatório (mínimo 2 caracteres)');
      }

      // Validar unidade (obrigatório)
      if (!produto.unidade || produto.unidade.trim().length === 0) {
        erros.push('Unidade é obrigatória');
      }

      // Validar tipo de processamento (já normalizado para lowercase)
      if (produto.tipo_processamento && produto.tipo_processamento !== '' && !['in natura', 'minimamente processado', 'ingrediente culinário', 'processado', 'ultraprocessado'].includes(produto.tipo_processamento)) {
        erros.push('Tipo de processamento deve ser: in natura, minimamente processado, ingrediente culinário, processado ou ultraprocessado');
      }

      // Validar peso (opcional, mas se fornecido deve ser > 0)
      if (produto.peso !== undefined && (isNaN(produto.peso) || produto.peso <= 0)) {
        erros.push('Peso deve ser um número maior que zero');
      }

      // Validar fator_correcao (opcional, mas se fornecido deve ser > 0)
      if (produto.fator_correcao !== undefined && (isNaN(produto.fator_correcao) || produto.fator_correcao <= 0)) {
        erros.push('Fator de correção deve ser um número maior que zero');
      }

      // Definir status
      if (erros.length > 0) {
        produto.status = 'erro';
        produto.mensagem = erros.join('; ');
      } else if (avisos.length > 0) {
        produto.status = 'aviso';
        produto.mensagem = avisos.join('; ');
      } else {
        produto.status = 'valido';
        produto.mensagem = 'Dados válidos';
      }

      return produto;
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
    const produtosValidos = produtos.filter(produto => produto.status !== 'erro');

    if (produtosValidos.length === 0) {
      alert('Não há produtos válidos para importar');
      return;
    }

    setLoading(true);
    setActiveStep(2);

    try {
      await onImport(produtosValidos);
      handleClose();
    } catch (error) {
      console.error('Erro na importação:', error);
      alert('Erro ao importar produtos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const produtosValidos = produtos.filter(produto => produto.status !== 'erro').length;
  const produtosComErro = produtos.filter(produto => produto.status === 'erro').length;
  const produtosComAviso = produtos.filter(produto => produto.status === 'aviso').length;

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
        Importação em Lote - Produtos
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
              Faça o upload de um arquivo CSV ou Excel com os dados dos produtos para cadastro em massa.
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
                  <li><strong>nome</strong>: Nome do produto (obrigatório)</li>
                  <li><strong>unidade</strong>: Unidade de medida - UN, KG, L, etc (obrigatório)</li>
                  <li><strong>descricao</strong>: Descrição detalhada do produto (opcional)</li>
                  <li><strong>categoria</strong>: Categoria do produto (opcional)</li>
                  <li><strong>tipo_processamento</strong>: in natura, minimamente processado, ingrediente culinário, processado, ultraprocessado (opcional)</li>
                  <li><strong>perecivel</strong>: true ou false (padrão: false)</li>
                  <li><strong>ativo</strong>: true ou false (padrão: true)</li>
                </ul>
                <Typography variant="body2" sx={{ mt: 2, color: '#3b82f6', fontWeight: 600 }}>
                  💡 Dica: Unidades comuns são UN, KG, G, L, ML, DZ, PCT, CX, FD, SC
                </Typography>
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
                label={`${produtosValidos} válidos`}
                sx={{
                  bgcolor: '#dcfce7',
                  color: '#059669',
                  fontWeight: 600,
                }}
              />
              {produtosComAviso > 0 && (
                <Chip
                  icon={<Warning sx={{ fontSize: 16 }} />}
                  label={`${produtosComAviso} com avisos`}
                  sx={{
                    bgcolor: '#fef3c7',
                    color: '#d97706',
                    fontWeight: 600,
                  }}
                />
              )}
              {produtosComErro > 0 && (
                <Chip
                  icon={<ErrorIcon sx={{ fontSize: 16 }} />}
                  label={`${produtosComErro} com erros`}
                  sx={{
                    bgcolor: '#fee2e2',
                    color: '#dc2626',
                    fontWeight: 600,
                  }}
                />
              )}


            </Box>

            <Alert severity="success" sx={{ mb: 3 }}>
              <strong>Importação Inteligente:</strong><br />
              • Produtos com nomes iguais serão automaticamente atualizados<br />
              • Produtos com nomes novos serão inseridos<br />
              • Nunca haverá duplicação de produtos<br />
              • O sistema identifica produtos pelo nome
            </Alert>

            {produtosComErro > 0 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Existem {produtosComErro} produtos com erros que não serão importados.
                Corrija os erros ou remova os produtos para continuar.
              </Alert>
            )}

            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Unidade</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Tipo Processamento</TableCell>
                    <TableCell align="center">Perecível</TableCell>
                    <TableCell align="center">Ativo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {produtos.map((produto, index) => {
                    const hasError = produto.status === 'erro';
                    const hasWarning = produto.status === 'aviso';
                    return (
                      <TableRow 
                        key={index}
                        sx={{
                          bgcolor: hasError ? '#fee2e2' : hasWarning ? '#fef3c7' : 'transparent',
                          '&:hover': {
                            bgcolor: hasError ? '#fecaca' : hasWarning ? '#fde68a' : '#f9fafb',
                          }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {hasError && <ErrorIcon sx={{ fontSize: 16, color: '#dc2626' }} />}
                            {hasWarning && <Warning sx={{ fontSize: 16, color: '#d97706' }} />}
                            {!hasError && !hasWarning && <CheckCircle sx={{ fontSize: 16, color: '#059669' }} />}
                            <Typography sx={{ fontWeight: 600 }}>
                              {produto.nome}
                            </Typography>
                          </Box>
                          {produto.mensagem && (
                            <Typography sx={{ fontSize: '0.75rem', color: hasError ? '#dc2626' : '#d97706', mt: 0.5 }}>
                              {produto.mensagem}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={produto.unidade}
                            size="small"
                            sx={{
                              bgcolor: '#e0e7ff',
                              color: '#4f46e5',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.875rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {produto.descricao || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{produto.categoria || '-'}</TableCell>
                        <TableCell>
                          {produto.tipo_processamento ? (
                            <Chip
                              label={produto.tipo_processamento}
                              size="small"
                              sx={{
                                bgcolor: '#f3f4f6',
                                color: '#374151',
                                fontSize: '0.75rem',
                              }}
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {produto.perecivel ? 'Sim' : 'Não'}
                        </TableCell>
                        <TableCell align="center">
                          {produto.ativo ? 'Sim' : 'Não'}
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
            <Inventory sx={{ fontSize: 64, color: '#059669', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 1 }}>
              Importação Concluída!
            </Typography>
            <Typography sx={{ color: '#6b7280' }}>
              {produtosValidos} produtos foram importados com sucesso.
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

        {activeStep === 1 && produtosValidos > 0 && (
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
            Importar {produtosValidos} Produtos
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportacaoProdutos;
