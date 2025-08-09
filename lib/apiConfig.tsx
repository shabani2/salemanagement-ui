import axios from 'axios';

// Détermine l'environnement (Next.js côté client ou serveur)
const nodeEnv =
  (process.env.NEXT_PUBLIC_NODE_ENV as 'development' | 'production' | 'test') ||
  'development';

// Fonction unique pour déterminer l'URL de l'API
export const getApiUrl = (): string => {
  // Si on est côté serveur (SSG/SSR), on utilise l'API locale par défaut
  if (typeof window === 'undefined') {
    console.log('Serveur détecté - API locale utilisée');
    return process.env.NEXT_PUBLIC_API_LOCAL ?? 'http://localhost:8000';
  }

  const hostname = window.location.hostname;
  console.log('Hostname détecté:', hostname);

  switch (hostname) {
    case 'localhost':
    case '127.0.0.1':
      return process.env.NEXT_PUBLIC_API_LOCAL ?? 'http://localhost:8000';

    case 'inaf-backend-510563b7750d.herokuapp.com':
      return nodeEnv === 'production'
        ? process.env.NEXT_PUBLIC_API_PROD ?? ''
        : process.env.NEXT_PUBLIC_API_DEV ?? '';

    case 'www.agrecavente.online':
      return process.env.NEXT_PUBLIC_API_PREPROD ?? '';

    case 'dgi.243technologies.com':
      return process.env.NEXT_PUBLIC_API_PROD ?? '';

    case 'agricap-ui-429dded64762.herokuapp.com':
      return process.env.NEXT_PUBLIC_API_DEV ??
        'https://agricap-api-3a2d9a422767.herokuapp.com/';

    default:
      // Fallback propre : API locale si rien n'est défini
      return process.env.NEXT_PUBLIC_API_LOCAL ?? 'http://localhost:8000';
  }
};

// Variable unique à réutiliser partout (API, images, etc.)
export const API_URL = getApiUrl();

// Client Axios configuré
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Ajout automatique du token si présent
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
