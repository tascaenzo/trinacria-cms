import {
  type CSSProperties,
  cloneElement,
  createContext,
  isValidElement,
  type MouseEvent,
  type PropsWithChildren,
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { useControllableState } from "../../../hooks/use-controllable-state.js";
import { cn } from "../../../utils/class-names.js";
import { Icon } from "../../atoms/icon/icon.js";
import { OverlaySurface } from "../../primitives/overlay-surface/overlay-surface.js";
import { BodyText } from "../../primitives/text/text.js";
import type {
  DropdownMenuItemProps,
  DropdownMenuLabelProps,
  DropdownMenuProps
} from "./dropdown-menu.types.js";

interface DropdownMenuContextValue {
  closeMenu: () => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(value);
    return;
  }

  ref.current = value;
}

function composeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (value: T | null) => {
    for (const ref of refs) {
      assignRef(ref, value);
    }
  };
}

export function DropdownMenu({
  align = "end",
  children,
  className,
  contentClassName,
  defaultOpen,
  onOpenChange,
  open,
  side = "bottom",
  trigger,
  ...props
}: PropsWithChildren<DropdownMenuProps>) {
  const [isOpen, setIsOpen] = useControllableState(open, defaultOpen ?? false, onOpenChange);
  const shouldMatchTriggerWidth =
    typeof contentClassName === "string" && contentClassName.split(/\s+/).includes("w-full");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | undefined>();

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

      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
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

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuStyle(undefined);
      return;
    }

    function updatePosition() {
      const triggerRect = triggerRef.current?.getBoundingClientRect();

      if (!triggerRect) {
        return;
      }

      setMenuStyle({
        ...(shouldMatchTriggerWidth ? { width: triggerRect.width } : undefined),
        minWidth: shouldMatchTriggerWidth ? Math.max(220, triggerRect.width) : 220,
        ...(side === "bottom"
          ? { top: triggerRect.bottom + 8 }
          : { bottom: window.innerHeight - triggerRect.top + 8 }),
        ...(align === "start"
          ? { left: triggerRect.left }
          : { right: window.innerWidth - triggerRect.right })
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, isOpen, shouldMatchTriggerWidth, side]);

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
      {isOpen
        ? renderMenuPortal(
            <DropdownMenuContext.Provider value={contextValue}>
              <OverlaySurface
                className={cn("fixed z-50 min-w-[220px] p-2", contentClassName)}
                style={menuStyle}
              >
                <div
                  ref={menuRef}
                  role="menu"
                  className="grid gap-1 outline-none"
                  onKeyDown={handleMenuKeyDown}
                >
                  {children}
                </div>
              </OverlaySurface>
            </DropdownMenuContext.Provider>
          )
        : null}
    </div>
  );
}

function renderMenuPortal(menu: ReactElement) {
  if (typeof document === "undefined") {
    return menu;
  }

  return createPortal(menu, document.body);
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
      ref?: Ref<HTMLElement>;
    }>;
    const composedTriggerRef = composeRefs(element.props.ref, (node: HTMLElement | null) => {
      triggerRef.current = node;
    });

    return cloneElement(element, {
      "aria-expanded": isOpen,
      "aria-haspopup": "menu",
      ref: composedTriggerRef,
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
