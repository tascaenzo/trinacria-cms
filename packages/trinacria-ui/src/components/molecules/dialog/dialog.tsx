import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PropsWithChildren, type ReactNode } from "react";
import { Button } from "../../atoms/button/button.js";
import { Eyebrow } from "../../primitives/eyebrow/eyebrow.js";
import { BodyText } from "../../primitives/text/text.js";
import { cn } from "../../../utils/class-names.js";
import type { DialogProps } from "./dialog.types.js";

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("aria-hidden"));
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
  const titleId = useId().replace(/:/g, "");
  const descriptionId = `${titleId}-description`;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setShouldRender(true);
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const frame = window.requestAnimationFrame(() => {
        setIsActive(true);
        const focusables = getFocusableElements(dialogRef.current);
        (focusables[0] ?? closeButtonRef.current)?.focus();
      });
      return () => {
        window.cancelAnimationFrame(frame);
        document.body.style.overflow = previousOverflow;
      };
    }

    setIsActive(false);
    const timeout = window.setTimeout(() => {
      setShouldRender(false);
      previousFocusRef.current?.focus();
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [open]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const focusables = getFocusableElements(dialogRef.current);
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;

    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-all duration-200 ease-out",
        variant === "modal" && "flex items-center justify-center px-4 py-6",
        variant === "drawer" && "flex items-stretch justify-end",
        isActive ? "bg-[color:var(--color-overlay)] backdrop-blur-[2px]" : "bg-transparent backdrop-blur-none"
      )}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={handleKeyDown}
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
            {eyebrow ? <Eyebrow className="tracking-[0.18em]">{eyebrow}</Eyebrow> : null}
            <h2
              id={titleId}
              className={cn(
                "text-lg font-semibold text-[color:var(--color-ink)]",
                eyebrow ? "mt-2" : undefined
              )}
            >
              {title}
            </h2>
            {description ? (
              <BodyText id={descriptionId} className="mt-2 max-w-2xl">
                {description}
              </BodyText>
            ) : null}
          </div>
          <Button
            ref={closeButtonRef}
            variant="secondary"
            className="shrink-0"
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
