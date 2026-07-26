import type { GetAuthenticatedUserResponse } from "@trinacria-cms/sdk";
import { useEffect, useState } from "react";
import type { TranslateFn } from "../lib/i18n.js";
import { cms } from "../runtime/cms-sdk.js";

type AuthenticatedUser = GetAuthenticatedUserResponse["data"];

export function useAuthenticatedRoleLabel(authUser: AuthenticatedUser | null, t: TranslateFn) {
  const [roleLabel, setRoleLabel] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthenticatedUserRole() {
      if (!authUser) {
        setRoleLabel(null);
        return;
      }

      try {
        const response = await cms.security.listUserRoles({
          path: { id: authUser.id }
        });
        if (!isMounted) {
          return;
        }
        const primaryRole = response.data[0]?.roleCode ?? null;
        setRoleLabel(
          primaryRole ? formatRoleLabel(primaryRole) : t("backoffice.user.role_fallback")
        );
      } catch {
        if (isMounted) {
          setRoleLabel(t("backoffice.user.role_fallback"));
        }
      }
    }

    void loadAuthenticatedUserRole();

    return () => {
      isMounted = false;
    };
  }, [authUser, t]);

  return roleLabel;
}

function formatRoleLabel(roleCode: string): string {
  return roleCode
    .trim()
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
