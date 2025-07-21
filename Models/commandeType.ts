import { Region } from './regionTypes';
import { PointVente } from './pointVenteType';
import { UserModel } from './UserType';
import { CommandeProduit } from './CommandeProduitType';
export interface Commande {
  _id?: string;
  numero: string;
  user: UserModel | string;
  region?: Region;
  pointVente?: PointVente | string;
  depotCentral?: boolean;
  statut: 'attente' | 'livrée' | 'annulée';
  produits: CommandeProduit[];
  createdAt?: Date;
  updatedAt?: Date;
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
