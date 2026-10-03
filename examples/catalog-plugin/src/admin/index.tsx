import { type CmsSdkClientCore, CmsSdkHttpError } from "@trinacria-cms/sdk/runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogItem } from "../contracts.js";

interface Context {
  cms: CmsSdkClientCore;
}
const PAGE_SIZE = 50;
export function CatalogPage({ cms }: Context) {
  const [items, setItems] = useState<readonly CatalogItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const lifetime = useRef<AbortController | null>(null);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const result = await cms.request<{ data: CatalogItem[] }>({
        method: "GET",
        path: "/v1/catalog/items",
        query: { limit: PAGE_SIZE, offset },
        signal
      });
      if (!signal.aborted) setItems(result.data);
    },
    [cms, offset]
  );
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    setLoading(true);
    setBusy(false);
    setError("");
    void load(controller.signal)
      .catch(() => {
        if (!controller.signal.aborted) setError("Catalog unavailable. Reload to retry.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      lifetime.current = null;
    };
  }, [load]);
  function clearForm() {
    setEditing(null);
    setName("");
    setPrice("0");
  }
  async function mutate(method: "POST" | "PATCH" | "DELETE", item?: CatalogItem) {
    const controller = lifetime.current;
    if (!controller || busy || loading) return;
    const priceCents = Number(price);
    if (
      method !== "DELETE" &&
      (!name.trim() ||
        !Number.isSafeInteger(priceCents) ||
        priceCents < 0 ||
        priceCents > 100000000)
    ) {
      setError("Enter a name and a valid price in cents.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await cms.request({
        method,
        path: item ? `/v1/catalog/items/${encodeURIComponent(item.id)}` : "/v1/catalog/items",
        body:
          method === "DELETE"
            ? { expectedVersion: item!.version }
            : method === "PATCH"
              ? { expectedVersion: item!.version, input: { name, priceCents } }
              : { name, priceCents },
        signal: controller.signal
      });
      if (!controller.signal.aborted) clearForm();
      await load(controller.signal);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof CmsSdkHttpError && failure.status === 409
            ? "This item changed. Reload before editing again."
            : "Operation failed. Check your permissions and retry."
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section aria-label="Catalog" aria-busy={loading || busy}>
      <h2>Catalog</h2>
      {loading && <p role="status">Loading catalog…</p>}
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        disabled={loading || busy}
        onClick={() => {
          const signal = lifetime.current?.signal;
          if (!signal) return;
          setLoading(true);
          setError("");
          clearForm();
          void load(signal)
            .catch(() => {
              if (!signal.aborted) setError("Catalog unavailable. Reload to retry.");
            })
            .finally(() => {
              if (!signal.aborted) setLoading(false);
            });
        }}
      >
        Reload catalog
      </button>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void mutate(editing ? "PATCH" : "POST", editing ?? undefined);
        }}
      >
        <fieldset disabled={loading || busy}>
          <legend>{editing ? "Edit item" : "Create item"}</legend>
          <label>
            Item name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={120}
            />
          </label>
          <label>
            Price in cents
            <input
              type="number"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              min={0}
              max={100000000}
              step={1}
              required
            />
          </label>
          <button type="submit">{editing ? "Save item" : "Create item"}</button>
          {editing && (
            <button type="button" onClick={clearForm}>
              Cancel edit
            </button>
          )}
        </fieldset>
      </form>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>
              {item.name} — {(item.priceCents / 100).toFixed(2)}
            </span>
            <button
              type="button"
              aria-label={`Edit ${item.name}`}
              disabled={loading || busy}
              onClick={() => {
                setEditing(item);
                setName(item.name);
                setPrice(String(item.priceCents));
              }}
            >
              Edit
            </button>
            <button
              type="button"
              aria-label={`Delete ${item.name}`}
              disabled={loading || busy}
              onClick={() => {
                void mutate("DELETE", item);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {!loading && items.length === 0 && <p>No items on this page.</p>}
      <p>{items.length} items on this page</p>
      <button
        type="button"
        disabled={loading || busy || offset === 0}
        onClick={() => {
          clearForm();
          setOffset(Math.max(0, offset - PAGE_SIZE));
        }}
      >
        Previous page
      </button>
      <button
        type="button"
        disabled={loading || busy || items.length < PAGE_SIZE || offset + PAGE_SIZE > 10000}
        onClick={() => {
          clearForm();
          setOffset(offset + PAGE_SIZE);
        }}
      >
        Next page
      </button>
    </section>
  );
}
export const CATALOG_ADMIN_RENDERERS = {
  pages: { "catalog-plugin:catalog": (context: Context) => <CatalogPage {...context} /> },
  dashboardWidgets: { "catalog-plugin:count": (context: Context) => <CatalogPage {...context} /> }
};
