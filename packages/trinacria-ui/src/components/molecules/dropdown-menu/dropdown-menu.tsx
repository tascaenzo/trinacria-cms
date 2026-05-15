import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PropsWithChildren,
  type ReactElement
} from "react";
import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import { Icon } from "../../atoms/icon/icon.js";
import { cn } from "../../../utils/class-names.js";
import type {
  DropdownMenuItemProps,
  DropdownMenuLabelProps,
  DropdownMenuProps
} from "./dropdown-menu.types.js";

interface DropdownMenuContextValue {
  closeMenu: () => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useControllableOpen(
  open: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined
) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const isControlled = open !== undefined;
  const resolvedOpen = isControlled ? open : internalOpen;

  function setOpen(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  return [resolvedOpen, setOpen] as const;
}

export function DropdownMenu({
  align = "end",
  children,
  className,
  defaultOpen,
  onOpenChange,
  open,
  side = "bottom",
  trigger,
  ...props
}: PropsWithChildren<DropdownMenuProps>) {
  const [isOpen, setIsOpen] = useControllableOpen(open, defaultOpen, onOpenChange);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  function getEnabledItems() {
    if (!menuRef.current) {
      return [];
    }

    return Array.from(
      menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
    );
  }

  function focusItem(index: number) {
    const items = getEnabledItems();

    if (items.length === 0) {
      return;
    }

    items[(index + items.length) % items.length]?.focus();
  }

  function focusFirstItem() {
    focusItem(0);
  }

  function focusLastItem() {
    const items = getEnabledItems();

    if (items.length === 0) {
      return;
    }

    items[items.length - 1]?.focus();
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent | globalThis.MouseEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!rootRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      focusFirstItem();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = getEnabledItems();

    if (items.length === 0) {
      return;
    }

    const currentIndex = items.findIndex((item) => item === document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(currentIndex + 1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(currentIndex <= 0 ? items.length - 1 : currentIndex - 1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusFirstItem();
    }

    if (event.key === "End") {
      event.preventDefault();
      focusLastItem();
    }

    if (event.key === "Tab") {
      setIsOpen(false);
    }
  }

  const contextValue = useMemo<DropdownMenuContextValue>(
    () => ({
      closeMenu: () => setIsOpen(false)
    }),
    [setIsOpen]
  );

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)} {...props}>
      <DropdownTrigger
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        trigger={trigger}
        triggerRef={triggerRef}
        focusFirstItem={focusFirstItem}
        focusLastItem={focusLastItem}
      />
      {isOpen ? (
        <DropdownMenuContext.Provider value={contextValue}>
          <Panel
            className={cn(
              "absolute z-40 min-w-[220px] p-2 shadow-[var(--shadow-overlay)]",
              side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
              align === "start" ? "left-0" : "right-0"
            )}
            radius="xl"
          >
            <div
              ref={menuRef}
              role="menu"
              className="grid gap-1 outline-none"
              onKeyDown={handleMenuKeyDown}
            >
              {children}
            </div>
          </Panel>
        </DropdownMenuContext.Provider>
      ) : null}
    </div>
  );
}

function DropdownTrigger({
  isOpen,
  setIsOpen,
  trigger,
  triggerRef,
  focusFirstItem,
  focusLastItem
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  trigger: DropdownMenuProps["trigger"];
  triggerRef: { current: HTMLElement | null };
  focusFirstItem: () => void;
  focusLastItem: () => void;
}) {
  if (isValidElement(trigger)) {
    const element = trigger as ReactElement<{
      onClick?: (event: MouseEvent<HTMLElement>) => void;
      onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
      "aria-expanded"?: boolean;
      "aria-haspopup"?: string;
      ref?: unknown;
    }>;

    return cloneElement(element, {
      "aria-expanded": isOpen,
      "aria-haspopup": "menu",
      ref: (node: HTMLElement | null) => {
        triggerRef.current = node;
      },
      onClick: (event: MouseEvent<HTMLElement>) => {
        element.props.onClick?.(event);
        if (!event.defaultPrevented) {
          setIsOpen(!isOpen);
        }
      },
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        element.props.onKeyDown?.(event);

        if (event.defaultPrevented) {
          return;
        }

        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setIsOpen(true);
          window.requestAnimationFrame(() => focusFirstItem());
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setIsOpen(true);
          window.requestAnimationFrame(() => focusLastItem());
        }
      }
    });
  }

  return (
    <button
      ref={triggerRef as never}
      type="button"
      aria-expanded={isOpen}
      aria-haspopup="menu"
      onClick={() => setIsOpen(!isOpen)}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setIsOpen(true);
          window.requestAnimationFrame(() => focusFirstItem());
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setIsOpen(true);
          window.requestAnimationFrame(() => focusLastItem());
        }
      }}
      className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[color:var(--color-action-secondary-border)] bg-[color:var(--color-action-secondary-bg)] px-3 py-2 text-sm font-medium text-[color:var(--color-action-secondary-ink)] shadow-[var(--shadow-surface)] transition hover:bg-[color:var(--color-action-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface)]"
    >
      {trigger}
      <Icon name="chevron-down" className={cn("h-4 w-4 transition", isOpen && "rotate-180")} />
    </button>
  );
}

export function DropdownMenuLabel({ children, className, ...props }: DropdownMenuLabelProps) {
  return (
    <div
      className={cn(
        "px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className, ...props }: DropdownMenuLabelProps) {
  return (
    <div className={cn("my-1 border-t border-[color:var(--color-border)]", className)} {...props} />
  );
}

export function DropdownMenuItem({
  children,
  className,
  closeOnSelect = true,
  description,
  icon,
  onClick,
  title,
  tone = "neutral",
  ...props
}: PropsWithChildren<DropdownMenuItemProps>) {
  const context = useContext(DropdownMenuContext);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (!event.defaultPrevented && closeOnSelect) {
      context?.closeMenu();
    }
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-start gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-overlay-soft)]",
        tone === "neutral" &&
          "text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)] focus:bg-[color:var(--color-interactive-hover)] focus:text-[color:var(--color-ink)]",
        tone === "danger" &&
          "text-[color:var(--color-danger-ink)] hover:bg-[color:var(--color-danger-bg)] focus:bg-[color:var(--color-danger-bg)]",
        props.disabled && "cursor-not-allowed opacity-55",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {icon ? <Icon name={icon} className="mt-0.5" /> : null}
      <span className="min-w-0 flex-1">
        {title ? (
          <span className="block font-medium">{title}</span>
        ) : children ? (
          <span className="block font-medium">{children}</span>
        ) : null}
        {description ? <BodyText className="mt-0.5">{description}</BodyText> : null}
      </span>
    </button>
  );
}
