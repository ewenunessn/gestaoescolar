/**
 * Helper para filtrar dados de períodos ocultos
 * 
 * Adiciona condição WHERE para excluir registros de períodos com ocultar_dados = true
 */

/**
 * Retorna a condição SQL para filtrar períodos ocultos
 * @param alias - Alias da tabela de períodos no JOIN (ex: 'per')
 * @returns String com a condição SQL
 */
export function getFiltroPeríodosVisiveis(alias: string = 'per'): string {
  return `(${alias}.ocultar_dados = false OR ${alias}.ocultar_dados IS NULL OR ${alias}.id IS NULL)`;
}

/**
 * Adiciona JOIN com períodos e filtro de ocultação
 * @param tabelaPrincipal - Nome da tabela principal (ex: 'pedidos', 'guias')
 * @param aliasPrincipal - Alias da tabela principal (ex: 'p', 'g')
 * @param aliasPeriodos - Alias para a tabela períodos (padrão: 'per')
 * @returns String com o LEFT JOIN e condição WHERE
 */
export function getJoinPeriodosVisiveis(
  tabelaPrincipal: string,
  aliasPrincipal: string,
  aliasPeriodos: string = 'per'
): { join: string; where: string } {
  return {
    join: `LEFT JOIN periodos ${aliasPeriodos} ON ${aliasPrincipal}.periodo_id = ${aliasPeriodos}.id`,
    where: getFiltroPeríodosVisiveis(aliasPeriodos)
  };
}

/**
 * Adiciona filtro de períodos visíveis a uma query existente
 * Útil quando o JOIN com períodos já existe
 * @param query - Query SQL original
 * @param tabelaPrincipal - Nome da tabela principal
 * @param aliasPrincipal - Alias da tabela principal
 * @param aliasPeriodos - Alias da tabela períodos (padrão: 'per')
 * @returns Query modificada com JOIN e filtro
 */
export function adicionarFiltroPeriodosVisiveis(
  query: string,
  tabelaPrincipal: string,
  aliasPrincipal: string,
  aliasPeriodos: string = 'per'
): string {
  const { join, where } = getJoinPeriodosVisiveis(tabelaPrincipal, aliasPrincipal, aliasPeriodos);
  
  // Adicionar JOIN se não existir
  if (!query.includes(`JOIN periodos ${aliasPeriodos}`)) {
    // Encontrar posição do WHERE
    const whereIndex = query.toLowerCase().indexOf('where');
    if (whereIndex > -1) {
      query = query.slice(0, whereIndex) + join + '\n      ' + query.slice(whereIndex);
    } else {
      // Se não tem WHERE, adicionar antes do GROUP BY ou ORDER BY
      const groupByIndex = query.toLowerCase().indexOf('group by');
      const orderByIndex = query.toLowerCase().indexOf('order by');
      const insertIndex = groupByIndex > -1 ? groupByIndex : (orderByIndex > -1 ? orderByIndex : query.length);
      query = query.slice(0, insertIndex) + join + '\n      ' + query.slice(insertIndex);
    }
  }
  
  // Adicionar condição WHERE
  if (query.toLowerCase().includes('where')) {
    query = query.replace(/WHERE\s+/i, `WHERE ${where} AND `);
  } else {
    // Adicionar WHERE antes do GROUP BY ou ORDER BY
    const groupByIndex = query.toLowerCase().indexOf('group by');
    const orderByIndex = query.toLowerCase().indexOf('order by');
    const insertIndex = groupByIndex > -1 ? groupByIndex : (orderByIndex > -1 ? orderByIndex : query.length);
    query = query.slice(0, insertIndex) + `WHERE ${where}\n      ` + query.slice(insertIndex);
  }
  
  return query;
}
