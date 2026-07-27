import { z } from "zod";

// ─── Common ────────────────────────────────────────────

export const emailSchema = z.string().email("Invalid email address").toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number").optional();

// ─── User Forms ────────────────────────────────────────

export const createUserFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: phoneSchema,
  jobTitle: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  teamId: z.string().uuid().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const updateUserFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100).optional(),
  lastName: z.string().min(1, "Last name is required").max(100).optional(),
  email: emailSchema.optional(),
  phone: z.string().optional(),
  jobTitle: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  teamId: z.string().uuid().nullable().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
});

export const inviteUserFormSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const suspendUserFormSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
  suspendedUntil: z.date().optional(),
});

export const resetPasswordFormSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
  sendEmail: z.boolean().default(false),
});

export const changePasswordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ─── Profile Form ──────────────────────────────────────

export const updateProfileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().optional(),
  jobTitle: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
});

// ─── Team Forms ────────────────────────────────────────

export const createTeamFormSchema = z.object({
  name: z.string().min(1, "Team name is required").max(255),
  description: z.string().max(1000).optional(),
  managerId: z.string().uuid().optional(),
});

export const updateTeamFormSchema = z.object({
  name: z.string().min(1, "Team name is required").max(255).optional(),
  description: z.string().max(1000).optional(),
  managerId: z.string().uuid().nullable().optional(),
});

// ─── Search & Filter ───────────────────────────────────

export const userSearchSchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
  teamId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  sortBy: z.enum(["firstName", "lastName", "email", "createdAt", "lastLoginAt", "isActive"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// ─── Infer Types ───────────────────────────────────────

export type CreateUserFormData = z.infer<typeof createUserFormSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserFormSchema>;
export type InviteUserFormData = z.infer<typeof inviteUserFormSchema>;
export type SuspendUserFormData = z.infer<typeof suspendUserFormSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileFormSchema>;
export type CreateTeamFormData = z.infer<typeof createTeamFormSchema>;
export type UpdateTeamFormData = z.infer<typeof updateTeamFormSchema>;
export type UserSearchFormData = z.infer<typeof userSearchSchema>;
