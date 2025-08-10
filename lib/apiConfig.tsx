import axios from 'axios';

/** Normalise une URL (supprime les //, retire le trailing slash) */
const normalizeUrl = (u: string) => {
  if (!u) return '';
  try {
    // supprime les doubles slash accidentels (sauf après le protocole)
    const fixed = u.replace(/([^:]\/)\/+/g, '$1');
    return fixed.endsWith('/') ? fixed.slice(0, -1) : fixed;
  } catch {
    return u.endsWith('/') ? u.slice(0, -1) : u;
  }
};

/** Lecture robuste de l'environnement courant */
const envFromRuntime = (): 'production' | 'preview' | 'development' | 'test' => {
  // priorité: NEXT_PUBLIC_ENV (manuel) > VERCEL_ENV (vercel) > NODE_ENV
  const v =
    (process.env.NEXT_PUBLIC_ENV as string) ||
    (process.env.VERCEL_ENV as string) ||
    (process.env.NODE_ENV as string) ||
    'development';

  // uniformiser
  if (v === 'prod') return 'production';
  if (v === 'staging') return 'preview';
  if (v === 'preview') return 'preview';
  if (v === 'test') return 'test';
  if (v === 'production') return 'production';
  return 'development';
};

/** Résolution déterministe de l'URL d'API */
export const getApiUrl = (): string => {
  // 1) URL explicite => toujours prioritaire (build-time env public)
  const explicit = process.env.NEXT_PUBLIC_API_URL;
  if (explicit) return normalizeUrl(explicit);

  // 2) Choix par environnement
  const currentEnv = envFromRuntime();

  // Map des URLs par environnement (toutes optionnelles; on prend la meilleure dispo)
  const apiProd = process.env.NEXT_PUBLIC_API_PROD;
  const apiPreview =
    process.env.NEXT_PUBLIC_API_PREVIEW || process.env.NEXT_PUBLIC_API_STAGING;
  const apiDev = process.env.NEXT_PUBLIC_API_DEV;
  const apiTest = process.env.NEXT_PUBLIC_API_TEST;
  const apiLocal = process.env.NEXT_PUBLIC_API_LOCAL || 'http://localhost:8000';

  // 3) Sélection en fonction de l'env
  let resolved =
    (currentEnv === 'production' && apiProd) ||
    (currentEnv === 'preview' && (apiPreview || apiProd)) ||
    (currentEnv === 'test' && (apiTest || apiPreview || apiProd)) ||
    (currentEnv === 'development' && (apiDev || apiLocal)) ||
    apiDev || apiPreview || apiProd || apiLocal;

  // 4) Côté client: si on est vraiment en localhost et que rien n’est défini, fallback sur local
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (!resolved && (host === 'localhost' || host === '127.0.0.1')) {
      resolved = apiLocal;
    }
  }

  return normalizeUrl(resolved);
};

/** Variable résolue à l’import, mais surchargable runtime par setApiBaseUrl */
let API_URL_RUNTIME = getApiUrl();
export const API_URL = API_URL_RUNTIME;

/** Client Axios (unique). Si besoin, on peut changer la baseURL au runtime via setApiBaseUrl */
export const apiClient = axios.create({
  baseURL: API_URL_RUNTIME,
  headers: { 'Content-Type': 'application/json' },
});

/** Override runtime pratique (ex: tests, preview, A/B) */
export const setApiBaseUrl = (nextBaseUrl: string) => {
  const url = normalizeUrl(nextBaseUrl);
  API_URL_RUNTIME = url;
  apiClient.defaults.baseURL = url;
};

/** Auth header (client-only) */
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers = config.headers ?? {};
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore – axios v1 types autorisent string | number | boolean
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});
