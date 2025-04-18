import { PointVente } from "./pointVenteType";
import { Produit } from "./produitsType";

export interface MouvementStock {  
    _id : string;
    pointVente?: PointVente;
    depotCentral: boolean;
    produit: Produit
    type: 'Entrée' | 'Sortie' | 'Vente' | 'Livraison' | 'Commande';
    quantite: number;
    montant : number;   
    statut: 'En Attente' | 'Validée';
  }

  export interface MouvementStockModel {   
    pointVente?: PointVente;
    depotCentral: boolean;
    produit: Produit
    type: 'Entrée' | 'Sortie' | 'Vente' | 'Livraison' | 'Commande';
    quantite: number;
    montant : number;  
    statut: 'En Attente' | 'Validée';
  }