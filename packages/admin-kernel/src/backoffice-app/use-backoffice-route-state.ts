import { useCallback, useEffect, useState } from "react";
import {
  getBackofficeNavigationEventName,
  readBackofficeNavigationState,
  writeBackofficeNavigationState
} from "../runtime/backoffice-navigation-state.js";

export function useBackofficeRouteState(defaultRouteId = "dashboard") {
  const [navigationState, setNavigationState] = useState(() => {
    const current = readBackofficeNavigationState();
    return {
      routeId: current.routeId ?? defaultRouteId,
      params: current.params.toString()
    };
  });

  useEffect(() => {
    function handleNavigationChange() {
      const current = readBackofficeNavigationState();
      setNavigationState({
        routeId: current.routeId ?? defaultRouteId,
        params: current.params.toString()
      });
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
  }, []);

  return [navigationState.routeId, navigationState.params, navigateTo] as const;
}
