// ======================================================================
// file: src/lib/apiConfig.ts  — PATCH DIAGNOSTIC MINIMAL
// (⚠️ conserve ton fichier de base, on AJOUTE seulement du debug + probeApi)
// ======================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

const DEFAULT_API_FALLBACK = 'https://agricap-backend-da11c78fe082.herokuapp.com/';
const HOST_TO_API: Record<string, string> = {
  'agricap-ui-429dded64762.herokuapp.com': DEFAULT_API_FALLBACK,
};

const HEX24 = /^[a-fA-F0-9]{24}$/;

// --- AJOUT: flag debug (uniquement en dev) ---
const DEBUG_API = process.env.NODE_ENV !== 'production';

const normalizeUrl = (u: string) => {
  if (!u) return '';
  try {
    const fixed = u.replace(/([^:]\/)\/+/g, '$1');
    return fixed.endsWith('/') ? fixed.slice(0, -1) : fixed;
  } catch {
    return u.endsWith('/') ? u.slice(0, -1) : u;
  }
};

const envFromRuntime = (): 'production' | 'preview' | 'development' | 'test' => {
  const v =
    (process.env.NEXT_PUBLIC_ENV as string) ||
    (process.env.VERCEL_ENV as string) ||
    (process.env.NODE_ENV as string) ||
    'development';
  if (v === 'prod') return 'production';
  if (v === 'staging' || v === 'preview') return 'preview';
  if (v === 'test') return 'test';
  if (v === 'production') return 'production';
  return 'development';
};

export const getApiUrl = (): string => {
  const explicit = process.env.NEXT_PUBLIC_API_URL;
  if (explicit) return normalizeUrl(explicit);

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const mapped = HOST_TO_API[host];
    if (mapped) return normalizeUrl(mapped);
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8000';
  }

  const currentEnv = envFromRuntime();
  const apiProd = process.env.NEXT_PUBLIC_API_PROD;
  const apiPreview = process.env.NEXT_PUBLIC_API_PREVIEW || process.env.NEXT_PUBLIC_API_STAGING;
  const apiDev = process.env.NEXT_PUBLIC_API_DEV;
  const apiTest = process.env.NEXT_PUBLIC_API_TEST;

  const resolved =
    (currentEnv === 'production' && (apiProd || DEFAULT_API_FALLBACK)) ||
    (currentEnv === 'preview' && (apiPreview || apiProd || DEFAULT_API_FALLBACK)) ||
    (currentEnv === 'test' && (apiTest || apiPreview || apiProd || DEFAULT_API_FALLBACK)) ||
    (currentEnv === 'development' && (apiDev || DEFAULT_API_FALLBACK)) ||
    DEFAULT_API_FALLBACK;

  return normalizeUrl(resolved);
};

/** Axios instance */
let API_URL_RUNTIME = '';
export const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: { 'Content-Type': 'application/json' },
});
export const setApiBaseUrl = (nextBaseUrl: string) => {
  const url = normalizeUrl(nextBaseUrl);
  API_URL_RUNTIME = url;
  apiClient.defaults.baseURL = url;
};
export const API_URL = (): string => API_URL_RUNTIME || getApiUrl();

/* ---------------- Helpers (inchangés) ---------------- */
function extractTenantSlugFromHost(host: string): string | null {
  if (!host) return null;
  host = host.toLowerCase();
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  if (host.endsWith('.herokuapp.com')) return null; // pas de wildcard sur ce domaine
  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0];
  return null;
}

// ❗ NE PAS lire localStorage pour le tenant au login (slug only)
function addPreAuthTenantHeaders(headers: any) {
  if (typeof window === 'undefined') return;
  const slug = extractTenantSlugFromHost(window.location.hostname);
  if (slug) headers['x-tenant-slug'] = slug.toLowerCase();
}

export function afterLoginPersistToken(token: string) {
  try {
    if (token) localStorage.setItem('authToken', token);
    ['organisationId','orgId','tenantId','x-tenant-id','x-tenant-slug','organisationJSON','token-agricap','user-agricap']
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* noop */ }
}

export function clearAuth() {
  try { localStorage.removeItem('authToken'); } catch { /* noop */ }
}

/* ---------------- AJOUT: hooks de debug ---------------- */
function logReq(config: any) {
  if (!DEBUG_API) return;
  // eslint-disable-next-line no-console
  console.log(`[API→] ${config.method?.toUpperCase()} ${apiClient.defaults.baseURL}${config.url}`, {
    baseURL: apiClient.defaults.baseURL,
    url: config.url,
    headers: config.headers,
  });
}
function logResp(response: any) {
  if (!DEBUG_API) return;
  // eslint-disable-next-line no-console
  console.log(`[API←] ${response.status} ${response.config?.url}`, response.data);
}
function logErr(error: any) {
  if (!DEBUG_API) return;
  // eslint-disable-next-line no-console
  console.error('[API×]', {
    code: error?.code,
    status: error?.response?.status,
    url: error?.config?.url,
    baseURL: apiClient.defaults.baseURL,
    message: error?.message,
  });
}

/** 🔎 Appelle ça au boot d’une page: probeApi().then(console.log).catch(console.error) */
export async function probeApi() {
  const target = (apiClient.defaults.baseURL || API_URL()) + '/healthz';
  if (DEBUG_API) console.log('[probeApi] ping', target);
  const res = await fetch(target, { method: 'GET' });
  return { ok: res.ok, status: res.status, text: await res.text(), target };
}

/** Interceptor unique */
apiClient.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  const url = String(config.url || '');
  const isLogin = url.includes('/auth/login');

  if (isLogin) {
    delete (config.headers as any).Authorization;
    delete (config.headers as any)['x-tenant-id'];
    delete (config.headers as any)['x-tenant-slug'];
    addPreAuthTenantHeaders(config.headers);
  } else {
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token-agricap');
        if (token) (config.headers as any).Authorization = `Bearer ${token}`;
        else delete (config.headers as any).Authorization;
      } catch { /* noop */ }
    }
    delete (config.headers as any)['x-tenant-id'];
    delete (config.headers as any)['x-tenant-slug'];
  }

  logReq(config); // ← AJOUT
  return config;
});

apiClient.interceptors.response.use(
  (resp) => { logResp(resp); return resp; },
  (err)  => { logErr(err);  return Promise.reject(err); }
);
