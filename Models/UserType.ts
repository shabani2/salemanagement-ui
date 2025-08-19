import { PointVente } from './pointVenteType';
import { Region } from './regionTypes';

export interface User {
  createdAt: any;
  createdAt: any;
  createdAt: any;
  createdAt: any;
  _id: string;
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  region?: string | Region;
  pointVente?: string | PointVente;
  role: string;
  image?: string;
  password: string;
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
  password: string;
}

export function isRegion(obj: unknown): obj is Region {
  return typeof obj === 'object' && obj !== null && 'nom' in obj;
}

export function isPointVente(obj: unknown): obj is PointVente {
  return typeof obj === 'object' && obj !== null && 'nom' in obj;
}
