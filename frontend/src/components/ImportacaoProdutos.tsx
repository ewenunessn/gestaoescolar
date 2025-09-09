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
  marca?: string;
  codigo_barras?: string;
  unidade_medida?: string;
  unidade?: string;
  peso?: number;
  validade_minima?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  imagem_url?: string;
  preco_referencia?: number;
  estoque_minimo?: number;
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
      'marca',
      'codigo_barras',
      'unidade_medida',
      'unidade',
      'peso',
      'validade_minima',
      'fator_divisao',
      'tipo_processamento',
      'imagem_url',
      'preco_referencia',
      'estoque_minimo',
      'ativo'
    ];

    const exemplos = [
      [
        'Arroz Branco Tipo 1',
        'Arroz branco polido, tipo 1, classe longo fino',
        'Cereais',
        'Tio João',
        '7891234567890',
        'kg',
        'kg',
        '1000',
        '365',
        '1',
        'processado',
        '',
        '5.50',
        '50',
        'true'
      ],
      [
        'Feijão Carioca',
        'Feijão carioca tipo 1, classe cores',
        'Leguminosas',
        'Camil',
        '7891234567891',
        'kg',
        'kg',
        '1000',
        '730',
        '1',
        'in natura',
        '',
        '8.90',
        '30',
        'true'
      ],
      [
        'Banana Prata',
        'Banana prata fresca, primeira qualidade',
        'Frutas',
        '',
        '',
        'kg',
        'kg',
        '150',
        '7',
        '1',
        'in natura',
        '',
        '4.20',
        '25',
        'true'
      ],
      [
        'Carne Bovina Moída',
        'Carne bovina moída, primeira qualidade',
        'Carnes',
        'Friboi',
        '7891234567898',
        'kg',
        'kg',
        '1000',
        '30',
        '1',
        'in natura',
        '',
        '18.50',
        '10',
        'true'
      ],
      [
        'Óleo de Soja',
        'Óleo de soja refinado',
        'Óleos',
        'Liza',
        '7891234567892',
        'litro',
        'L',
        '900',
        '180',
        '1',
        'processado',
        '',
        '6.80',
        '20',
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
      'marca',
      'codigo_barras',
      'unidade_medida',
      'unidade',
      'peso',
      'validade_minima',
      'fator_divisao',
      'tipo_processamento',
      'imagem_url',
      'preco_referencia',
      'estoque_minimo',
      'ativo'
    ];

    const exemplos = [
      [
        'Arroz Branco Tipo 1',
        'Arroz branco polido, tipo 1, classe longo fino',
        'Cereais',
        'Tio João',
        '7891234567890',
        'kg',
        'kg',
        1000,
        365,
        1,
        'processado',
        '',
        5.50,
        50,
        true
      ],
      [
        'Feijão Carioca',
        'Feijão carioca tipo 1, classe cores',
        'Leguminosas',
        'Camil',
        '7891234567891',
        'kg',
        'kg',
        1000,
        730,
        1,
        'in natura',
        '',
        8.90,
        30,
        true
      ],
      [
        'Banana Prata',
        'Banana prata fresca, primeira qualidade',
        'Frutas',
        '',
        '',
        'kg',
        'kg',
        150,
        7,
        1,
        'in natura',
        '',
        4.20,
        25,
        true
      ],
      [
        'Carne Bovina Moída',
        'Carne bovina moída, primeira qualidade',
        'Carnes',
        'Friboi',
        '7891234567898',
        'kg',
        'kg',
        1000,
        30,
        1,
        'in natura',
        '',
        18.50,
        10,
        true
      ],
      [
        'Óleo de Soja',
        'Óleo de soja refinado',
        'Óleos',
        'Liza',
        '7891234567892',
        'litro',
        'L',
        900,
        180,
        1,
        'processado',
        '',
        6.80,
        20,
        true
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exemplos]);

    // Definir largura das colunas
    ws['!cols'] = [
      { wch: 25 }, // nome
      { wch: 35 }, // descricao
      { wch: 15 }, // categoria
      { wch: 15 }, // marca
      { wch: 15 }, // codigo_barras
      { wch: 12 }, // unidade_medida
      { wch: 10 }, // unidade
      { wch: 8 },  // peso
      { wch: 12 }, // validade_minima
      { wch: 12 }, // fator_divisao
      { wch: 18 }, // tipo_processamento
      { wch: 25 }, // imagem_url
      { wch: 12 }, // preco_referencia
      { wch: 12 }, // estoque_minimo
      { wch: 8 }   // ativo
    ];

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
        marca: linha.marca || '',
        codigo_barras: linha.codigo_barras || '',
        unidade_medida: linha.unidade_medida || '',
        unidade: linha.unidade || '',
        peso: parseFloat(linha.peso) || undefined,
        validade_minima: parseInt(linha.validade_minima) || undefined,
        fator_divisao: parseFloat(linha.fator_divisao) || undefined,
        tipo_processamento: linha.tipo_processamento || '',
        imagem_url: linha.imagem_url || '',
        preco_referencia: parseFloat(linha.preco_referencia) || undefined,
        estoque_minimo: parseInt(linha.estoque_minimo) || 10,
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

      // Validar código de barras apenas se não estiver vazio
      if (produto.codigo_barras && produto.codigo_barras.length > 0 && !/^\d{8,14}$/.test(produto.codigo_barras)) {
        avisos.push('Código de barras deve ter entre 8 e 14 dígitos');
      }

      // Validar peso
      if (produto.peso !== undefined && produto.peso <= 0) {
        erros.push('Peso deve ser maior que zero');
      }

      // Validar validade mínima
      if (produto.validade_minima !== undefined && produto.validade_minima <= 0) {
        erros.push('Validade mínima deve ser maior que zero');
      }

      // Validar estoque mínimo
      if (produto.estoque_minimo !== undefined && produto.estoque_minimo < 0) {
        erros.push('Estoque mínimo não pode ser negativo');
      }

      // Validar URL da imagem apenas se não estiver vazia
      if (produto.imagem_url && produto.imagem_url.length > 10 &&
        !produto.imagem_url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
        avisos.push('URL da imagem pode estar incorreta');
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
                  <li><strong>marca</strong>: Marca do produto (opcional)</li>
                  <li><strong>codigo_barras</strong>: Código de barras 8-14 dígitos (opcional)</li>
                  <li><strong>unidade_medida</strong>: Unidade de medida padrão (opcional)</li>
                  <li><strong>unidade</strong>: Unidade de venda (opcional)</li>
                  <li><strong>peso</strong>: Peso em gramas (opcional)</li>
                  <li><strong>validade_minima</strong>: Validade mínima em dias (opcional)</li>
                  <li><strong>fator_divisao</strong>: Fator de divisão (opcional)</li>
                  <li><strong>tipo_processamento</strong>: in natura, minimamente processado, processado, ultraprocessado (opcional)</li>
                  <li><strong>imagem_url</strong>: URL da imagem do produto (opcional)</li>
                  <li><strong>preco_referencia</strong>: Preço de referência (opcional)</li>
                  <li><strong>estoque_minimo</strong>: Estoque mínimo (padrão: 10)</li>
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
                    <TableCell>Status</TableCell>
                    <TableCell>Nome</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Marca</TableCell>
                    <TableCell>Unidade</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="center">Peso (g)</TableCell>
                    <TableCell align="center">Preço Ref.</TableCell>
                    <TableCell align="center">Estoque Min.</TableCell>
                    <TableCell align="center">Ativo</TableCell>
                    <TableCell>Mensagem</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {produtos.map((produto, index) => {
                    const statusConfig = getStatusColor(produto.status);
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip
                            icon={statusConfig.icon}
                            label={produto.status}
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
                            {produto.nome}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.875rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {produto.descricao || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{produto.categoria || '-'}</TableCell>
                        <TableCell>{produto.marca || '-'}</TableCell>
                        <TableCell>{produto.unidade || produto.unidade_medida || '-'}</TableCell>
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
                        <TableCell align="center">{produto.peso || '-'}</TableCell>
                        <TableCell align="center">
                          {produto.preco_referencia ? `R$ ${produto.preco_referencia.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell align="center">{produto.estoque_minimo || 10}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={produto.ativo ? 'Sim' : 'Não'}
                            size="small"
                            sx={{
                              bgcolor: produto.ativo ? '#dcfce7' : '#fee2e2',
                              color: produto.ativo ? '#059669' : '#dc2626',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              color: produto.status === 'erro' ? '#dc2626' : '#6b7280',
                              fontSize: '0.875rem',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {produto.mensagem}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Remover produto">
                            <IconButton
                              onClick={() => removerProduto(index)}
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