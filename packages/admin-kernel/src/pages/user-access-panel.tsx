import type { ListRolesResponse, ListUserRolesResponse } from "@trinacria-cms/sdk";
import { Badge, Button, Dialog, InfoCard, Panel, Select } from "@trinacria-cms/trinacria-ui";
import { useCallback, useEffect, useState } from "react";
import type { TranslateFn } from "../lib/i18n.js";
import { toDisplayError } from "../lib/sdk-errors.js";
import { cms } from "../runtime/cms-sdk.js";

/** Official Core detail extension; all writes remain authorized by the backend. */
export function UserAccessPanel({ userId, t }: { userId: string; t: TranslateFn }) {
  const [assignments, setAssignments] = useState<ListUserRolesResponse["data"]>([]);
  const [roles, setRoles] = useState<ListRolesResponse["data"]>([]);
  const [permissions, setPermissions] = useState<readonly string[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [roleCode, setRoleCode] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const actor = await cms.auth.getAuthenticatedUser();
    const [assigned, effective, actorPermissions] = await Promise.all([
      cms.security.listUserRoles({ path: { id: userId } }),
      cms.security.listUserEffectivePermissions({ path: { id: userId } }),
      cms.security.listUserEffectivePermissions({ path: { id: actor.data.id } })
    ]);
    const allowed = [
      "core-pack:users:write",
      "core-pack:roles:write",
      "core-pack:roles:read"
    ].every((permission) => actorPermissions.data.includes(permission));
    const catalog: ListRolesResponse["data"] = [];
    if (allowed) {
      for (let offset = 0; ; offset += 200) {
        const page = await cms.roles.listRoles({ query: { limit: 200, offset } });
        catalog.push(...page.data);
        if (page.data.length < 200) break;
      }
    }
    return { assigned: assigned.data, effective: effective.data, allowed, catalog };
  }, [userId]);

  const apply = useCallback((snapshot: Awaited<ReturnType<typeof load>>) => {
    setAssignments(snapshot.assigned);
    setPermissions(snapshot.effective);
    setCanManage(snapshot.allowed);
    setRoles(snapshot.catalog);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setRoleCode("");
    setRemoving(null);
    void load()
      .then((snapshot) => {
        if (active) apply(snapshot);
      })
      .catch((failure) => {
        if (active) setError(toDisplayError(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, apply]);

  async function mutate(work: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await work();
      setRoleCode("");
      setRemoving(null);
      apply(await load());
      window.dispatchEvent(new Event("trinacria-cms:access-updated"));
    } catch (failure) {
      setError(toDisplayError(failure));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <InfoCard title={t("iam.loading", "Loading access…")} />;
  return (
    <Panel className="grid gap-4 p-4" radius="lg">
      <h3 className="text-sm font-semibold">{t("iam.title", "Roles and access")}</h3>
      {error ? (
        <InfoCard title={t("iam.error", "Unable to update access")} description={error} />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {assignments.map((assignment) => (
          <div key={assignment.id} className="flex items-center gap-2">
            <Badge tone="neutral">
              {roles.find((role) => role.code === assignment.roleCode)?.name ?? assignment.roleCode}
            </Badge>
            {canManage ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setRemoving(assignment.roleCode)}
              >
                {t("iam.remove", "Remove role")}
              </Button>
            ) : null}
          </div>
        ))}
        {!assignments.length ? <p>{t("iam.no_roles", "No roles assigned")}</p> : null}
      </div>
      {canManage ? (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
          <Select
            label={t("iam.assign", "Assign role")}
            value={roleCode}
            disabled={busy}
            onChange={(event) => setRoleCode(event.target.value)}
          >
            <option value="">{t("iam.choose", "Choose a role")}</option>
            {roles
              .filter(
                (role) =>
                  role.status === "active" &&
                  !assignments.some((item) => item.roleCode === role.code)
              )
              .map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name}
                </option>
              ))}
          </Select>
          <Button
            disabled={busy || !roleCode}
            onClick={() =>
              void mutate(() =>
                cms.security.assignUserRole({
                  path: { id: userId },
                  body: { roleCode }
                })
              )
            }
          >
            {t("iam.assign", "Assign role")}
          </Button>
        </div>
      ) : null}
      <p className="text-sm text-(--color-ink-muted)">
        {t("iam.global_permissions", "Allowed actions without a record-specific context")}
      </p>
      <div className="flex flex-wrap gap-2">
        {permissions.map((permission) => (
          <Badge key={permission} tone="neutral">
            {permission}
          </Badge>
        ))}
      </div>
      <Dialog
        open={removing !== null}
        onClose={() => {
          if (!busy) setRemoving(null);
        }}
        title={t("iam.remove_confirm", "Remove this role?")}
        closeLabel={t("common.actions.close", "Close")}
      >
        <p className="mb-4">{removing}</p>
        <Button
          disabled={busy || !removing}
          onClick={() =>
            void mutate(() =>
              cms.security.removeUserRole({
                path: { id: userId, roleCode: removing ?? "" }
              })
            )
          }
        >
          {t("iam.remove", "Remove role")}
        </Button>
      </Dialog>
    </Panel>
  );
}
