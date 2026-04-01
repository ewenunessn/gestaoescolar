# Implementação: PDF Cardápio em Formato de Tabela

## Objetivo
Gerar PDF do cardápio em formato de tabela onde:
- **Colunas**: Dias selecionados (máximo 6)
- **Linhas**: Tipos de refeição (Café da Manhã, Lanche Manhã, Almoço, Lanche Tarde, Jantar, Ceia)
- **Células**: Preparações de cada tipo em cada dia

## Alterações Necessárias

### 1. Adicionar Estados no CardapioCalendario.tsx

```typescript
const [openPDFTabelaDialog, setOpenPDFTabelaDialog] = useState(false);
const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
```

### 2. Adicionar Função de Geração do PDF

```typescript
const gerarPDFTabela = async () => {
  if (diasSelecionados.length === 0) {
    toast.error('Selecione pelo menos um dia');
    return;
  }
  
  if (diasSelecionados.length > 6) {
    toast.error('Selecione no máximo 6 dias');
    return;
  }
  
  try {
    const pdfMake = await initPdfMake();
    const instituicao = await fetchInstituicaoForPDF();
    
    // Ordenar dias
    const diasOrdenados = [...diasSelecionados].sort((a, b) => a - b);
    
    // Tipos de refeição
    const tiposRefeicao = [
      { key: 'cafe_manha', label: 'Café da Manhã' },
      { key: 'lanche', label: 'Lanche Manhã' },
      { key: 'refeicao', label: 'Almoço' },
      { key: 'lanche_tarde', label: 'Lanche Tarde' },
      { key: 'jantar', label: 'Jantar' },
      { key: 'ceia', label: 'Ceia' }
    ];
    
    // Montar cabeçalho da tabela
    const headerRow = [
      { text: 'Refeição', style: 'tableHeader', fillColor: '#e3f2fd' },
      ...diasOrdenados.map(dia => ({
        text: `${dia}/${cardapio?.mes}`,
        style: 'tableHeader',
        fillColor: '#e3f2fd'
      }))
    ];
    
    // Montar linhas da tabela
    const tableBody = [headerRow];
    
    for (const tipo of tiposRefeicao) {
      const row = [
        { text: tipo.label, style: 'tipoRefeicao', fillColor: '#f5f5f5' }
      ];
      
      for (const dia of diasOrdenados) {
        // Buscar refeições deste tipo neste dia
        const refeicoesD dia = refeicoes.filter(r => 
          r.dia === dia && r.tipo_refeicao === tipo.key
        );
        
        const preparacoes = refeicoesD dia
          .map(r => r.refeicao_nome)
          .join('\n');
        
        row.push({
          text: preparacoes || '-',
          style: 'tableCell'
        });
      }
      
      tableBody.push(row);
    }
    
    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: diasOrdenados.length > 3 ? 'landscape' : 'portrait',
      pageMargins: [40, 60, 40, 60],
      header: createPDFHeader(instituicao),
      footer: createPDFFooter(),
      content: [
        {
          text: `Cardápio - ${dateUtils.getMonthName(cardapio?.mes)}/${cardapio?.ano}`,
          style: 'title',
          margin: [0, 0, 0, 10]
        },
        {
          text: cardapio?.nome || '',
          style: 'subtitle',
          margin: [0, 0, 0, 20]
        },
        {
          table: {
            headerRows: 1,
            widths: ['auto', ...Array(diasOrdenados.length).fill('*')],
            body: tableBody
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#cccccc',
            vLineColor: () => '#cccccc',
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6
          }
        }
      ],
      styles: {
        ...getDefaultPDFStyles(),
        title: {
          fontSize: 16,
          bold: true,
          alignment: 'center'
        },
        subtitle: {
          fontSize: 12,
          alignment: 'center',
          color: '#666666'
        },
        tableHeader: {
          bold: true,
          fontSize: 10,
          alignment: 'center'
        },
        tipoRefeicao: {
          bold: true,
          fontSize: 9
        },
        tableCell: {
          fontSize: 8,
          alignment: 'left'
        }
      }
    };
    
    pdfMake.createPdf(docDefinition).download(
      `cardapio-tabela-${cardapio?.mes}-${cardapio?.ano}.pdf`
    );
    
    toast.success('PDF gerado com sucesso!');
    setOpenPDFTabelaDialog(false);
    setDiasSelecionados([]);
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.error('Erro ao gerar PDF');
  }
};
```

### 3. Adicionar Botão no Menu

No menu de ações (onde tem os outros PDFs), adicionar:

```typescript
<MenuItem onClick={() => { setOpenPDFTabelaDialog(true); setAnchorEl(null); }}>
  <PdfIcon sx={{ mr: 1 }} /> Gerar PDF Tabela
</MenuItem>
```

### 4. Adicionar Modal de Seleção de Dias

```typescript
<Dialog 
  open={openPDFTabelaDialog} 
  onClose={() => setOpenPDFTabelaDialog(false)}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>Gerar PDF em Formato de Tabela</DialogTitle>
  <DialogContent>
    <Alert severity="info" sx={{ mb: 2 }}>
      Selecione até 6 dias para gerar o PDF em formato de tabela.
      As linhas serão os tipos de refeição e as colunas os dias.
    </Alert>
    
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
      {Array.from({ length: dateUtils.getDaysInMonth(ano, mes) }, (_, i) => i + 1).map(dia => (
        <Chip
          key={dia}
          label={dia}
          onClick={() => {
            if (diasSelecionados.includes(dia)) {
              setDiasSelecionados(diasSelecionados.filter(d => d !== dia));
            } else if (diasSelecionados.length < 6) {
              setDiasSelecionados([...diasSelecionados, dia]);
            } else {
              toast.error('Máximo de 6 dias');
            }
          }}
          color={diasSelecionados.includes(dia) ? 'primary' : 'default'}
          variant={diasSelecionados.includes(dia) ? 'filled' : 'outlined'}
        />
      ))}
    </Box>
    
    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
      Dias selecionados: {diasSelecionados.length}/6
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => { setOpenPDFTabelaDialog(false); setDiasSelecionados([]); }}>
      Cancelar
    </Button>
    <Button 
      onClick={gerarPDFTabela}
      variant="contained"
      disabled={diasSelecionados.length === 0}
      startIcon={<PdfIcon />}
    >
      Gerar PDF
    </Button>
  </DialogActions>
</Dialog>
```

## Resultado

O PDF gerado terá:
- Orientação automática (retrato para até 3 dias, paisagem para 4-6 dias)
- Cabeçalho com logo da instituição
- Título com mês/ano e nome do cardápio
- Tabela com:
  - Primeira coluna: Tipos de refeição
  - Demais colunas: Dias selecionados
  - Células: Preparações de cada tipo em cada dia
- Layout limpo e profissional
