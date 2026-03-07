/**
 * Shared formatting helpers keep repeated UI concerns out of page components.
 */
export function formatDateTime(value: string | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function tryParseJson(value: string): unknown {
  return JSON.parse(value);
}
