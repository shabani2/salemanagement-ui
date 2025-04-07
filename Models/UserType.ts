export interface User {
  _id: string;
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  region?: string;
  pointVente?: string;
  role: string;
  image?: string;
  password: string;
}
export interface UserModel {
  _id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  region?: string;
  pointVente?: string;
  role: string;
  image?: unknown;
  password: string;
}
