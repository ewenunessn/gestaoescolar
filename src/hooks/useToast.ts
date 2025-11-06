import { useNotification } from '../context/NotificationContext';

export const useToast = () => {
  const { success, error, warning, info } = useNotification();

  return {
    // Notificações de sucesso
    successSave: (message?: string) => 
      success("Salvo com sucesso!", message || "As alterações foram salvas.", 4000),
    
    successDelete: (item?: string) => 
      success("Excluído!", `${item || 'Item'} foi excluído com sucesso.`, 4000),
    
    successCreate: (item?: string) => 
      success("Criado!", `${item || 'Item'} foi criado com sucesso.`, 4000),
    
    successUpdate: (item?: string) => 
      success("Atualizado!", `${item || 'Item'} foi atualizado com sucesso.`, 4000),

    // Notificações de erro
    errorLoad: (item?: string) => 
      error("Erro ao carregar", `Não foi possível carregar ${item || 'os dados'}. Tente novamente.`, 6000),
    
    errorSave: (message?: string) => 
      error("Erro ao salvar", message || "Não foi possível salvar as alterações. Tente novamente.", 6000),
    
    errorDelete: (item?: string) => 
      error("Erro ao excluir", `Não foi possível excluir ${item || 'o item'}. Tente novamente.`, 6000),
    
    errorNetwork: () => 
      error("Erro de conexão", "Verifique sua conexão com a internet e tente novamente.", 7000),
    
    errorAuth: () => 
      error("Sessão expirada", "Sua sessão expirou. Faça login novamente.", 7000),

    // Notificações de aviso
    warningUnsaved: () => 
      warning("Alterações não salvas", "Você tem alterações não salvas. Salve antes de continuar.", 6000),
    
    warningRequired: (fields?: string) => 
      warning("Campos obrigatórios", `${fields || 'Alguns campos'} são obrigatórios.`, 5000),
    
    warningLimit: (limit?: string) => 
      warning("Limite atingido", `${limit || 'Limite'} foi atingido.`, 5000),

    // Notificações de informação
    infoProcessing: (action?: string) => 
      info("Processando...", `${action || 'Operação'} está sendo processada.`, 3000),
    
    infoNoData: (item?: string) => 
      info("Nenhum resultado", `Nenhum ${item || 'resultado'} encontrado.`, 4000),

    // Funções diretas para casos customizados
    success,
    error,
    warning,
    info,
    
    // Função genérica showToast para compatibilidade
    showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string, duration?: number) => {
      switch (type) {
        case 'success':
          return success(title, message, duration);
        case 'error':
          return error(title, message, duration);
        case 'warning':
          return warning(title, message, duration);
        case 'info':
          return info(title, message, duration);
        default:
          return info(title, message, duration);
      }
    },
  };
};