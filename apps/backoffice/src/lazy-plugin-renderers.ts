import type { BackofficeModule } from "@trinacria-cms/admin-kernel";
import { createElement, lazy, type ReactNode, Suspense } from "react";

type Registry = NonNullable<BackofficeModule["renderers"]>;
type Loader = () => Promise<Registry>;

function lazyRenderer<Context>(load: () => Promise<(context: Context) => ReactNode>) {
  const Component = lazy(async () => {
    const render = await load();
    return { default: ({ context }: { context: Context }) => render(context) };
  });
  return (context: Context) =>
    createElement(
      Suspense,
      {
        fallback: createElement("p", { role: "status" }, "Caricamento…")
      },
      createElement(Component, { context })
    );
}

/** Plugin code is fetched only when its page, widget or settings section is rendered. */
export function lazyPluginRenderers(
  load: Loader,
  refs: {
    pages?: readonly string[];
    dashboardWidgets?: readonly string[];
    settingsSections?: readonly string[];
  }
): Registry {
  return {
    pages: Object.fromEntries(
      (refs.pages ?? []).map((ref) => [
        ref,
        lazyRenderer<Parameters<NonNullable<Registry["pages"]>[string]>[0]>(async () => {
          const renderer = (await load()).pages?.[ref];
          if (!renderer) throw new Error(`Missing plugin page renderer: ${ref}`);
          return renderer;
        })
      ])
    ),
    dashboardWidgets: Object.fromEntries(
      (refs.dashboardWidgets ?? []).map((ref) => [
        ref,
        lazyRenderer<Parameters<NonNullable<Registry["dashboardWidgets"]>[string]>[0]>(async () => {
          const renderer = (await load()).dashboardWidgets?.[ref];
          if (!renderer) throw new Error(`Missing plugin widget renderer: ${ref}`);
          return renderer;
        })
      ])
    ),
    settingsSections: Object.fromEntries(
      (refs.settingsSections ?? []).map((ref) => [
        ref,
        lazyRenderer<Parameters<NonNullable<Registry["settingsSections"]>[string]>[0]>(async () => {
          const renderer = (await load()).settingsSections?.[ref];
          if (!renderer) throw new Error(`Missing plugin settings renderer: ${ref}`);
          return renderer;
        })
      ])
    )
  };
}
