import type { PropsWithChildren, ReactNode } from "react";
import { Badge, Icon } from "@trinacria-cms/admin-ui";
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
  variant = "split",
}: AuthScreenLayoutProps) {
  const { t } = useI18n();
  const hasHeroMetrics = (heroMetrics?.length ?? 0) > 0;
  const hasHeroHighlights = (heroHighlights?.length ?? 0) > 0;
  const hasFormBadge = Boolean(formBadgeLabel || formBadgeHint);

  if (variant === "minimal") {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[560px] items-center justify-center">
          <div className="w-full space-y-5">
            <div className="space-y-3 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                  {formTitle}
                </h1>
                <p className="text-sm leading-7 text-slate-600">{formSummary}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.08)] sm:p-7">
              {children}
            </div>

            {footer ? <div className="text-center text-sm leading-6 text-slate-500">{footer}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-canvas)] p-3 sm:p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1540px] overflow-hidden rounded-[28px] border border-[color:var(--color-border)] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative overflow-hidden bg-slate-950 px-6 py-8 text-slate-100 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.18),transparent_24%),linear-gradient(180deg,#0f172a_0%,#020617_100%)]" />
          <div className="absolute inset-y-0 right-0 hidden w-px bg-white/10 lg:block" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className={hasHeroMetrics ? "space-y-8" : "space-y-5"}>
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950">
                    T
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Trinacria CMS</p>
                    <p className="text-xs text-slate-300">{t("auth.layout.runtime")}</p>
                  </div>
                </div>
                <Badge className="border-white/10 bg-white/5 text-slate-100 shadow-none">{eyebrow}</Badge>
              </div>

              <div className="max-w-2xl space-y-4">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-sky-200">
                  {t("auth.layout.operational_access")}
                </p>
                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  {heroTitle}
                </h1>
                <p className="max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                  {heroBody}
                </p>
              </div>

              {hasHeroMetrics ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {heroMetrics?.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                        {metric.label}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {hasHeroHighlights ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {heroHighlights?.map((highlight) => (
                  <div
                    key={highlight.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
                        <Icon name={highlight.icon} className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{highlight.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{highlight.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="flex items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-[460px] space-y-6">
            <div className={hasFormBadge ? "space-y-4" : "space-y-2"}>
              {hasFormBadge ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  {formBadgeLabel}
                  {formBadgeLabel && formBadgeHint ? <span className="text-slate-400">•</span> : null}
                  {formBadgeHint ? <span className="text-slate-500">{formBadgeHint}</span> : null}
                </div>
              ) : null}
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">{formTitle}</h2>
                <p className="text-sm leading-7 text-slate-600">{formSummary}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.08)] sm:p-7">
              {children}
            </div>

            {footer ? <div className="text-sm leading-6 text-slate-500">{footer}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
