import { s, type Infer } from "@trinacria-cms/kernel";

/**
 * DTO schema for local user/password authentication.
 */
export const LoginWithPasswordInputSchema = s.object(
  {
    email: s.string({ trim: true, toLowerCase: true, email: true }),
    password: s.string({ minLength: 1, maxLength: 200 })
  },
  { strict: true }
);

export type LoginWithPasswordInput = Infer<typeof LoginWithPasswordInputSchema>;
