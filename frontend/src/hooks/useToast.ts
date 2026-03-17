import { useToastify } from './useToastify';

export const useToast = () => {
  const toastify = useToastify();
  
  return {
    // Notificações de sucesso
    successSave: (message?: string) => 
      toastify.success(message || "Salvo com sucesso!"),
    
    successDelete: (item?: string) => 
      toastify.success(`${item || 'Item'} excluído com sucesso!`),
    
    successCreate: (item?: string) => 
      toastify.success(`${item || 'Item'} criado com sucesso!`),
    
    successUpdate: (item?: string) => 
      toastify.success(`${item || 'Item'} atualizado com sucesso!`),

    // Notificações de erro
    errorLoad: (item?: string) => 
      toastify.error(`Erro ao carregar ${item || 'os dados'}. Tente novamente.`),
    
    errorSave: (message?: string) => 
      toastify.error(message || "Erro ao salvar. Tente novamente."),
    
    errorDelete: (item?: string) => 
      toastify.error(`Erro ao excluir ${item || 'o item'}. Tente novamente.`),
    
    errorNetwork: () => 
      toastify.error("Erro de conexão. Verifique sua internet e tente novamente."),
    
    errorAuth: () => 
      toastify.error("Sessão expirada. Faça login novamente."),

    // Notificações de aviso
    warningUnsaved: () => 
      toastify.warning("Você tem alterações não salvas. Salve antes de continuar."),
    
    warningRequired: (fields?: string) => 
      toastify.warning(`${fields || 'Alguns campos'} são obrigatórios.`),
    
    warningLimit: (limit?: string) => 
      toastify.warning(`${limit || 'Limite'} foi atingido.`),

    // Notificações de informação
    infoProcessing: (action?: string) => 
      toastify.info(`${action || 'Operação'} está sendo processada...`),
    
    infoNoData: (item?: string) => 
      toastify.info(`Nenhum ${item || 'resultado'} encontrado.`),

    // Funções diretas para casos customizados
    success: (title: string, message?: string) => {
      const fullMessage = message ? `${title}: ${message}` : title;
      return toastify.success(fullMessage);
    },
    error: (title: string, message?: string) => {
      const fullMessage = message ? `${title}: ${message}` : title;
      return toastify.error(fullMessage);
    },
    warning: (title: string, message?: string) => {
      const fullMessage = message ? `${title}: ${message}` : title;
      return toastify.warning(fullMessage);
    },
    info: (title: string, message?: string) => {
      const fullMessage = message ? `${title}: ${message}` : title;
      return toastify.info(fullMessage);
    },
    
    // Função genérica showToast para compatibilidade
    showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
      const fullMessage = message ? `${title}: ${message}` : title;
      return toastify.showToast(type, fullMessage);
    },

    // Expor todas as funções do toastify
    ...toastify,
  };
};