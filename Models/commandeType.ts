import { Region } from './regionTypes';
import { PointVente } from './pointVenteType';
import { User, UserModel } from './UserType';
import { CommandeProduit } from './CommandeProduitType';

export interface Commande {
  _id: string;
  numero: string;
  user: User;
  region?: Region;
  pointVente?: PointVente;
  depotCentral: boolean;
  produits: CommandeProduit[];
  statut: 'attente' | 'livrée' | 'annulée';
  createdAt: string;
  updatedAt: string;

  // Champs enrichis backend
  montant?: number;
  nombreCommandeProduit?: number;
  tauxLivraison?: number;
}

export interface CommandeModel {
  _id: string;
  user: UserModel | string;
  region?: Region;
  pointVente?: PointVente | string;
  depotCentral?: boolean;
  statut: 'attente' | 'livrée' | 'annulée';
  produits: CommandeProduit[];
  createdAt?: Date;
  updatedAt?: Date;
}
