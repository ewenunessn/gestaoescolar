/**
 * BaseDialog Component
 * 
 * Eliminates ~1,500-2,000 lines of duplicated Dialog boilerplate across the codebase.
 * All dialogs share consistent styling, padding, and behavior.
 * 
 * Usage:
 * ```tsx
 * // Simple form dialog
 * <FormDialog
 *   open={dialogOpen}
 *   onClose={() => setDialogOpen(false)}
 *   title="Novo Produto"
 *   onSave={handleSave}
 *   loading={saving}
 * >
 *   <TextField label="Nome" value={nome} onChange={e => setNome(e.target.value)} />
 * </FormDialog>
 * 
 * // Confirmation dialog
 * <ConfirmDialog
 *   open={confirmOpen}
 *   onClose={() => setConfirmOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Excluir Produto"
 *   message="Tem certeza que deseja excluir este produto?"
 *   loading={deleting}
 * />
 * ```
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  CircularProgress,
} from '@mui/material';
import { Close as CloseIcon, Warning as WarningIcon } from '@mui/icons-material';

// ==================== Base Dialog ====================

interface BaseDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Dialog width (default: 'sm') */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show close button in title (default: true) */
  showCloseButton?: boolean;
  /** Custom title icon */
  icon?: React.ReactNode;
}

export const BaseDialog: React.FC<BaseDialogProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'sm',
  showCloseButton = true,
  icon,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: { borderRadius: '12px' },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, pr: showCloseButton ? 6 : 2 }}>
        {icon}
        {title}
        {showCloseButton && (
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'text.secondary',
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {children}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

// ==================== Form Dialog ====================

interface FormDialogProps extends Omit<BaseDialogProps, 'children' | 'icon'> {
  children: React.ReactNode;
  onSave: () => void;
  loading?: boolean;
  /** Save button text (default: 'Salvar') */
  saveLabel?: string;
  /** Cancel button text (default: 'Cancelar') */
  cancelLabel?: string;
  /** Disable save button */
  disableSave?: boolean;
  /** Hide cancel button */
  hideCancel?: boolean;
  /** Custom save button variant */
  saveColor?: 'primary' | 'error' | 'warning' | 'success';
}

export const FormDialog: React.FC<FormDialogProps> = ({
  onSave,
  loading = false,
  saveLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  disableSave = false,
  hideCancel = false,
  saveColor = 'primary',
  ...baseProps
}) => {
  return (
    <BaseDialog {...baseProps}>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        {!hideCancel && (
          <Button onClick={baseProps.onClose} sx={{ color: 'text.secondary' }}>
            {cancelLabel}
          </Button>
        )}
        <Button
          onClick={onSave}
          variant="contained"
          color={saveColor}
          disabled={loading || disableSave}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Salvando...' : saveLabel}
        </Button>
      </DialogActions>
    </BaseDialog>
  );
};

// ==================== Confirm Dialog ====================

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  loading?: boolean;
  /** Confirmation button text (default: 'Confirmar') */
  confirmLabel?: string;
  /** Cancel button text (default: 'Cancelar') */
  cancelLabel?: string;
  /** Severity level (default: 'warning') */
  severity?: 'warning' | 'error' | 'info' | 'success';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading = false,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  severity = 'warning',
}) => {
  const severityColors: Record<string, 'warning' | 'error' | 'primary'> = {
    warning: 'warning',
    error: 'error',
    info: 'primary',
    success: 'primary',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: '12px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color={severityColors[severity]} />
        {title}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {typeof message === 'string' ? (
          <Typography>{message}</Typography>
        ) : (
          message
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={severityColors[severity]}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Processando...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==================== Details Dialog ====================

interface DetailsDialogProps extends Omit<BaseDialogProps, 'children'> {
  children: React.ReactNode;
  /** Hide close button */
  hideCloseButton?: boolean;
}

export const DetailsDialog: React.FC<DetailsDialogProps> = ({
  children,
  hideCloseButton = false,
  ...baseProps
}) => {
  return (
    <BaseDialog
      {...baseProps}
      showCloseButton={!hideCloseButton}
      maxWidth="md"
    >
      {children}
    </BaseDialog>
  );
};
