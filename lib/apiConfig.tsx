import axios from 'axios';

const nodeEnv =
  (process.env.NEXT_PUBLIC_NODE_ENV as 'development' | 'production' | 'test') ||
  'development';

export const getApiUrl = (): string => {
  // 1️⃣ Si l'URL API est définie explicitement dans .env, on l'utilise toujours
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2️⃣ Sinon, côté serveur (SSR/SSG), on utilise l'API locale
  if (typeof window === 'undefined') {
    console.log('Serveur détecté - API locale utilisée');
    return process.env.NEXT_PUBLIC_API_LOCAL ?? 'http://localhost:8000';
  }

  // 3️⃣ Côté client → fallback basé sur l'hostname
  const hostname = window.location.hostname;
  console.log('Hostname détecté:', hostname);

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return process.env.NEXT_PUBLIC_API_LOCAL ?? 'http://localhost:8000';
  }

  if (nodeEnv === 'production') {
    return process.env.NEXT_PUBLIC_API_PROD ?? '';
  }

  if (nodeEnv === 'test') {
    return process.env.NEXT_PUBLIC_API_TEST ?? '';
  }

  return process.env.NEXT_PUBLIC_API_DEV ?? '';
};

// Variable unique à réutiliser partout
export const API_URL = getApiUrl();

// Client Axios configuré
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
