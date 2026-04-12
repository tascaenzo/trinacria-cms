/**
 * Small local class merger used to avoid pulling an external utility package
 * for a very small need in the admin design system.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
