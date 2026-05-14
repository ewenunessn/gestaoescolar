import { useEffect } from "react";
import { CheckCircleIcon, MoreVerticalIcon, XCircleIcon } from "../icons";
import { cn } from "../../lib/utils";

export type ToastVariant = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
};

const variantClasses: Record<ToastVariant, string> = {
  success: "text-[#39c85a]",
  error: "text-[#ff6f7d]",
  info: "text-primary",
};

export function Toaster({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) => window.setTimeout(() => onDismiss(toast.id), 4500));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-32px)] max-w-[365px] flex-col-reverse gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="overflow-hidden rounded-lg border border-border bg-[var(--color-surface-raised)] text-foreground shadow-2xl shadow-black/35 backdrop-blur">
          <div className="flex min-h-[112px] flex-col">
            <div className="flex items-center gap-2 border-b border-transparent px-4 pt-3 text-xs text-muted-foreground">
              <div className={cn("grid size-5 shrink-0 place-items-center", variantClasses[toast.variant])}>
                {toast.variant === "error" ? <XCircleIcon className="size-4" /> : <CheckCircleIcon className="size-4" />}
              </div>
              <strong className="min-w-0 flex-1 truncate font-semibold text-foreground">NutriLog</strong>
              <button type="button" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Mais opcoes">
                <MoreVerticalIcon className="size-4" />
              </button>
              <button type="button" className="grid size-7 place-items-center rounded-md text-xl leading-none text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onDismiss(toast.id)} aria-label="Fechar">
                x
              </button>
            </div>
            <div className="px-4 pb-4 pt-3">
              <strong className="block text-sm font-semibold leading-5 text-foreground">{toast.title}</strong>
              {toast.description && <p className="mt-1 line-clamp-3 text-sm leading-5 text-muted-foreground">{toast.description}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
