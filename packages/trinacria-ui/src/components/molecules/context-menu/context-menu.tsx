import {
  type PropsWithChildren,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { useThemePortalContainer } from "../../../hooks/use-theme-portal-container.js";
import { focusMenuItem, navigateMenu } from "../../../utils/menu-navigation.js";
import { OverlaySurface } from "../../primitives/overlay-surface/overlay-surface.js";
import { MenuActionContext } from "../dropdown-menu/menu-context.js";
import type { ContextMenuProps } from "./context-menu.types.js";

export {
  DropdownMenuItem as ContextMenuItem,
  DropdownMenuSeparator as ContextMenuSeparator
} from "../dropdown-menu/dropdown-menu.js";

/** An anchored menu with shared menu items, keyboard navigation and viewport bounds. */
export function ContextMenu({
  children,
  label,
  x,
  y,
  onClose
}: PropsWithChildren<ContextMenuProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const portalContainer = useThemePortalContainer(anchorRef);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const contextValue = useMemo(() => ({ closeMenu: () => closeRef.current() }), []);
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    if (!portalContainer) return;
    const rect = ref.current?.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - (rect?.width ?? 224) - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - (rect?.height ?? 0) - 8))
    });
  }, [x, y, portalContainer]);
  useEffect(() => {
    if (!portalContainer) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    focusMenuItem(ref.current, 0);
    const dismiss = (event: MouseEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) closeRef.current();
    };
    const close = () => closeRef.current();
    document.addEventListener("mousedown", dismiss);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
      if (previous?.isConnected) previous.focus();
    };
  }, [portalContainer]);
  const menu = (
    <OverlaySurface
      ref={ref}
      role="menu"
      aria-label={label}
      className="fixed z-[70] w-56 p-1"
      style={position}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Tab") {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
          }
          closeRef.current();
          return;
        }
        navigateMenu(ref.current, event);
      }}
    >
      {children}
    </OverlaySurface>
  );
  return (
    <>
      <span ref={anchorRef} hidden />
      {portalContainer
        ? createPortal(
            <MenuActionContext.Provider value={contextValue}>{menu}</MenuActionContext.Provider>,
            portalContainer
          )
        : null}
    </>
  );
}
