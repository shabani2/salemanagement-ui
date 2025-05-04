import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const UserRoleModel = [
  'SuperAdmin',
  'AdminRegion',
  'AdminPointVente',
  'Vendeur',
  'Gerant',
] as const;

export const UserRole = [
  'SuperAdmin',
  'AdminRegion',
  'AdminPointVente',
  'Vendeur',
  'Client',
] as const;
export type UserRole = (typeof UserRoleModel)[number];

export function isUserRole(role: string): number {
  switch (role) {
    case 'SuperAdmin':
      return 1;
    case 'AdminRegion':
      return 2;
    case 'AdminPointVente':
      return 3;
    case 'Vendeur':
      return 4;
    case 'Gerant':
      return 5;
    default:
      throw new Error(`Rôle invalide: ${role}`);
  }
}
