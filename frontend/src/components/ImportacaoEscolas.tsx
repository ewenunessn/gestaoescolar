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
  School,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface ImportacaoEscolasProps {
  open: boolean;
  onClose: () => void;
  onImport: (escolas: EscolaImportacao[]) => Promise<void>;
}

interface EscolaImportacao {
  nome: string;
  endereco?: string;
  municipio?: string;
  endereco_maps?: string;
  telefone?: string;
  nome_gestor?: string;
  administracao?: 'municipal' | 'estadual' | 'federal' | 'particular';
  ativo: boolean;

  status: 'valido' | 'erro' | 'aviso';
  mensagem?: string;
}

const ImportacaoEscolas: React.FC<ImportacaoEscolasProps> = ({
  open,
  onClose,
  onImport
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [escolas, setEscolas] = useState<EscolaImportacao[]>([]);
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

  const gerarModeloCSV = () => {
    const headers = [
      'nome',
      'endereco',
      'municipio',
      'endereco_maps',
      'telefone',
      'nome_gestor',
      'administracao',

      'ativo'
    ];

    const exemplos = [
      [
        'Escola Municipal João Silva',
        'Rua das Flores, 123',
        'São Paulo',
        'https://maps.google.com/...',
        '(11) 99999-9999',
        'Maria Santos',
        'municipal',
        '1',
        '1',
        'true'
      ],
      [
        'Escola Estadual Pedro Costa',
        'Av. Principal, 456',
        'Rio de Janeiro',
        '',
        '(21) 88888-8888',
        'João Oliveira',
        'estadual',
        '2',
        '1',
        'true'
      ],
      [
        'Colégio Federal Ana Lima',
        'Rua Central, 789',
        'Brasília',
        'https://maps.google.com/...',
        '(61) 77777-7777',
        'Ana Costa',
        'federal',
        '1',
        '2',
        'true'
      ],
      [
        'Escola Particular Santa Maria',
        'Rua da Paz, 321',
        'Belo Horizonte',
        '',
        '(31) 66666-6666',
        'Carlos Silva',
        'particular',
        '2',
        '2',
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
    link.download = 'modelo_importacao_escolas.csv';
    link.click();
  };

  const gerarModeloExcel = () => {
    const headers = [
      'nome',
      'endereco',
      'municipio',
      'endereco_maps',
      'telefone',
      'nome_gestor',
      'administracao',

      'ativo'
    ];

    const exemplos = [
      [
        'Escola Municipal João Silva',
        'Rua das Flores, 123',
        'São Paulo',
        'https://maps.google.com/...',
        '(11) 99999-9999',
        'Maria Santos',
        'municipal',
        true
      ],
      [
        'Escola Estadual Pedro Costa',
        'Av. Principal, 456',
        'Rio de Janeiro',
        '',
        '(21) 88888-8888',
        'João Oliveira',
        'estadual',
        true
      ],
      [
        'Colégio Federal Ana Lima',
        'Rua Central, 789',
        'Brasília',
        'https://maps.google.com/...',
        '(61) 77777-7777',
        'Ana Costa',
        'federal',
        true
      ],
      [
        'Escola Particular Santa Maria',
        'Rua da Paz, 321',
        'Belo Horizonte',
        '',
        '(31) 66666-6666',
        'Carlos Silva',
        'particular',
        true
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exemplos]);
    
    // Definir largura das colunas
    ws['!cols'] = [
      { wch: 30 }, // nome
      { wch: 25 }, // endereco
      { wch: 15 }, // municipio
      { wch: 30 }, // endereco_maps
      { wch: 15 }, // telefone
      { wch: 20 }, // nome_gestor
      { wch: 12 }, // administracao
      { wch: 8 }   // ativo
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Escolas');
    XLSX.writeFile(wb, 'modelo_importacao_escolas.xlsx');
  };

  const processarArquivo = async (file: File) => {
    setLoading(true);
    
    try {
      const dados = await lerArquivo(file);
      const escolasValidadas = validarEscolas(dados);
      setEscolas(escolasValidadas);
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

  const validarEscolas = (dadosRaw: any[]): EscolaImportacao[] => {
    return dadosRaw.map((linha, index) => {
      const escola: EscolaImportacao = {
        nome: linha.nome || '',
        endereco: linha.endereco || '',
        municipio: linha.municipio || '',
        endereco_maps: linha.endereco_maps || '',
        telefone: linha.telefone || '',
        nome_gestor: linha.nome_gestor || '',
        administracao: linha.administracao || undefined,

        ativo: linha.ativo === 'true' || linha.ativo === true || linha.ativo === 1,
        status: 'valido',
        mensagem: ''
      };

      const erros: string[] = [];
      const avisos: string[] = [];

      // Validar nome (obrigatório)
      if (!escola.nome || escola.nome.trim().length < 3) {
        erros.push('Nome da escola é obrigatório (mínimo 3 caracteres)');
      }

      // Validar administração
      if (escola.administracao && !['municipal', 'estadual', 'federal', 'particular'].includes(escola.administracao)) {
        erros.push('Administração deve ser: municipal, estadual, federal ou particular');
      }



      // Validações mais flexíveis - apenas para formatos claramente incorretos
      if (escola.telefone && escola.telefone.length > 0 && escola.telefone.length < 8) {
        avisos.push('Telefone muito curto');
      }

      // Validar URL do Maps apenas se não estiver vazia
      if (escola.endereco_maps && escola.endereco_maps.length > 10 && 
          !escola.endereco_maps.includes('maps.google') && 
          !escola.endereco_maps.includes('goo.gl') && 
          !escola.endereco_maps.includes('google.com/maps')) {
        avisos.push('URL do Maps pode estar incorreta');
      }

      // Avisos apenas para campos realmente importantes (removidos avisos desnecessários)
      // Campos como endereço, município e nome_gestor são opcionais e não precisam gerar avisos

      // Definir status
      if (erros.length > 0) {
        escola.status = 'erro';
        escola.mensagem = erros.join('; ');
      } else if (avisos.length > 0) {
        escola.status = 'aviso';
        escola.mensagem = avisos.join('; ');
      } else {
        escola.status = 'valido';
        escola.mensagem = 'Dados válidos';
      }

      return escola;
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
    const escolasValidas = escolas.filter(escola => escola.status !== 'erro');
    
    if (escolasValidas.length === 0) {
      alert('Não há escolas válidas para importar');
      return;
    }

    setLoading(true);
    setActiveStep(2);

    try {
      await onImport(escolasValidas);
      handleClose();
    } catch (error) {
      console.error('Erro na importação:', error);
      alert('Erro ao importar escolas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const removerEscola = (index: number) => {
    setEscolas(escolas.filter((_, i) => i !== index));
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

  const escolasValidas = escolas.filter(escola => escola.status !== 'erro').length;
  const escolasComErro = escolas.filter(escola => escola.status === 'erro').length;
  const escolasComAviso = escolas.filter(escola => escola.status === 'aviso').length;

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
        Importação em Lote - Escolas
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
              {activeStep === 2 ? 'Importando escolas... Isso pode levar alguns minutos.' : 'Processando arquivo...'}
            </Typography>
          </Box>
        )}

        {/* Passo 1: Upload do Arquivo */}
        {activeStep === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Faça o upload de um arquivo CSV ou Excel com os dados das escolas para cadastro em massa.
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
                  <li><strong>nome</strong>: Nome da escola (obrigatório)</li>
                  <li><strong>endereco</strong>: Endereço completo (opcional)</li>
                  <li><strong>municipio</strong>: Município/cidade (opcional)</li>
                  <li><strong>endereco_maps</strong>: Link do Google Maps (opcional)</li>
                  <li><strong>telefone</strong>: Telefone de contato (opcional)</li>
                  <li><strong>nome_gestor</strong>: Nome do gestor/diretor (opcional)</li>
                  <li><strong>administracao</strong>: municipal, estadual, federal ou particular (opcional)</li>

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
                label={`${escolasValidas} válidas`}
                sx={{
                  bgcolor: '#dcfce7',
                  color: '#059669',
                  fontWeight: 600,
                }}
              />
              {escolasComAviso > 0 && (
                <Chip
                  icon={<Warning sx={{ fontSize: 16 }} />}
                  label={`${escolasComAviso} com avisos`}
                  sx={{
                    bgcolor: '#fef3c7',
                    color: '#d97706',
                    fontWeight: 600,
                  }}
                />
              )}
              {escolasComErro > 0 && (
                <Chip
                  icon={<Error sx={{ fontSize: 16 }} />}
                  label={`${escolasComErro} com erros`}
                  sx={{
                    bgcolor: '#fee2e2',
                    color: '#dc2626',
                    fontWeight: 600,
                  }}
                />
              )}

              <Alert severity="info" sx={{ ml: 'auto', maxWidth: 400 }}>
                <strong>Modo Inteligente:</strong> Escolas existentes serão atualizadas automaticamente, novas escolas serão inseridas.
              </Alert>
            </Box>

            {escolasComErro > 0 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Existem {escolasComErro} escolas com erros que não serão importadas. 
                Corrija os erros ou remova as escolas para continuar.
              </Alert>
            )}

            <Alert severity="success" sx={{ mb: 3 }}>
              <strong>Importação Inteligente:</strong><br/>
              • Escolas com nomes iguais serão automaticamente atualizadas<br/>
              • Escolas com nomes novos serão inseridas<br/>
              • Nunca haverá duplicação de escolas<br/>
              • O sistema identifica escolas pelo nome
            </Alert>

            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Nome</TableCell>
                    <TableCell>Endereço</TableCell>
                    <TableCell>Município</TableCell>
                    <TableCell>Telefone</TableCell>
                    <TableCell>Gestor</TableCell>
                    <TableCell>Administração</TableCell>

                    <TableCell align="center">Ativo</TableCell>
                    <TableCell>Mensagem</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {escolas.map((escola, index) => {
                    const statusConfig = getStatusColor(escola.status);
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip
                            icon={statusConfig.icon}
                            label={escola.status}
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
                            {escola.nome}
                          </Typography>
                        </TableCell>
                        <TableCell>{escola.endereco || '-'}</TableCell>
                        <TableCell>{escola.municipio || '-'}</TableCell>
                        <TableCell>{escola.telefone || '-'}</TableCell>
                        <TableCell>{escola.nome_gestor || '-'}</TableCell>
                        <TableCell>
                          {escola.administracao ? (
                            <Chip
                              label={escola.administracao}
                              size="small"
                              sx={{
                                bgcolor: '#f3f4f6',
                                color: '#374151',
                                textTransform: 'capitalize',
                              }}
                            />
                          ) : '-'}
                        </TableCell>

                        <TableCell align="center">
                          <Chip
                            label={escola.ativo ? 'Sim' : 'Não'}
                            size="small"
                            sx={{
                              bgcolor: escola.ativo ? '#dcfce7' : '#fee2e2',
                              color: escola.ativo ? '#059669' : '#dc2626',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              color: escola.status === 'erro' ? '#dc2626' : '#6b7280',
                              fontSize: '0.875rem',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {escola.mensagem}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Remover escola">
                            <IconButton
                              onClick={() => removerEscola(index)}
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
            <School sx={{ fontSize: 64, color: '#059669', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 1 }}>
              Importação Concluída!
            </Typography>
            <Typography sx={{ color: '#6b7280' }}>
              {escolasValidas} escolas foram importadas com sucesso.
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

        {activeStep === 1 && escolasValidas > 0 && (
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
            Importar {escolasValidas} Escolas
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportacaoEscolas;