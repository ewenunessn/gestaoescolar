/**
 * Testa a geração do PDF de entrega com o mesmo docDef do frontend
 */
const path = require('path');

// Simular o ambiente browser para o pdfmake
global.window = { location: { hostname: 'localhost' } };
global.document = {
  createElement: () => ({ style: {}, click: () => {}, appendChild: () => {}, removeChild: () => {} }),
  body: { appendChild: () => {}, removeChild: () => {} },
};

const pdfmake = require(path.join(__dirname, '../../frontend/node_modules/pdfmake/build/pdfmake'));
const pdfFonts = require(path.join(__dirname, '../../frontend/node_modules/pdfmake/build/vfs_fonts'));
pdfmake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts;

// Simular dados da escola e itens
const escola = {
  id: 108,
  nome: 'EMEIF ALACID NUNES',
  endereco: 'RUA EXEMPLO, S/N',
  rota_nome: 'Rota Ramal',
  rota_id: 3,
  ordem_rota: 1,
  total_alunos: 150,
};

const itensOrdenados = [
  { produto_nome: 'Açúcar Cristal', unidade: 'Kg', quantidade: 4 },
  { produto_nome: 'Arroz', unidade: 'Kg', quantidade: 16 },
  { produto_nome: 'Feijão', unidade: 'Kg', quantidade: 8 },
];

const MIN_LINHAS = 25;
const linhasVazias = Math.max(0, MIN_LINHAS - itensOrdenados.length);
const mesAno = 'MÊS: MARÇO  2026';
const rotaLabel = escola.rota_nome ? escola.rota_nome.toUpperCase() : 'SEM ROTA';
const numLabel = escola.ordem_rota && escola.ordem_rota !== 999 ? `Nº ${escola.ordem_rota}` : '';

const tableBody = [
  [
    { text: 'ID',          bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [4,5,4,5] },
    { text: 'ITEM',        bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', margin: [6,5,6,5] },
    { text: 'UND. MEDIDA', bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [4,5,4,5] },
    { text: '1 ENTREGA',   bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [4,5,4,5] },
    { text: 'DATA',        bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [4,5,4,5] },
    { text: 'CONFIRMAÇÃO', bold: true, fontSize: 8, color: '#212121', fillColor: '#F5F5F5', alignment: 'center', margin: [4,5,4,5] },
  ],
  ...itensOrdenados.map((item, idx) => [
    { text: String(idx + 1).padStart(2, '0'), fontSize: 8, alignment: 'center', fillColor: '#FFFFFF', margin: [4,4,4,4] },
    { text: item.produto_nome, fontSize: 8, fillColor: '#FFFFFF', margin: [6,4,6,4] },
    { text: item.unidade, bold: true, fontSize: 8, alignment: 'center', fillColor: '#FFFFFF', margin: [4,4,4,4] },
    { text: String(item.quantidade), fontSize: 8, alignment: 'center', fillColor: '#FFFFFF', margin: [4,4,4,4] },
    { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
    { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
  ]),
  ...Array.from({ length: linhasVazias }, (_, i) => [
    { text: String(itensOrdenados.length + i + 1).padStart(2, '0'), fontSize: 8, alignment: 'center', fillColor: '#FFFFFF', margin: [4,4,4,4] },
    { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [6,4,6,4] },
    { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
    { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
    { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
    { text: '', fontSize: 8, fillColor: '#FFFFFF', margin: [4,4,4,4] },
  ]),
];

const tableLayout = {
  hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.4),
  vLineWidth: () => 0.4,
  hLineColor: (i, node) => (i === 0 || i === node.table.body.length ? '#BDBDBD' : '#E0E0E0'),
  vLineColor: () => '#E0E0E0',
  fillColor: () => null,
};

const headerLeft = {
  stack: [
    { text: 'SECRETARIA MUNICIPAL DE EDUCAÇÃO', fontSize: 11, bold: true },
    { text: 'DEPARTAMENTO DE ALIMENTAÇÃO ESCOLAR', fontSize: 8, color: '#555' },
  ],
  width: '*',
};

const headerRight = {
  table: {
    widths: ['*', 50],
    body: [[
      { text: rotaLabel, bold: true, fontSize: 9, alignment: 'center', margin: [6, 6, 6, 6] },
      { text: numLabel,  bold: true, fontSize: 9, alignment: 'center', margin: [6, 6, 6, 6] },
    ]],
  },
  layout: {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => '#333333',
    vLineColor: () => '#333333',
  },
  width: 160,
};

const docDef = {
  pageSize: 'A4',
  pageOrientation: 'portrait',
  pageMargins: [28, 28, 28, 36],
  content: [
    { columns: [headerLeft, headerRight], columnGap: 8, margin: [0, 0, 0, 4] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 539, y2: 0, lineWidth: 1, lineColor: '#cccccc' }], margin: [0, 4, 0, 10] },
    { text: escola.nome.toUpperCase(), fontSize: 13, bold: true, margin: [0, 0, 0, 6] },
    {
      columns: [
        { text: escola.endereco ? `Nº ${escola.endereco.toUpperCase()}` : '', fontSize: 8, width: '*' },
        { text: `TOTAL DE ALUNOS:  ${escola.total_alunos ?? '—'}`, fontSize: 8, alignment: 'center', width: 160 },
        { text: mesAno, fontSize: 8, alignment: 'right', width: 140 },
      ],
      margin: [0, 0, 0, 6],
    },
    { table: { headerRows: 1, widths: [22, '*', 60, 50, 50, 70], body: tableBody }, layout: tableLayout },
  ],
  footer: (currentPage, pageCount) => ({
    columns: [
      { text: 'Secretaria Municipal de Educação', fontSize: 7, color: '#a0aec0', margin: [28, 0, 0, 0] },
      { text: `Página ${currentPage} de ${pageCount} · Gerado em ${new Date().toLocaleDateString('pt-BR')}`, fontSize: 7, color: '#a0aec0', alignment: 'right', margin: [0, 0, 28, 0] },
    ],
  }),
  defaultStyle: { font: 'Roboto' },
};

console.log('Gerando PDF...');
console.log('tableBody rows:', tableBody.length);

pdfmake.createPdf(docDef).getBuffer((buf) => {
  const fs = require('fs');
  fs.writeFileSync('test-entrega-output.pdf', buf);
  console.log('✅ PDF gerado com sucesso!', buf.length, 'bytes → test-entrega-output.pdf');
});

setTimeout(() => {
  if (!require('fs').existsSync('test-entrega-output.pdf')) {
    console.error('❌ PDF não foi gerado após 5s');
  }
}, 5000);
