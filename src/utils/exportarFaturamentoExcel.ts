import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ContratoCalculado } from '../types/faturamento';

export async function exportarContratoParaExcel(
  contrato: ContratoCalculado,
  pedidoNumero: string
) {
  const workbook = new ExcelJS.Workbook();

  // Agrupar itens por modalidade
  const itensPorModalidade: { [key: string]: any } = {};

  for (const item of contrato.itens) {
    for (const divisao of item.divisoes) {
      if (!itensPorModalidade[divisao.modalidade_nome]) {
        itensPorModalidade[divisao.modalidade_nome] = {
          codigo_financeiro: divisao.modalidade_codigo_financeiro || '',
          itens: []
        };
      }

      itensPorModalidade[divisao.modalidade_nome].itens.push({
        produto: item.produto_nome,
        unidade: item.unidade || '',
        quantidade: divisao.quantidade,
        preco_unitario: item.preco_unitario,
        custo_total: divisao.valor
      });
    }
  }

  // Criar uma aba para cada modalidade
  for (const [modalidadeNome, modalidadeData] of Object.entries(itensPorModalidade)) {
    const worksheet = workbook.addWorksheet(modalidadeNome.substring(0, 31));
    const itens = modalidadeData.itens;
    const codigoFinanceiro = modalidadeData.codigo_financeiro;

    // Título
    worksheet.mergeCells('A1:E1');
    const tituloCell = worksheet.getCell('A1');
    tituloCell.value = `Contrato Nº ${contrato.contrato_numero} - ${contrato.fornecedor_nome} - ${contrato.fornecedor_cnpj}`;
    tituloCell.font = { bold: true, size: 12 };
    tituloCell.alignment = { horizontal: 'center', vertical: 'middle' };
    tituloCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB4C7E7' }
    };
    tituloCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    worksheet.getRow(1).height = 25;

    // Subtítulo (Código Financeiro - Modalidade)
    worksheet.mergeCells('A2:E2');
    const subtituloCell = worksheet.getCell('A2');
    subtituloCell.value = codigoFinanceiro ? `${codigoFinanceiro} - ${modalidadeNome}` : modalidadeNome;
    subtituloCell.font = { bold: true, size: 12 };
    subtituloCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtituloCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };
    subtituloCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    worksheet.getRow(2).height = 20;

    // Cabeçalho
    const headerRow = worksheet.getRow(3);
    headerRow.values = ['ITEM', 'UNIDADE DE MEDIDA', 'QUANTIDADE', 'PREÇO UNITÁRIO', 'CUSTO POR ITEM'];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 20;

    // Aplicar preenchimento e bordas no cabeçalho
    for (let col = 1; col <= 5; col++) {
      const cell = headerRow.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD2691E' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Dados
    let rowIndex = 4;
    let totalGeral = 0;

    for (const item of itens) {
      const row = worksheet.getRow(rowIndex);

      row.getCell(1).value = item.produto;
      row.getCell(2).value = item.unidade || '';
      row.getCell(3).value = item.quantidade;
      row.getCell(4).value = Number(item.preco_unitario);
      row.getCell(5).value = Number(item.custo_total);

      // Formatação e bordas
      for (let col = 1; col <= 5; col++) {
        const cell = row.getCell(col);
        cell.font = { size: 12 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }

      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(3).numFmt = '#,##0';
      row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(4).numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
      row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(5).numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';

      totalGeral += Number(item.custo_total);
      rowIndex++;
    }

    // Linha de total
    const totalRow = worksheet.getRow(rowIndex);
    totalRow.getCell(4).value = 'TOTAL';
    totalRow.getCell(5).value = totalGeral;

    totalRow.getCell(4).font = { bold: true, size: 12 };
    totalRow.getCell(5).font = { bold: true, size: 12 };
    totalRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow.getCell(5).numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
    totalRow.getCell(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };
    totalRow.getCell(5).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };

    // Bordas no total
    for (let col = 4; col <= 5; col++) {
      const cell = totalRow.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    // Ajustar largura das colunas
    worksheet.getColumn(1).width = 30;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 18;
    worksheet.getColumn(5).width = 18;
  }

  // Criar aba GERAL com totais consolidados
  const worksheetGeral = workbook.addWorksheet('GERAL');

  // Título
  worksheetGeral.mergeCells('A1:E1');
  const tituloGeralCell = worksheetGeral.getCell('A1');
  tituloGeralCell.value = `Contrato Nº ${contrato.contrato_numero} - ${contrato.fornecedor_nome} - ${contrato.fornecedor_cnpj}`;
  tituloGeralCell.font = { bold: true, size: 12 };
  tituloGeralCell.alignment = { horizontal: 'center', vertical: 'middle' };
  tituloGeralCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB4C7E7' }
  };
  tituloGeralCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  worksheetGeral.getRow(1).height = 25;

  // Subtítulo (Geral)
  worksheetGeral.mergeCells('A2:E2');
  const subtituloGeralCell = worksheetGeral.getCell('A2');
  subtituloGeralCell.value = 'GERAL';
  subtituloGeralCell.font = { bold: true, size: 12 };
  subtituloGeralCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subtituloGeralCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };
  subtituloGeralCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  worksheetGeral.getRow(2).height = 20;

  // Cabeçalho
  const headerGeralRow = worksheetGeral.getRow(3);
  headerGeralRow.values = ['ITEM', 'UNIDADE DE MEDIDA', 'QUANTIDADE', 'PREÇO UNITÁRIO', 'CUSTO POR ITEM'];
  headerGeralRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerGeralRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerGeralRow.height = 20;

  for (let col = 1; col <= 5; col++) {
    const cell = headerGeralRow.getCell(col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD2691E' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Consolidar quantidades por produto
  const produtosConsolidados: { [key: string]: any } = {};

  for (const item of contrato.itens) {
    const key = item.produto_nome;
    if (!produtosConsolidados[key]) {
      produtosConsolidados[key] = {
        produto: item.produto_nome,
        unidade: item.unidade || '',
        quantidade: 0,
        preco_unitario: item.preco_unitario,
        custo_total: 0
      };
    }

    // Somar quantidades de todas as divisões
    for (const divisao of item.divisoes) {
      produtosConsolidados[key].quantidade += divisao.quantidade;
      produtosConsolidados[key].custo_total += divisao.valor;
    }
  }

  // Dados consolidados
  let rowGeralIndex = 4;
  let totalGeralConsolidado = 0;

  for (const item of Object.values(produtosConsolidados)) {
    const row = worksheetGeral.getRow(rowGeralIndex);

    row.getCell(1).value = item.produto;
    row.getCell(2).value = item.unidade;
    row.getCell(3).value = item.quantidade;
    row.getCell(4).value = Number(item.preco_unitario);
    row.getCell(5).value = Number(item.custo_total);

    for (let col = 1; col <= 5; col++) {
      const cell = row.getCell(col);
      cell.font = { size: 12 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(4).numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
    row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(5).numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';

    totalGeralConsolidado += Number(item.custo_total);
    rowGeralIndex++;
  }

  // Linha de total
  const totalGeralRow = worksheetGeral.getRow(rowGeralIndex);
  totalGeralRow.getCell(4).value = 'TOTAL';
  totalGeralRow.getCell(5).value = totalGeralConsolidado;

  totalGeralRow.getCell(4).font = { bold: true, size: 12 };
  totalGeralRow.getCell(5).font = { bold: true, size: 12 };
  totalGeralRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  totalGeralRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  totalGeralRow.getCell(5).numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
  totalGeralRow.getCell(4).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };
  totalGeralRow.getCell(5).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };

  for (let col = 4; col <= 5; col++) {
    const cell = totalGeralRow.getCell(col);
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  // Ajustar largura das colunas
  worksheetGeral.getColumn(1).width = 30;
  worksheetGeral.getColumn(2).width = 20;
  worksheetGeral.getColumn(3).width = 15;
  worksheetGeral.getColumn(4).width = 18;
  worksheetGeral.getColumn(5).width = 18;

  // Gerar arquivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const nomeArquivo = `${contrato.fornecedor_nome} - Contrato Nº ${contrato.contrato_numero.replace('/', '_')}.xlsx`;
  saveAs(blob, nomeArquivo);
}
