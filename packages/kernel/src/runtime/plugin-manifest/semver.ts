import { satisfies, valid, validRange } from "semver";

/** npm range semantics: strict parsing and opt-in prereleases. */
export function satisfiesVersion(version: string, range: string): boolean {
  return valid(version) !== null && validRange(range) !== null && satisfies(version, range);
}

export function isValidVersion(value: string): boolean {
  return valid(value) !== null;
}

export function isValidVersionRange(range: string): boolean {
  return validRange(range) !== null;
}
