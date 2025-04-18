import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const UserRoleModel = ['SuperAdmin', 'AdminRegion', 'AdminPointVente'] as const;

export const UserRole = [
  'SuperAdmin',
  'AdminRegion',
  'AdminPointVente',
  'Vendeur',
  'Client',
] as const;
