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
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  CloudUpload,
  Download,
  CheckCircle,
  Error,
  Warning,
  Delete,
  Inventory,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface ImportacaoProdutosProps {
  open: boolean;
  onClose: () => void;
  onImport: (produtos: ProdutoImportacao[]) => Promise<void>;
}

interface ProdutoImportacao {
  nome: string;
  descricao?: string;
  categoria?: string;
  tipo_processamento?: string;
  perecivel?: boolean;
  ativo: boolean;
  status: 'valido' | 'erro' | 'aviso';
  mensagem?: string;
}

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
    const headers = [
      'nome',
      'descricao',
      'categoria',
      'tipo_processamento',
      'perecivel',
      'ativo'
    ];

    const exemplos = [
      [
        'Arroz Branco Tipo 1',
        'Arroz branco polido, tipo 1, classe longo fino',
        'Cereais',
        'processado',
        'false',
        'true'
      ],
      [
        'Feijão Carioca',
        'Feijão carioca tipo 1, classe cores',
        'Leguminosas',
        'in natura',
        'false',
        'true'
      ],
      [
        'Banana Prata',
        'Banana prata fresca, primeira qualidade',
        'Frutas',
        'in natura',
        'true',
        'true'
      ],
      [
        'Carne Bovina Moída',
        'Carne bovina moída, primeira qualidade',
        'Carnes',
        'in natura',
        'true',
        'true'
      ],
      [
        'Óleo de Soja',
        'Óleo de soja refinado',
        'Óleos',
        'processado',
        'false',
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
    link.download = 'modelo_importacao_produtos.csv';
    link.click();
  };

  const gerarModeloExcel = () => {
    const headers = [
      'nome',
      'descricao',
      'categoria',
      'tipo_processamento',
      'perecivel',
      'ativo'
    ];

    const exemplos = [
      [
        'Arroz Branco Tipo 1',
        'Arroz branco polido, tipo 1, classe longo fino',
        'Cereais',
        'processado',
        false,
        true
      ],
      [
        'Feijão Carioca',
        'Feijão carioca tipo 1, classe cores',
        'Leguminosas',
        'in natura',
        false,
        true
      ],
      [
        'Banana Prata',
        'Banana prata fresca, primeira qualidade',
        'Frutas',
        'in natura',
        true,
        true
      ],
      [
        'Carne Bovina Moída',
        'Carne bovina moída, primeira qualidade',
        'Carnes',
        'in natura',
        true,
        true
      ],
      [
        'Óleo de Soja',
        'Óleo de soja refinado',
        'Óleos',
        'processado',
        false,
        true
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exemplos]);

    // Definir largura das colunas
    ws['!cols'] = [
      { wch: 25 }, // nome
      { wch: 35 }, // descricao
      { wch: 15 }, // categoria
      { wch: 25 }, // tipo_processamento (aumentado)
      { wch: 10 }, // perecivel
      { wch: 8 }   // ativo
    ];

    // Adicionar validação de dados
    if (!ws['!dataValidation']) ws['!dataValidation'] = [];
    
    // Validação para tipo_processamento (coluna D, linhas 2 a 100)
    ws['!dataValidation'].push({
      type: 'list',
      allowBlank: true,
      sqref: 'D2:D100',
      formulas: ['"in natura,minimamente processado,processado,ultraprocessado"'],
      promptTitle: 'Tipo de Processamento',
      prompt: 'Selecione uma das opções',
      errorTitle: 'Valor Inválido',
      error: 'Escolha: in natura, minimamente processado, processado ou ultraprocessado'
    });

    // Validação para perecivel (coluna E, linhas 2 a 100)
    ws['!dataValidation'].push({
      type: 'list',
      allowBlank: false,
      sqref: 'E2:E100',
      formulas: ['"true,false"'],
      promptTitle: 'Perecível',
      prompt: 'Selecione true ou false',
      errorTitle: 'Valor Inválido',
      error: 'Escolha: true ou false'
    });

    // Validação para ativo (coluna F, linhas 2 a 100)
    ws['!dataValidation'].push({
      type: 'list',
      allowBlank: false,
      sqref: 'F2:F100',
      formulas: ['"true,false"'],
      promptTitle: 'Ativo',
      prompt: 'Selecione true ou false',
      errorTitle: 'Valor Inválido',
      error: 'Escolha: true ou false'
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'modelo_importacao_produtos.xlsx');
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

  const validarProdutos = (dadosRaw: any[]): ProdutoImportacao[] => {
    return dadosRaw.map((linha, index) => {
      const produto: ProdutoImportacao = {
        nome: linha.nome || '',
        descricao: linha.descricao || '',
        categoria: linha.categoria || '',
        tipo_processamento: linha.tipo_processamento || '',
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

      // Validar tipo de processamento
      if (produto.tipo_processamento && !['in natura', 'minimamente processado', 'processado', 'ultraprocessado'].includes(produto.tipo_processamento)) {
        erros.push('Tipo de processamento deve ser: in natura, minimamente processado, processado ou ultraprocessado');
      }

      // Avisos apenas para campos realmente importantes (removidos avisos desnecessários)
      // Campos como unidade, categoria e tipo_processamento são opcionais e não precisam gerar avisos

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

  const removerProduto = (index: number) => {
    setProdutos(produtos.filter((_, i) => i !== index));
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
                  <li><strong>descricao</strong>: Descrição detalhada do produto (opcional)</li>
                  <li><strong>categoria</strong>: Categoria do produto (opcional)</li>
                  <li><strong>tipo_processamento</strong>: in natura, minimamente processado, processado, ultraprocessado (opcional)</li>
                  <li><strong>perecivel</strong>: true ou false (padrão: false)</li>
                  <li><strong>ativo</strong>: true ou false (padrão: true)</li>
                </ul>
                <Typography variant="body2" sx={{ mt: 2, color: '#f59e0b', fontWeight: 600 }}>
                  ⚠️ Importante: Marca, peso e unidades de medida agora são definidos nos contratos, não mais nos produtos.
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
                  icon={<Error sx={{ fontSize: 16 }} />}
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
                            {hasError && <Error sx={{ fontSize: 16, color: '#dc2626' }} />}
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