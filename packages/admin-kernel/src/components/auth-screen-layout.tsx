import { Badge, Icon, Panel } from "@trinacria-cms/trinacria-ui";
import type { PropsWithChildren, ReactNode } from "react";
import { useI18n } from "../lib/i18n.js";

export interface AuthScreenLayoutProps extends PropsWithChildren {
  variant?: "split" | "minimal";
  eyebrow: string;
  heroTitle: string;
  heroBody: string;
  formTitle: string;
  formSummary: string;
  heroMetrics?: readonly { label: string; value: string }[];
  heroHighlights?: readonly { icon: string; title: string; text: string }[];
  formBadgeLabel?: string;
  formBadgeHint?: string;
  footer?: ReactNode;
}

/**
 * AuthScreenLayout gives login and installation a dedicated product-style shell
 * instead of reusing the generic content cards used inside the dashboard.
 */
export function AuthScreenLayout({
  children,
  eyebrow,
  footer,
  formBadgeHint,
  formBadgeLabel,
  formSummary,
  formTitle,
  heroBody,
  heroHighlights,
  heroMetrics,
  heroTitle,
  variant = "split"
}: AuthScreenLayoutProps) {
  const { t } = useI18n();
  const hasHeroMetrics = (heroMetrics?.length ?? 0) > 0;
  const hasHeroHighlights = (heroHighlights?.length ?? 0) > 0;
  const hasFormBadge = Boolean(formBadgeLabel || formBadgeHint);

  if (variant === "minimal") {
    return (
      <div className="min-h-screen bg-[color:var(--color-panel-soft)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[560px] items-center justify-center">
          <div className="w-full space-y-5">
            <div className="space-y-3 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-[color:var(--color-ink-soft)] sm:text-4xl">
                  {formTitle}
                </h1>
                <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">
                  {formSummary}
                </p>
              </div>
            </div>

            <Panel className="p-6 shadow-[var(--shadow-md)] sm:p-7" radius="xl">
              {children}
            </Panel>

            {footer ? (
              <div className="text-center text-sm leading-6 text-[color:var(--color-ink-subtle)]">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-canvas)] p-3 sm:p-4 lg:p-6">
      <Panel className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1540px] overflow-hidden rounded-[var(--radius-xl)] shadow-[var(--shadow-md)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative overflow-hidden bg-[color:var(--color-code-surface)] px-6 py-8 text-[color:var(--color-code-ink)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="absolute inset-y-0 right-0 hidden w-px bg-[color:var(--color-overlay-soft)] lg:block" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className={hasHeroMetrics ? "space-y-8" : "space-y-5"}>
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-[color:var(--color-border-strong)] bg-[color:var(--color-overlay-soft)] px-4 py-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-code-ink)] text-sm font-semibold text-[color:var(--color-code-surface)]">
                    T
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Trinacria CMS</p>
                    <p className="text-xs text-[color:var(--color-code-subtle)]">
                      {t("auth.layout.runtime")}
                    </p>
                  </div>
                </div>
                <Badge className="border-[color:var(--color-border-strong)] bg-[color:var(--color-overlay-soft)] text-[color:var(--color-code-ink)] shadow-none">
                  {eyebrow}
                </Badge>
              </div>

              <div className="max-w-2xl space-y-4">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--color-code-subtle)]">
                  {t("auth.layout.operational_access")}
                </p>
                <h1 className="text-4xl font-semibold text-[color:var(--color-code-ink)] sm:text-5xl">
                  {heroTitle}
                </h1>
                <p className="max-w-xl text-sm leading-7 text-[color:var(--color-code-muted)] sm:text-base">
                  {heroBody}
                </p>
              </div>

              {hasHeroMetrics ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {heroMetrics?.map((metric) => (
                    <Panel
                      key={metric.label}
                      className="rounded-sm border-[color:var(--color-border-strong)] bg-[color:var(--color-overlay-soft)] px-4 py-4"
                      tone="custom"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--color-code-subtle)]">
                        {metric.label}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-[color:var(--color-code-ink)]">
                        {metric.value}
                      </p>
                    </Panel>
                  ))}
                </div>
              ) : null}
            </div>

            {hasHeroHighlights ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {heroHighlights?.map((highlight) => (
                  <Panel
                    key={highlight.title}
                    className="rounded-sm border-[color:var(--color-border-strong)] bg-[color:var(--color-overlay-soft)] p-4"
                    tone="custom"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm bg-[color:var(--color-overlay-soft)] text-[color:var(--color-code-ink)]">
                        <Icon name={highlight.icon} className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--color-code-ink)]">
                          {highlight.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--color-code-muted)]">
                          {highlight.text}
                        </p>
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="flex items-center justify-center bg-[color:var(--color-panel-soft)] px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-[460px] space-y-6">
            <div className={hasFormBadge ? "space-y-4" : "space-y-2"}>
              {hasFormBadge ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-ink-muted)] shadow-[var(--shadow-surface)]">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-success-ink)]" />
                  {formBadgeLabel}
                  {formBadgeLabel && formBadgeHint ? (
                    <span className="text-[color:var(--color-ink-subtle)]">/</span>
                  ) : null}
                  {formBadgeHint ? (
                    <span className="text-[color:var(--color-ink-subtle)]">{formBadgeHint}</span>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-[color:var(--color-ink-soft)]">
                  {formTitle}
                </h2>
                <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">
                  {formSummary}
                </p>
              </div>
            </div>

            <Panel className="p-6 shadow-[var(--shadow-md)] sm:p-7" radius="xl">
              {children}
            </Panel>

            {footer ? (
              <div className="text-sm leading-6 text-[color:var(--color-ink-subtle)]">{footer}</div>
            ) : null}
          </div>
        </section>
      </Panel>
    </div>
  );
}
