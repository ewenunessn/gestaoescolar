import { toast, ToastOptions } from 'react-toastify';

// Configurações padrão para cada tipo de toast
const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

const successOptions: ToastOptions = {
  ...defaultOptions,
  autoClose: 3000,
};

const errorOptions: ToastOptions = {
  ...defaultOptions,
  autoClose: 6000,
};

const warningOptions: ToastOptions = {
  ...defaultOptions,
  autoClose: 5000,
};

const infoOptions: ToastOptions = {
  ...defaultOptions,
  autoClose: 4000,
};

export const useToast = () => {
  const api = {
    // Notificações básicas
    success: (message: string, options?: ToastOptions | string) =>
      toast.success(
        typeof options === 'string' ? `${message}: ${options}` : message,
        { ...successOptions, ...(typeof options === 'string' ? {} : options) }
      ),

    error: (message: string, options?: ToastOptions | string) =>
      toast.error(
        typeof options === 'string' ? `${message}: ${options}` : message,
        { ...errorOptions, ...(typeof options === 'string' ? {} : options) }
      ),

    warning: (message: string, options?: ToastOptions | string) =>
      toast.warning(
        typeof options === 'string' ? `${message}: ${options}` : message,
        { ...warningOptions, ...(typeof options === 'string' ? {} : options) }
      ),

    info: (message: string, options?: ToastOptions | string) =>
      toast.info(
        typeof options === 'string' ? `${message}: ${options}` : message,
        { ...infoOptions, ...(typeof options === 'string' ? {} : options) }
      ),

    // Notificações de sucesso específicas
    successSave: (message?: string) =>
      toast.success(message || "Salvo com sucesso!", successOptions),

    successDelete: (item?: string) =>
      toast.success(`${item || 'Item'} excluído com sucesso!`, successOptions),

    successCreate: (item?: string) =>
      toast.success(`${item || 'Item'} criado com sucesso!`, successOptions),

    successUpdate: (item?: string) =>
      toast.success(`${item || 'Item'} atualizado com sucesso!`, successOptions),

    // Notificações de erro específicas
    errorLoad: (item?: string) =>
      toast.error(`Erro ao carregar ${item || 'os dados'}. Tente novamente.`, errorOptions),

    errorSave: (message?: string) =>
      toast.error(message || "Erro ao salvar. Tente novamente.", errorOptions),

    errorDelete: (item?: string) =>
      toast.error(`Erro ao excluir ${item || 'o item'}. Tente novamente.`, errorOptions),

    errorNetwork: () =>
      toast.error("Erro de conexão. Verifique sua internet e tente novamente.", errorOptions),

    errorAuth: () =>
      toast.error("Sessão expirada. Faça login novamente.", errorOptions),

    // Notificações de aviso específicas
    warningUnsaved: () =>
      toast.warning("Você tem alterações não salvas. Salve antes de continuar.", warningOptions),

    warningRequired: (fields?: string) =>
      toast.warning(`${fields || 'Alguns campos'} são obrigatórios.`, warningOptions),

    warningLimit: (limit?: string) =>
      toast.warning(`${limit || 'Limite'} foi atingido.`, warningOptions),

    // Notificações de informação específicas
    infoProcessing: (action?: string) =>
      toast.info(`${action || 'Operação'} está sendo processada...`, infoOptions),

    infoNoData: (item?: string) =>
      toast.info(`Nenhum ${item || 'resultado'} encontrado.`, infoOptions),

    // Função genérica para compatibilidade
    showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, options?: ToastOptions) => {
      switch (type) {
        case 'success':
          return toast.success(message, { ...successOptions, ...options });
        case 'error':
          return toast.error(message, { ...errorOptions, ...options });
        case 'warning':
          return toast.warning(message, { ...warningOptions, ...options });
        case 'info':
          return toast.info(message, { ...infoOptions, ...options });
        default:
          return toast(message, { ...defaultOptions, ...options });
      }
    },

    // Funções utilitárias
    dismiss: (toastId?: string | number) => toast.dismiss(toastId),
    dismissAll: () => toast.dismiss(),

    // Promise toast para operações assíncronas
    promise: <T>(
      promise: Promise<T>,
      messages: {
        pending: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      },
      options?: ToastOptions
    ) =>
      toast.promise(
        promise,
        {
          pending: messages.pending,
          success:
            typeof messages.success === 'function'
              ? { render: ({ data }) => (messages.success as (d: T) => string)(data as T) }
              : messages.success,
          error:
            typeof messages.error === 'function'
              ? { render: ({ data }) => (messages.error as (e: any) => string)(data) }
              : messages.error,
        },
        { ...defaultOptions, ...options }
      ),
  };

  // Compatibilidade: algumas telas esperam `toast.toast.success(...)`
  return { ...api, toast: api };
};
