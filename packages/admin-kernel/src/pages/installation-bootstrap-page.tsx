import { Button, Input, Icon } from "@trinacria-cms/admin-ui";
import { AuthScreenLayout } from "../components/auth-screen-layout.js";

export interface InstallationBootstrapPageProps {
  isSubmitting: boolean;
  state: {
    error: string | null;
  };
  action: (formData: FormData) => void;
}

export function InstallationBootstrapPage({ action, isSubmitting, state }: InstallationBootstrapPageProps) {
  return (
    <AuthScreenLayout
      eyebrow="Bootstrap"
      heroTitle="Initialize a fresh Trinacria CMS instance"
      heroBody="Create the first operator, activate the initial session, and hand control to the admin kernel. This flow is meant for the first boot of a clean installation."
      formTitle="Create the first administrator"
      formSummary="Define the first operator account that will own the initial session and unlock the backoffice runtime for the current instance."
      formBadgeLabel="installation"
      formBadgeHint="one-shot bootstrap"
      heroMetrics={[
        { label: "Mode", value: "Fresh instance" },
        { label: "Seed", value: "First operator" },
        { label: "Handoff", value: "Auto sign-in" },
      ]}
      heroHighlights={[
        {
          icon: "shield",
          title: "Single bootstrap window",
          text: "The installation endpoint is designed to run once, before the platform starts serving normal operator sessions.",
        },
        {
          icon: "users",
          title: "First operator seed",
          text: "The account created here becomes the first trusted operator of the CMS and unlocks the admin shell.",
        },
        {
          icon: "lock-keyhole",
          title: "Immediate session handoff",
          text: "After bootstrap, the flow signs in automatically so the backoffice can continue without a second manual step.",
        },
        {
          icon: "layout-dashboard",
          title: "Kernel-driven admin",
          text: "Once installed, the backoffice surface is mounted by the admin kernel and follows the same plugin-driven runtime model.",
        },
      ]}
      footer={
        <div className="flex items-center gap-2">
          <Icon name="sparkles" className="h-4 w-4 text-slate-400" />
          <span>After the first successful bootstrap, this screen is replaced by the normal operator login flow.</span>
        </div>
      }
    >
      <form className="grid gap-5" action={action}>
        <div className="grid gap-4">
          <Input
            label="Email address"
            type="email"
            name="email"
            defaultValue="admin@example.com"
            autoComplete="email"
            required
          />
          <Input label="Display name" name="displayName" defaultValue="Administrator" required />
          <Input
            label="Password"
            type="password"
            name="password"
            defaultValue="admin123"
            autoComplete="new-password"
            required
          />
        </div>

        {state.error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {state.error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
          <span>This action initializes the operator surface for the current CMS instance.</span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
            Bootstrap flow
            <Icon name="arrow-right" className="h-4 w-4" />
          </span>
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-xl text-sm font-semibold">
          {isSubmitting ? "Bootstrapping..." : "Initialize CMS"}
        </Button>
      </form>
    </AuthScreenLayout>
  );
}
