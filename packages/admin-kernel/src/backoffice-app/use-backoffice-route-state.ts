import { useCallback, useEffect, useState } from "react";
import {
  getBackofficeNavigationEventName,
  readBackofficeNavigationState,
  writeBackofficeNavigationState
} from "../runtime/backoffice-navigation-state.js";

export function useBackofficeRouteState(defaultRouteId = "dashboard") {
  const [activeRouteId, setActiveRouteId] = useState<string>(
    readBackofficeNavigationState().routeId ?? defaultRouteId
  );

  useEffect(() => {
    function handleNavigationChange() {
      setActiveRouteId(readBackofficeNavigationState().routeId ?? defaultRouteId);
    }

    const navigationEventName = getBackofficeNavigationEventName();
    window.addEventListener(navigationEventName, handleNavigationChange);
    window.addEventListener("popstate", handleNavigationChange);
    return () => {
      window.removeEventListener(navigationEventName, handleNavigationChange);
      window.removeEventListener("popstate", handleNavigationChange);
    };
  }, [defaultRouteId]);

  const navigateTo = useCallback((routeId: string, params?: URLSearchParams) => {
    writeBackofficeNavigationState(routeId, params);
    setActiveRouteId(routeId);
  }, []);

  return [activeRouteId, navigateTo] as const;
}
