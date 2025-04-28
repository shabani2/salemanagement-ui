// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Permet de faire next export
  skipExportErrors: true, // Ignore les erreurs bloquantes
  experimental: {
    skipMiddlewareUrlNormalize: true,
    serverActions: false, // Désactive Server Actions si tu ne les utilises pas
    appDir: true, // Tu peux le désactiver si tu veux revenir au mode pages
  },
  trailingSlash: true,
};

module.exports = nextConfig;
