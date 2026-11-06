import { z } from 'zod';
import { USER_ROLES } from '../constants/roles';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().optional(), // shown publicly instead of the real name
  email: z.email().optional(),
  phone: z.string().optional(),
  role: z.enum(USER_ROLES),
  locale: z.enum(['en', 'ur']).default('ur'),
  status: z.enum(['active', 'suspended']),
  assignedDistricts: z.array(z.string()).optional(), // for area admins
  createdAt: z.string(),
});

export const loginInputSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ---------- Admin management (super admin only) ----------

const ADMIN_ROLE_VALUES = ['area_admin', 'super_admin'] as const;

const pakistaniMobile = z
  .string()
  .trim()
  .regex(/^(\+92|0)3\d{9}$/, 'Enter a Pakistani mobile number, e.g. 03001234567');

const adminFields = {
  name: z.string().trim().min(3, 'Enter the full name').max(80),
  phone: pakistaniMobile.optional(),
  role: z.enum(ADMIN_ROLE_VALUES),
  assignedDistricts: z.array(z.string()),
};

const needsDistricts = (v: { role: string; assignedDistricts: string[] }) =>
  v.role !== 'area_admin' || v.assignedDistricts.length > 0;
const needsDistrictsError = {
  message: 'Assign at least one district to an area admin',
  path: ['assignedDistricts'],
};

export const adminCreateInputSchema = z
  .object({ ...adminFields, email: z.email('Enter a valid email') })
  .refine(needsDistricts, needsDistrictsError);

export const adminUpdateInputSchema = z.object(adminFields).refine(needsDistricts, needsDistrictsError);

export const suspendInputSchema = z.object({
  reason: z.string().trim().min(5, 'Give a reason (at least 5 characters)').max(500),
});

export type User = z.infer<typeof userSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type AdminCreateInput = z.infer<typeof adminCreateInputSchema>;
export type AdminUpdateInput = z.infer<typeof adminUpdateInputSchema>;
export type SuspendInput = z.infer<typeof suspendInputSchema>;

// ---------- Own account ----------

export const profileUpdateInputSchema = z.object({
  name: z.string().trim().min(3, 'Enter your full name').max(80),
  phone: pakistaniMobile.optional(),
  locale: z.enum(['en', 'ur']),
});

const strongPassword = z
  .string()
  .min(10, 'Use at least 10 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number');

export const passwordChangeInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'The passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'Choose a password different from the current one',
    path: ['newPassword'],
  });

export type ProfileUpdateInput = z.infer<typeof profileUpdateInputSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeInputSchema>;