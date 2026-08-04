import { Icon } from "@trinacria-cms/trinacria-ui";
import { type CSSProperties, useEffect, useState } from "react";
import type {
  ImageBlock,
  StructuredContentBlock,
  StructuredDocument
} from "../modules/entries/structured-document.contract.js";
import type { CmsClient } from "./editorial-admin.types.js";
import { blockAppearanceStyle } from "./editorial-block-editor.js";
import { InlineTextPreview } from "./editorial-rich-text.js";

export function EditorialDocumentPreview({
  apiBaseUrl = "/cms",
  cms,
  document,
  title
}: {
  apiBaseUrl?: string;
  cms: CmsClient;
  document: StructuredDocument;
  title: string;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 pb-28 pt-14 sm:px-10 sm:pt-20">
      <h1 className="text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-[color:var(--color-ink)] sm:text-5xl">
        {title || "Senza titolo"}
      </h1>
      <div className="mt-10">
        <PreviewBlocks apiBaseUrl={apiBaseUrl} blocks={document.blocks} cms={cms} />
      </div>
    </article>
  );
}

function PreviewBlocks({
  apiBaseUrl,
  blocks,
  cms
}: {
  apiBaseUrl: string;
  blocks: readonly StructuredContentBlock[];
  cms: CmsClient;
}) {
  if (!blocks.length) {
    return (
      <p className="py-12 text-center text-sm text-[color:var(--color-ink-muted)]">
        Il documento non contiene ancora blocchi.
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      {blocks.map((block) => (
        <PreviewBlock apiBaseUrl={apiBaseUrl} block={block} cms={cms} key={block.id} />
      ))}
    </div>
  );
}

function PreviewBlock({
  apiBaseUrl,
  block,
  cms
}: {
  apiBaseUrl: string;
  block: StructuredContentBlock;
  cms: CmsClient;
}) {
  const style = blockAppearanceStyle(block.appearance);
  const shellClass = block.appearance?.backgroundColor
    ? "rounded-[var(--radius-control)] px-4 py-3"
    : "";

  if (block.type === "paragraph") {
    return (
      <p
        className={`${shellClass} text-[1.0625rem] leading-8 text-[color:var(--color-ink)]`}
        style={style}
      >
        <InlineTextPreview value={block.data} />
      </p>
    );
  }
  if (block.type === "heading") {
    const Heading = `h${block.data.level}` as "h2" | "h3" | "h4";
    const size =
      block.data.level === 2 ? "text-3xl" : block.data.level === 3 ? "text-2xl" : "text-xl";
    return (
      <Heading
        className={`${shellClass} font-semibold leading-[1.15] tracking-[-0.025em] text-[color:var(--color-ink)] ${size}`}
        style={style}
      >
        <InlineTextPreview value={block.data} />
      </Heading>
    );
  }
  if (block.type === "quote") {
    return (
      <blockquote
        className={`${shellClass} border-l-4 border-[color:var(--color-accent-border)] pl-5 text-[color:var(--color-ink)]`}
        style={style}
      >
        <p className="text-lg italic leading-8">
          <InlineTextPreview value={block.data} />
        </p>
        {block.data.citation ? (
          <footer className="mt-1 text-sm opacity-70">{block.data.citation}</footer>
        ) : null}
      </blockquote>
    );
  }
  if (block.type === "image") {
    return <PreviewImage apiBaseUrl={apiBaseUrl} block={block} cms={cms} style={style} />;
  }
  if (block.type === "list") {
    const List = block.data.style === "numbered" ? "ol" : "ul";
    return (
      <List
        className={`${shellClass} grid gap-2 pl-7 text-[1.0625rem] leading-8 text-[color:var(--color-ink)] ${block.data.style === "numbered" ? "list-decimal" : "list-disc"}`}
        style={style}
      >
        {block.data.items.map((item, index) => (
          <li key={`${block.id}-preview-${index}`}>{item}</li>
        ))}
      </List>
    );
  }
  if (block.type === "table") {
    return (
      <div className={`${shellClass} overflow-x-auto`} style={style}>
        <table className="w-full min-w-[32rem] border-collapse text-sm text-[color:var(--color-ink)]">
          <tbody>
            {block.data.rows.map((row, rowIndex) => (
              <tr key={`${block.id}-preview-row-${rowIndex}`}>
                {row.map((cell, columnIndex) => {
                  const className = `border border-[color:var(--color-border)] px-3 py-2.5 text-left ${
                    block.data.hasHeader && rowIndex === 0 ? "font-semibold" : "font-normal"
                  }`;
                  return block.data.hasHeader && rowIndex === 0 ? (
                    <th scope="col" className={className} key={`${rowIndex}-${columnIndex}`}>
                      {cell}
                    </th>
                  ) : (
                    <td className={className} key={`${rowIndex}-${columnIndex}`}>
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "layout") {
    return (
      <div
        className={`${shellClass} grid gap-6`}
        style={{
          ...style,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(14rem, 100%), 1fr))"
        }}
      >
        {block.data.columns.map((column) => (
          <PreviewBlocks apiBaseUrl={apiBaseUrl} blocks={column.blocks} cms={cms} key={column.id} />
        ))}
      </div>
    );
  }
  return <hr className="my-4 border-[color:var(--color-border)]" />;
}

function PreviewImage({
  apiBaseUrl,
  block,
  cms,
  style
}: {
  apiBaseUrl: string;
  block: ImageBlock;
  cms: CmsClient;
  style: CSSProperties;
}) {
  const [src, setSrc] = useState(block.data.src);

  useEffect(() => {
    if (!block.data.assetId) {
      setSrc(block.data.src);
      return;
    }
    let cancelled = false;
    void cms
      .request<{ data: { url: string } }>({
        method: "POST",
        path: `/v1/media/assets/${encodeURIComponent(block.data.assetId)}/access-url`
      })
      .then((response) => {
        if (!cancelled) setSrc(resolveMediaUrl(response.data.url, apiBaseUrl));
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, block.data.assetId, block.data.src, cms]);

  return (
    <figure
      className={block.appearance?.backgroundColor ? "rounded-[var(--radius-control)] p-4" : ""}
      style={style}
    >
      {src ? (
        <img
          src={src}
          alt={block.data.alt}
          className="max-h-[38rem] w-full rounded-[var(--radius-control)] object-contain"
        />
      ) : (
        <div className="flex min-h-48 items-center justify-center rounded-[var(--radius-control)] bg-[color:var(--color-panel-soft)] text-[color:var(--color-ink-subtle)]">
          <Icon name="image" className="h-6 w-6" />
        </div>
      )}
      {block.data.caption ? (
        <figcaption className="mt-3 text-center text-sm text-[color:var(--color-ink-muted)]">
          {block.data.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function resolveMediaUrl(url: string, apiBaseUrl: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return url;
  const normalizedBase = apiBaseUrl.replace(/\/$/, "");
  return `${normalizedBase}${url.startsWith("/") ? url : `/${url}`}`;
}
