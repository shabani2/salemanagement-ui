// Interface pour la catégorie
export interface Categorie {
  _id: string; // optionnel si l'objet est nouveau
  nom: string;
  type: string;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface pour le produit
export interface Produit {
  _id: string; // optionnel si l'objet est nouveau
  nom: string;
  categorie: string | Categorie; // peut être une référence ou un objet peuplé
  prix: number;
  tva: number;
  numeroSerie: string;
  codeBar: string;
  // image?: string; // décommenter si tu veux le rajouter plus tard
  createdAt?: Date;
  updatedAt?: Date;
}
