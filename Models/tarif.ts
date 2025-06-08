// models/tarifModels.ts
import { ReactNode } from 'react';

export interface TarifDetails {
  ancienPrix: number;
  nouveauPrix: number;
  duree: string;
  economie: number;
  devise: string;
}

export interface FeatureGroup {
  titre: string;
  items: string[];
}

export interface TarifModel {
  periode: ReactNode;
  prix: ReactNode;
  id: string;
  nom: string;
  description: string;
  details: TarifDetails;
  renouvellement: string;
  ctaText: string;
  features: FeatureGroup[];
}
