import { PointVente } from './pointVenteType';
import { Produit } from './produitsType';
import { Region } from './regionTypes';

export interface Stock extends Document {
  _id: string;
  produit: Produit;
  quantite: number;
  montant: number;
  pointVente?: PointVente;
  region?: Region;
  depotCentral: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StockModel extends Document {
  produit: Produit;
  quantite: number;
  montant: number;
  pointVente?: PointVente;
  region?: Region;
  depotCentral: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
