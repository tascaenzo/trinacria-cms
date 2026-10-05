import { type Infer, s } from "@trinacria-cms/kernel";

/**
 * Locale pattern: two-letter language code with optional uppercase region.
 */
const LOCALE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

/**
 * DTO schema for first-install bootstrap payload.
 * Database and runtime prerequisites must pass before bootstrap.
 */
export const InstallBootstrapInputSchema = s.object(
  {
    // Admin account
    firstName: s.string({ trim: true, minLength: 1, maxLength: 60 }),
    lastName: s.string({ trim: true, minLength: 1, maxLength: 60 }),
    email: s.string({ trim: true, toLowerCase: true, email: true }),
    password: s.string({ minLength: 10, maxLength: 200 }),
    confirmPassword: s.string({ minLength: 10, maxLength: 200 }),

    // Site settings
    dataMode: s.enum(["empty", "demo"] as const).optional(),
    siteName: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    siteTagline: s.string({ trim: true, maxLength: 160 }).optional(),
    locale: s.string({ trim: true, pattern: LOCALE_PATTERN }).optional(),
    timezone: s.string({ trim: true, minLength: 3, maxLength: 120 }).optional()
  },
  { strict: true }
);

export type InstallBootstrapInput = Infer<typeof InstallBootstrapInputSchema>;
