import { s, type Infer } from "@trinacria-cms/kernel";

/**
 * DTO schema for first-install bootstrap payload.
 * This creates the first administrator account and local credentials.
 */
export const InstallBootstrapInputSchema = s.object(
  {
    email: s.string({ trim: true, toLowerCase: true, email: true }),
    displayName: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    password: s.string({ minLength: 10, maxLength: 200 }),
  },
  { strict: true },
);

export type InstallBootstrapInput = Infer<typeof InstallBootstrapInputSchema>;
