import { UserRole } from '@/lib/utils';
import { PointVente } from './pointVenteType';
import { Region } from './regionTypes';

// export interface User {
//   createdAt: any;
//   _id: string;
//   id: string;
//   nom: string;
//   prenom: string;
//   email: string;
//   telephone: string;
//   adresse: string;
//   region?: string | Region;
//   pointVente?: string | PointVente;
//   role: string;
//   image?: string;
//   password: string;
// }

export interface User {
  /** Si ton API renvoie `_id`, tu peux le garder tel quel ou le mapper en `id` */
  id?: string; // facultatif si tu conserves _id
  _id?: string; // courant avec Mongo; sinon supprime-le et garde `id`

  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  role: UserRole;

  image?: string | null;

  /** Références côté UI = simples IDs */
  pointVente?: string | null; // id du PointVente
  region?: string | null; // id de la Region

  firstConnection: boolean; // default: true
  emailVerified: boolean; // default: true
  isActive: boolean; // default: true
  tokenVersion: number; // default: 0

  /** Champs de sécurité/ops renvoyés (potentiellement null) */
  emailVerifyTokenHash?: string | null;
  emailVerifyTokenExpires?: string | null; // ISO date string
  resetPasswordTokenHash?: string | null;
  resetPasswordTokenExpires?: string | null; // ISO date string
  password?: string;
  /** Timestamps (ISO strings) */
  createdAt: string;
  updatedAt: string;
}
export interface UserModel {
  _id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  region?: string | Region;
  pointVente?: string | PointVente;
  role: string;
  image?: unknown;
  // password: string;
}

export function isRegion(obj: unknown): obj is Region {
  return typeof obj === 'object' && obj !== null && 'nom' in obj;
}

export function isPointVente(obj: unknown): obj is PointVente {
  return typeof obj === 'object' && obj !== null && 'nom' in obj;
}
