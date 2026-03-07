import { useEffect, type PropsWithChildren, type ReactNode } from "react";
import { Button } from "./button.js";
import { cn } from "../utils/class-names.js";

export interface DialogProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  width?: "md" | "lg" | "xl";
}

/**
 * Dialog is a lightweight in-repo modal primitive used for admin create/edit
 * flows without introducing an external headless UI dependency.
 */
export function Dialog({
  children,
  description,
  footer,
  onClose,
  open,
  title,
  width = "lg",
}: DialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/48 px-4 py-6 backdrop-blur-[2px]">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[0_32px_96px_rgba(15,23,42,0.18)]",
          width === "md" && "max-w-2xl",
          width === "lg" && "max-w-4xl",
          width === "xl" && "max-w-6xl",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--color-border)] px-6 py-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-ink-subtle)]">
              Modal
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">{title}</h2>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--color-ink-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className="max-h-[70vh] overflow-auto px-6 py-5">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
