import { Button, Icon, Select } from "@trinacria-cms/trinacria-ui";
import { useMemo, useState } from "react";

export interface CsvDocument {
  delimiter: "," | ";" | "\t";
  rows: string[][];
}

interface CsvEditorProps {
  document: CsvDocument;
  onChange: (document: CsvDocument) => void;
}

export function CsvEditor({ document, onChange }: CsvEditorProps) {
  const [selection, setSelection] = useState({ row: 0, column: 0 });
  const columnCount = useMemo(
    () => Math.max(1, ...document.rows.map((row) => row.length)),
    [document.rows]
  );
  const rows = document.rows.length > 0 ? document.rows : [[""]];

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    const nextRows = rows.map((row) => [...row]);
    while (nextRows[rowIndex].length < columnCount) nextRows[rowIndex].push("");
    nextRows[rowIndex][columnIndex] = value;
    onChange({ ...document, rows: nextRows });
  }

  function addRow() {
    onChange({ ...document, rows: [...rows, Array.from({ length: columnCount }, () => "")] });
  }

  function addColumn() {
    onChange({ ...document, rows: rows.map((row) => [...row, ""]) });
  }

  function deleteRow() {
    if (rows.length <= 1) return;
    onChange({ ...document, rows: rows.filter((_, index) => index !== selection.row) });
    setSelection((current) => ({
      ...current,
      row: Math.max(0, Math.min(current.row, rows.length - 2))
    }));
  }

  function deleteColumn() {
    if (columnCount <= 1) return;
    onChange({
      ...document,
      rows: rows.map((row) => row.filter((_, index) => index !== selection.column))
    });
    setSelection((current) => ({
      ...current,
      column: Math.max(0, Math.min(current.column, columnCount - 2))
    }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-3 py-2">
        <Button type="button" variant="secondary" onClick={addRow}>
          <Icon name="plus" className="h-4 w-4" /> Riga
        </Button>
        <Button type="button" variant="secondary" onClick={addColumn}>
          <Icon name="plus" className="h-4 w-4" /> Colonna
        </Button>
        <Button type="button" variant="secondary" disabled={rows.length <= 1} onClick={deleteRow}>
          Elimina riga
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={columnCount <= 1}
          onClick={deleteColumn}
        >
          Elimina colonna
        </Button>
        <Select
          aria-label="Separatore CSV"
          className="ml-auto w-44"
          value={document.delimiter}
          onChange={(event) =>
            onChange({
              ...document,
              delimiter: event.currentTarget.value as CsvDocument["delimiter"]
            })
          }
        >
          <option value=",">Virgola</option>
          <option value=";">Punto e virgola</option>
          <option value={"\t"}>Tabulazione</option>
        </Select>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[color:var(--color-surface)]">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-12 border-b border-r border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-2 text-right text-xs font-normal text-[color:var(--color-ink-subtle)]"
                >
                  {rowIndex + 1}
                </th>
                {Array.from({ length: columnCount }, (_, columnIndex) => (
                  <td
                    key={columnIndex}
                    className={`min-w-40 border-b border-r border-[color:var(--color-border)] p-0 ${selection.row === rowIndex && selection.column === columnIndex ? "outline outline-2 -outline-offset-2 outline-[color:var(--color-focus)]" : ""}`}
                  >
                    <input
                      aria-label={`Riga ${rowIndex + 1}, colonna ${columnIndex + 1}`}
                      value={row[columnIndex] ?? ""}
                      onFocus={() => setSelection({ row: rowIndex, column: columnIndex })}
                      onChange={(event) =>
                        updateCell(rowIndex, columnIndex, event.currentTarget.value)
                      }
                      className={`h-10 w-full min-w-0 bg-transparent px-3 outline-none ${rowIndex === 0 ? "font-semibold text-[color:var(--color-ink)]" : "text-[color:var(--color-ink-muted)]"}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-3 py-2 text-xs text-[color:var(--color-ink-subtle)]">
        <span>{rows.length} righe</span>
        <span>{columnCount} colonne</span>
      </div>
    </div>
  );
}

export function parseCsv(value: string): CsvDocument {
  const delimiter = detectDelimiter(value);
  const rows: string[][] = [[]];
  let field = "";
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"' && field.length === 0) quoted = true;
    else if (character === delimiter) {
      rows.at(-1)?.push(field);
      field = "";
    } else if (character === "\n") {
      rows.at(-1)?.push(field.replace(/\r$/, ""));
      rows.push([]);
      field = "";
    } else field += character;
  }
  rows.at(-1)?.push(field.replace(/\r$/, ""));
  if (rows.length > 1 && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === "") rows.pop();
  return { delimiter, rows: rows.length > 0 ? rows : [[""]] };
}

export function serializeCsv(document: CsvDocument): string {
  return document.rows
    .map((row) =>
      row
        .map((field) => {
          const escaped = field.replace(/"/g, '""');
          return field.includes(document.delimiter) || /["\r\n]/.test(field)
            ? `"${escaped}"`
            : escaped;
        })
        .join(document.delimiter)
    )
    .join("\r\n");
}

function detectDelimiter(value: string): CsvDocument["delimiter"] {
  const firstRecord = value.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [
    [",", countOutsideQuotes(firstRecord, ",")],
    [";", countOutsideQuotes(firstRecord, ";")],
    ["\t", countOutsideQuotes(firstRecord, "\t")]
  ] as const;
  return [...candidates].sort((left, right) => right[1] - left[1])[0][0];
}

function countOutsideQuotes(value: string, character: string) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '"') {
      if (quoted && value[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && value[index] === character) count += 1;
  }
  return count;
}
