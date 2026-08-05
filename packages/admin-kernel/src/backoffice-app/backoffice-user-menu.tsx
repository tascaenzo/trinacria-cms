import {
  Button,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Icon
} from "@trinacria-cms/trinacria-ui";
import type { TranslateFn } from "../lib/i18n.js";

interface BackofficeUserMenuProps {
  isOpen: boolean;
  roleLabel: string | null;
  settingsRouteAvailable: boolean;
  userName: string;
  onLogout: () => void;
  onNavigate: (routeId: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  t: TranslateFn;
}

export function BackofficeUserMenu({
  isOpen,
  roleLabel,
  settingsRouteAvailable,
  userName,
  onLogout,
  onNavigate,
  onOpenChange,
  t
}: BackofficeUserMenuProps) {
  const resolvedRoleLabel = roleLabel ?? t("backoffice.user.role_loading");

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={onOpenChange}
      side="top"
      align="end"
      className="w-full"
      contentClassName="w-56"
      trigger={
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full min-w-0 justify-start gap-3 border-transparent px-2.5 py-2 text-left shadow-none"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-action-primary-bg)] text-[color:var(--color-action-primary-ink)]">
            <Icon name="user-round" className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[color:var(--color-ink)]">
              {userName}
            </span>
            <span className="block truncate text-xs text-[color:var(--color-ink-subtle)]">
              {resolvedRoleLabel}
            </span>
          </span>
          <Icon
            name="chevron-down"
            className={`h-4 w-4 shrink-0 text-[color:var(--color-ink-subtle)] transition ${isOpen ? "rotate-180" : ""}`}
          />
        </Button>
      }
    >
      <DropdownMenuLabel>
        <span className="block truncate text-sm font-semibold normal-case tracking-normal text-[color:var(--color-ink)]">
          {userName}
        </span>
        <span className="block truncate pt-1 text-xs font-normal normal-case tracking-normal text-[color:var(--color-ink-subtle)]">
          {resolvedRoleLabel}
        </span>
      </DropdownMenuLabel>
      <DropdownMenuItem
        icon="user-round"
        title={t("backoffice.user.menu.profile")}
        onClick={() => onNavigate("profile")}
      />
      {settingsRouteAvailable ? (
        <DropdownMenuItem
          icon="settings-2"
          title={t("backoffice.user.menu.settings")}
          onClick={() => onNavigate("settings")}
        />
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        icon="log-out"
        title={t("backoffice.user.menu.logout")}
        tone="danger"
        onClick={onLogout}
      />
    </DropdownMenu>
  );
}
