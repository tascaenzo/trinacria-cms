import { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";
import { Button } from "./button.js";
import { cn } from "../utils/class-names.js";

export interface DialogProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  width?: "md" | "lg" | "xl";
  variant?: "modal" | "drawer";
  eyebrow?: string;
  closeLabel?: string;
}

/**
 * Dialog is a lightweight in-repo modal primitive used for admin create/edit
 * flows without introducing an external headless UI dependency.
 */
export function Dialog({
  children,
  description,
  eyebrow,
  closeLabel = "Close",
  footer,
  onClose,
  open,
  title,
  variant = "modal",
  width = "lg",
}: DialogProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, shouldRender]);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const frame = window.requestAnimationFrame(() => {
        setIsActive(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setIsActive(false);
    const timeout = window.setTimeout(() => {
      setShouldRender(false);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [open]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-all duration-200 ease-out",
        variant === "modal" && "flex items-center justify-center px-4 py-6",
        variant === "drawer" && "flex items-stretch justify-end",
        isActive ? "bg-slate-950/48 backdrop-blur-[2px]" : "bg-slate-950/0 backdrop-blur-none"
      )}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[0_32px_96px_rgba(15,23,42,0.18)] transition-all duration-200 ease-out",
          variant === "modal" && "rounded-2xl",
          variant === "modal" && width === "md" && "max-w-2xl",
          variant === "modal" && width === "lg" && "max-w-4xl",
          variant === "modal" && width === "xl" && "max-w-6xl",
          variant === "drawer" &&
            "ml-auto flex h-full max-w-[640px] flex-col rounded-none border-y-0 border-r-0 shadow-[-24px_0_80px_rgba(15,23,42,0.18)]",
          variant === "modal" &&
            (isActive
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-[0.985] opacity-0"),
          variant === "drawer" &&
            (isActive ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"),
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--color-border)] px-6 py-5">
          <div>
            {eyebrow ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-ink-subtle)]">
                {eyebrow}
              </p>
            ) : null}
            <h2
              className={cn(
                "text-lg font-semibold text-[color:var(--color-ink)]",
                eyebrow ? "mt-2" : undefined
              )}
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--color-ink-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          <Button
            variant="secondary"
            className="shrink-0 border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100"
            onClick={onClose}
          >
            {closeLabel}
          </Button>
        </header>
        <div
          className={cn(
            "overflow-auto px-6 py-5",
            variant === "modal" && "max-h-[70vh]",
            variant === "drawer" && "min-h-0 flex-1"
          )}
        >
          {children}
        </div>
        {footer ? (
          <footer
            className={cn(
              "flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] px-6 py-4",
              variant === "drawer" && "mt-auto"
            )}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
