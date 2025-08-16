import axios from 'axios';

/** === VOS VALEURS PAR DÉFAUT SANS .env === */
const DEFAULT_API_FALLBACK = 'https://agricap-api-3a2d9a422767.herokuapp.com';
const HOST_TO_API: Record<string, string> = {
  'agricap-ui-429dded64762.herokuapp.com': DEFAULT_API_FALLBACK,
};

/** Normalise une URL (supprime les //, retire le trailing slash) */
const normalizeUrl = (u: string) => {
  if (!u) return '';
  try {
    const fixed = u.replace(/([^:]\/)\/+/g, '$1');
    return fixed.endsWith('/') ? fixed.slice(0, -1) : fixed;
  } catch {
    return u.endsWith('/') ? u.slice(0, -1) : u;
  }
};

/** Lecture robuste de l'environnement courant */
const envFromRuntime = (): 'production' | 'preview' | 'development' | 'test' => {
  const v =
    (process.env.NEXT_PUBLIC_ENV as string) ||
    (process.env.VERCEL_ENV as string) ||
    (process.env.NODE_ENV as string) ||
    'development';

  if (v === 'prod') return 'production';
  if (v === 'staging') return 'preview';
  if (v === 'preview') return 'preview';
  if (v === 'test') return 'test';
  if (v === 'production') return 'production';
  return 'development';
};

/** Résolution dynamique de l'URL d'API */
export const getApiUrl = (): string => {
  const explicit = process.env.NEXT_PUBLIC_API_URL;
  if (explicit) return normalizeUrl(explicit);

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const mapped = HOST_TO_API[host];
    if (mapped) return normalizeUrl(mapped);

    // Localhost case (client side only)
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }

  const currentEnv = envFromRuntime();

  const apiProd    = process.env.NEXT_PUBLIC_API_PROD;
  const apiPreview = process.env.NEXT_PUBLIC_API_PREVIEW || process.env.NEXT_PUBLIC_API_STAGING;
  const apiDev     = process.env.NEXT_PUBLIC_API_DEV;
  const apiTest    = process.env.NEXT_PUBLIC_API_TEST;

  let resolved =
    (currentEnv === 'production'   && (apiProd || DEFAULT_API_FALLBACK)) ||
    (currentEnv === 'preview'      && (apiPreview || apiProd || DEFAULT_API_FALLBACK)) ||
    (currentEnv === 'test'         && (apiTest || apiPreview || apiProd || DEFAULT_API_FALLBACK)) ||
    (currentEnv === 'development'  && (apiDev || DEFAULT_API_FALLBACK)) ||
    DEFAULT_API_FALLBACK;

  return normalizeUrl(resolved);
};

/** Base URL dynamique */
let API_URL_RUNTIME = '';

/** Client Axios (baseURL mise à jour dynamiquement à chaque appel) */
export const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: { 'Content-Type': 'application/json' },
});

/** Setter dynamique utilisable au runtime */
export const setApiBaseUrl = (nextBaseUrl: string) => {
  const url = normalizeUrl(nextBaseUrl);
  API_URL_RUNTIME = url;
  apiClient.defaults.baseURL = url;
};

/** Getter d'URL dynamique en priorité */
export const API_URL = (): string => API_URL_RUNTIME || getApiUrl();

/** Auth header (client-only) */
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});
