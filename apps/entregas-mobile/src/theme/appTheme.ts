// Tema centralizado do aplicativo de entregas
export const appTheme = {
  // Cores principais
  colors: {
    primary: '#1976d2',
    secondary: '#26a69a',
    background: '#f5f5f5',
    surface: '#ffffff',
    error: '#f44336',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
    navbar: '#1976d2',
    text: {
      primary: '#1a1a1a',
      secondary: '#666',
      disabled: '#999',
    },
    border: '#e0e0e0',
    divider: '#e0e0e0',
  },

  // Espaçamentos
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  // Bordas e raios
  borderRadius: {
    small: 6,
    medium: 8,
    large: 12,
  },

  // Estilos de Card padrão
  card: {
    elevation: 0,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 16,
  },

  // Tipografia
  typography: {
    title: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      color: '#333',
    },
    subtitle: {
      fontSize: 18,
      fontWeight: 'bold' as const,
      color: '#333',
    },
    body: {
      fontSize: 14,
      color: '#666',
    },
    caption: {
      fontSize: 12,
      color: '#666',
    },
    number: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      lineHeight: 32,
    },
  },

  // Status de entrega
  status: {
    pending: {
      color: '#ff9800',
      icon: 'clock-outline',
      label: 'Pendente',
    },
    completed: {
      color: '#4caf50',
      icon: 'check-circle',
      label: 'Concluída',
    },
    inProgress: {
      color: '#ff9800',
      icon: 'clock-outline',
      label: 'Em Andamento',
    },
    notForDelivery: {
      color: '#9e9e9e',
      icon: 'minus-circle-outline',
      label: 'Não p/ entrega',
    },
  },

  // Botões
  button: {
    borderRadius: 8,
    paddingVertical: 8,
  },
};

// Função helper para criar estilos de card consistentes
export const createCardStyle = (customStyle?: any) => ({
  ...appTheme.card,
  ...customStyle,
});

// Função helper para obter cor de status
export const getStatusColor = (percentual: number) => {
  if (percentual === 100) return appTheme.status.completed.color;
  if (percentual > 0) return appTheme.status.inProgress.color;
  return appTheme.status.pending.color;
};

export const getStatusLabel = (percentual: number) => {
  if (percentual === 100) return appTheme.status.completed.label;
  if (percentual > 0) return appTheme.status.inProgress.label;
  return appTheme.status.pending.label;
};

export const getStatusIcon = (percentual: number) => {
  if (percentual === 100) return appTheme.status.completed.icon;
  if (percentual > 0) return appTheme.status.inProgress.icon;
  return appTheme.status.pending.icon;
};
