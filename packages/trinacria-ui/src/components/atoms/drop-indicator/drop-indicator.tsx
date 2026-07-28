/** A neutral insertion affordance for sortable lists, blocks and columns. */
export function DropIndicator() {
  return (
    <div className="relative h-0" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 z-20 h-0.5 rounded-full bg-[color:var(--color-focus)]" />
    </div>
  );
}
