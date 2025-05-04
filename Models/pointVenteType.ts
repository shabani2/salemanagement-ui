import { Region } from './regionTypes';

export interface PointVente {
  _id: string;
  nom: string;
  adresse: string;
  region: Region | string;
}

export interface PointVenteModel {
  nom: string;
  adresse: string;
  region: string;
}
