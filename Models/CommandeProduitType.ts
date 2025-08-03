import { MouvementStock } from './mouvementStockType';
import { Produit } from './produitsType';

export interface CommandeProduit {
  _id: string;
  commandeId: string;
  produit: Produit;
  quantite: number;
  statut: 'attente' | 'livré' | 'annulé';
  mouvementStockId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommandeProduitModel {
  _id: string;
  produit: Produit | string;
  quantite: number;
  statut: 'attente' | 'livré' | 'annulé';
  mouvementStockId?: MouvementStock | string; // Nullable, rempli quand livré
}
