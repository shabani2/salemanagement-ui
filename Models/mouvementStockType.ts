import { PointVente } from './pointVenteType';
import { Produit } from './produitsType';
import { Region } from './regionTypes';
import { User } from './UserType';

export interface MouvementStock {
  _id: string;
  pointVente?: PointVente;
  depotCentral: boolean;
  produit: Produit;
  region?: Region;
  user?: User;
  type: 'Entrée' | 'Sortie' | 'Vente' | 'Livraison' | 'Commande';
  quantite: number;
  montant: number;
  statut: boolean; //'En Attente' | 'Validée';
  createdAt?: string;
  updatedAt?: string;
}

export interface MouvementStockModel {
  _id: string;
  pointVente?: PointVente;
  region?: Region;
  depotCentral: boolean;
  produit: Produit;
  user?: User;
  type: 'Entrée' | 'Sortie' | 'Vente' | 'Livraison' | 'Commande';
  quantite: number;
  montant: number;
  statut: 'En Attente' | 'Validée';
  createdAt?: string;
  updatedAt?: string;
}
