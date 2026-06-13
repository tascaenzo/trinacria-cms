import { useEffect, useState } from "react";
import type { AdminJsonDataBinding } from "../../contracts.js";
import { toDisplayError } from "../../lib/sdk-errors.js";
import { validateAdminEndpointBinding } from "../../runtime/admin-endpoint-policy.js";
import { cms } from "../../runtime/cms-sdk.js";
import type { DeclarativeDataController, DeclarativeDataState } from "../types.js";

export function useDeclarativeData(
  binding: AdminJsonDataBinding | undefined
): DeclarativeDataController {
  const endpoint = binding?.endpoint;
  const [state, setState] = useState<DeclarativeDataState>({ status: "idle" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!endpoint) {
      setState({ status: "idle" });
      return;
    }

    const policyResult = validateAdminEndpointBinding(endpoint, "data");
    if (!policyResult.ok) {
      setState({
        status: "error",
        error: policyResult.reason ?? "Declarative endpoint rejected by admin security policy"
      });
      return;
    }

    let isMounted = true;
    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : undefined;

    setState({ status: "loading" });
    cms
      .request({
        method: endpoint.method ?? "GET",
        path: endpoint.path,
        signal: controller?.signal
      })
      .then((data) => {
        if (isMounted) {
          setState({ status: "success", data });
        }
      })
      .catch((error) => {
        if (isMounted && !isAbortError(error)) {
          setState({ status: "error", error: toDisplayError(error) });
        }
      });

    return () => {
      isMounted = false;
      controller?.abort();
    };
  }, [endpoint?.method, endpoint?.path, reloadToken]);

  return {
    ...state,
    refetch: () => setReloadToken((value) => value + 1)
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
