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

export const UpdateAuthenticatedUserProfileInputSchema = s.object(
  {
    displayName: s.string({ trim: true, minLength: 1, maxLength: 120 })
  },
  { strict: true }
);

export type UpdateAuthenticatedUserProfileInput = Infer<
  typeof UpdateAuthenticatedUserProfileInputSchema
>;

export const ChangeAuthenticatedUserPasswordInputSchema = s.object(
  {
    currentPassword: s.string({ minLength: 1, maxLength: 200 }),
    newPassword: s.string({ minLength: 12, maxLength: 200 })
  },
  { strict: true }
);

export type ChangeAuthenticatedUserPasswordInput = Infer<
  typeof ChangeAuthenticatedUserPasswordInputSchema
>;
