import { usePeriodoAtivo } from "./queries/usePeriodosQueries";

export function usePeriodoOperacional() {
  const { data: periodo, isLoading, error } = usePeriodoAtivo();
  const bloqueado = Boolean(periodo?.fechado);
  const descricao = periodo?.descricao || String(periodo?.ano ?? "");
  const motivoBloqueio = bloqueado
    ? `Periodo ${descricao} fechado: consulta apenas.`
    : undefined;

  return {
    periodo,
    isLoading,
    error,
    bloqueado,
    motivoBloqueio,
  };
}
