import { PointVente } from './pointVenteType';
import { Produit } from './produitsType';

export interface Stock extends Document {
  _id: string;
  produit: Produit;
  quantite: number;
  montant: number;
  pointVente?: PointVente;
  depotCentral: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StockModel extends Document {
  produit: Produit;
  quantite: number;
  montant: number;
  pointVente?: PointVente;
  depotCentral: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
