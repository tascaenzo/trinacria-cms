import type { ColorSwatchGridProps } from "./color-swatch-grid.types.js";

/** Accessible palette grid with no assumptions about the consuming domain. */
export function ColorSwatchGrid({
  disabled = false,
  label,
  onSelect,
  options,
  renderSwatch,
  selected
}: ColorSwatchGridProps) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium text-[color:var(--color-ink-subtle)]">{label}</p>
      <div className="grid grid-cols-9 gap-1" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-label={`${label}: ${option.label}`}
            aria-pressed={selected === option.value}
            disabled={disabled}
            className="flex h-6 w-6 items-center justify-center rounded border border-[color:var(--color-border)] text-xs font-semibold transition hover:scale-110 aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-[color:var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-45"
            style={{ color: option.foregroundColor, backgroundColor: option.backgroundColor }}
            onClick={() => onSelect(option.value)}
          >
            {renderSwatch?.(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
