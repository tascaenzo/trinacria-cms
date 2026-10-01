import { type RefObject, useLayoutEffect, useState } from "react";
export function useThemePortalContainer(anchor: RefObject<HTMLElement | null>) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const themeRoot = anchor.current?.closest<HTMLElement>("[data-trinacria-admin-theme]");
    setContainer(themeRoot && themeRoot !== document.documentElement ? themeRoot : document.body);
  }, [anchor]);
  return container;
}
