// file: [votre fichier utilitaire]

import { StaticImageData } from 'next/image';
import { API_URL } from '../apiConfig';
// 🛑 Imports des images par défaut à centraliser
import bso1 from '../../assets/images/avatar1.jpg';
import cereal from '../../assets/images/cereal1.jpeg';

// Type pour la propriété API_URL dans apiConfig.ts
type ApiUrlSource = string | (() => string);

/**
 * MAPPING CENTRALISÉ DES IMAGES PAR DÉFAUT
 * Utilisé pour référencer les StaticImageData par un simple code (string ou number).
 */
export const DEFAULT_IMAGES_MAP: Record<string, StaticImageData> = {
  '1': bso1, // Utilisé pour l'avatar (anciennement `bso1`)
  '2': cereal, // Utilisé pour le produit (anciennement `cereal`)
  // Ajoutez d'autres images ici si nécessaire
};

// Type d'entrée pour la sélection d'image par défaut
type DefaultImageCode = keyof typeof DEFAULT_IMAGES_MAP | undefined;

// ----------------------------------------------------------------------
// Les fonctions getApiBaseUrlString et cleanImagePath ne changent PAS
// ----------------------------------------------------------------------
export function getApiBaseUrlString(): string {
  // ... (Logique inchangée)
  const urlSource: ApiUrlSource = API_URL;
  let baseUrl: string;
  if (typeof urlSource === 'function') {
    baseUrl = urlSource();
  } else {
    baseUrl = urlSource;
  }
  return baseUrl.toString().replace(/\/+$/, '');
}

export const cleanImagePath = (path: string): string =>
  path.replace(/^(\.\.\/)+/, '').replace(/^\/+/, '');
// ----------------------------------------------------------------------

/**
 * Résout la source finale de l'image (locale ou distante) en une URL string.
 * @param imagePath Le chemin d'image depuis l'objet (utilisateur, produit, etc.)
 * @param defaultCode Le code ('1', '2', etc.) de l'image locale par défaut à utiliser.
 * @returns {string} L'URL complète de l'image.
 */
export function resolveFinalImagePath(
  imagePath: string | undefined | null,
  defaultCode: DefaultImageCode = '1' // '1' est le défaut (e.g., l'avatar)
): string {
  const apiBaseUrl = getApiBaseUrlString();
  const isAbsolute = (u: string) => /^https?:\/\//i.test(u);

  if (imagePath && imagePath.trim().length > 0) {
    // 1. Image distante absolue ou relative
    if (isAbsolute(imagePath)) {
      return imagePath;
    } else {
      return `${apiBaseUrl}/${cleanImagePath(imagePath)}`;
    }
  }
  // 3. Image par défaut (locale)
  else {
    // 🛑 Recherche de l'image par défaut via le code
    const defaultImage = defaultCode ? DEFAULT_IMAGES_MAP[defaultCode] : undefined;

    if (!defaultImage) {
      // Option de secours si le code est invalide ou manquant
      // Ici, on utilise l'avatar par défaut si un code non mappé est donné
      return DEFAULT_IMAGES_MAP['1'].src;
    }

    // Retourne le chemin .src de la StaticImageData
    return defaultImage.src;
  }
}
