// Modèle Regions
export interface Region {
  _id?: string;
  nom: string;
  ville: string;
  pointVenteCount?: number;
  createdAt: Date;
}

export interface RegionStats {
  region: string;
  nombrepointvente: number;
  nombreproduit: number;
  Entrée: number;
  Sortie: number;
  Vente: number;
  Livraison: number;
  Commande: number;
}
