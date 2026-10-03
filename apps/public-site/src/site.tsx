import type { ReactNode } from "react";
import { entryPath, type SiteBlock, type SiteProps, safeLink } from "./site.types.js";

const text = (value: unknown) => (typeof value === "string" ? value : "");
function Inline({ data }: { data: Record<string, unknown> }) {
  if (!Array.isArray(data.inline)) return text(data.text);
  return data.inline.map((part: Record<string, unknown>, index: number) => {
    let node: ReactNode = text(part.text);
    if (part.code) node = <code>{node}</code>;
    if (part.bold) node = <strong>{node}</strong>;
    if (part.italic) node = <em>{node}</em>;
    const href = safeLink((part.link as { href?: unknown } | undefined)?.href);
    return (
      <span key={index}>
        {href ? (
          <a href={href} rel="noopener noreferrer">
            {node}
          </a>
        ) : (
          node
        )}
      </span>
    );
  });
}
export function Blocks({ blocks, depth = 0 }: { blocks: SiteBlock[]; depth?: number }) {
  if (depth > 8) return null;
  return blocks.slice(0, 500).map((block) => {
    const data = block.data,
      inline = <Inline key={block.id} data={data} />;
    switch (block.type) {
      case "paragraph":
        return <p key={block.id}>{inline}</p>;
      case "heading":
        return data.level === 3 ? (
          <h3 key={block.id}>{inline}</h3>
        ) : data.level === 4 ? (
          <h4 key={block.id}>{inline}</h4>
        ) : (
          <h2 key={block.id}>{inline}</h2>
        );
      case "quote":
        return (
          <blockquote key={block.id}>
            {inline}
            {data.citation ? <cite>{text(data.citation)}</cite> : null}
          </blockquote>
        );
      case "image":
        return typeof data.assetId === "string" ? (
          <figure key={block.id}>
            <img
              src={`/media/${encodeURIComponent(data.assetId)}`}
              alt={text(data.alt)}
              loading="lazy"
            />
            {data.caption ? <figcaption>{text(data.caption)}</figcaption> : null}
          </figure>
        ) : null;
      case "list": {
        const items = Array.isArray(data.items)
          ? data.items.map((item, index) => <li key={index}>{text(item)}</li>)
          : [];
        return data.style === "numbered" ? (
          <ol key={block.id}>{items}</ol>
        ) : (
          <ul key={block.id}>{items}</ul>
        );
      }
      case "table":
        return (
          <div key={block.id} className="table-wrap">
            <table>
              <tbody>
                {Array.isArray(data.rows)
                  ? data.rows.map((row: unknown, index: number) => (
                      <tr key={index}>
                        {Array.isArray(row)
                          ? row.map((cell, col) =>
                              index === 0 && data.hasHeader ? (
                                <th key={col} scope="col">
                                  {text(cell)}
                                </th>
                              ) : (
                                <td key={col}>{text(cell)}</td>
                              )
                            )
                          : null}
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        );
      case "layout":
        return (
          <div key={block.id} className="columns">
            {Array.isArray(data.columns)
              ? data.columns.map((column: { id: string; blocks: SiteBlock[] }) => (
                  <div key={column.id}>
                    <Blocks blocks={column.blocks} depth={depth + 1} />
                  </div>
                ))
              : null}
          </div>
        );
      case "divider":
        return <hr key={block.id} />;
      default:
        return null;
    }
  });
}
export function Site(props: SiteProps) {
  return (
    <>
      <a className="skip" href="#main">
        Vai al contenuto
      </a>
      {props.preview ? (
        <aside className="preview" aria-label="Anteprima privata">
          <strong>Anteprima privata</strong>
          <span>Stai leggendo la copia di lavoro.</span>
          <form method="post" action="/preview/exit">
            <button type="submit">Esci dall’anteprima</button>
          </form>
        </aside>
      ) : null}
      <header className="site-header">
        <a className="brand" href="/">
          Trinacria Journal
        </a>
        <nav aria-label="Navigazione principale">
          <a href="/articles">Articoli</a>
          {props.navigation.map((item, index) =>
            safeLink(item.href) ? (
              <a key={index} href={item.href} rel="noopener noreferrer">
                {item.label}
              </a>
            ) : null
          )}
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <h1>{props.entry?.title ?? props.title}</h1>
        {props.error ? <p role="alert">{props.error}</p> : null}
        {props.entry ? (
          <article>
            {props.entry.body?.blocks ? (
              <Blocks blocks={props.entry.body.blocks} />
            ) : (
              <p>{props.entry.body?.text}</p>
            )}
          </article>
        ) : null}
        {props.entries ? (
          <div className="entry-list">
            {props.entries.map((entry) => (
              <article key={entry.id}>
                <h2>
                  <a href={entryPath(entry)}>{entry.title ?? "Senza titolo"}</a>
                </h2>
                {entry.publishedAt ? (
                  <time dateTime={entry.publishedAt}>{entry.publishedAt.slice(0, 10)}</time>
                ) : null}
                <p>{text(entry.data.excerpt)}</p>
              </article>
            ))}
          </div>
        ) : null}
        {props.entries?.length === 0 ? <p>Nessun articolo pubblicato.</p> : null}
        {props.next ? <a href={props.next}>Articoli successivi</a> : null}
      </main>
      <footer>Trinacria Journal</footer>
    </>
  );
}
