export interface UserNameParts {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export function formatUserName(user: UserNameParts | null | undefined): string {
  if (!user) return "-";
  const fullName = [user.firstName, user.lastName]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
  return fullName || user.email?.trim() || "-";
}
