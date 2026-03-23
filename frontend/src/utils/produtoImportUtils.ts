import * as XLSX from 'xlsx';

/**
 * Configuração centralizada para importação/exportação de produtos
 * Mantém consistência entre todos os lugares que geram modelos
 */

export const PRODUTO_IMPORT_HEADERS = [
  'nome',
  'descricao',
  'tipo_processamento',
  'categoria',
  'validade_minima',
  'perecivel',
  'ativo',
  'estoque_minimo',
  'fator_correcao',
  'tipo_fator_correcao',
  'unidade_distribuicao',
  'peso'
];

export const PRODUTO_IMPORT_EXEMPLOS = [
  [
    'Arroz Branco Tipo 1',
    'Arroz branco polido, tipo 1, classe longo fino',
    'processado',
    'Cereais',
    180,
    'false',
    'true',
    100,
    1.0,
    'perda',
    'KG',
    1000
  ],
  [
    'Feijão Carioca',
    'Feijão carioca tipo 1, classe cores',
    'in natura',
    'Leguminosas',
    365,
    'false',
    'true',
    50,
    1.0,
    'perda',
    'KG',
    1000
  ],
  [
    'Banana Prata',
    'Banana prata fresca, primeira qualidade',
    'in natura',
    'Frutas',
    7,
    'true',
    'true',
    0,
    1.4,
    'perda',
    'KG',
    120
  ],
  [
    'Ovo De Galinha',
    'Ovo de galinha tipo extra, branco',
    'in natura',
    'Ovos',
    30,
    'true',
    'true',
    200,
    1.0,
    'perda',
    'Unidade',
    60
  ],
  [
    'Óleo de Soja',
    'Óleo de soja refinado',
    'processado',
    'Óleos',
    365,
    'false',
    'true',
    20,
    1.0,
    'perda',
    'L',
    920
  ]
];

export const PRODUTO_IMPORT_COL_WIDTHS = [
  { wch: 30 }, // nome
  { wch: 40 }, // descricao
  { wch: 25 }, // tipo_processamento
  { wch: 15 }, // categoria
  { wch: 15 }, // validade_minima
  { wch: 10 }, // perecivel
  { wch: 8 },  // ativo
  { wch: 15 }, // estoque_minimo
  { wch: 15 }, // fator_correcao
  { wch: 20 }, // tipo_fator_correcao
  { wch: 20 }, // unidade_distribuicao
  { wch: 12 }  // peso
];

export const PRODUTO_IMPORT_INSTRUCOES = [
  ['INSTRUÇÕES PARA IMPORTAÇÃO DE PRODUTOS'],
  [''],
  ['Campo', 'Descrição', 'Obrigatório', 'Exemplo'],
  ['nome', 'Nome do produto', 'SIM', 'Arroz Branco Tipo 1'],
  ['descricao', 'Descrição detalhada do produto', 'NÃO', 'Arroz branco polido tipo 1'],
  ['tipo_processamento', 'Tipo: in natura, minimamente processado, processado, ultraprocessado', 'NÃO', 'processado'],
  ['categoria', 'Categoria do produto', 'NÃO', 'Cereais'],
  ['validade_minima', 'Validade mínima em dias', 'NÃO', '180'],
  ['perecivel', 'Produto perecível (true/false)', 'NÃO', 'false'],
  ['ativo', 'Produto ativo (true/false)', 'NÃO', 'true'],
  ['estoque_minimo', 'Estoque mínimo em unidades', 'NÃO', '100'],
  ['fator_correcao', 'Fator de correção (perdas/rendimento)', 'NÃO', '1.0'],
  ['tipo_fator_correcao', 'Tipo: perda ou rendimento', 'NÃO', 'perda'],
  ['unidade_distribuicao', 'Unidade de distribuição (KG, L, Unidade, etc)', 'NÃO', 'KG'],
  ['peso', 'Peso unitário em gramas', 'NÃO', '1000'],
  [''],
  ['NOTAS IMPORTANTES:'],
  ['- Nome é obrigatório e identifica o produto'],
  ['- Use true ou false para os campos perecivel e ativo'],
  ['- Peso: em GRAMAS (ex: 1000 para 1kg, 60 para 1 ovo)'],
  ['- Fator de correção: >= 1.0 para perdas (ex: 1.4 para banana com casca)'],
  ['- Fator de correção: <= 1.0 para rendimento (ex: 0.8 para arroz que rende 80%)'],
  ['- Tipo fator correção: "perda" ou "rendimento"'],
  ['- Unidade distribuição: como o produto é distribuído (KG, L, Unidade, Pacote, etc)'],
  ['- Validade mínima: em dias (ex: 7 para frutas, 180 para arroz)'],
  ['- Estoque mínimo: quantidade mínima para alerta'],
  ['- O sistema identificará produtos existentes pelo nome e fará atualização'],
  [''],
  ['EXEMPLOS DE PESO (em gramas):'],
  ['- Arroz (pacote 1kg): 1000'],
  ['- Ovo: 60'],
  ['- Banana: 120'],
  ['- Óleo (litro): 920'],
  ['- Pão francês: 50']
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
  
  // Validação para tipo_processamento (coluna C, linhas 2 a 100)
  ws['!dataValidation'].push({
    type: 'list',
    allowBlank: true,
    sqref: 'C2:C100',
    formulas: ['"in natura,minimamente processado,processado,ultraprocessado"'],
    promptTitle: 'Tipo de Processamento',
    prompt: 'Selecione uma das opções',
    errorTitle: 'Valor Inválido',
    error: 'Escolha: in natura, minimamente processado, processado ou ultraprocessado'
  });

  // Validação para perecivel (coluna F, linhas 2 a 100)
  ws['!dataValidation'].push({
    type: 'list',
    allowBlank: false,
    sqref: 'F2:F100',
    formulas: ['"true,false"'],
    promptTitle: 'Perecível',
    prompt: 'Selecione true ou false',
    errorTitle: 'Valor Inválido',
    error: 'Escolha: true ou false'
  });

  // Validação para ativo (coluna G, linhas 2 a 100)
  ws['!dataValidation'].push({
    type: 'list',
    allowBlank: false,
    sqref: 'G2:G100',
    formulas: ['"true,false"'],
    promptTitle: 'Ativo',
    prompt: 'Selecione true ou false',
    errorTitle: 'Valor Inválido',
    error: 'Escolha: true ou false'
  });

  // Validação para tipo_fator_correcao (coluna J, linhas 2 a 100)
  ws['!dataValidation'].push({
    type: 'list',
    allowBlank: true,
    sqref: 'J2:J100',
    formulas: ['"perda,rendimento"'],
    promptTitle: 'Tipo Fator Correção',
    prompt: 'Selecione perda ou rendimento',
    errorTitle: 'Valor Inválido',
    error: 'Escolha: perda ou rendimento'
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
