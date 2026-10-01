import type { CSSProperties } from "react";
import type {
  BlockAppearance,
  BlockColor,
  StructuredContentBlockType
} from "../../modules/entries/structured-document.contract.js";
export const BLOCK_TYPES: readonly StructuredContentBlockType[] = [
  "paragraph",
  "heading",
  "image",
  "quote",
  "list",
  "table",
  "layout",
  "divider"
];

export const BLOCK_COLORS: readonly {
  key: BlockColor;
  label: string;
  text: string;
  background: string;
}[] = [
  { key: "gray", label: "Grigio", text: "#787774", background: "#f1f1ef" },
  { key: "brown", label: "Marrone", text: "#9f6b53", background: "#f4eeee" },
  { key: "orange", label: "Arancione", text: "#d9730d", background: "#faebdd" },
  { key: "yellow", label: "Giallo", text: "#cb912f", background: "#fbf3db" },
  { key: "green", label: "Verde", text: "#448361", background: "#edf3ec" },
  { key: "blue", label: "Blu", text: "#337ea9", background: "#e7f3f8" },
  { key: "purple", label: "Viola", text: "#9065b0", background: "#f4f0f7" },
  { key: "pink", label: "Rosa", text: "#c14c8a", background: "#f9eef3" },
  { key: "red", label: "Rosso", text: "#d44c47", background: "#fdebec" }
];

export const BLOCK_META: Record<
  StructuredContentBlockType,
  {
    label: string;
    description: string;
    icon: "file-text" | "image" | "list" | "grid-2x2" | "columns-3" | "minus";
  }
> = {
  paragraph: {
    label: "Testo",
    description: "Un paragrafo di testo semplice",
    icon: "file-text"
  },
  heading: { label: "Titolo", description: "Una nuova sezione del documento", icon: "file-text" },
  image: { label: "Immagine", description: "Immagine, alt text e didascalia", icon: "image" },
  quote: { label: "Citazione", description: "Citazione con fonte facoltativa", icon: "file-text" },
  list: { label: "Elenco", description: "Elenco puntato o numerato", icon: "list" },
  table: { label: "Tabella", description: "Righe e colonne modificabili", icon: "grid-2x2" },
  layout: { label: "Layout", description: "Colonne con blocchi annidati", icon: "columns-3" },
  divider: { label: "Separatore", description: "Separa due sezioni", icon: "minus" }
};

export function blockAppearanceStyle(appearance?: BlockAppearance): CSSProperties {
  const textColor = colorValue(appearance?.textColor, "text");
  const backgroundColor = colorValue(appearance?.backgroundColor, "background");
  return {
    ...(textColor ? ({ "--color-ink": textColor } as CSSProperties) : {}),
    ...(textColor ? { color: textColor } : {}),
    ...(backgroundColor ? { backgroundColor } : {})
  };
}

export function colorValue(color: BlockColor | undefined, mode: "text" | "background") {
  const option = BLOCK_COLORS.find((candidate) => candidate.key === color);
  return option?.[mode];
}

export function createBlockId() {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `block-${uuid.replace(/[^a-z0-9_-]/gi, "").toLowerCase()}`;
}
