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
  'Logisticien',
] as const;

export const UserRole = [
  'SuperAdmin',
  'AdminRegion',
  'AdminPointVente',
  'Vendeur',
  'Logisticien',
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
    case 'Logisticien':
      return 5;
    default:
      throw new Error(`Rôle invalide: ${role}`);
  }
}

export const typeOptions = [
  { label: 'Entrée', value: 'Entrée' },
  { label: 'Sortie', value: 'Sortie' },
  { label: 'Vente', value: 'Vente' },
  { label: 'Livraison', value: 'Livraison' },
  // { label: 'Commande', value: 'Commande' },
];

export const getOptionsByRole = (role: string) => {
  switch (role) {
    case 'SuperAdmin':
    case 'AdminRegion':
      return typeOptions;
    case 'AdminPointVente':
      return typeOptions.filter((opt) => ['Sortie', 'Vente', 'Commande'].includes(opt.value));
    case 'Vendeur':
      return typeOptions.filter((opt) => opt.value === 'Vente');
    default:
      return [];
  }
};

// utils/roleUtils.ts
export const getRoleOptionsByUser = (role: string): { label: string; value: string }[] => {
  switch (role) {
    case 'SuperAdmin':
      return UserRoleModel.map((r) => ({ label: r, value: r }));
    case 'AdminRegion':
      return UserRoleModel.filter((r) => r !== 'SuperAdmin').map((r) => ({ label: r, value: r }));
    case 'AdminPointVente':
      return ['Logisticien', 'Vendeur'].map((r) => ({ label: r, value: r }));
    default:
      return [];
  }
};

export function formatNombre(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace(/\u202f/g, '.');
}
