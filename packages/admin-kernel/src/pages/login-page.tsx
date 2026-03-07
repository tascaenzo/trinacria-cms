import { useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  Icon,
  Input
} from "@trinacria-cms/admin-ui";

export interface LoginPageProps {
  isSubmitting: boolean;
  state: {
    error: string | null;
  };
  action: (formData: FormData) => void;
}

export function LoginPage({ action, isSubmitting, state }: LoginPageProps) {
  useEffect(() => {
    document.documentElement.classList.add("auth-page");
    return () => {
      document.documentElement.classList.remove("auth-page");
    };
  }, []);

  return (
    <div className="flex min-h-svh items-center justify-center bg-[color:var(--color-panel-soft)] px-6 py-10">
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-6">
        <div className="flex w-full flex-col items-center gap-6">
          <div className="flex items-center justify-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Icon name="layout-dashboard" className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-slate-950">Trinacria CMS</span>
          </div>

          <Card className="w-full border-0 bg-white p-0 shadow-none md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-0 md:shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>Enter your email below to login to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={action}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="m@example.com"
                      defaultValue="admin@example.com"
                      autoComplete="email"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      defaultValue="admin123"
                      autoComplete="current-password"
                      required
                    />
                  </Field>

                  <Field>
                    {state.error ? (
                      <FieldDescription className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                        {state.error}
                      </FieldDescription>
                    ) : null}

                    <div className="grid gap-3">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-10 w-full rounded-lg"
                      >
                        {isSubmitting ? "Logging in..." : "Login"}
                      </Button>
                    </div>

                    <FieldDescription className="text-center text-sm">
                      Use the administrator account configured for this CMS instance.
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
