/**
 * useCrudForm Hook
 * 
 * Eliminates ~300-350 lines of duplicated form state management across CRUD pages.
 * Handles form data, onChange, save/cancel/reset, and toast notifications.
 * 
 * Usage:
 * ```typescript
 * const {
 *   formData,
 *   handleChange,
 *   handleSave,
 *   handleReset,
 *   saving
 * } = useCrudForm<Produto, ProdutoCreate>({
 *   initialData: { nome: '', unidade: 'UN', ativo: true },
 *   createService: (data) => produtoService.criar(data),
 *   updateService: (id, data) => produtoService.atualizar(id, data),
 *   successMessage: 'Produto salvo com sucesso!',
 *   onClose: () => setDialogOpen(false)
 * });
 * ```
 */

import { useState, useCallback } from 'react';
import { useToast } from './useToast';

interface UseCrudFormOptions<TCreate, TDetail> {
  /** Initial form data (used when creating new) */
  initialData: TCreate;
  /** Service function to create entity */
  createService?: (data: TCreate) => Promise<TDetail>;
  /** Service function to update entity */
  updateService?: (id: number, data: Partial<TCreate>) => Promise<TDetail>;
  /** Success message for create */
  createMessage?: string;
  /** Success message for update */
  updateMessage?: string;
  /** Callback after successful save */
  onSuccess?: (data: TDetail) => void;
  /** Callback to close dialog */
  onClose?: () => void;
  /** Optional validation function */
  validate?: (data: TCreate) => string | null;
}

export function useCrudForm<TCreate extends Record<string, any>, TDetail = any>(
  options: UseCrudFormOptions<TCreate, TDetail>
) {
  const {
    initialData,
    createService,
    updateService,
    createMessage = 'Criado com sucesso!',
    updateMessage = 'Atualizado com sucesso!',
    onSuccess,
    onClose,
    validate,
  } = options;

  const toast = useToast();
  const [formData, setFormData] = useState<TCreate>(initialData);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback((field: keyof TCreate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFieldChange = useCallback((field: keyof TCreate) => (value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setFormData(initialData);
    setEditingId(null);
  }, [initialData]);

  const handleClose = useCallback(() => {
    handleReset();
    onClose?.();
  }, [handleReset, onClose]);

  const handleSave = useCallback(async () => {
    // Validation
    if (validate) {
      const error = validate(formData);
      if (error) {
        toast.error(error);
        return;
      }
    }

    setSaving(true);

    try {
      let result: TDetail;

      if (editingId && updateService) {
        // Update existing
        result = await updateService(editingId, formData);
        toast.success(updateMessage);
      } else if (createService) {
        // Create new
        result = await createService(formData);
        toast.success(createMessage);
      } else {
        throw new Error('Nenhum serviço de create/update fornecido');
      }

      onSuccess?.(result);
      handleClose();
      return result;
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [formData, editingId, createService, updateService, createMessage, updateMessage, onSuccess, handleClose, toast, validate]);

  const setEditMode = useCallback((id: number, data: TCreate) => {
    setEditingId(id);
    setFormData(data);
  }, []);

  return {
    formData,
    setFormData,
    handleChange,
    handleFieldChange,
    handleSave,
    handleReset,
    handleClose,
    setEditMode,
    editingId,
    saving,
    isEditing: editingId !== null,
  };
}
