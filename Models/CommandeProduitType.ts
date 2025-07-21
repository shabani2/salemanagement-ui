import { MouvementStock } from './mouvementStockType';
import { Produit } from './produitsType';

export interface CommandeProduit {
  _id?: string; // Optional for new products
  produit: Produit | string;
  quantite: number;
  statut: 'attente' | 'livré' | 'annulé';
  mouvementStockId?: MouvementStock | string; // Nullable, rempli quand livré
}

export interface CommandeProduitModel {
  _id: string;
  produit: Produit | string;
  quantite: number;
  statut: 'attente' | 'livré' | 'annulé';
  mouvementStockId?: MouvementStock | string; // Nullable, rempli quand livré
}
