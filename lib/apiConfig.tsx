import { API_URL } from '@/config';
import axios from 'axios';

// Vérifie et affiche les variables d'environnement

// Déclare la variable nodeEnv avec des valeurs acceptées par Next.js
const nodeEnv =
  (process.env.NEXT_PUBLIC_NODE_ENV as 'development' | 'production' | 'test') || 'development';

const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    console.log('Serveur détecté - API locale utilisée');
    return process.env.NEXT_PUBLIC_API_LOCAL || 'http://localhost:8000';
  }

  console.log('Hostname détecté:', API_URL,);

  switch (API_URL) {
    case 'localhost':
    case '127.0.0.1':
      return process.env.NEXT_PUBLIC_API_LOCAL || 'http://localhost:8000';
    case 'inaf-backend-510563b7750d.herokuapp.com':
      return nodeEnv === 'production'
        ? process.env.NEXT_PUBLIC_API_PROD || ''
        : process.env.NEXT_PUBLIC_API_DEV || '';
    case 'www.agrecavente.online':
      return process.env.NEXT_PUBLIC_API_PREPROD || '';
    case 'dgi.243technologies.com':
      return process.env.NEXT_PUBLIC_API_PROD || '';
    case 'agricap-ui-429dded64762.herokuapp.com':
      return process.env.NEXT_PUBLIC_API_DEV || 'https://agricap-api-3a2d9a422767.herokuapp.com/';

    default:
      return process.env.NEXT_PUBLIC_API_LOCAL || 'http://localhost:8000';
  }
};

export const apiClient = axios.create({
  baseURL: getApiUrl(),
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
