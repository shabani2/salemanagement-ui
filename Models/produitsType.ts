// types/produitsType.ts

// Interface pour la catégorie
export interface Categorie {
  _id?: string;
  nom: string;
  type: string;
  image?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategorieModel {
  _id?: string;
  nom: string;
  type: string;
  image?: string | File | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface pour le produit
export interface Produit {
  _id?: string;
  nom: string;
  categorie: Categorie | string;
  prix: number;
  prixVente: number;
  tva: number;
  marge?: number;
  seuil?: number;
  netTopay?: number;
  unite?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProduitModel {
  nom: string;
  categorie: string | Categorie;
  prix: number;
  prixVente: number;
  tva: number;
  marge?: number;
  seuil?: number;
  netTopay?: number;
  unite?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
