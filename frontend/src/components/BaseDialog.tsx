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
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  CircularProgress,
  useTheme,
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

const BaseDialogInternal: React.FC<BaseDialogProps & { actions?: React.ReactNode }> = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'sm',
  showCloseButton = true,
  icon,
  actions,
}) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.palette.mode === 'light' ? '0 14px 32px rgba(31,36,48,0.08)' : '0 16px 36px rgba(0,0,0,0.22)',
        },
      }}
    >
      <DialogTitle sx={{
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        pr: showCloseButton ? 6 : 2,
        pb: 1.25,
        borderBottom: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.08 : 0.1)}`,
      }}>
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
      <DialogContent sx={{ pt: 2.25 }}>
        {children}
      </DialogContent>
      {actions}
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
  saveColor?: 'primary' | 'error' | 'warning' | 'success' | 'add' | 'edit' | 'delete';
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
  const actions = (
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
  );

  return (
    <BaseDialogInternal {...baseProps} actions={actions}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {baseProps.children}
      </Box>
    </BaseDialogInternal>
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
  const theme = useTheme();
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
      PaperProps={{
        sx: {
          borderRadius: '12px',
          border: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderBottom: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.08 : 0.1)}`,
        pb: 1.25,
      }}>
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
    <BaseDialogInternal
      {...baseProps}
      showCloseButton={!hideCloseButton}
      maxWidth="md"
    >
      {children}
    </BaseDialogInternal>
  );
};

// Re-export BaseDialog for backward compatibility
export const BaseDialog = BaseDialogInternal;
