import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import { Button } from "../../atoms/button/button.js";
import { Icon } from "../../atoms/icon/icon.js";
import { Eyebrow } from "../../primitives/eyebrow/eyebrow.js";
import { OverlaySurface } from "../../primitives/overlay-surface/overlay-surface.js";
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
  closeShortcutLabel = "Esc",
  closeVariant = "button",
  footer,
  onClose,
  open,
  title,
  variant = "modal",
  width = "lg"
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
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setShouldRender(true);
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setIsActive(true);
          const focusables = getFocusableElements(dialogRef.current);
          (focusables[0] ?? closeButtonRef.current)?.focus();
        });
      });
      return () => {
        window.cancelAnimationFrame(frame);
        document.body.style.overflow = previousOverflow;
      };
    }

    setIsActive(false);
    const exitDurationMs = variant === "drawer" ? 520 : 220;
    const timeout = window.setTimeout(() => {
      setShouldRender(false);
      previousFocusRef.current?.focus();
    }, exitDurationMs);

    return () => window.clearTimeout(timeout);
  }, [open, variant]);

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
        "fixed inset-0 z-50 transition-all",
        variant === "modal" && "duration-200 ease-out",
        variant === "drawer" && "duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        variant === "modal" && "flex items-center justify-center px-4 py-6",
        variant === "drawer" && "flex items-stretch justify-end",
        isActive
          ? "bg-[color:var(--color-overlay)] backdrop-blur-[2px]"
          : "bg-transparent backdrop-blur-none"
      )}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <OverlaySurface
        ref={dialogRef}
        variant={variant === "drawer" ? "drawer" : "modal"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative z-10 w-full overflow-hidden transition-[opacity,transform] will-change-transform",
          variant === "modal" && "duration-200 ease-out",
          variant === "drawer" && "transform-gpu duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          variant === "modal" && width === "md" && "max-w-2xl",
          variant === "modal" && width === "lg" && "max-w-4xl",
          variant === "modal" && width === "xl" && "max-w-6xl",
          variant === "modal" &&
            width === "fullscreen" &&
            "flex h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex-col",
          variant === "drawer" &&
            "ml-auto flex h-full max-w-[640px] flex-col rounded-none border-y-0 border-r-0",
          variant === "modal" &&
            (isActive
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-[0.985] opacity-0"),
          variant === "drawer" &&
            (isActive ? "translate-x-0 opacity-100" : "translate-x-full opacity-0")
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
          {closeVariant === "icon" ? (
            <div className="flex shrink-0 items-center gap-2">
              <kbd className="hidden rounded border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] px-1.5 py-0.5 text-[10px] font-medium leading-none text-[color:var(--color-ink-subtle)] shadow-[var(--shadow-sm)] sm:inline-flex">
                {closeShortcutLabel}
              </kbd>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-ink-muted)] transition hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-focus)]"
                aria-label={closeLabel}
                title={closeLabel}
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button ref={closeButtonRef} variant="secondary" className="shrink-0" onClick={onClose}>
              {closeLabel}
            </Button>
          )}
        </header>
        <div
          className={cn(
            "overflow-auto px-6 py-5",
            variant === "modal" && width !== "fullscreen" && "max-h-[70vh]",
            variant === "modal" && width === "fullscreen" && "min-h-0 flex-1 p-0",
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
      </OverlaySurface>
    </div>
  );
}
