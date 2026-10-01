import { Button, Icon } from "@trinacria-cms/trinacria-ui";
import type { StructuredContentBlock } from "../../modules/entries/structured-document.contract.js";
export function TableBlockFields({
  block,
  disabled,
  onChange
}: {
  block: Extract<StructuredContentBlock, { type: "table" }>;
  disabled: boolean;
  onChange: (block: StructuredContentBlock) => void;
}) {
  const rows = block.data.rows.length > 0 ? block.data.rows : [[""]];
  const columnCount = Math.max(1, rows[0]?.length ?? 1);

  function updateRows(nextRows: string[][]) {
    onChange({ ...block, data: { ...block.data, rows: nextRows } });
  }

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    updateRows(
      rows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) =>
              currentColumnIndex === columnIndex ? value : cell
            )
          : row
      )
    );
  }

  function addRow() {
    updateRows([...rows, Array.from({ length: columnCount }, () => "")]);
  }

  function addColumn() {
    updateRows(rows.map((row) => [...row, ""]));
  }

  function focusCell(container: Element | null, rowIndex: number, columnIndex: number) {
    requestAnimationFrame(() => {
      container
        ?.querySelector<HTMLInputElement>(`[data-table-cell="${rowIndex}-${columnIndex}"]`)
        ?.focus();
    });
  }

  return (
    <div className="group/table grid gap-2 py-2" data-table-block>
      <div className="overflow-x-auto rounded-md border border-[color:var(--color-border)]">
        <table className="w-full min-w-[32rem] table-fixed border-collapse">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${block.id}-row-${rowIndex}`}>
                {row.map((cell, columnIndex) => {
                  const input = (
                    <input
                      key={`${rowIndex}-${columnIndex}-input`}
                      aria-label={`Riga ${rowIndex + 1}, colonna ${columnIndex + 1}`}
                      data-table-cell={`${rowIndex}-${columnIndex}`}
                      value={cell}
                      disabled={disabled}
                      className={`block h-10 w-full border-0 bg-transparent px-3 text-sm text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)] ${
                        block.data.hasHeader && rowIndex === 0 ? "font-semibold" : "font-normal"
                      }`}
                      placeholder={
                        block.data.hasHeader && rowIndex === 0
                          ? `Colonna ${columnIndex + 1}`
                          : undefined
                      }
                      onChange={(event) =>
                        updateCell(rowIndex, columnIndex, event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        const container = event.currentTarget.closest("[data-table-block]");
                        const nextRowIndex = rowIndex + 1;
                        if (nextRowIndex >= rows.length) addRow();
                        focusCell(container, nextRowIndex, columnIndex);
                      }}
                    />
                  );
                  const cellClass = `border-b border-r border-[color:var(--color-border)] last:border-r-0 ${
                    block.data.hasHeader && rowIndex === 0
                      ? "bg-[color:var(--color-surface-subtle)]"
                      : "bg-[color:var(--color-panel)]"
                  }`;
                  return block.data.hasHeader && rowIndex === 0 ? (
                    <th scope="col" className={cellClass} key={`${rowIndex}-${columnIndex}`}>
                      {input}
                    </th>
                  ) : (
                    <td className={cellClass} key={`${rowIndex}-${columnIndex}`}>
                      {input}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-1 opacity-70 transition group-hover/table:opacity-100 group-focus-within/table:opacity-100">
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={addRow}>
          <Icon name="plus" className="h-3.5 w-3.5" /> Riga
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={addColumn}>
          <Icon name="plus" className="h-3.5 w-3.5" /> Colonna
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || rows.length <= 1}
          onClick={() => updateRows(rows.slice(0, -1))}
        >
          Rimuovi riga
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || columnCount <= 1}
          onClick={() => updateRows(rows.map((row) => row.slice(0, -1)))}
        >
          Rimuovi colonna
        </Button>
      </div>
    </div>
  );
}

export function ListBlockFields({
  block,
  disabled,
  onChange
}: {
  block: Extract<StructuredContentBlock, { type: "list" }>;
  disabled: boolean;
  onChange: (block: StructuredContentBlock) => void;
}) {
  const items = block.data.items.length > 0 ? block.data.items : [""];

  function updateItems(nextItems: string[]) {
    onChange({ ...block, data: { ...block.data, items: nextItems } });
  }

  return (
    <div className="grid gap-0.5 py-1" data-list-block>
      {items.map((item, index) => (
        <div className="flex min-h-7 items-start gap-2" key={`${block.id}-item-${index}`}>
          <span
            aria-hidden="true"
            className="w-5 shrink-0 select-none pt-0.5 text-right text-base leading-7 text-[color:var(--color-ink)]"
          >
            {block.data.style === "numbered" ? `${index + 1}.` : "•"}
          </span>
          <input
            aria-label={`Voce ${index + 1} dell’elenco`}
            data-list-item-index={index}
            placeholder={index === 0 ? "Voce dell’elenco" : undefined}
            value={item}
            disabled={disabled}
            className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0.5 text-base leading-7 text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)]"
            onChange={(event) => {
              const nextItems = [...items];
              nextItems[index] = event.currentTarget.value;
              updateItems(nextItems);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const container = event.currentTarget.closest("[data-list-block]");
                const nextItems = [...items];
                nextItems.splice(index + 1, 0, "");
                updateItems(nextItems);
                requestAnimationFrame(() => {
                  container
                    ?.querySelector<HTMLInputElement>(`[data-list-item-index="${index + 1}"]`)
                    ?.focus();
                });
              }
              if (event.key === "Backspace" && !item && items.length > 1) {
                event.preventDefault();
                const container = event.currentTarget.closest("[data-list-block]");
                const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
                updateItems(nextItems);
                requestAnimationFrame(() => {
                  container
                    ?.querySelector<HTMLInputElement>(
                      `[data-list-item-index="${Math.max(0, index - 1)}"]`
                    )
                    ?.focus();
                });
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}
