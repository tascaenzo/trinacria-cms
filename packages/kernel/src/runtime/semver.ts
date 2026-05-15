interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: readonly string[];
}

const VERSION_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+[0-9A-Za-z-.]+)?$/;

function parseVersion(version: string): ParsedVersion | null {
  const match = VERSION_REGEX.exec(version.trim());
  if (!match) return null;

  const prerelease = match[4] ? match[4].split(".") : [];

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease
  };
}

function comparePrerelease(left: readonly string[], right: readonly string[]): number {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const l = left[index];
    const r = right[index];
    if (l === undefined) return -1;
    if (r === undefined) return 1;
    if (l === r) continue;

    const lAsNumber = Number(l);
    const rAsNumber = Number(r);
    const lIsNumber = Number.isInteger(lAsNumber) && String(lAsNumber) === l;
    const rIsNumber = Number.isInteger(rAsNumber) && String(rAsNumber) === r;

    if (lIsNumber && rIsNumber) return lAsNumber < rAsNumber ? -1 : 1;
    if (lIsNumber) return -1;
    if (rIsNumber) return 1;
    return l < r ? -1 : 1;
  }

  return 0;
}

function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  if (left.major !== right.major) return left.major < right.major ? -1 : 1;
  if (left.minor !== right.minor) return left.minor < right.minor ? -1 : 1;
  if (left.patch !== right.patch) return left.patch < right.patch ? -1 : 1;
  return comparePrerelease(left.prerelease, right.prerelease);
}

function compare(version: string, target: string): number {
  const left = parseVersion(version);
  const right = parseVersion(target);
  if (!left || !right) return Number.NaN;
  return compareVersions(left, right);
}

function evaluateComparator(version: string, comparator: string): boolean {
  const normalized = comparator.trim();
  if (!normalized || normalized === "*") return true;

  const operatorMatch = /^(<=|>=|<|>|=|\^|~)?\s*(.+)$/.exec(normalized);
  if (!operatorMatch) return false;

  const operator = operatorMatch[1] ?? "=";
  const target = operatorMatch[2].trim();
  const parsedTarget = parseVersion(target);
  const parsedVersion = parseVersion(version);
  if (!parsedTarget || !parsedVersion) return false;

  const ordering = compareVersions(parsedVersion, parsedTarget);

  if (operator === "=") return ordering === 0;
  if (operator === ">") return ordering > 0;
  if (operator === ">=") return ordering >= 0;
  if (operator === "<") return ordering < 0;
  if (operator === "<=") return ordering <= 0;

  if (operator === "^") {
    const upperBound = `${parsedTarget.major + 1}.0.0`;
    return compare(version, target) >= 0 && compare(version, upperBound) < 0;
  }

  if (operator === "~") {
    const upperBound = `${parsedTarget.major}.${parsedTarget.minor + 1}.0`;
    return compare(version, target) >= 0 && compare(version, upperBound) < 0;
  }

  return false;
}

function isValidComparator(comparator: string): boolean {
  const normalized = comparator.trim();
  if (!normalized || normalized === "*") return true;

  const operatorMatch = /^(<=|>=|<|>|=|\^|~)?\s*(.+)$/.exec(normalized);
  if (!operatorMatch) return false;

  const target = operatorMatch[2].trim();
  return parseVersion(target) !== null;
}

/**
 * Minimal semver matcher used by core manifest compatibility checks.
 * Supports exact, inequalities, caret, tilde, wildcard, AND ranges,
 * and OR groups with `||`.
 */
export function satisfiesVersion(version: string, range: string): boolean {
  const normalizedRange = range.trim();
  if (!normalizedRange || normalizedRange === "*") return true;

  const groups = normalizedRange
    .split("||")
    .map((group) => group.trim())
    .filter(Boolean);
  if (groups.length === 0) return true;

  return groups.some((group) =>
    group
      .split(/\s+/)
      .filter(Boolean)
      .every((comparator) => evaluateComparator(version, comparator))
  );
}

/**
 * Returns true when a string is a valid strict semver.
 */
export function isValidVersion(value: string): boolean {
  return parseVersion(value.trim()) !== null;
}

/**
 * Returns true when a semver range is syntactically valid for this matcher.
 */
export function isValidVersionRange(range: string): boolean {
  const normalizedRange = range.trim();
  if (!normalizedRange || normalizedRange === "*") return true;

  const groups = normalizedRange
    .split("||")
    .map((group) => group.trim())
    .filter(Boolean);
  if (groups.length === 0) return false;

  return groups.every((group) => {
    const comparators = group.split(/\s+/).filter(Boolean);
    if (comparators.length === 0) return false;
    return comparators.every((comparator) => isValidComparator(comparator));
  });
}
