/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {}, // active les server actions si tu en as besoin
  },
  trailingSlash: true,
};

module.exports = nextConfig;
