import { type Infer, s } from "@trinacria-cms/kernel";

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

export const MfaChallengeInputSchema = s.object(
  {
    challengeId: s.string({ trim: true, minLength: 32, maxLength: 200 })
  },
  { strict: true }
);

export type MfaChallengeInput = Infer<typeof MfaChallengeInputSchema>;

export const MfaCodeInputSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 6, maxLength: 32 })
  },
  { strict: true }
);

export type MfaCodeInput = Infer<typeof MfaCodeInputSchema>;

export const CompleteMfaLoginInputSchema = s.object(
  {
    challengeId: s.string({ trim: true, minLength: 32, maxLength: 200 }),
    code: s.string({ trim: true, minLength: 6, maxLength: 32 })
  },
  { strict: true }
);

export type CompleteMfaLoginInput = Infer<typeof CompleteMfaLoginInputSchema>;

export const DisableMfaInputSchema = s.object(
  {
    currentPassword: s.string({ minLength: 1, maxLength: 200 }),
    code: s.string({ trim: true, minLength: 6, maxLength: 32 })
  },
  { strict: true }
);

export type DisableMfaInput = Infer<typeof DisableMfaInputSchema>;

export const UpdateAuthenticatedUserProfileInputSchema = s.object(
  {
    firstName: s.string({ trim: true, minLength: 1, maxLength: 60 }),
    lastName: s.string({ trim: true, minLength: 1, maxLength: 60 }),
    locale: s.enum(["en", "it"] as const).optional()
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

export const RequestPasswordResetInputSchema = s.object(
  {
    email: s.string({ trim: true, toLowerCase: true, email: true })
  },
  { strict: true }
);

export type RequestPasswordResetInput = Infer<typeof RequestPasswordResetInputSchema>;

export const CompletePasswordResetInputSchema = s.object(
  {
    token: s.string({ trim: true, minLength: 20, maxLength: 500 }),
    newPassword: s.string({ minLength: 12, maxLength: 200 })
  },
  { strict: true }
);

export type CompletePasswordResetInput = Infer<typeof CompletePasswordResetInputSchema>;

export const RequestEmailVerificationInputSchema = s.object(
  {
    email: s.string({ trim: true, toLowerCase: true, email: true })
  },
  { strict: true }
);

export type RequestEmailVerificationInput = Infer<typeof RequestEmailVerificationInputSchema>;

export const ConfirmEmailVerificationInputSchema = s.object(
  {
    token: s.string({ trim: true, minLength: 20, maxLength: 500 })
  },
  { strict: true }
);

export type ConfirmEmailVerificationInput = Infer<typeof ConfirmEmailVerificationInputSchema>;

export const PublicRegistrationInputSchema = s.object(
  {
    email: s.string({ trim: true, toLowerCase: true, email: true }),
    firstName: s.string({ trim: true, minLength: 1, maxLength: 60 }),
    lastName: s.string({ trim: true, minLength: 1, maxLength: 60 }),
    password: s.string({ minLength: 12, maxLength: 200 })
  },
  { strict: true }
);

export type PublicRegistrationInput = Infer<typeof PublicRegistrationInputSchema>;

export const AcceptUserInviteInputSchema = s.object(
  {
    token: s.string({ trim: true, minLength: 20, maxLength: 500 }),
    password: s.string({ minLength: 12, maxLength: 200 })
  },
  { strict: true }
);

export type AcceptUserInviteInput = Infer<typeof AcceptUserInviteInputSchema>;
