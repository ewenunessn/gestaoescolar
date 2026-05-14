import { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Dialog({
  open,
  title,
  description,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="w-full max-w-[460px] rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
        <h2 id="dialog-title" className="text-lg font-bold text-foreground">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>}
        {children}
      </div>
    </div>
  );
}

export function DialogActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-6 flex items-center justify-end gap-3", className)}>{children}</div>;
}
