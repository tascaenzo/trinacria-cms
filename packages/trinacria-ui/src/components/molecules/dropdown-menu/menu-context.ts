import { createContext } from "react";

/** Menu owners decide how closing restores focus; items share the selection contract. */
export const MenuActionContext = createContext<{ closeMenu: () => void } | null>(null);
