import * as XLSX from 'xlsx';

/**
 * Configuração centralizada para importação/exportação de produtos
 * Mantém consistência entre todos os lugares que geram modelos
 */

export const PRODUTO_IMPORT_HEADERS = [
  'nome',
  'unidade',
  'descricao',
  'categoria',
  'tipo_processamento',
  'peso',
  'fator_correcao',
  'perecivel',
  'ativo'
];

export const PRODUTO_IMPORT_EXEMPLOS = [
  [
    'Arroz Branco Tipo 1',
    'KG',
    'Arroz branco polido, tipo 1, classe longo fino',
    'Cereais',
    'processado',
    1.0,
    1.0,
    'false',
    'true'
  ],
  [
    'Feijão Carioca',
    'KG',
    'Feijão carioca tipo 1, classe cores',
    'Leguminosas',
    'in natura',
    1.0,
    1.0,
    'false',
    'true'
  ],
  [
    'Banana Prata',
    'KG',
    'Banana prata fresca, primeira qualidade',
    'Frutas',
    'in natura',
    0.12,
    1.4,
    'true',
    'true'
  ],
  [
    'Carne Bovina Moída',
    'KG',
    'Carne bovina moída, primeira qualidade',
    'Carnes',
    'in natura',
    1.0,
    1.0,
    'true',
    'true'
  ],
  [
    'Óleo de Soja',
    'L',
    'Óleo de soja refinado',
    'Óleos',
    'processado',
    0.92,
    1.0,
    'false',
    'true'
  ]
];

export const PRODUTO_IMPORT_COL_WIDTHS = [
  { wch: 30 }, // nome
  { wch: 10 }, // unidade
  { wch: 35 }, // descricao
  { wch: 15 }, // categoria
  { wch: 25 }, // tipo_processamento
  { wch: 10 }, // peso
  { wch: 15 }, // fator_correcao
  { wch: 10 }, // perecivel
  { wch: 8 }   // ativo
];

export const PRODUTO_IMPORT_INSTRUCOES = [
  ['INSTRUÇÕES PARA IMPORTAÇÃO DE PRODUTOS'],
  [''],
  ['Campo', 'Descrição', 'Obrigatório', 'Exemplo'],
  ['nome', 'Nome do produto', 'SIM', 'Arroz Branco'],
  ['unidade', 'Unidade de medida (UN, KG, L, etc)', 'SIM', 'KG'],
  ['descricao', 'Descrição detalhada do produto', 'NÃO', 'Arroz branco tipo 1'],
  ['categoria', 'Categoria do produto', 'NÃO', 'Cereais'],
  ['tipo_processamento', 'Tipo: in natura, minimamente processado, processado, ultraprocessado', 'NÃO', 'processado'],
  ['peso', 'Peso unitário em kg (para conversões)', 'NÃO', '1.0'],
  ['fator_correcao', 'Fator de correção (perdas no preparo)', 'NÃO', '1.0'],
  ['perecivel', 'Produto perecível (true/false)', 'NÃO', 'false'],
  ['ativo', 'Produto ativo (true/false)', 'NÃO', 'true'],
  [''],
  ['NOTAS:'],
  ['- Preencha apenas os campos necessários'],
  ['- Use true ou false para os campos perecivel e ativo'],
  ['- Peso: usado para conversões de unidades (ex: 0.12 para banana)'],
  ['- Fator de correção: >= 1.0, considera perdas no preparo (ex: 1.4 para banana com casca)'],
  ['- O sistema identificará produtos existentes pelo nome e fará atualização'],
  ['- Unidades comuns: UN, KG, G, L, ML, DZ, PCT, CX, FD, SC']
];

/**
 * Gera um arquivo Excel com modelo de importação de produtos
 * @param nomeArquivo - Nome do arquivo (opcional, gera com timestamp se não fornecido)
 */
export function gerarModeloExcelProdutos(nomeArquivo?: string): void {
  // Criar worksheet com headers e exemplos
  const ws = XLSX.utils.aoa_to_sheet([PRODUTO_IMPORT_HEADERS, ...PRODUTO_IMPORT_EXEMPLOS]);

  // Definir largura das colunas
  ws['!cols'] = PRODUTO_IMPORT_COL_WIDTHS;

  // Adicionar validação de dados
  if (!ws['!dataValidation']) ws['!dataValidation'] = [];
  
  // Validação para tipo_processamento (coluna E, linhas 2 a 100)
  ws['!dataValidation'].push({
    type: 'list',
    allowBlank: true,
    sqref: 'E2:E100',
    formulas: ['"in natura,minimamente processado,processado,ultraprocessado"'],
    promptTitle: 'Tipo de Processamento',
    prompt: 'Selecione uma das opções',
    errorTitle: 'Valor Inválido',
    error: 'Escolha: in natura, minimamente processado, processado ou ultraprocessado'
  });

  // Validação para perecivel (coluna H, linhas 2 a 100)
  ws['!dataValidation'].push({
    type: 'list',
    allowBlank: false,
    sqref: 'H2:H100',
    formulas: ['"true,false"'],
    promptTitle: 'Perecível',
    prompt: 'Selecione true ou false',
    errorTitle: 'Valor Inválido',
    error: 'Escolha: true ou false'
  });

  // Validação para ativo (coluna I, linhas 2 a 100)
  ws['!dataValidation'].push({
    type: 'list',
    allowBlank: false,
    sqref: 'I2:I100',
    formulas: ['"true,false"'],
    promptTitle: 'Ativo',
    prompt: 'Selecione true ou false',
    errorTitle: 'Valor Inválido',
    error: 'Escolha: true ou false'
  });

  // Criar workbook e adicionar worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Importacao');

  // Adicionar segunda aba com instruções
  const wsInstrucoes = XLSX.utils.aoa_to_sheet(PRODUTO_IMPORT_INSTRUCOES);
  wsInstrucoes['!cols'] = [{ wch: 15 }, { wch: 50 }, { wch: 10 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'Instruções');

  // Gerar nome do arquivo se não fornecido
  const arquivo = nomeArquivo || `modelo_importacao_produtos_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // Fazer download do arquivo
  XLSX.writeFile(wb, arquivo);
}

/**
 * Gera um arquivo CSV com modelo de importação de produtos
 */
export function gerarModeloCSVProdutos(): void {
  const csvContent = [
    PRODUTO_IMPORT_HEADERS.join(','),
    ...PRODUTO_IMPORT_EXEMPLOS.map(linha => 
      linha.map(campo => `"${campo}"`).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `modelo_importacao_produtos_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}
