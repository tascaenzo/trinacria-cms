import { s, type Infer } from "@trinacria-cms/kernel";
import { UserStatusSchema } from "../users.schemas.js";

/**
 * DTO schema for creating a user through public API.
 */
export const CreateUserInputSchema = s.object(
  {
    email: s.string({ trim: true, toLowerCase: true, email: true }),
    displayName: s.string({ trim: true, minLength: 1, maxLength: 120 }),
  },
  { strict: true },
);

export type CreateUserInput = Infer<typeof CreateUserInputSchema>;

/**
 * DTO schema for updating the status of an existing user.
 */
export const UpdateUserStatusInputSchema = s.object(
  {
    status: UserStatusSchema,
  },
  { strict: true },
);

export type UpdateUserStatusInput = Infer<typeof UpdateUserStatusInputSchema>;

/**
 * DTO schema for list-users query parameters.
 */
export const ListUsersQuerySchema = s.object(
  {
    limit: s.number({ int: true, min: 1, max: 200 }).optional(),
    offset: s.number({ int: true, min: 0 }).optional(),
  },
  { strict: true },
);

export type ListUsersQuery = Infer<typeof ListUsersQuerySchema>;
