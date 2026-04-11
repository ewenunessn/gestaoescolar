/**
 * usePopover Hook
 * 
 * Eliminates ~100-150 lines of duplicated anchorEl state management
 * across components that use menus, popovers, and dropdowns.
 * 
 * Usage:
 * ```typescript
 * const popover = usePopover();
 * 
 * // Open
 * <IconButton onClick={popover.open}>
 * 
 * // Menu/Popover
 * <Menu anchorEl={popover.anchorEl} open={popover.isOpen} onClose={popover.close}>
 * ```
 */

import { useState, useCallback } from 'react';

export function usePopover() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const close = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const toggle = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(prev => (prev ? null : event.currentTarget));
  }, []);

  return {
    anchorEl,
    isOpen: Boolean(anchorEl),
    open,
    close,
    toggle,
  };
}

/**
 * usePopoverWithState Hook
 * 
 * Extended version that tracks which item is open (for lists with multiple popovers).
 * 
 * Usage:
 * ```typescript
 * const popover = usePopoverWithState<number>();
 * 
 * // Open for specific item
 * <IconButton onClick={() => popover.openFor(item.id)}>
 * 
 * // Check if specific item is open
 * {popover.isOpenFor(item.id) && <Menu ...>}
 * ```
 */

export function usePopoverWithState<T = number>() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeId, setActiveId] = useState<T | null>(null);

  const openFor = useCallback((id: T) => (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setActiveId(id);
  }, []);

  const close = useCallback(() => {
    setAnchorEl(null);
    setActiveId(null);
  }, []);

  const isOpenFor = useCallback((id: T) => {
    return Boolean(anchorEl && activeId === id);
  }, [anchorEl, activeId]);

  return {
    anchorEl,
    activeId,
    isOpen: Boolean(anchorEl),
    isOpenFor,
    openFor,
    close,
  };
}
