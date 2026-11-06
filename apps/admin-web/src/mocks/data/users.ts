import type { User } from '@civitrace/shared';

// Mock only. The real backend stores password hashes, never plain passwords.
export type MockUserRecord = {
  user: User;
  password: string;
  mustChangePassword: boolean;
  lastLoginAt?: string;
};

const admin = (
  id: string,
  name: string,
  email: string,
  role: User['role'],
  assignedDistricts: string[] | undefined,
  status: User['status'] = 'active'
): MockUserRecord => ({
  password: 'Admin@123',
  mustChangePassword: false,
  user: { id, name, email, role, locale: 'en', status, assignedDistricts, createdAt: '2026-10-01T09:00:00.000Z' },
});

const citizen = (id: string, name: string, displayName: string, phone: string, status: User['status'] = 'active'): MockUserRecord => ({
  password: 'Citizen@123',
  mustChangePassword: false,
  user: { id, name, displayName, phone, role: 'citizen', locale: 'ur', status, createdAt: '2026-10-10T09:00:00.000Z' },
});

export const mockUsers: MockUserRecord[] = [
  admin('u_super_1', 'Abrar Hussain', 'superadmin@civitrace.app', 'super_admin', undefined),
  admin('u_area_1', 'Ayesha Khan', 'lahore.admin@civitrace.app', 'area_admin', ['Lahore', 'Kasur']),
  admin('u_area_2', 'Usman Tariq', 'faisalabad.admin@civitrace.app', 'area_admin', ['Faisalabad', 'Jhang']),
  admin('u_area_3', 'Hamza Ali', 'multan.admin@civitrace.app', 'area_admin', ['Multan'], 'suspended'),
  {
    ...citizen('u_citizen_1', 'Bilal Ahmed', 'Bilal A.', '03000000101'),
    user: {
      id: 'u_citizen_1',
      name: 'Bilal Ahmed',
      displayName: 'Bilal A.',
      email: 'citizen@civitrace.app',
      phone: '03000000101',
      role: 'citizen',
      locale: 'ur',
      status: 'active',
      createdAt: '2026-10-10T09:00:00.000Z',
    },
  },
  citizen('u_citizen_2', 'Sample Citizen Two', 'Resident, Raiwind', '03000000102'),
  citizen('u_citizen_3', 'Sample Citizen Three', 'Resident, Kasur', '03000000103'),
  citizen('u_citizen_4', 'Sample Citizen Four', 'Resident, Multan', '03000000104'),
  citizen('u_citizen_5', 'Sample Citizen Five', 'Resident, Murree', '03000000105', 'suspended'),
];