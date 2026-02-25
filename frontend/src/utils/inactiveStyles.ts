// Estilos e utilitários para itens inativos

export const getInactiveRowStyle = (isInactive: boolean) => ({
  opacity: isInactive ? 0.5 : 1,
  backgroundColor: isInactive ? 'action.hover' : 'inherit'
});

export const getInactiveChip = (isInactive: boolean) => 
  isInactive ? { label: "Inativo", size: "small" as const, color: "default" as const, sx: { ml: 1 } } : null;
