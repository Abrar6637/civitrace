import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind classes ko jorta hai aur takrane wali classes hata deta hai
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}