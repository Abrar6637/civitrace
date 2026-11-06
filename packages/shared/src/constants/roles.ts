// Database mein save hone wale user roles.
// Visitor login nahi karta, is liye yahan nahi hai.
export const USER_ROLES = ['citizen', 'area_admin', 'super_admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES: readonly UserRole[] = ['area_admin', 'super_admin'];