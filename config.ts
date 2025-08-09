// config.ts
type EnvType = 'development' | 'production' | 'test';

const nodeEnv: EnvType =
  (process.env.NEXT_PUBLIC_NODE_ENV as EnvType) || 'development';

export const API_URL =
  nodeEnv === 'production'
    ? process.env.NEXT_PUBLIC_API_PROD
    : nodeEnv === 'test'
    ? process.env.NEXT_PUBLIC_API_TEST
    : process.env.NEXT_PUBLIC_API_LOCAL || 'http://localhost:8000';
