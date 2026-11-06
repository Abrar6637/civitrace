import {
  Building2,
  ClipboardList,
  FileBarChart,
  History,
  LayoutDashboard,
  MessageSquareText,
  MapPinned,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@civitrace/shared';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[]; // khaali ho to sab admins dekh sakte hain
};

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Operations',
    items: [
      { to: '/complaints', label: 'Complaints', icon: ClipboardList },
      { to: '/verification', label: 'Verification', icon: ShieldCheck },
            { to: '/feedback', label: 'Feedback', icon: MessageSquareText },
      { to: '/assets', label: 'Assets', icon: MapPinned },
      { to: '/projects', label: 'Projects', icon: Building2 },
      { to: '/budgets', label: 'Budgets', icon: Wallet },
    ],
  },
  {
    title: 'Insights',
    items: [
      { to: '/reports', label: 'Reports', icon: FileBarChart },
      { to: '/audit-log', label: 'Audit log', icon: History, roles: ['super_admin'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/users', label: 'Users', icon: Users, roles: ['super_admin'] },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];